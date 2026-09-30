// Yerel karar motoru — Jev olmadan da ürünün çalışmasını sağlar.
//
// AYNI soru anahtarlarını, AYNI yanıt tiplerini üretir (bkz. questions.ts).
// Bu yüzden çağıran taraf iki yolu birbirinden ayırt etmek zorunda değil;
// tek bir okuma kodu (`readVerdicts`) ikisini de çözer.
//
// Sezgiler deterministiktir: aynı slayt her zaman aynı kararı alır. Model kadar
// isabetli değildir — özellikle "kavramsal mı, süreç mi" ayrımında — ama
// kullanıcıya yanlış ya da boş bir kalite raporu göstermekten çok daha iyidir.

import { bulletsToChart, bulletsToStats, slideBullets, slideText } from '../transform'
import type { Presentation, Slide } from '../types'
import { CLARITY_LEVELS, keyFor, type VisualForm } from './questions'
import type { Answer } from './types'

/* ================================= desenler ================================= */

const YEAR_RE = /\b(19|20)\d{2}\b|\bQ[1-4]\b|\b[1-4]\.\s*(çeyrek|quarter)\b/i
const MONTH_RE = /\b(ocak|şubat|mart|nisan|mayıs|haziran|temmuz|ağustos|eylül|ekim|kasım|aralık|january|february|march|april|may|june|july|august|september|october|november|december)\b/i
const PROCESS_RE = /\b(adım|aşama|önce|sonra|ardından|ilk olarak|son olarak|akış|süreç|step|phase|then|next|finally|workflow|pipeline)\b/i
const COMPARE_RE = /\b(vs\.?|versus|karşı|karşılaştır|yerine|oysa|avantaj|dezavantaj|artı|eksi|önce\/sonra|before|after|pros|cons|compared)\b/i
const ARCH_RE = /\b(mimari|katman|servis|bileşen|altyapı|api|gateway|veritabanı|database|microservice|architecture|layer|component|backend|frontend|queue|cache)\b/i
const QUOTE_RE = /[“”"«»]/

/** Anahtar kelime kaç FARKLI maddede geçiyor? Tek maddedeki tekrar sayılmaz. */
function hits(bullets: string[], re: RegExp): number {
  let count = 0
  for (let i = 0; i < bullets.length; i++) if (re.test(bullets[i])) count++
  return count
}

/* ============================== görsel biçim seçimi ============================== */

/**
 * İçeriğin doğal görsel biçimini sezgisel olarak belirler.
 * Sıra önemlidir: en SPESİFİK sinyal önce kazanır, yoksa her şey "süreç" olur.
 */
export function guessVisualForm(slide: Slide): VisualForm {
  // Slayt zaten özel bir tipteyse onun biçimi doğrudur; yeniden tahmin etmeye gerek yok.
  if (slide.type === 'quote') return 'quote'
  if (slide.type === 'chart') return 'chart'
  if (slide.type === 'statistics') return 'statistics'
  if (slide.type === 'timeline') return 'timeline'
  if (slide.type === 'process') return 'process'
  if (slide.type === 'architecture') return 'architecture'
  if (slide.type === 'comparison' || slide.type === 'two-column') return 'comparison'
  if (slide.type === 'title' || slide.type === 'image') return 'image'

  const bullets = slideBullets(slide)
  const text = slideText(slide)

  if (bullets.length === 0) return 'text'
  if (bulletsToChart(bullets)) return 'chart'
  if (bulletsToStats(bullets)) return 'statistics'
  if (hits(bullets, YEAR_RE) >= 2 || hits(bullets, MONTH_RE) >= 2) return 'timeline'
  if (hits(bullets, ARCH_RE) >= 2) return 'architecture'
  if (COMPARE_RE.test(text) && bullets.length >= 2) return 'comparison'
  if (hits(bullets, PROCESS_RE) >= 2) return 'process'
  if (QUOTE_RE.test(text) && bullets.length === 1) return 'quote'
  // Az ve kısa madde: görsel anlatım metinden daha güçlü.
  if (bullets.length <= 3 && averageLength(bullets) <= 60) return 'image'
  return 'text'
}

function averageLength(items: string[]): number {
  if (items.length === 0) return 0
  return items.reduce((sum, s) => sum + s.length, 0) / items.length
}

/* ================================ yoğunluk ================================ */

/** Slayt tipine göre rahat okunabilir karakter bütçesi (başlık dâhil). */
const TEXT_BUDGET: Record<Slide['type'], number> = {
  title: 220,
  content: 540,
  'two-column': 680,
  comparison: 680,
  statistics: 360,
  chart: 320,
  timeline: 520,
  process: 520,
  architecture: 460,
  image: 420,
  quote: 400,
  conclusion: 520,
}

/** Slaytın metin yükü ve bütçesi — hem yoğunluk kararı hem taşma uyarısı kullanır. */
export function textLoad(slide: Slide): { chars: number; budget: number; ratio: number } {
  const chars = slideText(slide).replace(/\s+/g, ' ').length
  const budget = TEXT_BUDGET[slide.type] ?? 520
  return { chars, budget, ratio: chars / budget }
}

function isDense(slide: Slide): boolean {
  const { ratio } = textLoad(slide)
  if (ratio > 1) return true
  const bullets = slideBullets(slide)
  // Bütçeye sığsa bile çok fazla madde okunmaz hâle getirir.
  return bullets.length > 6 || (bullets.length > 4 && averageLength(bullets) > 110)
}

/* ================================== netlik ================================== */

function clarityRatio(slide: Slide): number {
  let value = 1
  const title = slide.title.trim()

  if (slide.type !== 'quote') {
    if (title.length === 0) value -= 0.5
    else if (title.length > 80) value -= 0.55
    else if (title.length > 60) value -= 0.3
  }

  const bullets = slideBullets(slide)
  const avg = averageLength(bullets)
  if (avg > 140) value -= 0.35
  else if (avg > 110) value -= 0.2

  if (bullets.length > 7) value -= 0.2
  // Tek kelimelik maddeler de belirsizdir ("Hız", "Kalite").
  if (bullets.length >= 3 && avg < 14) value -= 0.2

  return Math.min(1, Math.max(0, value))
}

/* ================================== çıktı ================================== */

/**
 * Tüm deste için yerel yanıtları üretir. Anahtarlar ve yanıt tipleri Jev'inkiyle
 * birebir aynıdır; `readVerdicts` ikisini de aynı şekilde okur.
 */
export function localAnswers(presentation: Presentation): Record<string, Answer> {
  const answers: Record<string, Answer> = {}

  presentation.slides.forEach((slide, index) => {
    answers[keyFor.visual(index)] = { type: 'choice', choice: guessVisualForm(slide), confidence: 0.5 }
    // Sezgi ikili karar verir; eşiğin iki yanında net değerler kullanılır.
    answers[keyFor.dense(index)] = { type: 'noul', noul: isDense(slide) ? 0.85 : 0.15 }
    answers[keyFor.clarity(index)] = {
      type: 'score',
      score: clarityRatio(slide) * (CLARITY_LEVELS - 1),
      confidence: 0.5,
    }
  })

  return answers
}
