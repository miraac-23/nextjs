'use client'

// Tarayıcı tarafı AI taşıyıcısı.
//
// Hangi yolun kullanılacağını SAĞLAYICI SINIFI belirler (bkz. providers.ts):
//
//   keyless → önce bu sitenin sunucusu (/api/ai/*): istem ve ayrıştırma sunucuda
//             kalır, CORS sürprizi olmaz. Sunucu ulaşamazsa tarayıcı doğrudan
//             dener (bu sağlayıcıların CORS'u açıktır).
//   local   → yalnızca doğrudan. Site uzak bir sunucuda yayındayken o sunucu
//             kullanıcının localhost'undaki Ollama'yı göremez.
//   byok    → yalnızca doğrudan. Kullanıcının API anahtarı bu sitenin sunucusuna
//             GÖNDERİLMEZ; yalnızca sağlayıcının kendi adresine gider.
//
// Hiçbir yol çalışmazsa sunum yine üretilir: metinden deterministik yerel taslak
// çıkarılır (outline.ts) ve kullanıcı bilgilendirilir.

import { resolveConnection, type AiConnection } from './connection'
import { pickModel } from './models'
import { FALLBACK_TITLE, normalizePresentation, normalizeSlide } from './normalize'
import { assembleDeep, generateDeep, normalizePlan } from './deep'
import { metaField } from './prompts'
import { OllamaProvider } from './ollama'
import { OpenAiChatProvider } from './openai-chat'
import { getProvider, transportFor, type ProviderInfo } from './providers'
import { AiError, isAiError, type AiErrorCode, type AiHealth, type AiProvider } from './provider'
import { readSse } from './stream'
import { presentationSchema, slideSchema } from '../schema'
import { isEmptySlide } from '../transform'
import {
  DEFAULT_DEPTH,
  DEFAULT_SOURCE_MODE,
  type DeckPlan,
  type GenerationRequest,
  type Presentation,
  type RefineRequest,
  type Slide,
  type SlideRequest,
  type SlideType,
  uid,
  usesAi,
} from '../types'

export type AiTransport = 'server' | 'direct'

export type AiStatus = {
  transport: AiTransport | null
  health: AiHealth | null
  /** Hiçbir yolla ulaşılamadı. */
  offline: boolean
  /** Bağlantı kullanıcı seçmeden otomatik kuruldu mu? */
  autoSelected: boolean
  connection: AiConnection
  provider: ProviderInfo
}

/** Oturum içi karar: aynı sekmede tekrar tekrar sağlık kontrolü yapılmaz. */
let resolvedTransport: AiTransport | null = null

export function resetTransport(): void {
  resolvedTransport = null
}

/* ============================== sağlayıcı kurulumu ============================== */

/** Tarayıcıda çalışacak sağlayıcı örneğini bağlantı ayarından kurar. */
export function buildProvider(connection: AiConnection): AiProvider {
  const info = getProvider(connection.providerId)
  if (info.wire === 'ollama') {
    return new OllamaProvider({ baseUrl: connection.baseUrl || info.baseUrl, model: connection.model })
  }
  return new OpenAiChatProvider({
    provider: info,
    model: connection.model,
    apiKey: connection.apiKey,
    baseUrl: connection.baseUrl,
  })
}

/** Akışlı üretimi destekleyen sağlayıcı mı? İkisi de destekliyor; tip daraltması için. */
type StreamingProvider = AiProvider & {
  generatePresentationStream: (
    req: GenerationRequest,
    onEvent: (event: { kind: 'meta'; meta: { title?: string; subtitle?: string } } | { kind: 'slide'; index: number; draft: unknown }) => void,
    signal?: AbortSignal,
  ) => Promise<unknown>
}

function canStream(provider: AiProvider): provider is StreamingProvider {
  return typeof (provider as StreamingProvider).generatePresentationStream === 'function'
}

/* ================================== sağlık ================================== */

async function serverHealth(connection: AiConnection, signal?: AbortSignal): Promise<AiHealth | null> {
  try {
    const query = `?provider=${encodeURIComponent(connection.providerId)}&model=${encodeURIComponent(connection.model)}`
    const res = await fetch(`/api/ai/health${query}`, { signal, cache: 'no-store' })
    if (!res.ok) return null
    const data = (await res.json()) as AiHealth
    return typeof data?.ok === 'boolean' ? data : null
  } catch {
    return null
  }
}

