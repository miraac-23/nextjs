// CV'nin ATS görünümü — ekrandaki belge (CvDocument), Word çıktısı (docx.ts) ve
// ATS skor motoru (lib/ats/from-cv.ts) AYNI modeli tüketir. Böylece PDF'te, DOCX'te
// ve skor ekranındaki "ATS'nin gördüğü metin"de içerik, sıra ve tarih biçimi birebir
// aynıdır. Bu dosya saf fonksiyonlardan oluşur; DOM'a ya da React'e bağlı değildir.

import { docText, type DocLang } from './doc-text'
import type { CvData, CvSettings, DateFormat, SectionKey } from './types'

/* ================================== tarihler ================================== */

export type ParsedDate = { year: number; month?: number }

const MONTH_WORDS: Record<string, number> = {}
;[
  ['oca', 'ocak', 'jan', 'january'],
  ['şub', 'şubat', 'sub', 'subat', 'feb', 'february'],
  ['mar', 'mart', 'march'],
  ['nis', 'nisan', 'apr', 'april'],
  ['may', 'mayıs', 'mayis'],
  ['haz', 'haziran', 'jun', 'june'],
  ['tem', 'temmuz', 'jul', 'july'],
  ['ağu', 'ağustos', 'agu', 'agustos', 'aug', 'august'],
  ['eyl', 'eylül', 'eylul', 'sep', 'sept', 'september'],
  ['eki', 'ekim', 'oct', 'october'],
  ['kas', 'kasım', 'kasim', 'nov', 'november'],
  ['ara', 'aralık', 'aralik', 'dec', 'december'],
].forEach((words, i) => words.forEach((w) => (MONTH_WORDS[w] = i + 1)))

/**
 * Serbest girilmiş tarihi çözer: "01/2024", "1.2024", "2024-01", "2024/1",
 * "2024", "Jan 2024", "Ocak 2024", "Oca. 2024". Çözülemezse null.
 */
export function parseDate(raw: string): ParsedDate | null {
  const v = raw.trim().toLocaleLowerCase('tr-TR')
  if (!v) return null
  let m = v.match(/^(\d{1,2})\s*[/.\-]\s*(\d{4})$/)
  if (m) return validDate(Number(m[2]), Number(m[1]))
  m = v.match(/^(\d{4})\s*[/.\-]\s*(\d{1,2})$/)
  if (m) return validDate(Number(m[1]), Number(m[2]))
  m = v.match(/^(\d{4})$/)
  if (m) return validDate(Number(m[1]))
  m = v.match(/^([a-zçğıöşü]+)\.?\s+(\d{4})$/)
  if (m && MONTH_WORDS[m[1]]) return validDate(Number(m[2]), MONTH_WORDS[m[1]])
  return null
}

function validDate(year: number, month?: number): ParsedDate | null {
  if (year < 1950 || year > 2100) return null
  if (month !== undefined && (month < 1 || month > 12)) return null
  return month === undefined ? { year } : { year, month }
}

/** Tek tarihi şablonun biçimine çevirir. Çözülemeyen giriş olduğu gibi (kırpılmış) döner. */
export function formatDate(raw: string, fmt: DateFormat, lang: DocLang): string {
  const d = parseDate(raw)
  if (!d) return raw.trim()
  if (!d.month) return String(d.year)
  if (fmt === 'numeric') return `${String(d.month).padStart(2, '0')}/${d.year}`
  return `${docText(lang).months[d.month - 1]} ${d.year}`
}

/** "01/2022 – 03/2024" · "01/2022 – Present". Ayraç her zaman boşluklu en dash'tir. */
export function formatRange(start: string, end: string, current: boolean, fmt: DateFormat, lang: DocLang): string {
  const from = formatDate(start, fmt, lang)
  const to = current ? docText(lang).present : formatDate(end, fmt, lang)
  if (from && to) return `${from} – ${to}`
  return from || to || ''
}

/* =================================== model =================================== */

