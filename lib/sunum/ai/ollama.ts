// Yerel Ollama gerçekleştirimi (AiProvider).
//
// Neden /api/chat ve `format`: Ollama 0.5+ `format` alanına JSON Schema alıp
// gramer kısıtlı üretim yapıyor; model şema dışına çıkamıyor. Serbest metin
// ayrıştırmaya (regex ile JSON avı) göre kıyaslanamaz biçimde güvenilir.
// Yine de savunma amaçlı bir metin temizliği bırakıldı: kullanıcı `format`
// desteklemeyen eski bir sürüm çalıştırıyorsa yanıt kurtarılmaya çalışılır.
//
// Bu dosya hem Node (API rotası) hem tarayıcı (doğrudan bağlantı) tarafında çalışır;
// sadece `fetch` ve `AbortController` kullanır.

import {
  aiJsonSchema,
  aiPlanJsonSchema,
  aiPlanSchema,
  aiPresentationSchema,
  aiSlideJsonSchema,
  aiSlideSchema,
  type AiPlanDraft,
  type AiPresentationDraft,
  type AiSlideDraft,
} from '../schema'
import type { GenerationRequest, RefineRequest, SlideRequest } from '../types'
import { condense } from '../chunk'
import { pickModel } from './models'
import { SlideStreamParser, readOllamaStream, type StreamMeta } from './stream'
import {
  generateUserPrompt,
  metaField,
  planBudget,
  planSystemPrompt,
  planUserPrompt,
  refineSystemPrompt,
  refineUserPrompt,
  slideSystemPrompt,
  slideUserPrompt,
  systemPrompt,
} from './prompts'
import {
  AiCache,
  AiError,
  hashKey,
  withRetry,
  withTimeout,
  type AiHealth,
  type AiProvider,
} from './provider'

export const DEFAULT_OLLAMA_URL = 'http://127.0.0.1:11434'
export const DEFAULT_MODEL = 'qwen3:8b'

/** Tüm sunum için süre aşımı — 8B model 10 slaytı yerel GPU'da ~30-90 sn'de üretir. */
const GENERATE_TIMEOUT_MS = 180_000
/** Tek slayt çok daha kısa sürer. */
/*
 * Yerel modeller bulut modellerinden KAT KAT yavaş: 14B bir model tek slaytı
 * 40–90 saniyede yazıyor. 60 saniyelik sınır bu yüzden sık sık devreye giriyor
 * ve kullanıcıya "AI bağlantısı koptu" gibi görünüyordu — oysa model hâlâ
 * yazıyordu. Ölçülen süreler bu değerin çok altında kalıyor.
 */
const REFINE_TIMEOUT_MS = 180_000

/** Ollama'nın varsayılanı; altına inilmez. */
const MIN_CONTEXT = 8192
/** Katalogdaki modellerin güvenle taşıdığı üst sınır. */
const MAX_CONTEXT = 16384

/**
 * İstem uzunluğu ve çıktı bütçesine göre bağlam penceresi.
 *
 * Kaba ama yeterli bir çeviri kullanılır: Türkçe/İngilizce karışık metinde
 * ~3,2 karakter bir token. Üstüne pay eklenir, çünkü eksik tahmin doğrudan
 * kesilmiş JSON demek.
 */
function contextWindow(promptChars: number, maxTokens: number): number {
  const promptTokens = Math.ceil(promptChars / 3.2)
  const needed = Math.ceil((promptTokens + maxTokens) * 1.3)
  return Math.min(MAX_CONTEXT, Math.max(MIN_CONTEXT, needed))
}
const HEALTH_TIMEOUT_MS = 4_000

/** Modele gönderilen kaynak metnin üst sınırı (karakter) — bağlam penceresi taşmasın. */
const SOURCE_BUDGET = 12_000

export type OllamaConfig = {
  baseUrl?: string
  model?: string
  /** Yaratıcılık: 0 tekrara, 1 dağınıklığa yakın. Sunum için düşük-orta iyi çalışıyor. */
  temperature?: number
  generateTimeoutMs?: number
  refineTimeoutMs?: number
}

/** Üretim sırasında yayımlanan gerçek ilerleme olayları (§7: sahte progress yok). */
export type GenerationEvent =
  | { kind: 'meta'; meta: StreamMeta }
  | { kind: 'slide'; index: number; draft: AiSlideDraft }

