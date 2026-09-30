// OpenAI uyumlu `chat/completions` sağlayıcısı.
//
// Tek bir gerçekleştirim, kataloğun tamamını kapsıyor: Pollinations (anahtarsız),
// OpenRouter, Groq, Google Gemini'nin OpenAI ucu, OpenAI'ın kendisi ve kullanıcının
// gireceği her OpenAI uyumlu adres. Sağlayıcılar arasındaki tek gerçek fark
// YAPISAL ÇIKTI desteği; onu da kademeli olarak düşürerek çözüyoruz:
//
//   json_schema  →  json_object  →  hiç
//
// Hangisinin çalıştığı ilk 400 yanıtında öğrenilir ve o örnek boyunca hatırlanır.
// En kötü durumda model serbest metin döndürür; `extractJson` + `normalize`
// katmanı bunu zaten onarmak için var (bkz. lib/sunum/ai/normalize.ts).

import {
  aiJsonSchema,
  aiPresentationSchema,
  aiPlanJsonSchema,
  aiPlanSchema,
  type AiPlanDraft,
  aiSlideJsonSchema,
  aiSlideSchema,
  type AiPresentationDraft,
  type AiSlideDraft,
} from '../schema'
import { condense } from '../chunk'
import type { GenerationRequest, RefineRequest, SlideRequest } from '../types'
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
import type { ProviderInfo, StructuredSupport } from './providers'
import {
  AiCache,
  AiError,
  hashKey,
  withRetry,
  withTimeout,
  type AiHealth,
  type AiProvider,
} from './provider'
import { SlideStreamParser, readSse, repairTruncatedJson, salvageDraft } from './stream'
import type { GenerationEvent } from './ollama'

/** Barındırılan servisler yereli modellerden hızlıdır; yine de cömert bir sınır. */
const GENERATE_TIMEOUT_MS = 180_000
const REFINE_TIMEOUT_MS = 60_000
const HEALTH_TIMEOUT_MS = 8_000
const SOURCE_BUDGET = 12_000

/** Yapısal çıktı denemesinin hangi kademede olduğunu tutar. */
type StructuredMode = 'json_schema' | 'json_object' | 'off'

function initialMode(support: StructuredSupport): StructuredMode {
  if (support === 'schema') return 'json_schema'
  if (support === 'json') return 'json_schema'
  return 'off'
}

function nextMode(mode: StructuredMode): StructuredMode {
  return mode === 'json_schema' ? 'json_object' : 'off'
}

export type OpenAiChatConfig = {
  provider: ProviderInfo
  model: string
  apiKey?: string
  /** 'custom' sağlayıcıda kullanıcının girdiği adres. */
  baseUrl?: string
  temperature?: number
}

type ChatOptions = {
  system: string
  user: string
  /** Yapısal çıktı şeması; `off` kademesinde yok sayılır. */
  schema: Record<string, unknown>
  schemaName: string
  maxTokens: number
  timeoutMs: number
  signal?: AbortSignal
}

export class OpenAiChatProvider implements AiProvider {
  readonly id: string
  readonly model: string
  private baseUrl: string
  private apiKey: string
  private temperature: number
  private mode: StructuredMode
  private maxOutput: number
  private reasoning: boolean
  /** Çıktı bütçesi darsa istem kısalığa ayarlanır. */
  private get compact(): boolean {
    return this.maxOutput > 0 && this.maxOutput < 3000
  }
  private cache = new AiCache<AiPresentationDraft>()
  private refineCache = new AiCache<AiSlideDraft>()
  private planCache = new AiCache<AiPlanDraft>()

  constructor(cfg: OpenAiChatConfig) {
    this.id = cfg.provider.id
    this.model = cfg.model
    this.baseUrl = trimSlash(cfg.baseUrl || cfg.provider.baseUrl)
    this.apiKey = cfg.apiKey || ''
    this.temperature = typeof cfg.temperature === 'number' ? cfg.temperature : 0.35
    this.mode = initialMode(cfg.provider.structured)
    this.maxOutput = cfg.provider.maxOutput ?? 0
    this.reasoning = cfg.provider.reasoning === true
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = { 'content-type': 'application/json' }
    if (this.apiKey) headers.authorization = `Bearer ${this.apiKey}`
    return headers
  }