export type CvModelEntry = {
  id: string
  /** Pozisyon / derece / proje adı / sertifika / ödül / referans adı. */
  title: string
  /** Şirket / okul / kurum. */
  org: string
  location: string
  /** Biçimlenmiş tarih ya da tarih aralığı. */
  date: string
  /** Ek kısa satır: not ortalaması, proje rolü, referans iletişimi vb. */
  meta: string
  /** Kısa açıklama paragrafı. */
  text: string
  bullets: string[]
  /** Projelerde teknoloji listesi (etiketsiz, virgülle ayrılmış). */
  tech: string[]
  link: string
}

export type CvModelSection = {
  key: SectionKey
  /** Belgede görünen başlık (kullanıcı değiştirdiyse onun metni). */
  heading: string
  /** Seçili CV dilindeki standart başlık. */
  standardHeading: string
  /** Kullanıcı başlığı standart başlıktan farklı mı? */
  customHeading: boolean
  pageBreak: boolean
  kind: 'paragraph' | 'entries' | 'groups' | 'lines'
  paragraph?: string
  entries?: CvModelEntry[]
  /** Yetenekler: "Backend: Spring Boot, Kafka". Tek grupsuz liste ise label ''. */
  groups?: { label: string; items: string[] }[]
  /** Diller, ilgi alanları: düz satırlar. */
  lines?: string[]
}

export type CvContactKind = 'location' | 'phone' | 'email' | 'linkedin' | 'github' | 'website'

export type CvModel = {
  lang: DocLang
  name: string
  title: string
  /** Kullanıcı ad/unvan girmediyse önizlemede yer tutucu gösterilir (PDF/DOCX/ATS metninde değil). */
  namePlaceholder: string
  titlePlaceholder: string
  /** 1. satır: Şehir | Telefon | E-posta */
  contactPrimary: { kind: CvContactKind; text: string; href?: string }[]
  /** 2. satır: LinkedIn | GitHub | Web sitesi */
  contactLinks: { kind: CvContactKind; text: string; href?: string }[]
  /** "Doğum Tarihi: 1994" gibi etiketli kişisel bilgiler (varsa, iletişimin altında tek satır). */
  personal: { label: string; value: string }[]
  /** Görünür ve içeriği olan bölümler, kullanıcının sırasıyla. */
  sections: CvModelSection[]
  separator: string
}

const trim = (s: string | undefined | null) => (s ?? '').trim()

/** Satır başına bir madde; baştaki elle yazılmış madde işaretleri temizlenir. */
export function splitBullets(value: string): string[] {
  return (value ?? '')
    .split('\n')
    .map((x) => x.trim().replace(/^[-–—•*·▪►▶→✓✔➤○●◦]+\s*/, ''))
    .filter(Boolean)
}

export function splitList(value: string): string[] {
  return (value ?? '')
    .split(/[,\n]/)
    .map((x) => x.trim())
    .filter(Boolean)
}

/** Şemasız yazılmış adresleri (ör. "github.com/x") tıklanabilir hale getirir. */
export function toHref(value: string): string | undefined {
  const v = value.trim()
  if (!v) return undefined
  if (/^https?:\/\//i.test(v)) return v
  if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(v)) return `https://${v}`
  return undefined
}

/** Görüntülenen bağlantı metni: "https://www." öneki atılır, sondaki "/" silinir. */
export function displayUrl(value: string): string {
  return value.trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '')
}

