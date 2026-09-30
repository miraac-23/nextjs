// Slayt dönüşümleri — içeriği bir biçimden diğerine çeviren SAF fonksiyonlar.
//
// Neden ayrı dosya: aynı dönüşümler iki yerden çağrılıyor —
//   1) lib/sunum/ai/normalize.ts → model yanlış tip döndürdüğünde içeriği kurtarmak için,
//   2) lib/sunum/decide/quality.ts → kalite kontrolünün önerdiği otomatik düzeltmeler için.
// Tek kopya tutmak, iki yolun aynı sonucu vermesini garanti ediyor.
//
// Hepsi saftır: DOM, tarayıcı ya da AI gerektirmez, test edilebilir.

import { LIMITS } from './schema'
import { defaultTemplate, templatesFor } from './templates'
import {
  uid,
  type ChartContent,
  type ChartPoint,
  type ContentSlide,
  type ProcessContent,
  type Slide,
  type StatisticsContent,
} from './types'

/* ================================ metin kırpma ================================ */

/**
 * Başlığı kelime sınırından kırpar. Kırpma gerekmiyorsa metin aynen döner;
 * gerekiyorsa sonuna üç nokta KONULMAZ — slayt başlığı yarım cümle gibi durmasın,
 * anlamlı bir kısaltma olsun diye son kelime tamamen atılır.
 */
export function trimTitle(title: string, max = 64): string {
  const text = title.trim()
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  const space = cut.lastIndexOf(' ')
  return (space > max * 0.5 ? cut.slice(0, space) : cut).replace(/[\s,;:–-]+$/, '')
}

/* ============================== maddeler → grafik ============================== */

