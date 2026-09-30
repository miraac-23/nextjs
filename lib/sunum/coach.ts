// Sunum koçu — hazırlık denetimi, süre planı ve kullanıcı isteklerinin takibi.
//
// Kalite panelinden (decide/quality.ts) farkı: orası SLAYTIN kendisini denetler
// (taşma, kontrast, görsel biçim). Burası SUNUMU YAPACAK KİŞİYE bakar:
//   · Ne eksik kalmış? (sunan adı, konuşmacı notu, kaynak, kapanış)
//   · Süre tutar mı? (metinden konuşma süresi tahmini)
//   · Kullanıcının yazdığı istekler karşılanmış mı?
//
// Tamamen deterministiktir: AI çağrısı yapmaz, aynı sunum her zaman aynı raporu
// üretir. AI gerektiren tek eylem (konuşmacı notu yazdırma) panelden mevcut
// refine komutuna devredilir.

import { slideText } from './transform'
import { textLoad } from './decide/local'
import { guessVisualForm } from './decide/local'
import type { Presentation, Slide, SlideType, SunumLang } from './types'

/** Slide Engine'in görsel (madde listesi olmayan) slayt tipleri. */
export const VISUAL_TYPES: SlideType[] = [
  'statistics',
  'chart',
  'process',
  'timeline',
  'comparison',
  'architecture',
]

/** Görsel biçim önerisi → o dönüşümü yapan AI komutu. */
export const VISUAL_ACTION: Record<string, string> = {
  chart: 'toChart',
  statistics: 'toStats',
  process: 'toProcess',
  timeline: 'toTimeline',
  comparison: 'toComparison',
  architecture: 'toArchitecture',
}

/**
 * Görselleştirilebilecek içerik slaytları: yerel sezgi onlara görsel bir biçim
 * öneriyor ama slayt hâlâ düz madde listesi.
 */
export function visualizableSlides(presentation: Presentation): { slide: Slide; action: string }[] {
  const out: { slide: Slide; action: string }[] = []
  presentation.slides.forEach((slide) => {
    if (slide.type !== 'content') return
    const action = VISUAL_ACTION[guessVisualForm(slide)]
    if (action) out.push({ slide, action })
  })
  return out
}

/* ================================ süre tahmini ================================ */

/**
 * Konuşma hızı (kelime/dakika). Sunum konuşması serbest sohbetten yavaştır;
 * 130 hem Türkçe hem İngilizce için makul bir orta değer.
 */
const WORDS_PER_MINUTE = 130
/** Slayt geçişi, nefes, soru için slayt başına sabit pay (saniye). */
const PER_SLIDE_OVERHEAD_S = 6
/** Hedeften bu oranda sapma uyarı üretir. */
const TIMING_TOLERANCE = 0.25

function wordCount(text: string): number {
  const trimmed = text.trim()
  return trimmed ? trimmed.split(/\s+/).length : 0
}

/**
 * Slaytın konuşma süresi (saniye).
 *
 * Konuşmacı notu varsa SÜREYİ O belirler — sunucu slaytı okumaz, notu anlatır.
 * Not yoksa slayt metninden tahmin edilir ve biraz yukarı yuvarlanır (kimse
 * slaytta yazanı aynen okumaz, üstüne konuşur).
 */
export function slideSeconds(slide: Slide): number {
  const spoken = slide.notes ? wordCount(slide.notes) : wordCount(slideText(slide)) * 1.6
  return Math.round((spoken / WORDS_PER_MINUTE) * 60) + PER_SLIDE_OVERHEAD_S
}

export type Timing = {
  /** Tahmini toplam konuşma süresi (dakika). */
  estimatedMinutes: number
  targetMinutes: number
  /** 'ok' | 'over' (uzun) | 'under' (kısa) */
  verdict: 'ok' | 'over' | 'under'
  /** Slayt kimliği → önerilen süre (saniye). */
  perSlide: Record<string, number>
  /** En uzun slayt — sunucunun orada yavaşlaması gerekir. */
  heaviestId: string | null
}

