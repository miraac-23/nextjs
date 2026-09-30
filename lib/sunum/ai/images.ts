'use client'

/**
 * Slayt görselleri: anahtarsız üretim + cihazda küçültme.
 *
 * NEDEN tarayıcıda: sunumlar `localStorage`'da saklanıyor ve şema yalnızca
 * gömülü `data:` URL kabul ediyor (harici URL bilinçli olarak render edilmiyor).
 * Görsel sunucumuzdan geçseydi hem gereksiz bir proxy ucu açardık hem de
 * kullanıcının istemi bizim sunucumuzda loglanırdı. Bu dosya istemi doğrudan
 * tarayıcıdan ücretsiz servise gönderir, sonucu canvas ile küçültür ve
 * yalnızca `data:image/jpeg` (ya da yüklenen GIF için `data:image/gif`)
 * döndürür — yani şemanın kabul ettiği tek biçime.
 *
 * Servis: Pollinations image (https://image.pollinations.ai) — anahtar
 * istemiyor, `access-control-allow-origin: *` gönderiyor, dolayısıyla `fetch`
 * ile okunabiliyor. Anonim kullanımda ara sıra HTTP 402 ile hız sınırı
 * uyguluyor; bu yüzden aşağıda kısa bir yeniden deneme döngüsü var.
 */

import { LIMITS } from '@/lib/sunum/schema'

/* ----------------------------- hata tipleri ----------------------------- */

/**
 * `target: es5` altında `Error` alt sınıfının prototip zinciri kopar ve
 * `instanceof` çalışmaz; her sınıfta prototip elle geri bağlanıyor.
 */
export class ImageGenerationError extends Error {
  constructor(reason: string) {
    super(`image-generation-failed: ${reason}`)
    this.name = 'ImageGenerationError'
    Object.setPrototypeOf(this, ImageGenerationError.prototype)
  }
}

/**
 * Sağlayıcı isteği reddetti (kota, hız sınırı, geçici arıza).
 *
 * `ImageGenerationError`den ayrı bir tip: yedek yola düşmenin ANLAMSIZ olduğu
 * tek durum budur ve kullanıcıya gösterilecek mesaj da farklıdır ("biraz bekle"
 * ile "bozuk" aynı şey değil).
 */
export class ImageProviderError extends Error {
  readonly status: number
  constructor(status: number) {
    super(`image-provider-refused: ${status}`)
    this.name = 'ImageProviderError'
    this.status = status
    Object.setPrototypeOf(this, ImageProviderError.prototype)
  }
}

/** Görsel, kota sınırının (`LIMITS.imageDataUrl`) altına indirilemedi. */
export class ImageTooLargeError extends Error {
  constructor() {
    super('image-too-large')
    this.name = 'ImageTooLargeError'
    Object.setPrototypeOf(this, ImageTooLargeError.prototype)
  }
}

/** Kullanıcı üretimi iptal etti — hata mesajı gösterilmemeli. */
export class ImageAbortedError extends Error {
  constructor() {
    super('image-aborted')
    this.name = 'ImageAbortedError'
    Object.setPrototypeOf(this, ImageAbortedError.prototype)
  }
}

/* --------------------------------- API ---------------------------------- */

export type ImageStyle = 'photo' | 'illustration' | 'flat' | 'isometric' | 'minimal' | 'blueprint'

/** Sıra `t.media.styles` anahtarlarıyla birebir; seçici bu diziden kurulur. */
export const IMAGE_STYLES: readonly ImageStyle[] = [
  'photo',
  'illustration',
  'flat',
  'isometric',
  'minimal',
  'blueprint',
]

export type ImagePrompt = { subject: string; style: ImageStyle; lang: 'tr' | 'en' }

/* ------------------------------- ayarlar -------------------------------- */

const ENDPOINT = 'https://image.pollinations.ai/prompt/'

/** 16:9 slayt oranı; servis bu ölçüde üretiyor, küçültme zaten sonra geliyor. */
const OUT_WIDTH = 1024
const OUT_HEIGHT = 576

/** Difüzyon üretimi yavaş olabiliyor; tarayıcıyı süresiz bekletmemek için. */
const REQUEST_TIMEOUT_MS = 90_000

