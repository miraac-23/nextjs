// /api/decide — Jev (TypeSafe AI) karar ucu.
//
// GET   → Jev bu kurulumda kullanılabilir mi? (anahtar tanımlı mı)
// POST  → istemcinin kurduğu soru partilerini Jev'e iletir, yanıtları birleştirir.
//
// Neden proxy: Jev anahtarı SUNUCUDA kalır, tarayıcıya hiçbir koşulda gitmez.
// Soruları istemci kuruyor (saf fonksiyon, sır içermez); sunucu yalnızca
// doğrular ve imzalar. Böylece hangi metnin dışarı gittiği istemci tarafında
// görünür ve denetlenebilir kalıyor.
//
// GİZLİLİK NOTU: bu uç çağrıldığında slayt METNİ harici bir servise gider.
// Bu yüzden arayüzde varsayılan KAPALIDIR; kullanıcı açıkça açar.

import { JevError, JevProvider, DEFAULT_JEV_MODEL } from '@/lib/sunum/decide/jev'
import { DEFAULT_GATEWAY_MODEL, GatewayDecisionProvider, GatewayError } from '@/lib/sunum/decide/gateway'
import type { DecisionProvider, DecisionSource } from '@/lib/sunum/decide/types'
import { decideRequestSchema } from '@/lib/sunum/decide/schema'
import type { Answer } from '@/lib/sunum/decide/types'
import { failureResponse, guard, readJsonBody } from '@/lib/sunum/api-guard'
import { firstIssue } from '@/lib/sunum/schema'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

function apiKey(): string {
  return process.env.TYPESAFE_API_KEY || ''
}

/**
 * Vercel AI Gateway anahtarı. Vercel entegrasyonu bu değişkeni projeye kendisi
 * ekliyor; kullanıcı hiçbir şey yapıştırmadan karar katmanı çalışır hâle geliyor.
 */
function gatewayKey(): string {
  return process.env.AI_GATEWAY_API_KEY || ''
}

/**
 * Hangi motor kullanılacak? Doğrulanmış tel formatı olan Jev önceliklidir;
 * yoksa gateway devreye girer. İkisi de yoksa uç "kullanılamaz" der ve istemci
 * yerel sezgiyle devam eder.
 */
function pickEngine(): { provider: DecisionProvider; source: DecisionSource } | null {
  const jev = apiKey()
  if (jev) {
    return {
      provider: new JevProvider(jev, process.env.TYPESAFE_MODEL || DEFAULT_JEV_MODEL),
      source: 'jev',
    }
  }
  const gateway = gatewayKey()
  if (gateway) {
    return {
      provider: new GatewayDecisionProvider(gateway, process.env.AI_GATEWAY_DECISION_MODEL || DEFAULT_GATEWAY_MODEL),
      source: 'gateway',
    }
  }
  return null
}

export async function GET(req: Request): Promise<Response> {
  const failure = guard(req, 'refine')
  if (failure) return failureResponse(failure)

  const engine = pickEngine()
  return Response.json(
    {
      available: engine !== null,
      source: engine?.source ?? null,
      model:
        engine?.source === 'jev'
          ? process.env.TYPESAFE_MODEL || DEFAULT_JEV_MODEL
          : engine
            ? process.env.AI_GATEWAY_DECISION_MODEL || DEFAULT_GATEWAY_MODEL
            : '',
    },
    { headers: { 'cache-control': 'no-store' } },
  )
}

export async function POST(req: Request): Promise<Response> {
  const failure = guard(req, 'refine')
  if (failure) return failureResponse(failure)

  const engine = pickEngine()
  if (!engine) {
    return Response.json(
      { ok: false, code: 'unavailable', message: 'Karar motoru için anahtar tanımlı değil.' },
      { status: 503 },
    )
  }

  const body = await readJsonBody(req)
  if (!body.ok) return failureResponse(body.failure)

  const parsed = decideRequestSchema.safeParse(body.value)
  if (!parsed.success) {
    return Response.json({ ok: false, code: 'invalid-input', message: firstIssue(parsed.error) }, { status: 400 })
  }

  const answers: Record<string, Answer> = {}
  let model = ''

  try {
    // Partiler sırayla gönderilir: motor zaten parti İÇİNDEKİ soruları birlikte
    // değerlendiriyor, ayrıca eşzamanlı istek atmak hız sınırına yaklaştırır.
    for (let i = 0; i < parsed.data.batches.length; i++) {
      const result = await engine.provider.decide(parsed.data.batches[i])
      Object.assign(answers, result.answers)
      if (result.model) model = result.model
    }
  } catch (e) {
    const code = e instanceof JevError || e instanceof GatewayError ? e.code : 'unreachable'
    const status = code === 'unauthorized' ? 401 : code === 'rate-limited' ? 429 : code === 'invalid' ? 422 : 502
    return Response.json(
      { ok: false, code, message: e instanceof Error ? e.message : 'Karar çağrısı başarısız.' },
      { status },
    )
  }

  return Response.json(
    { ok: true, answers, model, source: engine.source },
    { headers: { 'cache-control': 'no-store' } },
  )
}
