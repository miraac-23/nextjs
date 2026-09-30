// Zod şemaları — üç sınırda da aynı kurallar geçerli:
//   1) API gövdeleri (app/api/**)      → istemciden gelen her şey doğrulanır,
//   2) localStorage'dan okunan kayıtlar → eski/bozuk kayıt uygulamayı kırmaz,
//   3) AI çıktısı                      → gevşek şema + normalize (bkz. ai/normalize.ts).
//
// Uzunluk sınırları hem güvenlik (şişirilmiş gövde) hem tasarım (slayt taşmasın)
// gereği: bir slayt şablonu 8 maddeden fazlasını okunur biçimde taşıyamaz.

import { z } from 'zod'
import { THEMES, type ThemeId } from './themes'
import {
  AUDIENCES,
  CHART_KINDS,
  DEPTHS,
  FRAMEWORKS,
  SLIDE_GLYPHS,
  SLIDE_TYPES,
  MEDIA_FITS,
  MEDIA_PLACEMENTS,
  TEXT_ALIGNS,
  TEXT_FONTS,
  TEXT_SCALE_MAX,
  TEXT_SCALE_MIN,
  TEXT_TONES,
  SOURCE_MODES,
  TONES,
  VISUALS,
  type SlideType,
} from './types'

/* ================================== sınırlar ================================== */

export const LIMITS = {
  topic: 180,
  /** Kullanıcı beklentileri — bir paragraftan uzun olması istemi boğuyor. */
  requirements: 600,
  title: 140,
  subtitle: 200,
  description: 4000,
  /** Ollama'ya gönderilen kaynak metnin üst sınırı (chunk'lama sonrası). */
  sourceText: 60_000,
  bullet: 240,
  bullets: 8,
  stats: 6,
  chartPoints: 12,
  steps: 8,
  layers: 5,
  nodes: 6,
  notes: 1200,
  /** Somut örnek — iki cümleden uzunu slayda sığmıyor. */
  example: 260,
  /** Plan adımının görev tanımı. */
  brief: 400,
  /** Bir slayda gönderilen kaynak parçası. */
  sourceExcerpt: 6000,
  slides: 40,
  slideCountMin: 3,
  slideCountMax: 25,
  durationMin: 3,
  durationMax: 120,
  /** Yüklenebilecek en büyük PDF/DOCX (lib/ats/parse ile aynı sınır). */
  uploadBytes: 10 * 1024 * 1024,
  /** Slayta gömülen görselin data URL sınırı (localStorage kotası). */
  imageDataUrl: 800_000,
} as const

const trimmed = (max: number) => z.string().trim().max(max)
const required = (max: number) => z.string().trim().min(1).max(max)

const bulletList = z.array(required(LIMITS.bullet)).max(LIMITS.bullets)
// `THEMES` bir dizi olduğu için tuple'a daraltılır: z.enum en az bir değer ister.
const themeIds = THEMES.map((t) => t.id) as [ThemeId, ...ThemeId[]]

export const themeIdSchema = z.enum(themeIds)
export const audienceSchema = z.enum(AUDIENCES)
export const slideTypeSchema = z.enum(SLIDE_TYPES)
export const chartKindSchema = z.enum(CHART_KINDS)
export const glyphSchema = z.enum(SLIDE_GLYPHS)
export const langSchema = z.enum(['tr', 'en'])
export const toneSchema = z.enum(TONES)
export const visualSchema = z.enum(VISUALS)
export const depthSchema = z.enum(DEPTHS)
export const sourceModeSchema = z.enum(SOURCE_MODES)
export const frameworkSchema = z.enum(FRAMEWORKS)

/**
 * Gömülü görsel adresi. Yalnızca `data:` kabul edilir — harici adres render
 * edilmez, böylece slayt dışarıya istek atan bir kaynak taşıyamaz.
 */
const dataImageUrl = z
  .string()
  .max(LIMITS.imageDataUrl)
  .regex(/^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/)

