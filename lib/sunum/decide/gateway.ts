// Vercel AI Gateway üzerinden karar katmanı.
//
// Neden ayrı bir gerçekleştirim: Jev'in KENDİ ucu (api.typesafe.ai/v1/systemone)
// sohbet biçiminde değil, `state` + `questions` biçiminde çalışır ve doğrulanmış
// tel formatı odur (bkz. jev.ts). Vercel AI Gateway ise OpenAI SOHBET biçiminde
// konuşur ve kataloğunda 390+ model vardır (`typesafe-ai/jev` dâhil).
//
// Bu dosya gateway'i, aynı soruları JSON şemasıyla soran bir sohbet çağrısına
// çevirir. Jev'in tipli çıktısı kadar kalibre değildir ama:
//   · doğrulanmış bir biçim kullanır (sohbet + json_schema),
//   · kullanıcı Vercel entegrasyonundan gelen TEK anahtarla hem üretim hem
//     karar katmanını çalıştırabilir,
//   · yerel sezgiden belirgin biçimde daha isabetlidir.
//
// Rapor hangi motorun konuştuğunu her zaman yazar; "Jev" diye etiketlenmez.

import type { Answer, DecisionProvider, DecisionRequest, DecisionResult, Question } from './types'

export const GATEWAY_URL = 'https://ai-gateway.vercel.sh/v1/chat/completions'
/** Karar işi için ucuz, hızlı ve şemaya sadık bir varsayılan. */
export const DEFAULT_GATEWAY_MODEL = 'alibaba/qwen-3-32b'

const TIMEOUT_MS = 30_000

export class GatewayError extends Error {
  code: 'unauthorized' | 'rate-limited' | 'unreachable' | 'bad-output'
  constructor(code: GatewayError['code'], message?: string) {
    super(message || code)
    this.name = 'GatewayError'
    this.code = code
    // es5 hedefinde `instanceof` ancak prototip elle bağlanırsa çalışır.
    Object.setPrototypeOf(this, GatewayError.prototype)
  }
}

/** Soruları modele okunur biçimde anlatır. */
function describeQuestions(questions: Record<string, Question>): string {
  return Object.keys(questions)
    .map((key) => {
      const q = questions[key]
      if (q.type === 'choice') {
        const options = Object.keys(q.criteria)
          .map((o) => `      "${o}": ${q.criteria[o]}`)
          .join('\n')
        return `  ${key} (choice) — ${q.instructions}\n${options}`
      }
      if (q.type === 'score') {
        const levels = q.criteria.map((c, i) => `      ${i}: ${c}`).join('\n')
        return `  ${key} (score 0-${q.criteria.length - 1}) — ${q.instructions}\n${levels}`
      }
      const c = q.criteria
      return `  ${key} (noul 0-1) — ${q.instructions}${c ? `\n      true: ${c.true}\n      false: ${c.false}` : ''}`
    })
    .join('\n')
}

/** Yanıt için JSON şeması: her soru anahtarı bir sayı ya da seçenek dizesi. */
function answerSchema(questions: Record<string, Question>): Record<string, unknown> {
  const properties: Record<string, unknown> = {}
  Object.keys(questions).forEach((key) => {
    const q = questions[key]
    if (q.type === 'choice') properties[key] = { type: 'string', enum: Object.keys(q.criteria) }
    else properties[key] = { type: 'number' }
  })
  return {
    type: 'object',
    properties,
    required: Object.keys(questions),
  }
}

export class GatewayDecisionProvider implements DecisionProvider {
  readonly id = 'gateway' as const

  constructor(
    private apiKey: string,
    private model: string = DEFAULT_GATEWAY_MODEL,
  ) {}

  async decide(req: DecisionRequest, signal?: AbortSignal): Promise<DecisionResult> {
    const names = Object.keys(req.questions)
    if (names.length === 0) return { answers: {}, source: 'gateway', model: this.model }

    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
    const onAbort = () => ctrl.abort()
    if (signal) {
      if (signal.aborted) ctrl.abort()
      else signal.addEventListener('abort', onAbort)
    }

    try {
      const res = await fetch(GATEWAY_URL, {
        method: 'POST',
        headers: { authorization: `Bearer ${this.apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          temperature: 0,
          max_tokens: 2048,
          messages: [
            {
              role: 'system',
              content:
                'You evaluate a presentation and answer typed questions about it. ' +
                'Answer with JSON only: one key per question. ' +
                'choice → the option key as a string. score → an integer level. noul → a probability between 0 and 1. ' +
                'No prose, no explanation.',
            },
            { role: 'user', content: `STATE:\n${req.state}\n\nQUESTIONS:\n${describeQuestions(req.questions)}` },
          ],
          response_format: {
            type: 'json_schema',
            json_schema: { name: 'answers', strict: false, schema: answerSchema(req.questions) },
          },
        }),
        signal: ctrl.signal,
        cache: 'no-store',
      })

      if (!res.ok) {
        const detail = await res.text().catch(() => '')
        if (res.status === 401 || res.status === 403) throw new GatewayError('unauthorized', detail.slice(0, 200))
        if (res.status === 429) throw new GatewayError('rate-limited', detail.slice(0, 200))
        throw new GatewayError('unreachable', `${res.status} ${detail.slice(0, 200)}`)
      }

      const data = (await res.json()) as { choices?: { message?: { content?: unknown } }[] }
      const content = data?.choices?.[0]?.message?.content
      if (typeof content !== 'string') throw new GatewayError('bad-output', 'Boş yanıt.')

      return {
        answers: toAnswers(content, req.questions),
        source: 'gateway',
        model: this.model,
      }
    } catch (e) {
      if (e instanceof GatewayError) throw e
      throw new GatewayError('unreachable', e instanceof Error ? e.message : undefined)
    } finally {
      clearTimeout(timer)
      if (signal) signal.removeEventListener('abort', onAbort)
    }
  }
}

/**
 * Düz JSON yanıtını tipli `Answer`lara çevirir. Tanınmayan ya da beklenen tipe
 * uymayan alanlar ATILIR — cevapsız soru, uydurma cevaptan iyidir.
 */
function toAnswers(text: string, questions: Record<string, Question>): Record<string, Answer> {
  let parsed: Record<string, unknown>
  try {
    const value: unknown = JSON.parse(text.trim())
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    parsed = value as Record<string, unknown>
  } catch {
    return {}
  }

  const out: Record<string, Answer> = {}
  Object.keys(questions).forEach((key) => {
    const raw = parsed[key]
    const q = questions[key]

    if (q.type === 'choice') {
      if (typeof raw === 'string' && Object.prototype.hasOwnProperty.call(q.criteria, raw)) {
        out[key] = { type: 'choice', choice: raw, confidence: 0.7 }
      }
      return
    }
    if (q.type === 'score') {
      const n = typeof raw === 'number' ? raw : Number(raw)
      if (Number.isFinite(n)) {
        out[key] = { type: 'score', score: Math.min(q.criteria.length - 1, Math.max(0, n)), confidence: 0.7 }
      }
      return
    }
    const n = typeof raw === 'number' ? raw : Number(raw)
    if (Number.isFinite(n)) out[key] = { type: 'noul', noul: Math.min(1, Math.max(0, n)) }
  })

  return out
}
