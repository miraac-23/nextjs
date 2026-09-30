// POST /api/ai/plan — derin üretimin 1. adımı: destenin planı.
//
// Yalnızca tip + başlık + görev tanımı döner; içerik yazılmaz. Çıktı küçük
// olduğu için bütçesi dar ücretsiz modellerde de tamamı gelir. Asıl içerik
// slayt başına /api/ai/slide ile yazılır (bkz. lib/sunum/ai/deep.ts).

import { normalizePlan } from '@/lib/sunum/ai/deep'
import { isAiError } from '@/lib/sunum/ai/provider'
import { getAiProvider } from '@/lib/sunum/ai/server'
import { failureResponse, guard, readJsonBody } from '@/lib/sunum/api-guard'
import { firstIssue, planApiSchema } from '@/lib/sunum/schema'
import type { GenerationRequest } from '@/lib/sunum/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function POST(req: Request): Promise<Response> {
  const failure = guard(req, 'generate')
  if (failure) return failureResponse(failure)

  const body = await readJsonBody(req)
  if (!body.ok) return failureResponse(body.failure)

  const parsed = planApiSchema.safeParse(body.value)
  if (!parsed.success) {
    return Response.json({ ok: false, code: 'invalid-input', message: firstIssue(parsed.error) }, { status: 400 })
  }

  const {
    provider: providerId,
    model,
    sourceOutline,
    ...request
  } = parsed.data as GenerationRequest & { provider?: string; model?: string; sourceOutline?: string }

  try {
    // Kaynak özeti istemcide deterministik olarak çıkarılıyor (retrieve.ts);
    // sunucu onu olduğu gibi modele veriyor.
    const draft = await getAiProvider(providerId, model).planDeck(request, sourceOutline ?? '')
    return Response.json(
      { ok: true, plan: normalizePlan(draft, request) },
      { headers: { 'cache-control': 'no-store' } },
    )
  } catch (e) {
    if (isAiError(e)) {
      const status = e.code === 'unreachable' || e.code === 'model-missing' ? 503 : e.code === 'timeout' ? 504 : 502
      return Response.json({ ok: false, code: e.code, message: e.message }, { status })
    }
    return Response.json({ ok: false, code: 'http', message: 'Beklenmeyen bir hata oluştu.' }, { status: 500 })
  }
}