type ChatOptions = {
  system: string
  user: string
  format: Record<string, unknown>
  timeoutMs: number
  signal?: AbortSignal
  /** Yanıt uzunluğu tavanı; sunum üretiminde yüksek, iyileştirmede düşük. */
  maxTokens: number
}

export class OllamaProvider implements AiProvider {
  readonly id = 'ollama'
  /** Etkin model. İstenen model kurulu değilse `ensureModel` bunu değiştirir. */
  get model(): string {
    return this.activeModel
  }
  /** İstenen model kurulu olmadığı için otomatik seçilen modele düşüldü mü? */
  get autoSelected(): boolean {
    return this.activeModel !== this.wantedModel
  }
  private wantedModel: string
  private activeModel: string
  private baseUrl: string
  private temperature: number
  private generateTimeoutMs: number
  private refineTimeoutMs: number
  /** Aynı girdi ikinci kez üretilmez (§11). */
  private cache = new AiCache<AiPresentationDraft>()
  private refineCache = new AiCache<AiSlideDraft>()
  private planCache = new AiCache<AiPlanDraft>()
  /**
   * `think` parametresini kabul etmeyen model/sürüm tespit edilirse bir daha
   * gönderilmez; her istekte 400 alıp yeniden denemeye gerek kalmaz.
   */
  private supportsThinkFlag = true

  /** Model çözümlemesi bir kez yapılır; her istekte /api/tags çağrılmaz. */
  private modelResolved = false

  constructor(cfg: OllamaConfig = {}) {
    this.baseUrl = trimSlash(cfg.baseUrl || DEFAULT_OLLAMA_URL)
    this.wantedModel = cfg.model || DEFAULT_MODEL
    this.activeModel = this.wantedModel
    this.temperature = typeof cfg.temperature === 'number' ? cfg.temperature : 0.35
    this.generateTimeoutMs = cfg.generateTimeoutMs || GENERATE_TIMEOUT_MS
    this.refineTimeoutMs = cfg.refineTimeoutMs || REFINE_TIMEOUT_MS
  }

  async health(signal?: AbortSignal): Promise<AiHealth> {
    const base: AiHealth = {
      ok: false,
      baseUrl: this.baseUrl,
      model: this.activeModel,
      modelReady: false,
      available: [],
    }
    try {
      const res = await withTimeout(HEALTH_TIMEOUT_MS, signal, (s) =>
        fetch(`${this.baseUrl}/api/tags`, { signal: s, cache: 'no-store' }),
      )
      if (!res.ok) return { ...base, error: 'http' }
      const data = (await res.json()) as { models?: { name?: string; model?: string }[] }
      const names: string[] = []
      const list = Array.isArray(data.models) ? data.models : []
      for (let i = 0; i < list.length && names.length < 20; i++) {
        const name = list[i].name || list[i].model
        if (typeof name === 'string' && name) names.push(name)
      }
      return { ...base, ok: true, available: names, modelReady: matchesModel(names, this.activeModel) }
    } catch (e) {
      return { ...base, error: errorCode(e) }
    }
  }

  /**
   * İstenen model kurulu değilse kurulu olanlar arasından en uygununa geçer
   * (otomatik bağlanma). Servise hiç ulaşılamıyorsa sessizce döner: gerçek hata
   * asıl üretim çağrısında, kullanıcıya anlamlı bir mesajla çıkar.
   */
  private async ensureModel(signal?: AbortSignal): Promise<void> {
    if (this.modelResolved) return
    this.modelResolved = true
    const health = await this.health(signal)
    if (!health.ok || health.modelReady) return
    const picked = pickModel(health.available, undefined)
    if (picked) this.activeModel = picked
  }

  async generatePresentation(req: GenerationRequest, signal?: AbortSignal): Promise<AiPresentationDraft> {
    await this.ensureModel(signal)
    // Uzun dokümanlar doğrudan gönderilmez: özetlenip bütçeye sığdırılır (§8).
    const source = req.sourceText ? condense(req.sourceText, SOURCE_BUDGET) : ''
    const key = hashKey({
      k: 'gen',
      m: this.model,
      t: req.topic,
      a: req.audience,
      d: req.durationMinutes,
      n: req.slideCount,
      l: req.language,
      o: req.tone,
      r: req.requirements,
      s: source,
    })
    const cached = this.cache.get(key)
    if (cached) return cached

    const draft = await withRetry(2, (attempt) =>
      this.chatJson(aiPresentationSchema, {
        system: systemPrompt(req.language),
        // İkinci denemede istem sertleşir: ilk tur bozuk JSON döndürdüyse
        // modeli şemaya bağlamak için açık bir uyarı eklenir.
        user:
          generateUserPrompt(req, source) +
          (attempt > 0 ? (req.language === 'en' ? '\n\nReturn valid JSON only.' : '\n\nYalnızca geçerli JSON döndür.') : ''),
        format: aiJsonSchema(req.slideCount),
        timeoutMs: this.generateTimeoutMs,
        maxTokens: 6144,
        signal,
      }),
    )
    this.cache.set(key, draft)
    return draft
  }

