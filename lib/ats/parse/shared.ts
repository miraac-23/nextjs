// Parser'ların ortak yardımcıları: hata tipi, font adı normalizasyonu,
// header/footer'da aranan kritik bilgi desenleri ve küçük istatistik fonksiyonları.

import type { AtsParseErrorCode } from '../types'

export class AtsParseError extends Error {
  code: AtsParseErrorCode
  constructor(code: AtsParseErrorCode, message?: string) {
    super(message || code)
    this.name = 'AtsParseError'
    this.code = code
    // es5 hedefinde `instanceof` ancak prototip elle bağlanırsa çalışır.
    Object.setPrototypeOf(this, AtsParseError.prototype)
  }
}

/** Yüklenebilecek en büyük dosya. */
export const MAX_FILE_BYTES = 10 * 1024 * 1024

export const PT_TO_MM = 0.352778
export const TWIP_TO_MM = 1 / 56.6929

export const round1 = (n: number) => Math.round(n * 10) / 10

export const countNonSpace = (s: string) => s.replace(/\s+/g, '').length

export const wordCount = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0)

/** Kalın ağırlık bildiren font adı parçaları (ör. "Arial-BoldMT", "Lato-Black"). */
export const BOLD_NAME_RE = /bold|black|heavy|semibold|demi/i

/* =============================== font aileleri =============================== */

const FAMILY_MAP: Record<string, string> = {
  arial: 'Arial',
  arialmt: 'Arial',
  arialnarrow: 'Arial Narrow',
  helvetica: 'Helvetica',
  helveticaneue: 'Helvetica Neue',
  calibri: 'Calibri',
  cambria: 'Cambria',
  cambriamath: 'Cambria',
  georgia: 'Georgia',
  timesnewroman: 'Times New Roman',
  timesnewromanps: 'Times New Roman',
  timesnewromanpsmt: 'Times New Roman',
  times: 'Times New Roman',
  timesroman: 'Times New Roman',
  courier: 'Courier New',
  couriernew: 'Courier New',
  liberationsans: 'Liberation Sans',
  liberationserif: 'Liberation Serif',
  segoeui: 'Segoe UI',
  opensans: 'Open Sans',
  sourcesanspro: 'Source Sans Pro',
}

const GENERIC_FAMILIES = ['serif', 'sans-serif', 'sansserif', 'monospace', 'cursive', 'fantasy', 'system-ui']
const STYLE_SUFFIX_RE = /(regular|bolditalic|boldoblique|bold|italic|oblique|light|medium|semibold|demibold|extrabold|black|heavy|condensed|book|thin)+$/

/**
 * Ham font adını aileye indirger:
 * "ABCDEF+Arial-BoldMT" → "Arial", "TimesNewRomanPSMT" → "Times New Roman",
 * "Calibri-Bold" → "Calibri", "Calibri Light" → "Calibri", "SourceSansPro-Regular" → "Source Sans Pro".
 * Aile çıkarılamazsa (ör. pdf.js iç adı "g_d0_f1") undefined.
 */
