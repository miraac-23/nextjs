// CV Oluşturucu — veri modeli.
// Araç tamamen tarayıcıda çalışır: backend, hesap veya ücretli servis yoktur.
// Veriler localStorage'da tutulur, çıktı tarayıcının kendi PDF motoruyla üretilir.
//
// İKİ ŞABLON AİLESİ vardır (bkz. lib/cv/templates.ts):
//   design → görsel şablonlar (yan sütun, bant, fotoğraf, yetenek göstergeleri…).
//            Elazığ, Malatya, Kastamonu (özgün 40) + Bayburt, Erzurum, Artvin (yeni 32).
//   ats    → Applicant Tracking System uyumlu şablonlar (tek kolon, standart font ve
//            başlıklar, görsel/ikon/tablo yok). Ankara ilçeleri (25).
// Ayarlar tek bir `CvSettings` nesnesinde tutulur; her aile kendi alanlarını okur.
// ATS skoru SEÇİLİ şablonun gerçek yerleşimine göre hesaplanır (lib/ats/from-cv.ts).

import type { DocLang } from './doc-text'

/** Bir CV bölümünün kimliği. Sıralama ve görünürlük bu anahtarlar üzerinden yönetilir. */
export type SectionKey =
  | 'summary'
  | 'experience'
  | 'education'
  | 'skills'
  | 'languages'
  | 'projects'
  | 'certificates'
  | 'awards'
  | 'interests'
  | 'references'

export type Contact = {
  email: string
  phone: string
  location: string
  website: string
  linkedin: string
  github: string
}

export type Profile = {
  fullName: string
  title: string
  /** Küçültülmüş data URL (localStorage'a sığması için canvas ile 480px'e indirilir). Yalnızca design ailesi basar. */
  photo: string
  summary: string
  birthDate: string
  nationality: string
  drivingLicense: string
  military: string
}

export type ExperienceItem = {
  id: string
  role: string
  company: string
  location: string
  /** Serbest giriş (ör. "01/2024", "2024-01", "Oca 2024"). ATS ailesi şablonun tarih biçimine çevirir. */
  start: string
  end: string
  current: boolean
  summary: string
  /** Satır başına bir madde; boş satırlar render sırasında atılır. */
  bullets: string
}

export type EducationItem = {
  id: string
  degree: string
  school: string
  location: string
  start: string
  end: string
  grade: string
  summary: string
}

export type SkillItem = {
  id: string
  name: string
  /** 1–5 arası ustalık. Yalnızca design ailesinin göstergelerinde (bar/nokta/halka) kullanılır; ATS ailesi basmaz. */
  level: number
  /** Kategori (ör. "Backend"). ATS ailesi "Backend: Spring Boot, Kafka" satırı olarak basar. */
  group: string
}

export type LanguageItem = {
  id: string
  name: string
  /** Serbest metin (ör. "C1 (İleri)"). */
  level: string
  /** 1–5 arası gösterge değeri — yalnızca design ailesi. */
  score: number
}

export type ProjectItem = {
  id: string
  name: string
  role: string
  link: string
  summary: string
  /** Virgülle ayrılmış teknoloji listesi. */
  tech: string
  /** Temel katkı / sonuç — satır başına bir madde. Eski yedeklerde yoktur (normalize '' verir). */
  highlights: string
}

export type CertificateItem = {
  id: string
  name: string
  issuer: string
  date: string
  link: string
}

export type AwardItem = {
  id: string
  name: string
  issuer: string
  date: string
  summary: string
}

export type ReferenceItem = {
  id: string
  name: string
  role: string
  company: string
  contact: string
}

export type CvData = {
  profile: Profile
  contact: Contact
  experience: ExperienceItem[]
  education: EducationItem[]
  skills: SkillItem[]
  languages: LanguageItem[]
  projects: ProjectItem[]
  certificates: CertificateItem[]
  awards: AwardItem[]
  references: ReferenceItem[]
  /** Serbest metin: satır başına bir ilgi alanı ya da virgülle ayrılmış liste. */
  interests: string
}

/* ================================ yazı tipleri ================================ */

/** Design ailesinin site fontları (next/font ile yüklenir): Inter, Source Serif 4, JetBrains Mono, Space Grotesk. */
export type DesignFontKey = 'sans' | 'serif' | 'mono' | 'display'
/** ATS'lerin sorunsuz okuduğu yaygın fontlar. ATS ailesi yalnızca bunları kullanır; design ailesi de seçebilir. */
export type AtsFontKey = 'arial' | 'calibri' | 'helvetica' | 'georgia' | 'cambria' | 'times'
export type FontKey = DesignFontKey | AtsFontKey

