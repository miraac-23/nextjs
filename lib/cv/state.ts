// Başlangıç durumu, örnek veri, localStorage kalıcılığı ve küçük yardımcılar.
// Sunucu tarafında localStorage yoktur; tüm okuma/yazmalar try/catch ile sarılıdır.

import type { Lang } from '@/lib/i18n/config'
import { getTemplate, DEFAULT_TEMPLATE_ID } from './templates'
import { SECTION_KEYS, uid, type CvData, type CvSettings, type CvState, type SectionKey } from './types'

export const STORAGE_KEY = 'cv-studio:v1'
const VERSION = 1

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

/** Şablonun tipografi/boşluk ön ayarlarını kullanıcı ayarlarına kopyalar. */
export function settingsForTemplate(templateId: string, prev?: CvSettings): CvSettings {
  const tpl = getTemplate(templateId)
  return {
    templateId: tpl.id,
    accent: tpl.accent,
    // Renk/ton ezmeleri şablona aittir: şablon değişince şablonun kendi paleti gelir.
    rail: '',
    paperTint: 'template',
    inkTone: 'template',

    fontFamily: tpl.font,
    headingFont: tpl.font,
    fontScale: tpl.fontScale,
    headingScale: 1,
    lineHeight: tpl.lineHeight,
    letterSpacing: 0,

    margin: tpl.margin,
    sectionGap: 5.5,
    paper: prev?.paper ?? 'a4',
    justify: true,

    skillStyle: '',
    bulletStyle: 'dot',

    // Fotoğrafın gösterilip gösterilmeyeceği kullanıcı tercihidir; şablon yalnızca
    // varsayılan çerçeveyi belirler.
    showPhoto: prev?.showPhoto ?? tpl.photo !== 'none',
    photoShape: prev?.photoShape ?? '',
    photoSize: prev?.photoSize ?? 25,

    // Bölüm sırası ve gizlilik kullanıcıya aittir; şablon değişince korunur.
    order: prev?.order ?? [...SECTION_KEYS],
    hidden: prev?.hidden ?? [],
    pageBreaks: prev?.pageBreaks ?? [],
    showIcons: prev?.showIcons ?? true,
    labels: prev?.labels ?? {},
  }
}

export function initialState(templateId = DEFAULT_TEMPLATE_ID): CvState {
  return { version: VERSION, data: emptyCv(), settings: settingsForTemplate(templateId), updatedAt: Date.now() }
}

/** Eksik alanları varsayılanlarla tamamlar — eski yedekler ve elle düzenlenmiş JSON için. */
export function normalize(raw: unknown): CvState | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Partial<CvState>
  if (!obj.data || typeof obj.data !== 'object') return null
  const base = initialState()
  const d = obj.data as Partial<CvData>
  const list = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : [])
  const data: CvData = {
    profile: { ...base.data.profile, ...(d.profile ?? {}) },
    contact: { ...base.data.contact, ...(d.contact ?? {}) },
    experience: list(d.experience),
    education: list(d.education),
    skills: list(d.skills),
    languages: list(d.languages),
    projects: list(d.projects),
    certificates: list(d.certificates),
    awards: list(d.awards),
    references: list(d.references),
    interests: typeof d.interests === 'string' ? d.interests : '',
  }
  const s = (obj.settings ?? {}) as Partial<CvSettings>
  const known = new Set<string>(SECTION_KEYS)
  const order = Array.isArray(s.order) ? (s.order.filter((k) => known.has(k)) as SectionKey[]) : []
  const settings: CvSettings = {
    ...settingsForTemplate(typeof s.templateId === 'string' ? s.templateId : DEFAULT_TEMPLATE_ID),
    ...s,
    // Sonradan eklenen bölümler listenin sonuna eklenir; bilinmeyenler atılır.
    order: [...order, ...SECTION_KEYS.filter((k) => !order.includes(k))],
    hidden: Array.isArray(s.hidden) ? (s.hidden.filter((k) => known.has(k)) as SectionKey[]) : [],
    pageBreaks: Array.isArray(s.pageBreaks) ? (s.pageBreaks.filter((k) => known.has(k)) as SectionKey[]) : [],
    labels: s.labels && typeof s.labels === 'object' ? s.labels : {},
  }
  return { version: VERSION, data, settings, updatedAt: typeof obj.updatedAt === 'number' ? obj.updatedAt : Date.now() }
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