/** Anonim tarifede ara sıra HTTP 402 dönüyor; kısa artan beklemeyle 3 deneme. */
const ATTEMPT_DELAYS_MS: readonly number[] = [0, 2500, 6000]

/** 402 gövdesi `{}` (2 bayt) geliyor; bu eşik bozuk yanıtı görselden ayırır. */
const MIN_IMAGE_BYTES = 1024

/**
 * Küçültme kademeleri. İlk kademe hedef ayar (1280 px / 0.72); sonrakiler
 * yalnızca `LIMITS.imageDataUrl` (800.000 karakter) aşılırsa devreye girer.
 */
const SHRINK_STEPS: readonly { maxWidth: number; quality: number }[] = [
  { maxWidth: 1280, quality: 0.72 },
  { maxWidth: 1024, quality: 0.62 },
  { maxWidth: 800, quality: 0.55 },
  { maxWidth: 640, quality: 0.5 },
]

/** Şemanın `src` regex'iyle aynı küme — başka tür kabul edilmez. */
const ACCEPTED_TYPES: readonly string[] = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']

/** Üslup betimleyicileri İngilizce: modeller bu terimlerde çok daha kararlı. */
const STYLE_HINTS: Record<ImageStyle, string> = {
  photo: 'professional photograph, natural soft lighting, shallow depth of field, photorealistic',
  illustration: 'digital editorial illustration, hand-drawn feel, rich harmonious colors',
  flat: 'flat vector illustration, bold simple shapes, solid fills, no gradients',
  isometric: 'isometric 3d illustration, 45 degree view, clean geometry, soft shadows',
  minimal: 'minimalist composition, wide empty space, two or three colors only, simple shapes',
  blueprint: 'technical blueprint drawing, thin light line art on deep blue, schematic diagram',
}

/**
 * Her isteme eklenen ortak kuyruk. "no text" vurgusu önemli: üretilen yazı
 * neredeyse her zaman bozuk çıkıyor ve slaytın kendi başlığıyla çakışıyor.
 */
const BASE_HINT =
  'wide 16:9 presentation slide visual, clean composition, generous negative space, no text, no letters, no watermark, no logo'

/* ------------------------------ yardımcılar ------------------------------ */

/**
 * Türkçe aksanlarını ASCII'ye indirir. NEDEN: anahtarsız bir çeviri servisi
 * yok; istemi olduğu gibi geçiyoruz ve model çok dilli. Aksanlı harfler bu
 * modellerin sözlüğünde seyrek olduğu için ASCII karşılıkları daha kararlı
 * sonuç veriyor. (Gerçek çeviri yapılmıyor — bu bilinçli bir sadelik.)
 */
function foldTurkish(text: string): string {
  const map: Record<string, string> = {
    ç: 'c', Ç: 'C', ğ: 'g', Ğ: 'G', ı: 'i', İ: 'I',
    ö: 'o', Ö: 'O', ş: 's', Ş: 'S', ü: 'u', Ü: 'U',
    â: 'a', Â: 'A', î: 'i', Î: 'I', û: 'u', Û: 'U',
  }
  return text.replace(/[çÇğĞıİöÖşŞüÜâÂîÎûÛ]/g, (ch) => map[ch] ?? ch)
}

/** `AbortSignal` iptal edilmişse akışı hemen keser. */
function throwIfAborted(signal?: AbortSignal): void {
  if (signal && signal.aborted) throw new ImageAbortedError()
}

/** İptal edilebilir bekleme — yeniden deneme aralıkları için. */
function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal && signal.aborted) return reject(new ImageAbortedError())
    const timer = window.setTimeout(() => {
      if (signal) signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    function onAbort() {
      window.clearTimeout(timer)
      reject(new ImageAbortedError())
    }
    if (signal) signal.addEventListener('abort', onAbort)
  })
}

/** Bir kaynağı `<img>`'e yükler; çözülemezse üretim hatası verir. */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new ImageGenerationError('decode-failed'))
    img.src = src
  })
}

/**
 * Görseli verilen genişliğe indirip JPEG data URL üretir. Büyütme yapılmaz
 * (`Math.min(1, …)`), böylece küçük bir yükleme boşuna şişmez.
 */
