// AI çıktısı → sıkı alan modeli.
//
// Bu dosya "güven sınırı"dır: Ollama'dan gelen hiçbir alan doğrudan kullanılmaz.
// 8B'lik bir modelin tipik hataları burada sessizce onarılır:
//   · yanlış/uydurma slayt tipi           → tanınmıyorsa 'content'
//   · tipin gerektirdiği alanın boş olması → içerik dolu olan en yakın tipe düşülür
//   · markdown kalıntısı ("**", "- ", "## ") → temizlenir
//   · "Slayt 3:" gibi numara önekleri      → atılır
//   · sayı yerine "%45" metni              → sayıya çevrilir
//   · aynı maddenin tekrarı                → teklenir
//
// Sonuç HER ZAMAN `presentationSchema`dan geçebilecek bir nesnedir; render
// katmanı bu yüzden null kontrolü yapmak zorunda değildir.

import { LIMITS, type AiPresentationDraft, type AiSlideDraft } from '../schema'
import { defaultTemplate, resolveTemplate } from '../templates'
import { bulletsToChart } from '../transform'
import {
  clampNumber,
  isChartKind,
  isSlideGlyph,
  isSlideType,
  uid,
  type ArchLayer,
  type ChartPoint,
  type ColumnBlock,
  type GenerationRequest,
  type Presentation,
  type ProcessStep,
  type Slide,
  type SlideGlyph,
  type SlideType,
  type StatItem,
  type SunumLang,
  type TimelineStep,
} from '../types'

/* ================================ metin temizliği ================================ */

const BULLET_PREFIX = /^\s*(?:[-•*▪●–—]|\d+[.)]|[a-zçğıöşü][.)])\s+/i
const MD_HEADING = /^#{1,6}\s*/
const SLIDE_NUMBER = /^\s*(?:slayt|slide|sayfa|page)\s*\d+\s*[:.\-–]\s*/i

/** Markdown/numara kalıntılarını atar, boşlukları sıkıştırır ve uzunluğu sınırlar. */
function clean(value: unknown, max: number): string {
  if (typeof value !== 'string' && typeof value !== 'number') return ''
  let text = String(value)
    .replace(/\s+/g, ' ')
    .replace(MD_HEADING, '')
    .replace(SLIDE_NUMBER, '')
    .replace(BULLET_PREFIX, '')
    // Kalın/italik ve satır içi kod işaretleri.
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .trim()
  if (text.length > max) {
    // Kelime ortasından kesmemek için son boşluktan kırp.
    const cut = text.slice(0, max)
    const space = cut.lastIndexOf(' ')
    text = (space > max * 0.6 ? cut.slice(0, space) : cut).trim()
  }
  return text
}

/** Madde listesini temizler: boşları atar, tekrarı teker, en fazla `max` madde bırakır. */
function cleanBullets(value: unknown, max = LIMITS.bullets): string[] {
  const list = Array.isArray(value) ? value : []
  const out: string[] = []
  const seen: Record<string, true> = {}
  for (let i = 0; i < list.length && out.length < max; i++) {
    const text = clean(list[i], LIMITS.bullet)
    if (!text) continue
    const key = text.toLocaleLowerCase('tr-TR')
    if (seen[key]) continue
    seen[key] = true
    out.push(text)
  }
  return out
}

/** Bir metni cümlelere bölüp madde listesine çevirir (model bullets vermediğinde). */
function sentencesToBullets(text: string, max = 4): string[] {
  const parts = clean(text, LIMITS.description)
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12)
  return cleanBullets(parts.slice(0, max))
}