export function planTiming(presentation: Presentation): Timing {
  const perSlide: Record<string, number> = {}
  let total = 0
  let heaviestId: string | null = null
  let heaviest = 0

  presentation.slides.forEach((slide) => {
    const seconds = slideSeconds(slide)
    perSlide[slide.id] = seconds
    total += seconds
    if (seconds > heaviest) {
      heaviest = seconds
      heaviestId = slide.id
    }
  })

  const estimatedMinutes = Math.round((total / 60) * 10) / 10
  const target = presentation.durationMinutes
  const drift = (estimatedMinutes - target) / Math.max(1, target)

  return {
    estimatedMinutes,
    targetMinutes: target,
    verdict: drift > TIMING_TOLERANCE ? 'over' : drift < -TIMING_TOLERANCE ? 'under' : 'ok',
    perSlide,
    heaviestId,
  }
}

/* ============================= tamamlama istekleri ============================= */

export type CoachCode =
  | 'presenter-missing'
  | 'context-missing'
  | 'notes-missing'
  | 'highlight-missing'
  | 'example-missing'
  | 'no-conclusion'
  | 'image-placeholder'
  | 'flat-chart'
  | 'timing-over'
  | 'timing-under'
  | 'few-visuals'

export type CoachItem = {
  code: CoachCode
  /** Hangi slayt? Deste geneli maddelerde boş. */
  slideId?: string
  index?: number
  /** Kaç slaytı ilgilendiriyor (ör. "7 slaytta not yok"). */
  count?: number
  detail?: string
  /** Panelden tetiklenebilecek eylem. */
  action?: 'write-notes' | 'write-highlights' | 'write-examples' | 'visualize' | 'go'
}

/** Slaytın anlatılacak içeriği var mı? Kapak ve alıntı doğal olarak kısadır. */
function needsNotes(slide: Slide): boolean {
  return slide.type !== 'title' && slide.type !== 'quote'
}

