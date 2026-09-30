// AI Sunum Stüdyosu — alan modeli.
//
// Tek doğruluk kaynağı: bu dosyadaki `Presentation` / `Slide` tipleri. Aynı model
// üç tüketiciye hizmet eder:
//   React renderer  → components/sunum/SlideRenderer.tsx
//   PPTX renderer   → lib/sunum/export/pptx.ts
//   PDF (yazdırma)  → lib/sunum/export/pdf.ts
// Yeni bir slayt tipi eklerken üçünü birlikte güncelle; `SLIDE_TYPES` listesi
// derleyicinin bunu hatırlatmasını sağlar (exhaustive switch).
//
// AI çıktısı BU tiplere doğrudan güvenilmez: Ollama'dan gelen gevşek JSON
// lib/sunum/ai/normalize.ts içinde onarılıp buraya dönüştürülür.

import type { ThemeId } from './themes'

export const SLIDE_TYPES = [
  'title',
  'content',
  'two-column',
  'comparison',
  'statistics',
  'chart',
  'timeline',
  'process',
  'architecture',
  'image',
  'quote',
  'conclusion',
] as const

export type SlideType = (typeof SLIDE_TYPES)[number]

export function isSlideType(value: unknown): value is SlideType {
  return typeof value === 'string' && (SLIDE_TYPES as readonly string[]).indexOf(value) >= 0
}

/** Hedef kitle — AI'nın dil seviyesini ve slayt yoğunluğunu belirler. */
/**
 * Hedef kitle.
 *
 * Sihirbazda artık SORULMUYOR: seçim, aynı konuda birbirinden belirgin biçimde
 * farklı (ve çoğu zaman daha sığ) desteler üretiyordu — "üst yönetim" seçilince
 * model teknik ayrıntıyı atıyor, "müşteri" seçilince sayıları atıyordu.
 * Varsayılan `professional`, hiçbir ayrıntıyı elemeyen tek seçenek olduğu için
 * seçildi. Alan korunuyor: eski desteler kendi kitlesini taşımaya devam ediyor
 * ve slayt başına iyileştirme komutları onu okuyor.
 */
export const AUDIENCES = [
  'professional',
  'student',
  'employee',
  'management',
  'technical',
  'customer',
  'academic',
  'general',
] as const
export type Audience = (typeof AUDIENCES)[number]
export const DEFAULT_AUDIENCE: Audience = 'professional'

export function isAudience(value: unknown): value is Audience {
  return typeof value === 'string' && (AUDIENCES as readonly string[]).indexOf(value) >= 0
}

/** Sunum dili — site dilinden bağımsız seçilebilir (TR sunum, EN arayüz mümkün). */
export type SunumLang = 'tr' | 'en'

/**
 * Sunum tonu — üslubu belirler, YAPIYI değil. Slayt tipleri ve tasarım
 * tondan bağımsızdır; yalnızca AI'nın cümle kurma biçimi değişir.
 */
export const TONES = ['professional', 'academic', 'friendly', 'persuasive'] as const
export type Tone = (typeof TONES)[number]

export function isTone(value: unknown): value is Tone {
  return typeof value === 'string' && (TONES as readonly string[]).indexOf(value) >= 0
}

export const DEFAULT_TONE: Tone = 'professional'

/**
 * Görsel yoğunluk — slaytın dekoratif katmanlarını ve sahneleme animasyonunun
 * gücünü belirler. İÇERİĞİ değiştirmez: aynı sunum üç yoğunlukta da aynı şeyi
 * anlatır, yalnızca sunuluşu değişir.
 */
export const VISUALS = ['clean', 'modern', 'bold'] as const
export type Visual = (typeof VISUALS)[number]

export function isVisual(value: unknown): value is Visual {
  return typeof value === 'string' && (VISUALS as readonly string[]).indexOf(value) >= 0
}

export const DEFAULT_VISUAL: Visual = 'modern'