export const mediaSchema = z.object({
  src: dataImageUrl,
  placement: z.enum(MEDIA_PLACEMENTS),
  fit: z.enum(MEDIA_FITS),
  // Odak ve yakınlaştırma kullanıcı sürüklemesinden gelir; sınırlar kırpılır.
  focusX: z.number().min(0).max(100),
  focusY: z.number().min(0).max(100),
  zoom: z.number().min(1).max(4),
  alt: trimmed(LIMITS.bullet).optional(),
})

/** Kullanıcının uyguladığı metin biçimi. Değerler temaya bağlı, serbest değil. */
export const textStyleSchema = z.object({
  font: z.enum(TEXT_FONTS).optional(),
  scale: z.number().min(TEXT_SCALE_MIN).max(TEXT_SCALE_MAX).optional(),
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  underline: z.boolean().optional(),
  align: z.enum(TEXT_ALIGNS).optional(),
  tone: z.enum(TEXT_TONES).optional(),
  lineHeight: z.number().min(0.9).max(2).optional(),
})

/* ============================== slayt içerikleri ============================== */

const columnBlock = z.object({
  heading: trimmed(LIMITS.title),
  bullets: bulletList,
})

const contentByType = {
  title: z.object({ presenter: trimmed(LIMITS.title).optional(), context: trimmed(LIMITS.title).optional() }),
  content: z.object({ bullets: bulletList }),
  'two-column': z.object({ left: columnBlock, right: columnBlock }),
  comparison: z.object({ left: columnBlock, right: columnBlock, verdict: trimmed(LIMITS.bullet).optional() }),
  statistics: z.object({
    stats: z
      .array(
        z.object({
          value: required(24),
          label: required(LIMITS.bullet),
          caption: trimmed(LIMITS.bullet).optional(),
        }),
      )
      .max(LIMITS.stats),
    footnote: trimmed(LIMITS.bullet).optional(),
  }),
  chart: z.object({
    chartType: chartKindSchema,
    points: z
      .array(z.object({ label: required(60), value: z.number().finite() }))
      .max(LIMITS.chartPoints),
    unit: trimmed(16).optional(),
    caption: trimmed(LIMITS.bullet).optional(),
  }),
  timeline: z.object({
    steps: z
      .array(
        z.object({
          label: trimmed(40),
          title: required(LIMITS.title),
          description: trimmed(LIMITS.bullet).optional(),
        }),
      )
      .max(LIMITS.steps),
  }),
  process: z.object({
    steps: z
      .array(z.object({ title: required(LIMITS.title), description: trimmed(LIMITS.bullet).optional() }))
      .max(LIMITS.steps),
  }),
  architecture: z.object({
    layers: z
      .array(z.object({ name: required(LIMITS.title), nodes: z.array(required(60)).max(LIMITS.nodes) }))
      .max(LIMITS.layers),
    note: trimmed(LIMITS.bullet).optional(),
  }),
  image: z.object({
    glyph: glyphSchema,
    bullets: bulletList,
    caption: trimmed(LIMITS.bullet).optional(),
    // Yalnızca gömülü (data:) görsel kabul edilir: harici URL render edilmez,
    // böylece slayt dışarıya istek atan bir kaynak taşıyamaz.
    src: z
      .string()
      .max(LIMITS.imageDataUrl)
      .regex(/^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/)
      .optional(),
  }),
  quote: z.object({
    text: required(600),
    author: trimmed(LIMITS.title).optional(),
    role: trimmed(LIMITS.title).optional(),
  }),
  conclusion: z.object({ bullets: bulletList, cta: trimmed(LIMITS.bullet).optional() }),
} as const

const slideBase = {
  id: required(64),
  presentationId: required(64),
  order: z.number().int().min(0).max(LIMITS.slides),
  title: trimmed(LIMITS.title),
  subtitle: trimmed(LIMITS.subtitle).optional(),
  template: required(40),
  notes: trimmed(LIMITS.notes).optional(),
  highlight: trimmed(LIMITS.bullet).optional(),
  // Sonradan eklendi: eski kayıtlar bu iki alan olmadan da geçerlidir.
  icon: glyphSchema.optional(),
  example: trimmed(LIMITS.example).optional(),
  media: mediaSchema.optional(),
  textStyle: textStyleSchema.optional(),
}