/** "%45", "45 kişi", "1.250" → 45 / 45 / 1250. Çözülemezse null. */
export function parseNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string') return null
  const match = value.replace(/\s/g, '').match(/-?\d+(?:[.,]\d+)?/)
  if (!match) return null
  const n = Number(match[0].replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/**
 * Maddelerden grafik verisi çıkarır: "Kişiselleştirme: %45", "Erişim - 30 puan",
 * "2024 = 190" gibi "etiket + sayı" kalıplarını yakalar.
 *
 * En az iki eşleşme şart: tek sayı grafik yapmaz. Birim maddelerin yarısından
 * fazlasında aynıysa grafiğe yazılır, karışıksa yazılmaz.
 */
export function bulletsToChart(bullets: string[]): ChartContent | null {
  const points: ChartPoint[] = []
  const units: Record<string, number> = {}

  for (let i = 0; i < bullets.length && points.length < LIMITS.chartPoints; i++) {
    const match = bullets[i].match(
      /^(.{1,60}?)\s*[:=→–-]\s*(%\s*)?(-?\d+(?:[.,]\d+)?)\s*(%|[A-Za-zçğıöşüÇĞİÖŞÜ]{1,8})?\s*$/,
    )
    if (!match) continue
    const label = match[1].trim()
    const value = parseNumber(match[3])
    if (!label || value === null) continue
    const unit = match[2] ? '%' : (match[4] || '').trim()
    if (unit) units[unit] = (units[unit] || 0) + 1
    points.push({ label, value })
  }

  if (points.length < 2) return null

  let unit: string | undefined
  let best = 0
  Object.keys(units).forEach((key) => {
    if (units[key] > best) {
      best = units[key]
      unit = key
    }
  })

  return {
    chartType: 'bar',
    points,
    unit: best >= points.length / 2 ? unit : undefined,
  }
}

/** Maddeleri sıralı süreç adımlarına çevirir. En az iki adım gerekir. */
export function bulletsToProcess(bullets: string[]): ProcessContent | null {
  const steps = bullets
    .slice(0, LIMITS.steps)
    .map((text) => {
      // "Adım başlığı: açıklama" kalıbı varsa ikiye ayır.
      const parts = text.split(/\s*[:–-]\s+/)
      const title = trimTitle(parts[0] || text, 48)
      const description = parts.length > 1 ? parts.slice(1).join(' ').trim() : ''
      return description ? { title, description } : { title }
    })
    .filter((step) => step.title.length > 0)
  return steps.length >= 2 ? { steps } : null
}

/** Maddelerden büyük sayı kartları çıkarır ("%38 başarısız yayın" → 38 / başarısız yayın). */
export function bulletsToStats(bullets: string[]): StatisticsContent | null {
  const stats: StatisticsContent['stats'] = []
  for (let i = 0; i < bullets.length && stats.length < LIMITS.stats; i++) {
    const text = bullets[i].trim()
    // Sayı metnin başında ya da sonunda olabilir: "%38 oran" / "oran %38".
    const lead = text.match(/^((?:%\s*)?-?\d+(?:[.,]\d+)?\s*(?:%|[A-Za-zçğıöşüÇĞİÖŞÜ]{1,8})?)\s+(.{3,})$/)
    const trail = text.match(/^(.{3,}?)[\s:–-]+((?:%\s*)?-?\d+(?:[.,]\d+)?\s*(?:%|[A-Za-zçğıöşüÇĞİÖŞÜ]{1,8})?)$/)
    const pair = lead ? { value: lead[1], label: lead[2] } : trail ? { value: trail[2], label: trail[1] } : null
    if (!pair) continue
    // Birim ile sayı arasındaki tek boşluk korunur: "45 dk" okunur, "45dk" değil.
    const value = pair.value.replace(/\s+/g, ' ').trim().slice(0, 24)
    const label = pair.label.trim().slice(0, LIMITS.bullet)
    if (!value || !label || !/\d/.test(value)) continue
    stats.push({ value, label })
  }
  return stats.length >= 2 ? { stats } : null
}

/* ================================ slayt bölme ================================ */

/**
 * Aşırı dolu bir içerik slaytını ikiye böler. İkinci slaytın başlığına
 * "(devam)" eklenir; kullanıcı istediğinde elle değiştirebilir.
 */
export function splitContentSlide(slide: ContentSlide, continued: string): [ContentSlide, ContentSlide] {
  const bullets = slide.content.bullets
  const mid = Math.ceil(bullets.length / 2)
  const first: ContentSlide = { ...slide, content: { bullets: bullets.slice(0, mid) } }
  const second: ContentSlide = {
    ...slide,
    id: uid('sl'),
    order: slide.order + 1,
    title: `${trimTitle(slide.title, 48)} ${continued}`,
    content: { bullets: bullets.slice(mid) },
  }
  return [first, second]
}

/* ============================== şablon çeşitlemesi ============================== */

/**
 * Aynı şablonun üst üste tekrarını kırmak için tipin BİR SONRAKİ varyantına geçer.
 * Tipin tek varyantı varsa slayt değişmez.
 */
export function rotateTemplate(slide: Slide): Slide {
  const variants = templatesFor(slide.type)
  if (variants.length < 2) return slide
  const index = variants.findIndex((v) => v.id === slide.template)
  const next = variants[(index + 1 + variants.length) % variants.length]
  return next.id === slide.template ? slide : { ...slide, template: next.id }
}

/** Slaytı verilen tipin varsayılan şablonuna döndürür (tip değiştiğinde). */
export function resetTemplate(slide: Slide): Slide {
  return { ...slide, template: defaultTemplate(slide.type) }
}

/* ================================ metin ölçümü ================================ */

/** Slaytın taşıdığı görünür metnin tamamı — yoğunluk ölçümü ve AI bağlamı için. */
export function slideText(slide: Slide): string {
  const parts: string[] = [slide.title]
  if (slide.subtitle) parts.push(slide.subtitle)
  const c = slide.content as Record<string, unknown>

  const pushAll = (value: unknown) => {
    if (typeof value === 'string') parts.push(value)
    else if (Array.isArray(value)) value.forEach(pushAll)
    else if (value && typeof value === 'object') Object.values(value).forEach(pushAll)
  }
  pushAll(c)

  return parts.filter((p) => typeof p === 'string' && p.length > 0).join(' \n')
}

/**
 * Slayt gerçekten bir şey anlatıyor mu?
 *
 * Konudan üretilen bir slayt boş dönerse (zayıf model, kota, kesilmiş yanıt)
 * desteye EKLENMEMELİ — kullanıcı "eklendi" görüp boş bir slayt bulmamalı.
 */
export function isEmptySlide(slide: Slide): boolean {
  if (slide.type === 'title') return !slide.title.trim()
  if (slide.type === 'quote') return !slide.content.text.trim()
  if (slide.type === 'chart') return slide.content.points.length < 2
  if (slide.type === 'statistics') return slide.content.stats.length === 0
  if (slide.type === 'timeline' || slide.type === 'process') return slide.content.steps.length === 0
  if (slide.type === 'architecture') return slide.content.layers.length === 0
  return slideBullets(slide).length === 0 && !slide.subtitle
}

/** Slaytın madde listesi (varsa). Yoğunluk ve dönüşüm kontrolleri bunu kullanır. */
export function slideBullets(slide: Slide): string[] {
  switch (slide.type) {
    case 'content':
    case 'conclusion':
    case 'image':
      return slide.content.bullets
    case 'two-column':
    case 'comparison':
      return slide.content.left.bullets.concat(slide.content.right.bullets)
    default:
      return []
  }
}