/* ================================ slayt içeriği ================================ */

/** Görsel slaytların yer tutucu simgesi — harici görsel üretimi yoktur (bkz. §7). */
/**
 * Slayt simgeleri.
 *
 * Katalog bilinçli olarak GENİŞ: her slaytın başlığında konuyla ilgili bir simge
 * çıkması isteniyor ve 10 simgelik bir küme her konuyu "ampul"e düşürüyordu.
 * Simgeyi AI seçer (anlamsal bir etikettir, tasarım değil); seçmezse başlıktan
 * deterministik olarak çıkarılır (bkz. ai/normalize.ts → GLYPH_HINTS).
 */
export const SLIDE_GLYPHS = [
  'idea',
  'chart',
  'growth',
  'users',
  'gear',
  'shield',
  'cloud',
  'code',
  'target',
  'clock',
  'book',
  'money',
  'warning',
  'check',
  'search',
  'globe',
  'rocket',
  'network',
  'database',
  'mobile',
  'energy',
  'health',
  'leaf',
  'lock',
  'message',
  'star',
  'calendar',
  'layers',
  'flask',
  'scale',
] as const
export type SlideGlyph = (typeof SLIDE_GLYPHS)[number]

export function isSlideGlyph(value: unknown): value is SlideGlyph {
  return typeof value === 'string' && (SLIDE_GLYPHS as readonly string[]).indexOf(value) >= 0
}

export type TitleContent = {
  /** Sunan kişi / kurum. */
  presenter?: string
  /** Tarih ya da bağlam satırı. */
  context?: string
}

export type ContentContent = { bullets: string[] }

export type ColumnBlock = { heading: string; bullets: string[] }

export type TwoColumnContent = { left: ColumnBlock; right: ColumnBlock }

export type ComparisonContent = {
  left: ColumnBlock
  right: ColumnBlock
  /** Karşılaştırmanın sonucu — tek cümlelik çıkarım. */
  verdict?: string
}

export type StatItem = { value: string; label: string; caption?: string }
export type StatisticsContent = { stats: StatItem[]; footnote?: string }

export const CHART_KINDS = ['bar', 'line', 'pie', 'donut'] as const
export type ChartKind = (typeof CHART_KINDS)[number]

export function isChartKind(value: unknown): value is ChartKind {
  return typeof value === 'string' && (CHART_KINDS as readonly string[]).indexOf(value) >= 0
}

export type ChartPoint = { label: string; value: number }
export type ChartContent = {
  chartType: ChartKind
  points: ChartPoint[]
  /** Birim etiketi ("%", "ms", "milyon ₺") — değerlerin yanında gösterilir. */
  unit?: string
  caption?: string
}

export type TimelineStep = { label: string; title: string; description?: string }
export type TimelineContent = { steps: TimelineStep[] }

export type ProcessStep = { title: string; description?: string }
export type ProcessContent = { steps: ProcessStep[] }

export type ArchLayer = { name: string; nodes: string[] }
export type ArchitectureContent = { layers: ArchLayer[]; note?: string }

export type ImageContent = {
  glyph: SlideGlyph
  bullets: string[]
  caption?: string
  /**
   * Kullanıcının yüklediği görselin data URL'i. AI asla doldurmaz; editörde
   * kullanıcı seçer. localStorage kotası için küçültülerek saklanır.
   */
  src?: string
}

export type QuoteContent = { text: string; author?: string; role?: string }

export type ConclusionContent = { bullets: string[]; cta?: string }