/**
 * Slayt şeması — `type` alanına göre ayrışır. Zod'un `discriminatedUnion`u
 * tek geçişte doğru dalı seçtiği için hata mesajları da anlaşılır kalır.
 */
export const slideSchema = z.discriminatedUnion('type', [
  z.object({ ...slideBase, type: z.literal('title'), content: contentByType.title }),
  z.object({ ...slideBase, type: z.literal('content'), content: contentByType.content }),
  z.object({ ...slideBase, type: z.literal('two-column'), content: contentByType['two-column'] }),
  z.object({ ...slideBase, type: z.literal('comparison'), content: contentByType.comparison }),
  z.object({ ...slideBase, type: z.literal('statistics'), content: contentByType.statistics }),
  z.object({ ...slideBase, type: z.literal('chart'), content: contentByType.chart }),
  z.object({ ...slideBase, type: z.literal('timeline'), content: contentByType.timeline }),
  z.object({ ...slideBase, type: z.literal('process'), content: contentByType.process }),
  z.object({ ...slideBase, type: z.literal('architecture'), content: contentByType.architecture }),
  z.object({ ...slideBase, type: z.literal('image'), content: contentByType.image }),
  z.object({ ...slideBase, type: z.literal('quote'), content: contentByType.quote }),
  z.object({ ...slideBase, type: z.literal('conclusion'), content: contentByType.conclusion }),
])

export const presentationSchema = z.object({
  id: required(64),
  title: required(LIMITS.title),
  subtitle: trimmed(LIMITS.subtitle).optional(),
  description: trimmed(LIMITS.description).optional(),
  audience: audienceSchema,
  durationMinutes: z.number().int().min(LIMITS.durationMin).max(LIMITS.durationMax),
  theme: themeIdSchema,
  language: langSchema,
  // Sonradan eklendi: eski kayıtlar bu alan olmadan da geçerlidir.
  tone: toneSchema.optional(),
  requirements: trimmed(LIMITS.requirements).optional(),
  visual: visualSchema.optional(),
  framework: frameworkSchema.optional(),
  createdAt: required(40),
  updatedAt: required(40),
  source: z.enum(['ai', 'outline']),
  slides: z.array(slideSchema).max(LIMITS.slides),
})

/* ================================ API gövdeleri ================================ */

export const generateRequestSchema = z.object({
  topic: required(LIMITS.topic),
  sourceText: z.string().max(LIMITS.sourceText).optional(),
  audience: audienceSchema,
  durationMinutes: z.number().int().min(LIMITS.durationMin).max(LIMITS.durationMax),
  slideCount: z.number().int().min(LIMITS.slideCountMin).max(LIMITS.slideCountMax),
  theme: themeIdSchema,
  language: langSchema,
  tone: toneSchema.optional(),
  // Kullanıcının kendi beklentileri ve görsel yoğunluk tercihi: ikisi de istekle
  // birlikte gider, üretilen sunuma yazılır ve koç panelinde denetlenir.
  requirements: trimmed(LIMITS.requirements).optional(),
  visual: visualSchema.optional(),
  depth: depthSchema.optional(),
  sourceMode: sourceModeSchema.optional(),
  framework: frameworkSchema.optional(),
})

/**
 * API gövdelerine eklenen bağlantı bilgisi. Sunucu bunu KATALOGDA doğrular;
 * taban adres ve anahtar asla istemciden alınmaz (bkz. lib/sunum/ai/server.ts).
 */
export const connectionFields = {
  provider: z.string().max(40).optional(),
  model: z.string().max(120).optional(),
}

