// POST /api/ai/slide — konudan TEK yeni slayt üretir.
//
// Sunumun tamamı yeniden üretilmez: kullanıcı destesine hedefli bir ekleme
// yapar ("bu konuda bir grafik slaytı ekle"). Çıktı küçük olduğu için bütçesi
// dar ücretsiz modellerde de güvenilir çalışır.

import { normalizeSlide } from '@/lib/sunum/ai/normalize'
import { isAiError } from '@/lib/sunum/ai/provider'
import { getAiProvider } from '@/lib/sunum/ai/server'
import { failureResponse, guard, readJsonBody } from '@/lib/sunum/api-guard'
import { firstIssue, slideApiSchema } from '@/lib/sunum/schema'
import type { SlideRequest } from '@/lib/sunum/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
/**
 * Vercel sınırı. Bu değer YALNIZCA Vercel dağıtımında anlamlıdır; `next dev`,
 * `next start` ve kendi kendine barındırmada yok sayılır, dolayısıyla yerel
 * modelle uzun süren üretimi kısaltmaz.
 *
 * 60, Hobby planının üst sınırıdır — üstünde bir değer derlemeyi durdurur:
 * "Serverless Functions must have a maxDuration between 1 and 60 for plan hobby".
 * Pro/Enterprise'da 300'e kadar çıkılabilir; planı yükselttiysen bu sayıyı
 * büyütmen yeterli (Next.js bunu sabit sayı olarak ister, değişken kabul etmez).
 */
export const maxDuration = 60

export async function POST(req: Request): Promise<Response> {
  const failure = guard(req, 'refine')
  if (failure) return failureResponse(failure)

  const body = await readJsonBody(req)
  if (!body.ok) return failureResponse(body.failure)

  const parsed = slideApiSchema.safeParse(body.value)
  if (!parsed.success) {
    return Response.json({ ok: false, code: 'invalid-input', message: firstIssue(parsed.error) }, { status: 400 })
  }

  const { provider: providerId, model, ...request } = parsed.data as SlideRequest & {
    provider?: string
    model?: string
  }

  try {
    const draft = await getAiProvider(providerId, model).generateSlide(request)
    // Kimlik ve sıra istemcide yeniden atanır; burada geçici değerler yeterli.
    const slide = normalizeSlide(draft, {
      presentationId: 'preview',
      order: 0,
      lang: request.language,
      preferredType: request.type,
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