type SlideBase = {
  id: string
  presentationId: string
  order: number
  title: string
  subtitle?: string
  /** Şablon varyantı ("content-01"). Geçersizse renderer tipin ilk şablonuna düşer. */
  template: string
  /** Konuşmacı notları — PPTX'e speaker notes olarak yazılır. */
  notes?: string
  /**
   * Slayttan akılda kalması gereken TEK cümle. AI üretir, şablon onu içerikten
   * ayrı bir vurgu bandında gösterir. Boş bırakılabilir.
   */
  highlight?: string
  /**
   * Konuyla ilgili simge. Başlığın yanında rozet olarak çizilir.
   *
   * AI'ya "tasarım yaptırmak" DEĞİLDİR: model yalnızca anlamsal bir etiket
   * ("money", "shield") seçer; o etiketin nasıl çizileceğine tema ve şablon
   * karar verir. Boşsa başlıktan deterministik olarak türetilir.
   */
  icon?: SlideGlyph
  /**
   * Somut, canlı örnek — "bu soyut maddenin gerçek hayatta karşılığı nedir?".
   * Konudan üretilen (kaynak dokümanı olmayan) sunumlarda istemin öncelikli
   * talebi budur: örneksiz slayt dinleyicide iz bırakmıyor.
   */
  example?: string
  /**
   * Slaydın görseli.
   *
   * Görsel bir slayt TİPİ değil, her slaytın bir ÖZELLİĞİdir. Önce yalnızca
   * `image` tipinde vardı; AI ise görsel kotasını chart/timeline/process gibi
   * tiplerle dolduruyor ve `image` tipini neredeyse hiç üretmiyor — sonuçta
   * kullanıcı hiçbir slayda görsel ekleyemiyordu. Artık grafikli bir slayda da,
   * zaman çizelgesine de görsel konabiliyor.
   */
  media?: SlideMedia
  /**
   * Kullanıcının slayt metnine uyguladığı biçim.
   *
   * Tema hâlâ tek doğruluk kaynağı: renk ve yazı tipi SERBEST değil, temanın
   * sunduğu seçeneklere bağlı. Böylece kullanıcı biçim değiştirirken kontrast
   * garantisi bozulmuyor ve PPTX çıktısı ekranla aynı kalıyor.
   */
  textStyle?: TextStyle
}

/** Metin hizası — Word'deki karşılığıyla aynı. */
export const TEXT_ALIGNS = ['left', 'center', 'right'] as const
export type TextAlign = (typeof TEXT_ALIGNS)[number]

/** Renk SERBEST değil: temanın tanımlı rolleri arasından seçilir. */
export const TEXT_TONES = ['default', 'accent', 'muted'] as const
export type TextTone = (typeof TEXT_TONES)[number]

/** Yazı tipi ailesi; temanın kendi ailesi varsayılan. */
export const TEXT_FONTS = ['theme', 'sans', 'serif', 'display', 'mono'] as const
export type TextFont = (typeof TEXT_FONTS)[number]

/** Punto ÖLÇEĞİ — mutlak punto değil, şablonun kendi kademesini çarpar. */
export const TEXT_SCALE_MIN = 0.7
export const TEXT_SCALE_MAX = 1.35

export type TextStyle = {
  font?: TextFont
  /** `TEXT_SCALE_MIN`–`TEXT_SCALE_MAX` arası çarpan. */
  scale?: number
  bold?: boolean
  italic?: boolean
  underline?: boolean
  align?: TextAlign
  tone?: TextTone
  /** Satır aralığı çarpanı (1 = şablonun kendi değeri). */
  lineHeight?: number
}

/**
 * Görselin slayttaki yeri.
 *
 * Üçü de yerleşim ölçü motoruyla UYUMLU: ya içeriğin arkasında durur (`background`)
 * ya da yalnızca DİKEY alan tüketir (`band`, `inset`). Yan yana (sol/sağ) bir
 * yerleşim bilinçli olarak YOK: o, gövdenin genişliğini değiştirir ve şablonların
 * satır kestirimi sabit genişliğe dayandığı için metin taşmasına yol açıyor.
 * Gerçek yan yana düzen isteyen kullanıcı "Görsel" slayt tipini seçiyor; orada
 * genişlik doğru hesaplanıyor.
 */