export const refineRequestSchema = z.object({
  slide: slideSchema,
  action: z.enum([
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
  ]),
  audience: audienceSchema,
  language: langSchema,
  presentationTitle: trimmed(LIMITS.title),
})

/** Üretim ve iyileştirme uçlarının gövdeleri: istek + bağlantı bilgisi. */
export const generateApiSchema = generateRequestSchema.extend(connectionFields)
export const refineApiSchema = refineRequestSchema.extend(connectionFields)

/** Konudan tek slayt üretme ucu. */
export const slideRequestSchema = z.object({
  presentationTitle: trimmed(LIMITS.title),
  topic: required(LIMITS.topic),
  audience: audienceSchema,
  language: langSchema,
  tone: toneSchema.optional(),
  type: slideTypeSchema.optional(),
  existingTitles: z.array(trimmed(LIMITS.title)).max(LIMITS.slides),
  instruction: trimmed(LIMITS.bullet).optional(),
  // Derin üretimin genişletme adımı bu üç alanı da gönderir.
  brief: trimmed(LIMITS.brief).optional(),
  sourceExcerpt: z.string().max(LIMITS.sourceExcerpt).optional(),
  bulletTarget: z.number().int().min(2).max(LIMITS.bullets).optional(),
  wantExample: z.boolean().optional(),
})

export const slideApiSchema = slideRequestSchema.extend(connectionFields)

/* ================================ derin üretim ================================ */

/** Plan adımı — modelin gevşek çıktısı. */
export const aiPlanSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  slides: z
    .array(
      z.object({
        type: z.string().optional(),
        title: z.string().optional(),
        brief: z.string().optional(),
      }),
    )
    .optional(),
})
export type AiPlanDraft = z.infer<typeof aiPlanSchema>

/** Planın JSON Schema karşılığı. Çıktı küçük: dar bütçeli sağlayıcılarda da sığar. */
export function aiPlanJsonSchema(slideCount: number): Record<string, unknown> {
  const str = { type: 'string' }
  return {
    type: 'object',
    properties: {
      title: str,
      subtitle: str,
      slides: {
        type: 'array',
        /*
         * `minItems` BİLİNÇLİ olarak yok.
         *
         * Şemaya asgari sayı koymak modeli o sayıya ulaşana kadar yazmaya
         * zorluyor; bağlam penceresi dolunca çıktı ortasından kesiliyor ve
         * TAMAMI geçersiz JSON oluyor. Ölçüldü: 8 ve 16 slayt sorunsuz, 25
         * slaytta "Model geçerli JSON döndürmedi" — ve o hata tüm üretimi
         * yerel taslağa düşürüp her slaydı aynı yer tutucuyla dolduruyordu.
         *
         * Sayı zaten istemde söyleniyor ve eksik kalırsa deterministik olarak
         * tamamlanıyor (bkz. frameworks.ts → alignToFramework). Az slayt, hiç
         * slayt olmamasından iyidir.
         */
        maxItems: LIMITS.slideCountMax,
        items: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: SLIDE_TYPES as unknown as string[] },
            title: str,
            brief: str,
          },
          required: ['type', 'title', 'brief'],
        },
      },
    },
    required: ['title', 'slides'],
  }
}

export const planRequestSchema = generateRequestSchema
export const planApiSchema = planRequestSchema.extend(connectionFields).extend({
  /** Kaynak özeti istemcide deterministik çıkarılır (retrieve.ts), sunucu iletir. */
  sourceOutline: z.string().max(LIMITS.sourceExcerpt).optional(),
})

export const exportRequestSchema = z.object({
  presentation: presentationSchema,
  fileName: trimmed(120).optional(),
})

/* ============================== AI çıktısı (gevşek) ============================== */

/**
 * Modelden beklenen şekil. Bilinçli olarak GEVŞEK: 8B'lik bir model ayrık birleşim
 * üretmekte zorlanır, bu yüzden tüm alanlar tek düzlemde ve hepsi opsiyoneldir.
 * Eksik/fazla alanlar `normalizePresentation` içinde onarılır.
 */