/**
 * Bağlantıyı çözer (gerekirse otomatik kurar) ve durumunu döndürür.
 * Yerel Ollama seçiliyse ve kayıtlı model kurulu değilse en uygun kurulu modele geçilir.
 */
export async function probeAi(signal?: AbortSignal): Promise<AiStatus> {
  const { connection, autoSelected } = await resolveConnection()
  const provider = getProvider(connection.providerId)
  const base = { autoSelected, connection, provider }

  if (transportFor(provider, !!connection.apiKey) === 'server') {
    const health = await serverHealth(connection, signal)
    if (health && health.ok) {
      resolvedTransport = 'server'
      return { ...base, transport: 'server', health, offline: false }
    }
    // Sunucu yolu kapalıysa (statik dağıtım, ağ) tarayıcıdan doğrudan dene.
    const direct = await buildProvider(connection).health(signal)
    if (direct.ok) {
      resolvedTransport = 'direct'
      return { ...base, transport: 'direct', health: direct, offline: false }
    }
    return { ...base, transport: null, health: direct, offline: true }
  }

  let health = await buildProvider(connection).health(signal)
  if (!health.ok) {
    /*
     * Yerel serviste doğrudan yolun başarısız olmasının neredeyse tek sebebi
     * Ollama'nın CORS kısıtı: tarayıcıdan `localhost:11434`e erişim ancak
     * `OLLAMA_ORIGINS` ayarlıysa çalışıyor. Bu sitenin SUNUCUSUNDA böyle bir
     * kısıt yok; oradan bakıp servisin gerçekten kapalı olup olmadığını
     * anlıyoruz.
     *
     * Ölçülen hata buydu: model kurulumu bittikten sonra sağlık kontrolü
     * tarayıcıdan yapılıp başarısız oluyor, panel servisi "kapalı" sanıyor ve
     * kurulum sihirbazı otomatik kolundan terminal koluna geri düşüyordu.
     */
    if (provider.kind === 'local') {
      const viaServer = await serverHealth(connection, signal)
      if (viaServer && viaServer.ok) {
        resolvedTransport = 'server'
        return { ...base, transport: 'server', health: viaServer, offline: false }
      }
    }
    return { ...base, transport: null, health, offline: true }
  }

  resolvedTransport = 'direct'
  // Yerelde kayıtlı model kurulu değilse kurulu olanlar arasından en uygunu seçilir.
  if (provider.wire === 'ollama' && !health.modelReady && health.available.length > 0) {
    const picked = pickModel(health.available, connection.model)
    if (picked && picked !== connection.model) {
      const next = { ...connection, model: picked }
      const { saveConnection } = await import('./connection')
      saveConnection(next)
      return {
        ...base,
        connection: next,
        transport: 'direct',
        health: { ...health, model: picked, modelReady: true },
        offline: false,
        autoSelected: true,
      }
    }
  }
  return { ...base, transport: 'direct', health, offline: false }
}

/* ================================== üretim ================================== */

export type GenerateOutcome = {
  presentation: Presentation
  transport: AiTransport | null
  /** AI kullanılamadığı için yerel taslağa düşüldü mü? */
  usedFallback: boolean
  reason?: AiErrorCode
}

/** Üretim sırasında yayımlanan GERÇEK ilerleme olayları (§7). */
export type GenerateEvent =
  | { kind: 'meta'; title: string; subtitle?: string }
  | { kind: 'slide'; index: number; slide: Slide }
  /** Derin modda hız sınırı beklemesi — kullanıcıya "bekleniyor" demek için. */
  | { kind: 'wait'; index: number; ms: number }

export type GenerateOptions = {
  signal?: AbortSignal
  /** Verilirse akışlı üretim denenir; slaytlar oluştukça bildirilir. */
  onEvent?: (event: GenerateEvent) => void
}

type ServerError = { ok: false; code?: string; message?: string }

/**
 * Bu hatalarda ikinci yolu denemek anlamsızdır: istek gövdesi hatalıysa ya da
 * kullanıcı iptal ettiyse diğer yol da aynı sonucu verir.
 */
function isFatal(code: AiErrorCode): boolean {
  return code === 'aborted' || code === 'invalid-input'
}