export function buildCvModel(data: CvData, settings: CvSettings): CvModel {
  const lang = settings.docLang
  const tx = docText(lang)
  const fmt = settings.dateFormat
  const c = data.contact

  const contactPrimary: CvModel['contactPrimary'] = []
  if (trim(c.location)) contactPrimary.push({ kind: 'location', text: trim(c.location) })
  if (trim(c.phone)) contactPrimary.push({ kind: 'phone', text: trim(c.phone), href: `tel:${c.phone.replace(/[^\d+]/g, '')}` })
  if (trim(c.email)) contactPrimary.push({ kind: 'email', text: trim(c.email), href: `mailto:${trim(c.email)}` })

  const contactLinks: CvModel['contactLinks'] = []
  if (trim(c.linkedin)) contactLinks.push({ kind: 'linkedin', text: displayUrl(c.linkedin), href: toHref(c.linkedin) })
  if (trim(c.github)) contactLinks.push({ kind: 'github', text: displayUrl(c.github), href: toHref(c.github) })
  if (trim(c.website)) contactLinks.push({ kind: 'website', text: displayUrl(c.website), href: toHref(c.website) })

  const p = data.profile
  const personal = (
    [
      [tx.personal.birthDate, p.birthDate],
      [tx.personal.nationality, p.nationality],
      [tx.personal.drivingLicense, p.drivingLicense],
      [tx.personal.military, p.military],
    ] as const
  )
    .filter(([, v]) => trim(v))
    .map(([label, v]) => ({ label, value: trim(v) }))

  const sections: CvModelSection[] = []
  for (const key of settings.order) {
    if (settings.hidden.includes(key)) continue
    const standardHeading = tx.headings[key]
    const custom = trim(settings.labels[key])
    const base = {
      key,
      heading: custom || standardHeading,
      standardHeading,
      customHeading: !!custom && custom.toLocaleLowerCase('tr-TR') !== standardHeading.toLocaleLowerCase('tr-TR'),
      pageBreak: settings.pageBreaks.includes(key),
    }
    const section = buildSection(key, base)
    if (section) sections.push(section)
  }

  function buildSection(key: SectionKey, base: Omit<CvModelSection, 'kind'>): CvModelSection | null {
    const blank: CvModelEntry = { id: '', title: '', org: '', location: '', date: '', meta: '', text: '', bullets: [], tech: [], link: '' }
    switch (key) {
      case 'summary': {
        const text = trim(p.summary)
        return text ? { ...base, kind: 'paragraph', paragraph: text } : null
      }
      case 'experience': {
        const entries = data.experience
          .filter((e) => trim(e.role) || trim(e.company))
          .map((e) => ({
            ...blank,
            id: e.id,
            title: trim(e.role),
            org: trim(e.company),
            location: trim(e.location),
            date: formatRange(e.start, e.end, e.current, fmt, lang),
            text: trim(e.summary),
            bullets: splitBullets(e.bullets),
          }))
        return entries.length ? { ...base, kind: 'entries', entries } : null
      }
      case 'education': {
        const entries = data.education
          .filter((e) => trim(e.degree) || trim(e.school))
          .map((e) => ({
            ...blank,
            id: e.id,
            title: trim(e.degree),
            org: trim(e.school),
            location: trim(e.location),
            date: formatRange(e.start, e.end, false, fmt, lang),
            meta: trim(e.grade) ? `${tx.grade}: ${trim(e.grade)}` : '',
            text: trim(e.summary),
          }))
        return entries.length ? { ...base, kind: 'entries', entries } : null
      }
      case 'projects': {
        const entries = data.projects
          .filter((x) => trim(x.name))
          .map((x) => ({
            ...blank,
            id: x.id,
            title: trim(x.name),
            meta: trim(x.role),
            link: displayUrl(x.link),
            text: trim(x.summary),
            tech: splitList(x.tech),
            bullets: splitBullets(x.highlights ?? ''),
          }))
        return entries.length ? { ...base, kind: 'entries', entries } : null
      }
      case 'certificates': {
        const entries = data.certificates
          .filter((x) => trim(x.name))
          .map((x) => ({ ...blank, id: x.id, title: trim(x.name), org: trim(x.issuer), date: formatDate(x.date, fmt, lang), link: displayUrl(x.link) }))
        return entries.length ? { ...base, kind: 'entries', entries } : null
      }
      case 'awards': {
        const entries = data.awards
          .filter((x) => trim(x.name))
          .map((x) => ({ ...blank, id: x.id, title: trim(x.name), org: trim(x.issuer), date: formatDate(x.date, fmt, lang), text: trim(x.summary) }))
        return entries.length ? { ...base, kind: 'entries', entries } : null
      }
      case 'references': {
        const entries = data.references
          .filter((x) => trim(x.name))
          .map((x) => ({
            ...blank,
            id: x.id,
            title: trim(x.name),
            org: [trim(x.role), trim(x.company)].filter(Boolean).join(', '),
            meta: trim(x.contact),
          }))
        return entries.length ? { ...base, kind: 'entries', entries } : null
      }
      case 'skills': {
        const items = data.skills.filter((s) => trim(s.name))
        if (!items.length) return null
        const labels = Array.from(new Set(items.map((s) => trim(s.group)).filter(Boolean)))
        if (!labels.length) return { ...base, kind: 'groups', groups: [{ label: '', items: items.map((s) => trim(s.name)) }] }
        const groups = labels.map((label) => ({ label, items: items.filter((s) => trim(s.group) === label).map((s) => trim(s.name)) }))
        const rest = items.filter((s) => !trim(s.group)).map((s) => trim(s.name))
        if (rest.length) groups.push({ label: tx.otherSkills, items: rest })
        return { ...base, kind: 'groups', groups }
      }
      case 'languages': {
        const lines = data.languages
          .filter((l) => trim(l.name))
          .map((l) => (trim(l.level) ? `${trim(l.name)}: ${trim(l.level)}` : trim(l.name)))
        return lines.length ? { ...base, kind: 'lines', lines } : null
      }
      case 'interests': {
        const items = splitList(data.interests)
        return items.length ? { ...base, kind: 'lines', lines: [items.join(', ')] } : null
      }
    }
  }

  return {
    lang,
    name: trim(p.fullName),
    title: trim(p.title),
    namePlaceholder: tx.placeholderName,
    titlePlaceholder: tx.placeholderTitle,
    contactPrimary,
    contactLinks,
    personal,
    sections,
    separator: settings.contactSeparator === 'bullet' ? ' • ' : ' | ',
  }
}