const aiColumn = z
  .object({ heading: z.string().optional(), bullets: z.array(z.string()).optional() })
  .partial()

export const aiSlideSchema = z
  .object({
    type: z.string().optional(),
    title: z.string().optional(),
    subtitle: z.string().optional(),
    bullets: z.array(z.string()).optional(),
    left: aiColumn.optional(),
    right: aiColumn.optional(),
    // Şemayı ZORLAMAYAN sağlayıcılarda "verdict" gibi genel bir ad, modelin tüm
    // içeriği oraya doldurmasına yol açıyordu. Ada tipini gömmek bunu bitirdi;
    // eski ad da okunmaya devam ediyor (normalize ikisini de kabul eder).
    comparisonVerdict: z.string().optional(),
    verdict: z.string().optional(),
    stats: z
      .array(z.object({ value: z.union([z.string(), z.number()]).optional(), label: z.string().optional(), caption: z.string().optional() }))
      .optional(),
    chart: z
      .object({
        chartType: z.string().optional(),
        unit: z.string().optional(),
        points: z.array(z.object({ label: z.string().optional(), value: z.union([z.number(), z.string()]).optional() })).optional(),
      })
      .optional(),
    steps: z
      .array(z.object({ label: z.string().optional(), title: z.string().optional(), description: z.string().optional() }))
      .optional(),
    layers: z.array(z.object({ name: z.string().optional(), nodes: z.array(z.string()).optional() })).optional(),
    quote: z.object({ text: z.string().optional(), author: z.string().optional(), role: z.string().optional() }).optional(),
    caption: z.string().optional(),
    cta: z.string().optional(),
    notes: z.string().optional(),
    highlight: z.string().optional(),
  })
  .passthrough()

export const aiPresentationSchema = z
  .object({
    title: z.string().optional(),
    subtitle: z.string().optional(),
    slides: z.array(aiSlideSchema).optional(),
  })
  .passthrough()

export type AiSlideDraft = z.infer<typeof aiSlideSchema>
export type AiPresentationDraft = z.infer<typeof aiPresentationSchema>

/**
 * Ollama'nın `format` alanına verilen JSON Schema. Zod'dan otomatik türetmek yerine
 * elle yazıldı: modelin göreceği şema ne kadar küçük ve düz olursa yapısal çıktı o
 * kadar güvenilir oluyor (iç içe union'lar 8B'de bozulmaya yol açıyor).
 */
export function aiJsonSchema(slideCount: number): Record<string, unknown> {
  const str = { type: 'string' }
  const strArr = { type: 'array', items: str }
  const column = {
    type: 'object',
    properties: { heading: str, bullets: strArr },
    required: ['heading', 'bullets'],
  }
  return {
    type: 'object',
    properties: {
      title: str,
      subtitle: str,
      slides: {
        type: 'array',
        /*
         * `minItems` BİLİNÇLİ olarak yok.
         *
         * Şemaya asgari sayı koymak modeli o sayıya ulaşana kadar yazmaya
         * zorluyor; bağlam penceresi dolunca çıktı ortasından kesiliyor ve
         * TAMAMI geçersiz JSON oluyor. Ölçüldü: 8 ve 16 slayt sorunsuz, 25
         * slaytta "Model geçerli JSON döndürmedi" — ve o hata tüm üretimi
         * yerel taslağa düşürüp her slaydı aynı yer tutucuyla dolduruyordu.
         *
         * Sayı zaten istemde söyleniyor ve eksik kalırsa deterministik olarak
         * tamamlanıyor (bkz. frameworks.ts → alignToFramework). Az slayt, hiç
         * slayt olmamasından iyidir.
         */
        maxItems: LIMITS.slideCountMax,
        items: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: SLIDE_TYPES as unknown as string[] },
            title: str,
            subtitle: str,
            bullets: strArr,
            left: column,
            right: column,
            comparisonVerdict: str,
            stats: {
              type: 'array',
              items: {
                type: 'object',
                properties: { value: str, label: str, caption: str },
                required: ['value', 'label'],
              },
            },
            chart: {
              type: 'object',
              properties: {
                chartType: { type: 'string', enum: CHART_KINDS as unknown as string[] },
                unit: str,
                points: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: { label: str, value: { type: 'number' } },
                    required: ['label', 'value'],
                  },
                },
              },
              required: ['chartType', 'points'],
            },
            steps: {
              type: 'array',
              items: {
                type: 'object',
                properties: { label: str, title: str, description: str },
                required: ['title'],
              },
            },
            layers: {
              type: 'array',
              items: {
                type: 'object',
                properties: { name: str, nodes: strArr },
                required: ['name', 'nodes'],
              },
            },
            quote: {
              type: 'object',
              properties: { text: str, author: str, role: str },
              required: ['text'],
            },
            caption: str,
            cta: str,
            highlight: str,
            icon: { type: 'string', enum: SLIDE_GLYPHS as unknown as string[] },
            example: str,
          },
          required: ['type', 'title'],
        },
      },
    },
    required: ['title', 'slides'],
  }
}