/** "%45", "45 kişi", "1.250" → 45 / 45 / 1250. Çözülemezse null. */
function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string') return null
  const match = value.replace(/\s/g, '').match(/-?\d+(?:[.,]\d+)?/)
  if (!match) return null
  const n = Number(match[0].replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/* ============================ tip başına içerik kurma ============================ */

function column(value: unknown, fallbackHeading: string): ColumnBlock {
  const src = (value && typeof value === 'object' ? value : {}) as { heading?: unknown; bullets?: unknown }
  return {
    heading: clean(src.heading, LIMITS.title) || fallbackHeading,
    bullets: cleanBullets(src.bullets),
  }
}

function stats(value: unknown): StatItem[] {
  const list = Array.isArray(value) ? value : []
  const out: StatItem[] = []
  for (let i = 0; i < list.length && out.length < LIMITS.stats; i++) {
    const raw = (list[i] || {}) as { value?: unknown; label?: unknown; caption?: unknown }
    const statValue = clean(raw.value, 24)
    const label = clean(raw.label, LIMITS.bullet)
    if (!statValue || !label) continue
    const caption = clean(raw.caption, LIMITS.bullet)
    out.push(caption ? { value: statValue, label, caption } : { value: statValue, label })
  }
  return out
}

function chartPoints(value: unknown): ChartPoint[] {
  const list = Array.isArray(value) ? value : []
  const out: ChartPoint[] = []
  for (let i = 0; i < list.length && out.length < LIMITS.chartPoints; i++) {
    const raw = (list[i] || {}) as { label?: unknown; value?: unknown }
    const label = clean(raw.label, 60)
    const num = toNumber(raw.value)
    if (!label || num === null) continue
    out.push({ label, value: num })
  }
  return out
}

function timelineSteps(value: unknown): TimelineStep[] {
  const list = Array.isArray(value) ? value : []
  const out: TimelineStep[] = []
  for (let i = 0; i < list.length && out.length < LIMITS.steps; i++) {
    const raw = (list[i] || {}) as { label?: unknown; title?: unknown; description?: unknown }
    const title = clean(raw.title, LIMITS.title)
    if (!title) continue
    const description = clean(raw.description, LIMITS.bullet)
    const step: TimelineStep = { label: clean(raw.label, 40), title }
    if (description) step.description = description
    out.push(step)
  }
  return out
}

function processSteps(value: unknown): ProcessStep[] {
  const list = Array.isArray(value) ? value : []
  const out: ProcessStep[] = []
  for (let i = 0; i < list.length && out.length < LIMITS.steps; i++) {
    const raw = (list[i] || {}) as { title?: unknown; label?: unknown; description?: unknown }
    const title = clean(raw.title, LIMITS.title) || clean(raw.label, LIMITS.title)
    if (!title) continue
    const description = clean(raw.description, LIMITS.bullet)
    out.push(description ? { title, description } : { title })
  }
  return out
}

function archLayers(value: unknown): ArchLayer[] {
  const list = Array.isArray(value) ? value : []
  const out: ArchLayer[] = []
  for (let i = 0; i < list.length && out.length < LIMITS.layers; i++) {
    const raw = (list[i] || {}) as { name?: unknown; nodes?: unknown }
    const name = clean(raw.name, LIMITS.title)
    if (!name) continue
    const nodes: string[] = []
    const rawNodes = Array.isArray(raw.nodes) ? raw.nodes : []
    for (let j = 0; j < rawNodes.length && nodes.length < LIMITS.nodes; j++) {
      const node = clean(rawNodes[j], 60)
      if (node) nodes.push(node)
    }
    out.push({ name, nodes })
  }
  return out.filter((l) => l.nodes.length > 0)
}

/**
 * Metindeki anahtar kelimeye göre simge seçer (harici görsel üretimi yok, §7).
 *
 * Sıra ÖNEMLİ: daha dar/özel kalıplar üstte durur, çünkü ilk eşleşme kazanır.
 * "veri tabanı" hem `database` hem `chart` kalıbına uyuyor; doğru olan ilki.
 */
const GLYPH_HINTS: { glyph: SlideGlyph; re: RegExp }[] = [
  { glyph: 'database', re: /veri ?taban|veri ?seti|database|dataset|sql|depolama|storage/i },
  { glyph: 'money', re: /maliyet|bütçe|fiyat|gelir|kâr|kar marj|yatırım|ekonomi|cost|budget|price|revenue|profit|invest|financ/i },
  { glyph: 'warning', re: /risk|tehdit|tehlike|sorun|zorluk|hata|engel|risk|threat|problem|challenge|failure|pitfall/i },
  { glyph: 'shield', re: /güvenlik|gizlilik|koruma|savunma|security|privacy|protection|defen[cs]e|compliance/i },
  { glyph: 'lock', re: /şifre|kimlik doğrula|yetki|kvkk|gdpr|encrypt|password|auth|permission/i },
  { glyph: 'scale', re: /hukuk|yasa|mevzuat|etik|adalet|düzenleme|legal|law|regulation|ethic|justice/i },
  { glyph: 'health', re: /sağlık|hasta|tedavi|tıp|klinik|health|patient|medical|clinic|therap/i },
  { glyph: 'leaf', re: /çevre|sürdürüleb|iklim|yeşil|karbon|doğa|environment|sustainab|climate|green|carbon/i },
  { glyph: 'energy', re: /enerji|elektrik|güç tüketim|yakıt|energy|electric|power consum|fuel/i },
  { glyph: 'flask', re: /deney|araştırma yöntem|laborat|hipotez|bilimsel|experiment|laborator|hypothes|scientific/i },
  { glyph: 'search', re: /araştırma|inceleme|analiz|keşif|bulgu|research|analysis|discovery|finding|audit/i },
  { glyph: 'growth', re: /büyüme|artış|gelişim|ilerleme|trend|growth|increase|improv|progress|scal/i },
  { glyph: 'chart', re: /veri|ölçüm|rapor|oran|istatistik|data|metric|report|ratio|statistic/i },
  { glyph: 'globe', re: /küresel|dünya|uluslararası|global|world|international|ülke|country/i },
  { glyph: 'rocket', re: /başlangıç|lansman|girişim|hızlan|startup|launch|accelerat|kickoff/i },
  { glyph: 'network', re: /ağ|bağlantı|entegrasyon|dağıtık|network|connection|integration|distributed|mesh/i },
  { glyph: 'cloud', re: /bulut|altyapı|sunucu|cloud|infra|server|deploy|hosting/i },
  { glyph: 'mobile', re: /mobil|telefon|uygulama arayüz|ios|android|mobile|phone|app store/i },
  { glyph: 'code', re: /kod|yazılım|api|geliştir|programlama|code|software|develop|programming/i },
  { glyph: 'layers', re: /katman|mimari|yapı taşı|bileşen|layer|architecture|component|stack|module/i },
  { glyph: 'gear', re: /süreç|otomas|yapılandır|işleyiş|process|automation|config|operat|workflow/i },
  { glyph: 'users', re: /kullanıcı|müşteri|ekip|öğrenci|insan|topluluk|user|team|customer|people|communit/i },
  { glyph: 'message', re: /iletişim|geri bildirim|anket|görüşme|communication|feedback|survey|interview/i },
  { glyph: 'target', re: /hedef|amaç|strateji|öncelik|goal|target|strategy|objective|priorit/i },
  { glyph: 'check', re: /çözüm|avantaj|fayda|kazanım|başarı|öneri|solution|benefit|advantage|success|recommend/i },
  { glyph: 'star', re: /kalite|en iyi|örnek uygulama|standart|quality|best practice|standard|excellence/i },
  { glyph: 'calendar', re: /takvim|yol haritası|tarih|dönem|çeyrek|calendar|roadmap|schedule|quarter|milestone/i },
  { glyph: 'clock', re: /zaman|süre|gecikme|hız|time|duration|latency|delay|speed/i },
  { glyph: 'book', re: /eğitim|ders|kaynak|literatür|tanım|tarihçe|education|course|reference|literature|definition|history/i },
]

/**
 * Simgeyi seçer. Modelin verdiği etiket geçerliyse o kullanılır; değilse metinden
 * çıkarılır. Her slaytın bir simgesi OLUR — "ikon yok" durumu bilinçli olarak yok,
 * çünkü boş bırakılan rozet düzeni bozuyor ve deste tekdüze görünüyor.
 */
function pickGlyph(value: unknown, text: string): SlideGlyph {
  if (isSlideGlyph(value)) return value
  for (let i = 0; i < GLYPH_HINTS.length; i++) {
    if (GLYPH_HINTS[i].re.test(text)) return GLYPH_HINTS[i].glyph
  }
  return 'idea'
}

/* ================================ slayt kurma ================================ */

export const FALLBACK_TITLE = { tr: 'Başlıksız slayt', en: 'Untitled slide' } as const
const COLUMN_FALLBACK = {
  tr: { left: 'Öne çıkanlar', right: 'Dikkat edilecekler' },
  en: { left: 'Highlights', right: 'Watch-outs' },
} as const

/**
 * Tek bir AI slaytını modele çevirir.
 *
 * `preferredType` istenen tipi zorlamak için kullanılır (AI komutu "grafiğe çevir"
 * dediğinde model tipi değiştirmeyi unutursa). İçerik o tipe yetmiyorsa fonksiyon
 * kendiliğinden içeriğin taşıdığı en yakın tipe düşer — böylece boş bir "chart"
 * slaytı yerine dolu bir "content" slaytı çıkar.
 */
export function normalizeSlide(
  draft: AiSlideDraft,
  ctx: {
    presentationId: string
    order: number
    lang: SunumLang
    /** Var olan slaytın kimliği/şablonu korunacaksa verilir (AI iyileştirmesi). */
    existing?: Slide
    preferredType?: SlideType
  },
): Slide {
  const lang = ctx.lang

  // Model `content` sarmalayıcısı koyduysa (şemaya rağmen olabiliyor) alanları yukarı çek.
  const flat = flatten(draft)

  let type: SlideType = ctx.preferredType
    ? ctx.preferredType
    : isSlideType(flat.type)
      ? flat.type
      : ctx.existing?.type ?? 'content'

  // Alıntı slaytında başlık BASILMAZ; boş kalması normaldir, yer tutucu uydurulmaz.
  const fallbackTitle = type === 'quote' ? '' : FALLBACK_TITLE[lang]
  const title = clean(draft.title, LIMITS.title) || ctx.existing?.title || fallbackTitle
  const subtitle = clean(draft.subtitle, LIMITS.subtitle)
  // İyileştirme (refine) akışında model yalnızca istenen alanı yazıyor; yazmadığı
  // alanı "silinmiş" saymak kullanıcının notunu ve örneğini kaybettiriyordu.
  // Bu yüzden boş gelen yardımcı alanlar VAR OLAN değere geri düşer.
  const notes = clean(draft.notes, LIMITS.notes) || ctx.existing?.notes || ''
  const highlight = clean(flat.highlight, LIMITS.bullet) || ctx.existing?.highlight || ''
  const example = clean(flat.example, LIMITS.example) || ctx.existing?.example || ''

  // Ortak havuzlar: tip düşüşlerinde tekrar hesaplanmasın.
  const bullets = cleanBullets(flat.bullets)
  const left = column(flat.left, COLUMN_FALLBACK[lang].left)
  const right = column(flat.right, COLUMN_FALLBACK[lang].right)
  const caption = clean(flat.caption, LIMITS.bullet)

  /** İçerik slaytı için en iyi madde listesi: bullets → iki sütun → alt başlık. */
  const anyBullets = (): string[] => {
    if (bullets.length > 0) return bullets
    const merged = cleanBullets(left.bullets.concat(right.bullets))
    if (merged.length > 0) return merged
    const fromText = sentencesToBullets(subtitle || caption || title)
    if (fromText.length > 0) return fromText
    // Son çare: başlığın kendisi. Başlık da boşsa madde listesi boş kalır
    // (şema boş listeyi kabul eder; şablon o zaman yalnızca başlığı basar).
    return title ? [title] : []
  }

  // Simge metnin TAMAMINDAN seçilir, yalnızca başlıktan değil: "Riskler" gibi
  // tek kelimelik başlıklar ipucu vermiyor, maddeler veriyor.
  const iconText = [title, subtitle, highlight, bullets.join(' '), caption].join(' ')

  const base = {
    id: ctx.existing?.id ?? uid('sl'),
    presentationId: ctx.presentationId,
    order: ctx.order,
    title,
    subtitle: subtitle || undefined,
    notes: notes || undefined,
    highlight: highlight || undefined,
    // Kullanıcı simgeyi elle değiştirmiş olabilir; model yeni bir ad vermediyse
    // çıkarıma değil o seçime dönülür.
    icon: isSlideGlyph(flat.icon) ? flat.icon : ctx.existing?.icon ?? pickGlyph(undefined, iconText),
    example: example || undefined,
    // Görseli KULLANICI koyuyor, model değil: iyileştirme sırasında korunmalı.
    // Aksi hâlde "metni kısalt" demek slayttaki görseli siliyordu.
    media: ctx.existing?.media,
  }

  /** Tip değişmediyse kullanıcının şablonu korunur; değiştiyse tipin varsayılanı. */
  const pickTemplate = (t: SlideType): string => {
    const wanted = ctx.existing && ctx.existing.type === t ? ctx.existing.template : defaultTemplate(t)
    return resolveTemplate(t, wanted)
  }

  switch (type) {
    case 'title':
      return {
        ...base,
        type: 'title',
        template: pickTemplate('title'),
        content: {
          presenter: clean(flat.presenter, LIMITS.title) || undefined,
          context: clean(flat.context, LIMITS.title) || undefined,
        },
      }

    case 'two-column':
    case 'comparison': {
      // İki sütundan biri boşsa maddeleri ikiye bölerek dengelenir.
      let l = left
      let r = right
      if (l.bullets.length === 0 || r.bullets.length === 0) {
        const all = anyBullets()
        if (all.length < 2) break // içerik iki sütuna yetmiyor → content'e düş
        const mid = Math.ceil(all.length / 2)
        l = { heading: l.heading, bullets: all.slice(0, mid) }
        r = { heading: r.heading, bullets: all.slice(mid) }
      }
      if (type === 'comparison') {
        const verdict = clean(flat.comparisonVerdict ?? flat.verdict, LIMITS.bullet)
        return {
          ...base,
          type: 'comparison',
          template: pickTemplate('comparison'),
          content: { left: l, right: r, verdict: verdict || undefined },
        }
      }
      return { ...base, type: 'two-column', template: pickTemplate('two-column'), content: { left: l, right: r } }
    }

    case 'statistics': {
      const items = stats(flat.stats)
      if (items.length === 0) break
      const footnote = clean(flat.footnote, LIMITS.bullet)
      return {
        ...base,
        type: 'statistics',
        template: pickTemplate('statistics'),
        content: { stats: items, footnote: footnote || undefined },
      }
    }

    case 'chart': {
      const chart = (flat.chart && typeof flat.chart === 'object' ? flat.chart : {}) as {
        chartType?: unknown
        points?: unknown
        unit?: unknown
      }
      let points = chartPoints(chart.points ?? flat.points)
      let fallbackUnit: string | undefined
      // Model veriyi madde olarak yazdıysa ("Etiket: %45") sayıları oradan çıkar
      // (aynı dönüşüm kalite kontrolünün otomatik düzeltmesinde de kullanılıyor).
      if (points.length < 2) {
        const fromBullets = bulletsToChart(bullets)
        if (fromBullets) {
          points = fromBullets.points
          fallbackUnit = fromBullets.unit
        }
      }
      // Hâlâ iki noktadan az: sayısal veri varsa istatistiğe, yoksa içeriğe düşülür.
      if (points.length < 2) {
        const items = stats(flat.stats)
        if (items.length > 0) {
          return {
            ...base,
            type: 'statistics',
            template: pickTemplate('statistics'),
            content: { stats: items },
          }
        }
        break
      }
      const unit = clean(chart.unit ?? flat.unit, 16) || fallbackUnit || ''
      return {
        ...base,
        type: 'chart',
        template: pickTemplate('chart'),
        content: {
          chartType: isChartKind(chart.chartType) ? chart.chartType : 'bar',
          points,
          unit: unit || undefined,
          caption: caption || undefined,
        },
      }
    }

    case 'timeline': {
      const steps = timelineSteps(flat.steps)
      if (steps.length < 2) break
      return { ...base, type: 'timeline', template: pickTemplate('timeline'), content: { steps } }
    }

    case 'process': {
      const steps = processSteps(flat.steps)
      if (steps.length >= 2) {
        return { ...base, type: 'process', template: pickTemplate('process'), content: { steps } }
      }
      // Model adımları madde olarak yazdıysa maddeleri adıma çevir.
      const fromBullets = anyBullets()
      if (fromBullets.length >= 2) {
        return {
          ...base,
          type: 'process',
          template: pickTemplate('process'),
          content: { steps: fromBullets.slice(0, LIMITS.steps).map((title) => ({ title })) },
        }
      }
      break
    }

    case 'architecture': {
      const layers = archLayers(flat.layers)
      if (layers.length === 0) break
      const note = clean(flat.note, LIMITS.bullet)
      return {
        ...base,
        type: 'architecture',
        template: pickTemplate('architecture'),
        content: { layers, note: note || undefined },
      }
    }

    case 'image':
      return {
        ...base,
        type: 'image',
        template: pickTemplate('image'),
        content: {
          glyph: pickGlyph(flat.glyph, `${title} ${subtitle}`),
          bullets: bullets.length > 0 ? bullets : [],
          caption: caption || undefined,
          src: undefined,
        },
      }

    case 'quote': {
      const quote = (flat.quote && typeof flat.quote === 'object' ? flat.quote : {}) as {
        text?: unknown
        author?: unknown
        role?: unknown
      }
      const text = clean(quote.text ?? flat.text, 600) || (bullets.length > 0 ? bullets[0] : '')
      if (!text) break
      return {
        ...base,
        type: 'quote',
        template: pickTemplate('quote'),
        content: {
          text,
          author: clean(quote.author ?? flat.author, LIMITS.title) || undefined,
          role: clean(quote.role ?? flat.role, LIMITS.title) || undefined,
        },
      }
    }

    case 'conclusion': {
      const cta = clean(flat.cta, LIMITS.bullet)
      return {
        ...base,
        type: 'conclusion',
        template: pickTemplate('conclusion'),
        content: { bullets: anyBullets(), cta: cta || undefined },
      }
    }

    case 'content':
      break

    default: {
      const exhaustive: never = type
      void exhaustive
    }
  }

  // Buraya düşen her durum: içerik slaytı (her zaman render edilebilir).
  type = 'content'
  return {
    ...base,
    type: 'content',
    template: pickTemplate('content'),
    content: { bullets: anyBullets() },
  }
}

/**
 * Şemaya rağmen `{ content: {...} }` sarmalayıcısı geldiyse alanları tek düzleme indirir.
 * Sarmalayıcı yoksa nesne olduğu gibi kullanılır.
 */
function flatten(draft: AiSlideDraft): Record<string, unknown> {
  const raw = draft as unknown as Record<string, unknown>
  const inner = raw.content
  if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
    return { ...(inner as Record<string, unknown>), ...raw, content: undefined }
  }
  return raw
}

