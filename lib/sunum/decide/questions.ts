// Karar katmanının soru seti (§12 görsel niyet + §25 kalite kontrolü).
//
// Tasarım kararı: ÖLÇÜLEBİLİR şeyler (karakter sayısı, madde sayısı, kontrast
// oranı, şablon tekrarı) asla modele sorulmaz — onları deterministik olarak
// hesaplıyoruz. Modele yalnızca YARGI gerektiren üç şey sorulur:
//
//   visual  → bu içeriğin doğal görsel biçimi ne? (choice)
//   dense   → bu slayt arka sıradan okunamayacak kadar dolu mu? (noul)
//   clarity → başlık ve ana mesaj ne kadar net? (score)
//
// Tüm slaytların soruları TEK çağrıda gönderilir: Jev soruları paralel
// değerlendirdiği için onuncu soru token harcar ama neredeyse hiç süre eklemez.

import { slideBullets } from '../transform'
import type { Audience, Presentation, Slide, SunumLang } from '../types'
import type { Answer, Question } from './types'
import { choiceOf, scoreRatio, yes } from './types'

/** Slide Engine'in üretebildiği görsel biçimler. Model bunların dışına çıkamaz. */
export const VISUAL_FORMS = [
  'text',
  'statistics',
  'chart',
  'process',
  'timeline',
  'comparison',
  'architecture',
  'image',
  'quote',
] as const
export type VisualForm = (typeof VISUAL_FORMS)[number]

/** Netlik puanının seviye sayısı — oranı hesaplarken gerekiyor. */
export const CLARITY_LEVELS = 3

const CRITERIA = {
  tr: {
    visual: {
      text: 'Düz madde listesi yeterli; sayısal veri ya da sıralı yapı yok',
      statistics: 'Bir veya birkaç çarpıcı sayı/oran öne çıkıyor',
      chart: 'Karşılaştırılabilir sayısal seri var (yıllara, kategorilere göre)',
      process: 'Sıralı adımlar, akış ya da uygulama sırası anlatılıyor',
      timeline: 'Tarihler, dönemler ya da yol haritası anlatılıyor',
      comparison: 'İki yaklaşım, durum ya da seçenek karşılaştırılıyor',
      architecture: 'Sistem bileşenleri, katmanlar ya da servisler anlatılıyor',
      image: 'Kavramsal bir konu; görsel/simge anlatımı güçlendirir',
      quote: 'Alıntı, ilke ya da akılda kalıcı tek cümle',
    },
    dense: {
      true: 'Metin bir slayda sığmayacak kadar uzun; arka sıradan okunmaz',
      false: 'Metin miktarı slayt için uygun; rahat okunur',
    },
    clarity: ['Başlık belirsiz, ana mesaj anlaşılmıyor', 'Başlık anlaşılır, mesaj takip edilebiliyor', 'Başlık kısa ve net, ana mesaj ilk bakışta anlaşılıyor'],
  },
  en: {
    visual: {
      text: 'A plain bullet list is enough; no numeric data or ordered structure',
      statistics: 'One or a few striking numbers/ratios stand out',
      chart: 'There is a comparable numeric series (by year, by category)',
      process: 'Ordered steps, a flow or an implementation sequence',
      timeline: 'Dates, periods or a roadmap',
      comparison: 'Two approaches, states or options are compared',
      architecture: 'System components, layers or services',
      image: 'A conceptual topic; a visual/icon strengthens it',
      quote: 'A quote, principle or one memorable sentence',
    },
    dense: {
      true: 'Too much text for one slide; unreadable from the back row',
      false: 'The amount of text fits the slide and reads comfortably',
    },
    clarity: ['Title vague, main message unclear', 'Title understandable, message followable', 'Title short and sharp, message clear at a glance'],
  },
} as const

const AUDIENCE_LABEL = {
  tr: {
    professional: 'profesyonel karma dinleyici',
    student: 'üniversite öğrencileri',
    employee: 'kurum çalışanları',
    management: 'üst yönetim',
    technical: 'teknik ekip',
    customer: 'müşteriler',
    academic: 'akademik dinleyici',
    general: 'genel katılımcı',
  },
  en: {
    professional: 'a mixed professional audience',
    student: 'university students',
    employee: 'company staff',
    management: 'executives',
    technical: 'engineering team',
    customer: 'customers',
    academic: 'an academic audience',
    general: 'a general audience',
  },
} satisfies Record<SunumLang, Record<Audience, string>>

/** Bir çağrıda değerlendirilecek en fazla slayt — bağlam sınırı ve netlik için. */
export const BATCH_SIZE = 12