  /**
   * Sunumu AKIŞLA üretir: model yazdıkça tamamlanan slaytlar `onEvent` ile
   * bildirilir. Tek yapısal çağrı kuralı bozulmaz — aynı istek, sadece yanıt
   * parça parça okunuyor.
   *
   * Akış herhangi bir nedenle kurulamazsa (eski Ollama, proxy tamponlaması)
   * çağıran taraf normal `generatePresentation`a düşebilir; bu metot hata fırlatır.
   */
  async generatePresentationStream(
    req: GenerationRequest,
    onEvent: (event: GenerationEvent) => void,
    signal?: AbortSignal,
  ): Promise<AiPresentationDraft> {
    await this.ensureModel(signal)
    const source = req.sourceText ? condense(req.sourceText, SOURCE_BUDGET) : ''
    const key = hashKey({
      k: 'gen',
      m: this.model,
      t: req.topic,
      a: req.audience,
      d: req.durationMinutes,
      n: req.slideCount,
      l: req.language,
      o: req.tone,
      r: req.requirements,
      s: source,
    })

    // Önbellekte varsa yeniden üretme; olayları anında yayımla (§11).
    const cached = this.cache.get(key)
    if (cached) {
      if (cached.title) onEvent({ kind: 'meta', meta: { title: cached.title, subtitle: cached.subtitle } })
      const slides = cached.slides ?? []
      for (let i = 0; i < slides.length; i++) onEvent({ kind: 'slide', index: i, draft: slides[i] })
      return cached
    }

    const text = await this.chatStream(
      {
        system: systemPrompt(req.language),
        user: generateUserPrompt(req, source),
        format: aiJsonSchema(req.slideCount),
        timeoutMs: this.generateTimeoutMs,
        maxTokens: 6144,
        signal,
      },
      onEvent,
    )

    const json = extractJson(text)
    if (json === null) throw new AiError('bad-output', 'Model geçerli JSON döndürmedi.', text.slice(0, 400))
    const parsed = aiPresentationSchema.safeParse(json)
    if (!parsed.success) throw new AiError('bad-output', 'Model yanıtı beklenen şemaya uymadı.')

    this.cache.set(key, parsed.data)
    return parsed.data
  }

  async refineSlide(req: RefineRequest, signal?: AbortSignal): Promise<AiSlideDraft> {
    await this.ensureModel(signal)
    const key = hashKey({ k: 'ref', m: this.model, a: req.action, l: req.language, s: req.slide })
    const cached = this.refineCache.get(key)
    if (cached) return cached

    const draft = await withRetry(2, () =>
      this.chatJson(aiSlideSchema, {
        system: refineSystemPrompt(req.language),
        user: refineUserPrompt(req),
        format: aiSlideJsonSchema(metaField(req.action)),
        timeoutMs: this.refineTimeoutMs,
        maxTokens: 2048,
        signal,
      }),
    )
    this.refineCache.set(key, draft)
    return draft
  }


  async planDeck(req: GenerationRequest, sourceOutline: string, signal?: AbortSignal): Promise<AiPlanDraft> {
    await this.ensureModel(signal)
    const key = hashKey({ k: 'plan', m: this.model, ...req, o: sourceOutline })
    const cached = this.planCache.get(key)
    if (cached) return cached

    const draft = await withRetry(2, () =>
      this.chatJson(aiPlanSchema, {
        system: planSystemPrompt(req.language),
        user: planUserPrompt(req, sourceOutline),
        format: aiPlanJsonSchema(req.slideCount),
        timeoutMs: this.refineTimeoutMs,
        // Plan uzunluğu slayt sayısıyla doğrusal artar; sabit bütçe uzun
        // destelerde JSON'u ortasından kesiyordu (bkz. planBudget).
        maxTokens: planBudget(req.slideCount),
        signal,
      }),
    )
    this.planCache.set(key, draft)
    return draft
  }

