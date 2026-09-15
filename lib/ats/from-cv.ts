// CV Stüdyosu'nda oluşturulan CV → AtsDocument + StructuredResume + seçili şablon.
// Skor SEÇİLİ şablonun gerçek yerleşimine göre hesaplanır:
//   ats    → metin, PDF/DOCX ile AYNI modelden (buildCvModel + modelToPlainText); sinyaller kesin.
//   design → CvDesignDocument'in DOM okuma sırası taklit edilir; sütun, fotoğraf, gösterge,
//            ikon, font, boyut ve kâğıt rengi şablon + ayarlardan türetilir (dürüst sinyaller).

import type { CvData, CvSettings, SectionKey } from '../cv/types'
import { DESIGN_BASE_PT, FONT_STACKS } from '../cv/types'
import { buildCvModel, formatDate, modelToPlainText, splitBullets, splitList } from '../cv/model'
import { docText } from '../cv/doc-text'
import { cvText } from '../cv/ui-text'
import { getTemplate, type DesignTemplate } from '../cv/templates'
import type { AtsDocument, AtsLine, ResumeSection, ResumeSectionKind, StructuredResume } from './types'
import { recogniseHeading } from './headings'

const KIND: Record<SectionKey, ResumeSectionKind> = {
  summary: 'summary',
  experience: 'experience',
  education: 'education',
  skills: 'skills',
  languages: 'languages',
  projects: 'projects',
  certificates: 'certifications',
  awards: 'awards',
  interests: 'interests',
  references: 'references',
}

const PT_MM = 0.3528
const t = (s: string | undefined | null) => (s ?? '').trim()

export type FromCvTemplate = { id: string; name: string; family: 'ats' | 'design' }

export function fromCv(
  data: CvData,
  settings: CvSettings,
  opts?: { pages?: number },
): { doc: AtsDocument; structured: StructuredResume; template: FromCvTemplate } {
  const tpl = getTemplate(settings.templateId)
  const template: FromCvTemplate = { id: tpl.id, name: tpl.name, family: tpl.family }
  const res = tpl.family === 'design' ? fromDesign(data, settings, tpl, opts) : fromAts(data, settings, opts)
  return { doc: res.doc, structured: res.structured, template }
}

/* ================================ ATS ailesi ================================ */

