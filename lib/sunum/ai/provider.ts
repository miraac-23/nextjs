// AI katmanı soyutlaması.
//
// Ürün kuralı (§2): harici ücretli API yok. Bugün tek gerçekleştirim yerel
// Ollama'dır (bkz. ollama.ts). Yarın başka bir motor eklenecekse yalnızca bu
// arayüzü uygulaması yeterli; UI ve normalize katmanı değişmez.
//
// Arayüz BİLİNÇLİ olarak gevşek taslak (AiPresentationDraft) döner: sıkı alan
// modeline dönüştürme işi normalize.ts'e aittir. Böylece "modelin ne dediği" ile
// "uygulamanın ne kabul ettiği" ayrı kalır ve model değiştiğinde tek dosya güncellenir.

import type { AiPlanDraft, AiPresentationDraft, AiSlideDraft } from '../schema'
import type { GenerationRequest, RefineRequest, SlideRequest } from '../types'

export type AiErrorCode =
  /** Servise hiç ulaşılamadı (kapalı, port yanlış, CORS engeli). */
  | 'unreachable'
  /** Süre aşımı. */
  | 'timeout'
  /** HTTP hata kodu döndü. */
  | 'http'
  /** Yanıt geçerli JSON/şema değil. */
  | 'bad-output'
  /** Model kurulu değil. */
  | 'model-missing'
  /** İstek iptal edildi (kullanıcı ayrıldı). */
  | 'aborted'
  /** Gövde doğrulamadan geçmedi — istek hatalı, tekrar denemek düzeltmez. */
  | 'invalid-input'
  /** Hız sınırı aşıldı. */
  | 'rate-limited'

export class AiError extends Error {
  code: AiErrorCode
  /** Kullanıcıya gösterilmeyecek teknik ayrıntı (log/geliştirici paneli). */
  detail?: string

  constructor(code: AiErrorCode, message?: string, detail?: string) {
    super(message || code)
    this.name = 'AiError'
    this.code = code
    this.detail = detail
    // es5 hedefinde `instanceof` ancak prototip elle bağlanırsa çalışır.
    Object.setPrototypeOf(this, AiError.prototype)
  }
}

export function isAiError(e: unknown): e is AiError {
  return e instanceof AiError || (typeof e === 'object' && e !== null && (e as AiError).name === 'AiError')
}

export type AiHealth = {
  ok: boolean
  baseUrl: string
  /** İstenen model. */
  model: string
  /** Model kurulu mu? `ok` true olsa bile model eksik olabilir. */
  modelReady: boolean
  /** Kurulu modeller (ilk 20) — kullanıcıya "şu modeli çek" demek için. */
  available: string[]
  error?: AiErrorCode
}

export interface AiProvider {
  readonly id: string
  readonly model: string
  /** Servis ayakta mı, model kurulu mu? Hızlı ve ucuz bir kontrol. */
  health(signal?: AbortSignal): Promise<AiHealth>
  /** Tüm sunumu TEK yapısal çağrıda üretir (§11: slayt başına çağrı yapılmaz). */
  generatePresentation(req: GenerationRequest, signal?: AbortSignal): Promise<AiPresentationDraft>
  /** Tek slaytı verilen komuta göre yeniden yazar. */
  refineSlide(req: RefineRequest, signal?: AbortSignal): Promise<AiSlideDraft>
  /**
   * Konudan TEK yeni slayt üretir (sunumun tamamını yeniden üretmeden).
   * Çıktı küçük olduğu için bütçesi dar ücretsiz modellerde de çalışır.
   */
  generateSlide(req: SlideRequest, signal?: AbortSignal): Promise<AiSlideDraft>
  /**
   * Derin üretimin 1. adımı: destenin PLANI (tip + başlık + görev tanımı).
   * Çıktı küçüktür; asıl içerik slayt başına `generateSlide` ile yazılır.
   */
  planDeck(req: GenerationRequest, sourceOutline: string, signal?: AbortSignal): Promise<AiPlanDraft>
}

