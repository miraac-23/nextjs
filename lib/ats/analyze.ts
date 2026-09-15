// ATS skor motoru — kaynaktan bağımsız kurallar. Girdi: AtsDocument (+ opsiyonel yapı, iş ilanı, şablon).
// Tüm kontroller saf TS'dir; tarayıcıda ve node testlerinde aynı çalışır.
//
// Puanlama modeli — yaygın kabul gören CV skorlama yapısı (Jobscan eşleşme raporu +
// Resume Worded / Enhancv ATS kontrolleri), kullanıcının ATS kuralları ve 20 maddelik listesi çekirdekte:
//   formatting    ≈30  biçim & ATS uyumluluğu (parse edilebilirlik, tek kolon, görsel/ikon, font, boyut)
//   searchability ≈20  aranabilirlik (iletişim, özet, standart başlıklar, unvan, tarih, eğitim)
//   hardSkills    ≈25  ilandaki teknik anahtar kelimeler, bağlam içinde kullanım, kısaltmalar
//   softSkills    ≈5   ilandaki kişisel yetkinlikler ve maddelerde kanıtlanmaları
//   recruiterTips ≈20  ölçülebilir sonuç, eylem fiili, madde yapısı, ton, klişeler, uzunluk
// İlan yoksa ilana bağlı kontroller 'info' (ağırlık 0) olur; toplam 100'e yeniden ölçeklenir.

import type {
  AtsCategoryKey,
  AtsCategoryScore,
  AtsCheck,
  AtsFixTarget,
  AtsGrade,
  AtsInput,
  AtsKeywordHit,
  AtsKeywordReport,
  AtsReport,
  AtsStatus,
  ResumeSectionKind,
  StructuredResume,
} from './types'
import { parseResume } from './resume-parser'
import {
  EMAIL_RE,
  bulletGlyph,
  findDateRanges,
  findDateTokens,
  findIconGlyphs,
  findPhone,
  findTextSkillLevels,
  fold,
  isWordChar,
  parseLooseDate,
  sentences,
  stripBullet,
  wordCount,
  type DateFormatKind,
} from './text'
import {
  KW_ENTRIES,
  countTerms,
  entryByTerm,
  extractJobKeywords,
  extractJobTitle,
  scanTerms,
  titlesMatch,
  type ExtractedKeyword,
  type KwEntry,
  type TermHit,
} from './keywords'
import { categoryLabel, gradeLabel, hasMsg, listText, msg } from './messages'

/** Kullanıcının 20 maddelik çıktı kontrol listesi — kimlikler ve sıra sabittir. */
export const CHECKLIST_ORDER = [
  'single-column',
  'no-tables',
  'no-text-boxes',
  'no-graphics',
  'no-images',
  'no-logos',
  'no-header-footer-critical',
  'standard-headings',
  'standard-font',
  'consistent-dates',
  'searchable-text',
  'standard-bullets',
  'clear-contact',
  'relevant-title',
  'relevant-keywords',
  'acronyms-explained',
  'quantified-achievements',
  'no-fabrication',
  'reverse-chronological',
  'human-readability',
]

export const CATEGORY_ORDER: AtsCategoryKey[] = ['formatting', 'searchability', 'hardSkills', 'softSkills', 'recruiterTips']

/** Kontrol tanımları: kategori, ağırlık (ilan verilmiş varsayımıyla ≈100) ve Stüdyo'daki düzeltme hedefi. */
export const CHECK_DEFS: Record<string, { category: AtsCategoryKey; weight: number; target: AtsFixTarget }> = {}
;(
  [
    ['formatting', 'design', 'searchable-text:4 single-column:3 no-tables:2.5 no-text-boxes:1.5 no-images:2 no-logos:0.5 no-header-footer-critical:2 reading-order:0.5 standard-font:2.5 body-font-size:1.5 heading-font-size:0.5 name-font-size:0.5 margins:1 light-background:1 file-type:1 page-setup:0.5'],
    ['formatting', 'details', 'no-graphics:2.5 no-icons-emoji:1.5 standard-bullets:1.5'],
    ['searchability', 'details', 'clear-contact:3 contact-location:1 contact-links:1 contact-position:1 summary-present:1.5 relevant-title:2.5 reverse-chronological:1 education-match:1'],
    ['searchability', 'sections', 'standard-headings:3 required-sections:2.5 section-order:1'],
    ['searchability', 'design', 'consistent-dates:1.5'],
    ['hardSkills', 'job', 'relevant-keywords:18'],
    ['hardSkills', 'details', 'skills-in-context:4 no-keyword-stuffing:2 acronyms-explained:1'],
    ['softSkills', 'job', 'soft-skills:3'],
    ['softSkills', 'details', 'soft-skills-in-context:2'],
    ['recruiterTips', 'details', 'quantified-achievements:4 action-verbs:2.5 bullets-per-role:2 bullet-format:1 human-readability:1.5 summary-length:2 no-first-person:1.5 summary-years:0.5 buzzwords:1.5 page-length:1.5 word-count:1 experience-details:1 no-fabrication:0'],
  ] as [AtsCategoryKey, AtsFixTarget, string][]
).forEach(([category, target, list]) =>
  list.split(' ').forEach((pair) => {
    const i = pair.lastIndexOf(':')
    CHECK_DEFS[pair.slice(0, i)] = { category, weight: Number(pair.slice(i + 1)), target }
  }),
)

/** Parse edilebilirliği doğrudan bozan kontroller — başarısızlıkları skora tavan koyar. */
const PARSE_IDS = ['searchable-text', 'single-column', 'no-tables', 'no-text-boxes', 'no-images', 'no-graphics', 'no-header-footer-critical']

/** Görsel (design) şablonun yerleşiminden kaynaklanan sorunlar → düzeltme: ATS şablonuna geç / Tasarım'da kapat. */
const TEMPLATE_IDS: Record<string, true> = {}
'single-column no-images no-graphics no-icons-emoji standard-font margins light-background body-font-size heading-font-size name-font-size standard-bullets consistent-dates'
  .split(' ')
  .forEach((id) => (TEMPLATE_IDS[id] = true))

/* ============================== sözlükler ============================== */

const EN_VERBS: Record<string, true> = {}
;(
  'achieve accelerate administer advance advise analyze analyse architect arrange assemble assess audit author automate boost build built capture centralize champion coach collaborate compile complete compose conceive conduct configure consolidate construct consult containerize containerise contribute convert coordinate create cultivate curate customize cut debug decrease decompose define deliver deploy design develop devise diagnose digitize direct discover double drive drove eliminate enable engineer enhance establish evaluate execute expand expedite facilitate finalize forecast formulate found generate grow grew guide halve handle head identify implement improve increase influence initiate innovate inspect install institute integrate introduce invent investigate launch lead led leverage lower maintain manage map maximize mentor merge migrate minimize model modernize modernise monitor motivate negotiate onboard operate optimize optimise orchestrate organize organise overhaul oversee oversaw own partner perform pilot pioneer plan prepare present prioritize process produce program programme promote propose prototype provide provision publish raise rebuild rebuilt recruit redesign reduce refactor reengineer re-engineer remediate reorganize replace report research resolve restructure revamp review revitalize rewrite rewrote save scale schedule secure select ship shorten simplify slash solve spearhead specify standardize standardise steer streamline strengthen structure supervise support surpass sustain synchronize test train transform translate triple troubleshoot troubleshot tune unify upgrade utilize validate win won write wrote co-led co-founded set sold ran taught spoke saw brought began took made kept gave cut'
)
  .split(' ')
  .forEach((w) => (EN_VERBS[w] = true))

const SAFE_ACRONYMS: Record<string, true> = {}
'IT API APIS SQL HTML CSS PDF USA US UK EU TR CV PHD BSC MSC BA BS MS MA MBA GPA CEO CTO CFO COO CIO CMO VP HR IBM SAP JSON XML HTTP HTTPS URL UI UX IOS PHP OK TV PC GB MB KB TB CPU GPU RAM USB NASA NATO UN ID SDK IDE PM AM TL USD EUR GMT UTC ABD AB LTD INC LLC ISO ERP CRM B2B B2C QA KPI KPIS JS TS MVC NET ASP YAML CEFR IELTS TOEFL YDS GRE GMAT LGS YKS ALES CSV AI ML HQ SME R&D'
  .split(' ')
  .forEach((w) => (SAFE_ACRONYMS[w] = true))
