// ATS motoru — metin yardımcıları (saf TS, DOM yok).
// fold(): uzunluğu KORUYAN küçük harf + aksan temizleme; böylece katlanmış metindeki
// indeksler orijinal metinde de geçerlidir (görüntü terimi orijinalden kesilir).

const FOLD_MAP: Record<string, string> = {
  İ: 'i', I: 'i', ı: 'i', Ş: 's', ş: 's', Ğ: 'g', ğ: 'g', Ü: 'u', ü: 'u', Ö: 'o', ö: 'o', Ç: 'c', ç: 'c',
  Â: 'a', â: 'a', Î: 'i', î: 'i', Û: 'u', û: 'u', á: 'a', à: 'a', ä: 'a', ã: 'a', å: 'a', Á: 'a', À: 'a', Ä: 'a',
  é: 'e', è: 'e', ê: 'e', ë: 'e', É: 'e', È: 'e', í: 'i', ì: 'i', ï: 'i', Í: 'i', ó: 'o', ò: 'o', ô: 'o', õ: 'o',
  Ó: 'o', ú: 'u', ù: 'u', Ú: 'u', ñ: 'n', Ñ: 'n', ß: 's', '’': "'", '‘': "'", '´': "'", '`': "'",
}

/** Eşleştirme için katlama: küçük harf, İ/I/ı→i, ş→s ğ→g ü→u ö→o ç→c. Uzunluk korunur. */
export function fold(s: string): string {
  let out = ''
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i)
    if (code < 128) {
      out += code >= 65 && code <= 90 ? String.fromCharCode(code + 32) : s.charAt(i)
      continue
    }
    const c = s.charAt(i)
    const m = FOLD_MAP[c]
    if (m !== undefined) {
      out += m
      continue
    }
    const l = c.toLowerCase()
    out += l.length === 1 ? l : c
  }
  return out
}

/** Harf/rakam mı (katlanmış ASCII metin için). */
export function isWordChar(ch: string): boolean {
  if (!ch) return false
  const c = ch.charCodeAt(0)
  return (c >= 97 && c <= 122) || (c >= 48 && c <= 57) || (c >= 65 && c <= 90) || c > 127
}

export function words(s: string): string[] {
  return s.split(/\s+/).filter((w) => /[A-Za-z0-9À-ɏİı]/.test(w))
}

export function wordCount(s: string): number {
  return words(s).length
}

