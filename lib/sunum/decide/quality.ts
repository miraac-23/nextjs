// Otomatik slayt kalite kontrolü (§25).
//
// İki kaynak birleşir:
//   ÖLÇÜM  → deterministik (karakter sayısı, madde sayısı, kontrast, şablon tekrarı).
//            Bunlar için modele sormak hem gereksiz hem güvenilmez olurdu.
//   YARGI  → karar katmanı (Jev varsa Jev, yoksa yerel sezgi): görsel biçim,
//            yoğunluk hissi, başlık netliği.
//
// Çıktı: her bulgunun NE olduğu, NE KADAR ciddi olduğu, KİM söylediği ve —
// mümkünse — TEK TIKLA nasıl düzeltileceği. Kullanıcıya "sunumun kötü" demek
// yerine uygulanabilir bir eylem veriyoruz.
//
// Bu dosya saftır: ağ çağrısı yapmaz, yanıtları dışarıdan alır.

import { contrastRatio, getTheme } from '../themes'
import {
  bulletsToChart,
  bulletsToProcess,
  bulletsToStats,
  rotateTemplate,
  slideBullets,
  splitContentSlide,
  trimTitle,
} from '../transform'
import { defaultTemplate } from '../templates'
import { reindex, type Presentation, type Slide, type SlideType } from '../types'
import { textLoad } from './local'
import { readVerdicts, type SlideVerdict, type VisualForm } from './questions'
import type { Answer, DecisionSource } from './types'

export type IssueCode =
  | 'title-long'
  | 'too-many-bullets'
  | 'bullet-long'
  | 'overflow'
  | 'empty'
  | 'template-repeat'
  | 'contrast'
  | 'monotone'
  | 'dense'
  | 'unclear'
  | 'visual-mismatch'

export type IssueSeverity = 'error' | 'warn' | 'info'

/** Tek tıkla uygulanabilen düzeltmeler. 'none' → kullanıcı elle ya da AI ile düzeltir. */
export type FixKind = 'split' | 'trim-title' | 'to-chart' | 'to-stats' | 'to-process' | 'retemplate' | 'none'

export type SlideIssue = {
  /** Deste geneli bulgularda boş. */
  slideId: string
  index: number
  code: IssueCode
  severity: IssueSeverity
  /** Bulguyu kim çıkardı: ölçüm mü, model mi? Arayüz bunu rozetle gösterir. */
  by: 'rule' | 'ai'
  fix: FixKind
  /** Bulguyu somutlaştıran ölçü (ör. "9 madde", "3.2:1"). */
  detail?: string
}

export type DeckAssessment = {
  issues: SlideIssue[]
  verdicts: SlideVerdict[]
  source: DecisionSource
  /** 0–100. Kullanıcıya rozet olarak gösterilir. */
  score: number
}

/* ================================== sınırlar ================================== */

const MAX_TITLE = 64
const MAX_BULLETS = 6
const MAX_BULLET_CHARS = 150
/** Taşma uyarısı: metin bütçesinin bu katını aşınca yerleşim bozulmaya başlıyor. */
const OVERFLOW_RATIO = 1.25
/** Gövde metni için WCAG eşiği; slayt uzaktan okunacağı için altına düşülmemeli. */
const MIN_CONTRAST = 4.5
const MIN_ACCENT_CONTRAST = 3

const SEVERITY_COST: Record<IssueSeverity, number> = { error: 9, warn: 4, info: 2 }

/* =============================== görsel eşleme =============================== */

/** Karar katmanının önerdiği görsel biçim → slayt tipi. */
const FORM_TO_TYPE: Record<VisualForm, SlideType | null> = {
  text: 'content',
  statistics: 'statistics',
  chart: 'chart',
  process: 'process',
  timeline: 'timeline',
  comparison: 'comparison',
  architecture: 'architecture',
  image: 'image',
  quote: 'quote',
}

/** Öneriyi yalnızca GÜVENLE uygulayabiliyorsak bulgu olarak gösteririz. */
function fixForForm(slide: Slide, form: VisualForm): FixKind {
  const bullets = slideBullets(slide)
  if (bullets.length === 0) return 'none'
  if (form === 'chart' && bulletsToChart(bullets)) return 'to-chart'
  if (form === 'statistics' && bulletsToStats(bullets)) return 'to-stats'
  if (form === 'process' && bulletsToProcess(bullets)) return 'to-process'
  return 'none'
}

/* ================================ değerlendirme ================================ */

/**
 * Desteyi puanlar. `answers` Jev'den ya da yerel motordan gelmiş olabilir —
 * bu fonksiyon farkı bilmez, yalnızca `source`u rapora geçirir.
 */