const SAFE_GROUPS: Record<string, true> = { language: true, framework: true, library: true, database: true, tool: true }

const CORE_KINDS: ResumeSectionKind[] = ['summary', 'experience', 'education', 'skills', 'projects']

const DATE_FMT_LABEL: Record<string, string> = {
  'num/': '01/2024', 'num.': '01.2024', 'num-': '01-2024', ym: '2024-01', short: 'Jan 2024', long: 'January 2024', year: '2024',
}

/**
 * Klişe / kanıtsız iddia ifadeleri (katlanmış metinde). Resume Worded ve Enhancv'nin
 * "buzzword" listelerindeki en yaygın EN karşılıklar + Türkçe CV'lerde sık görülen kalıplar.
 */
const BUZZWORDS: [string, RegExp][] = [
  ['team player', /\bteam[- ]player\b/],
  ['hard-working', /\bhard[- ]?working\b/],
  ['results-driven', /\bresults?[- ](?:driven|oriented|focused)\b/],
  ['go-getter', /\bgo[- ]getter\b/],
  ['detail-oriented', /\bdetail[- ](?:oriented|driven)\b/],
  ['synergy', /\bsynerg(?:y|ies|ize|istic)\b/],
  ['think outside the box', /\bout(?:side)?[- ](?:of[- ])?the[- ]box\b/],
  ['self-starter', /\bself[- ]starter\b/],
  ['highly motivated', /\b(?:highly|self)[- ]motivated\b/],
  ['dynamic', /\bdynamic (?:professional|individual|person|team player|and (?:motivated|passionate|hard))/],
  ['passionate', /\bpassionate (?:about|professional|individual|team player)\b/],
  ['proactive', /\bpro-?active\b/],
  ['fast learner', /\b(?:fast|quick) learner\b/],
  ['people person', /\bpeople person\b/],
  ['works well under pressure', /\b(?:works?|working|performs?) well under pressure\b/],
  ['ninja / rockstar / guru', /\b(?:ninja|rock ?star|guru)\b/],
  ['strong work ethic', /\bstrong work ethic\b/],
  ['excellent communication skills', /\bexcellent (?:communication|interpersonal) skills\b/],
  ['hit the ground running', /\bhit the ground running\b/],
  ['thought leader', /\bthought leader/],
  ['best of breed', /\bbest[- ]of[- ]breed\b/],
  ['dinamik', /\bdinamik(?: bir\b| ve\b|,| kisilik| yapi)/],
  ['çalışkan', /\bcaliskan\b/],
  ['sonuç odaklı', /\bsonuc odakli\b/],
  ['çözüm odaklı', /\bcozum odakli\b/],
  ['takım oyuncusu', /\b(?:takim|ekip) oyuncusu\b/],
  ['stres altında çalışabilen', /\b(?:stres|baski) altinda calis/],
  ['öğrenmeye açık', /\b(?:ogrenmeye|gelisime|kendini gelistirmeye) (?:acik|istekli)\b/],
  ['azimli', /\bazimli\b/],
  ['hırslı', /\bhirsli\b/],
  ['sorumluluk sahibi', /\bsorumluluk sahibi\b/],
  ['ekip çalışmasına yatkın', /\b(?:ekip|takim) calismasina (?:yatkin|uygun)\b/],
  ['iletişimi güçlü', /\biletisimi guclu\b/],
  ['özverili', /\bozverili\b/],
  ['disiplinli', /\bdisiplinli\b/],
  ['motivasyonu yüksek', /\bmotivasyonu yuksek\b/],
  ['detaycı', /\bdetayci\b/],
  ['vizyoner', /\bvizyoner\b/],
]

/**
 * Soft skill'in deneyim/proje maddelerinde KANITLANDIĞINI gösteren eylemler (katlanmış metin).
 * "Leadership" yazmak yerine "Led a team of 5" yazmak işe alımcıların beklediği kanıttır.
 */
const SOFT_EVIDENCE: Record<string, RegExp> = {
  'Communication Skills': /\b(?:communicat\w*|present(?:ed|ing|ations?)\b|liais\w*|documented|authored|sundu|raporla\w*|iletisim\w*)/,
  'Problem Solving': /\b(?:solv(?:ed|ing)|resolv\w*|troubleshoot\w*|diagnos\w*|root cause|cozdu|cozum(?:le|u)\w*|giderdi)/,
  Teamwork: /\b(?:collaborat\w*|cross[- ]functional|partnered|alongside|ekiplerle|ekibiyle|birlikte)/,
  Collaboration: /\b(?:collaborat\w*|cross[- ]functional|partnered|alongside|ekiplerle|ekibiyle|birlikte|is ?birligi)/,
  Leadership: /\b(?:led|leading|headed|spearhead\w*|supervis\w*|managed (?:a |an )?(?:team|group)|team lead|liderlik\w*|yonetti|onderlik\w*)\b/,
  Mentoring: /\b(?:mentor\w*|coach\w*|onboard\w*|trained|egitti)/,
  'Stakeholder Management': /\b(?:stakeholder\w*|paydas\w*|executives|product owners?|business units?)/,
  'Time Management': /\b(?:deadlines?|ahead of schedule|on time|on schedule|within budget|zamaninda|takvim\w*)/,
  'Analytical Thinking': /\b(?:analy[sz]\w*|analiz\w*|forecast\w*)/,
  'Critical Thinking': /\b(?:evaluat\w*|assess\w*|degerlendir\w*)/,
  'Attention to Detail': /\b(?:accura\w*|audit\w*|zero defects?|error rate|reconcil\w*|hatasiz|dogruluk\w*|mutabakat\w*)/,
  Adaptability: /\b(?:adapt\w*|transition\w*|pivot\w*|uyarla\w*)/,
  'Customer Focus': /\b(?:customers?|clients?|user satisfaction|nps|csat|musteri\w*)\b/,
  Ownership: /\b(?:owned|ownership|end[- ]to[- ]end|uctan uca|sahiplen\w*)/,
  'Presentation Skills': /\b(?:present(?:ed|ing|ations?)\b|demo(?:ed|s)?\b|conference talks?|sunum\w*|sundu)/,
  Negotiation: /\b(?:negotiat\w*|muzakere\w*)/,
  Creativity: /\b(?:invent\w*|conceived|designed|tasarla\w*)/,
  'Conflict Resolution': /\b(?:conflicts?|disputes?|escalations?|catisma\w*)\b/,
  'Decision Making': /\b(?:decid\w*|decisions?|karar\w*)/,
  'Interpersonal Skills': /\b(?:collaborat\w*|relationships?|iliski\w*)/,
  'Organizational Skills': /\b(?:organi[sz]ed|coordinat\w*|planned|koordine\w*|planla\w*)/,
}

/* ============================== yardımcılar ============================== */

const round1 = (n: number) => Math.round(n * 10) / 10
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0)
const showGlyph = (g: string) => (g.charCodeAt(0) >= 0xe000 && g.charCodeAt(0) <= 0xf8ff ? 'U+' + g.charCodeAt(0).toString(16).toUpperCase() : g)

function countFolded(hay: string, needle: string): number {
  if (!needle) return 0
  let n = 0
  let i = hay.indexOf(needle)
  while (i >= 0) {
    const before = hay.charAt(i - 1)
    let j = i + needle.length
    let extra = 0
    while (j < hay.length && isWordChar(hay.charAt(j))) {
      j++
      extra++
    }
    if (!isWordChar(before) && extra <= 4) n++
    i = hay.indexOf(needle, i + 1)
  }
  return n
}

const UNIT_RE =
  /^\s?(?:%|x\b|×|\+|k\b|m\b|b\b|mn\b|ms\b|s\b|sn\b|sec|second|saniye|dk\b|dakika|minute|min\b|hour|hrs?\b|saat|day|gun|week|hafta|month|ay\b|year|yil|user|kullanici|customer|musteri|client|request|istek|rps|tps|qps|transaction|islem|million|milyon|bin\b|thousand|billion|milyar|service|servis|microservice|mikroservis|team|ekip|kisilik|engineer|developer|gelistirici|muhendis|people|person|kisi|employee|calisan|member|uye|project|proje|countr|ulke|cit|il\b|sehir|office|ofis|provinc|store|magaza|branch|sube|record|kayit|report|rapor|app|uygulama|endpoint|test|release|deploy|server|sunucu|node|cluster|gb|tb|mb|pb|star|yildiz|download|indirme|business|isletme|partner|market|pazar|language|dil|region|bolge|hospital|school|okul|student|ogrenci|product|urun|order|siparis|lead|sale|satis|campaign|kampanya|page|sayfa|visitor|ziyaretci|course|kurs|module|modul|feature|ozellik)/

