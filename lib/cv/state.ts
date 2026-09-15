// Başlangıç durumu, örnek veri, localStorage kalıcılığı ve küçük yardımcılar.
// Sunucu tarafında localStorage yoktur; tüm okuma/yazmalar try/catch ile sarılıdır.
//
// Sürüm geçmişi — anahtar ('cv-studio:v1') bilerek aynı bırakıldı, eski kayıtlar
// normalize() ile yerinde v3'e taşınır:
//   v1 → yalnızca görsel şablonlar (design ayarları).
//   v2 → tüm şablonların ATS olduğu ara sürüm (ATS ayarları).
//   v3 → iki aile (design + ats), tek birleşik CvSettings.

import type { DocLang } from './doc-text'
import {
  DEFAULT_TEMPLATE_ID,
  RECOMMENDED_ATS_TEMPLATE_ID,
  TEMPLATES,
  getTemplate,
  isAtsTemplate,
  type AtsTemplate,
  type CvTemplate,
} from './templates'
import {
  ATS_FONT_KEYS,
  ATS_LIMITS,
  DESIGN_FONT_KEYS,
  DESIGN_LIMITS,
  SECTION_KEYS,
  clampTo,
  uid,
  type BulletStyle,
  type ContactSeparator,
  type CvData,
  type CvSettings,
  type CvState,
  type DateFormat,
  type DatePosition,
  type EntryOrder,
  type FontKey,
  type HeaderAlign,
  type HeadingStyle,
  type InkTone,
  type PaperTint,
  type PhotoShapeOverride,
  type SectionKey,
  type SkillStyleOverride,
} from './types'

export const STORAGE_KEY = 'cv-studio:v1'
const VERSION = 3

/** ATS'lerin en sık beklediği bölüm sırası — yeni CV'lerin varsayılanı. */
export const DEFAULT_SECTION_ORDER: SectionKey[] = [
  'summary',
  'experience',
  'education',
  'skills',
  'projects',
  'certificates',
  'languages',
  'awards',
  'interests',
  'references',
]

export function emptyCv(): CvData {
  return {
    profile: { fullName: '', title: '', photo: '', summary: '', birthDate: '', nationality: '', drivingLicense: '', military: '' },
    contact: { email: '', phone: '', location: '', website: '', linkedin: '', github: '' },
    experience: [],
    education: [],
    skills: [],
    languages: [],
    projects: [],
    certificates: [],
    awards: [],
    references: [],
    interests: '',
  }
}

/* ============================== şablon ön ayarı ============================== */

/** Önerilen ATS şablonu — design şablonu seçiliyken ATS alanlarının varsayılanları buradan gelir. */
function recommendedAts(): AtsTemplate {
  const ats = TEMPLATES.filter(isAtsTemplate)
  return ats.find((t) => t.id === RECOMMENDED_ATS_TEMPLATE_ID) ?? ats[0]
}

/**
 * Şablonun ön ayarlarını ayarlara kopyalar (her iki aile için). Nesne her zaman eksiksizdir:
 * seçili ailenin alanları şablondan, diğer ailenin alanları varsayılanlardan gelir.
 * Kâğıt boyutu, bölüm sırası/gizliliği, sayfa sonları, özel başlıklar, CV dili ve
 * fotoğraf/ikon tercihleri kullanıcıya aittir; `prev` verilirse korunur.
 */
export function settingsForTemplate(templateId: string, prev?: CvSettings, docLang?: DocLang): CvSettings {
  const tpl = getTemplate(templateId)
  const common = {
    templateId: tpl.id,
    docLang: prev?.docLang ?? docLang ?? 'tr',
    paper: prev?.paper ?? 'a4',
    order: prev?.order ? prev.order.slice() : DEFAULT_SECTION_ORDER.slice(),
    hidden: prev?.hidden ? prev.hidden.slice() : [],
    pageBreaks: prev?.pageBreaks ? prev.pageBreaks.slice() : [],
    labels: prev?.labels ? { ...prev.labels } : {},
  }
  // Renk/ton ezmeleri şablona aittir: şablon değişince şablonun kendi paleti gelir.
  const designDefaults = {
    rail: '',
    paperTint: 'template' as PaperTint,
    inkTone: 'template' as InkTone,
    headingScale: 1,
    letterSpacing: 0,
    justify: true,
    skillStyle: '' as SkillStyleOverride,
    photoShape: prev?.photoShape ?? '',
    photoSize: prev?.photoSize ?? 25,
    showIcons: prev?.showIcons ?? true,
  }

  if (isAtsTemplate(tpl)) {
    return {
      ...common,
      ...designDefaults,
      accent: tpl.accent,
      fontFamily: tpl.font,
      headingFont: tpl.headingFont,
      lineHeight: tpl.lineHeight,
      margin: tpl.margin,
      sectionGap: tpl.sectionGap,
      bulletStyle: tpl.bulletStyle,
      fontScale: 1,
      // ATS şablonu fotoğraf basmaz; tercih yalnızca design şablonuna dönüldüğünde anlamlıdır.
      // ATS renderer fotoğrafı hiç basmaz; bu alan yalnızca sonradan görsel şablona
      // geçildiğinde okunur. Varsayılan `false` olsaydı ATS'de başlayan kullanıcı görsel
      // şablona geçince fotoğrafını hiç göremezdi (bilinçli bir tercih olmadığı halde).
      showPhoto: prev?.showPhoto ?? true,
      ...atsFields(tpl),
    }
  }

  return {
    ...common,
    ...designDefaults,
    accent: tpl.accent,
    fontFamily: tpl.font,
    headingFont: tpl.font,
    fontScale: tpl.fontScale,
    lineHeight: tpl.lineHeight,
    margin: tpl.margin,
    sectionGap: 5.5,
    bulletStyle: 'dot',
    // Fotoğrafın gösterilip gösterilmeyeceği kullanıcı tercihidir; şablon yalnızca
    // varsayılan çerçeveyi belirler.
    showPhoto: prev?.showPhoto ?? tpl.photo !== 'none',
    ...atsFields(recommendedAts()),
  }
}

