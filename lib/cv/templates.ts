// Şablon kataloğu — iki aile, üç veri dosyası:
//
//   templates-ankara.ts  → ats    · Ankara ilçeleri (25). Tek kolon, standart font/başlık,
//                                   görsel/ikon/tablo yok. Render: CvAtsDocument.
//   templates-legacy.ts  → design · Elazığ, Malatya, Kastamonu ilçeleri (özgün 40).
//   templates-dogu.ts    → design · Bayburt (3), Erzurum (20), Artvin (9) ilçeleri (yeni 32).
//                                   Render: CvDesignDocument (shell/head/body iskeleti +
//                                   `.cv-doc[data-tpl]` CSS varyantları).
//
// Kimlikler (localStorage ve CSS seçicisi için) ilçe adlarının ASCII karşılığıdır.
// ATS skoru seçili şablonun ailesine ve gerçek yerleşimine göre hesaplanır.

import type {
  AtsFontKey,
  ContactSeparator,
  DateFormat,
  DatePosition,
  EntryOrder,
  FontKey,
  HeaderAlign,
  HeadingStyle,
} from './types'
import { ANKARA_TEMPLATES } from './templates-ankara'
import { LEGACY_TEMPLATES } from './templates-legacy'
import { DOGU_TEMPLATES } from './templates-dogu'

export type TplFamily = 'ats' | 'design'
export type TplRegion = 'ankara' | 'elazig' | 'malatya' | 'kastamonu' | 'bayburt' | 'erzurum' | 'artvin'
export type TplCategory = 'corporate' | 'modern' | 'minimal' | 'executive' | 'creative' | 'technical' | 'academic'

/* ------------------------------- design ailesi ------------------------------- */

/** Sayfa iskeleti: yan sütun var mı, hangi tarafta? */
export type Shell = 'plain' | 'aside-left' | 'aside-right'
/** Üst blok biçimi. `none` → kimlik bilgileri yan sütuna taşınır. */
export type Head = 'stack' | 'center' | 'band' | 'split' | 'hero' | 'none'
/** Gövde akışı: tek sütun mu, iki sütunlu mu? */
export type Body = 'flow' | 'duo'
export type SkillStyle = 'bar' | 'dots' | 'chips' | 'text' | 'ring'
export type PhotoShape = 'circle' | 'square' | 'rounded' | 'none'

export type DesignTemplate = {
  family: 'design'
  id: string
  name: string
  region: TplRegion
  category: TplCategory
  shell: Shell
  head: Head
  body: Body
  /** Vurgu rengi — kullanıcı 3. adımda değiştirebilir. */
  accent: string
  /** Yan sütun / bant zemini. */
  ink: string
  /** Yan sütun zemini `ink`ten farklıysa (açık renkli raylı şablonlar). */
  rail?: string
  /** Kâğıt zemini (krem/koyu tonlu şablonlar için beyazdan farklıdır). */
  paper: string
  font: FontKey
  skill: SkillStyle
  photo: PhotoShape
  /** Ön ayarlar: yazı ölçeği, satır yüksekliği, sayfa boşluğu (mm). */
  fontScale: number
  lineHeight: number
  margin: number
  noteTr: string
  noteEn: string
}

/* --------------------------------- ATS ailesi --------------------------------- */

export type AtsTemplate = {
  family: 'ats'
  id: string
  name: string
  region: TplRegion
  category: TplCategory
  font: AtsFontKey
  headingFont: AtsFontKey
  /** Beyaz zeminde en az 4.5:1 kontrastlı koyu, profesyonel bir ton. */
  accent: string
  headingStyle: HeadingStyle
  headerAlign: HeaderAlign
  contactSeparator: ContactSeparator
  dateFormat: DateFormat
  datePosition: DatePosition
  entryOrder: EntryOrder
  bulletStyle: 'dot' | 'dash'
  /** pt — 10–12 */
  bodySize: number
  /** pt — 13–16 */
  headingSize: number
  /** pt — 18–24 */
  nameSize: number
  /** 1.15–1.5 */
  lineHeight: number
  /** mm — 18–25.4 */
  margin: number
  /** mm — 3–8 */
  sectionGap: number
  noteTr: string
  noteEn: string
}

export type CvTemplate = DesignTemplate | AtsTemplate

/** Galeri sırası: önce ATS uyumlu Ankara şablonları, sonra görsel şablonlar. */
export const TEMPLATES: CvTemplate[] = [...ANKARA_TEMPLATES, ...LEGACY_TEMPLATES, ...DOGU_TEMPLATES]

/** Yeni kullanıcılar ATS uyumlu bir şablonla başlar. */
export const DEFAULT_TEMPLATE_ID = 'cankaya'

/** Görsel şablon seçiliyken "ATS uyumlu şablona geç" önerisinde kullanılan şablon. */
export const RECOMMENDED_ATS_TEMPLATE_ID = 'cankaya'

export function getTemplate(id: string): CvTemplate {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES.find((t) => t.id === DEFAULT_TEMPLATE_ID) ?? TEMPLATES[0]
}

export function isAtsTemplate(t: CvTemplate): t is AtsTemplate {
  return t.family === 'ats'
}

export function isDesignTemplate(t: CvTemplate): t is DesignTemplate {
  return t.family === 'design'
}

export const TPL_FAMILIES: TplFamily[] = ['ats', 'design']

/** Galeri filtreleri — sıra, sekmelerde görünen sıradır. */
export const TPL_CATEGORIES: TplCategory[] = ['corporate', 'modern', 'minimal', 'executive', 'creative', 'technical', 'academic']

/** İl filtreleri — sıra, galeride görünen sıradır. */
export const TPL_REGIONS: TplRegion[] = ['ankara', 'elazig', 'malatya', 'kastamonu', 'bayburt', 'erzurum', 'artvin']