/**
 * Slaytın İÇERİK taşıyıp taşımadığını söyler.
 *
 * Zayıf modeller bazen önce `{type, title}` kabuğu, hemen ardından aynı tipin
 * dolu hâlini üretiyor. Başlıktan ibaret bir slayt zaten sunulabilir değil —
 * kaynağı ne olursa olsun elenir. Kapak ve alıntı istisnadır: onların içeriği
 * zaten başlık/alıntı metnidir.
 */
function hasSubstance(draft: AiSlideDraft): boolean {
  const flat = flatten(draft)
  if (flat.type === 'title') return true
  if (flat.type === 'quote') {
    const quote = (flat.quote && typeof flat.quote === 'object' ? flat.quote : {}) as { text?: unknown }
    return typeof (quote.text ?? flat.text) === 'string'
  }

  const bearers = ['bullets', 'stats', 'steps', 'layers', 'left', 'right', 'chart', 'points', 'cta', 'caption']
  for (let i = 0; i < bearers.length; i++) {
    const value = flat[bearers[i]]
    if (Array.isArray(value) ? value.length > 0 : value !== undefined && value !== null && value !== '') return true
  }
  return false
}

/* ================================ sunum kurma ================================ */

const COVER_SUBTITLE = {
  tr: (n: number) => `${n} dakikalık sunum`,
  en: (n: number) => `${n}-minute talk`,
} as const