/** Yalnızca ATS ailesinin okuduğu alanlar. */
function atsFields(t: AtsTemplate) {
  return {
    bodySize: t.bodySize,
    headingSize: t.headingSize,
    nameSize: t.nameSize,
    headingStyle: t.headingStyle,
    headerAlign: t.headerAlign,
    contactSeparator: t.contactSeparator,
    dateFormat: t.dateFormat,
    datePosition: t.datePosition,
    entryOrder: t.entryOrder,
  }
}

export function initialState(templateId = DEFAULT_TEMPLATE_ID, docLang: DocLang = 'tr'): CvState {
  return { version: VERSION, data: emptyCv(), settings: settingsForTemplate(templateId, undefined, docLang), updatedAt: Date.now() }
}

/* ================================ normalize ================================ */

type Obj = Record<string, unknown>

const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v)
const str = (v: unknown): string => (typeof v === 'string' ? v : typeof v === 'number' && Number.isFinite(v) ? String(v) : '')
const id = (v: unknown, prefix: string): string => (typeof v === 'string' && v.trim() ? v : uid(prefix))
const items = (v: unknown): Obj[] => (Array.isArray(v) ? v.filter(isObj) : [])
const oneOf = <T extends string>(v: unknown, allowed: readonly T[]): T | undefined =>
  typeof v === 'string' && (allowed as readonly string[]).indexOf(v) >= 0 ? (v as T) : undefined
/** Gösterge değeri (yetenek seviyesi / dil puanı): 0–5. */
const meter = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? Math.min(5, Math.max(0, v)) : 0)

const ALL_FONT_KEYS: FontKey[] = (DESIGN_FONT_KEYS as FontKey[]).concat(ATS_FONT_KEYS)
const HEADING_STYLES: HeadingStyle[] = ['rule', 'caps-rule', 'caps', 'overline', 'underline', 'smallcaps', 'plain']
const HEADER_ALIGNS: HeaderAlign[] = ['left', 'center']
const CONTACT_SEPARATORS: ContactSeparator[] = ['pipe', 'bullet']
const DATE_FORMATS: DateFormat[] = ['numeric', 'short']
const DATE_POSITIONS: DatePosition[] = ['right', 'inline']
const ENTRY_ORDERS: EntryOrder[] = ['title-first', 'company-first']
const ATS_BULLETS: BulletStyle[] = ['dot', 'dash']
const DESIGN_BULLETS: BulletStyle[] = ['dot', 'square', 'dash', 'arrow', 'check']
const PAPER_TINTS: PaperTint[] = ['template', 'white', 'cream', 'gray']
const INK_TONES: InkTone[] = ['template', 'slate', 'black', 'navy', 'warm']
const SKILL_STYLES: SkillStyleOverride[] = ['', 'bar', 'dots', 'chips', 'text', 'ring']
const PHOTO_SHAPES: PhotoShapeOverride[] = ['', 'circle', 'square', 'rounded']