export function normalizeFontFamily(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined
  let s = String(raw)
    .trim()
    .replace(/^[A-Z]{6}\+/, '')
    .replace(/^["']+|["']+$/g, '')
  if (!s || /^g_d\d+_f\d+/.test(s)) return undefined
  if (GENERIC_FAMILIES.indexOf(s.toLowerCase()) >= 0) return undefined
  // Stil son eki: "Arial-BoldMT", "Arial,Bold"
  s = s.split(/[,-]/)[0].trim()
  if (!s) return undefined
  const compact = s.replace(/[\s_]+/g, '').toLowerCase()
  if (FAMILY_MAP[compact]) return FAMILY_MAP[compact]
  const bare = compact.replace(/(psmt|mt|ps)$/, '').replace(STYLE_SUFFIX_RE, '').replace(/(psmt|mt|ps)$/, '')
  if (FAMILY_MAP[bare]) return FAMILY_MAP[bare]
  if (bare.indexOf('calibri') === 0) return 'Calibri'
  if (bare.indexOf('arial') === 0) return 'Arial'
  if (bare.indexOf('helvetica') === 0) return 'Helvetica'
  // Bilinmeyen aile: CamelCase'i böl, stil kelimelerini at.
  const pretty = s
    .replace(/(PSMT|MT|PS)$/, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b(Regular|Bold|Italic|Oblique|Light|Medium|Semi ?Bold|Demi ?Bold|Extra ?Bold|Black|Heavy|Book|Thin)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
  return pretty || undefined
}

/* ============================ kritik bilgi desenleri ============================ */

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
const URL_RE = /\b(?:https?:\/\/|www\.)[^\s|,;<>"]+|\b(?:[a-z]{2,3}\.)?(?:linkedin\.com|github\.com|gitlab\.com|behance\.net|dribbble\.com)\/[^\s|,;<>"]*/gi
const PHONE_RE = /(?:\+\s?)?\(?\d[\d\s().-]{7,}\d/g

/** Metindeki e-posta, telefon ve URL/profil bağlantılarını (tekrarsız, bulunduğu sırayla) döndürür. */
export function findCritical(text: string): string[] {
  const out: string[] = []
  const add = (v: string) => {
    const t = v.trim().replace(/[.)]+$/, '')
    if (t && out.indexOf(t) < 0) out.push(t)
  }
  const emails = text.match(EMAIL_RE) || []
  emails.forEach(add)
  // E-postanın alan adı URL olarak ikinci kez sayılmasın.
  const withoutEmails = text.replace(EMAIL_RE, ' ')
  ;(withoutEmails.match(URL_RE) || []).forEach(add)
  ;(withoutEmails.match(PHONE_RE) || []).forEach((m) => {
    const digits = m.replace(/\D/g, '').length
    // Tarih aralıkları ("2019 - 2021") elensin: telefon 9–15 rakamdır.
    if (digits >= 9 && digits <= 15) add(m)
  })
  return out
}

/* ================================= istatistik ================================= */

/** Ağırlıklı mod (ör. karakter sayısıyla ağırlıklandırılmış font boyutu). `step` hassasiyetinde yuvarlar. */
export function weightedMode(values: { value: number; weight: number }[], step = 0.5): number | undefined {
  const buckets: Record<string, number> = {}
  let best: string | undefined
  for (let i = 0; i < values.length; i++) {
    const v = values[i]
    if (!(v.value > 0) || !(v.weight > 0)) continue
    const key = String(Math.round(v.value / step) * step)
    buckets[key] = (buckets[key] || 0) + v.weight
    if (best === undefined || buckets[key] > buckets[best]) best = key
  }
  return best === undefined ? undefined : round1(Number(best))
}

/** Kayıttaki en yüksek ağırlıklı anahtar. */
export function topKey(rec: Record<string, number>): string | undefined {
  let best: string | undefined
  Object.keys(rec).forEach((k) => {
    if (best === undefined || rec[k] > rec[best]) best = k
  })
  return best
}

/** "#1e2a3a" / "1E2A3A" / "#fff" → 0 (siyah) – 1 (beyaz) göreli parlaklık; çözülemezse undefined. */
export function hexLuminance(hex: string | null | undefined): number | undefined {
  if (!hex) return undefined
  let h = String(hex).trim().replace(/^#/, '')
  if (/^[0-9a-f]{3}$/i.test(h)) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
  if (!/^[0-9a-f]{6}$/i.test(h)) return undefined
  const ch = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]
}

/** Harflerin tamamı büyük mü? ("İŞ DENEYİMİ", "WORK EXPERIENCE") — en az 3 harf. */
export function isAllCaps(text: string): boolean {
  const letters = text.replace(/[^A-Za-zÀ-ÖØ-öø-ÿĞğİıŞşÇçÖöÜü]/g, '')
  if (letters.length < 3) return false
  return text === text.toLocaleUpperCase('tr-TR') || text === text.toUpperCase()
}

export const hasLetter = (s: string) => /[A-Za-zÀ-ÖØ-öø-ÿĞğİıŞşÇçÖöÜü]/.test(s)