  async health(signal?: AbortSignal): Promise<AiHealth> {
    const base: AiHealth = {
      ok: false,
      baseUrl: this.baseUrl,
      model: this.model,
      modelReady: false,
      available: [],
    }
    if (!this.baseUrl) return { ...base, error: 'unreachable' }

    try {
      const res = await withTimeout(HEALTH_TIMEOUT_MS, signal, (s) =>
        fetch(`${this.baseUrl}/models`, { headers: this.headers(), signal: s, cache: 'no-store' }),
      )
      if (res.status === 401 || res.status === 403) return { ...base, error: 'unreachable' }
      if (!res.ok) {
        // Bazı uçlar /models sunmuyor; modeli doğrulayamasak da servis ayakta
        // sayılır — gerçek hata asıl üretim çağrısında anlamlı mesajla çıkar.
        return { ...base, ok: true, modelReady: true }
      }
      const data = (await res.json()) as { data?: { id?: unknown }[] }
      const names: string[] = []
      const list = Array.isArray(data.data) ? data.data : []
      for (let i = 0; i < list.length; i++) {
        const id = list[i]?.id
        if (typeof id === 'string' && id) names.push(id)
      }
      return {
        ...base,
        ok: true,
        available: names,
        modelReady: names.length === 0 || names.indexOf(this.model) >= 0,
      }
    } catch {
      return { ...base, error: 'unreachable' }
    }
  }

  async generatePresentation(req: GenerationRequest, signal?: AbortSignal): Promise<AiPresentationDraft> {
    const source = req.sourceText ? condense(req.sourceText, SOURCE_BUDGET) : ''
    const key = this.cacheKey(req, source)
    const cached = this.cache.get(key)
    if (cached) return cached

    const draft = await withRetry(2, (attempt) =>
      this.chatJson(aiPresentationSchema, {
        system: systemPrompt(req.language),
        user:
          generateUserPrompt(req, source, this.compact) +
          (attempt > 0 ? (req.language === 'en' ? '\n\nReturn valid JSON only.' : '\n\nYalnızca geçerli JSON döndür.') : ''),
        schema: aiJsonSchema(req.slideCount),
        schemaName: 'presentation',
        maxTokens: 6144,
        timeoutMs: GENERATE_TIMEOUT_MS,
        signal,
      },
      // Sunum üretiminde kesilen yanıt kurtarılır; tek slayt iyileştirmesinde
      // kurtarılacak bir şey yok (tek nesne ya tamdır ya değildir).
      true,
      ),
    )
    this.cache.set(key, draft)
    return draft
  }

