// POST /api/presentation/export — sunumu PPTX olarak üretir (sunucu tarafı).
//
// Tarayıcı normalde indirmeyi kendi yapar (lib/sunum/export/pptx.ts → pptxBlob):
// veri cihazdan çıkmaz ve sunucu yükü olmaz. Bu uç, ağır işi sunucuya taşımak
// isteyen kurulumlar ve otomasyon/entegrasyon (ör. bir betikten PPTX üretmek)
// için vardır. Renderer tektir; iki yol aynı kodu çağırır.

import { pptxBuffer } from '@/lib/sunum/export/pptx'
import { failureResponse, guard, readJsonBody } from '@/lib/sunum/api-guard'
import { exportRequestSchema, firstIssue } from '@/lib/sunum/schema'
import type { Presentation } from '@/lib/sunum/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** İndirme adı: ASCII dışı karakterler RFC 5987 ile ikinci parametrede verilir. */
function contentDisposition(name: string): string {
  const ascii = name.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '')
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`
}

export async function POST(req: Request): Promise<Response> {
  const failure = guard(req, 'export')
  if (failure) return failureResponse(failure)

  const body = await readJsonBody(req)
  if (!body.ok) return failureResponse(body.failure)

  const parsed = exportRequestSchema.safeParse(body.value)
  if (!parsed.success) {
    return Response.json({ ok: false, code: 'invalid-input', message: firstIssue(parsed.error) }, { status: 400 })
  }

  const presentation = parsed.data.presentation as Presentation
  const base = (parsed.data.fileName || presentation.title || 'sunum').replace(/[\\/:*?"<>|]+/g, ' ').trim()
  const fileName = `${base || 'sunum'}.pptx`

  try {
    const buffer = await pptxBuffer(presentation)
    return new Response(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'content-type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'content-disposition': contentDisposition(fileName),
        'cache-control': 'no-store',
      },
    })
  } catch (e) {
    return Response.json(
      { ok: false, code: 'export-failed', message: e instanceof Error ? e.message : 'PPTX üretilemedi.' },
      { status: 500 },
    )
  }
}