export const MEDIA_PLACEMENTS = ['background', 'band', 'inset'] as const
export type MediaPlacement = (typeof MEDIA_PLACEMENTS)[number]
export const DEFAULT_MEDIA_PLACEMENT: MediaPlacement = 'band'

export function isMediaPlacement(value: unknown): value is MediaPlacement {
  return typeof value === 'string' && (MEDIA_PLACEMENTS as readonly string[]).indexOf(value) >= 0
}

export const MEDIA_FITS = ['cover', 'contain'] as const
export type MediaFit = (typeof MEDIA_FITS)[number]

export type SlideMedia = {
  /** YALNIZCA gömülü `data:` URL. Harici adres render edilmez (güvenlik sınırı). */
  src: string
  placement: MediaPlacement
  fit: MediaFit
  /** Görselin çerçeve içindeki odak noktası (%). Tarayıcıdan sürüklenerek ayarlanır. */
  focusX: number
  focusY: number
  /** Yakınlaştırma çarpanı (1 = çerçeveye tam oturur). */
  zoom: number
  /** Ekran okuyucu ve PPTX için açıklama. */
  alt?: string
}

type SlideOf<T extends SlideType, C> = SlideBase & { type: T; content: C }

export type TitleSlide = SlideOf<'title', TitleContent>
export type ContentSlide = SlideOf<'content', ContentContent>
export type TwoColumnSlide = SlideOf<'two-column', TwoColumnContent>
export type ComparisonSlide = SlideOf<'comparison', ComparisonContent>
export type StatisticsSlide = SlideOf<'statistics', StatisticsContent>
export type ChartSlide = SlideOf<'chart', ChartContent>
export type TimelineSlide = SlideOf<'timeline', TimelineContent>
export type ProcessSlide = SlideOf<'process', ProcessContent>
export type ArchitectureSlide = SlideOf<'architecture', ArchitectureContent>
export type ImageSlide = SlideOf<'image', ImageContent>
export type QuoteSlide = SlideOf<'quote', QuoteContent>
export type ConclusionSlide = SlideOf<'conclusion', ConclusionContent>

/**
 * Ayrık birleşim (discriminated union): `slide.type` daraltıldığında `slide.content`
 * de daralır. Bu sayede renderer'larda `any` ya da tip zorlaması gerekmez.
 */
export type Slide =
  | TitleSlide
  | ContentSlide
  | TwoColumnSlide
  | ComparisonSlide
  | StatisticsSlide
  | ChartSlide
  | TimelineSlide
  | ProcessSlide
  | ArchitectureSlide
  | ImageSlide
  | QuoteSlide
  | ConclusionSlide

/** Slayt tipine göre içerik tipi — jenerik yardımcılarda kullanılır. */
export type ContentOf<T extends SlideType> = Extract<Slide, { type: T }>['content']

export type Presentation = {
  id: string
  title: string
  subtitle?: string
  /** Kullanıcının girdiği konu açıklaması / kaynak metin özeti. */
  description?: string
  audience: Audience
  durationMinutes: number
  theme: ThemeId
  language: SunumLang
  /** Eski kayıtlarda yok; okunurken varsayılana düşer. */
  tone?: Tone
  /**
   * Kullanıcının sunumdan beklentileri, kendi cümleleriyle ("grafik ağırlıklı
   * olsun", "her bölümde örnek ver", "sonunda kaynakça"). AI bunu yorumlayıp
   * yapıya uygular; sunum koçu da eksikleri buna göre denetler.
   */
  requirements?: string
  /** Görsel yoğunluk; eski kayıtlarda yok, okunurken varsayılana düşer. */
  visual?: Visual
  /** Üretimde kullanılan içerik standardı — koç paneli buna göre denetler. */
  framework?: Framework
  createdAt: string
  updatedAt: string
  /** Taslağın kaynağı: 'ai' → Ollama üretti, 'outline' → yerel yedek çıkarıcı. */
  source: 'ai' | 'outline'
  slides: Slide[]
}