/** #rgb / #rrggbb → #rrggbb (küçük harf); geçersizse undefined. */
function hexColor(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined
  const s = v.trim().toLowerCase()
  if (/^#[0-9a-f]{6}$/.test(s)) return s
  if (/^#[0-9a-f]{3}$/.test(s)) return `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`
  return undefined
}

/** Beyaz zemine karşı WCAG kontrast oranı. */
function contrastOnWhite(hex: string): number {
  const ch = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  const l = 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]
  return 1.05 / (l + 0.05)
}

/** Bilinen bölüm anahtarlarını süzer, tekrarları atar. */
function sectionList(v: unknown): SectionKey[] {
  if (!Array.isArray(v)) return []
  const out: SectionKey[] = []
  v.forEach((k) => {
    if (typeof k === 'string' && (SECTION_KEYS as string[]).indexOf(k) >= 0 && out.indexOf(k as SectionKey) < 0) out.push(k as SectionKey)
  })
  return out
}

function normalizeData(d: Obj): CvData {
  const p = isObj(d.profile) ? d.profile : {}
  const c = isObj(d.contact) ? d.contact : {}
  return {
    profile: {
      fullName: str(p.fullName),
      title: str(p.title),
      // Design şablonları fotoğraf basar; ATS şablonları yok sayar.
      photo: str(p.photo),
      summary: str(p.summary),
      birthDate: str(p.birthDate),
      nationality: str(p.nationality),
      drivingLicense: str(p.drivingLicense),
      military: str(p.military),
    },
    contact: {
      email: str(c.email),
      phone: str(c.phone),
      location: str(c.location),
      website: str(c.website),
      linkedin: str(c.linkedin),
      github: str(c.github),
    },
    experience: items(d.experience).map((x) => ({
      id: id(x.id, 'e'),
      role: str(x.role),
      company: str(x.company),
      location: str(x.location),
      start: str(x.start),
      end: str(x.end),
      current: x.current === true,
      summary: str(x.summary),
      bullets: str(x.bullets),
    })),
    education: items(d.education).map((x) => ({
      id: id(x.id, 'ed'),
      degree: str(x.degree),
      school: str(x.school),
      location: str(x.location),
      start: str(x.start),
      end: str(x.end),
      grade: str(x.grade),
      summary: str(x.summary),
    })),
    skills: items(d.skills).map((x) => ({ id: id(x.id, 's'), name: str(x.name), level: meter(x.level), group: str(x.group) })),
    languages: items(d.languages).map((x) => ({ id: id(x.id, 'l'), name: str(x.name), level: str(x.level), score: meter(x.score) })),
    projects: items(d.projects).map((x) => ({
      id: id(x.id, 'p'),
      name: str(x.name),
      role: str(x.role),
      link: str(x.link),
      summary: str(x.summary),
      tech: str(x.tech),
      highlights: str(x.highlights),
    })),
    certificates: items(d.certificates).map((x) => ({
      id: id(x.id, 'c'),
      name: str(x.name),
      issuer: str(x.issuer),
      date: str(x.date),
      link: str(x.link),
    })),
    awards: items(d.awards).map((x) => ({
      id: id(x.id, 'a'),
      name: str(x.name),
      issuer: str(x.issuer),
      date: str(x.date),
      summary: str(x.summary),
    })),
    references: items(d.references).map((x) => ({
      id: id(x.id, 'r'),
      name: str(x.name),
      role: str(x.role),
      company: str(x.company),
      contact: str(x.contact),
    })),
    interests: str(d.interests),
  }
}

type NumKey = keyof typeof ATS_LIMITS | keyof typeof DESIGN_LIMITS

/** Geçerli sayısal alanı sınırlara kırparak yazar; geçersizse şablon değeri kalır. */
function setClamped(out: CvSettings, s: Obj, key: NumKey, limit: { min: number; max: number }): void {
  const v = s[key]
  if (typeof v === 'number' && Number.isFinite(v)) out[key] = clampTo(v, limit)
}

/** Design ailesinin alanlarını (ve ortak renk/font/boşluk alanlarını) DESIGN_LIMITS ile doğrulayıp yazar. */
function overlayDesign(out: CvSettings, s: Obj): void {
  const accent = hexColor(s.accent)
  if (accent) out.accent = accent
  if (s.rail === '') out.rail = ''
  else out.rail = hexColor(s.rail) ?? out.rail
  out.paperTint = oneOf(s.paperTint, PAPER_TINTS) ?? out.paperTint
  out.inkTone = oneOf(s.inkTone, INK_TONES) ?? out.inkTone
  out.fontFamily = oneOf(s.fontFamily, ALL_FONT_KEYS) ?? out.fontFamily
  out.headingFont = oneOf(s.headingFont, ALL_FONT_KEYS) ?? out.headingFont
  setClamped(out, s, 'fontScale', DESIGN_LIMITS.fontScale)
  setClamped(out, s, 'headingScale', DESIGN_LIMITS.headingScale)
  setClamped(out, s, 'lineHeight', DESIGN_LIMITS.lineHeight)
  setClamped(out, s, 'letterSpacing', DESIGN_LIMITS.letterSpacing)
  setClamped(out, s, 'margin', DESIGN_LIMITS.margin)
  setClamped(out, s, 'sectionGap', DESIGN_LIMITS.sectionGap)
  if (typeof s.justify === 'boolean') out.justify = s.justify
  out.skillStyle = oneOf(s.skillStyle, SKILL_STYLES) ?? out.skillStyle
  out.bulletStyle = oneOf(s.bulletStyle, DESIGN_BULLETS) ?? out.bulletStyle
}

/** Fotoğraf/ikon tercihleri — aileden bağımsız kullanıcı tercihidir. */
function overlayPhotoPrefs(out: CvSettings, s: Obj): void {
  if (typeof s.showPhoto === 'boolean') out.showPhoto = s.showPhoto
  out.photoShape = oneOf(s.photoShape, PHOTO_SHAPES) ?? out.photoShape
  setClamped(out, s, 'photoSize', DESIGN_LIMITS.photoSize)
  if (typeof s.showIcons === 'boolean') out.showIcons = s.showIcons
}

/** Yalnızca ATS ailesinin okuduğu alanlar — her zaman ATS_LIMITS ile. */
function overlayAtsOnly(out: CvSettings, s: Obj): void {
  setClamped(out, s, 'bodySize', ATS_LIMITS.bodySize)
  setClamped(out, s, 'headingSize', ATS_LIMITS.headingSize)
  setClamped(out, s, 'nameSize', ATS_LIMITS.nameSize)
  out.headingStyle = oneOf(s.headingStyle, HEADING_STYLES) ?? out.headingStyle
  out.headerAlign = oneOf(s.headerAlign, HEADER_ALIGNS) ?? out.headerAlign
  out.contactSeparator = oneOf(s.contactSeparator, CONTACT_SEPARATORS) ?? out.contactSeparator
  out.dateFormat = oneOf(s.dateFormat, DATE_FORMATS) ?? out.dateFormat
  out.datePosition = oneOf(s.datePosition, DATE_POSITIONS) ?? out.datePosition
  out.entryOrder = oneOf(s.entryOrder, ENTRY_ORDERS) ?? out.entryOrder
}

/** ATS şablonu seçiliyken ortak alanlar: ATS fontları, ≥ 4.5:1 vurgu, ATS_LIMITS, dot/dash. */
function overlayAtsCommon(out: CvSettings, s: Obj): void {
  const accent = hexColor(s.accent)
  // Yalnızca beyaz zeminde okunaklı (≥ 4.5:1) koyu tonlar kabul edilir.
  if (accent && contrastOnWhite(accent) >= 4.5) out.accent = accent
  out.fontFamily = oneOf<FontKey>(s.fontFamily, ATS_FONT_KEYS) ?? out.fontFamily
  out.headingFont = oneOf<FontKey>(s.headingFont, ATS_FONT_KEYS) ?? out.headingFont
  setClamped(out, s, 'lineHeight', ATS_LIMITS.lineHeight)
  setClamped(out, s, 'margin', ATS_LIMITS.margin)
  setClamped(out, s, 'sectionGap', ATS_LIMITS.sectionGap)
  out.bulletStyle = oneOf(s.bulletStyle, ATS_BULLETS) ?? out.bulletStyle
}

function normalizeSettings(s: Obj, version: number): CvSettings {
  const saved: CvTemplate | undefined =
    typeof s.templateId === 'string' ? TEMPLATES.find((t) => t.id === s.templateId) : undefined
  const docLang: DocLang = s.docLang === 'en' ? 'en' : 'tr'
  const out = settingsForTemplate(saved ? saved.id : DEFAULT_TEMPLATE_ID, undefined, docLang)

  // Kullanıcı tercihleri — tüm sürümlerde aynı anlamdadır, taşınır.
  const paper = oneOf(s.paper, ['a4', 'letter'] as const)
  if (paper) out.paper = paper
  const order = sectionList(s.order)
  if (order.length) {
    // Sonradan eklenen bölümler listenin sonuna eklenir; bilinmeyenler atılır.
    out.order = order.concat(DEFAULT_SECTION_ORDER.filter((k) => order.indexOf(k) < 0))
  }
  out.hidden = sectionList(s.hidden)
  out.pageBreaks = sectionList(s.pageBreaks)
  if (isObj(s.labels)) {
    const labels = s.labels
    SECTION_KEYS.forEach((k) => {
      if (typeof labels[k] === 'string') out.labels[k] = labels[k] as string
    })
  }
  overlayPhotoPrefs(out, s)

  // Bilinmeyen şablon → varsayılan şablonun ön ayarı; aileye özgü eski değerler taşınmaz.
  if (!saved) return out

  if (version <= 1) {
    // v1 kayıtları özgün görsel şablonlara aittir; bu şablonlar yine design ailesindedir.
    if (!isAtsTemplate(saved)) overlayDesign(out, s)
    return out
  }

  if (version === 2) {
    // v2'de her şablon ATS'ydi; o dönemin tasarım değerleri görsel şablona ait değildir.
    if (isAtsTemplate(saved)) {
      overlayAtsCommon(out, s)
      overlayAtsOnly(out, s)
    }
    return out
  }

  // v3: birleşik ayarlar — her alan kendi ailesinin sınırlarıyla doğrulanır.
  if (isAtsTemplate(saved)) {
    overlayAtsCommon(out, s)
    // Design'a özgü alanlar ATS'de basılmaz ama design şablonuna dönüşte korunur.
    const designOnly: Obj = {
      rail: s.rail,
      paperTint: s.paperTint,
      inkTone: s.inkTone,
      fontScale: s.fontScale,
      headingScale: s.headingScale,
      letterSpacing: s.letterSpacing,
      justify: s.justify,
      skillStyle: s.skillStyle,
    }
    overlayDesign(out, designOnly)
  } else {
    overlayDesign(out, s)
  }
  overlayAtsOnly(out, s)
  return out
}

/**
 * Kaydedilmiş durumu ya da JSON yedeğini (v1, v2 veya v3) güvenle v3'e çevirir.
 * Eksik/bozuk alanlar varsayılanlarla tamamlanır; `data` yoksa null döner.
 */
export function normalize(raw: unknown): CvState | null {
  if (!isObj(raw) || !isObj(raw.data)) return null
  const version = typeof raw.version === 'number' && Number.isFinite(raw.version) ? raw.version : 1
  return {
    version: VERSION,
    data: normalizeData(raw.data),
    settings: normalizeSettings(isObj(raw.settings) ? raw.settings : {}, version),
    updatedAt: typeof raw.updatedAt === 'number' && Number.isFinite(raw.updatedAt) ? raw.updatedAt : Date.now(),
  }
}

export function loadState(): CvState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? normalize(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

export function saveState(state: CvState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, updatedAt: Date.now() }))
  } catch {
    // Kota dolabilir (büyük fotoğraf): sessizce geç, uygulama bellekte çalışmaya devam eder.
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {}
}

