'use client'

// Yerel model kurulumunu OTOMATİKLEŞTİREN katman.
//
// Sorun: "ollama pull qwen3:8b" komutu terminale aşina olmayan kullanıcı için
// bir duvar. Bu modül o duvarı iki parçaya ayırıp mümkün olanı otomatikleştiriyor:
//
//   1. Ollama'nın KENDİSİ — tarayıcıdan program kurulamaz. Yapılabilecek en iyi
//      şey: işletim sistemini tanıyıp TEK satırlık komutu ve indirme bağlantısını
//      vermek, sonra arka planda servisin açılmasını BEKLEYİP kendiliğinden
//      devam etmek. Kullanıcı "tamam" demek zorunda kalmıyor.
//
//   2. MODELİN kendisi — bu tamamen otomatikleştirilebilir. Ollama'nın
//      `POST /api/pull` ucu indirmeyi NDJSON akışıyla raporluyor; ilerleme
//      çubuğu gerçek bayt sayılarından çiziliyor, bitince model seçiliyor.
//
// Tarayıcıdan doğrudan çağrıldığı için Ollama'nın `OLLAMA_ORIGINS=*` ile
// başlatılmış olması gerekir; kurulum adımları bunu da söylüyor.

/* ================================ platform ================================ */

export type Platform = 'mac' | 'windows' | 'linux' | 'unknown'

/** Tarayıcıdan işletim sistemini tahmin eder (kurulum komutunu seçmek için). */
export function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'unknown'
  const ua = navigator.userAgent.toLowerCase()
  if (ua.indexOf('mac') >= 0) return 'mac'
  if (ua.indexOf('win') >= 0) return 'windows'
  if (ua.indexOf('linux') >= 0 || ua.indexOf('x11') >= 0) return 'linux'
  return 'unknown'
}

export type InstallRecipe = {
  /** Terminale yapıştırılacak komut (varsa). */
  command?: string
  /** İndirme sayfası — komut satırı istemeyen kullanıcı için. */
  downloadUrl: string
  /** Servisi tarayıcıya açan başlatma komutu. */
  serveCommand: string
}

/**
 * Platforma göre kurulum reçetesi.
 *
 * `serveCommand` her platformda gerekli: Ollama varsayılan olarak yalnızca
 * localhost'tan gelen ham isteklere yanıt veriyor, tarayıcıdan çağrılabilmesi
 * için OLLAMA_ORIGINS ayarlanmalı.
 */
export const INSTALL_RECIPES: Record<Platform, InstallRecipe> = {
  mac: {
    command: 'brew install ollama',
    downloadUrl: 'https://ollama.com/download/mac',
    serveCommand: 'OLLAMA_ORIGINS=* ollama serve',
  },
  linux: {
    command: 'curl -fsSL https://ollama.com/install.sh | sh',
    downloadUrl: 'https://ollama.com/download/linux',
    serveCommand: 'OLLAMA_ORIGINS=* ollama serve',
  },
  windows: {
    command: 'winget install Ollama.Ollama',
    downloadUrl: 'https://ollama.com/download/windows',
    serveCommand: 'setx OLLAMA_ORIGINS "*"',
  },
  unknown: {
    downloadUrl: 'https://ollama.com/download',
    serveCommand: 'OLLAMA_ORIGINS=* ollama serve',
  },
}

/* ============================== servisi bekleme ============================== */

/**
 * Ollama ayağa kalkana kadar yoklar. Kullanıcı kurulumu yaparken sayfa açık
 * kalıyor; servis göründüğü anda akış kendiliğinden devam ediyor.
 *
 * `onTick` her denemede çağrılır — arayüz "bekleniyor (12s)" gösterebilsin diye.
 */
/**
 * Servise ulaşılıyor mu? Önce tarayıcıdan, olmazsa bu sitenin sunucusundan.
 *
 * Tarayıcıdan `localhost:11434`e erişim Ollama'nın CORS kısıtına takılıyor ve
 * ancak `OLLAMA_ORIGINS` ayarlıysa çalışıyor; sunucuda böyle bir kısıt yok.
 * Tek başına tarayıcıya bakmak, çalışan bir Ollama'yı "kapalı" saydırıyordu.
 */