function isQuantified(bullet: string): boolean {
  const f = fold(bullet)
  if (/[$€£₺]\s?\d|\d\s?(?:tl|usd|eur|try)\b|%\s?\d|\d\s?%/.test(f)) return true
  const re = /\d+(?:[.,]\d+)*/g
  let m: RegExpExecArray | null
  while ((m = re.exec(f))) {
    const num = m[0]
    const s = m.index
    const e = s + num.length
    if (isWordChar(f.charAt(s - 1))) continue // p95, v2, ES6
    const after = f.slice(e, e + 16)
    const digits = num.replace(/\D/g, '')
    const val = Number(digits)
    if (digits.length === 4 && val >= 1950 && val <= 2100 && !/^\s?\+/.test(after)) continue
    if (UNIT_RE.test(after)) return true
    // "Java 17", "JUnit 5" → sürüm numarası
    const prevWord = bullet.slice(Math.max(0, s - 20), s).match(/([A-Za-zÇĞİÖŞÜçğıöşü.#+]+)\s$/)
    if (prevWord && /^[A-ZÇĞİÖŞÜ]/.test(prevWord[1])) continue
    if (isWordChar(after.charAt(0))) continue
    return true
  }
  return false
}

function startsWithAction(bullet: string): boolean {
  const f = fold(stripBullet(bullet)).replace(/^[^a-z]+/, '')
  const w = f.split(/[\s,;:]+/)
  const first = w[0] || ''
  const cand = /ly$/.test(first) && w[1] ? w[1] : first
  if (EN_VERBS[cand]) return true
  if (cand.length >= 5 && /ed$/.test(cand)) return true
  const base = cand.replace(/(?:ed|es|s|ing)$/, '')
  if (EN_VERBS[base] || EN_VERBS[base + 'e']) return true
  // Türkçe: yüklem cümle sonunda
  const last = f.replace(/[\s.;!…)"'’]+$/, '').split(/\s+/).pop() || ''
  if (/(?:d|t)(?:i|u)(?:m|k|mis)?$|m(?:i|u)s(?:t|d)(?:i|u)r$|(?:ma|me)(?:si|k)$|(?:iyor|uyor|makta|mekte)(?:um|dir|dur)?$|(?:di|ti|du|tu)(?:ler|lar)$/.test(last) && last.length >= 4) {
    return true
  }
  return false
}

function firstPersonHits(texts: string[]): string[] {
  const hits: string[] = []
  let trSuffix: string[] = []
  const enRe = /(?:^|[\s("“'])(I|I'm|I’m|I've|I’ve|I'd|I’d|I'll|I’ll|[Mm]y|[Mm]e|[Mm]ine|[Mm]yself)(?=[\s,.;:!?)"”']|$)/g
  const trPron = /(?:^|\s)(ben|benim|bana|beni|kendim|kendimi|bende|bizim ekibimde)(?=[\s,.;:!?]|$)/g
  const trVerb = /[a-zçğıöşü]{2,}(?:[bcçdfgğhjklmnprsştvyz][dt][ıiuü]m|[ıiuü]yorum|[ae]bilirim|[ae]c[ae]ğim|mekteyim|maktayım|m[ıiuü]ş[ıiuü]m)$/
  const NOT_VERB: Record<string, true> = { yardım: true, adım: true, kadim: true, hadim: true, yurdum: true }
  for (const t of texts) {
    if (!t) continue
    let m: RegExpExecArray | null
    enRe.lastIndex = 0
    while ((m = enRe.exec(t))) hits.push(m[1])
    const low = t.toLocaleLowerCase('tr-TR')
    trPron.lastIndex = 0
    while ((m = trPron.exec(low))) hits.push(m[1])
    low.split(/[\s,.;:!?()"“”]+/).forEach((w) => {
      if (w.length >= 5 && !NOT_VERB[w] && trVerb.test(w)) trSuffix.push(w)
    })
  }
  if (trSuffix.length < 2) trSuffix = []
  return hits.concat(trSuffix)
}

type FontInfo = { display: string; family: string | null; symbol: boolean }

function normalizeFont(raw: string): FontInfo {
  const display = raw
    .replace(/^[A-Z]{6}\+/, '')
    .replace(/[-,](?:Bold|Italic|Regular|Light|Medium|Semibold|SemiBold|Black|Oblique|BoldItalic|BoldMT|ItalicMT|BoldItalicMT|MT|PSMT|PS).*$/i, '')
    .replace(/(?:PSMT|MT)$/, '')
    .trim()
  const k = fold(display).replace(/[^a-z0-9]/g, '')
  if (/^(?:symbol|wingdings|webdings|zapfdingbats|dingbats|fontawesome|materialicons|materialsymbols|segoeuisymbol|segoemdl2|glyphicons|icomoon|bootstrapicons|ionicons)/.test(k)) {
    return { display, family: null, symbol: true }
  }
  const map: [RegExp, string][] = [
    [/^(?:arial|liberationsans|arimo)/, 'Arial'],
    [/^helvetica/, 'Helvetica'],
    [/^(?:calibri|carlito)/, 'Calibri'],
    [/^(?:timesnewroman|times(?:roman)?$|timesnr|tinos|liberationserif)/, 'Times New Roman'],
    [/^(?:georgia|gelasio)/, 'Georgia'],
    [/^(?:cambria|caladea)/, 'Cambria'],
  ]
  for (const [re, fam] of map) if (re.test(k)) return { display, family: fam, symbol: false }
  return { display, family: null, symbol: false }
}

function experienceYears(s: StructuredResume, now: Date): number | null {
  const nowM = now.getFullYear() * 12 + now.getMonth()
  const spans: [number, number][] = []
  for (const e of s.experience) {
    const a = parseLooseDate(e.start)
    if (!a || !a.year) continue
    const b = parseLooseDate(e.end)
    const from = a.year * 12 + ((a.month || 1) - 1)
    let to: number
    if (e.current || (b && b.present)) to = nowM
    else if (b && b.year) to = b.year * 12 + ((b.month || 12) - 1)
    else continue
    if (to >= from) spans.push([from, Math.min(to, nowM)])
  }
  if (!spans.length) return null
  spans.sort((x, y) => x[0] - y[0])
  let total = 0
  let [cs, ce] = spans[0]
  for (let i = 1; i < spans.length; i++) {
    const [s2, e2] = spans[i]
    if (s2 <= ce + 1) ce = Math.max(ce, e2)
    else {
      total += ce - cs + 1
      cs = s2
      ce = e2
    }
  }
  total += ce - cs + 1
  return round1(total / 12)
}

function unexplainedAcronyms(text: string, folded: string, hits: TermHit[]): string[] {
  const res: string[] = []
  const seen: Record<string, true> = {}
  const re = /[A-Z][A-Z0-9&]{1,5}(?:\/[A-Z]{1,5})?/g
  const letterRe = /[A-Za-z0-9ÇĞİÖŞÜçğıöşüÀ-ɏ]/
  let lineStart = 0
  const rows = text.split('\n')
  for (const line of rows) {
    const letters = line.replace(/[^A-Za-zÇĞİÖŞÜçğıöşü]/g, '')
    const upper = line.replace(/[^A-ZÇĞİÖŞÜ]/g, '').length
    const capsLine = letters.length > 6 && upper / letters.length > 0.6
    if (!capsLine && !/@|https?:|www\./.test(line)) {
      re.lastIndex = 0
      let m: RegExpExecArray | null
      while ((m = re.exec(line))) {
        const tok = m[0].replace(/&$/, '')
        const s = m.index
        const e = s + m[0].length
        if (letterRe.test(line.charAt(s - 1)) || letterRe.test(line.charAt(e))) continue
        if ((tok.match(/[A-Z]/g) || []).length < 2) continue
        if (/^(?:I{2,3}|IV|VI{0,3}|IX|XI{0,3})$/.test(tok)) continue
        if (seen[tok]) continue
        seen[tok] = true
        if (SAFE_ACRONYMS[tok] || SAFE_ACRONYMS[tok.replace('/', '')]) continue
        const abs = lineStart + s
        let hit: TermHit | undefined
        for (const h of hits) {
          if (h.start <= abs && h.end >= abs + tok.length) {
            hit = h
            break
          }
        }
        if (hit && SAFE_GROUPS[hit.entry.group]) continue
        if (text.indexOf('(' + tok + ')') >= 0) continue
        const esc = tok.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')
        if (new RegExp(esc + '\\s*\\([^)\\n]{6,80}\\)').test(text)) continue
        const entry: KwEntry | undefined = hit ? hit.entry : entryByTerm(tok)
        if (entry && entry.aliases.some((a) => a.text.indexOf(' ') > 0 && folded.indexOf(a.text) >= 0)) continue
        res.push(tok)
      }
    }
    lineStart += line.length + 1
  }
  return res
}

/** Metindeki klişe ifadeler (tekil, görünen biçimleriyle). */
export function findBuzzwords(folded: string): string[] {
  const out: string[] = []
  for (const [label, re] of BUZZWORDS) if (re.test(folded)) out.push(label)
  return out
}

/** Derece seviyesi: 1 ön lisans · 2 lisans · 3 yüksek lisans · 4 doktora · 0 bilinmiyor. */
function degreeLevels(foldedText: string): number[] {
  const f = foldedText.replace(/\bscrum master\b|\bmaster data\b|\bmasterclass\b|\bmaster branch\b/g, ' ')
  const out: number[] = []
  if (/\b(?:ph\.? ?d|doctorate|doctoral|doktora)\b/.test(f)) out.push(4)
  if (/\b(?:masters?|master's|m\.? ?sc|mba|m\.? ?eng|yuksek lisans)\b/.test(f)) out.push(3)
  const noHigher = f.replace(/yuksek lisans|on ?lisans/g, ' ')
  if (/\b(?:bachelors?|bachelor's|b\.? ?sc|b\.? ?eng|b\.a\.|b\.s\.|undergraduate|lisans|university degree|college degree|degree in)\b/.test(noHigher) || /\buniversite\w* .{0,60}mezun/.test(noHigher)) out.push(2)
  if (/\b(?:associate(?:'s)? degree|on ?lisans|meslek yuksekokulu)\b/.test(f)) out.push(1)
  return out
}

/* ================================= analiz ================================= */

export function analyze(input: AtsInput): AtsReport {
  const { doc, lang } = input
  const s: StructuredResume = input.structured ?? parseResume(doc)
  const text = doc.text || ''
  const folded = fold(text)
  const rows = text.split('\n')
  const L = doc.layout
  const now = new Date()
  const checks: AtsCheck[] = []
  const builder = doc.source === 'builder'
  const tpl = input.template
  // Görsel şablonun yerleşimi kaynaklı sorunlarda öneri: ATS uyumlu (Ankara) şablona geçmek.
  const designTpl = builder && !!tpl && tpl.family === 'design'
  const jd = (input.jobDescription || '').trim()

  const add = (id: string, status: AtsStatus, variant: string, vars?: Record<string, string | number>, unknown?: boolean) => {
    const def = CHECK_DEFS[id]
    let w = def.weight
    let earned = 0
    if (status === 'pass') earned = w
    else if (status === 'warn') earned = w * 0.5
    else if (status === 'fail') earned = 0
    else if (unknown) earned = w
    else w = 0
    let fixTarget = def.target
    let fixKey = id + '.fix'
    if (designTpl && TEMPLATE_IDS[id]) {
      fixTarget = 'template'
      fixKey = hasMsg(id + '.fix-template') ? id + '.fix-template' : 'template.fix'
    }
    const check: AtsCheck = {
      id,
      category: def.category,
      status,
      title: msg(lang, id + '.title'),
      detail: msg(lang, id + '.' + variant, vars),
      weight: w,
      earned,
      fixTarget,
    }
    if (status === 'warn' || status === 'fail') check.fix = msg(lang, fixKey, { name: tpl ? tpl.name : '' })
    if (CHECKLIST_ORDER.indexOf(id) >= 0) check.checklist = true
    checks.push(check)
  }

  /* ---------------------------- ortak veriler ---------------------------- */
  const words = wordCount(text)
  const nonBlankRows = rows.filter((r) => r.trim())
  const expBullets: string[] = []
  const projBullets: string[] = []
  s.experience.forEach((e) => e.bullets.forEach((b) => expBullets.push(b)))
  s.projects.forEach((p) => p.bullets.forEach((b) => projBullets.push(b)))
  const allBullets = expBullets.concat(projBullets)
  const years = experienceYears(s, now)
  const junior = years !== null && years < 3
  const textHits = scanTerms(text, folded)

  /* ===================== 1. BİÇİM & ATS UYUMLULUĞU (≈30) ===================== */
  if (!L.textBased) add('searchable-text', 'fail', 'fail')
  else if (words < 60) add('searchable-text', 'warn', 'warn', { words })
  else add('searchable-text', 'pass', 'pass', { words })

  const countCheck = (id: string, v: number | undefined) => {
    if (v === undefined) add(id, 'info', 'unknown', undefined, true)
    else if (v > 0) add(id, 'fail', 'fail', { n: v })
    else add(id, 'pass', 'pass')
  }
  if (L.columns === undefined) add('single-column', 'info', 'unknown', undefined, true)
  else if (L.columns > 1) add('single-column', 'fail', designTpl ? 'fail-design' : 'fail', { n: L.columns })
  else add('single-column', 'pass', 'pass')
  countCheck('no-tables', L.tables)
  countCheck('no-text-boxes', L.textBoxes)

  const textLevels = findTextSkillLevels(rows)
  if (L.graphics !== undefined && L.graphics > 0) add('no-graphics', 'fail', designTpl ? 'fail-design' : 'fail-shapes', { n: L.graphics })
  else if (textLevels.length) add('no-graphics', 'fail', 'fail-text', { list: listText(textLevels, 4) })
  else if (L.graphics === undefined) add('no-graphics', 'info', 'unknown', undefined, true)
  else add('no-graphics', 'pass', 'pass')

  if (L.images === undefined) add('no-images', 'info', 'unknown', undefined, true)
  else if (L.images > 0) add('no-images', 'fail', designTpl ? 'fail-design' : 'fail', { n: L.images })
  else add('no-images', 'pass', 'pass')
  // Builder'da görsel yalnızca profil fotoğrafı olabilir; logo basılmaz.
  if (builder) add('no-logos', 'pass', 'pass')
  else if (L.images === undefined) add('no-logos', 'info', 'unknown', undefined, true)
  else if (L.images > 0) add('no-logos', 'warn', 'warn', { n: L.images })
  else add('no-logos', 'pass', 'pass')

  const hf = L.headerFooterCritical
  if (hf === undefined) add('no-header-footer-critical', 'info', 'unknown', undefined, true)
  else if (hf.length) add('no-header-footer-critical', 'fail', 'fail', { list: listText(hf, 4) })
  else add('no-header-footer-critical', 'pass', 'pass')

  {
    const noBulletText = rows.map((r) => (bulletGlyph(r) ? stripBullet(r) : r)).join('\n')
    const glyphs = findIconGlyphs(noBulletText)
    const layoutIcons = L.icons || 0
    const n = glyphs.length + layoutIcons
    if (!n) add('no-icons-emoji', 'pass', 'pass')
    else {
      const st: AtsStatus = n <= 3 ? 'warn' : 'fail'
      if (!glyphs.length) add('no-icons-emoji', st, st + '-layout', { n })
      else add('no-icons-emoji', st, st, { list: glyphs.slice(0, 8).map(showGlyph).join(' ') + (layoutIcons ? ` +${layoutIcons}` : '') })
    }
  }

  {
    const top = nonBlankRows.slice(0, 8).join('\n')
    const nameTop = !s.name || top.indexOf(s.name) >= 0
    const contactTop = (!s.contact.email && !s.contact.phone) || (!!s.contact.email && top.indexOf(s.contact.email) >= 0) || (!!s.contact.phone && top.indexOf(s.contact.phone) >= 0)
    const shortShare = nonBlankRows.length ? nonBlankRows.filter((r) => wordCount(r) <= 2).length / nonBlankRows.length : 0
    const headCount: Record<string, number> = {}
    const dups: string[] = []
    s.sections.forEach((sec) => {
      const k = fold(sec.heading)
      headCount[k] = (headCount[k] || 0) + 1
      if (headCount[k] === 2) dups.push(sec.heading)
    })
    if (!nameTop || !contactTop) add('reading-order', 'warn', 'warn-top')
    else if (!builder && nonBlankRows.length >= 30 && shortShare > 0.45) add('reading-order', 'warn', 'warn-fragmented')
    else if (dups.length) add('reading-order', 'warn', 'warn-duplicate', { list: listText(dups) })
    else add('reading-order', 'pass', 'pass')
  }

  {
    const fonts = (L.fonts || []).filter((f) => f && f.trim() && f.charAt(0) !== '+')
    if (!fonts.length) add('standard-font', 'info', 'unknown', undefined, true)
    else {
      const ok: string[] = []
      const bad: string[] = []
      const sym: string[] = []
      fonts.forEach((f) => {
        const n = normalizeFont(f)
        if (n.symbol) sym.indexOf(n.display) < 0 && sym.push(n.display)
        else if (n.family) ok.indexOf(n.family) < 0 && ok.push(n.family)
        else bad.indexOf(n.display) < 0 && bad.push(n.display)
      })
      if (bad.length && !ok.length) add('standard-font', 'fail', 'fail', { list: listText(bad) })
      else if (bad.length) add('standard-font', 'warn', 'warn', { list: listText(bad) })
      else if (sym.length) add('standard-font', 'warn', 'warn-symbol', { list: listText(sym) })
      else add('standard-font', 'pass', 'pass', { list: ok.join(', ') })
    }
  }

  const sizeCheck = (id: string, v: number | undefined, pass: [number, number], warn: [number, number] | null) => {
    if (v === undefined || !isFinite(v)) return add(id, 'info', 'unknown', undefined, true)
    const d = { v: Math.round(v * 2) / 2 }
    if (v >= pass[0] && v <= pass[1]) add(id, 'pass', 'pass', d)
    else if (!warn || (v >= warn[0] && v <= warn[1])) add(id, 'warn', 'warn', d)
    else add(id, 'fail', 'fail', d)
  }
  sizeCheck('body-font-size', L.bodyFontSizePt, [9.75, 12.25], [9, 13])
  sizeCheck('heading-font-size', L.headingFontSizePt, [12.75, 16.25], null)
  sizeCheck('name-font-size', L.nameFontSizePt, [17.75, 24.25], [15, 28])

  {
    const m = L.marginsMm
    const sides = m ? [m.left, m.right, m.top].filter((x): x is number => typeof x === 'number' && isFinite(x)) : []
    if (!sides.length) add('margins', 'info', 'unknown', undefined, true)
    else {
      let min = Math.min.apply(null, sides)
      const max = Math.max.apply(null, sides)
      if (m && typeof m.bottom === 'number' && m.bottom < min) min = m.bottom
      const v = Math.round(min) === Math.round(max) ? String(round1(min)) : `${round1(min)}–${round1(max)}`
      if (min < 12.7) add('margins', 'fail', 'fail', { v })
      else if (min >= 16.8 && max <= 28) add('margins', 'pass', 'pass', { v })
      else add('margins', 'warn', 'warn', { v })
    }
  }

  if (L.darkBackground === undefined) add('light-background', 'info', 'unknown', undefined, true)
  else if (L.darkBackground) add('light-background', 'fail', 'fail')
  // Vurgu rengi bilgi taşımasa da ad ve başlıklar onunla basılır; soluk ton okunmaz.
  else if (L.accentContrast !== undefined && L.accentContrast < 4.5) add('light-background', 'warn', 'warn-accent', { ratio: L.accentContrast.toFixed(1) })
  else add('light-background', 'pass', 'pass')

  {
    const std: string[] = []
    const simple: string[] = []
    const deco: string[] = []
    rows.forEach((r) => {
      let g = bulletGlyph(r)
      if (!g) return
      if (g === '') g = '•'
      const bucket = g === '•' || g === '-' ? std : '*·▪◦○●■□–—'.indexOf(g) >= 0 ? simple : deco
      if (bucket.indexOf(g) < 0) bucket.push(g)
    })
    const show = (a: string[]) => a.map(showGlyph).join(' ')
    if (L.decorativeBullets) add('standard-bullets', 'fail', 'fail-layout')
    else if (deco.length) add('standard-bullets', 'fail', 'fail', { list: show(deco) })
    else if (simple.length) add('standard-bullets', 'warn', 'warn', { list: show(simple) })
    else if (std.length > 1) add('standard-bullets', 'warn', 'warn-mixed', { list: show(std) })
    else if (std.length) add('standard-bullets', 'pass', 'pass')
    else add('standard-bullets', 'pass', 'pass-none')
  }

  if (builder) add('file-type', 'pass', 'pass-builder')
  else if (doc.source === 'pdf' || doc.source === 'docx') add('file-type', 'pass', 'pass', { type: doc.source.toUpperCase() })
  else add('file-type', 'info', 'info-txt')

  {
    const pw = L.pageWidthMm
    const pages = Math.max(1, doc.pageCount || 1)
    if (pw === undefined || !isFinite(pw)) add('page-setup', 'info', 'unknown', undefined, true)
    else if (Math.abs(pw - 210) <= 3) add('page-setup', 'pass', 'pass', { size: 'A4', p: pages })
    else if (Math.abs(pw - 215.9) <= 3) add('page-setup', 'pass', 'pass', { size: 'Letter', p: pages })
    else add('page-setup', 'warn', 'warn', { v: Math.round(pw) })
  }

  /* ============================ 2. ARANABİLİRLİK (≈20) ============================ */
  {
    const c = s.contact
    const missing: string[] = []
    if (!s.name) missing.push(msg(lang, 'field.name'))
    if (!c.email) missing.push(msg(lang, 'field.email'))
    if (!c.phone) missing.push(msg(lang, 'field.phone'))
    if (!c.email || (!s.name && !c.phone)) add('clear-contact', 'fail', 'fail', { list: missing.join(', ') })
    else if (missing.length) add('clear-contact', 'warn', 'warn', { list: missing.join(', ') })
    else add('clear-contact', 'pass', 'pass')

    if (c.location) add('contact-location', 'pass', 'pass', { v: c.location })
    else add('contact-location', 'warn', 'warn')

    const links = [c.linkedin && 'LinkedIn', c.github && 'GitHub', c.website && (lang === 'en' ? 'Portfolio' : 'Portfolyo')].filter(Boolean) as string[]
    if (links.length) add('contact-links', 'pass', 'pass', { list: links.join(', ') })
    else add('contact-links', 'warn', 'warn')

    let pos = -1
    let n = 0
    for (const r of rows) {
      if (!r.trim()) continue
      n++
      if ((c.email && r.indexOf(c.email) >= 0) || (c.phone && r.indexOf(c.phone) >= 0) || EMAIL_RE.test(r) || (n <= 12 && findPhone(r))) {
        pos = n
        break
      }
    }
    if (pos < 0) add('contact-position', 'info', 'info')
    else if (pos <= 6) add('contact-position', 'pass', 'pass')
    else add('contact-position', 'warn', 'warn', { n: pos })
  }

  const summary = s.summary.trim()
  if (summary) add('summary-present', 'pass', 'pass', { w: wordCount(summary) })
  else add('summary-present', 'fail', 'fail')

  const secs = s.sections
  const hasKind = (k: ResumeSectionKind) =>
    secs.some((x) => x.kind === k) ||
    (k === 'experience' && s.experience.length > 0) ||
    (k === 'education' && s.education.length > 0) ||
    (k === 'skills' && s.skills.length > 0)
  {
    const content = secs.filter((x) => x.kind !== 'contact')
    if (!content.length) add('standard-headings', 'fail', 'fail-none')
    else {
      const nonStd = content.filter((x) => !x.standard)
      if (!nonStd.length) add('standard-headings', 'pass', 'pass', { n: content.length })
      else if (nonStd.some((x) => CORE_KINDS.indexOf(x.kind) >= 0)) add('standard-headings', 'fail', 'fail', { list: listText(nonStd.map((x) => x.heading)) })
      else add('standard-headings', 'warn', 'warn', { list: listText(nonStd.map((x) => x.heading)) })
    }
  }
  {
    const missing = (['experience', 'education', 'skills'] as ResumeSectionKind[]).filter((k) => !hasKind(k)).map((k) => msg(lang, 'section.' + k))
    if (missing.length >= 2) add('required-sections', 'fail', 'fail', { list: missing.join(', ') })
    else if (missing.length === 1) add('required-sections', 'warn', 'warn', { list: missing.join(', ') })
    else add('required-sections', 'pass', 'pass')
  }
  {
    const order = secs.filter((x) => x.kind !== 'contact').map((x) => x.kind)
    const idx = (k: ResumeSectionKind) => order.indexOf(k)
    const minor = secs.filter((x) => (x.kind === 'references' || x.kind === 'interests' || x.kind === 'awards') && idx('experience') >= 0 && order.indexOf(x.kind) < idx('experience')).map((x) => x.heading)
    if (idx('summary') > 0) add('section-order', 'warn', 'warn-summary')
    else if (years !== null && years >= 3 && idx('education') >= 0 && idx('experience') >= 0 && idx('education') < idx('experience')) add('section-order', 'warn', 'warn-education')
    else if (minor.length) add('section-order', 'warn', 'warn-minor', { list: listText(minor) })
    else add('section-order', 'pass', 'pass')
  }

  const target = (input.targetTitle || '').trim() || (jd ? extractJobTitle(jd) : '')
  let titleMatch: boolean | null = null
  if (!s.title) {
    add('relevant-title', 'fail', 'fail')
    titleMatch = target ? false : null
  } else if (!target) add('relevant-title', 'pass', 'pass-nojd', { title: s.title })
  else {
    titleMatch = titlesMatch(s.title, target)
    add('relevant-title', titleMatch ? 'pass' : 'warn', titleMatch ? 'pass' : 'warn', { title: s.title, target })
  }

  {
    const kinds: Record<string, number> = {}
    rows.forEach((r) => {
      const f = fold(r)
      const toks = findDateTokens(f)
      if (!toks.length) return
      const ranges = findDateRanges(f, toks)
      const used: Record<number, true> = {}
      ranges.forEach((rg) => {
        used[rg.start.start] = true
        if (rg.end) used[rg.end.start] = true
      })
      // satırın kelime sayısı bir kez hesaplanır (uzun satırlarda belirteç başına dilimleme karesel olurdu)
      const lineWords = wordCount(f.replace(/[|•·,–\-()]/g, ' '))
      toks.forEach((t) => {
        if (t.kind === 'present') return
        if (!used[t.start] && lineWords - wordCount(f.slice(t.start, t.end)) > 5) return
        kinds[t.kind] = (kinds[t.kind] || 0) + 1
      })
    })
    const monthKinds = Object.keys(kinds).filter((k) => k !== 'year' && k !== 'month-any' && k !== 'present') as DateFormatKind[]
    if (!monthKinds.length && kinds['month-any']) monthKinds.push('short')
    const total = Object.keys(kinds).reduce((a, k) => a + kinds[k], 0)
    if (!total) {
      if (s.experience.length || secs.some((x) => x.kind === 'experience')) add('consistent-dates', 'warn', 'warn-none')
      else add('consistent-dates', 'pass', 'pass', { fmt: '—' })
    } else if (monthKinds.length > 1) {
      add('consistent-dates', 'fail', 'fail', { list: monthKinds.concat(kinds.year ? ['year'] : []).map((k) => DATE_FMT_LABEL[k]).join(', ') })
    } else if (monthKinds.length === 1 && kinds.year) {
      add('consistent-dates', 'warn', 'warn-year', { list: [DATE_FMT_LABEL[monthKinds[0]], DATE_FMT_LABEL.year].join(', ') })
    } else {
      add('consistent-dates', 'pass', 'pass', { fmt: DATE_FMT_LABEL[monthKinds[0] || 'year'] })
    }
  }

  {
    const dated = s.experience
      .map((e) => {
        const d = parseLooseDate(e.start)
        return d && d.year ? { e, key: d.year * 12 + (d.month || 1) } : null
      })
      .filter((x): x is { e: StructuredResume['experience'][number]; key: number } => !!x)
    if (dated.length < 2) add('reverse-chronological', 'pass', 'pass-few')
    else {
      const bad: string[] = []
      for (let i = 1; i < dated.length; i++) {
        if (dated[i].key > dated[i - 1].key) bad.push(dated[i].e.title || dated[i].e.company || msg(lang, 'entry.unnamed'))
      }
      if (!bad.length) add('reverse-chronological', 'pass', 'pass')
      else add('reverse-chronological', bad.length === 1 ? 'warn' : 'fail', bad.length === 1 ? 'warn' : 'fail', { list: listText(bad, 3) })
    }
  }

  {
    const eduSec = secs.filter((x) => x.kind === 'education').map((x) => x.body)
    const hasEdu = s.education.length > 0 || eduSec.some((b) => b.trim())
    const cvLevels = degreeLevels(fold(s.education.map((e) => `${e.degree} ${e.school}`).concat(eduSec).join('\n')))
    const cvLevel = cvLevels.length ? Math.max.apply(null, cvLevels) : 0
    const jdLevels = jd ? degreeLevels(fold(jd)) : []
    const req = jdLevels.length ? Math.min.apply(null, jdLevels) : 0
    const reqLabel = req ? msg(lang, 'degree.' + req) : ''
    if (!hasEdu) add('education-match', req ? 'fail' : 'warn', req ? 'fail-jd' : 'warn-none', { req: reqLabel })
    else if (req && cvLevel && cvLevel < req) add('education-match', 'warn', 'warn-level', { req: reqLabel })
    else if (req) add('education-match', 'pass', 'pass-jd', { req: reqLabel })
    else add('education-match', 'pass', 'pass', { n: Math.max(1, s.education.length) })
  }

  /* ============================ 3. HARD SKILLS (≈25) ============================ */
  const expParts: string[] = []
  s.experience.forEach((e) => {
    expParts.push(e.title, e.description)
    e.bullets.forEach((b) => expParts.push(b))
  })
  s.projects.forEach((p) => {
    expParts.push(p.name, p.description)
    p.bullets.forEach((b) => expParts.push(b))
  })
  const expText = expParts.filter(Boolean).join('\n')
  const expFolded = fold(expText)
  const expCounts = countTerms(scanTerms(expText, expFolded))
  const skillsText = s.skills.join(', ')
  const skillsFolded = fold(skillsText)
  const skillCounts = countTerms(scanTerms(skillsText, skillsFolded))
  const textCounts = countTerms(textHits)

  const extracted: ExtractedKeyword[] = jd ? extractJobKeywords(jd, target) : []
  const matched: AtsKeywordHit[] = []
  const missing: AtsKeywordReport['missing'] = []
  const IMP_W = { high: 3, medium: 2, low: 1 }
  let hTotal = 0
  let hHit = 0
  let hN = 0
  let hM = 0
  let sTotal = 0
  let sHit = 0
  let sN = 0
  const softShownOnlyListed: string[] = []
  extracted.forEach((k) => {
    const count = k.entry ? textCounts[k.entry.term] || 0 : countFolded(folded, k.key)
    const litExp = k.entry ? (expCounts[k.entry.term] || 0) > 0 : countFolded(expFolded, k.key) > 0
    const inSkills = k.entry ? (skillCounts[k.entry.term] || 0) > 0 : countFolded(skillsFolded, k.key) > 0
    const w = IMP_W[k.importance]
    if (k.soft) {
      // Soft skill: kelimenin kendisi ya da maddelerde onu kanıtlayan bir eylem yeterli.
      const ev = SOFT_EVIDENCE[k.term]
      const shown = litExp || (!!ev && ev.test(expFolded))
      sTotal += w
      sN++
      if (count > 0 || shown) {
        sHit += w
        matched.push({ term: k.term, count, inExperience: shown, inSkills, soft: true })
        if (!shown) softShownOnlyListed.push(k.term)
      } else missing.push({ term: k.term, importance: k.importance, group: k.group, soft: true })
      return
    }
    hTotal += w
    hN++
    if (count > 0) {
      hHit += w
      hM++
      matched.push({ term: k.term, count, inExperience: litExp, inSkills, soft: false })
    } else missing.push({ term: k.term, importance: k.importance, group: k.group, soft: false })
  })
  const matchRate = hTotal ? Math.round((hHit / hTotal) * 100) : 0
  const softMatchRate = sTotal ? Math.round((sHit / sTotal) * 100) : 0

  if (!jd) add('relevant-keywords', 'info', 'info-nojd')
  else if (!hN) add('relevant-keywords', 'info', 'info-empty')
  else {
    const st: AtsStatus = matchRate >= 70 ? 'pass' : matchRate >= 45 ? 'warn' : 'fail'
    const hardMissing = missing.filter((m) => !m.soft)
    const important = hardMissing.filter((m) => m.importance !== 'low').map((m) => m.term)
    add('relevant-keywords', st, st, {
      rate: matchRate,
      m: hM,
      n: hN,
      list: listText(important.length ? important : hardMissing.map((m) => m.term), 6),
    })
  }

  const skillsOnly: string[] = []
  {
    let considered = 0
    s.skills.forEach((sk) => {
      const name = sk.trim()
      if (name.length < 2) return
      const hits = scanTerms(name)
      if (hits.length && hits.every((h) => h.entry.group === 'soft')) return
      considered++
      let inCtx: boolean
      if (hits.length) inCtx = hits.some((h) => (expCounts[h.entry.term] || 0) > 0)
      else {
        const core = fold(name).replace(/\([^)]*\)/g, ' ').replace(/\s+\d+(?:\.\d+)*\s*$/, '').replace(/\s+/g, ' ').trim()
        inCtx = core.length < 2 || countFolded(expFolded, core) > 0
      }
      if (!inCtx) skillsOnly.push(name)
    })
    if (!considered) add('skills-in-context', 'info', 'info')
    else if (skillsOnly.length / considered <= 0.3) add('skills-in-context', 'pass', 'pass')
    else add('skills-in-context', 'warn', 'warn', { list: listText(skillsOnly, 8) })
  }

  const stuffing: string[] = []
  Object.keys(textCounts).forEach((term) => {
    const entry = entryByTerm(term)
    if (entry && entry.group === 'role') return
    const c = textCounts[term]
    if (c > 6 || (words >= 150 && c >= 5 && c / words > 0.03)) stuffing.push(term)
  })
  if (stuffing.length) add('no-keyword-stuffing', 'warn', 'warn', { list: listText(stuffing.map((t) => `${t} ×${textCounts[t]}`), 5) })
  else add('no-keyword-stuffing', 'pass', 'pass')

  const unexplained = unexplainedAcronyms(text, folded, textHits)
  {
    const anyAcr = /(?:^|[^A-Za-z])[A-Z]{2,6}(?:[^A-Za-z]|$)/.test(text)
    if (unexplained.length) add('acronyms-explained', 'warn', 'warn', { list: listText(unexplained, 6) })
    else add('acronyms-explained', 'pass', anyAcr ? 'pass' : 'pass-none')
  }

  /* ============================ 4. SOFT SKILLS (≈5) ============================ */
  if (!jd) {
    add('soft-skills', 'info', 'info-nojd')
    add('soft-skills-in-context', 'info', 'info-nojd')
  } else if (!sN) {
    add('soft-skills', 'info', 'info-empty')
    add('soft-skills-in-context', 'info', 'info-empty')
  } else {
    const st: AtsStatus = softMatchRate >= 60 ? 'pass' : softMatchRate >= 30 ? 'warn' : 'fail'
    const softMissing = missing.filter((m) => m.soft).map((m) => m.term)
    add('soft-skills', st, st, { rate: softMatchRate, m: matched.filter((x) => x.soft).length, n: sN, list: listText(softMissing, 5) })
    const softMatched = matched.filter((x) => x.soft)
    if (!softMatched.length) add('soft-skills-in-context', 'warn', 'warn-none')
    else if (softShownOnlyListed.length) add('soft-skills-in-context', 'warn', 'warn', { list: listText(softShownOnlyListed, 5) })
    else add('soft-skills-in-context', 'pass', 'pass', { n: softMatched.length })
  }

  /* ========================= 5. İŞE ALIMCI İPUÇLARI (≈20) ========================= */
  const quantified = allBullets.filter(isQuantified).length
  if (!allBullets.length) add('quantified-achievements', 'warn', 'warn-none')
  else {
    const share = quantified / allBullets.length
    const st: AtsStatus = share >= 0.4 ? 'pass' : share >= 0.2 ? 'warn' : 'fail'
    add('quantified-achievements', st, st, { q: quantified, n: allBullets.length })
  }

  if (!allBullets.length) add('action-verbs', 'info', 'info')
  else {
    const weak = allBullets.filter((b) => !startsWithAction(b))
    const p = pct(allBullets.length - weak.length, allBullets.length)
    const ex = weak.slice(0, 2).map((b) => (b.length > 50 ? b.slice(0, 50) + '…' : b))
    const st: AtsStatus = p >= 70 ? 'pass' : p >= 40 ? 'warn' : 'fail'
    add('action-verbs', st, st, { p, list: listText(ex, 2) })
  }

  {
    const ex = s.experience
    if (!ex.length) {
      add('experience-details', 'fail', 'fail-none')
      add('bullets-per-role', 'info', 'info')
      add('bullet-format', 'info', 'info')
    } else {
      const problems: string[] = []
      let missingCore = 0
      let missingLoc = 0
      ex.forEach((e) => {
        const miss: string[] = []
        if (!e.title) miss.push(msg(lang, 'field.title'))
        if (!e.company) miss.push(msg(lang, 'field.company'))
        if (!e.start && !e.end) miss.push(msg(lang, 'field.dates'))
        if (!e.location) missingLoc++
        if (miss.length) {
          missingCore++
          problems.push(`${e.title || e.company || msg(lang, 'entry.unnamed')} (${miss.join(', ')})`)
        }
      })
      if (!missingCore) {
        if (missingLoc > ex.length / 2) add('experience-details', 'warn', 'warn-location')
        else add('experience-details', 'pass', 'pass', { n: ex.length })
      } else if (missingCore / ex.length <= 1 / 3) add('experience-details', 'warn', 'warn', { list: problems.slice(0, 4).join('; ') })
      else add('experience-details', 'fail', 'fail', { list: problems.slice(0, 4).join('; ') })

      const bad: string[] = []
      ex.forEach((e, i) => {
        const n = e.bullets.length
        const ok = i < 2 ? n >= 3 && n <= 6 : n >= 2 && n <= 6
        if (!ok) bad.push(`${e.title || e.company || msg(lang, 'entry.unnamed')}: ${msg(lang, 'bullets.count', { n })}`)
      })
      const share = 1 - bad.length / ex.length
      const st: AtsStatus = share >= 0.75 ? 'pass' : share >= 0.4 ? 'warn' : 'fail'
      add('bullets-per-role', st, st, { list: bad.slice(0, 4).join('; ') })

      const paraRoles = ex.filter((e) => wordCount(e.description) > 40 && e.bullets.length < 2).map((e) => e.title || e.company || msg(lang, 'entry.unnamed'))
      if (paraRoles.length) add('bullet-format', 'warn', 'warn', { list: listText(paraRoles, 4) })
      else add('bullet-format', 'pass', 'pass')
    }
  }

  {
    const bw = allBullets.map(wordCount)
    const avg = bw.length ? round1(bw.reduce((a, b) => a + b, 0) / bw.length) : 0
    const longB = bw.filter((n) => n > 40).length
    const summaryF = fold(summary).slice(0, 60)
    const paragraphs = rows.filter((r) => wordCount(r) > 60 && !(summaryF && fold(r).indexOf(summaryF) >= 0)).length
    const issues: string[] = []
    if (avg > 30) issues.push(msg(lang, 'human-readability.issue-avg', { avg }))
    if (longB >= 2) issues.push(msg(lang, 'human-readability.issue-long-bullets', { n: longB }))
    if (paragraphs >= 1) issues.push(msg(lang, 'human-readability.issue-paragraphs', { n: paragraphs }))
    if (nonBlankRows.length < 8 && words > 250) add('human-readability', 'fail', 'fail')
    else if (issues.length) add('human-readability', issues.length >= 3 ? 'fail' : 'warn', issues.length >= 3 ? 'fail' : 'warn', { list: issues.join('; ') })
    else add('human-readability', 'pass', 'pass', { avg: avg || '—' })
  }

  {
    // Özetin yokluğu Aranabilirlik'te puanlanır; burada yalnızca uzunluğu değerlendirilir.
    if (!summary) add('summary-length', 'info', 'info-missing')
    else {
      const sc = Math.max(1, sentences(summary).length)
      const wc = wordCount(summary)
      const d = { s: sc, w: wc }
      if (sc >= 2 && sc <= 4 && wc >= 25 && wc <= 100) add('summary-length', 'pass', 'pass', d)
      else if (sc >= 1 && sc <= 6 && wc >= 15 && wc <= 140) add('summary-length', 'warn', 'warn', d)
      else add('summary-length', 'fail', 'fail', d)
    }

    const fp = firstPersonHits([summary].concat(s.experience.map((e) => e.description), expBullets, projBullets))
    const uniq: string[] = []
    fp.forEach((x) => uniq.indexOf(x) < 0 && uniq.push(x))
    if (!fp.length) add('no-first-person', 'pass', 'pass')
    else add('no-first-person', fp.length >= 3 ? 'fail' : 'warn', fp.length >= 3 ? 'fail' : 'warn', { list: listText(uniq, 6) })

    const fs = fold(summary)
    const hasYears =
      /\b\d{1,2}\s?\+?\s*(?:\+\s*)?(?:years?|yrs?|yil|yillik|sene|senelik)\b/.test(fs) ||
      /\b(?:over|more than|nearly|almost|about)\s+(?:a|one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+(?:decades?|years?)\b/.test(fs) ||
      /\bdecade\b|\bon yil|\byirmi yil|\bbes yil/.test(fs)
    if (!summary || (years !== null && years < 1)) add('summary-years', 'info', 'info')
    else add('summary-years', hasYears ? 'pass' : 'warn', hasYears ? 'pass' : 'warn')
  }

  const buzzwords = findBuzzwords(folded)
  if (!buzzwords.length) add('buzzwords', 'pass', 'pass')
  else if (buzzwords.length <= 2) add('buzzwords', 'pass', 'pass-few', { list: listText(buzzwords, 4) })
  else add('buzzwords', buzzwords.length >= 6 ? 'fail' : 'warn', buzzwords.length >= 6 ? 'fail' : 'warn', { n: buzzwords.length, list: listText(buzzwords, 6) })

  {
    const pages = Math.max(1, doc.pageCount || 1)
    const max = junior ? 1 : 2
    const level = msg(lang, junior ? 'page-length.level-junior' : 'page-length.level-senior')
    if (pages <= max) add('page-length', 'pass', 'pass', { p: pages, level })
    else if (pages === max + 1) add('page-length', 'warn', 'warn', { p: pages, level, max })
    else add('page-length', 'fail', 'fail', { p: pages, level, max })

    const lo = junior ? 180 : 250
    const hi = junior ? 750 : 1100
    if (words >= lo && words <= hi) add('word-count', 'pass', 'pass', { w: words })
    else if (words < lo) add('word-count', words >= lo * 0.6 ? 'warn' : 'fail', words >= lo * 0.6 ? 'warn-low' : 'fail-low', { w: words })
    else add('word-count', words <= hi * 1.4 ? 'warn' : 'fail', words <= hi * 1.4 ? 'warn-high' : 'fail-high', { w: words })
  }

  add('no-fabrication', 'info', builder ? 'info-builder' : 'info-upload')

  /* ================================ puanlama ================================ */
  const totalW = checks.reduce((a, c) => a + c.weight, 0)
  const totalE = checks.reduce((a, c) => a + c.earned, 0)
  let score = totalW ? Math.round((totalE / totalW) * 100) : 0
  // Öncelik parse edilebilirliktir: içerik ne kadar iyi olursa olsun ATS'nin okuyamadığı
  // (sütunlu, grafikli, fotoğraflı…) belge yüksek skor almamalı → tavan.
  const scoreRaw = score
  const parseFails = checks.filter((c) => PARSE_IDS.indexOf(c.id) >= 0 && c.status === 'fail')
  if (parseFails.some((c) => c.id === 'searchable-text')) score = Math.min(score, 20)
  else if (parseFails.length >= 2) score = Math.min(score, 64)
  else if (parseFails.length === 1) score = Math.min(score, 79)
  const capped = score < scoreRaw
  if (totalW && Math.abs(totalW - 100) > 1e-6) {
    const k = 100 / totalW
    checks.forEach((c) => {
      c.weight = Math.round(c.weight * k * 100) / 100
      c.earned = Math.round(c.earned * k * 100) / 100
    })
  }

  // max 0 → kategori değerlendirilmedi (ör. ilan yokken Soft Skills); arayüz "—" gösterir.
  const categories: AtsCategoryScore[] = CATEGORY_ORDER.map((key) => {
    const cs = checks.filter((c) => c.category === key)
    const earned = round1(cs.reduce((a, c) => a + c.earned, 0))
    const max = round1(cs.reduce((a, c) => a + c.weight, 0))
    return { key, label: categoryLabel(lang, key), score: max ? Math.round((earned / max) * 100) : 0, earned, max }
  })

  const grade: AtsGrade = score >= 85 ? 'excellent' : score >= 70 ? 'good' : score >= 50 ? 'fair' : 'poor'
  const gLabel = gradeLabel(lang, grade)
  const fails = checks.filter((c) => c.status === 'fail').length
  const warns = checks.filter((c) => c.status === 'warn').length
  const templateFails = designTpl && checks.some((c) => c.fixTarget === 'template' && c.status === 'fail')
  const headline =
    (fails
      ? msg(lang, 'headline.issues', { score, grade: gLabel, f: fails, w: warns })
      : msg(lang, 'headline.clean', { score, grade: gLabel, extra: warns ? msg(lang, 'headline.extra', { n: warns }) : '' })) +
    (capped ? ' ' + msg(lang, 'headline.capped', { raw: scoreRaw }) : '') +
    (templateFails && tpl ? ' ' + msg(lang, 'headline.design', { name: tpl.name }) : '')

  // sıralama: önce 20 maddelik kontrol listesi (sabit sıra), sonra kategori sırasıyla diğerleri
  const ordered: AtsCheck[] = []
  CHECKLIST_ORDER.forEach((id) => {
    const c = checks.find((x) => x.id === id)
    if (c) ordered.push(c)
  })
  CATEGORY_ORDER.forEach((cat) => checks.forEach((c) => !c.checklist && c.category === cat && ordered.push(c)))

  const topFixes = ordered
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => (c.status === 'warn' || c.status === 'fail') && c.weight - c.earned > 0)
    .sort((a, b) => b.c.weight - b.c.earned - (a.c.weight - a.c.earned) || a.i - b.i)
    .slice(0, 6)
    .map(({ c }) => c)

  const keywords: AtsKeywordReport = {
    provided: !!jd,
    extracted: extracted.map((k) => ({ term: k.term, importance: k.importance, group: k.group, soft: k.soft })),
    matched,
    missing,
    skillsOnly,
    stuffing,
    titleMatch,
    unexplainedAcronyms: unexplained,
    matchRate,
    softMatchRate,
    buzzwords,
  }

  const report: AtsReport = {
    score,
    grade,
    gradeLabel: gLabel,
    headline,
    categories,
    checks: ordered,
    keywords,
    topFixes,
    parsed: s,
    text,
    stats: {
      words,
      bullets: allBullets.length,
      quantifiedBullets: quantified,
      pages: Math.max(1, doc.pageCount || 1),
      experienceYears: years,
      sectionsFound: secs.filter((x) => x.kind !== 'contact').length,
    },
    source: doc.source,
    generatedAt: now.getTime(),
  }
  if (tpl) report.template = { id: tpl.id, name: tpl.name, family: tpl.family }
  return report
}

// Sözlük boyutu (test/teşhis için)
export const KEYWORD_DICTIONARY_SIZE = KW_ENTRIES.length
