// POST /api/ai/refine — tek slaytı verilen komutla yeniden yazar.

import { normalizeSlide } from '@/lib/sunum/ai/normalize'
import { isAiError } from '@/lib/sunum/ai/provider'
import { getAiProvider } from '@/lib/sunum/ai/server'
import { failureResponse, guard, readJsonBody } from '@/lib/sunum/api-guard'
import { firstIssue, refineApiSchema } from '@/lib/sunum/schema'
import type { RefineRequest, SlideType } from '@/lib/sunum/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

/** Bazı komutlar tipi zorunlu kılar; model unutursa normalize düzeltir. */
function preferredType(action: RefineRequest['action']): SlideType | undefined {
  if (action === 'toChart') return 'chart'
  if (action === 'toProcess') return 'process'
  if (action === 'toBullets') return 'content'
  return undefined
}

export async function POST(req: Request): Promise<Response> {
  const failure = guard(req, 'refine')
  if (failure) return failureResponse(failure)

  const body = await readJsonBody(req)
  if (!body.ok) return failureResponse(body.failure)

  const parsed = refineApiSchema.safeParse(body.value)
  if (!parsed.success) {
    return Response.json(
      { ok: false, code: 'invalid-input', message: firstIssue(parsed.error) },
      { status: 400 },
    )
  }

  const { provider: providerId, model, ...request } = parsed.data as RefineRequest & {
    provider?: string
    model?: string
  }
  try {
    const draft = await getAiProvider(providerId, model).refineSlide(request)
    const slide = normalizeSlide(draft, {
      presentationId: request.slide.presentationId,
      order: request.slide.order,
      lang: request.language,
      existing: request.slide,
      preferredType: preferredType(request.action),
    })
    return Response.json({ ok: true, slide }, { headers: { 'cache-control': 'no-store' } })
  } catch (e) {
    if (isAiError(e)) {
      const status = e.code === 'unreachable' || e.code === 'model-missing' ? 503 : e.code === 'timeout' ? 504 : 502
      return Response.json({ ok: false, code: e.code, message: e.message }, { status })
    }
    return Response.json({ ok: false, code: 'http', message: 'Beklenmeyen bir hata oluştu.' }, { status: 500 })
  }
}