export function buildCoachItems(presentation: Presentation, timing: Timing): CoachItem[] {
  const items: CoachItem[] = []
  const slides = presentation.slides

  /* ------------------------------ kapak bilgileri ------------------------------ */
  const cover = slides.find((s) => s.type === 'title')
  if (cover && cover.type === 'title') {
    if (!cover.content.presenter) {
      items.push({ code: 'presenter-missing', slideId: cover.id, index: slides.indexOf(cover), action: 'go' })
    }
    if (!cover.content.context) {
      items.push({ code: 'context-missing', slideId: cover.id, index: slides.indexOf(cover), action: 'go' })
    }
  }

  /* -------------------------------- konuşma notu -------------------------------- */
  const withoutNotes = slides.filter((s) => needsNotes(s) && !s.notes)
  if (withoutNotes.length > 0) {
    items.push({
      code: 'notes-missing',
      count: withoutNotes.length,
      slideId: withoutNotes[0].id,
      index: slides.indexOf(withoutNotes[0]),
      action: 'write-notes',
    })
  }

  const withoutHighlight = slides.filter((s) => needsNotes(s) && !s.highlight)
  if (withoutHighlight.length >= Math.max(2, Math.ceil(slides.length / 2))) {
    items.push({
      code: 'highlight-missing',
      count: withoutHighlight.length,
      slideId: withoutHighlight[0].id,
      index: slides.indexOf(withoutHighlight[0]),
      action: 'write-highlights',
    })
  }

  // Somut örnek: konudan (kaynak dokümanı olmadan) üretilen sunumlarda içeriğin
  // soyut kalma riski en yüksek yer burası. Eşik yarıdan fazlası: birkaç slaytta
  // örnek olmaması doğaldır, çoğunda olmaması destenin tamamını soyut bırakır.
  const withoutExample = slides.filter((s) => needsNotes(s) && !s.example)
  if (withoutExample.length >= Math.max(2, Math.ceil(slides.length / 2))) {
    items.push({
      code: 'example-missing',
      count: withoutExample.length,
      slideId: withoutExample[0].id,
      index: slides.indexOf(withoutExample[0]),
      action: 'write-examples',
    })
  }

  /* --------------------------------- yapı ---------------------------------- */
  if (slides.length > 2 && slides[slides.length - 1].type !== 'conclusion') {
    items.push({ code: 'no-conclusion' })
  }

  slides.forEach((slide, index) => {
    if (slide.type === 'image' && !slide.content.src) {
      items.push({ code: 'image-placeholder', slideId: slide.id, index, action: 'go' })
    }
    // Tüm değerleri aynı ya da sıfır olan bir grafik hiçbir şey anlatmaz.
    if (slide.type === 'chart') {
      const values = slide.content.points.map((p) => p.value)
      const allSame = values.length > 0 && values.every((v) => v === values[0])
      if (allSame) items.push({ code: 'flat-chart', slideId: slide.id, index, action: 'go' })
    }
  })

  /* ------------------------------ görsel yoğunluk ------------------------------ */

  // Madde listesinden ibaret bir deste dinleyiciyi kaybettiriyor. Ortadaki
  // slaytların en az üçte biri görsel olmalı; değilse dönüştürülebilecekleri öner.
  const middle = Math.max(1, slides.length - 2)
  const visualCount = slides.filter((s) => VISUAL_TYPES.indexOf(s.type) >= 0).length
  const convertible = visualizableSlides(presentation)
  if (visualCount < Math.ceil(middle / 3) && convertible.length > 0) {
    items.push({
      code: 'few-visuals',
      count: convertible.length,
      detail: `${visualCount}/${slides.length}`,
      slideId: convertible[0].slide.id,
      action: 'visualize',
    })
  }

  /* --------------------------------- süre ---------------------------------- */
  if (timing.verdict === 'over') {
    items.push({
      code: 'timing-over',
      detail: `${timing.estimatedMinutes} / ${timing.targetMinutes}`,
      slideId: timing.heaviestId ?? undefined,
      action: timing.heaviestId ? 'go' : undefined,
    })
  } else if (timing.verdict === 'under') {
    items.push({ code: 'timing-under', detail: `${timing.estimatedMinutes} / ${timing.targetMinutes}` })
  }

  return items
}

/* ============================ kullanıcı istekleri ============================ */

export type RequirementStatus = 'met' | 'missing' | 'manual'

export type RequirementCheck = {
  text: string
  status: RequirementStatus
  /** Karşılanmamışsa: eklenince isteği karşılayacak slayt tipi. */
  suggests?: SlideType
  /** Eklenecek slaytın başlığı — metin aranarak denetlenen isteklerde zorunlu. */
  seedTitle?: string
}

/**
 * İstek satırını yapısal bir koşula bağlayan desenler.
 *
 * Yalnızca DOĞRULANABİLİR istekler kontrol edilir; gerisi "elle kontrol et"
 * olarak işaretlenir. Doğrulayamadığımız bir isteği "karşılandı" saymak
 * kullanıcıyı yanıltırdı.
 */
/**
 * Bazı istekler METİN aranarak denetleniyor ("kaynakça var mı?"). Böyle bir
 * istek için boş bir slayt eklemek yetmez — eklenen slaytın BAŞLIĞI da o metni
 * taşımalı, yoksa denetim yine "yok" der. `seed` bu başlığı verir.
 */
const SEED_TITLES = {
  tr: { sources: 'Kaynakça', qa: 'Sorular' },
  en: { sources: 'Sources', qa: 'Questions' },
} as const

type SeedKey = keyof (typeof SEED_TITLES)['tr']

/**
 * `suggests`: istek karşılanmamışsa hangi slayt tipini eklemek onu karşılar?
 * Bu sayede "Zaman çizelgesi ekle" isteği tek tıkla gerçek bir slayda dönüşüyor —
 * modelin isteği atlaması kullanıcıyı çıkmaza sokmuyor.
 */