/** Bir bölümün gerçekten içeriği var mı? Boş bölümler CV'ye basılmaz. */
export function sectionHasContent(data: CvData, key: SectionKey): boolean {
  switch (key) {
    case 'summary':
      return data.profile.summary.trim().length > 0
    case 'interests':
      return data.interests.trim().length > 0
    case 'experience':
      return data.experience.some((e) => e.role.trim() || e.company.trim())
    case 'education':
      return data.education.some((e) => e.degree.trim() || e.school.trim())
    case 'skills':
      return data.skills.some((s) => s.name.trim())
    case 'languages':
      return data.languages.some((l) => l.name.trim())
    case 'projects':
      return data.projects.some((p) => p.name.trim())
    case 'certificates':
      return data.certificates.some((c) => c.name.trim())
    case 'awards':
      return data.awards.some((a) => a.name.trim())
    case 'references':
      return data.references.some((r) => r.name.trim())
  }
}

/** Özet en az iki cümle mi (ya da iki cümleye yetecek uzunlukta mı)? */
function summaryIsSubstantial(summary: string): boolean {
  const s = summary.trim()
  const sentences = s.split(/[.!?]+(?:\s|$)/).filter((x) => x.trim().length > 10).length
  return sentences >= 2 || s.length >= 160
}

/**
 * ATS açısından temel öğelerin ne kadarının doldurulduğu (0–100) — üst çubuktaki
 * ilerleme rozetinde kullanılır. Ayrıntılı ATS skoru lib/ats motorundadır.
 */