function fromAts(data: CvData, settings: CvSettings, opts?: { pages?: number }): { doc: AtsDocument; structured: StructuredResume } {
  const model = buildCvModel(data, settings)
  const text = modelToPlainText(model, settings)
  const rows = text.split('\n')
  const lang = settings.docLang
  const fmt = settings.dateFormat

  // başlık satırlarının indeksleri (modelToPlainText: boş satır + başlık)
  const headingIdx: number[] = []
  let si = 0
  for (let i = 0; i < rows.length && si < model.sections.length; i++) {
    if (rows[i] === model.sections[si].heading && (i === 0 || rows[i - 1] === '')) {
      headingIdx.push(i)
      si++
    }
  }

  const bodyFont = FONT_STACKS[settings.fontFamily]?.label ?? 'Arial'
  const headFont = FONT_STACKS[settings.headingFont]?.label ?? bodyFont
  const paperH = settings.paper === 'letter' ? 279.4 : 297
  const paperW = settings.paper === 'letter' ? 215.9 : 210

  // kaba sayfa tahmini: satır sarma + başlık/bölüm boşlukları
  const contentH = paperH - 2 * settings.margin
  const contentW = paperW - 2 * settings.margin
  const bodyLine = settings.bodySize * PT_MM * settings.lineHeight
  const cpl = Math.max(30, Math.floor(contentW / (settings.bodySize * PT_MM * 0.5)))
  let y = 0
  let page = 1
  const lines: AtsLine[] = rows.map((row, i) => {
    const hk = headingIdx.indexOf(i)
    const isHeading = hk >= 0
    const isName = i === 0 && !!model.name
    let h: number
    if (!row) h = rows[i + 1] !== undefined && headingIdx.indexOf(i + 1) >= 0 ? settings.sectionGap : bodyLine * 0.4
    else if (isHeading) {
      if (model.sections[hk].pageBreak && y > 0) {
        page++
        y = 0
      }
      h = settings.headingSize * PT_MM * 1.3 + 2
    } else if (isName) h = settings.nameSize * PT_MM * 1.25
    else h = Math.max(1, Math.ceil(row.length / cpl)) * bodyLine
    if (y + h > contentH && y > 0) {
      page++
      y = 0
    }
    y += h
    const line: AtsLine = { text: row, page, fontName: isHeading ? headFont : bodyFont }
    if (row) {
      line.fontSize = isHeading ? settings.headingSize : isName ? settings.nameSize : settings.bodySize
      if (isHeading || isName) line.bold = true
    }
    return line
  })
  const estimated = lines.length ? lines[lines.length - 1].page : 1

  const fonts = [bodyFont]
  if (fonts.indexOf(headFont) < 0) fonts.push(headFont)

  const doc: AtsDocument = {
    source: 'builder',
    text,
    lines,
    pageCount: opts?.pages ?? estimated,
    layout: {
      textBased: true,
      columns: 1,
      tables: 0,
      textBoxes: 0,
      images: 0,
      graphics: 0,
      icons: 0,
      decorativeBullets: false,
      headerFooterCritical: [],
      fonts,
      bodyFontSizePt: settings.bodySize,
      headingFontSizePt: settings.headingSize,
      nameFontSizePt: settings.nameSize,
      marginsMm: { top: settings.margin, right: settings.margin, bottom: settings.margin, left: settings.margin },
      darkBackground: false,
      pageWidthMm: paperW,
      accentContrast: contrastOnWhite(settings.accent),
    },
  }

  /* ----------------------------- yapılandırılmış ----------------------------- */
  const visible = (k: SectionKey) => model.sections.some((s) => s.key === k)
  const sectionOf = (k: SectionKey) => model.sections.find((s) => s.key === k)

  const sections: ResumeSection[] = model.sections.map((sec, k) => {
    const start = headingIdx[k] ?? -1
    const end = k + 1 < headingIdx.length ? headingIdx[k + 1] : rows.length
    let standard = true
    if (sec.customHeading) {
      const rec = recogniseHeading(sec.heading)
      standard = !!rec && rec.standard && rec.kind === KIND[sec.key]
    }
    return {
      kind: KIND[sec.key],
      heading: sec.heading,
      standard,
      body: start >= 0 ? rows.slice(start + 1, end).join('\n').trim() : '',
      lineRange: start >= 0 ? ([start, end] as [number, number]) : undefined,
    }
  })

  const experience = visible('experience')
    ? data.experience
        .filter((e) => t(e.role) || t(e.company))
        .map((e) => ({
          title: t(e.role),
          company: t(e.company),
          location: t(e.location),
          start: formatDate(e.start || '', fmt, lang),
          end: e.current ? docText(lang).present : formatDate(e.end || '', fmt, lang),
          current: !!e.current,
          bullets: splitBullets(e.bullets || ''),
          description: t(e.summary),
        }))
    : []

  const education = visible('education')
    ? data.education
        .filter((e) => t(e.degree) || t(e.school))
        .map((e) => ({
          degree: t(e.degree),
          school: t(e.school),
          location: t(e.location),
          start: formatDate(e.start || '', fmt, lang),
          end: formatDate(e.end || '', fmt, lang),
        }))
    : []

  const skillSec = sectionOf('skills')
  const skillGroups = (skillSec?.groups ?? []).map((g) => ({ label: g.label, items: g.items.slice() }))
  const skills: string[] = []
  skillGroups.forEach((g) => g.items.forEach((x) => skills.push(x)))

  const projects = (sectionOf('projects')?.entries ?? []).map((e) => ({
    name: e.title,
    description: e.text,
    tech: e.tech.slice(),
    bullets: e.bullets.slice(),
  }))

  const certifications = (sectionOf('certificates')?.entries ?? []).map((e) => [e.title, e.org, e.date].filter(Boolean).join(' | '))
  const languages = (sectionOf('languages')?.lines ?? []).slice()

  const structured: StructuredResume = {
    name: model.name,
    title: model.title,
    contact: {
      email: t(data.contact.email),
      phone: t(data.contact.phone),
      location: t(data.contact.location),
      linkedin: t(data.contact.linkedin),
      github: t(data.contact.github),
      website: t(data.contact.website),
    },
    summary: sectionOf('summary')?.paragraph ?? '',
    sections,
    experience,
    education,
    skills,
    skillGroups,
    projects,
    certifications,
    languages,
    lang,
  }

  return { doc, structured }
}

/* =============================== design ailesi =============================== */