/** Cümlelere böl (ondalık sayı ve "Node.js" gibi noktaları bölmeden). */
export function sentences(s: string): string[] {
  return s
    .replace(/\s+/g, ' ')
    .split(/(?:[.!?]+)(?=\s+[A-ZÇĞİÖŞÜ0-9"(]|\s*$)/)
    .map((x) => x.trim())
    .filter((x) => wordCount(x) >= 2)
}

/** Satır başındaki madde işareti (varsa) — glif ve kalan metin. */
export const BULLET_GLYPH_RE = /^\s*([•\-*▪►▶→✓✔➤➔➜➢○●◦■□–—·♦◆◇❖✦✧»⇒❯✗✘-])\s*/

export function bulletGlyph(line: string): string | null {
  const m = line.match(BULLET_GLYPH_RE)
  if (!m) return null
  // "-2020" gibi eksi sayılar ya da tek başına tire madde değildir
  const rest = line.slice(m[0].length)
  if (!rest.trim()) return null
  if ((m[1] === '-' || m[1] === '–' || m[1] === '—') && /^\d{4}\b/.test(rest)) return null
  return m[1]
}

export function stripBullet(line: string): string {
  return bulletGlyph(line) ? line.replace(BULLET_GLYPH_RE, '').trim() : line.trim()
}

/* ---------------------------------- tarihler ---------------------------------- */

const MONTHS_LONG = [
  ['january', 'ocak'],
  ['february', 'subat'],
  ['march', 'mart'],
  ['april', 'nisan'],
  ['mayis'],
  ['june', 'haziran'],
  ['july', 'temmuz'],
  ['august', 'agustos'],
  ['september', 'eylul'],
  ['october', 'ekim'],
  ['november', 'kasim'],
  ['december', 'aralik'],
]
const MONTHS_SHORT = [
  ['jan', 'oca'],
  ['feb', 'sub'],
  ['mar'],
  ['apr', 'nis'],
  [],
  ['jun', 'haz'],
  ['jul', 'tem'],
  ['aug', 'agu'],
  ['sep', 'sept', 'eyl'],
  ['oct', 'eki'],
  ['nov', 'kas'],
  ['dec', 'ara'],
]
const MONTH_NUM: Record<string, { n: number; kind: 'short' | 'long' | 'any' }> = { may: { n: 5, kind: 'any' } }
MONTHS_LONG.forEach((ws, i) => ws.forEach((w) => (MONTH_NUM[w] = { n: i + 1, kind: 'long' })))
MONTHS_SHORT.forEach((ws, i) => ws.forEach((w) => (MONTH_NUM[w] = { n: i + 1, kind: 'short' })))

const MONTH_ALT = Object.keys(MONTH_NUM)
  .sort((a, b) => b.length - a.length)
  .join('|')

export const PRESENT_ALT = 'present|current|currently|now|today|ongoing|gunumuz|halen|hala|devam ediyor|su an|simdi|hazirda'

/** Katlanmış metinde tarih belirteçleri. Grup: 1 sayısal ay/yıl, 2 yıl-ay, 3 ay adı (4 kelime), 5 yıl, 6 günümüz. */
const DATE_TOKEN_SRC =
  '(\\b(?:0?[1-9]|1[0-2])\\s?[/.\\-]\\s?(?:19|20)\\d{2}\\b)' +
  '|(\\b(?:19|20)\\d{2}[/.\\-](?:0?[1-9]|1[0-2])\\b(?![/.\\-]\\d))' +
  '|(\\b(' + MONTH_ALT + ')\\.?,?\\s{0,2}(?:19|20)\\d{2}\\b)' +
  '|(\\b(?:19|20)\\d{2}\\b)' +
  '|(\\b(?:' + PRESENT_ALT + ')\\b)'

export type DateFormatKind = 'num/' | 'num.' | 'num-' | 'ym' | 'short' | 'long' | 'month-any' | 'year' | 'present'

export type DateToken = { start: number; end: number; kind: DateFormatKind; year?: number; month?: number }

export function findDateTokens(folded: string): DateToken[] {
  const re = new RegExp(DATE_TOKEN_SRC, 'g')
  const out: DateToken[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(folded))) {
    const s = m.index
    const e = s + m[0].length
    if (m[1]) {
      const p = m[1].match(/(\d{1,2})\s?([/.\-])\s?(\d{4})/)
      if (!p) continue
      out.push({ start: s, end: e, kind: p[2] === '/' ? 'num/' : p[2] === '.' ? 'num.' : 'num-', month: +p[1], year: +p[3] })
    } else if (m[2]) {
      const p = m[2].match(/(\d{4})[/.\-](\d{1,2})/)
      if (!p) continue
      out.push({ start: s, end: e, kind: 'ym', year: +p[1], month: +p[2] })
    } else if (m[3]) {
      const info = MONTH_NUM[m[4]]
      const y = m[3].match(/\d{4}/)
      out.push({
        start: s,
        end: e,
        kind: info.kind === 'any' ? 'month-any' : info.kind,
        month: info.n,
        year: y ? +y[0] : undefined,
      })
    } else if (m[5]) {
      out.push({ start: s, end: e, kind: 'year', year: +m[5] })
    } else if (m[6]) {
      out.push({ start: s, end: e, kind: 'present' })
    }
  }
  return out
}

export type DateRange = { start: DateToken; end: DateToken | null; from: number; to: number }

/** Satırdaki tarih aralıklarını bulur ("01/2020 – Present", "2018 - 2020", "Oca 2021 — Günümüz"). */
export function findDateRanges(folded: string, tokens?: DateToken[]): DateRange[] {
  const toks = tokens ?? findDateTokens(folded)
  const out: DateRange[] = []
  for (let i = 0; i < toks.length; i++) {
    const a = toks[i]
    if (a.kind === 'present') continue
    const b = toks[i + 1]
    if (b) {
      const gap = folded.slice(a.end, b.start)
      if (/^\s*(?:-|–|—|~|to|until|till|through|ile|\/|–|—)\s*$/.test(gap) || /^\s*-{1,2}\s*$/.test(gap)) {
        out.push({ start: a, end: b, from: a.start, to: b.end })
        i++
        continue
      }
    }
    // "2020 –" gibi açık aralıklar ya da "since 2020"
    const after = folded.slice(a.end, a.end + 4)
    if (/^\s*[-–—]\s*$/.test(after) || /^\s*[-–—]\s*$/.test(folded.slice(a.end))) {
      out.push({ start: a, end: null, from: a.start, to: a.end })
    }
  }
  return out
}

/** Serbest tarih metnini çözer: ilk belirteç. "Present" → { present: true }. */
export function parseLooseDate(raw: string): { year?: number; month?: number; present?: boolean } | null {
  const f = fold(raw || '')
  const t = findDateTokens(f)[0]
  if (!t) return null
  if (t.kind === 'present') return { present: true }
  return { year: t.year, month: t.month }
}

/* ---------------------------------- iletişim ---------------------------------- */

// Niceleyiciler sınırlı: uzun boşluksuz satırlarda karesel geri izlemeyi önler.
export const EMAIL_RE = /[A-Za-z0-9._%+\-]{1,64}@[A-Za-z0-9\-]{1,63}(?:\.[A-Za-z0-9\-]{1,63}){0,8}\.[A-Za-z]{2,24}/
export const LINKEDIN_RE = /(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/[^\s|,;()]{1,200}/i
export const GITHUB_RE = /(?:https?:\/\/)?(?:www\.)?github\.com\/[^\s|,;()]{1,200}/i
const PHONE_RE = /(?:\+\d{1,3}[\s.\-]?)?\(?\d{2,4}\)?[\s.\-]?\d{3}[\s.\-]?\d{2,4}(?:[\s.\-]?\d{2,4})?/g
const URL_RE =
  /(?:https?:\/\/)?(?:www\.)?[a-z0-9][a-z0-9\-]{0,62}(?:\.[a-z0-9\-]{1,63}){0,8}\.(?:com\.tr|com|net|org|io|dev|me|app|tech|co|xyz|site|page|info|design|studio|work|pro|ai|tr)(?:\/[^\s|,;()]{0,200})?/gi

export function findPhone(line: string): string {
  if ((line.match(/\d/g) || []).length < 9) return ''
  PHONE_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = PHONE_RE.exec(line))) {
    const digits = m[0].replace(/\D/g, '')
    if (digits.length < 9 || digits.length > 14) continue
    // "2019 2023" gibi yıl dizileri telefon değildir
    if (/^(?:19|20)\d{2}\D+(?:19|20)\d{2}$/.test(m[0].trim())) continue
    return m[0].trim()
  }
  return ''
}

export function findWebsite(line: string): string {
  if (line.indexOf('.') < 0) return ''
  URL_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = URL_RE.exec(line))) {
    const v = m[0]
    const before = line.charAt(m.index - 1)
    if (before === '@' || /[A-Za-z0-9.]/.test(before)) continue
    if (/linkedin\.com|github\.com/i.test(v)) continue
    if (/^(?:asp|vb|ado)\.net$/i.test(v)) continue
    // e-posta alan adı değil
    if (line.charAt(m.index + v.length) === '@') continue
    return v.replace(/[.)]+$/, '')
  }
  return ''
}

