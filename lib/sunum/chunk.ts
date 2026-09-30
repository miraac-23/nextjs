// Uzun doküman hazırlığı (§8: PDF/DOCX → text extraction → chunking → Ollama).
//
// Neden "özetleyici bir AI çağrısı" değil: ürün kuralı tek yapısal çağrıdır (§11).
// İkinci bir model çağrısı hem süreyi ikiye katlar hem hata yüzeyini büyütür.
// Bunun yerine metin DETERMİNİSTİK olarak seyreltilir: giriş ve sonuç korunur,
// aradan bilgi yoğunluğu yüksek paragraflar seçilir, sıraları bozulmaz.
// Model böylece 80 sayfalık bir PDF'in "taşıyıcı" kısımlarını görür.

/** Türkçe + İngilizce yüksek frekanslı kelimeler — bilgi yoğunluğu sayılırken elenir. */
const STOPWORDS = new Set<string>(
  (
    'bir bu ve ile için olarak daha çok ama fakat veya ya ise gibi kadar sonra önce ancak' +
    ' olan olduğu ederek yapılan tüm her hem bazı kendi diğer üzere göre dolayı nedeniyle' +
    ' the and for with that this from are was were has have been will can may not but' +
    ' their they its into also such than then them these those which while would could'
  ).split(' '),
)

/** Bir chunk'ın varsayılan boyu (karakter) — ~1.5k token'a denk gelir. */
export const DEFAULT_CHUNK_SIZE = 6000
/** Chunk'lar arası örtüşme: cümle ortasından kesip bağlamı kaybetmemek için. */
export const DEFAULT_CHUNK_OVERLAP = 300

/**
 * Ayrıştırıcıdan gelen ham metni temizler: satır sonlarını düzeltir, tekrar eden
 * sayfa başlıklarını/numaralarını ve kırık heceleri atar.
 */
export function cleanExtractedText(raw: string): string {
  let text = String(raw || '')
    .replace(/\r\n?/g, '\n')
    // Satır sonunda tireyle bölünmüş kelimeleri birleştir ("uygu-\nlama" → "uygulama").
    .replace(/([a-zçğıöşü])-\n([a-zçğıöşü])/g, '$1$2')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  // Yalnızca sayfa numarası içeren satırlar ("12", "- 12 -", "Sayfa 12 / 80").
  text = text
    .split('\n')
    .filter((line) => !/^\s*(?:-\s*)?(?:sayfa|page)?\s*\d{1,4}\s*(?:\/\s*\d{1,4})?\s*(?:-\s*)?$/i.test(line))
    .join('\n')

  return dropRepeatedLines(text)
}

/**
 * Aynı satır belgede 3+ kez ve kısa ise (ör. üst bilgi/alt bilgi, kurum adı) atılır.
 * Gerçek içerik satırları bu sıklıkta birebir tekrar etmez.
 */
function dropRepeatedLines(text: string): string {
  const lines = text.split('\n')
  const counts: Record<string, number> = {}
  for (let i = 0; i < lines.length; i++) {
    const key = lines[i].trim()
    if (key.length > 0 && key.length <= 80) counts[key] = (counts[key] || 0) + 1
  }
  return lines
    .filter((line) => {
      const key = line.trim()
      return !(key.length > 0 && key.length <= 80 && (counts[key] || 0) >= 3)
    })
    .join('\n')
}

/** Metni örtüşmeli parçalara böler. Harita-indirgeme akışı eklenirse giriş noktası burası. */
export function chunkText(
  text: string,
  size = DEFAULT_CHUNK_SIZE,
  overlap = DEFAULT_CHUNK_OVERLAP,
): string[] {
  const clean = text.trim()
  if (clean.length <= size) return clean ? [clean] : []
  const step = Math.max(1, size - overlap)
  const out: string[] = []
  for (let start = 0; start < clean.length; start += step) {
    let end = Math.min(clean.length, start + size)
    if (end < clean.length) {
      // Cümle sonunda kes: son 400 karakterde nokta/soru/ünlem ara.
      const window = clean.slice(Math.max(start, end - 400), end)
      const cut = Math.max(window.lastIndexOf('. '), window.lastIndexOf('\n'))
      if (cut > 0) end = Math.max(start, end - 400) + cut + 1
    }
    out.push(clean.slice(start, end).trim())
    if (end >= clean.length) break
  }
  return out.filter((c) => c.length > 0)
}

type ScoredBlock = { index: number; text: string; score: number }

/**
 * Bilgi yoğunluğu: durak kelime olmayan farklı kelimeler + sayı içeriyor mu.
 * Uzunluğa bölünür ki uzun ve boş paragraflar öne geçmesin.
 */
function scoreBlock(text: string): number {
  const words = text.toLocaleLowerCase('tr-TR').split(/[^\p{L}\p{N}]+/u)
  const seen = new Set<string>()
  let informative = 0
  for (let i = 0; i < words.length; i++) {
    const w = words[i]
    if (w.length < 4 || STOPWORDS.has(w) || seen.has(w)) continue
    seen.add(w)
    informative++
  }
  const digits = /\d/.test(text) ? 1.25 : 1
  const listy = /(^|\n)\s*(?:[-•*]|\d+[.)])\s/.test(text) ? 1.15 : 1
  // Çok kısa paragraflar (başlık kalıntısı) elenebilsin diye karekökle normalize.
  return (informative / Math.sqrt(Math.max(40, text.length))) * digits * listy
}

/**
 * Metni `budget` karaktere sığdırır.
 *
 * Bütçe yetiyorsa metin olduğu gibi döner. Yetmiyorsa: ilk 2 ve son 1 paragraf
 * koşulsuz alınır (konu ve sonuç), kalan yer en yoğun paragraflarla doldurulur ve
 * çıktı BELGE SIRASINA göre birleştirilir. Atlanan yerler "[…]" ile işaretlenir,
 * böylece model metnin kesintili olduğunu bilir ve arayı uydurarak bağlamaz.
 */
export function condense(raw: string, budget: number): string {
  const text = cleanExtractedText(raw)
  if (!text) return ''
  if (text.length <= budget) return text

  const blocks = text
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter((b) => b.length > 0)

  // Paragraf ayrımı yoksa (tek blok hâlinde çıkan PDF) chunk'lara böl.
  const units = blocks.length > 2 ? blocks : chunkText(text, 1200, 0)

  const scored: ScoredBlock[] = units.map((t, index) => ({ index, text: t, score: scoreBlock(t) }))
  const keep = new Set<number>()
  let used = 0

  const take = (b: ScoredBlock) => {
    if (keep.has(b.index)) return
    if (used + b.text.length > budget) return
    keep.add(b.index)
    used += b.text.length
  }

  // Zorunlu: baştan iki, sondan bir birim.
  if (scored.length > 0) take(scored[0])
  if (scored.length > 1) take(scored[1])
  if (scored.length > 2) take(scored[scored.length - 1])

  const rest = scored.slice(2, Math.max(2, scored.length - 1)).sort((a, b) => b.score - a.score)
  for (let i = 0; i < rest.length && used < budget; i++) take(rest[i])

  const ordered = Array.from(keep).sort((a, b) => a - b)
  const parts: string[] = []
  for (let i = 0; i < ordered.length; i++) {
    if (i > 0 && ordered[i] !== ordered[i - 1] + 1) parts.push('[…]')
    parts.push(scored[ordered[i]].text)
  }
  return parts.join('\n\n')
}