export function completeness(data: CvData): number {
  const checks: boolean[] = [
    data.profile.fullName.trim().length > 0,
    data.profile.title.trim().length > 0,
    summaryIsSubstantial(data.profile.summary),
    data.contact.email.trim().length > 0,
    data.contact.phone.trim().length > 0,
    data.contact.location.trim().length > 0,
    sectionHasContent(data, 'experience'),
    sectionHasContent(data, 'education'),
    data.skills.filter((s) => s.name.trim()).length >= 3,
    sectionHasContent(data, 'languages') || sectionHasContent(data, 'projects'),
  ]
  return Math.round((checks.filter(Boolean).length / checks.length) * 100)
}

/* ================================ örnek veri ================================ */

/**
 * Örnek veri — "Örnek veriyle doldur" ve galeri önizlemeleri için. ATS standartlarının
 * örneğidir: birinci tekil yok özet, ters kronolojik deneyim, MM/YYYY tarihler,
 * Eylem + Teknoloji + Ne yapıldı + Sonuç maddeleri, kategorili yetenekler
 * (her teknoloji bir deneyim/proje maddesinde de geçer), ilk kullanımda açılan kısaltmalar.
 * Seviye/puan değerleri design şablonlarının göstergeleri içindir (ATS basmaz).
 */
export function sampleCv(lang: DocLang): CvData {
  return lang === 'en' ? sampleEn() : sampleTr()
}

type SkillSeed = [group: string, skills: [name: string, level: number][]]

