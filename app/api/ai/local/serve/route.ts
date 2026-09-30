// POST /api/ai/local/serve — Ollama servisini SUNUCUDAN başlatır.
//
// Neden mümkün: bu uygulamanın sunucusu kullanıcının kendi makinesinde çalışıyor
// (yerel geliştirme ya da kendi kendine barındırma). Tarayıcı bir programı
// başlatamaz, ama sunucu başlatabilir. Böylece "terminalde `ollama serve` yaz"
// adımı bir DÜĞMEYE dönüşüyor.
//
// Bilinçli sınırlar:
//   • Komut SABİT: `ollama serve`. İstemciden hiçbir argüman alınmaz, dolayısıyla
//     bu uç keyfi komut çalıştırmak için kullanılamaz.
//   • Yalnızca hedef Ollama adresi YEREL (loopback) olduğunda çalışır. Uzak bir
//     Ollama yapılandırılmışsa süreç başlatmanın anlamı yok ve reddedilir.
//   • Süreç `detached` başlatılır ve `unref` edilir: sunucu isteği biterken
//     servis ayakta kalır.
//   • Barındırılan bir dağıtımda (Vercel vb.) `ollama` ikilisi yoktur; bu durum
//     hata olarak değil "bulunamadı" olarak raporlanır ve arayüz elle kurulum
//     adımlarını gösterir.

import { spawn } from 'node:child_process'
import { failureResponse, guard } from '@/lib/sunum/api-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

/** Yapılandırılan Ollama adresi bu makinede mi? */
function isLoopback(url: string): boolean {
  try {
    const host = new URL(url).hostname
    return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]'
  } catch {
    return false
  }
}

function baseUrl(): string {
  return (process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/+$/, '')
}

/**
 * Servis yanıt veriyor mu? Başlatmadan önce ve sonra aynı kontrol kullanılır.
 *
 * Birden fazla adres denenir: Ollama makineye göre IPv4'e ya da IPv6'ya
 * bağlanabiliyor ve yalnızca birine bakmak "ulaşılamadı" hatasına yol açıyor.
 */
async function up(): Promise<boolean> {
  const list = process.env.OLLAMA_BASE_URL
    ? [baseUrl()]
    : ['http://127.0.0.1:11434', 'http://localhost:11434', 'http://[::1]:11434']
  for (let i = 0; i < list.length; i++) {
    try {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 1200)
      const res = await fetch(`${list[i]}/api/tags`, { signal: ctrl.signal, cache: 'no-store' })
      clearTimeout(timer)
      if (res.ok) return true
    } catch {
      /* sonraki adres */
    }
  }
  return false
}

export async function POST(req: Request): Promise<Response> {
  const failure = guard(req, 'refine')
  if (failure) return failureResponse(failure)

  if (!isLoopback(baseUrl())) {
    return Response.json({ ok: false, code: 'not-local' }, { status: 400 })
  }

  // Zaten ayaktaysa ikinci bir süreç başlatmaya gerek yok.
  if (await up()) return Response.json({ ok: true, alreadyRunning: true })

  try {
    const child = spawn('ollama', ['serve'], {
      detached: true,
      stdio: 'ignore',
      // Ollama'nın kurulum yerleri kabuk PATH'inde olmayabilir; yaygın olanlar eklenir.
      env: {
        ...process.env,
        PATH: [process.env.PATH, '/usr/local/bin', '/opt/homebrew/bin', '/usr/bin'].filter(Boolean).join(':'),
      },
    })
    child.unref()

    // Başlaması an meselesi değil; kısa bir süre yoklanır.
    for (let i = 0; i < 12; i++) {
      await new Promise((resolve) => setTimeout(resolve, 500))
      if (await up()) return Response.json({ ok: true, alreadyRunning: false })
    }
    return Response.json({ ok: false, code: 'timeout' }, { status: 504 })
  } catch (e) {
    // ENOENT = `ollama` ikilisi yok: önce uygulamanın kurulması gerekiyor.
    const code = (e as { code?: string })?.code === 'ENOENT' ? 'not-installed' : 'failed'
    return Response.json({ ok: false, code }, { status: code === 'not-installed' ? 404 : 500 })
  }
}