function drawToJpeg(img: HTMLImageElement, maxWidth: number, quality: number): string {
  const naturalWidth = img.naturalWidth || img.width
  const naturalHeight = img.naturalHeight || img.height
  const scale = Math.min(1, maxWidth / Math.max(1, naturalWidth))
  const w = Math.max(1, Math.round(naturalWidth * scale))
  const h = Math.max(1, Math.round(naturalHeight * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new ImageGenerationError('no-canvas')

  // Şeffaf PNG/WEBP, JPEG'e çevrilirken siyaha düşmesin.
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(img, 0, 0, w, h)
  return canvas.toDataURL('image/jpeg', quality)
}

/**
 * Blob'u kota sınırının altına inen bir JPEG data URL'e çevirir.
 * Kademeler tükenirse `ImageTooLargeError`.
 */
async function blobToScaledDataUrl(blob: Blob): Promise<string> {
  const objectUrl = URL.createObjectURL(blob)
  try {
    const img = await loadImage(objectUrl)
    for (let i = 0; i < SHRINK_STEPS.length; i += 1) {
      const step = SHRINK_STEPS[i]
      const url = drawToJpeg(img, step.maxWidth, step.quality)
      if (url.length <= LIMITS.imageDataUrl) return url
    }
    throw new ImageTooLargeError()
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

/** Dosyayı ham data URL olarak okur (GIF'i canvas'tan geçirmeden almak için). */
function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new ImageGenerationError('read-failed'))
    reader.onload = () => resolve(String(reader.result))
    reader.readAsDataURL(file)
  })
}

/* ------------------------------ istem kurma ------------------------------ */

/**
 * İstemi servise uygun İngilizce bir betimlemeye çevirir.
 *
 * Konu metni kullanıcıdan geldiği gibi (TR de olabilir) korunur; çevresindeki
 * üslup ve kompozisyon terimleri İngilizce yazılır — asıl yönlendirmeyi bunlar
 * yapar. TR girdide aksanlar ASCII'ye indirilir (bkz. `foldTurkish`).
 */
export function buildImagePrompt(p: ImagePrompt): string {
  const raw = p.lang === 'tr' ? foldTurkish(p.subject) : p.subject
  const subject = raw.replace(/\s+/g, ' ').trim().slice(0, 300)
  // Boş konu servise gitmesin: anlamsız bir istem yerine nötr bir kapak görseli.
  const topic = subject || 'abstract modern business concept'
  return [topic, STYLE_HINTS[p.style], BASE_HINT].join(', ')
}

/* ------------------------------- üretim --------------------------------- */

/** Tek bir denemeyi yapar; zaman aşımı ve dış iptali tek sinyalde birleştirir. */
/**
 * Görseli önce BU SİTENİN SUNUCUSUNDAN ister.
 *
 * Neden: sağlayıcı tarayıcıdan gelen isteği `Origin` başlığına bakarak 403 ile
 * reddediyor — aynı adres sunucudan 200 dönerken. Ölçülen davranış bu; anahtarsız
 * sağlayıcılar için modülün zaten uyguladığı "önce sunucu, olmazsa doğrudan"
 * kuralı burada da geçerli (bkz. /api/ai/image).
 */
async function fetchViaServer(prompt: string, signal?: AbortSignal): Promise<Blob> {
  const controller = new AbortController()
  const onAbort = () => controller.abort()
  if (signal) {
    if (signal.aborted) controller.abort()
    else signal.addEventListener('abort', onAbort)
  }
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const res = await fetch('/api/ai/image', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt, width: OUT_WIDTH, height: OUT_HEIGHT }),
      signal: controller.signal,
      cache: 'no-store',
    })
    // 404 = uç yok (statik dağıtım) → doğrudan yol denenmeli.
    // Diğer hatalar = uç var ama SAĞLAYICI reddetti; doğrudan denemek de
    // reddedilecek (tarayıcı Origin'i 403 alıyor) ve kota bilgisi kaybolur.
    if (res.status === 404) throw new ImageGenerationError('server-missing')
    if (!res.ok) throw new ImageProviderError(res.status)
    const blob = await res.blob()
    if (blob.type.indexOf('image/') !== 0 || blob.size < MIN_IMAGE_BYTES) {
      throw new ImageGenerationError('not-an-image')
    }
    return blob
  } catch (err) {
    if (signal && signal.aborted) throw new ImageAbortedError()
    if (err instanceof ImageGenerationError) throw err
    throw new ImageGenerationError('network-failed')
  } finally {
    window.clearTimeout(timer)
    if (signal) signal.removeEventListener('abort', onAbort)
  }
}