export const keyFor = {
  visual: (i: number) => `s${i}_visual`,
  dense: (i: number) => `s${i}_dense`,
  clarity: (i: number) => `s${i}_clarity`,
} as const

/** Slaytı modele verilecek kompakt metne çevirir. Teknik alanlar (id, şablon) gönderilmez. */
function describeSlide(slide: Slide, index: number, lang: SunumLang): string {
  const head = lang === 'en' ? `--- SLIDE ${index + 1} [${slide.type}] ---` : `--- SLAYT ${index + 1} [${slide.type}] ---`
  const lines: string[] = [head]
  if (slide.title) lines.push((lang === 'en' ? 'Title: ' : 'Başlık: ') + slide.title)
  if (slide.subtitle) lines.push((lang === 'en' ? 'Subtitle: ' : 'Alt başlık: ') + slide.subtitle)
  const bullets = slideBullets(slide)
  if (bullets.length > 0) lines.push((lang === 'en' ? 'Content: ' : 'İçerik: ') + bullets.join(' | '))
  return lines.join('\n')
}

export type QuestionBatch = {
  state: string
  questions: Record<string, Question>
  /** Bu partideki slaytların desteki gerçek indeksleri. */
  indexes: number[]
}

/**
 * Deste için soru partilerini kurar. 12'şerlik partiler hâlinde bölünür:
 * tek çağrıda 36+ soru göndermek mümkün ama parti büyüdükçe "3. slayt"
 * göndermeleri belirsizleşiyor ve bağlam sınırına yaklaşılıyor.
 */
export function buildBatches(presentation: Presentation): QuestionBatch[] {
  const lang = presentation.language
  const c = CRITERIA[lang]
  const audience = AUDIENCE_LABEL[lang][presentation.audience]
  const batches: QuestionBatch[] = []

  for (let start = 0; start < presentation.slides.length; start += BATCH_SIZE) {
    const chunk = presentation.slides.slice(start, start + BATCH_SIZE)
    const indexes = chunk.map((_, i) => start + i)

    const header =
      lang === 'en'
        ? `PRESENTATION: ${presentation.title}\nAUDIENCE: ${audience}\nTALK LENGTH: ${presentation.durationMinutes} minutes`
        : `SUNUM: ${presentation.title}\nHEDEF KİTLE: ${audience}\nSÜRE: ${presentation.durationMinutes} dakika`

    const state = [header]
      .concat(chunk.map((slide, i) => describeSlide(slide, start + i, lang)))
      .join('\n\n')

    const questions: Record<string, Question> = {}
    for (let i = 0; i < chunk.length; i++) {
      const n = start + i
      const ref = lang === 'en' ? `slide ${n + 1}` : `${n + 1}. slayt`
      questions[keyFor.visual(n)] = {
        type: 'choice',
        instructions:
          lang === 'en'
            ? `Which visual form does the content of ${ref} naturally call for?`
            : `${ref} içeriği doğal olarak hangi görsel biçimi istiyor?`,
        criteria: { ...c.visual },
      }
      questions[keyFor.dense(n)] = {
        type: 'noul',
        instructions:
          lang === 'en'
            ? `Is ${ref} too dense to read from the back of the room?`
            : `${ref} arka sıradan okunamayacak kadar dolu mu?`,
        criteria: { ...c.dense },
      }
      questions[keyFor.clarity(n)] = {
        type: 'score',
        instructions:
          lang === 'en'
            ? `How clear is the title and main message of ${ref} for this audience?`
            : `${ref} başlığı ve ana mesajı bu hedef kitle için ne kadar net?`,
        criteria: [...c.clarity],
      }
    }

    batches.push({ state, questions, indexes })
  }

  return batches
}

export type SlideVerdict = {
  slideId: string
  index: number
  visual: VisualForm
  dense: boolean
  /** 0 (belirsiz) – 1 (çok net). */
  clarity: number
}

/** Yanıt haritasını slayt başına karara çevirir. Cevapsız soru güvenli tarafa düşer. */
export function readVerdicts(presentation: Presentation, answers: Record<string, Answer>): SlideVerdict[] {
  return presentation.slides.map((slide, index) => ({
    slideId: slide.id,
    index,
    visual: choiceOf(answers[keyFor.visual(index)], VISUAL_FORMS, 'text'),
    dense: yes(answers[keyFor.dense(index)]),
    clarity: scoreRatio(answers[keyFor.clarity(index)], CLARITY_LEVELS),
  }))
}