/** CvDesignDocument ile aynı: yan sütuna (ya da iki sütunlu gövdenin dar sütununa) düşen bölümler. */
const SIDE: Partial<Record<SectionKey, true>> = { skills: true, languages: true, certificates: true, interests: true, references: true }
const PAPER_TINTS: Record<string, string | undefined> = { template: undefined, white: '#ffffff', cream: '#fffdf6', gray: '#f6f7f9' }
/** Yan sütun genişliği (cv.css --cv-aside-w). */
const ASIDE_W = 64

type Col = 'head' | 'main' | 'side'
type Row = { text: string; role: 'name' | 'heading' | 'body' | 'blank'; col: Col }

function hasContent(data: CvData, key: SectionKey): boolean {
  switch (key) {
    case 'summary':
      return !!t(data.profile.summary)
    case 'interests':
      return !!t(data.interests)
    case 'experience':
      return data.experience.some((e) => t(e.role) || t(e.company))
    case 'education':
      return data.education.some((e) => t(e.degree) || t(e.school))
    case 'skills':
      return data.skills.some((s) => t(s.name))
    case 'languages':
      return data.languages.some((l) => t(l.name))
    case 'projects':
      return data.projects.some((p) => t(p.name))
    case 'certificates':
      return data.certificates.some((c) => t(c.name))
    case 'awards':
      return data.awards.some((a) => t(a.name))
    case 'references':
      return data.references.some((r) => t(r.name))
  }
}

const joinDot = (parts: string[]) => parts.map(t).filter(Boolean).join(' · ')
const level = (v: number) => Math.max(0, Math.min(5, Math.round(v || 0)))

function dateRange(start: string, end: string, current: boolean, present: string): string {
  const to = current ? present : t(end)
  const from = t(start)
  if (from && to) return `${from} — ${to}`
  return from || to || ''
}