  async generateSlide(req: SlideRequest, signal?: AbortSignal): Promise<AiSlideDraft> {
    await this.ensureModel(signal)
    const key = hashKey({ k: 'new', m: this.model, ...req })
    const cached = this.refineCache.get(key)
    if (cached) return cached

    const draft = await withRetry(2, () =>
      this.chatJson(aiSlideSchema, {
        system: slideSystemPrompt(req.language),
        user: slideUserPrompt(req),
        format: aiSlideJsonSchema(req.wantExample ? 'example' : undefined, req.type),
        timeoutMs: this.refineTimeoutMs,
        maxTokens: 1536,
        signal,
      }),
    )
    this.refineCache.set(key, draft)
    return draft
  }

  /* ------------------------------- iç yardımcılar ------------------------------- */

  private async chatJson<T>(
    schema: { safeParse: (v: unknown) => { success: true; data: T } | { success: false } },
    opts: ChatOptions,
  ): Promise<T> {
    const text = await this.chat(opts)
    const json = extractJson(text)
    if (json === null) throw new AiError('bad-output', 'Model geçerli JSON döndürmedi.', text.slice(0, 400))
    const parsed = schema.safeParse(json)
    if (!parsed.success) throw new AiError('bad-output', 'Model yanıtı beklenen şemaya uymadı.')
    return parsed.data
  }

  /**
   * `chat` ile aynı isteği kurar ama yanıtı akış olarak okur ve biriken metni
   * her parçada ayrıştırarak tamamlanan slaytları bildirir.
   */
  private async chatStream(opts: ChatOptions, onEvent: (event: GenerationEvent) => void): Promise<string> {
    const parser = new SlideStreamParser()
    let text = ''
    let emitted = 0

    await withTimeout(opts.timeoutMs, opts.signal, async (s) => {
      const res = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(this.chatBody(opts, true)),
        signal: s,
        cache: 'no-store',
      }).catch((e) => {
        throw toAiError(e)
      })

      if (!res.ok) {
        const detail = await res.text().catch(() => '')
        if (res.status === 404 && /model/i.test(detail)) {
          throw new AiError('model-missing', `Model bulunamadı: ${this.activeModel}`, detail.slice(0, 200))
        }
        throw new AiError('http', `Ollama ${res.status} ${res.statusText}`, detail.slice(0, 300))
      }
      if (!res.body) throw new AiError('bad-output', 'Akış gövdesi yok.')

      const iterator = readOllamaStream(res.body)
      for (;;) {
        const next = await iterator.next()
        if (next.done) break
        text += next.value.chunk
        if (!next.value.chunk) continue

        const meta = parser.readMeta(text)
        if (meta) onEvent({ kind: 'meta', meta })
        const slides = parser.readSlides(text)
        for (let i = 0; i < slides.length; i++) {
          const parsed = aiSlideSchema.safeParse(slides[i])
          // Şemaya uymayan ara nesne önizlemede atlanır; nihai ayrıştırma yine de yapılır.
          if (parsed.success) onEvent({ kind: 'slide', index: emitted, draft: parsed.data })
          emitted++
        }
      }
    })

    return stripThinking(text)
  }

  /** İstek gövdesi — akışlı ve akışsız yol aynı gövdeyi paylaşır. */
  private chatBody(opts: ChatOptions, stream: boolean): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model: this.activeModel,
      stream,
      format: opts.format,
      messages: [
        { role: 'system', content: opts.system },
        { role: 'user', content: opts.user },
      ],
      options: {
        temperature: this.temperature,
        top_p: 0.9,
        num_predict: opts.maxTokens,
        /*
         * Bağlam penceresi AÇIKÇA verilir.
         *
         * Ollama varsayılanı 4096 token ve bu, uzun destelerde çıktıyı
         * ortasından kesiyordu: 25 slaytlık bir plan yazılırken pencere doluyor,
         * JSON yarıda kalıyor ve TAMAMI geçersiz sayılıyordu. Ölçüldü — 8 ve 16
         * slayt sorunsuz, 25 slaytta "Model geçerli JSON döndürmedi". O hata da
         * tüm üretimi yerel taslağa düşürüp her slaydı aynı yer tutucuyla
         * dolduruyordu.
         *
         * 8192 bilinçli bir orta yol: katalogdaki modellerin hepsi destekliyor
         * ve bellek tüketimini iki katına çıkarmıyor. İstem + çıktı bütçesine
         * göre de büyütülüyor, çünkü kaynak dokümanı olan slaytlarda istem
         * tek başına birkaç bin token olabiliyor.
         */
        num_ctx: contextWindow(opts.system.length + opts.user.length, opts.maxTokens),
      },
    }
    // Qwen3 düşünme modunda <think> bloğu üretir; JSON şeması ile birlikte bu
    // hem yavaşlatır hem çıktıyı bozabilir. Destekleyen sürümlerde kapatılır.
    if (this.supportsThinkFlag) body.think = false
    return body
  }

  private async chat(opts: ChatOptions): Promise<string> {
    const body = this.chatBody(opts, false)

    const res = await withTimeout(opts.timeoutMs, opts.signal, (s) =>
      fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: s,
        cache: 'no-store',
      }).catch((e) => {
        throw toAiError(e)
      }),
    )

    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      // `think` desteklenmiyorsa bayrağı kapatıp bir kez daha dene.
      if (res.status === 400 && this.supportsThinkFlag && /think/i.test(detail)) {
        this.supportsThinkFlag = false
        return this.chat(opts)
      }
      if (res.status === 404 && /model/i.test(detail)) {
        throw new AiError('model-missing', `Model bulunamadı: ${this.activeModel}`, detail.slice(0, 200))
      }
      throw new AiError('http', `Ollama ${res.status} ${res.statusText}`, detail.slice(0, 300))
    }

    const data = (await res.json()) as { message?: { content?: unknown } }
    const content = data?.message?.content
    if (typeof content !== 'string' || !content.trim()) {
      throw new AiError('bad-output', 'Model boş yanıt döndürdü.')
    }
    return stripThinking(content)
  }
}

