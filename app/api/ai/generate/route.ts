// POST /api/ai/generate — konudan/metinden sunum üretir.
//
// İki mod:
//   normal        → tek JSON yanıtı ({ ok, presentation })
//   ?stream=1     → text/event-stream; model yazdıkça slaytlar tek tek yayımlanır.
//
// Akış modu üretim ekranının GERÇEK ilerleme göstermesi için var (§7): sahte bir
// yüzde çubuğu yerine kullanıcı slaytların oluştuğunu görüyor. Her iki mod da
// aynı tek yapısal Ollama çağrısını kullanır — slayt başına çağrı yapılmaz (§11).

import { normalizePresentation, normalizeSlide } from '@/lib/sunum/ai/normalize'
import { isAiError } from '@/lib/sunum/ai/provider'
import { getAiProvider } from '@/lib/sunum/ai/server'
import type { AiProvider } from '@/lib/sunum/ai/provider'
import type { GenerationEvent } from '@/lib/sunum/ai/ollama'
import { sseFrame } from '@/lib/sunum/ai/stream'
import { failureResponse, guard, readJsonBody } from '@/lib/sunum/api-guard'
import { firstIssue, generateApiSchema } from '@/lib/sunum/schema'
import { uid, type GenerationRequest } from '@/lib/sunum/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
/** Üretim yerel modelde uzun sürebilir; platform sınırı varsa buna göre ayarlanır. */
export const maxDuration = 300

export async function POST(req: Request): Promise<Response> {
  const failure = guard(req, 'generate')
  if (failure) return failureResponse(failure)

  const body = await readJsonBody(req)
  if (!body.ok) return failureResponse(body.failure)

  const parsed = generateApiSchema.safeParse(body.value)
  if (!parsed.success) {
    return Response.json(
      { ok: false, code: 'invalid-input', message: firstIssue(parsed.error) },
      { status: 400 },
    )
  }

  // Bağlantı alanları istekten ayrılır: alan modeli bunları taşımaz.
  const { provider: providerId, model, ...request } = parsed.data as GenerationRequest & {
    provider?: string
    model?: string
  }
  const wantsStream = new URL(req.url).searchParams.get('stream') === '1'
  const provider = getAiProvider(providerId, model)

  if (wantsStream && canStream(provider)) {
    return streamResponse(provider, request)
  }

  try {
    const draft = await provider.generatePresentation(request)
    const presentation = normalizePresentation(draft, request, { source: 'ai' })
    return Response.json({ ok: true, presentation }, { headers: { 'cache-control': 'no-store' } })
  } catch (e) {
    return aiErrorResponse(e)
  }
}

/** Akışlı üretimi destekleyen sağlayıcı mı? (Ollama ve OpenAI uyumlu istemci destekler.) */
type StreamingProvider = AiProvider & {
  generatePresentationStream: (
    req: GenerationRequest,
    onEvent: (event: GenerationEvent) => void,
    signal?: AbortSignal,
  ) => Promise<unknown>
}

function canStream(provider: AiProvider): provider is StreamingProvider {
  return typeof (provider as StreamingProvider).generatePresentationStream === 'function'
}

/**
 * Akışlı yanıt. Slaytlar oluştukça normalize edilip önizleme olarak yayımlanır;
 * sonunda tam ve doğrulanmış sunum `done` olayıyla gider. İstemci yalnızca
 * `done`daki sunumu kaydeder — ara önizlemeler geçicidir.
 */
function streamResponse(provider: StreamingProvider, request: GenerationRequest): Response {
  const encoder = new TextEncoder()
  // Önizleme slaytlarının kimlikleri nihai sunumla aynı olmayacağı için geçici
  // bir sunum kimliği üretiyoruz; `done` gerçek kimliği taşır.
  const previewId = uid('p')

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(sseFrame(event, data)))
      }

      try {
        const draft = await provider.generatePresentationStream(request, (event) => {
          if (event.kind === 'meta') {
            send('meta', event.meta)
            return
          }
          try {
            const slide = normalizeSlide(event.draft, {
              presentationId: previewId,
              order: event.index,
              lang: request.language,
            })
            send('slide', { index: event.index, slide })
          } catch {
            // Tek bir önizleme slaytı çizilemezse akış durmaz.
          }
        })

        const presentation = normalizePresentation(draft as never, request, { source: 'ai' })
        send('done', { presentation })
      } catch (e) {
        const code = isAiError(e) ? e.code : 'http'
        send('error', { code, message: e instanceof Error ? e.message : 'Üretim başarısız.' })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-store, no-transform',
      connection: 'keep-alive',
      // Ters vekil (nginx) tamponlamasın; aksi hâlde akış anlamını yitirir.
      'x-accel-buffering': 'no',
    },
  })
}

/** AiError kodlarını HTTP durumlarına eşler; istemci koda göre yol değiştirir. */
function aiErrorResponse(e: unknown): Response {
  if (isAiError(e)) {
    const status =
      e.code === 'unreachable' || e.code === 'model-missing'
        ? 503
        : e.code === 'timeout'
          ? 504
          : e.code === 'aborted'
            ? 499
            : 502
    return Response.json({ ok: false, code: e.code, message: e.message }, { status })
  }
  return Response.json({ ok: false, code: 'http', message: 'Beklenmeyen bir hata oluştu.' }, { status: 500 })
}
