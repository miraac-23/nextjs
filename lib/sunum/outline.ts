// Yerel (AI'sız) taslak çıkarıcı.
//
// Ne işe yarar: Ollama kapalıysa, model kurulu değilse ya da üretim başarısız
// olursa kullanıcı boş ekranla kalmaz — metninden deterministik bir sunum iskeleti
// çıkarılır ve editörde düzenlenebilir. Çıktı `AiPresentationDraft` şeklindedir,
// yani AI çıktısıyla AYNI normalize hattından geçer (tek doğrulama yolu).
//
// Kaynak metin yoksa konu başlığından standart bir sunum akışı kurulur; bu, içerik
// uydurmak değil, kullanıcıya doldurulacak bir çatı vermektir — slaytlar açıkça
// başlıktan türetilmiş sorulardır.

import { cleanExtractedText } from './chunk'
import type { AiPresentationDraft, AiSlideDraft } from './schema'
import type { GenerationRequest } from './types'

const SKELETON = {
  tr: [
    'Giriş ve kapsam',
    'Neden şimdi önemli?',
    'Mevcut durum',
    'Temel kavramlar',
    'Uygulama alanları',
    'Fırsatlar',
    'Riskler ve sınırlar',
    'Örnek senaryo',
    'Uygulama adımları',
    'Ölçüm ve başarı kriterleri',
  ],
  en: [
    'Introduction and scope',
    'Why it matters now',
    'Current state',
    'Core concepts',
    'Use cases',
    'Opportunities',
    'Risks and limits',
    'Example scenario',
    'Rollout steps',
    'Metrics and success criteria',
  ],
} as const

const TEXT = {
  tr: {
    agenda: 'İçerik',
    closing: 'Sonuç',
    cta: 'Sorular ve katkılar için teşekkürler.',
    fill: 'Bu maddeyi kendi notunla doldur.',
    minutes: (n: number) => `${n} dakikalık sunum`,
  },
  en: {
    agenda: 'Agenda',
    closing: 'Conclusion',
    cta: 'Thank you — questions are welcome.',
    fill: 'Fill this bullet with your own note.',
    minutes: (n: number) => `${n}-minute talk`,
  },
} as const

type Section = { heading: string; sentences: string[] }

/**
 * Başlık gibi duran satır: kısa, nokta ile bitmiyor, çok fazla küçük harfle
 * başlayan kelime içermiyor. Numaralı başlıklar ("2.1 Yöntem") de yakalanır.
 */
function looksLikeHeading(line: string): boolean {
  const text = line.trim()
  if (text.length < 3 || text.length > 90) return false
  if (/[.;,]$/.test(text)) return false
  if (/^(?:\d+\.)+\d*\s+\S/.test(text)) return true
  if (/^#{1,6}\s+\S/.test(text)) return true
  const words = text.split(/\s+/)
  if (words.length > 12) return false
  // Tümü büyük harf ya da her kelimesi büyük harfle başlıyorsa başlıktır.
  if (text === text.toLocaleUpperCase('tr-TR') && /\p{L}/u.test(text)) return true
  const capitalized = words.filter((w) => /^[\p{Lu}]/u.test(w)).length
  return capitalized / words.length >= 0.6
}

/**
 * Satır İÇİNDE geçen başlık cümlesi: "Mevcut Durum." gibi kısa, büyük harfle
 * başlayan ve fiil taşımayan bir cümle çoğu belgede bölüm başlığıdır. Kullanıcı
 * metni tek paragraf hâlinde yapıştırdığında (satır sonu yok) bölümleri ancak
 * böyle ayırabiliyoruz.
 */
function looksLikeInlineHeading(sentence: string): boolean {
  const text = sentence.trim().replace(/[.:]$/, '')
  if (text.length < 3 || text.length > 56) return false
  const words = text.split(/\s+/)
  // Tek kelime satır İÇİNDE başlık sayılmaz: bu neredeyse her zaman kesilmiş bir
  // cümlenin kalıntısıdır. Kendi satırında duran "Giriş" gibi gerçek tek kelimelik
  // başlıkları `looksLikeHeading` zaten yakalıyor.
  if (words.length < 2 || words.length > 6) return false
  if (!/^[\p{Lu}]/u.test(text)) return false
  const capitalized = words.filter((w) => /^[\p{Lu}\d]/u.test(w)).length
  return capitalized / words.length >= 0.5
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n(?=\s*[-•*]\s)/)
    .map((s) => s.replace(/^\s*[-•*]\s*/, '').trim())
    .filter((s) => s.length >= 3 && s.length <= 240)
}