async function postJson<T>(url: string, body: unknown, signal?: AbortSignal): Promise<T> {
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    })
  } catch (e) {
    if (signal?.aborted) throw new AiError('aborted')
    throw new AiError('unreachable', 'Sunucuya ulaşılamadı.', e instanceof Error ? e.message : undefined)
  }
  const data: unknown = await res.json().catch(() => null)
  if (!res.ok) {
    const err = (data || {}) as ServerError
    throw new AiError((err.code as AiErrorCode) || 'http', err.message || `İstek başarısız (${res.status}).`)
  }
  return data as T
}

/**
 * Sunucu yolunda AKIŞLI üretim (SSE). Anahtar taşımayan sağlayıcılarda kullanılır;
 * `done` olayındaki sunum nihai sonuçtur.
 */
async function generateViaSse(
  connection: AiConnection,
  req: GenerationRequest,
  options: GenerateOptions,
): Promise<Presentation> {
  let res: Response
  try {
    res = await fetch('/api/ai/generate?stream=1', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
      body: JSON.stringify({ ...req, provider: connection.providerId, model: connection.model }),
      signal: options.signal,
    })
  } catch (e) {
    if (options.signal?.aborted) throw new AiError('aborted')
    throw new AiError('unreachable', 'Sunucuya ulaşılamadı.', e instanceof Error ? e.message : undefined)
  }

  if (!res.ok || !res.body) {
    const data = (await res.json().catch(() => null)) as ServerError | null
    throw new AiError((data?.code as AiErrorCode) || 'http', data?.message || `İstek başarısız (${res.status}).`)
  }

  let final: Presentation | null = null
  let failure: AiError | null = null

  for await (const event of readSse(res.body)) {
    if (event.event === 'meta') {
      const meta = safeJson<{ title?: string; subtitle?: string }>(event.data)
      if (meta?.title) options.onEvent?.({ kind: 'meta', title: meta.title, subtitle: meta.subtitle })
      continue
    }
    if (event.event === 'slide') {
      const payload = safeJson<{ index?: number; slide?: unknown }>(event.data)
      const slide = slideSchema.safeParse(payload?.slide)
      if (slide.success && typeof payload?.index === 'number') {
        options.onEvent?.({ kind: 'slide', index: payload.index, slide: slide.data as Slide })
      }
      continue
    }
    if (event.event === 'done') {
      const payload = safeJson<{ presentation?: unknown }>(event.data)
      const parsed = presentationSchema.safeParse(payload?.presentation)
      if (parsed.success) final = parsed.data as Presentation
      continue
    }
    if (event.event === 'error') {
      const payload = safeJson<{ code?: string; message?: string }>(event.data)
      failure = new AiError((payload?.code as AiErrorCode) || 'http', payload?.message)
    }
  }

  if (failure) throw failure
  if (!final) throw new AiError('bad-output', 'Akış tamamlanmadan kesildi.')
  return final
}

function safeJson<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

/** Tarayıcıdan doğrudan üretim — normalize da tarayıcıda yapılır. */
async function generateDirect(
  connection: AiConnection,
  req: GenerationRequest,
  options: GenerateOptions,
): Promise<Presentation> {
  const provider = buildProvider(connection)

  if (!options.onEvent || !canStream(provider)) {
    const draft = await provider.generatePresentation(req, options.signal)
    return normalizePresentation(draft, req, { source: 'ai' })
  }

  const previewId = uid('p')
  const draft = await provider.generatePresentationStream(
    req,
    (event) => {
      if (event.kind === 'meta') {
        if (event.meta.title) options.onEvent?.({ kind: 'meta', title: event.meta.title, subtitle: event.meta.subtitle })
        return
      }
      try {
        const slide = normalizeSlide(event.draft as never, {
          presentationId: previewId,
          order: event.index,
          lang: req.language,
        })
        options.onEvent?.({ kind: 'slide', index: event.index, slide })
      } catch {
        // Önizleme çizilemezse akış devam eder.
      }
    },
    options.signal,
  )
  return normalizePresentation(draft as never, req, { source: 'ai' })
}

