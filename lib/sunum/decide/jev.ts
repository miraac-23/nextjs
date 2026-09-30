// Jev (TypeSafe AI, System One) gerçekleştirimi.
//
// Uç nokta:  POST https://api.typesafe.ai/v1/systemone
// Kimlik:    Authorization: Bearer <TYPESAFE_API_KEY>
// Gövde:     { model, state, questions: { <ad>: { type, instructions, criteria } } }
// Yanıt:     { model, answers: { <ad>: { type, choice|score|noul, probabilities?, confidence? } }, usage }
//
// Neden bu model: sorular PARALEL değerlendiriliyor, yani bir destenin tüm
// slaytları için onlarca kararı tek çağrıda 70–500 ms'de alabiliyoruz. Çıktı
// ücretsiz, girdi 1M token başına ~$0.04 — 13 slaytlık bir deste tek haneli
// kuruş. Buna rağmen ZORUNLU DEĞİL: anahtar yoksa yerel kural motoru devreye girer.
//
// Bu dosya YALNIZCA sunucuda çalışır: anahtar tarayıcıya hiçbir koşulda gitmez.

import type { Answer, DecisionProvider, DecisionRequest, DecisionResult } from './types'

export const JEV_ENDPOINT = 'https://api.typesafe.ai/v1/systemone'
export const DEFAULT_JEV_MODEL = 'jev-latest'

/** 70–500 ms beklenen bir servis için cömert ama sonsuz olmayan sınır. */
const TIMEOUT_MS = 15_000

/** Jev bağlam sınırı 64k token; karakter olarak kabaca dört katı kadar yer var. */
export const JEV_STATE_BUDGET = 180_000

export type JevErrorCode = 'unauthorized' | 'invalid' | 'rate-limited' | 'overloaded' | 'unreachable' | 'bad-output'

export class JevError extends Error {
  code: JevErrorCode
  constructor(code: JevErrorCode, message?: string) {
    super(message || code)
    this.name = 'JevError'
    this.code = code
    // es5 hedefinde `instanceof` ancak prototip elle bağlanırsa çalışır.
    Object.setPrototypeOf(this, JevError.prototype)
  }
}

/** HTTP durumunu belgelenmiş hata koduna çevirir. */
function codeFor(status: number): JevErrorCode {
  if (status === 401) return 'unauthorized'
  if (status === 422) return 'invalid'
  if (status === 429) return 'rate-limited'
  if (status === 529) return 'overloaded'
  return 'unreachable'
}

/** Yalnızca geçici hatalar tekrar denenir. */
function retryable(code: JevErrorCode): boolean {
  return code === 'rate-limited' || code === 'overloaded' || code === 'unreachable'
}

export class JevProvider implements DecisionProvider {
  readonly id = 'jev' as const

  constructor(
    private apiKey: string,
    private model: string = DEFAULT_JEV_MODEL,
  ) {}

  async decide(req: DecisionRequest, signal?: AbortSignal): Promise<DecisionResult> {
    const names = Object.keys(req.questions)
    if (names.length === 0) return { answers: {}, source: 'jev', model: this.model }

    const body = {
      model: this.model,
      state: req.state.slice(0, JEV_STATE_BUDGET),
      questions: req.questions,
    }

    // İki deneme: 429/529 anlık dalgalanmalarda ikinci istek genelde geçiyor.
    let lastError: JevError = new JevError('unreachable')
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await this.post(body, signal)
      } catch (e) {
        const error = e instanceof JevError ? e : new JevError('unreachable')
        lastError = error
        if (!retryable(error.code) || attempt === 1) throw error
        // `retry-after` başlığı yoksa kısa bir geri çekilme yeter.
        await new Promise((resolve) => setTimeout(resolve, 600))
      }
    }
    throw lastError
  }

  private async post(body: unknown, outer?: AbortSignal): Promise<DecisionResult> {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
    const onAbort = () => ctrl.abort()
    if (outer) {
      if (outer.aborted) ctrl.abort()
      else outer.addEventListener('abort', onAbort)
    }

    try {
      const res = await fetch(JEV_ENDPOINT, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: ctrl.signal,
        cache: 'no-store',
      })

      if (!res.ok) {
        const detail = await res.text().catch(() => '')
        throw new JevError(codeFor(res.status), `Jev ${res.status}: ${detail.slice(0, 200)}`)
      }

      const data = (await res.json()) as { model?: unknown; answers?: unknown }
      const answers = normalizeAnswers(data.answers)
      if (!answers) throw new JevError('bad-output', 'Jev yanıtı beklenen biçimde değil.')
      return {
        answers,
        source: 'jev',
        model: typeof data.model === 'string' ? data.model : this.model,
      }
    } catch (e) {
      if (e instanceof JevError) throw e
      throw new JevError('unreachable', e instanceof Error ? e.message : undefined)
    } finally {
      clearTimeout(timer)
      if (outer) outer.removeEventListener('abort', onAbort)
    }
  }
}

/**
 * Yanıtı kendi tiplerimize indirger. Tanınmayan alanlar atılır; bozuk tek bir
 * yanıt tüm sonucu düşürmez, yalnızca o soru cevapsız kalır (çağıran taraf
 * cevapsız soruyu yerel sezgiyle doldurur).
 */
function normalizeAnswers(value: unknown): Record<string, Answer> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const source = value as Record<string, unknown>
  const out: Record<string, Answer> = {}

  Object.keys(source).forEach((key) => {
    const raw = source[key]
    if (!raw || typeof raw !== 'object') return
    const item = raw as Record<string, unknown>
    const confidence = typeof item.confidence === 'number' ? item.confidence : undefined

    if (item.type === 'noul' && typeof item.noul === 'number') {
      out[key] = { type: 'noul', noul: clamp01(item.noul) }
      return
    }
    if (item.type === 'choice' && typeof item.choice === 'string') {
      out[key] = {
        type: 'choice',
        choice: item.choice,
        probabilities: numberMap(item.probabilities),
        confidence,
      }
      return
    }
    if (item.type === 'score' && typeof item.score === 'number' && Number.isFinite(item.score)) {
      out[key] = { type: 'score', score: item.score, confidence }
    }
  })

  return out
}

function clamp01(n: number): number {
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0
}

function numberMap(value: unknown): Record<string, number> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const source = value as Record<string, unknown>
  const out: Record<string, number> = {}
  Object.keys(source).forEach((key) => {
    const n = source[key]
    if (typeof n === 'number' && Number.isFinite(n)) out[key] = n
  })
  return Object.keys(out).length > 0 ? out : undefined
}
