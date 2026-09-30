'use client'

// Tarayıcı çıktı yardımcıları: dosya indirme ve yazdırma (PDF).
//
// PDF için ayrı bir kütüphane eklenmedi. Projede CV Stüdyosu da aynı yolu izliyor
// (bkz. lib/cv/browser.ts → printDocument): tarayıcının kendi yazdırma motoru
// slaytları vektör olarak, gerçek yazı tipleriyle ve tek satır ek bağımlılık
// olmadan PDF'e basıyor. `@page { size: landscape }` kuralı app/sunum/sunum.css içinde.

/** Blob'u dosya olarak indirir. */
export function downloadBlob(fileName: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Bazı tarayıcılar indirmeyi hemen başlatmaz; URL bir tur sonra bırakılır.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Dosya adını güvenli hale getirir (yol ayırıcı ve Windows'ta yasak karakterler). */
export function safeFileName(name: string, fallback = 'sunum'): string {
  const cleaned = String(name || '')
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned || fallback
}

/**
 * Yazdırma diyaloğunu açar. `<html>` üzerine `sunum-printing` sınıfı eklenir;
 * o sınıf açıkken sayfada yalnızca #sunum-print-root (slaytların 1:1 kopyası) kalır.
 * `document.title` geçici olarak dosya adına çekilir — tarayıcılar "PDF olarak
 * kaydet" adını buradan türetir.
 */
export function printSlides(fileName: string, onDone?: () => void): void {
  const previousTitle = document.title
  const root = document.documentElement
  root.classList.add('sunum-printing')
  document.title = safeFileName(fileName)

  let finished = false
  const restore = () => {
    if (finished) return
    finished = true
    root.classList.remove('sunum-printing')
    document.title = previousTitle
    onDone?.()
  }

  window.addEventListener('afterprint', restore, { once: true })
  // Safari/iOS `afterprint` tetiklemeyebilir; emniyet supabı.
  const timer = window.setTimeout(restore, 60_000)
  window.addEventListener('afterprint', () => window.clearTimeout(timer), { once: true })

  // Sınıfın uygulanması için iki kare bekle, sonra yazdır.
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