export const DESIGN_FONT_KEYS: DesignFontKey[] = ['sans', 'serif', 'mono', 'display']
export const ATS_FONT_KEYS: AtsFontKey[] = ['arial', 'calibri', 'helvetica', 'georgia', 'cambria', 'times']
/** @deprecated ATS_FONT_KEYS ile aynı — geriye uyumluluk. */
export const FONT_KEYS: AtsFontKey[] = ATS_FONT_KEYS

export function isAtsFont(key: string): key is AtsFontKey {
  return (ATS_FONT_KEYS as string[]).indexOf(key) >= 0
}

/**
 * Font yığınları. `label` ATS skorunda raporlanan aile adıdır. ATS fontlarında ilk aile
 * listedeki fonttur, ardından metrik uyumlu açık kaynak eşdeğerleri (Carlito ≈ Calibri,
 * Caladea ≈ Cambria) gelir. `docx` → Word çıktısında yazılacak font adı. `ats` → ATS
 * standart font listesinde mi?
 */
export const FONT_STACKS: Record<FontKey, { label: string; css: string; docx: string; serif: boolean; ats: boolean }> = {
  sans: { label: 'Inter', css: 'var(--font-sans), system-ui, sans-serif', docx: 'Arial', serif: false, ats: false },
  serif: { label: 'Source Serif 4', css: "var(--font-serif), Georgia, 'Times New Roman', serif", docx: 'Georgia', serif: true, ats: false },
  mono: { label: 'JetBrains Mono', css: 'var(--font-mono), ui-monospace, SFMono-Regular, Menlo, monospace', docx: 'Consolas', serif: false, ats: false },
  display: { label: 'Space Grotesk', css: 'var(--font-display), var(--font-sans), system-ui, sans-serif', docx: 'Arial', serif: false, ats: false },
  arial: { label: 'Arial', css: 'Arial, "Liberation Sans", Helvetica, sans-serif', docx: 'Arial', serif: false, ats: true },
  calibri: { label: 'Calibri', css: 'Calibri, Carlito, Arial, Helvetica, sans-serif', docx: 'Calibri', serif: false, ats: true },
  helvetica: { label: 'Helvetica', css: 'Helvetica, "Helvetica Neue", Arial, sans-serif', docx: 'Helvetica', serif: false, ats: true },
  georgia: { label: 'Georgia', css: 'Georgia, "Times New Roman", Times, serif', docx: 'Georgia', serif: true, ats: true },
  cambria: { label: 'Cambria', css: 'Cambria, Caladea, Georgia, "Times New Roman", serif', docx: 'Cambria', serif: true, ats: true },
  times: { label: 'Times New Roman', css: '"Times New Roman", Times, "Liberation Serif", serif', docx: 'Times New Roman', serif: true, ats: true },
}

/* ============================ design ailesi ayarları ============================ */

/** Yetenek/dil göstergesi biçimi. Boş dize → şablonun kendi seçimi. */
export type SkillStyleOverride = '' | 'bar' | 'dots' | 'chips' | 'text' | 'ring'
/** Fotoğraf çerçevesi. Boş dize → şablonun kendi seçimi. */
export type PhotoShapeOverride = '' | 'circle' | 'square' | 'rounded'
/** Kâğıt tonu ve metin tonu ön ayarları; 'template' şablonun kendi değerini korur. */
export type PaperTint = 'template' | 'white' | 'cream' | 'gray'
export type InkTone = 'template' | 'slate' | 'black' | 'navy' | 'warm'

/* ============================== ATS ailesi ayarları ============================== */

/**
 * Bölüm başlığı biçimi — hepsi düz metin + en fazla ince bir CSS çizgisidir.
 *   rule | caps-rule | caps | overline | underline | smallcaps | plain
 */
export type HeadingStyle = 'rule' | 'caps-rule' | 'caps' | 'overline' | 'underline' | 'smallcaps' | 'plain'
export type HeaderAlign = 'left' | 'center'
/** İletişim satırındaki ayraç: " | " ya da " • ". */
export type ContactSeparator = 'pipe' | 'bullet'
/** numeric → 01/2024 · short → Jan 2024 / Oca 2024. */
export type DateFormat = 'numeric' | 'short'
/** right → tarih başlıkla aynı satırda sağa yaslı · inline → tarih şirket/konum satırında. */
export type DatePosition = 'right' | 'inline'
export type EntryOrder = 'title-first' | 'company-first'