/**
 * Üretim derinliği.
 *
 * `fast`: tek yapısal çağrı. Hızlı ama ücretsiz sağlayıcıların çıktı bütçesi
 *   (≈1500 token) tüm desteye bölündüğü için slayt başına ~130 karakter kalıyor.
 * `deep`: önce PLAN (tek küçük çağrı), sonra slayt başına bir genişletme çağrısı.
 *   Her slayt kendi bütçesinin tamamını kullandığı için içerik uzun ve örnekli
 *   olur; kaynak doküman da slayt başına İLGİLİ parçasıyla gönderilir.
 */
export const DEPTHS = ['fast', 'deep'] as const
export type Depth = (typeof DEPTHS)[number]
export const DEFAULT_DEPTH: Depth = 'deep'

export function isDepth(value: unknown): value is Depth {
  return typeof value === 'string' && (DEPTHS as readonly string[]).indexOf(value) >= 0
}

/**
 * Girdi kaynağı ve AI'nın rolü — kullanıcı bunu SİHİRBAZDA açıkça seçer.
 *
 * Neden seçtiriliyor: "metin yapıştırdım ama AI onu yeniden yazdı" ile "dosyamı
 * aynen slayda dönüştür" bambaşka iki beklenti. Sistem bunu tahmin etmeye
 * çalışırsa ikisinden birini mutlaka yanlış yapıyor.
 *
 * `-only` modlarında AI'ya HİÇ çağrı yapılmaz: deste deterministik çıkarıcıyla
 * (outline.ts) üretilir, metin olduğu gibi slaytlara bölünür.
 */
export const SOURCE_MODES = ['topic-ai', 'text-only', 'text-ai', 'doc-only', 'doc-ai'] as const
export type SourceMode = (typeof SOURCE_MODES)[number]
export const DEFAULT_SOURCE_MODE: SourceMode = 'topic-ai'

export function isSourceMode(value: unknown): value is SourceMode {
  return typeof value === 'string' && (SOURCE_MODES as readonly string[]).indexOf(value) >= 0
}

/** Mod AI kullanıyor mu? `false` ise üretim tamamen cihazda yapılır. */
export function usesAi(mode: SourceMode): boolean {
  return mode !== 'text-only' && mode !== 'doc-only'
}

/** Mod bir kaynak metin (yapıştırılan ya da dosyadan çıkarılan) gerektiriyor mu? */
export function needsSource(mode: SourceMode): boolean {
  return mode !== 'topic-ai'
}

/**
 * İçerik standardı — destenin anlatım iskeleti.
 *
 * AI'ya "8 slayt yaz" demek her seferinde aynı kalıbı üretiyordu: tanım →
 * sayılar → sorunlar → sonuç. Standart, o iskeleti kullanıcının seçebileceği
 * bir karara dönüştürüyor. Bölüm listesi `lib/sunum/frameworks.ts` içinde.
 */
export const FRAMEWORKS = [
  'classic',
  'problem-solution',
  'story',
  'pyramid',
  'swot',
  'case-study',
  'academic',
  'pitch',
  'training',
  'retrospective',
] as const
export type Framework = (typeof FRAMEWORKS)[number]
export const DEFAULT_FRAMEWORK: Framework = 'classic'

export function isFramework(value: unknown): value is Framework {
  return typeof value === 'string' && (FRAMEWORKS as readonly string[]).indexOf(value) >= 0
}

/** Yeni sunum formunun topladığı girdi. */
export type GenerationRequest = {
  topic: string
  /** Serbest metin açıklama ya da yüklenen dosyadan çıkarılan metin. */
  sourceText?: string
  audience: Audience
  durationMinutes: number
  slideCount: number
  theme: ThemeId
  language: SunumLang
  tone?: Tone
  /** Üretim derinliği; verilmezse `DEFAULT_DEPTH`. */
  depth?: Depth
  /** Girdi kaynağı ve AI'nın rolü; verilmezse `DEFAULT_SOURCE_MODE`. */
  sourceMode?: SourceMode
  /** İçerik standardı (anlatım iskeleti); verilmezse `DEFAULT_FRAMEWORK`. */
  framework?: Framework
  /** Kullanıcının serbest metinle yazdığı beklentiler (bkz. Presentation.requirements). */
  requirements?: string
  visual?: Visual
}