/* ================================== yardımcılar ================================== */

function trimSlash(u: string): string {
  return u.endsWith('/') ? u.slice(0, -1) : u
}

/** "qwen3:8b" istenirken kurulu "qwen3:8b-q4_K_M" da kabul edilir. */
function matchesModel(available: string[], model: string): boolean {
  const wanted = model.toLowerCase()
  const bare = wanted.split(':')[0]
  for (let i = 0; i < available.length; i++) {
    const name = available[i].toLowerCase()
    if (name === wanted || name.indexOf(wanted) === 0) return true
    if (name === bare || name.indexOf(bare + ':') === 0) return true
  }
  return false
}

/** Düşünme modundaki modellerin ürettiği <think>…</think> bloğunu atar. */
function stripThinking(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
}

/**
 * Metinden ilk dengeli JSON nesnesini çıkarır. `format` çalıştığında metin zaten
 * saf JSON'dur ve ilk `JSON.parse` başarılı olur; bu yol yalnızca eski Ollama
 * sürümlerinde (model açıklama ekleyip JSON'u ``` içine sararsa) devreye girer.
 */
function extractJson(text: string): unknown {
  const direct = tryParse(text)
  if (direct !== undefined) return direct

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced) {
    const inner = tryParse(fenced[1])
    if (inner !== undefined) return inner
  }

  const start = text.indexOf('{')
  if (start < 0) return null
  let depth = 0
  let inString = false
  let escaped = false
  for (let i = start; i < text.length; i++) {
    const ch = text[i]
    if (inString) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') inString = true
    else if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) {
        const slice = tryParse(text.slice(start, i + 1))
        return slice === undefined ? null : slice
      }
    }
  }
  return null
}

function tryParse(text: string): unknown {
  try {
    const value: unknown = JSON.parse(text.trim())
    return value && typeof value === 'object' ? value : undefined
  } catch {
    return undefined
  }
}

function errorCode(e: unknown) {
  return toAiError(e).code
}

/**
 * fetch hatalarını AiError'a çevirir. Ağ/CORS hatası `TypeError` olarak gelir;
 * kullanıcı için anlamlı olan "servise ulaşılamadı" mesajıdır.
 */
function toAiError(e: unknown): AiError {
  if (e instanceof AiError) return e
  if (typeof e === 'object' && e !== null && (e as { name?: string }).name === 'AiError') return e as AiError
  if (typeof e === 'object' && e !== null && (e as { name?: string }).name === 'AbortError') {
    return new AiError('aborted')
  }
  return new AiError('unreachable', 'Ollama servisine ulaşılamadı.', e instanceof Error ? e.message : String(e))
}