  /** Akışlı üretim: slaytlar yazıldıkça `onEvent` ile bildirilir (§7). */
  async generatePresentationStream(
    req: GenerationRequest,
    onEvent: (event: GenerationEvent) => void,
    signal?: AbortSignal,
  ): Promise<AiPresentationDraft> {
    const source = req.sourceText ? condense(req.sourceText, SOURCE_BUDGET) : ''
    const key = this.cacheKey(req, source)

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
        user: generateUserPrompt(req, source, this.compact),
        schema: aiJsonSchema(req.slideCount),
        schemaName: 'presentation',
        maxTokens: 6144,
        timeoutMs: GENERATE_TIMEOUT_MS,
        signal,
      },
      onEvent,
    )

    const parsed = aiPresentationSchema.safeParse(extractJson(text))
    if (parsed.success) {
      this.cache.set(key, parsed.data)
      return parsed.data
    }

    // Akış bütçede kesildiyse tamamlanmış slaytlarla devam et: kullanıcı daha az
    // slayt alır ama önizlemede gördüğü slaytlar kaybolmaz.
    const rescued = salvageDraft(text)
    const retry = rescued ? aiPresentationSchema.safeParse(rescued) : null
    if (retry && retry.success) {
      this.cache.set(key, retry.data)
      return retry.data
    }
    throw new AiError('bad-output', 'Model yanıtı beklenen şemaya uymadı.')
  }

  async refineSlide(req: RefineRequest, signal?: AbortSignal): Promise<AiSlideDraft> {
    const key = hashKey({ k: 'ref', p: this.id, m: this.model, a: req.action, l: req.language, s: req.slide })
    const cached = this.refineCache.get(key)
    if (cached) return cached

    const draft = await withRetry(2, () =>
      this.chatJson(aiSlideSchema, {
        system: refineSystemPrompt(req.language),
        user: refineUserPrompt(req),
        schema: aiSlideJsonSchema(metaField(req.action)),
        schemaName: 'slide',
        maxTokens: 2048,
        timeoutMs: REFINE_TIMEOUT_MS,
        signal,
      }),
    )
    this.refineCache.set(key, draft)
    return draft
  }

  async generateSlide(req: SlideRequest, signal?: AbortSignal): Promise<AiSlideDraft> {
    const key = hashKey({ k: 'new', p: this.id, m: this.model, ...req })
    const cached = this.refineCache.get(key)
    if (cached) return cached

    const draft = await withRetry(2, () =>
      this.chatJson(aiSlideSchema, {
        system: slideSystemPrompt(req.language),
        user: slideUserPrompt(req),
        // Tip biliniyorsa o tipin içerik alanı şemada zorunlu olur.
        schema: aiSlideJsonSchema(req.wantExample ? 'example' : undefined, req.type),
        schemaName: 'slide',
        maxTokens: 1536,
        timeoutMs: REFINE_TIMEOUT_MS,
        signal,
      }),
    )
    this.refineCache.set(key, draft)
    return draft
  }


  async planDeck(req: GenerationRequest, sourceOutline: string, signal?: AbortSignal): Promise<AiPlanDraft> {
    const key = hashKey({ k: 'plan', p: this.id, m: this.model, ...req, o: sourceOutline })
    const cached = this.planCache.get(key)
    if (cached) return cached

    const draft = await withRetry(2, () =>
      this.chatJson(aiPlanSchema, {
        system: planSystemPrompt(req.language),
        user: planUserPrompt(req, sourceOutline),
        schema: aiPlanJsonSchema(req.slideCount),
        schemaName: 'plan',
        // Plan uzunluğu slayt sayısıyla doğrusal artar; sabit bütçe uzun
        // destelerde JSON'u ortasından kesiyordu (bkz. planBudget).
        maxTokens: planBudget(req.slideCount),
        timeoutMs: REFINE_TIMEOUT_MS,
        signal,
      }),
    )
    this.planCache.set(key, draft)
    return draft
  }

  /* ------------------------------- iç yardımcılar ------------------------------- */

  private cacheKey(req: GenerationRequest, source: string): string {
    return hashKey({
      k: 'gen',
      p: this.id,
      m: this.model,
      t: req.topic,
      a: req.audience,
      d: req.durationMinutes,
      n: req.slideCount,
      l: req.language,
      o: req.tone,
      // İstekler önbellek anahtarına girer: farklı beklenti farklı sunum demek.
      r: req.requirements,
      s: source,
    })
  }

  private body(opts: ChatOptions, stream: boolean): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model: this.model,
      stream,
      temperature: this.temperature,
      // Sağlayıcının tavanını aşan bir istek yine tavanda kesilir; doğru değeri
      // göndermek modelin bütçesini bilerek planlamasına yardım ediyor.
      max_tokens: this.maxOutput > 0 ? Math.min(opts.maxTokens, this.maxOutput) : opts.maxTokens,
      messages: [
        { role: 'system', content: opts.system },
        { role: 'user', content: opts.user },
      ],
    }
    if (this.mode === 'json_schema') {
      body.response_format = {
        type: 'json_schema',
        // `strict: false`: katı mod bazı sağlayıcılarda şemanın her dalında
        // `additionalProperties: false` istiyor; gevşek mod her yerde çalışıyor.
        json_schema: { name: opts.schemaName, strict: false, schema: opts.schema },
      }
    } else if (this.mode === 'json_object') {
      body.response_format = { type: 'json_object' }
    }
    // Düşünme modelleri varsayılan ayarla bütçenin tamamını iç sese harcıyor;
    // düşük eforda içerik için yer kalıyor.
    if (this.reasoning) body.reasoning_effort = 'low'
    return body
  }

  private async chatJson<T>(
    schema: { safeParse: (v: unknown) => { success: true; data: T } | { success: false } },
    opts: ChatOptions,
    salvage = false,
  ): Promise<T> {
    const text = await this.chat(opts)
    const json = extractJson(text)
    const parsed = json === null ? null : schema.safeParse(json)
    if (parsed && parsed.success) return parsed.data

    // Yanıt token bütçesinde kesilmiş olabilir.
    if (salvage) {
      // Sunum: diziden tamamlanmış slaytları topla.
      const rescued = salvageDraft(text)
      if (rescued) {
        const retry = schema.safeParse(rescued)
        if (retry.success) return retry.data
      }
    } else {
      // Tek slayt: kesilen nesneyi kapatıp onar.
      const repaired = repairTruncatedJson(text)
      if (repaired !== null) {
        const retry = schema.safeParse(repaired)
        if (retry.success) return retry.data
      }
    }

    if (json === null) throw new AiError('bad-output', 'Model geçerli JSON döndürmedi.', text.slice(0, 400))
    throw new AiError('bad-output', 'Model yanıtı beklenen şemaya uymadı.')
  }

  private async chat(opts: ChatOptions): Promise<string> {
    const res = await withTimeout(opts.timeoutMs, opts.signal, (s) =>
      fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(this.body(opts, false)),
        signal: s,
        cache: 'no-store',
      }).catch((e) => {
        throw toAiError(e)
      }),
    )

    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      // Yapısal çıktı reddedildiyse bir kademe düşüp yeniden dene.
      if (this.downgrade(res.status, detail)) return this.chat(opts)
      throw httpError(res.status, res.statusText, detail)
    }

    const data = (await res.json()) as { choices?: { message?: { content?: unknown } }[] }
    const content = data?.choices?.[0]?.message?.content
    if (typeof content !== 'string' || !content.trim()) {
      throw new AiError('bad-output', 'Model boş yanıt döndürdü.')
    }
    return stripThinking(content)
  }

  private async chatStream(opts: ChatOptions, onEvent: (event: GenerationEvent) => void): Promise<string> {
    const parser = new SlideStreamParser()
    let text = ''
    let emitted = 0
    let downgraded = false

    await withTimeout(opts.timeoutMs, opts.signal, async (s) => {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { ...this.headers(), accept: 'text/event-stream' },
        body: JSON.stringify(this.body(opts, true)),
        signal: s,
        cache: 'no-store',
      }).catch((e) => {
        throw toAiError(e)
      })

      if (!res.ok) {
        const detail = await res.text().catch(() => '')
        if (this.downgrade(res.status, detail)) {
          downgraded = true
          return
        }
        throw httpError(res.status, res.statusText, detail)
      }
      if (!res.body) throw new AiError('bad-output', 'Akış gövdesi yok.')

      for await (const event of readSse(res.body)) {
        if (event.data === '[DONE]') break
        const parsed = safeJson<{ choices?: { delta?: { content?: unknown } }[] }>(event.data)
        // `delta.reasoning` düşünme modundaki modellerin iç sesi; içeriğe katılmaz.
        const chunk = parsed?.choices?.[0]?.delta?.content
        if (typeof chunk !== 'string' || !chunk) continue
        text += chunk

        const meta = parser.readMeta(text)
        if (meta) onEvent({ kind: 'meta', meta })
        const slides = parser.readSlides(text)
        for (let i = 0; i < slides.length; i++) {
          const slide = aiSlideSchema.safeParse(slides[i])
          if (slide.success) onEvent({ kind: 'slide', index: emitted, draft: slide.data })
          emitted++
        }
      }
    })

    // Kademe düşürüldüyse akışı baştan kur (aynı istek, farklı response_format).
    if (downgraded) return this.chatStream(opts, onEvent)
    return stripThinking(text)
  }

  /**
   * Yapısal çıktı reddedildiyse bir alt kademeye düşer. `true` dönerse çağıran
   * taraf isteği tekrarlar. Zaten en alt kademedeyse `false`.
   */
  private downgrade(status: number, detail: string): boolean {
    if (this.mode === 'off') return false
    const rejected =
      status === 400 || status === 404 || status === 422
        ? /response_format|json_schema|schema|not supported|unsupported/i.test(detail)
        : false
    if (!rejected) return false
    this.mode = nextMode(this.mode)
    return true
  }
}