function fromDesign(
  data: CvData,
  settings: CvSettings,
  tpl: DesignTemplate,
  opts?: { pages?: number },
): { doc: AtsDocument; structured: StructuredResume } {
  const lang = settings.docLang
  const ui = cvText(lang)
  const present = ui.present
  const accent = settings.accent || tpl.accent
  const skillStyle = settings.skillStyle || tpl.skill
  const photoShape = settings.photoShape || tpl.photo
  const paperColor = PAPER_TINTS[settings.paperTint] ?? tpl.paper

  const visible = settings.order.filter((k) => settings.hidden.indexOf(k) < 0 && hasContent(data, k))
  const isVisible = (k: SectionKey) => visible.indexOf(k) >= 0
  const hasAside = tpl.shell !== 'plain'
  const isDuo = tpl.body === 'duo'
  const splitSides = hasAside || isDuo
  const sideKeys = splitSides ? visible.filter((k) => SIDE[k]) : []
  const mainKeys = splitSides ? visible.filter((k) => !SIDE[k]) : visible

  // CvDesignDocument ile birebir: kimlik/iletişim tek bir yerde görünür.
  const identityInAside = hasAside && tpl.head === 'none'
  const identityShown = tpl.head !== 'none' || identityInAside
  const contactInHead = tpl.head === 'none' ? false : tpl.head === 'band' || tpl.head === 'split' ? true : !hasAside
  const contactInAside = hasAside && !contactInHead
  const contactShown = contactInHead || contactInAside
  const headHasSideColumn = tpl.head === 'band' || tpl.head === 'split'

  const label = (k: SectionKey) => t(settings.labels[k]) || ui.sections[k]
  const c = data.contact
  const contactItems = [c.email, c.phone, c.location, c.website, c.linkedin, c.github].map(t).filter(Boolean)
  const p = data.profile
  const personalItems = [p.birthDate, p.nationality, p.drivingLicense, p.military].map(t).filter(Boolean)
  const showPhoto = settings.showPhoto && photoShape !== 'none' && !!p.photo

  /* --------------------------- okuma sırasında metin --------------------------- */
  const rows: Row[] = []
  const secs: { kind: ResumeSectionKind; heading: string; start: number; end: number; key?: SectionKey }[] = []
  const push = (text: string, col: Col, role: Row['role'] = 'body') => {
    if (role !== 'blank' && !t(text)) return
    rows.push({ text: role === 'blank' ? '' : text, role, col })
  }
  const identity = (col: Col) => {
    push(t(p.fullName), col, 'name')
    push(t(p.title), col)
  }
  const openSection = (heading: string, col: Col, kind: ResumeSectionKind, key?: SectionKey) => {
    if (rows.length) push('', col, 'blank')
    const start = rows.length
    push(heading, col, 'heading')
    secs.push({ kind, heading, start, end: start + 1, key })
  }
  const closeSection = () => {
    if (secs.length) secs[secs.length - 1].end = rows.length
  }

  const sectionRows = (k: SectionKey, col: Col) => {
    openSection(label(k), col, KIND[k], k)
    switch (k) {
      case 'summary':
        push(t(p.summary), col)
        break
      case 'experience':
        data.experience
          .filter((e) => t(e.role) || t(e.company))
          .forEach((e) => {
            push(t(e.role), col)
            push(dateRange(e.start, e.end, e.current, present), col)
            push(joinDot([e.company, e.location]), col)
            push(t(e.summary), col)
            splitBullets(e.bullets).forEach((b) => push('• ' + b, col))
          })
        break
      case 'education':
        data.education
          .filter((e) => t(e.degree) || t(e.school))
          .forEach((e) => {
            push(t(e.degree), col)
            push(dateRange(e.start, e.end, false, present), col)
            push(joinDot([e.school, e.location, e.grade]), col)
            push(t(e.summary), col)
          })
        break
      case 'projects':
        // Tasarım belgesi proje bağlantısını yalnızca ikonla, katkı maddelerini hiç basmaz.
        data.projects
          .filter((x) => t(x.name))
          .forEach((x) => {
            push(t(x.name), col)
            push(t(x.role), col)
            push(t(x.summary), col)
            push(splitList(x.tech).join(', '), col)
          })
        break
      case 'certificates':
        data.certificates
          .filter((x) => t(x.name))
          .forEach((x) => {
            push(t(x.name), col)
            push(joinDot([x.issuer, x.date]), col)
          })
        break
      case 'awards':
        data.awards
          .filter((x) => t(x.name))
          .forEach((x) => {
            push(t(x.name), col)
            push(joinDot([x.issuer, x.date]), col)
            push(t(x.summary), col)
          })
        break
      case 'references':
        data.references
          .filter((x) => t(x.name))
          .forEach((x) => {
            push(t(x.name), col)
            push(joinDot([x.role, x.company]), col)
            push(t(x.contact), col)
          })
        break
      case 'interests':
        push(splitList(data.interests).join(', '), col)
        break
      case 'skills':
        data.skills.filter((s) => t(s.name)).forEach((s) => push(t(s.name), col))
        break
      case 'languages':
        data.languages.filter((l) => t(l.name)).forEach((l) => push(`${t(l.name)} ${t(l.level)}`.trim(), col))
        break
    }
    closeSection()
  }

  if (tpl.head !== 'none') {
    identity('head')
    if (contactInHead) {
      if (headHasSideColumn) contactItems.forEach((x) => push(x, 'head'))
      else push(contactItems.join(' | '), 'head')
      push(personalItems.join(' | '), 'head')
    }
  }
  const asideRows = () => {
    if (identityInAside) identity('side')
    if (contactInAside && (contactItems.length || personalItems.length)) {
      openSection(ui.f.contact, 'side', 'contact')
      contactItems.concat(personalItems).forEach((x) => push(x, 'side'))
      closeSection()
    }
    sideKeys.forEach((k) => sectionRows(k, 'side'))
  }
  if (tpl.shell === 'aside-left') asideRows()
  mainKeys.forEach((k) => sectionRows(k, 'main'))
  if (!hasAside && isDuo) sideKeys.forEach((k) => sectionRows(k, 'side'))
  if (tpl.shell === 'aside-right') asideRows()

  const text = rows.map((r) => r.text).join('\n')

  /* ------------------------------ tipografi ------------------------------ */
  const bodyPt = DESIGN_BASE_PT * (settings.fontScale || 1)
  const hScale = settings.headingScale || 1
  // cv.css: --cv-h2-fs 0.92em, --cv-name-fs 2.05em (hero 2.9em, yan sütunda 1.5em); şablon CSS'i ayrıca ezebilir.
  const headingPt = bodyPt * 0.92 * hScale
  const nameEm = identityInAside ? 1.5 : tpl.head === 'hero' ? 2.9 : 2.05
  const namePt = bodyPt * nameEm * hScale
  const bodyFont = FONT_STACKS[settings.fontFamily]?.label ?? FONT_STACKS[tpl.font].label
  const headFont = FONT_STACKS[settings.headingFont]?.label ?? bodyFont
  const fonts = [bodyFont]
  if (fonts.indexOf(headFont) < 0) fonts.push(headFont)

  /* ---------------------------- sayfa tahmini ---------------------------- */
  const paperH = settings.paper === 'letter' ? 279.4 : 297
  const paperW = settings.paper === 'letter' ? 215.9 : 210
  // Kenar boşluğu 0 olan yan sütunlu şablonlarda sütunların kendi iç boşluğu vardır.
  const pad = Math.max(settings.margin, 10)
  const contentH = paperH - 2 * pad
  const fullW = paperW - 2 * pad
  const widthOf = (col: Col) => {
    if (col === 'head') return fullW
    if (hasAside) return col === 'side' ? ASIDE_W - 12 : paperW - ASIDE_W - 2 * pad
    if (isDuo) return col === 'side' ? fullW * 0.36 : fullW * 0.6
    return fullW
  }
  const lh = settings.lineHeight || 1.45
  const bodyLine = bodyPt * PT_MM * lh
  const state: Record<Col, { y: number; page: number }> = { head: { y: 0, page: 1 }, main: { y: 0, page: 1 }, side: { y: 0, page: 1 } }
  const lines: AtsLine[] = rows.map((r) => {
    const cpl = Math.max(14, Math.floor(widthOf(r.col) / (bodyPt * PT_MM * 0.5)))
    let h: number
    if (r.role === 'blank') h = settings.sectionGap || 5
    else if (r.role === 'heading') h = headingPt * PT_MM * 1.4 + 2
    else if (r.role === 'name') h = namePt * PT_MM * 1.2
    else h = Math.max(1, Math.ceil(r.text.length / cpl)) * bodyLine
    const st = state[r.col]
    if (r.col === 'head') {
      // üst blok her iki sütunu da aşağı iter
      state.main.y += h
      state.side.y += h
    }
    if (st.y + h > contentH && st.y > 0) {
      st.page++
      st.y = 0
    }
    if (r.col !== 'head') st.y += h
    const line: AtsLine = { text: r.text, page: st.page, fontName: r.role === 'heading' || r.role === 'name' ? headFont : bodyFont }
    if (r.role !== 'blank') {
      line.fontSize = Math.round((r.role === 'heading' ? headingPt : r.role === 'name' ? namePt : bodyPt) * 10) / 10
      if (r.role !== 'body') line.bold = true
    }
    return line
  })
  const estimated = Math.max(state.main.page, state.side.page)

  /* ---------------------------- yerleşim sinyalleri ---------------------------- */
  const columns = hasAside || (isDuo && sideKeys.length > 0) ? 2 : 1
  let graphics = 0
  const meter = skillStyle === 'bar' || skillStyle === 'dots' || skillStyle === 'ring'
  if (meter && isVisible('skills')) graphics += data.skills.filter((s) => t(s.name) && level(s.level) > 0).length
  // Diller: çip/metin şablonlarında seviye metin olarak basılır, diğerlerinde gösterge çizilir.
  if (meter && isVisible('languages')) graphics += data.languages.filter((l) => t(l.name) && level(l.score) > 0).length
  if (tpl.head === 'band' || tpl.head === 'split' || tpl.head === 'hero') graphics += 1
  if (hasAside) graphics += 1

  let icons = 0
  if (settings.showIcons && contactShown) icons += contactItems.length + personalItems.length
  // Proje bağlantısı her zaman ikonla basılır (ayardan bağımsız).
  if (isVisible('projects')) icons += data.projects.filter((x) => t(x.name) && t(x.link)).length

  const doc: AtsDocument = {
    source: 'builder',
    text,
    lines,
    pageCount: opts?.pages ?? estimated,
    layout: {
      textBased: true,
      columns,
      tables: 0,
      textBoxes: 0,
      images: showPhoto ? 1 : 0,
      graphics,
      icons,
      decorativeBullets: settings.bulletStyle === 'square' || settings.bulletStyle === 'arrow' || settings.bulletStyle === 'check',
      headerFooterCritical: [],
      fonts,
      bodyFontSizePt: Math.round(bodyPt * 10) / 10,
      headingFontSizePt: Math.round(headingPt * 10) / 10,
      nameFontSizePt: Math.round(namePt * 10) / 10,
      marginsMm: { top: settings.margin, right: settings.margin, bottom: settings.margin, left: settings.margin },
      darkBackground: luminance(paperColor) < 0.45,
      pageWidthMm: paperW,
      accentContrast: contrastOnWhite(accent),
    },
  }

  /* ----------------------------- yapılandırılmış ----------------------------- */
  const sections: ResumeSection[] = secs.map((sec) => {
    const rec = recogniseHeading(sec.heading)
    return {
      kind: sec.kind,
      heading: sec.heading,
      standard: !!rec && rec.standard && rec.kind === sec.kind,
      body: rows
        .slice(sec.start + 1, sec.end)
        .map((r) => r.text)
        .join('\n')
        .trim(),
      lineRange: [sec.start, sec.end] as [number, number],
    }
  })

  const experience = isVisible('experience')
    ? data.experience
        .filter((e) => t(e.role) || t(e.company))
        .map((e) => ({
          title: t(e.role),
          company: t(e.company),
          location: t(e.location),
          start: t(e.start),
          end: e.current ? present : t(e.end),
          current: !!e.current,
          bullets: splitBullets(e.bullets || ''),
          description: t(e.summary),
        }))
    : []

  const education = isVisible('education')
    ? data.education
        .filter((e) => t(e.degree) || t(e.school))
        .map((e) => ({ degree: t(e.degree), school: t(e.school), location: t(e.location), start: t(e.start), end: t(e.end) }))
    : []

  const skillItems = isVisible('skills') ? data.skills.filter((s) => t(s.name)) : []
  const skills = skillItems.map((s) => t(s.name))
  const groupLabels: string[] = []
  skillItems.forEach((s) => {
    const g = t(s.group)
    if (groupLabels.indexOf(g) < 0) groupLabels.push(g)
  })
  const skillGroups = groupLabels.map((g) => ({ label: g, items: skillItems.filter((s) => t(s.group) === g).map((s) => t(s.name)) }))

  const projects = isVisible('projects')
    ? data.projects
        .filter((x) => t(x.name))
        .map((x) => ({ name: t(x.name), description: t(x.summary), tech: splitList(x.tech), bullets: [] as string[] }))
    : []

  const certifications = isVisible('certificates')
    ? data.certificates.filter((x) => t(x.name)).map((x) => [t(x.name), t(x.issuer), t(x.date)].filter(Boolean).join(' | '))
    : []
  const languages = isVisible('languages') ? data.languages.filter((l) => t(l.name)).map((l) => `${t(l.name)} ${t(l.level)}`.trim()) : []

  const structured: StructuredResume = {
    name: identityShown ? t(p.fullName) : '',
    title: identityShown ? t(p.title) : '',
    contact: {
      email: contactShown ? t(c.email) : '',
      phone: contactShown ? t(c.phone) : '',
      location: contactShown ? t(c.location) : '',
      linkedin: contactShown ? t(c.linkedin) : '',
      github: contactShown ? t(c.github) : '',
      website: contactShown ? t(c.website) : '',
    },
    summary: isVisible('summary') ? t(p.summary) : '',
    sections,
    experience,
    education,
    skills,
    skillGroups,
    projects,
    certifications,
    languages,
    lang,
  }

  return { doc, structured }
}