async function reachable(baseUrl: string, signal?: AbortSignal, serverFallback = true): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl}/api/tags`, { signal, cache: 'no-store' })
    if (res.ok) return true
  } catch {
    /* CORS ya da kapalı — sunucudan bakılır. */
  }
  // Barındırılan dağıtımda sunucu yoklaması anlamsız: oradaki `localhost`
  // Vercel'in kabı, kullanıcının makinesi değil. Her 2,5 saniyede bir boşuna
  // fonksiyon çağırmamak için bu yol kapatılabiliyor.
  if (!serverFallback) return false
  try {
    const res = await fetch('/api/ai/local', { signal, cache: 'no-store' })
    return res.ok
  } catch {
    return false
  }
}

/** Sunucudan Ollama servisini başlatma sonucu. */
export type ServeResult =
  | 'started'
  | 'already-running'
  | 'not-installed'
  | 'not-local'
  | 'hosted'
  | 'failed'

/**
 * Bu dağıtım Ollama'yı SUNUCUDAN başlatabilir mi?
 *
 * Neden sorulması gerekiyor: uygulama Vercel gibi barındırılan bir ortamdaysa
 * sunucu ziyaretçinin makinesi DEĞİLDİR. Orada başlatma düğmesi göstermek,
 * kullanıcıyı çalışmayacak bir düğmeye ve ardından "uygulamayı elle aç"
 * mesajına götürüyordu. Yetenek önden okunup düğme hiç çizilmiyor.
 *
 * Ağ hatasında `canServe: false` dönülür: emin olunamayan durumda kullanıcıya
 * çalışmayabilecek bir düğme göstermemek daha doğru.
 */
export type ServeCapability = { canServe: boolean; hosted: boolean; running: boolean }

export async function serveCapability(signal?: AbortSignal): Promise<ServeCapability> {
  try {
    const res = await fetch('/api/ai/local/serve', { signal, cache: 'no-store' })
    if (!res.ok) return { canServe: false, hosted: true, running: false }
    const data = (await res.json()) as Partial<ServeCapability>
    return {
      canServe: data.canServe === true,
      hosted: data.hosted !== false,
      running: data.running === true,
    }
  } catch {
    return { canServe: false, hosted: true, running: false }
  }
}

/**
 * Servisi SUNUCUDAN başlatır (bkz. /api/ai/local/serve).
 *
 * Tarayıcı bir programı başlatamaz; ama bu uygulamanın sunucusu kullanıcının
 * kendi makinesinde çalıştığı için başlatabiliyor. "Terminalde `ollama serve`
 * yaz" adımı böylece bir düğmeye dönüşüyor.
 */
export async function startOllama(signal?: AbortSignal): Promise<ServeResult> {
  try {
    const res = await fetch('/api/ai/local/serve', { method: 'POST', signal, cache: 'no-store' })
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; alreadyRunning?: boolean; code?: string }
    if (res.ok && data.ok) return data.alreadyRunning ? 'already-running' : 'started'
    if (data.code === 'not-installed') return 'not-installed'
    if (data.code === 'not-local') return 'not-local'
    if (data.code === 'hosted') return 'hosted'
    return 'failed'
  } catch {
    return 'failed'
  }
}

export async function waitForOllama(
  baseUrl: string,
  options: {
    signal?: AbortSignal
    intervalMs?: number
    timeoutMs?: number
    onTick?: (elapsedMs: number) => void
    /** Barındırılan dağıtımda kapatılır: sunucunun `localhost`u kullanıcının makinesi değil. */
    serverFallback?: boolean
  } = {},
): Promise<boolean> {
  const interval = options.intervalMs ?? 2500
  const timeout = options.timeoutMs ?? 10 * 60 * 1000
  const started = Date.now()

  for (;;) {
    if (options.signal?.aborted) return false
    if (Date.now() - started > timeout) return false

    // Doğrudan yol CORS'a takılabilir (`OLLAMA_ORIGINS` yoksa); sunucudan
    // bakmak servisin gerçekten ayakta olup olmadığını söyler.
    if (await reachable(baseUrl, options.signal, options.serverFallback ?? true)) return true

    options.onTick?.(Date.now() - started)
    await new Promise((resolve) => setTimeout(resolve, interval))
  }
}

/* ================================ model indirme ================================ */

export type PullProgress = {
  /** Ollama'nın verdiği ham durum ("pulling manifest", "verifying…", "success"). */
  status: string
  /** 0–1 arası ilerleme; katman boyutu bilinmiyorsa null. */
  ratio: number | null
  completedBytes: number
  totalBytes: number
}

export class PullError extends Error {
  code: 'unreachable' | 'not-found' | 'failed'
  constructor(code: 'unreachable' | 'not-found' | 'failed', message?: string) {
    super(message || code)
    this.name = 'PullError'
    this.code = code
    // es5 hedefinde `instanceof` ancak prototip elle bağlanırsa çalışır.
    Object.setPrototypeOf(this, PullError.prototype)
  }
}

/**
 * Modeli indirir ve ilerlemeyi bildirir.
 *
 * Ollama katman katman indirir; her katman kendi `total`/`completed` değerini
 * raporlar. Tek bir yüzde göstermek için EN BÜYÜK katmanın ilerlemesi baz alınır
 * (model boyutunun neredeyse tamamı ağırlık dosyasıdır), böylece çubuk geri
 * gitmez ve gerçeğe yakın kalır.
 */
export async function pullModel(
  baseUrl: string,
  model: string,
  onProgress: (progress: PullProgress) => void,
  signal?: AbortSignal,
): Promise<void> {
  /*
   * İki yol: önce tarayıcıdan doğrudan Ollama'ya, olmazsa bu sitenin
   * sunucusundan (`/api/ai/local`). Doğrudan yol `OLLAMA_ORIGINS` ayarı
   * gerektiriyor ve terminal bilmeyen kullanıcı tam orada tıkanıyordu;
   * sunucuda CORS kısıtı yok. Akış ve ilerleme iki yolda da birebir aynı.
   */
  let res: Response | null = null
  try {
    const direct = await fetch(`${baseUrl}/api/pull`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      // `name` eski sürümlerin alanı, `model` yenilerinin; Ollama tanımadığı
      // alanı yok sayıyor, ikisini birden göndermek sürüm farkını kapatıyor.
      body: JSON.stringify({ model, name: model, stream: true }),
      signal,
      cache: 'no-store',
    })
    // Doğrudan yol HATA ATMADAN da başarısız olabiliyor (403, gövdesiz yanıt).
    // O durumda da yedeğe düşülmeli; yoksa çalışan bir Ollama'da indirme
    // "ulaşılamadı" diye raporlanıyor.
    if (direct.ok && direct.body) res = direct
  } catch {
    /* Doğrudan yol düştü; aşağıdaki sunucu yolu denenir. */
  }

  if (!res) {
    try {
      const proxied = await fetch('/api/ai/local', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model }),
        signal,
        cache: 'no-store',
      })
      if (proxied.status === 404) throw new PullError('not-found')
      if (!proxied.ok || !proxied.body) throw new PullError('unreachable')
      res = proxied
    } catch (e) {
      if (e instanceof PullError) throw e
      throw new PullError('unreachable', e instanceof Error ? e.message : undefined)
    }
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    if (res.status === 404) throw new PullError('not-found', detail.slice(0, 200))
    throw new PullError('failed', `${res.status} ${res.statusText} ${detail.slice(0, 200)}`)
  }
  if (!res.body) throw new PullError('failed', 'Akış gövdesi yok.')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  /** Görülen en büyük katman — yüzde bunun üzerinden hesaplanır. */
  let biggestTotal = 0
  let biggestCompleted = 0
  let succeeded = false

  try {
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      let newline = buffer.indexOf('\n')
      while (newline >= 0) {
        const line = buffer.slice(0, newline).trim()
        buffer = buffer.slice(newline + 1)
        newline = buffer.indexOf('\n')
        if (!line) continue

        let parsed: { status?: unknown; error?: unknown; total?: unknown; completed?: unknown }
        try {
          parsed = JSON.parse(line)
        } catch {
          continue // yarım satır bir sonraki turda tamamlanır
        }

        if (typeof parsed.error === 'string' && parsed.error) {
          throw new PullError(/not found|unknown model/i.test(parsed.error) ? 'not-found' : 'failed', parsed.error)
        }

        const total = typeof parsed.total === 'number' ? parsed.total : 0
        const completed = typeof parsed.completed === 'number' ? parsed.completed : 0
        if (total > biggestTotal) {
          biggestTotal = total
          biggestCompleted = completed
        } else if (total === biggestTotal && completed > biggestCompleted) {
          biggestCompleted = completed
        }

        const status = typeof parsed.status === 'string' ? parsed.status : ''
        if (status === 'success') succeeded = true

        onProgress({
          status,
          ratio: biggestTotal > 0 ? Math.min(1, biggestCompleted / biggestTotal) : null,
          completedBytes: biggestCompleted,
          totalBytes: biggestTotal,
        })
      }
    }
  } finally {
    reader.releaseLock()
  }

  // Akış hatasız bitti ama "success" görülmediyse indirme yarıda kesilmiş demektir.
  if (!succeeded) throw new PullError('failed', 'İndirme tamamlanmadan kesildi.')
}

/** Baytı okunur biçime çevirir ("2.4 GB"). */
export function formatBytes(bytes: number, lang: 'tr' | 'en' = 'tr'): string {
  if (bytes <= 0) return '0 MB'
  const gb = bytes / 1024 ** 3
  if (gb >= 1) return `${gb.toFixed(1).replace('.', lang === 'tr' ? ',' : '.')} GB`
  return `${Math.round(bytes / 1024 ** 2)} MB`
}