/* ================================== yardımcılar ================================== */

function trimSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url
}

function safeJson<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

/** Düşünme modundaki modellerin ürettiği <think>…</think> bloğunu atar. */
function stripThinking(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
}

function httpError(status: number, statusText: string, detail: string): AiError {
  if (status === 401 || status === 403) {
    return new AiError('http', 'API anahtarı geçersiz ya da eksik.', detail.slice(0, 200))
  }
  // 402: ücretsiz katmanın kotası doldu (Pollinations bunu böyle bildiriyor).
  if (status === 402 || status === 429) {
    return new AiError('rate-limited', 'Ücretsiz kota doldu ya da hız sınırına takıldı.', detail.slice(0, 200))
  }
  if (status === 404) return new AiError('model-missing', 'Model bulunamadı.', detail.slice(0, 200))
  return new AiError('http', `${status} ${statusText}`, detail.slice(0, 300))
}

function toAiError(e: unknown): AiError {
  if (e instanceof AiError) return e
  if (typeof e === 'object' && e !== null && (e as { name?: string }).name === 'AiError') return e as AiError
  if (typeof e === 'object' && e !== null && (e as { name?: string }).name === 'AbortError') {
    return new AiError('aborted')
  }
  return new AiError('unreachable', 'Servise ulaşılamadı.', e instanceof Error ? e.message : String(e))
}

/**
 * Metinden ilk dengeli JSON nesnesini çıkarır. Yapısal çıktı çalıştığında metin
 * zaten saf JSON'dur; bu yol model açıklama ekleyip JSON'u ``` içine sardığında
 * ya da yapısal çıktı hiç desteklenmediğinde devreye girer.
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
