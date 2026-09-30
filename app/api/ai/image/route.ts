// POST /api/ai/image — anahtarsız görsel üretimini SUNUCU üzerinden çalıştırır.
//
// Neden sunucu: sağlayıcı (Pollinations) tarayıcıdan gelen isteği `Origin`
// başlığına bakarak 403 ile reddediyor. Ölçüldü — aynı adres curl ile 200
// dönerken tarayıcıdan 403 dönüyor. Modülün anahtarsız sağlayıcılar için zaten
// uyguladığı kural burada da geçerli: önce sunucu yolu denenir, olmazsa tarayıcı
// doğrudan dener (bkz. lib/sunum/README.md → "Anahtar ve yol kuralları").
//
// SSRF sınırı: istemciden ADRES alınmaz, yalnızca istem metni alınır; adresi bu
// dosya kuruyor. Böylece uç, keyfi bir hedefe istek atmak için kullanılamaz.

import { failureResponse, guard, readJsonBody } from '@/lib/sunum/api-guard'
import { z } from 'zod'

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

const bodySchema = z.object({
  prompt: z.string().trim().min(3).max(600),
  width: z.number().int().min(256).max(1536).optional(),
  height: z.number().int().min(256).max(1536).optional(),
  seed: z.number().int().min(0).max(2_000_000).optional(),
})

/** Sağlayıcının anonim tarifesi kararsız; kısa aralıklarla birkaç kez denenir. */
const ATTEMPTS = 3
const BACKOFF_MS = [0, 2500, 6000]

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function POST(req: Request): Promise<Response> {
  const failure = guard(req, 'refine')
  if (failure) return failureResponse(failure)

  const body = await readJsonBody(req)
  if (!body.ok) return failureResponse(body.failure)

  const parsed = bodySchema.safeParse(body.value)
  if (!parsed.success) {
    return Response.json({ ok: false, code: 'invalid-input', message: 'Geçersiz istem.' }, { status: 400 })
  }

  const { prompt, width = 1024, height = 576, seed = Math.floor(Math.random() * 1_000_000) } = parsed.data
  const url =
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
    `?width=${width}&height=${height}&nologo=true&model=flux&seed=${seed}`

  let lastStatus = 0
  for (let i = 0; i < ATTEMPTS; i++) {
    if (BACKOFF_MS[i] > 0) await sleep(BACKOFF_MS[i])
    try {
      const res = await fetch(url, {
        // Sağlayıcı başlıksız istekte 500, tarayıcı Origin'iyle 403 dönüyor;
        // sade bir masaüstü istemcisi kimliği en yüksek başarı oranını veriyor.
        headers: { accept: 'image/*', 'user-agent': 'curl/8.4.0' },
        cache: 'no-store',
      })
      lastStatus = res.status
      if (!res.ok) continue

      const type = res.headers.get('content-type') || ''
      if (type.indexOf('image/') !== 0) continue
      const buffer = Buffer.from(await res.arrayBuffer())
      // 402'nin gövdesi 2 baytlık JSON; boyut denetimi onu görsel sanmayı önler.
      if (buffer.length < 1024) continue

      return new Response(new Uint8Array(buffer), {
        headers: { 'content-type': type, 'cache-control': 'no-store' },
      })
    } catch {
      lastStatus = 0
    }
  }

  const quota = lastStatus === 402 || lastStatus === 429
  return Response.json(
    {
      ok: false,
      code: quota ? 'rate-limited' : 'http',
      message: quota
        ? 'Ücretsiz görsel servisinin kotası doldu. Biraz sonra tekrar dene ya da kendi dosyanı yükle.'
        : 'Ücretsiz görsel servisi şu an yanıt vermiyor. Kendi dosyanı yükleyebilirsin.',
    },
    { status: quota ? 429 : 502 },
  )
}