/**
 * Tüm taslağı sunuma çevirir.
 *
 * Kapak garantisi: ilk slayt 'title' değilse başa kapak eklenir — kullanıcı her
 * zaman sunulabilir bir deste alır. İstenen slayt sayısı aşılırsa SONDAN kırpılır
 * (kapanış slaytı korunur). Eksik kalırsa doldurulmaz: dolgu slaytı sunumu
 * zayıflatır, kullanıcı editörde istediği kadar slayt ekleyebilir.
 */
export function normalizePresentation(
  draft: AiPresentationDraft,
  req: GenerationRequest,
  meta: { id?: string; source?: 'ai' | 'outline' } = {},
): Presentation {
  const id = meta.id || uid('p')
  const lang = req.language
  const title = clean(draft.title, LIMITS.title) || clean(req.topic, LIMITS.title)
  const subtitle = clean(draft.subtitle, LIMITS.subtitle)

  const drafts = Array.isArray(draft.slides) ? draft.slides : []
  // Kabuk slaytlar elenir; hiçbiri dolu değilse eleme yapılmaz (zayıf da olsa
  // bir deste, boş bir desteden iyidir).
  const substantial = drafts.filter(hasSubstance)
  const usable = substantial.length >= 2 ? substantial : drafts

  let slides: Slide[] = []
  for (let i = 0; i < usable.length && slides.length < LIMITS.slides; i++) {
    slides.push(normalizeSlide(usable[i], { presentationId: id, order: slides.length, lang }))
  }

  if (slides.length === 0 || slides[0].type !== 'title') {
    slides = [
      normalizeSlide(
        { type: 'title', title, subtitle: subtitle || COVER_SUBTITLE[lang](req.durationMinutes) },
        { presentationId: id, order: 0, lang },
      ),
    ].concat(slides)
  }

  // Fazla slayt: kapanışı koruyarak sondan bir önceki slaytlardan kırp.
  const max = Math.min(req.slideCount, LIMITS.slides)
  if (slides.length > max) {
    const last = slides[slides.length - 1]
    const keepsClosing = last.type === 'conclusion'
    slides = keepsClosing ? slides.slice(0, max - 1).concat([last]) : slides.slice(0, max)
  }

  const now = new Date().toISOString()
  return {
    id,
    title,
    subtitle: subtitle || undefined,
    description: clean(req.topic, LIMITS.description) || undefined,
    audience: req.audience,
    durationMinutes: clampNumber(req.durationMinutes, LIMITS.durationMin, LIMITS.durationMax, 10),
    theme: req.theme,
    language: lang,
    tone: req.tone,
    // Beklenti sunumla birlikte saklanır: koç paneli ve yeniden üretim kullanır.
    requirements: req.requirements,
    visual: req.visual,
    // Koç paneli destenin hangi iskeletle üretildiğini bilmeli.
    framework: req.framework,
    createdAt: now,
    updatedAt: now,
    source: meta.source || 'ai',
    slides: slides.map((s, i) => ({ ...s, order: i })),
  }
}