/** Madde işareti. ATS ailesi yalnızca 'dot' ve 'dash' kullanır (diğerleri 'dot' basılır). */
export type BulletStyle = 'dot' | 'square' | 'dash' | 'arrow' | 'check'

/** Kullanıcının 3. adımda ince ayar yaptığı tercihler (her iki aile için tek nesne). */
export type CvSettings = {
  templateId: string
  /** CV'nin dili — bölüm başlıkları, "Present/Günümüz" ve ay adları buna göre basılır. */
  docLang: DocLang

  /* ---------------- ortak ---------------- */
  accent: string
  fontFamily: FontKey
  headingFont: FontKey
  lineHeight: number
  /** Sayfa iç boşluğu (mm). Design: 0–24 · ATS: 18–25.4 (ATS_LIMITS). */
  margin: number
  /** Bölümler arası boşluk (mm). */
  sectionGap: number
  paper: 'a4' | 'letter'
  bulletStyle: BulletStyle
  /** Bölüm sırası; listede olmayan bölümler gizli sayılır. */
  order: SectionKey[]
  hidden: SectionKey[]
  /** Bu bölümler PDF'te yeni bir sayfanın başında başlar. */
  pageBreaks: SectionKey[]
  /** Kullanıcı tarafından değiştirilen başlıklar. Standart dışı başlık ATS skorunda uyarı üretir. */
  labels: Partial<Record<SectionKey, string>>

  /* ---------------- design ailesi ---------------- */
  /** Yan sütun / bant zemini; boşsa şablonun kendi tonu kullanılır. */
  rail: string
  paperTint: PaperTint
  inkTone: InkTone
  fontScale: number
  /** Başlıkların gövdeye göre büyüklüğü (0.8–1.3). */
  headingScale: number
  /** Gövde harf aralığı (em). */
  letterSpacing: number
  justify: boolean
  skillStyle: SkillStyleOverride
  showPhoto: boolean
  photoShape: PhotoShapeOverride
  /** Fotoğraf genişliği (mm). */
  photoSize: number
  showIcons: boolean

  /* ---------------- ATS ailesi ---------------- */
  /** Gövde metni (pt) — 10–12. */
  bodySize: number
  /** Bölüm başlıkları (pt) — 13–16. */
  headingSize: number
  /** Ad Soyad (pt) — 18–24. */
  nameSize: number
  headingStyle: HeadingStyle
  headerAlign: HeaderAlign
  contactSeparator: ContactSeparator
  dateFormat: DateFormat
  datePosition: DatePosition
  entryOrder: EntryOrder
}

/** localStorage'da saklanan tam durum. */
export type CvState = {
  version: number
  data: CvData
  settings: CvSettings
  updatedAt: number
}

export const SECTION_KEYS: SectionKey[] = [
  'summary',
  'experience',
  'education',
  'skills',
  'languages',
  'projects',
  'certificates',
  'awards',
  'interests',
  'references',
]

/** ATS standartlarının izin verdiği aralıklar — ATS ailesinin kaydırıcıları ve normalize bu sınırları kullanır. */
export const ATS_LIMITS = {
  bodySize: { min: 10, max: 12, step: 0.5 },
  headingSize: { min: 13, max: 16, step: 0.5 },
  nameSize: { min: 18, max: 24, step: 1 },
  lineHeight: { min: 1.15, max: 1.5, step: 0.01 },
  margin: { min: 18, max: 25.4, step: 0.2 },
  sectionGap: { min: 3, max: 8, step: 0.5 },
} as const

/** Design ailesinin kaydırıcı aralıkları (özgün editörle aynı). */
export const DESIGN_LIMITS = {
  fontScale: { min: 0.85, max: 1.15, step: 0.01 },
  headingScale: { min: 0.8, max: 1.3, step: 0.01 },
  lineHeight: { min: 1.25, max: 1.7, step: 0.01 },
  letterSpacing: { min: -0.02, max: 0.06, step: 0.005 },
  margin: { min: 0, max: 24, step: 1 },
  sectionGap: { min: 3, max: 11, step: 0.5 },
  photoSize: { min: 16, max: 38, step: 1 },
} as const

/** Design ailesinde gövde yazısının punto tabanı (CvDesignDocument: `--cv-fs = BASE_PT × fontScale`). */
export const DESIGN_BASE_PT = 10.2

export function clampTo(value: number, limit: { min: number; max: number }): number {
  if (!Number.isFinite(value)) return limit.min
  return Math.min(limit.max, Math.max(limit.min, value))
}

/** Çakışmayan kısa kimlik — liste öğelerinin React anahtarı ve sürükle-bırak hedefi. */
export function uid(prefix = 'i'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-3)}`
}