/** Sağlayıcı sınıfına ve kullanıcının kendi anahtarı olup olmadığına göre yol sırası. */
function transportOrder(provider: ProviderInfo, hasUserKey: boolean): AiTransport[] {
  if (transportFor(provider, hasUserKey) === 'direct') {
    /*
     * Yerel serviste doğrudan yol Ollama'nın CORS kısıtına takılabiliyor
     * (`OLLAMA_ORIGINS` ayarlı değilse). Sunucu aynı servise kısıtsız ulaşıyor,
     * bu yüzden yerelde sunucu YEDEK yol olarak eklenir. Kullanıcının kendi
     * anahtarını taşıyan sağlayıcılarda böyle bir yedek YOKTUR: anahtar bu
     * sitenin sunucusuna hiçbir koşulda gönderilmez.
     */
    return provider.kind === 'local' ? ['direct', 'server'] : ['direct']
  }
  return resolvedTransport === 'direct' ? ['direct', 'server'] : ['server', 'direct']
}

/* ================================ derin üretim ================================ */

/** Planı üretir: önce sunucu yolu, olmazsa doğrudan sağlayıcı. */
async function planDeck(
  connection: AiConnection,
  req: GenerationRequest,
  sourceOutline: string,
  signal?: AbortSignal,
): Promise<DeckPlan> {
  const provider = getProvider(connection.providerId)
  const order = transportOrder(provider, !!connection.apiKey)
  let lastError: unknown = new AiError('unreachable')

  for (let i = 0; i < order.length; i++) {
    try {
      if (order[i] === 'server') {
        const data = await postJson<{ ok: true; plan: unknown }>(
          '/api/ai/plan',
          { ...req, sourceOutline, provider: connection.providerId, model: connection.model },
          signal,
        )
        resolvedTransport = 'server'
        return normalizePlan((data.plan as { title?: unknown }) ?? {}, req)
      }
      const draft = await buildProvider(connection).planDeck(req, sourceOutline, signal)
      resolvedTransport = 'direct'
      return normalizePlan(draft, req)
    } catch (e) {
      if (isAiError(e) && isFatal(e.code)) throw e
      lastError = e
    }
  }
  throw lastError
}

/**
 * Derin üretim: plan + slayt başına genişletme.
 *
 * Tek geçişli üretimden farkı, her slaytın modelin çıktı bütçesinin TAMAMINI
 * kendine kullanması. Karşılığı N+1 çağrı ve daha uzun süre; kazancı slayt
 * başına ~130 karakter yerine dolu, örnekli içerik.
 */
async function generateDeepPresentation(
  connection: AiConnection,
  req: GenerationRequest,
  options: GenerateOptions,
): Promise<Presentation> {
  const presentationId = uid('p')
  const { plan, slides } = await generateDeep(
    req,
    presentationId,
    {
      plan: (r, outline, signal) => planDeck(connection, r, outline, signal),
      slide: (r, signal) => generateSlide(r, presentationId, 0, signal),
    },
    (event) => {
      if (event.kind === 'plan') {
        options.onEvent?.({ kind: 'meta', title: event.title, subtitle: event.subtitle })
        return
      }
      if (event.kind === 'wait') {
        options.onEvent?.({ kind: 'wait', index: event.index, ms: event.ms })
        return
      }
      options.onEvent?.({ kind: 'slide', index: event.index, slide: event.slide })
    },
    options.signal,
  )
  return assembleDeep(req, presentationId, plan, slides)
}

/**
 * Sunumu üretir. Her durumda kullanılabilir bir `Presentation` döner;
 * UI boş ekran göstermez.
 */