const REQUIREMENT_RULES: {
  re: RegExp
  test: (p: Presentation, text: string) => boolean
  suggests?: SlideType
  seed?: SeedKey
}[] = [
  {
    re: /grafik|chart|görselleştir|visuali[sz]/i,
    test: (p) => p.slides.some((s) => s.type === 'chart'),
    suggests: 'chart',
  },
  {
    re: /sayı|rakam|istatistik|veri|kanıt|number|statistic|data|prove/i,
    test: (p) => p.slides.some((s) => s.type === 'statistics' || s.type === 'chart'),
    suggests: 'statistics',
  },
  {
    re: /süreç|diyagram|akış|adım|process|diagram|flow|step/i,
    test: (p) => p.slides.some((s) => s.type === 'process' || s.type === 'architecture'),
    suggests: 'process',
  },
  {
    re: /zaman çizelgesi|takvim|yol haritası|timeline|roadmap/i,
    test: (p) => p.slides.some((s) => s.type === 'timeline'),
    suggests: 'timeline',
  },
  {
    re: /karşılaştır|compar|vs\b/i,
    test: (p) => p.slides.some((s) => s.type === 'comparison' || s.type === 'two-column'),
    suggests: 'comparison',
  },
  {
    re: /kaynak|referans|source|reference|bibliograph/i,
    test: (p) => deckText(p).search(/kaynak|referans|source|reference/i) >= 0,
    suggests: 'content',
    seed: 'sources',
  },
  {
    re: /örnek|vaka|example|case/i,
    test: (p) => deckText(p).search(/örne|örnek|vaka|example|case|için:|gibi/i) >= 0,
  },
  {
    re: /alıntı|quote/i,
    test: (p) => p.slides.some((s) => s.type === 'quote'),
    suggests: 'quote',
  },
  {
    re: /kısa|öz|sade|short|concise|brief/i,
    // "Kısa olsun" → hiçbir slayt metin bütçesini aşmamalı.
    test: (p) => p.slides.every((s) => textLoad(s).ratio <= 1),
  },
  {
    re: /soru|q&a|question/i,
    test: (p) => deckText(p).search(/soru|question|q&a/i) >= 0,
    suggests: 'content',
    seed: 'qa',
  },
]

function deckText(presentation: Presentation): string {
  return presentation.slides.map(slideText).join('\n')
}

/** Kullanıcının yazdığı her isteği ayrı ayrı denetler. */
export function checkRequirements(presentation: Presentation): RequirementCheck[] {
  const raw = (presentation.requirements ?? '').trim()
  if (!raw) return []

  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length >= 3)
    .slice(0, 12)
    .map((text) => {
      const rule = REQUIREMENT_RULES.find((r) => r.re.test(text))
      if (!rule) return { text, status: 'manual' as const }
      if (rule.test(presentation, text)) return { text, status: 'met' as const }
      return {
        text,
        status: 'missing' as const,
        suggests: rule.suggests,
        seedTitle: rule.seed ? SEED_TITLES[presentation.language][rule.seed] : undefined,
      }
    })
}

/* ================================== rapor ================================== */

export type CoachReport = {
  timing: Timing
  items: CoachItem[]
  requirements: RequirementCheck[]
  /** 0–100: hazırlık ne kadar tamam? */
  readiness: number
}

export function buildCoachReport(presentation: Presentation): CoachReport {
  const timing = planTiming(presentation)
  const items = buildCoachItems(presentation, timing)
  const requirements = checkRequirements(presentation)

  // Hazırlık puanı: eksik her madde ve karşılanmamış her istek puan düşürür.
  const unmet = requirements.filter((r) => r.status === 'missing').length
  const readiness = Math.max(0, Math.min(100, 100 - items.length * 9 - unmet * 8))

  return { timing, items, requirements, readiness }
}

/** Saniyeyi "2:30" biçiminde yazar. */
export function formatSeconds(seconds: number, _lang: SunumLang = 'tr'): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