/**
 * Konudan doğrudan yeni slayt üretme isteği.
 *
 * Sunum yeniden üretilmez; yalnızca TEK slayt istenir. Çıktı küçük olduğu için
 * bütçesi dar ücretsiz modellerde bile güvenilir çalışır.
 */
export type SlideRequest = {
  presentationTitle: string
  topic: string
  audience: Audience
  language: SunumLang
  tone?: Tone
  /** İstenen tip; verilmezse modele bırakılır. */
  type?: SlideType
  /** Destede zaten anlatılanlar — model aynı şeyi tekrar etmesin. */
  existingTitles: string[]
  /** Kullanıcının serbest yönergesi ("maliyetleri karşılaştır"). */
  instruction?: string
  /**
   * Derin üretimde plandan gelen görev tanımı: bu slaytın NE anlatması gerektiği.
   * `instruction`dan farkı, kullanıcının değil planın yazmış olması.
   */
  brief?: string
  /**
   * Kaynak dokümanın YALNIZCA bu slaytla ilgili parçası. Tüm dokümanı her
   * çağrıya koymak hem bütçeyi yiyor hem modelin odağını dağıtıyor; ilgili
   * bölümü deterministik olarak seçmek ikisini birden çözüyor (bkz. retrieve.ts).
   */
  sourceExcerpt?: string
  /** Hedeflenen madde sayısı; derin üretimde planın süre bütçesinden gelir. */
  bulletTarget?: number
  /**
   * `example` alanı ŞEMADA zorunlu olsun mu? Derin üretimde evet: somut örnek
   * o modun asıl vaadi ve isteğe bağlı bırakıldığında model onu atlıyor.
   */
  wantExample?: boolean
}

/** Plan adımının çıktısı: bir slaytın tipi, başlığı ve görev tanımı. */
export type PlanItem = {
  type: SlideType
  title: string
  brief: string
}

export type DeckPlan = {
  title: string
  subtitle?: string
  items: PlanItem[]
}

/** Slayt başına AI komutları (§6). */
export const REFINE_ACTIONS = [
  'shorten',
  'professional',
  'simplify',
  'toBullets',
  'toChart',
  'toProcess',
  'toTimeline',
  'toStats',
  'toComparison',
  'toArchitecture',
  'expand',
  'notes',
  'highlight',
  'example',
] as const
export type RefineAction = (typeof REFINE_ACTIONS)[number]

export function isRefineAction(value: unknown): value is RefineAction {
  return typeof value === 'string' && (REFINE_ACTIONS as readonly string[]).indexOf(value) >= 0
}

export type RefineRequest = {
  slide: Slide
  action: RefineAction
  audience: Audience
  language: SunumLang
  /** Sunumun başlığı — model bağlamı kaybetmesin. */
  presentationTitle: string
}

/* ================================ yardımcılar ================================ */

/** Çakışma olasılığı yok sayılabilir kısa kimlik (harici paket gerekmez). */
export function uid(prefix = 's'): string {
  const rand = Math.random().toString(36).slice(2, 8)
  return `${prefix}_${Date.now().toString(36)}${rand}`
}

/** Sayıyı [min, max] aralığına çeker; NaN/Infinity gelirse `fallback` döner. */
export function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.round(n)))
}

/** Slaytların `order` alanını dizideki konuma göre yeniden numaralar. */
export function reindex(slides: Slide[]): Slide[] {
  return slides.map((s, i) => (s.order === i ? s : { ...s, order: i }))
}