async function fetchImageBlob(prompt: string, signal?: AbortSignal): Promise<Blob> {
  const controller = new AbortController()
  const onAbort = () => controller.abort()
  if (signal) {
    if (signal.aborted) controller.abort()
    else signal.addEventListener('abort', onAbort)
  }
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    // Aynı istem her seferinde aynı görseli vermesin diye rastgele tohum.
    const seed = Math.floor(Math.random() * 1_000_000)
    const url =
      ENDPOINT +
      encodeURIComponent(prompt) +
      `?width=${OUT_WIDTH}&height=${OUT_HEIGHT}&nologo=true&model=flux&seed=${seed}`

    const res = await fetch(url, { signal: controller.signal, mode: 'cors', cache: 'no-store' })
    if (!res.ok) throw new ImageGenerationError(`http-${res.status}`)

    const blob = await res.blob()
    // Hız sınırında JSON gövdesi (`{}`) dönüyor; tür ve boyut birlikte elenir.
    if (blob.type.indexOf('image/') !== 0 || blob.size < MIN_IMAGE_BYTES) {
      throw new ImageGenerationError('not-an-image')
    }
    return blob
  } catch (err) {
    if (signal && signal.aborted) throw new ImageAbortedError()
    if (err instanceof ImageGenerationError) throw err
    throw new ImageGenerationError('network-failed')
  } finally {
    window.clearTimeout(timer)
    if (signal) signal.removeEventListener('abort', onAbort)
  }
}

/**
 * Görseli üretir ve küçültülmüş `data:` URL döndürür.
 *
 * Ücretsiz tarife ara sıra hız sınırı verdiği için birkaç kez denenir; iptal ve
 * "çok büyük" durumları denemeyi sürdürmez, doğrudan yukarı taşınır.
 */
export async function generateImage(p: ImagePrompt, signal?: AbortSignal): Promise<string> {
  if (typeof window === 'undefined') throw new ImageGenerationError('not-in-browser')
  const prompt = buildImagePrompt(p)

  let lastError: Error = new ImageGenerationError('unknown')
  for (let attempt = 0; attempt < ATTEMPT_DELAYS_MS.length; attempt += 1) {
    throwIfAborted(signal)
    const delay = ATTEMPT_DELAYS_MS[attempt]
    if (delay > 0) await wait(delay, signal)

    try {
      // Sunucu yolu asıl yol; kapalıysa (statik dağıtım) doğrudan denenir.
      let blob: Blob
      try {
        blob = await fetchViaServer(prompt, signal)
      } catch (serverErr) {
        if (serverErr instanceof ImageAbortedError) throw serverErr
        // Sağlayıcının kendi reddi yukarı taşınır; yedek yol onu düzeltemez.
        if (serverErr instanceof ImageProviderError) throw serverErr
        blob = await fetchImageBlob(prompt, signal)
      }
      return await blobToScaledDataUrl(blob)
    } catch (err) {
      if (err instanceof ImageAbortedError) throw err
      if (err instanceof ImageTooLargeError) throw err
      lastError = err instanceof Error ? err : new ImageGenerationError('unknown')
    }
  }
  throw lastError
}

/* ------------------------------- yükleme -------------------------------- */

/**
 * Kullanıcının yüklediği dosyayı `data:` URL'e çevirir.
 *
 * GIF bilinçli olarak KÜÇÜLTÜLMEZ: canvas yalnızca ilk kareyi çizer, yani
 * animasyon ölür. GIF'te tek yapılan kota kontrolü — sığmıyorsa kullanıcıdan
 * daha küçük bir dosya istenir. Diğer türler JPEG'e küçültülür.
 */
export async function fileToDataUrl(file: File): Promise<string> {
  if (typeof window === 'undefined') throw new ImageGenerationError('not-in-browser')
  if (ACCEPTED_TYPES.indexOf(file.type) === -1) throw new ImageGenerationError('unsupported-type')

  if (file.type === 'image/gif') {
    const url = await readAsDataUrl(file)
    if (url.length > LIMITS.imageDataUrl) throw new ImageTooLargeError()
    return url
  }

  return blobToScaledDataUrl(file)
}