/**
 * Tek slayt iyileştirmesi için şema (aynı gevşek slayt şekli).
 *
 * @param requireField Yalnızca bir üst-veri alanı yazdıran komutlarda
 *   ("notes", "highlight", "example") o alanın adı verilir ve şemada ZORUNLU
 *   kılınır. Ölçülen gerekçe: zayıf modeller "metni değiştirme" talimatını
 *   "hiçbir şey yazma" diye okuyup yalnızca {type, title} döndürebiliyor.
 *   Şemayı uygulayan sağlayıcılarda bu, alanın gelmesini garanti ediyor.
 */
/**
 * Slayt tipinin ZORUNLU içerik alanı.
 *
 * Tip önceden biliniyorsa (derin üretimde plandan geliyor) o tipin alanını
 * `required` yapmak, zayıf modellerin yalnızca `{type, title}` döndürmesini
 * engelliyor — ölçüldü: 7 slaytın 6'sı boş dönerken hepsi dolu döner hâle geldi.
 */
const CONTENT_FIELD: Partial<Record<SlideType, string[]>> = {
  content: ['bullets'],
  conclusion: ['bullets'],
  'two-column': ['left', 'right'],
  comparison: ['left', 'right'],
  statistics: ['stats'],
  chart: ['chart'],
  timeline: ['steps'],
  process: ['steps'],
  architecture: ['layers'],
  image: ['bullets'],
  quote: ['quote'],
}

export function aiSlideJsonSchema(
  requireField?: 'notes' | 'highlight' | 'example',
  forType?: SlideType,
): Record<string, unknown> {
  const full = aiJsonSchema(2) as { properties: { slides: { items: unknown } } }
  const item = full.properties.slides.items as Record<string, unknown>
  const contentRequired = forType ? (CONTENT_FIELD[forType] ?? []) : []
  if (!requireField && contentRequired.length === 0) return item
  const required = ((item.required as string[] | undefined) ?? []).concat(contentRequired)
  // `notes` deste şemasında bilinçli olarak YOK: her slayta konuşmacı notu
  // yazdırmak dar bütçeli sağlayıcılarda destenin kendisini yarıda bırakıyor.
  // Yalnızca not yazdıran komutta alan şemaya eklenir.
  const properties =
    requireField === 'notes'
      ? { ...(item.properties as Record<string, unknown>), notes: { type: 'string' } }
      : (item.properties as Record<string, unknown>)
  return { ...item, properties, required: requireField ? required.concat(requireField) : required }
}

/** Zod hatasını kullanıcıya gösterilebilir kısa tek satıra indirir. */
export function firstIssue(error: z.ZodError): string {
  const issue = error.issues[0]
  if (!issue) return 'validation-error'
  const path = issue.path.join('.')
  return path ? `${path}: ${issue.message}` : issue.message
}