/**
 * Modelin düz metin hali — bir ATS parser'ının belgeyi okuyacağı doğal sıra.
 * ATS skor ekranındaki "parser görünümü" ve .txt çıktısı bunu kullanır.
 */
export function modelToPlainText(model: CvModel, settings: Pick<CvSettings, 'entryOrder' | 'bulletStyle'>): string {
  const out: string[] = []
  const bullet = settings.bulletStyle === 'dash' ? '- ' : '• '
  if (model.name) out.push(model.name)
  if (model.title) out.push(model.title)
  if (model.contactPrimary.length) out.push(model.contactPrimary.map((x) => x.text).join(model.separator))
  if (model.contactLinks.length) out.push(model.contactLinks.map((x) => x.text).join(model.separator))
  if (model.personal.length) out.push(model.personal.map((x) => `${x.label}: ${x.value}`).join(model.separator))

  for (const s of model.sections) {
    out.push('', s.heading)
    if (s.kind === 'paragraph' && s.paragraph) out.push(s.paragraph)
    if (s.kind === 'lines') s.lines?.forEach((l) => out.push(l))
    if (s.kind === 'groups') s.groups?.forEach((g) => out.push(g.label ? `${g.label}: ${g.items.join(', ')}` : g.items.join(', ')))
    if (s.kind === 'entries') {
      s.entries?.forEach((e, i) => {
        if (i > 0) out.push('')
        const companyFirst = s.key === 'experience' && settings.entryOrder === 'company-first'
        const head = companyFirst ? [e.org, e.title] : [e.title, e.org]
        head.filter(Boolean).forEach((h) => out.push(h))
        const tail = [e.location, e.date].filter(Boolean).join(' | ')
        if (tail) out.push(tail)
        if (e.meta) out.push(e.meta)
        if (e.link) out.push(e.link)
        if (e.text) out.push(e.text)
        e.bullets.forEach((b) => out.push(bullet + b))
        if (e.tech.length) out.push(`${docText(model.lang).technologies}: ${e.tech.join(', ')}`)
      })
    }
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}