/** Formun ne kadarının doldurulduğu (0–100) — üst çubuktaki ilerleme rozetinde kullanılır. */
export function completeness(data: CvData): number {
  const checks: boolean[] = [
    data.profile.fullName.trim().length > 0,
    data.profile.title.trim().length > 0,
    data.profile.summary.trim().length > 20,
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

/** Örnek veri — "Örnek veriyle doldur" ve galeri önizlemeleri için. */
export function sampleCv(lang: Lang): CvData {
  return lang === 'en' ? sampleEn() : sampleTr()
}

function sampleTr(): CvData {
  return {
    profile: {
      fullName: 'Elif Yıldırım',
      title: 'Kıdemli Fullstack Yazılım Mühendisi',
      photo: '',
      summary:
        'Ölçeklenebilir mikroservis mimarileri ve kullanıcı odaklı arayüzler geliştiren, 7 yıllık deneyime sahip yazılım mühendisi. Java/Spring Boot tarafında yüksek trafikli servisler, React/Next.js tarafında erişilebilir ve hızlı arayüzler kuruyorum. Ekip içi kod kalitesi kültürünü sahiplenir, mentorluk yaparım.',
      birthDate: '1994',
      nationality: 'T.C.',
      drivingLicense: 'B sınıfı',
      military: 'Muaf',
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
        id: uid('e'), role: 'Kıdemli Yazılım Mühendisi', company: 'Nova Teknoloji', location: 'Ankara',
        start: '2022', end: '', current: true,
        summary: 'Ulusal ölçekte çalışan tapu ve kadastro entegrasyon platformunun backend ekibinde teknik liderlik.',
        bullets: 'Monolitik yapıyı 12 mikroservise ayırarak dağıtım süresini 45 dakikadan 6 dakikaya indirdim.\nRedis tabanlı önbellek katmanıyla p95 yanıt süresini %62 düşürdüm.\n4 kişilik ekibe mentorluk yaptım; kod inceleme sürecini standartlaştırdım.',
      },
      {
        id: uid('e'), role: 'Yazılım Mühendisi', company: 'Datalink Yazılım', location: 'İstanbul',
        start: '2019', end: '2022', current: false,
        summary: 'Bankacılık müşterileri için ödeme mutabakat servisleri ve raporlama arayüzleri.',
        bullets: 'Günlük 4 milyon işlemi işleyen mutabakat motorunu Spring Batch ile yeniden yazdım.\nReact tabanlı yönetim panelini sıfırdan kurdum; ilk anlamlı boyama süresi 1.2 sn.\nOtomatik test kapsamını %28’den %76’ya çıkardım.',
      },
      {
        id: uid('e'), role: 'Junior Geliştirici', company: 'Kübit Bilişim', location: 'Ankara',
        start: '2017', end: '2019', current: false,
        summary: 'Kurumsal müşteriler için iç kullanım uygulamaları.',
        bullets: 'Java EE tabanlı 3 iç uygulamanın bakımı ve modernizasyonu.\nJenkins ile ilk CI hattını kurdum.',
      },
    ],
    education: [
      { id: uid('ed'), degree: 'Bilgisayar Mühendisliği (Yüksek Lisans)', school: 'Orta Doğu Teknik Üniversitesi', location: 'Ankara', start: '2017', end: '2019', grade: '3.62 / 4.00', summary: 'Tez: Dağıtık sistemlerde tutarlılık modellerinin karşılaştırmalı analizi.' },
      { id: uid('ed'), degree: 'Bilgisayar Mühendisliği (Lisans)', school: 'Hacettepe Üniversitesi', location: 'Ankara', start: '2013', end: '2017', grade: '3.41 / 4.00', summary: '' },
    ],
    skills: [
      { id: uid('s'), name: 'Java 21', level: 5, group: 'Backend' },
      { id: uid('s'), name: 'Spring Boot', level: 5, group: 'Backend' },
      { id: uid('s'), name: 'PostgreSQL', level: 4, group: 'Backend' },
      { id: uid('s'), name: 'Kafka', level: 4, group: 'Backend' },
      { id: uid('s'), name: 'React / Next.js', level: 4, group: 'Frontend' },
      { id: uid('s'), name: 'TypeScript', level: 4, group: 'Frontend' },
      { id: uid('s'), name: 'Docker & Kubernetes', level: 4, group: 'DevOps' },
      { id: uid('s'), name: 'CI/CD (GitLab)', level: 4, group: 'DevOps' },
    ],
    languages: [
      { id: uid('l'), name: 'Türkçe', level: 'Ana dil', score: 5 },
      { id: uid('l'), name: 'İngilizce', level: 'C1 · İleri', score: 4 },
      { id: uid('l'), name: 'Almanca', level: 'A2 · Temel', score: 2 },
    ],
    projects: [
      { id: uid('p'), name: 'OpenLedger', role: 'Kurucu geliştirici', link: 'github.com/elifyildirim/openledger', summary: 'Küçük işletmeler için açık kaynak ön muhasebe servisi; 1.4k yıldız.', tech: 'Spring Boot, PostgreSQL, React' },
      { id: uid('p'), name: 'Kadastro Görselleştirici', role: 'Teknik lider', link: '', summary: 'Parsel verilerini harita üzerinde canlı gösteren iç araç.', tech: 'Next.js, MapLibre, Redis' },
    ],
    certificates: [
      { id: uid('c'), name: 'Oracle Certified Professional: Java SE 17', issuer: 'Oracle', date: '2023', link: '' },
      { id: uid('c'), name: 'Certified Kubernetes Application Developer', issuer: 'CNCF', date: '2022', link: '' },
    ],
    awards: [
      { id: uid('a'), name: 'Yılın Mühendisi', issuer: 'Nova Teknoloji', date: '2023', summary: 'Platform modernizasyonu çalışması nedeniyle.' },
    ],
    references: [
      { id: uid('r'), name: 'Mehmet Arslan', role: 'Yazılım Direktörü', company: 'Nova Teknoloji', contact: 'Talep üzerine paylaşılır' },
    ],
    interests: 'Satranç, Uzun mesafe koşu, Analog fotoğrafçılık, Açık kaynak',
  }
}

function sampleEn(): CvData {
  return {
    profile: {
      fullName: 'Elif Yıldırım',
      title: 'Senior Fullstack Software Engineer',
      photo: '',
      summary:
        'Software engineer with 7 years of experience building scalable microservice architectures and user-focused interfaces. High-traffic services on the Java/Spring Boot side, fast and accessible UIs on the React/Next.js side. I own code-quality culture within the team and mentor other engineers.',
      birthDate: '1994',
      nationality: 'Turkish',
      drivingLicense: 'Class B',
      military: 'Exempt',
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
        id: uid('e'), role: 'Senior Software Engineer', company: 'Nova Technology', location: 'Ankara',
        start: '2022', end: '', current: true,
        summary: 'Technical lead on the backend team of a nationwide land-registry integration platform.',
        bullets: 'Split the monolith into 12 microservices, cutting deployment time from 45 minutes to 6.\nDropped p95 response time by 62% with a Redis-backed cache layer.\nMentored a team of four and standardised the code-review process.',
      },
      {
        id: uid('e'), role: 'Software Engineer', company: 'Datalink Software', location: 'Istanbul',
        start: '2019', end: '2022', current: false,
        summary: 'Payment reconciliation services and reporting interfaces for banking clients.',
        bullets: 'Rewrote the reconciliation engine on Spring Batch; it now handles 4M transactions a day.\nBuilt the React admin panel from scratch — 1.2s first contentful paint.\nRaised automated test coverage from 28% to 76%.',
      },
      {
        id: uid('e'), role: 'Junior Developer', company: 'Kubit IT', location: 'Ankara',
        start: '2017', end: '2019', current: false,
        summary: 'Internal line-of-business applications for enterprise customers.',
        bullets: 'Maintained and modernised three Java EE applications.\nSet up the first CI pipeline on Jenkins.',
      },
    ],
    education: [
      { id: uid('ed'), degree: 'MSc Computer Engineering', school: 'Middle East Technical University', location: 'Ankara', start: '2017', end: '2019', grade: '3.62 / 4.00', summary: 'Thesis: a comparative analysis of consistency models in distributed systems.' },
      { id: uid('ed'), degree: 'BSc Computer Engineering', school: 'Hacettepe University', location: 'Ankara', start: '2013', end: '2017', grade: '3.41 / 4.00', summary: '' },
    ],
    skills: [
      { id: uid('s'), name: 'Java 21', level: 5, group: 'Backend' },
      { id: uid('s'), name: 'Spring Boot', level: 5, group: 'Backend' },
      { id: uid('s'), name: 'PostgreSQL', level: 4, group: 'Backend' },
      { id: uid('s'), name: 'Kafka', level: 4, group: 'Backend' },
      { id: uid('s'), name: 'React / Next.js', level: 4, group: 'Frontend' },
      { id: uid('s'), name: 'TypeScript', level: 4, group: 'Frontend' },
      { id: uid('s'), name: 'Docker & Kubernetes', level: 4, group: 'DevOps' },
      { id: uid('s'), name: 'CI/CD (GitLab)', level: 4, group: 'DevOps' },
    ],
    languages: [
      { id: uid('l'), name: 'Turkish', level: 'Native', score: 5 },
      { id: uid('l'), name: 'English', level: 'C1 · Advanced', score: 4 },
      { id: uid('l'), name: 'German', level: 'A2 · Basic', score: 2 },
    ],
    projects: [
      { id: uid('p'), name: 'OpenLedger', role: 'Founding developer', link: 'github.com/elifyildirim/openledger', summary: 'Open-source bookkeeping service for small businesses; 1.4k stars.', tech: 'Spring Boot, PostgreSQL, React' },
      { id: uid('p'), name: 'Cadastre Visualiser', role: 'Tech lead', link: '', summary: 'Internal tool that renders parcel data live on a map.', tech: 'Next.js, MapLibre, Redis' },
    ],
    certificates: [
      { id: uid('c'), name: 'Oracle Certified Professional: Java SE 17', issuer: 'Oracle', date: '2023', link: '' },
      { id: uid('c'), name: 'Certified Kubernetes Application Developer', issuer: 'CNCF', date: '2022', link: '' },
    ],
    awards: [
      { id: uid('a'), name: 'Engineer of the Year', issuer: 'Nova Technology', date: '2023', summary: 'For the platform modernisation programme.' },
    ],
    references: [
      { id: uid('r'), name: 'Mehmet Arslan', role: 'Director of Engineering', company: 'Nova Technology', contact: 'Available on request' },
    ],
    interests: 'Chess, Long-distance running, Analogue photography, Open source',
  }
}