export function assessDeck(
  presentation: Presentation,
  answers: Record<string, Answer>,
  source: DecisionSource,
): DeckAssessment {
  const verdicts = readVerdicts(presentation, answers)
  const issues: SlideIssue[] = []
  const theme = getTheme(presentation.theme)

  /* ----------------------------- deste geneli ----------------------------- */

  // Kontrast tema düzeyindedir: bir kez ölçülür, ilk slayda iliştirilir.
  const bodyContrast = contrastRatio(theme.fg2, theme.bg)
  const accentContrast = contrastRatio(theme.accent, theme.bg)
  if (bodyContrast < MIN_CONTRAST || accentContrast < MIN_ACCENT_CONTRAST) {
    issues.push({
      slideId: '',
      index: -1,
      code: 'contrast',
      severity: 'warn',
      by: 'rule',
      fix: 'none',
      detail: `${Math.round(Math.min(bodyContrast, accentContrast) * 10) / 10}:1`,
    })
  }

  const contentLike = presentation.slides.filter((s) => s.type === 'content').length
  if (presentation.slides.length >= 5 && contentLike / presentation.slides.length > 0.7) {
    issues.push({
      slideId: '',
      index: -1,
      code: 'monotone',
      severity: 'info',
      by: 'rule',
      fix: 'none',
      detail: `${contentLike}/${presentation.slides.length}`,
    })
  }

  /* ------------------------------ slayt başına ------------------------------ */

  presentation.slides.forEach((slide, index) => {
    const verdict = verdicts[index]
    const bullets = slideBullets(slide)
    const load = textLoad(slide)
    const add = (code: IssueCode, severity: IssueSeverity, by: 'rule' | 'ai', fix: FixKind, detail?: string) =>
      issues.push({ slideId: slide.id, index, code, severity, by, fix, detail })

    // --- ölçümler ---
    if (slide.type !== 'quote' && slide.title.length > MAX_TITLE) {
      add('title-long', 'warn', 'rule', 'trim-title', `${slide.title.length}`)
    }
    if (bullets.length > MAX_BULLETS) {
      add('too-many-bullets', 'warn', 'rule', slide.type === 'content' ? 'split' : 'none', `${bullets.length}`)
    }
    const longest = bullets.reduce((max, b) => Math.max(max, b.length), 0)
    if (longest > MAX_BULLET_CHARS) {
      add('bullet-long', 'warn', 'rule', 'none', `${longest}`)
    }
    if (load.ratio > OVERFLOW_RATIO) {
      add('overflow', 'error', 'rule', slide.type === 'content' ? 'split' : 'none', `${Math.round(load.ratio * 100)}%`)
    }
    if (bullets.length === 0 && !slide.subtitle && slide.type !== 'title' && slide.type !== 'quote' && slide.type !== 'chart' && slide.type !== 'statistics' && slide.type !== 'timeline' && slide.type !== 'process' && slide.type !== 'architecture' && slide.type !== 'image') {
      add('empty', 'error', 'rule', 'none')
    }

    // Aynı şablonun üst üste üç kez kullanılması dikkati düşürüyor. Uyarı, bir
    // dizinin YALNIZCA BAŞINDA verilir: 8 slaytlık tekdüze bir destede aynı
    // bulguyu altı kez göstermek paneli okunmaz hâle getiriyordu.
    if (index >= 2) {
      const sameRun =
        presentation.slides[index - 2].template === slide.template &&
        presentation.slides[index - 1].template === slide.template
      const alreadyReported = index >= 3 && presentation.slides[index - 3].template === slide.template
      if (sameRun && !alreadyReported) {
        add('template-repeat', 'info', 'rule', 'retemplate', slide.template)
      }
    }

    // --- yargılar ---
    if (verdict) {
      // Yoğunluk ölçümle de yakalanıyorsa ikinci kez bulgu üretme.
      if (verdict.dense && load.ratio <= OVERFLOW_RATIO && bullets.length <= MAX_BULLETS) {
        add('dense', 'warn', 'ai', slide.type === 'content' ? 'split' : 'none')
      }
      if (verdict.clarity < 0.34 && slide.type !== 'title') {
        add('unclear', 'warn', 'ai', slide.title.length > MAX_TITLE ? 'trim-title' : 'none')
      }
      const suggested = FORM_TO_TYPE[verdict.visual]
      if (suggested && suggested !== slide.type && slide.type === 'content') {
        const fix = fixForForm(slide, verdict.visual)
        // Uygulanabilir bir dönüşüm yoksa öneri gürültüye dönüşür; yalnızca
        // gerçekten dönüştürebildiğimizde bulgu açıyoruz.
        if (fix !== 'none') add('visual-mismatch', 'info', 'ai', fix, verdict.visual)
      }
    }
  })

  const penalty = issues.reduce((sum, issue) => sum + SEVERITY_COST[issue.severity], 0)
  return { issues, verdicts, source, score: Math.max(0, Math.min(100, 100 - penalty)) }
}

