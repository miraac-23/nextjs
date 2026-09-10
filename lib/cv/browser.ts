// Tarayıcı yardımcıları: görsel küçültme, kâğıt ölçüleri, yazdırma ve dosya indirme.
// Hiçbiri dış servise bağlı değildir — hepsi platformun kendi API'leriyle çalışır.

/** A4 / Letter ölçüleri (mm). Sayfa yüksekliği hem önizleme hem sayfa sayısı tahmini için gerekir. */
export const PAPER = {
  a4: { w: 210, h: 297, label: 'A4 · 210 × 297 mm' },
  letter: { w: 215.9, h: 279.4, label: 'Letter · 8.5 × 11 in' },
} as const

export type PaperId = keyof typeof PAPER

/** 1 mm kaç CSS pikseli eder (96dpi). Önizleme ölçeklemesi bu sabite dayanır. */
export const MM = 96 / 25.4

/**
 * Seçilen görseli canvas ile en fazla `max` piksele küçültüp JPEG data URL döndürür.
 * localStorage kotası küçük olduğu için orijinal dosya asla saklanmaz.
 */
export function readImageScaled(file: File, max = 480, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('not-an-image'))
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('read-failed'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('decode-failed'))
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height))
        const w = Math.max(1, Math.round(img.width * scale))
        const h = Math.max(1, Math.round(img.height * scale))
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('no-canvas'))
        // Şeffaf PNG'ler JPEG'e çevrilirken siyaha düşmesin.
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, w, h)
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })
}

/** Dosya adını güvenli hale getirir (yol ayırıcı ve Windows'ta yasak karakterler). */
export function safeFileName(name: string, fallback = 'cv'): string {
  const cleaned = name
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned || fallback
}

/**
 * Yazdırma diyaloğunu açar. `document.title` geçici olarak dosya adına çekilir:
 * tarayıcılar "PDF olarak kaydet" adını buradan türetir.
 */
export function printDocument(fileName: string, onDone?: () => void): void {
  const previousTitle = document.title
  const root = document.documentElement
  root.classList.add('cv-printing')
  document.title = safeFileName(fileName)

  let finished = false
  const restore = () => {
    if (finished) return
    finished = true
    root.classList.remove('cv-printing')
    document.title = previousTitle
    onDone?.()
  }

  window.addEventListener('afterprint', restore, { once: true })
  // Safari/iOS `afterprint` tetiklemeyebilir; emniyet supabı.
  const timer = window.setTimeout(restore, 60_000)
  const clear = () => window.clearTimeout(timer)
  window.addEventListener('afterprint', clear, { once: true })

  // Sınıfın uygulanması için bir kare bekle, sonra yazdır.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      try {
        window.print()
      } catch {
        restore()
      }
    })
  })
}

/** Metni dosya olarak indirir (JSON yedeği). */
export function downloadText(fileName: string, text: string, mime = 'application/json'): void {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Bazı tarayıcılar indirmeyi hemen başlatmaz; URL'i bir tur sonra bırak.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
