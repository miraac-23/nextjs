// /api/ai/local — yerel Ollama servisini SUNUCU üzerinden kullanır.
//
// Neden gerekli: tarayıcıdan `localhost:11434`e yapılan istek Ollama'nın CORS
// kısıtına takılıyor ve ancak `OLLAMA_ORIGINS=*` ile çalışıyor. Yani kurulum
// sihirbazı, terminal bilmeyen kullanıcıya "önce şu komutu çalıştır" demek
// zorunda kalıyordu — sihirbazın bütün amacı tam olarak bunu gerektirmemekti.
//
// Sunucudan yapılan istekte CORS yoktur. Bu uç iki şey sunar:
//   GET  → kurulu modeller (servis kapalıysa 503)
//   POST → model indirme; Ollama'nın NDJSON akışı olduğu gibi geçirilir,
//          böylece ilerleme GERÇEK bayt sayısıyla akmaya devam eder.
//
// Güvenlik: istemciden ADRES alınmaz. Hedef, sunucunun kendi yapılandırmasıdır
// (`OLLAMA_BASE_URL`); istemciden yalnızca model adı gelir ve o da biçim
// denetiminden geçer. Böylece uç keyfi bir hedefe istek atmak için kullanılamaz.

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

/** Ollama etiketleri: "qwen3:8b", "library/gemma3:12b" gibi. */
const bodySchema = z.object({
  model: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-zA-Z0-9._/-]+(:[a-zA-Z0-9._-]+)?$/),
})

function baseUrl(): string {
  return (process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/+$/, '')
}

/**
 * Denenecek adresler.
 *
 * Ollama makineye göre IPv4'e (`127.0.0.1`) ya da IPv6'ya (`::1`) bağlanabiliyor;
 * yalnızca birine bakmak "ulaşılamadı" hatasına yol açıyor. Kullanıcı kendi
 * adresini `OLLAMA_BASE_URL` ile verdiyse yalnızca o denenir.
 */
function candidates(): string[] {
  if (process.env.OLLAMA_BASE_URL) return [baseUrl()]
  return ['http://127.0.0.1:11434', 'http://localhost:11434', 'http://[::1]:11434']
}

/** İlk yanıt veren adres; hiçbiri yanıt vermezse `null`. */
async function liveBase(): Promise<string | null> {
  const list = candidates()
  for (let i = 0; i < list.length; i++) {
    try {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 1200)
      const res = await fetch(`${list[i]}/api/tags`, { signal: ctrl.signal, cache: 'no-store' })
      clearTimeout(timer)
      if (res.ok) return list[i]
    } catch {
      /* sonraki adres */
    }
  }
  return null
}

export async function GET(req: Request): Promise<Response> {
  const failure = guard(req, 'refine')
  if (failure) return failureResponse(failure)

  try {
    const base = await liveBase()
    if (!base) return Response.json({ ok: false }, { status: 503 })
    const res = await fetch(`${base}/api/tags`, { cache: 'no-store' })
    if (!res.ok) return Response.json({ ok: false }, { status: 503 })

    const data = (await res.json()) as { models?: { name?: string; model?: string }[] }
    const list = Array.isArray(data.models) ? data.models : []
    const models: string[] = []
    for (let i = 0; i < list.length; i++) {
      const name = list[i].name || list[i].model
      if (typeof name === 'string' && name) models.push(name)
    }
    return Response.json({ ok: true, models }, { headers: { 'cache-control': 'no-store' } })
  } catch {
    // Servis kapalı ya da ulaşılamıyor — sihirbaz kurulum adımlarını gösterir.
    return Response.json({ ok: false }, { status: 503 })
  }
}

export async function POST(req: Request): Promise<Response> {
  const failure = guard(req, 'refine')
  if (failure) return failureResponse(failure)

  const body = await readJsonBody(req)
  if (!body.ok) return failureResponse(body.failure)

  const parsed = bodySchema.safeParse(body.value)
  if (!parsed.success) {
    return Response.json({ ok: false, code: 'invalid-input', message: 'Geçersiz model adı.' }, { status: 400 })
  }

  const base = await liveBase()
  if (!base) return Response.json({ ok: false, code: 'unreachable' }, { status: 503 })

  let upstream: Response
  try {
    upstream = await fetch(`${base}/api/pull`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      // `name` eski sürümlerin alanı, `model` yenilerinin; ikisini birden
      // göndermek sürüm farkını kapatıyor (Ollama tanımadığı alanı yok sayar).
      body: JSON.stringify({ model: parsed.data.model, name: parsed.data.model, stream: true }),
      cache: 'no-store',
    })
  } catch {
    return Response.json({ ok: false, code: 'unreachable' }, { status: 503 })
  }

  if (!upstream.ok || !upstream.body) {
    return Response.json(
      { ok: false, code: upstream.status === 404 ? 'not-found' : 'failed' },
      { status: upstream.status === 404 ? 404 : 502 },
    )
  }

  // NDJSON akışı olduğu gibi geçirilir: ilerleme istemciye canlı ulaşsın.
  return new Response(upstream.body, {
    headers: { 'content-type': 'application/x-ndjson', 'cache-control': 'no-store' },
  })
}