/**
 * Sabit satır sarmalını geri alır.
 *
 * PDF'ten çıkan ve elle yazılmış metinlerde cümleler satır ortasında kesiliyor.
 * Satır satır cümleye bölünce "… %13 arttı. Artışın" satırından "Artışın" diye
 * tek kelimelik bir parça çıkıyor ve bu parça, büyük harfle başladığı için
 * BAŞLIK sanılıyordu — ölçülen sonuç: gerçek "Olumlu bulgular" başlığı yerine
 * slayda "Artışın" yazılması.
 *
 * Ölçüt basit ve yeterli: bir satır cümle noktalamasıyla bitmiyorsa VE sonraki
 * satır küçük harfle başlıyorsa, ikisi aynı cümlenin parçasıdır. Başlıklar bu
 * ölçütten etkilenmez, çünkü onları izleyen satır büyük harfle başlar.
 */
function unwrapLines(lines: string[]): string[] {
  const out: string[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) {
      out.push('')
      continue
    }
    const previous = out.length > 0 ? out[out.length - 1] : ''
    const continues =
      previous !== '' &&
      !/[.!?:;]$/.test(previous) &&
      /^[\p{Ll}]/u.test(line) &&
      // Madde işaretiyle başlayan satır yeni bir maddedir, devam değil.
      !/^[-•*\d]/.test(line)
    if (continues) out[out.length - 1] = `${previous} ${line}`
    else out.push(line)
  }
  return out
}