/* ================================ yardımcılar ================================ */

/** CvDesignDocument ile aynı kaba parlaklık (0–1); tanınmayan renk koyu sayılır. */
function luminance(hex: string): number {
  const v = (hex ?? '').trim().replace('#', '')
  const full = v.length === 3 ? v.split('').map((ch) => ch + ch).join('') : v
  if (!/^[0-9a-f]{6}$/i.test(full)) return 0
  const ch = (i: number) => parseInt(full.slice(i, i + 2), 16) / 255
  return 0.2126 * ch(0) + 0.7152 * ch(2) + 0.0722 * ch(4)
}

/** WCAG kontrast oranı (#rgb / #rrggbb ↔ beyaz). Çözülemeyen renk undefined döner (ölçülemedi). */
function contrastOnWhite(hex: string): number | undefined {
  const v = (hex ?? '').trim().replace('#', '')
  const full = v.length === 3 ? v.split('').map((ch) => ch + ch).join('') : v
  if (!/^[0-9a-f]{6}$/i.test(full)) return undefined
  const lin = (i: number) => {
    const ch = parseInt(full.slice(i, i + 2), 16) / 255
    return ch <= 0.03928 ? ch / 12.92 : Math.pow((ch + 0.055) / 1.055, 2.4)
  }
  const L = 0.2126 * lin(0) + 0.7152 * lin(2) + 0.0722 * lin(4)
  return Math.round((1.05 / (L + 0.05)) * 100) / 100
}