function skillsFrom(seed: SkillSeed[]): CvData['skills'] {
  const out: CvData['skills'] = []
  seed.forEach(([group, skills]) => skills.forEach(([name, level]) => out.push({ id: uid('s'), name, level, group })))
  return out
}

function sampleTr(): CvData {
  return {
    profile: {
      fullName: 'Elif Yıldırım',
      title: 'Kıdemli Full Stack Yazılım Geliştirici',
      photo: '',
      summary:
        'Kamu ve bankacılık sektörleri için yüksek trafikli web platformları geliştirmede 7+ yıl deneyime sahip Kıdemli Full Stack Yazılım Geliştirici. Java, Spring Boot, React, PostgreSQL ve Apache Kafka ile mikroservis mimarisi, Sürekli Entegrasyon/Sürekli Dağıtım (CI/CD) ve bulut dağıtımlarında uçtan uca sorumluluk üstlenir. Ulusal ölçekli tapu kadastro platformunun mikroservislere geçişine liderlik ederek dağıtım süresini 45 dakikadan 8 dakikaya indirdi.',
      birthDate: '',
      nationality: '',
      drivingLicense: '',
      military: '',
    },
    contact: {
      email: 'elif.yildirim@ornek.com',
      phone: '+90 532 000 00 00',
      location: 'Ankara, Türkiye',
      website: 'elifyildirim.dev',
      linkedin: 'linkedin.com/in/elifyildirim',
      github: 'github.com/elifyildirim',
    },
    experience: [
      {
        id: uid('e'), role: 'Kıdemli Full Stack Yazılım Geliştirici', company: 'Nova Teknoloji', location: 'Ankara, Türkiye',
        start: '03/2022', end: '', current: true, summary: '',
        bullets: [
          'Monolitik tapu kadastro platformunu Kubernetes üzerinde çalışan 14 Spring Boot mikroservisine ayırdı; ortalama dağıtım süresini 45 dakikadan 8 dakikaya düşürdü.',
          'Apache Kafka ile olay güdümlü bir entegrasyon katmanı tasarladı; 81 il müdürlüğü arasındaki gece toplu işlerini neredeyse gerçek zamanlı kayıt senkronizasyonuyla değiştirdi.',
          'Parsel arama REST API servislerine Redis önbellek katmanı ekledi ve PostgreSQL sorgularını optimize etti; 95. yüzdelik (p95) yanıt süresini %60 azalttı.',
          'GitLab CI, Docker ve Terraform ile Amazon Web Services (AWS) üzerinde CI/CD hattı kurdu; otomatik geri alma destekli günlük canlı yayına geçişi sağladı.',
          'JUnit 5 ve Testcontainers ile entegrasyon testi standartlarını belirleyip 4 geliştiriciye mentorluk yaptı; test kapsamını %45’ten %80’e çıkardı.',
        ].join('\n'),
      },
      {
        id: uid('e'), role: 'Full Stack Yazılım Geliştirici', company: 'Datalink Yazılım', location: 'İstanbul, Türkiye',
        start: '06/2020', end: '02/2022', current: false, summary: '',
        bullets: [
          'Ödeme mutabakat motorunu Java, Spring Batch ve PostgreSQL ile yeniden yazdı; günde 4 milyon bankacılık işlemini manuel müdahale olmadan işler hale getirdi.',
          'React, TypeScript ve Next.js ile operasyon ekipleri için raporlama paneli geliştirdi; rapor hazırlama süresini saatlerden dakikalara indirdi.',
          'Ödeme bildirimleri için RabbitMQ tabanlı yeniden deneme ve dead-letter kuyrukları kurdu; başarısız mesaj oranını %0,1’in altına çekti.',
          'Jest ve JUnit 5 ile birim ve uçtan uca testler yazdı; otomatik test kapsamını %28’den %76’ya yükseltti.',
        ].join('\n'),
      },
      {
        id: uid('e'), role: 'Yazılım Geliştirici', company: 'Kübit Bilişim', location: 'Ankara, Türkiye',
        start: '09/2018', end: '05/2020', current: false, summary: '',
        bullets: [
          'Java EE tabanlı 3 kurum içi uygulamayı Spring Boot’a taşıdı; sunucu açılış süresini %70 kısalttı.',
          '1.200 çalışanın kullandığı insan kaynakları portalı için REST API uç noktaları ve SQL rapor sorguları geliştirdi.',
          'Eski servisleri Docker ile konteynerleştirip ekibin ilk GitLab CI derleme hattını kurdu; sürüm hazırlığını 2 günden yarım güne indirdi.',
        ].join('\n'),
      },
    ],
    education: [
      {
        id: uid('ed'), degree: 'Bilgisayar Mühendisliği, Lisans', school: 'Hacettepe Üniversitesi', location: 'Ankara, Türkiye',
        start: '09/2014', end: '06/2018', grade: '3.41 / 4.00', summary: '',
      },
    ],
    skills: skillsFrom([
      ['Programlama Dilleri', [['Java', 5], ['TypeScript', 4], ['SQL', 4]]],
      ['Backend', [['Spring Boot', 5], ['Spring Batch', 4], ['REST API', 5], ['Mikroservis', 5]]],
      ['Frontend', [['React', 4], ['Next.js', 4]]],
      ['Veritabanları', [['PostgreSQL', 4], ['Redis', 4]]],
      ['Mesajlaşma', [['Apache Kafka', 4], ['RabbitMQ', 3]]],
      ['DevOps', [['Docker', 4], ['Kubernetes', 4], ['GitLab CI', 4], ['Terraform', 3]]],
      ['Bulut', [['AWS', 3]]],
      ['Test', [['JUnit 5', 4], ['Testcontainers', 3], ['Jest', 3]]],
    ]),
    languages: [
      { id: uid('l'), name: 'Türkçe', level: 'Ana dil', score: 5 },
      { id: uid('l'), name: 'İngilizce', level: 'C1 (İleri)', score: 4 },
      { id: uid('l'), name: 'Almanca', level: 'A2 (Temel)', score: 2 },
    ],
    projects: [
      {
        id: uid('p'), name: 'OpenLedger', role: 'Kurucu ve Proje Sorumlusu', link: 'github.com/elifyildirim/openledger',
        summary: 'Küçük işletmeler için açık kaynak ön muhasebe servisi.',
        tech: 'Spring Boot, PostgreSQL, React, Docker',
        highlights: 'Spring Boot ve PostgreSQL üzerinde çok kiracılı bir backend ile React arayüzü geliştirdi; proje 300’den fazla işletme tarafından kullanıldı ve GitHub’da 1.400 yıldız aldı.',
      },
      {
        id: uid('p'), name: 'Kadastro Harita Görüntüleyici', role: 'Teknik Lider', link: '',
        summary: 'Parsel verilerini etkileşimli harita üzerinde gösteren kurum içi araç.',
        tech: 'Next.js, TypeScript, Apache Kafka, Redis',
        highlights: [
          'Apache Kafka’dan gelen parsel güncellemelerini Redis önbelleğiyle Next.js harita arayüzüne aktardı; saha ekipleri haftalık dışa aktarımlar yerine canlı veriyle çalışmaya başladı.',
          'Uygulamayı Terraform ile AWS üzerinde kodla altyapı olarak yayına aldı; yeni ortam kurulumunu 1 günden 30 dakikaya indirdi.',
        ].join('\n'),
      },
    ],
    certificates: [
      { id: uid('c'), name: 'Oracle Certified Professional: Java SE 17 Developer', issuer: 'Oracle', date: '05/2023', link: '' },
      { id: uid('c'), name: 'Certified Kubernetes Application Developer (CKAD)', issuer: 'Cloud Native Computing Foundation (CNCF)', date: '11/2022', link: '' },
    ],
    awards: [
      { id: uid('a'), name: 'Yılın Mühendisi', issuer: 'Nova Teknoloji', date: '12/2023', summary: 'Tapu kadastro platformunun modernizasyonuna liderlik ettiği için.' },
    ],
    references: [],
    interests: '',
  }
}