/* ----------------------------------- konum ----------------------------------- */

const TR_CITIES =
  'adana adiyaman afyon afyonkarahisar agri aksaray amasya ankara antalya ardahan artvin aydin balikesir bartin batman bayburt bilecik bingol bitlis bolu burdur bursa canakkale cankiri corum denizli diyarbakir duzce edirne elazig erzincan erzurum eskisehir gaziantep giresun gumushane hakkari hatay igdir isparta istanbul izmir kahramanmaras karabuk karaman kars kastamonu kayseri kilis kirikkale kirklareli kirsehir kocaeli konya kutahya malatya manisa mardin mersin mugla mus nevsehir nigde ordu osmaniye rize sakarya samsun sanliurfa siirt sinop sirnak sivas tekirdag tokat trabzon tunceli usak van yalova yozgat zonguldak gebze kadikoy besiktas sisli uskudar atasehir maltepe'
const WORLD =
  'turkey|turkiye|usa|united states|united kingdom|uk|germany|deutschland|netherlands|the netherlands|france|spain|italy|poland|canada|australia|ireland|sweden|norway|denmark|finland|switzerland|austria|belgium|portugal|estonia|romania|bulgaria|greece|cyprus|kktc|azerbaijan|ukraine|russia|india|uae|dubai|qatar|london|berlin|munich|hamburg|amsterdam|rotterdam|paris|madrid|barcelona|lisbon|warsaw|dublin|stockholm|zurich|vienna|toronto|vancouver|new york|ny|san francisco|ca|seattle|boston|austin|chicago|los angeles|remote|uzaktan|hybrid|hibrit|almanya|hollanda|ingiltere|fransa|amerika|abd|kanada|tr|us|de|nl'

