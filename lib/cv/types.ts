// CV Oluşturucu — veri modeli.
// Araç tamamen tarayıcıda çalışır: backend, hesap veya ücretli servis yoktur.
// Veriler localStorage'da tutulur, çıktı tarayıcının kendi PDF motoruyla üretilir.

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
  /** Küçültülmüş data URL (localStorage'a sığması için canvas ile 480px'e indirilir). */
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
  /** 1–5 arası ustalık; "text" stilinde gösterilmez. */
  level: number
  group: string
}

export type LanguageItem = {
  id: string
  name: string
  /** Serbest metin (ör. "C1 · İleri") — CEFR zorunlu değildir. */
  level: string
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

export type FontKey = 'sans' | 'serif' | 'mono' | 'display'
/** Yetenek/dil göstergesi biçimi. Boş dize → şablonun kendi seçimi. */
export type SkillStyleOverride = '' | 'bar' | 'dots' | 'chips' | 'text' | 'ring'
/** Fotoğraf çerçevesi. Boş dize → şablonun kendi seçimi. */
export type PhotoShapeOverride = '' | 'circle' | 'square' | 'rounded'
export type BulletStyle = 'dot' | 'square' | 'dash' | 'arrow' | 'check'
/** Kâğıt tonu ve metin tonu ön ayarları; 'template' şablonun kendi değerini korur. */
export type PaperTint = 'template' | 'white' | 'cream' | 'gray'
export type InkTone = 'template' | 'slate' | 'black' | 'navy' | 'warm'

/** Kullanıcının 3. adımda ince ayar yaptığı görsel tercihler. */
export type CvSettings = {
  templateId: string
  /** Şablonun kendi vurgu rengini ezer; boşsa şablon varsayılanı kullanılır. */
  accent: string
  /** Yan sütun / bant zemini; boşsa şablonun kendi tonu kullanılır. */
  rail: string
  paperTint: PaperTint
  inkTone: InkTone

  fontFamily: FontKey
  /** Başlık ailesi; gövdeden farklı olabilir. */
  headingFont: FontKey
  fontScale: number
  /** Başlıkların gövdeye göre büyüklüğü (0.8–1.3). */
  headingScale: number
  lineHeight: number
  /** Gövde harf aralığı (em). */
  letterSpacing: number

  /** Sayfa iç boşluğu (mm). */
  margin: number
  /** Bölümler arası boşluk (mm). */
  sectionGap: number
  paper: 'a4' | 'letter'
  /** Özet metni iki yana yaslansın mı? */
  justify: boolean

  skillStyle: SkillStyleOverride
  bulletStyle: BulletStyle

  showPhoto: boolean
  photoShape: PhotoShapeOverride
  /** Fotoğraf genişliği (mm). */
  photoSize: number

  /** Bölüm sırası; listede olmayan bölümler gizli sayılır. */
  order: SectionKey[]
  hidden: SectionKey[]
  /** Bu bölümler PDF'te yeni bir sayfanın başında başlar. */
  pageBreaks: SectionKey[]
  showIcons: boolean
  /** Bölüm başlıkları için kullanıcı tarafından değiştirilebilir etiketler. */
  labels: Partial<Record<SectionKey, string>>
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

/** Çakışmayan kısa kimlik — liste öğelerinin React anahtarı ve sürükle-bırak hedefi. */
export function uid(prefix = 'i'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-3)}`
}