function sampleEn(): CvData {
  return {
    profile: {
      fullName: 'Elif Yıldırım',
      title: 'Senior Full Stack Developer',
      photo: '',
      summary:
        'Senior Full Stack Developer with 7+ years of experience building high-traffic web platforms for public sector and banking clients. Specialises in Java, Spring Boot, React, PostgreSQL and Apache Kafka, with end-to-end ownership of microservice architecture, Continuous Integration/Continuous Deployment (CI/CD) and cloud deployments. Led the migration of a nationwide land registry platform to microservices, cutting deployment time from 45 to 8 minutes.',
      birthDate: '',
      nationality: '',
      drivingLicense: '',
      military: '',
    },
    contact: {
      email: 'elif.yildirim@example.com',
      phone: '+90 532 000 00 00',
      location: 'Ankara, Türkiye',
      website: 'elifyildirim.dev',
      linkedin: 'linkedin.com/in/elifyildirim',
      github: 'github.com/elifyildirim',
    },
    experience: [
      {
        id: uid('e'), role: 'Senior Full Stack Developer', company: 'Nova Technology', location: 'Ankara, Türkiye',
        start: '03/2022', end: '', current: true, summary: '',
        bullets: [
          'Decomposed a monolithic land registry platform into 14 Spring Boot microservices on Kubernetes, reducing average deployment time from 45 to 8 minutes.',
          'Designed an event-driven integration layer with Apache Kafka, replacing nightly batch jobs across 81 provincial offices with near real-time record synchronisation.',
          'Added a Redis caching layer and optimised PostgreSQL queries behind the parcel search REST APIs, lowering 95th percentile (p95) response time by 60%.',
          'Built a CI/CD pipeline with GitLab CI, Docker and Terraform on Amazon Web Services (AWS), enabling daily production releases with automated rollback.',
          'Mentored 4 developers and introduced integration testing standards with JUnit 5 and Testcontainers, raising test coverage from 45% to 80%.',
        ].join('\n'),
      },
      {
        id: uid('e'), role: 'Full Stack Developer', company: 'Datalink Software', location: 'Istanbul, Türkiye',
        start: '06/2020', end: '02/2022', current: false, summary: '',
        bullets: [
          'Rebuilt the payment reconciliation engine with Java, Spring Batch and PostgreSQL, processing 4 million banking transactions per day without manual intervention.',
          'Developed a reporting dashboard for operations teams with React, TypeScript and Next.js, shortening report preparation from hours to minutes.',
          'Implemented RabbitMQ retry and dead-letter queues for payment notifications, keeping the failed message rate below 0.1%.',
          'Wrote unit and end-to-end tests with Jest and JUnit 5, increasing automated test coverage from 28% to 76%.',
        ].join('\n'),
      },
      {
        id: uid('e'), role: 'Software Developer', company: 'Kubit IT', location: 'Ankara, Türkiye',
        start: '09/2018', end: '05/2020', current: false, summary: '',
        bullets: [
          'Migrated 3 internal Java EE applications to Spring Boot, cutting server startup time by 70%.',
          'Developed REST APIs and SQL reporting queries for a human resources portal used by 1,200 employees.',
          'Containerised legacy services with Docker and set up the team’s first GitLab CI build pipeline, reducing release preparation from 2 days to half a day.',
        ].join('\n'),
      },
    ],
    education: [
      {
        id: uid('ed'), degree: 'Bachelor of Science in Computer Engineering', school: 'Hacettepe University', location: 'Ankara, Türkiye',
        start: '09/2014', end: '06/2018', grade: '3.41 / 4.00', summary: '',
      },
    ],
    skills: skillsFrom([
      ['Languages', [['Java', 5], ['TypeScript', 4], ['SQL', 4]]],
      ['Backend', [['Spring Boot', 5], ['Spring Batch', 4], ['REST APIs', 5], ['Microservices', 5]]],
      ['Frontend', [['React', 4], ['Next.js', 4]]],
      ['Databases', [['PostgreSQL', 4], ['Redis', 4]]],
      ['Messaging', [['Apache Kafka', 4], ['RabbitMQ', 3]]],
      ['DevOps', [['Docker', 4], ['Kubernetes', 4], ['GitLab CI', 4], ['Terraform', 3]]],
      ['Cloud', [['AWS', 3]]],
      ['Testing', [['JUnit 5', 4], ['Testcontainers', 3], ['Jest', 3]]],
    ]),
    languages: [
      { id: uid('l'), name: 'Turkish', level: 'Native', score: 5 },
      { id: uid('l'), name: 'English', level: 'C1 (Advanced)', score: 4 },
      { id: uid('l'), name: 'German', level: 'A2 (Elementary)', score: 2 },
    ],
    projects: [
      {
        id: uid('p'), name: 'OpenLedger', role: 'Creator and Maintainer', link: 'github.com/elifyildirim/openledger',
        summary: 'Open-source bookkeeping service for small businesses.',
        tech: 'Spring Boot, PostgreSQL, React, Docker',
        highlights: 'Built a multi-tenant Spring Boot and PostgreSQL backend with a React interface, adopted by 300+ small businesses and starred 1,400 times on GitHub.',
      },
      {
        id: uid('p'), name: 'Cadastre Map Viewer', role: 'Technical Lead', link: '',
        summary: 'Internal tool that displays parcel data on an interactive map.',
        tech: 'Next.js, TypeScript, Apache Kafka, Redis',
        highlights: [
          'Streamed parcel updates from Apache Kafka through a Redis cache into a Next.js map interface, giving field teams live data instead of weekly exports.',
          'Provisioned the application on AWS as infrastructure as code with Terraform, reducing new environment setup from 1 day to 30 minutes.',
        ].join('\n'),
      },
    ],
    certificates: [
      { id: uid('c'), name: 'Oracle Certified Professional: Java SE 17 Developer', issuer: 'Oracle', date: '05/2023', link: '' },
      { id: uid('c'), name: 'Certified Kubernetes Application Developer (CKAD)', issuer: 'Cloud Native Computing Foundation (CNCF)', date: '11/2022', link: '' },
    ],
    awards: [
      { id: uid('a'), name: 'Engineer of the Year', issuer: 'Nova Technology', date: '12/2023', summary: 'Recognised for leading the land registry platform modernisation.' },
    ],
    references: [],
    interests: '',
  }
}