export async function generatePresentation(
  req: GenerationRequest,
  options: GenerateOptions = {},
): Promise<GenerateOutcome> {
  // Kullanıcı AI'sız bir mod seçtiyse hiç bağlantı kurulmaz. Bu bir YEDEK yol
  // değil, istenen yoldur: `usedFallback` false döner ki editörde "AI'ya
  // ulaşılamadı" uyarısı çıkmasın — kullanıcı zaten AI istemedi.
  if (!usesAi(req.sourceMode ?? DEFAULT_SOURCE_MODE)) {
    const presentation = await buildLocal(req, options)
    return { presentation, transport: null, usedFallback: false }
  }

  const { connection } = await resolveConnection()
  const provider = getProvider(connection.providerId)
  const order = transportOrder(provider, !!connection.apiKey)
  let lastCode: AiErrorCode = 'unreachable'

  // Derin mod kendi taşıyıcı sırasını iç çağrılarında zaten uyguluyor; burada
  // tek bir denemesi var. Başarısız olursa aşağıdaki tek geçişli yola düşülür —
  // yarım deste göstermektense hızlı ama sığ bir deste üretmek daha iyi.
  if ((req.depth ?? DEFAULT_DEPTH) === 'deep') {
    try {
      const presentation = await generateDeepPresentation(connection, req, options)
      return { presentation, transport: resolvedTransport, usedFallback: false }
    } catch (e) {
      if (isAiError(e) && isFatal(e.code)) throw e
      lastCode = isAiError(e) ? e.code : 'unreachable'
    }
  }

  for (let i = 0; i < order.length; i++) {
    const transport = order[i]
    try {
      if (transport === 'server') {
        const presentation = options.onEvent
          ? await generateViaSse(connection, req, options)
          : await (async () => {
              const data = await postJson<{ ok: true; presentation: unknown }>(
                '/api/ai/generate',
                { ...req, provider: connection.providerId, model: connection.model },
                options.signal,
              )
              const parsed = presentationSchema.safeParse(data.presentation)
              if (!parsed.success) throw new AiError('bad-output', 'Sunucu beklenmeyen bir yanıt döndürdü.')
              return parsed.data as Presentation
            })()
        resolvedTransport = 'server'
        return { presentation, transport, usedFallback: false }
      }

      const presentation = await generateDirect(connection, req, options)
      resolvedTransport = 'direct'
      return { presentation, transport, usedFallback: false }
    } catch (e) {
      if (isAiError(e) && isFatal(e.code)) throw e
      lastCode = isAiError(e) ? e.code : 'unreachable'
    }
  }

  // Hiçbir yol çalışmadı: metinden yerel taslak çıkar (boş ekran yerine içerik).
  const presentation = await buildLocal(req, options)
  return { presentation, transport: null, usedFallback: true, reason: lastCode }
}

/**
 * AI'sız, tamamen cihazda üretim. Hem kullanıcının seçtiği `-only` modlarında
 * hem de AI'ya hiç ulaşılamadığında kullanılır; ikisinin ayrımını ÇAĞIRAN yapar
 * (`usedFallback`), çünkü aynı çıktı bir durumda istenen sonuç, diğerinde tesellidir.
 */
async function buildLocal(req: GenerationRequest, options: GenerateOptions): Promise<Presentation> {
  const { buildOutline } = await import('../outline')
  const presentation = normalizePresentation(buildOutline(req), req, { source: 'outline' })
  options.onEvent?.({ kind: 'meta', title: presentation.title, subtitle: presentation.subtitle })
  presentation.slides.forEach((slide, index) => options.onEvent?.({ kind: 'slide', index, slide }))
  return presentation
}

/* ============================== slayt iyileştirme ============================== */

/**
 * Tek slaytı AI ile yeniden yazar. Yedeği yoktur: AI yoksa kullanıcıya hata
 * gösterilir, çünkü "iyileştirme" istemi deterministik olarak taklit edilemez.
 */
/**
 * Üst-veri komutlarında (`notes`/`highlight`/`example`) modelin dönüşünden
 * YALNIZCA o alan alınır; slaydın geri kalanı olduğu gibi korunur.
 *
 * Gerekçe ölçüldü: zayıf bir model bu komutlarda çoğu zaman yalnızca
 * {type, title} döndürüyor. Bu dönüşü olduğu gibi uygulamak slaydın maddelerini
 * siliyordu — komutun sözü ise "metni DEĞİŞTİRME" idi. Koruma çağıranda değil
 * burada duruyor ki her çağıran (asistan paneli, koç paneli) aynı güvencede olsun.
 */
function applyRefine(original: Slide, next: Slide, action: RefineRequest['action']): Slide {
  const field = metaField(action)
  if (!field) return next
  const value = next[field]
  if (!value) throw new AiError('bad-output', 'Model istenen alanı yazmadı.')
  return { ...original, [field]: value }
}