/* ================================ zaman aşımı ================================ */

/**
 * `run`u en fazla `ms` kadar bekler. Dışarıdan gelen `signal` da iptal eder.
 * AbortController'ı biz kurduğumuz için fetch gerçekten kesilir — arka planda
 * çalışmaya devam eden bir istek kalmaz.
 */
export async function withTimeout<T>(
  ms: number,
  outer: AbortSignal | undefined,
  run: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const ctrl = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    ctrl.abort()
  }, ms)
  const onOuterAbort = () => ctrl.abort()
  if (outer) {
    if (outer.aborted) ctrl.abort()
    else outer.addEventListener('abort', onOuterAbort)
  }
  try {
    return await run(ctrl.signal)
  } catch (e) {
    if (timedOut) throw new AiError('timeout', `AI yanıtı ${Math.round(ms / 1000)} saniyede gelmedi.`)
    if (outer?.aborted) throw new AiError('aborted')
    throw e
  } finally {
    clearTimeout(timer)
    if (outer) outer.removeEventListener('abort', onOuterAbort)
  }
}

/**
 * Geçici hatalarda (timeout, bozuk çıktı) yeniden dener. Ulaşılamayan servis ya da
 * eksik model tekrar denemekle düzelmez; o kodlar anında yukarı fırlatılır.
 */
/** Yalnızca geçici hatalar tekrar denenir; kalanlar anında yukarı fırlatılır. */
const RETRYABLE: Record<AiErrorCode, boolean> = {
  unreachable: false,
  timeout: true,
  http: true,
  'bad-output': true,
  'model-missing': false,
  aborted: false,
  'invalid-input': false,
  'rate-limited': false,
}

export async function withRetry<T>(
  attempts: number,
  run: (attempt: number) => Promise<T>,
): Promise<T> {
  let last: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      return await run(i)
    } catch (e) {
      last = e
      const code = isAiError(e) ? e.code : null
      if (code && !RETRYABLE[code]) throw e
      // Kısa bekleme: model yüklenirken ilk istek sık sık zaman aşımına uğrar.
      if (i < attempts - 1) await sleep(400 * (i + 1))
    }
  }
  throw last instanceof Error ? last : new AiError('bad-output')
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/* ================================== önbellek ================================== */

/**
 * Süreç içi (in-process) AI önbelleği — aynı içerik ikinci kez üretilmez (§11).
 * Sunucuda rota modülü ömrü boyunca, tarayıcıda sekme ömrü boyunca yaşar; kalıcı
 * değildir çünkü sunum zaten localStorage'a kaydedilir.
 */
export class AiCache<T> {
  private map = new Map<string, { at: number; value: T }>()

  constructor(
    private max = 24,
    private ttlMs = 30 * 60 * 1000,
  ) {}

  get(key: string): T | null {
    const hit = this.map.get(key)
    if (!hit) return null
    if (Date.now() - hit.at > this.ttlMs) {
      this.map.delete(key)
      return null
    }
    // LRU: erişilen kayıt sona taşınır.
    this.map.delete(key)
    this.map.set(key, hit)
    return hit.value
  }

  set(key: string, value: T): void {
    if (this.map.size >= this.max) {
      const oldest = this.map.keys().next()
      if (!oldest.done) this.map.delete(oldest.value)
    }
    this.map.set(key, { at: Date.now(), value })
  }
}

/**
 * FNV-1a — kısa, bağımsız ve hem tarayıcıda hem Node'da çalışan karma.
 * Kriptografik değil; yalnızca önbellek anahtarı üretir.
 */
export function hashKey(input: unknown): string {
  const text = typeof input === 'string' ? input : JSON.stringify(input)
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    // 32-bit çarpım taşmasını kaybetmeden: (h * 16777619) >>> 0
    h = (h + (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24)) >>> 0
  }
  return h.toString(36) + ':' + text.length.toString(36)
}