/* ============================== otomatik düzeltme ============================== */

/**
 * Bulguyu uygular ve yeni desteyi döndürür. Uygulanamıyorsa `null` döner —
 * çağıran taraf o zaman kullanıcıya elle düzeltmeyi ya da AI komutunu önerir.
 *
 * Tüm düzeltmeler SAF ve GERİ ALINABİLİR: yeni bir `Presentation` üretilir,
 * mevcut nesne değiştirilmez.
 */
export function applyFix(presentation: Presentation, issue: SlideIssue, continuedLabel: string): Presentation | null {
  const index = presentation.slides.findIndex((s) => s.id === issue.slideId)
  if (index < 0) return null
  const slide = presentation.slides[index]
  const bullets = slideBullets(slide)

  const replace = (next: Slide): Presentation => ({
    ...presentation,
    slides: presentation.slides.map((s, i) => (i === index ? next : s)),
  })

  switch (issue.fix) {
    case 'trim-title': {
      const title = trimTitle(slide.title, MAX_TITLE)
      return title === slide.title ? null : replace({ ...slide, title })
    }

    case 'split': {
      if (slide.type !== 'content' || slide.content.bullets.length < 2) return null
      const [first, second] = splitContentSlide(slide, continuedLabel)
      const slides = presentation.slides.slice()
      slides.splice(index, 1, first, second)
      return { ...presentation, slides: reindex(slides) }
    }

    case 'to-chart': {
      const content = bulletsToChart(bullets)
      if (!content) return null
      return replace({ ...slide, type: 'chart', template: defaultTemplate('chart'), content })
    }

    case 'to-stats': {
      const content = bulletsToStats(bullets)
      if (!content) return null
      return replace({ ...slide, type: 'statistics', template: defaultTemplate('statistics'), content })
    }

    case 'to-process': {
      const content = bulletsToProcess(bullets)
      if (!content) return null
      return replace({ ...slide, type: 'process', template: defaultTemplate('process'), content })
    }

    case 'retemplate': {
      const next = rotateTemplate(slide)
      return next === slide ? null : replace(next)
    }

    default:
      return null
  }
}

/** İçeriğin BİÇİMİNİ değiştiren düzeltmeler — bir slayta en fazla biri uygulanabilir. */
const STRUCTURAL: FixKind[] = ['split', 'to-chart', 'to-stats', 'to-process', 'retemplate']

/**
 * Düzeltilebilir bulguların tamamını uygular.
 *
 * Kural: bir slayta EN FAZLA bir yapısal düzeltme (bölme, grafiğe çevirme,
 * yerleşim değişimi) uygulanır. Aksi hâlde "çok madde var" ve "içerik sığmıyor"
 * bulgularının ikisi de aynı slaytı bölüp üç parçaya ayırıyordu. Başlık kırpma
 * yapısal değildir, onunla birlikte uygulanabilir.
 *
 * Sondan başa gidilir: bölme slayt eklediği için baştan gidilirse indeksler kayar.
 */
export function applyAllFixes(
  presentation: Presentation,
  issues: SlideIssue[],
  continuedLabel: string,
): { presentation: Presentation; applied: number } {
  const fixable = issues.filter((i) => i.fix !== 'none' && i.slideId)

  // Slayt başına: önce başlık kırpma, sonra en ciddi TEK yapısal düzeltme.
  const bySlide = new Map<string, SlideIssue[]>()
  for (let i = 0; i < fixable.length; i++) {
    const list = bySlide.get(fixable[i].slideId) ?? []
    list.push(fixable[i])
    bySlide.set(fixable[i].slideId, list)
  }

  const planned: SlideIssue[] = []
  bySlide.forEach((list) => {
    const trim = list.find((i) => i.fix === 'trim-title')
    if (trim) planned.push(trim)
    const structural = list
      .filter((i) => STRUCTURAL.indexOf(i.fix) >= 0)
      .sort((a, b) => SEVERITY_COST[b.severity] - SEVERITY_COST[a.severity])[0]
    if (structural) planned.push(structural)
  })

  // Aynı slaytın iki düzeltmesi arasında sıra korunur (önce kırp, sonra böl);
  // slaytlar arasında sondan başa gidilir.
  planned.sort((a, b) => (b.index - a.index) || (a.fix === 'trim-title' ? -1 : 1))

  let current = presentation
  let applied = 0
  for (let i = 0; i < planned.length; i++) {
    const next = applyFix(current, planned[i], continuedLabel)
    if (next) {
      current = next
      applied++
    }
  }
  return { presentation: current, applied }
}