export async function refineSlide(req: RefineRequest, signal?: AbortSignal): Promise<Slide> {
  const { connection } = await resolveConnection()
  const provider = getProvider(connection.providerId)
  const order = transportOrder(provider, !!connection.apiKey)
  let lastError: unknown = new AiError('unreachable')

  for (let i = 0; i < order.length; i++) {
    try {
      if (order[i] === 'server') {
        const data = await postJson<{ ok: true; slide: unknown }>(
          '/api/ai/refine',
          { ...req, provider: connection.providerId, model: connection.model },
          signal,
        )
        const parsed = slideSchema.safeParse(data.slide)
        if (!parsed.success) throw new AiError('bad-output', 'Sunucu beklenmeyen bir yanıt döndürdü.')
        resolvedTransport = 'server'
        return applyRefine(req.slide, parsed.data as Slide, req.action)
      }

      const draft = await buildProvider(connection).refineSlide(req, signal)
      resolvedTransport = 'direct'
      const next = normalizeSlide(draft, {
        presentationId: req.slide.presentationId,
        order: req.slide.order,
        lang: req.language,
        existing: req.slide,
        preferredType: preferredTypeFor(req),
      })
      return applyRefine(req.slide, next, req.action)
    } catch (e) {
      if (isAiError(e) && isFatal(e.code)) throw e
      lastError = e
    }
  }
  throw lastError
}

/** Bazı komutlar slayt tipini zorunlu kılar; model unutursa normalize düzeltir. */
const ACTION_TYPE: Partial<Record<RefineRequest['action'], SlideType>> = {
  toChart: 'chart',
  toProcess: 'process',
  toBullets: 'content',
  toTimeline: 'timeline',
  toStats: 'statistics',
  toComparison: 'comparison',
  toArchitecture: 'architecture',
}

export function preferredTypeFor(req: RefineRequest): SlideType | undefined {
  return ACTION_TYPE[req.action]
}

/* ============================ konudan slayt üretme ============================ */

/**
 * Başlık kesilmiş yanıtta kaybolduysa kullanıcının kendi yönergesinden türet.
 * "Başlıksız slayt" göstermektense kullanıcının yazdığı cümleyi başlık yapmak
 * hem doğru hem düzenlenebilir bir başlangıç veriyor.
 */
function withTitle(slide: Slide, req: SlideRequest): Slide {
  const placeholder = FALLBACK_TITLE[req.language]
  if (slide.title && slide.title !== placeholder) return slide
  const derived = (req.instruction || req.topic).trim().slice(0, 80)
  return derived ? { ...slide, title: derived } : slide
}

/**
 * Konudan TEK yeni slayt üretir. Sunum yeniden üretilmez; kullanıcı destesine
 * doğrudan ekleme yapar ("bu konuda bir grafik slaytı ekle").
 */
export async function generateSlide(
  req: SlideRequest,
  presentationId: string,
  order: number,
  signal?: AbortSignal,
): Promise<Slide> {
  const { connection } = await resolveConnection()
  const provider = getProvider(connection.providerId)
  const order2 = transportOrder(provider, !!connection.apiKey)
  let lastError: unknown = new AiError('unreachable')

  for (let i = 0; i < order2.length; i++) {
    try {
      if (order2[i] === 'server') {
        const data = await postJson<{ ok: true; slide: unknown }>(
          '/api/ai/slide',
          { ...req, provider: connection.providerId, model: connection.model },
          signal,
        )
        const parsed = slideSchema.safeParse(data.slide)
        if (!parsed.success) throw new AiError('bad-output', 'Sunucu beklenmeyen bir yanıt döndürdü.')
        const slide = withTitle({ ...(parsed.data as Slide), id: uid('sl'), presentationId, order }, req)
        if (isEmptySlide(slide)) throw new AiError('bad-output', 'Model boş bir slayt döndürdü.')
        resolvedTransport = 'server'
        return slide
      }

      const draft = await buildProvider(connection).generateSlide(req, signal)
      const slide = withTitle(
        normalizeSlide(draft, { presentationId, order, lang: req.language, preferredType: req.type }),
        req,
      )
      // Boş slayt eklemektense hata göstermek doğru: kullanıcı neyin olmadığını bilsin.
      if (isEmptySlide(slide)) throw new AiError('bad-output', 'Model boş bir slayt döndürdü.')
      resolvedTransport = 'direct'
      return slide
    } catch (e) {
      if (isAiError(e) && isFatal(e.code)) throw e
      lastError = e
    }
  }
  throw lastError
}