/** Metni başlık satırlarından bölümlere ayırır; başlık yoksa paragrafları bölüm sayar. */
function toSections(text: string): Section[] {
  const lines = unwrapLines(text.split('\n'))
  const sections: Section[] = []
  let current: Section | null = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    if (looksLikeHeading(line)) {
      current = { heading: line.replace(/^#{1,6}\s+/, '').replace(/^(?:\d+\.)+\d*\s+/, ''), sentences: [] }
      sections.push(current)
      continue
    }
    if (!current) {
      current = { heading: '', sentences: [] }
      sections.push(current)
    }
    const found = splitSentences(line)
    for (let j = 0; j < found.length; j++) current.sentences.push(found[j])
  }

  // Satır içi başlıklarla bölümleri daha da ayır (tek paragraflık yapıştırmalar).
  const refined: Section[] = []
  for (let i = 0; i < sections.length; i++) {
    let active: Section = { heading: sections[i].heading, sentences: [] }
    refined.push(active)
    const list = sections[i].sentences
    for (let j = 0; j < list.length; j++) {
      if (looksLikeInlineHeading(list[j]) && (active.sentences.length > 0 || active.heading)) {
        active = { heading: list[j].replace(/[.:]$/, ''), sentences: [] }
        refined.push(active)
        continue
      }
      if (looksLikeInlineHeading(list[j]) && !active.heading) {
        active.heading = list[j].replace(/[.:]$/, '')
        continue
      }
      // Tek kelimelik/çok kısa artıkları madde yapma.
      if (list[j].length >= 25) active.sentences.push(list[j])
    }
  }

  return refined.filter((s) => s.sentences.length > 0)
}

/** Bölümü en fazla `perSlide` cümlelik parçalara böler (uzun bölüm tek slayda sığmaz). */
function splitSection(section: Section, perSlide: number, topic: string): Section[] {
  if (section.sentences.length <= perSlide) {
    return [{ heading: section.heading || topic, sentences: section.sentences }]
  }
  const out: Section[] = []
  for (let i = 0; i < section.sentences.length; i += perSlide) {
    const part = section.sentences.slice(i, i + perSlide)
    const base = section.heading || topic
    out.push({ heading: i === 0 ? base : `${base} (${Math.floor(i / perSlide) + 1})`, sentences: part })
  }
  return out
}

/**
 * Bölümleri istenen slayt sayısına yaklaştırır.
 *
 * Az bölüm varsa dolu olanlar bölünür (tek paragraflık metin de birden çok slayda
 * dağılır); çok bölüm varsa en dolu olanlar seçilip belge sırasına geri konur.
 * Dolgu slaytı ÜRETİLMEZ — metinde yoksa slayt da yoktur.
 */
function fitSections(sections: Section[], budget: number, topic: string): Section[] {
  let units = sections.slice()

  // Bölüm sayısı hedefin altındaysa: en uzun bölümü böl, hedefe yaklaş.
  let guard = 0
  while (units.length < budget && guard < 40) {
    guard++
    let widest = -1
    let widestCount = 0
    for (let i = 0; i < units.length; i++) {
      if (units[i].sentences.length > widestCount) {
        widestCount = units[i].sentences.length
        widest = i
      }
    }
    // En uzun bölüm bile ikiye bölünemiyorsa (≤2 cümle) daha fazla slayt üretilemez.
    if (widest < 0 || widestCount < 4) break
    const perSlide = Math.ceil(widestCount / 2)
    const parts = splitSection(units[widest], perSlide, topic)
    units = units.slice(0, widest).concat(parts, units.slice(widest + 1))
  }

  if (units.length > budget) {
    units = units
      .map((section, index) => ({ section, index }))
      .sort((a, b) => b.section.sentences.length - a.section.sentences.length)
      .slice(0, budget)
      .sort((a, b) => a.index - b.index)
      .map((item) => item.section)
  }

  return units
}

/**
 * Konudan ve (varsa) kaynak metinden sunum taslağı üretir.
 * `slideCount` hedefine kapak ve kapanış dahil uyulur.
 */
export function buildOutline(req: GenerationRequest): AiPresentationDraft {
  const t = TEXT[req.language]
  const topic = req.topic.trim()
  const body = req.sourceText ? cleanExtractedText(req.sourceText) : ''
  // Kapak + kapanış sabit; aradaki slayt sayısı buradan çıkar.
  const middle = Math.max(1, req.slideCount - 2)

  const slides: AiSlideDraft[] = [
    { type: 'title', title: topic, subtitle: t.minutes(req.durationMinutes) },
  ]

  const sections = body ? toSections(body) : []

  if (sections.length > 0) {
    // Gündem slaytı yalnızca başlıklı bölüm varsa anlamlı.
    const headings = sections.map((s) => s.heading).filter((h) => h.length > 0)
    let budget = middle
    if (headings.length >= 3 && budget > 3) {
      slides.push({ type: 'content', title: t.agenda, bullets: headings.slice(0, 6) })
      budget--
    }

    const units = fitSections(sections, budget, topic)
    for (let i = 0; i < units.length; i++) {
      slides.push({
        type: 'content',
        title: units[i].heading || `${topic} — ${i + 1}`,
        bullets: units[i].sentences.slice(0, 5),
      })
    }
  } else {
    // Kaynak yok: konu başlığından standart akış. Maddeler bilinçli olarak
    // "doldurulacak" işaretlidir — uydurma içerik üretilmez.
    const plan = SKELETON[req.language].slice(0, middle)
    for (let i = 0; i < plan.length; i++) {
      slides.push({ type: 'content', title: plan[i], bullets: [t.fill, t.fill, t.fill] })
    }
  }

  /*
   * Kaynağın kendi son bölümü zaten bir sonuç bölümüyse (çoğu raporda öyledir),
   * ayrıca bir kapanış slaytı eklemek yan yana iki "Sonuç" başlığı üretiyordu.
   * O durumda son slayt kapanışa DÖNÜŞTÜRÜLÜR: başlık tekrar etmez, kaynağın
   * kendi sonuç cümleleri de kaybolmaz.
   */
  const last = slides[slides.length - 1]
  const closingTitle = t.closing.toLocaleLowerCase(req.language === 'en' ? 'en-US' : 'tr-TR')
  const lastIsClosing =
    !!last &&
    last.type === 'content' &&
    typeof last.title === 'string' &&
    last.title.toLocaleLowerCase(req.language === 'en' ? 'en-US' : 'tr-TR').indexOf(closingTitle) >= 0

  if (lastIsClosing && last.type === 'content') {
    slides[slides.length - 1] = {
      type: 'conclusion',
      title: last.title,
      bullets: last.bullets,
      cta: t.cta,
    }
    return { title: topic, subtitle: t.minutes(req.durationMinutes), slides }
  }

  const closingBullets =
    sections.length > 0
      ? sections
          .map((s) => s.heading)
          .filter((h) => h.length > 0)
          .slice(0, 4)
      : SKELETON[req.language].slice(0, 3)

  slides.push({
    type: 'conclusion',
    title: t.closing,
    bullets: closingBullets.length > 0 ? closingBullets : [t.fill],
    cta: t.cta,
  })

  return { title: topic, subtitle: t.minutes(req.durationMinutes), slides }
}