const PLACE_SET: Record<string, true> = {}
TR_CITIES.split(' ').forEach((c) => (PLACE_SET[c] = true))
WORLD.split('|').forEach((c) => (PLACE_SET[c] = true))
const WEAK_PLACES: Record<string, true> = { tr: true, us: true, de: true, nl: true, ca: true, ny: true, uk: true }

/** "Istanbul, Turkey", "Ankara / Türkiye", "Remote" gibi bir konum parçası mı? */
export function looksLikeLocation(segment: string): boolean {
  const s = segment.trim()
  if (!s || s.length > 50 || /[@\d]/.test(s)) return false
  const f = fold(s).replace(/[()]/g, ' ')
  const parts = f.split(/\s*[,/\-–]\s*/).map((x) => x.trim()).filter(Boolean)
  if (!parts.length || parts.length > 3) return false
  let hits = 0
  let strong = 0
  for (const p of parts) {
    if (PLACE_SET[p]) {
      hits++
      if (!WEAK_PLACES[p]) strong++
    } else if (p.split(' ').length > 3) return false
  }
  return strong > 0 && (hits === parts.length || parts.length === 2)
}

/** Segmentler: " | ", " • ", " · ", tab ile ayrılmış satır parçaları. */
export function splitSegments(line: string): string[] {
  return line
    .split(/\s[|•·◦▪]\s|\s{3,}|\t| \| |\|/)
    .map((x) => x.trim())
    .filter(Boolean)
}

/* ------------------------------ emoji / ikonlar ------------------------------ */

/** Emoji (astral), özel kullanım alanı (ikon fontları) ve sembol/dingbat ikonları. Madde glifleri hariç. */
const ICON_RE =
  /[\uD83C-\uD83E][\uDC00-\uDFFF]|[-]|[☀-☄☇-⛿]|[✀-✒✕-✖✙-✡✨-❥➔-➗➰-➿]|[☎✉⌚⌛⌨⏰-⏺]|️/g

export function findIconGlyphs(text: string): string[] {
  const found = text.match(ICON_RE)
  if (!found) return []
  const uniq: string[] = []
  for (const g of found) if (g !== '️' && uniq.indexOf(g) < 0) uniq.push(g)
  return uniq
}

/** Metin olarak yazılmış seviye göstergeleri: "Java 90%", "★★★★☆", "●●●○○", "████", "Python 4/5". */
export function findTextSkillLevels(lines: string[]): string[] {
  const out: string[] = []
  const glyphRe = /[★☆]{3,}|[●○◉◯⬤]{3,}|[█▓▒░■□▰▱]{3,}|[⭐]{2,}/
  const pctRe = /^[A-Za-zÇĞİÖŞÜçğıöşü.#+][\w .+#/\-çğıöşüÇĞİÖŞÜ]{0,30}?[\s:(–\-]+\d{1,3}\s?%\)?$/
  const rateRe = /^[A-Za-zÇĞİÖŞÜçğıöşü.#+][\w .+#/\-çğıöşüÇĞİÖŞÜ]{0,30}?[\s:(–\-]+[1-5](?:[.,]5)?\s?\/\s?5\)?$/
  for (const line of lines) {
    if (out.length >= 8) break
    const t = stripBullet(line)
    if (!t) continue
    if (glyphRe.test(t)) {
      out.push(t.length > 40 ? t.slice(0, 40) + '…' : t)
      continue
    }
    for (const seg of t.split(/\s*[,;|•·]\s*/)) {
      const s = seg.trim()
      if (s.length > 40 || wordCount(s) > 5) continue
      if (pctRe.test(s) || rateRe.test(s)) {
        out.push(s)
        break
      }
    }
  }
  return out
}

export function uniqueStrings(list: string[]): string[] {
  const seen: Record<string, true> = {}
  const out: string[] = []
  for (const x of list) {
    const k = fold(x.trim())
    if (!k || seen[k]) continue
    seen[k] = true
    out.push(x.trim())
  }
  return out
}
