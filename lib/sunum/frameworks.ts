// İçerik standartları (framework) — destenin anlatım iskeleti.
//
// Neden var: modele yalnızca "8 slayt yaz" dendiğinde her konuda aynı kalıbı
// üretiyordu (tanım → sayılar → sorunlar → sonuç). Burada iskelet, kullanıcının
// SEÇTİĞİ bir karara dönüşüyor; plan adımı da hangi bölümün kaç slayt alacağını
// tahmin etmek yerine deterministik bir dağıtımdan öğreniyor.
//
// Bölüm listeleri `lib/sunum/ui-text.ts` içindeki `frameworks[fw].hint`
// açıklamalarıyla birebir tutarlıdır: kullanıcı ipucunda ne okuduysa sihirbazda
// ve üretilen destede onu görmeli.
//
// ÖNEMLİ: buradaki bölümler yalnızca GÖVDEyi tarif eder. Kapak (ilk slayt,
// `title`) ve kapanış (son slayt, `conclusion`) her destede zaten sabittir —
// istemler bunu ayrıca söylüyor (bkz. ai/prompts.ts "Yapı:" kuralı). Bu yüzden
// "sonuç" gibi kapanışa denk düşen adımlar bölüm listesine tekrar konmaz.

import {
  DEFAULT_FRAMEWORK,
  type Framework,
  type PlanItem,
  type SlideType,
  type SunumLang,
} from './types'

export type FrameworkSection = {
  /** Bölüm adı, sunum dilinde. */
  label: { tr: string; en: string }
  /** Bu bölümün kaç slayt alması beklenir (ağırlık). */
  weight: number
  /** Bu bölümde tercih edilen slayt tipleri — plan adımına ipucu. */
  prefer?: SlideType[]
}

/**
 * Standart → bölüm listesi.
 *
 * Ağırlıklar mutlak slayt sayısı DEĞİL, birbirine göre paydır: 6 slaytlık da
 * 20 slaytlık da bir deste aynı tabloyla dağıtılabilsin diye. Ağırlığı yüksek
 * bölüm, sunumun asıl yükünü taşıyan bölümdür (ör. piramitte "Kanıtlar",
 * eğitimde "Kavramlar").
 */
export const FRAMEWORK_SECTIONS: Record<Framework, FrameworkSection[]> = {
  // Tanım → veriler → sorunlar → çözüm. "Sonuç" adımı kapanış slaytıdır.
  classic: [
    { label: { tr: 'Tanım ve kapsam', en: 'Definition & scope' }, weight: 2, prefer: ['content', 'two-column'] },
    { label: { tr: 'Veriler ve mevcut durum', en: 'Data & current state' }, weight: 2, prefer: ['statistics', 'chart'] },
    { label: { tr: 'Sorunlar ve riskler', en: 'Problems & risks' }, weight: 2, prefer: ['content', 'comparison'] },
    { label: { tr: 'Çözüm ve öneriler', en: 'Solution & recommendations' }, weight: 3, prefer: ['process', 'content'] },
  ],

  // Sorunu büyüt, bedelini göster, çözümü ve uygulama adımlarını ver.
  'problem-solution': [
    { label: { tr: 'Sorunun tanımı', en: 'The problem' }, weight: 2, prefer: ['content', 'quote'] },
    { label: { tr: 'Sorunun bedeli', en: 'The cost of it' }, weight: 2, prefer: ['statistics', 'chart'] },
    { label: { tr: 'Çözüm', en: 'The solution' }, weight: 3, prefer: ['content', 'two-column'] },
    { label: { tr: 'Uygulama adımları', en: 'Rollout steps' }, weight: 2, prefer: ['process', 'timeline'] },
    { label: { tr: 'Beklenen kazanım', en: 'Expected gain' }, weight: 1, prefer: ['statistics', 'comparison'] },
  ],

  // Durum → çatışma → dönüm noktası → çözülme.
  story: [
    { label: { tr: 'Durum', en: 'Setup' }, weight: 2, prefer: ['content', 'image'] },
    { label: { tr: 'Çatışma', en: 'Conflict' }, weight: 2, prefer: ['content', 'comparison'] },
    { label: { tr: 'Dönüm noktası', en: 'Turning point' }, weight: 2, prefer: ['quote', 'timeline'] },
    { label: { tr: 'Çözülme', en: 'Resolution' }, weight: 2, prefer: ['content', 'statistics'] },
  ],

  // Minto: cevabı BAŞTA söyle; gerekçe ve kanıt onu destekler.
  pyramid: [
    { label: { tr: 'Sonuç (cevap)', en: 'The answer' }, weight: 1, prefer: ['content', 'quote'] },
    { label: { tr: 'Gerekçeler', en: 'Reasons' }, weight: 3, prefer: ['content', 'two-column'] },
    { label: { tr: 'Kanıtlar', en: 'Evidence' }, weight: 3, prefer: ['statistics', 'chart'] },
    { label: { tr: 'Sonraki adım', en: 'Next step' }, weight: 1, prefer: ['process', 'content'] },
  ],

  // Dört çeyrek eşit ağırlıkta; asıl değer en sondaki çıkarımda.
  swot: [
    { label: { tr: 'Güçlü yönler', en: 'Strengths' }, weight: 1, prefer: ['content', 'two-column'] },
    { label: { tr: 'Zayıf yönler', en: 'Weaknesses' }, weight: 1, prefer: ['content', 'two-column'] },
    { label: { tr: 'Fırsatlar', en: 'Opportunities' }, weight: 1, prefer: ['content', 'two-column'] },
    { label: { tr: 'Tehditler', en: 'Threats' }, weight: 1, prefer: ['content', 'comparison'] },
    { label: { tr: 'Çıkarım ve öncelikler', en: 'Takeaway & priorities' }, weight: 2, prefer: ['comparison', 'content'] },
  ],

  // Bağlam → yapılanlar → ölçülen sonuç → dersler.
  'case-study': [
    { label: { tr: 'Bağlam', en: 'Context' }, weight: 2, prefer: ['content', 'timeline'] },
    { label: { tr: 'Yapılanlar', en: 'What was done' }, weight: 3, prefer: ['process', 'content'] },
    { label: { tr: 'Ölçülen sonuç', en: 'Measured result' }, weight: 2, prefer: ['statistics', 'chart'] },
    { label: { tr: 'Çıkarılan dersler', en: 'Lessons learned' }, weight: 2, prefer: ['content', 'comparison'] },
  ],

  // Giriş → literatür → yöntem → bulgular → tartışma → kaynakça.
  academic: [
    { label: { tr: 'Giriş', en: 'Introduction' }, weight: 2, prefer: ['content'] },
    { label: { tr: 'Literatür', en: 'Literature' }, weight: 2, prefer: ['content', 'two-column'] },
    { label: { tr: 'Yöntem', en: 'Method' }, weight: 2, prefer: ['process', 'architecture'] },
    { label: { tr: 'Bulgular', en: 'Findings' }, weight: 3, prefer: ['chart', 'statistics'] },
    { label: { tr: 'Tartışma', en: 'Discussion' }, weight: 2, prefer: ['content', 'comparison'] },
    { label: { tr: 'Kaynakça', en: 'References' }, weight: 1, prefer: ['content'] },
  ],

  // Problem → çözüm → pazar → iş modeli → ekip → talep.
  pitch: [
    { label: { tr: 'Problem', en: 'Problem' }, weight: 2, prefer: ['content', 'statistics'] },
    { label: { tr: 'Çözüm', en: 'Solution' }, weight: 2, prefer: ['content', 'process'] },
    { label: { tr: 'Pazar', en: 'Market' }, weight: 2, prefer: ['chart', 'statistics'] },
    { label: { tr: 'İş modeli', en: 'Business model' }, weight: 2, prefer: ['content', 'comparison'] },
    { label: { tr: 'Ekip', en: 'Team' }, weight: 1, prefer: ['content', 'image'] },
    { label: { tr: 'Talep', en: 'The ask' }, weight: 1, prefer: ['statistics', 'content'] },
  ],

  // Kazanımlar → kavramlar → örnek → uygulama → özet → değerlendirme.
  training: [
    { label: { tr: 'Kazanımlar', en: 'Objectives' }, weight: 1, prefer: ['content'] },
    { label: { tr: 'Kavramlar', en: 'Concepts' }, weight: 3, prefer: ['content', 'two-column'] },
    { label: { tr: 'Örnek', en: 'Worked example' }, weight: 2, prefer: ['content', 'image'] },
    { label: { tr: 'Uygulama', en: 'Practice' }, weight: 2, prefer: ['process', 'content'] },
    { label: { tr: 'Özet', en: 'Summary' }, weight: 1, prefer: ['content'] },
    { label: { tr: 'Değerlendirme', en: 'Assessment' }, weight: 1, prefer: ['content', 'comparison'] },
  ],

  // Hedef → yapılanlar → sayılar → iyi/kötü giden → sonraki dönem.
  retrospective: [
    { label: { tr: 'Hedef', en: 'The goal' }, weight: 1, prefer: ['content'] },
    { label: { tr: 'Yapılanlar', en: 'What was done' }, weight: 2, prefer: ['timeline', 'process'] },
    { label: { tr: 'Sayılar', en: 'The numbers' }, weight: 2, prefer: ['statistics', 'chart'] },
    { label: { tr: 'İyi giden · kötü giden', en: 'What went well & badly' }, weight: 2, prefer: ['comparison', 'two-column'] },
    { label: { tr: 'Sonraki dönem', en: 'Next period' }, weight: 2, prefer: ['process', 'content'] },
  ],
}

/** Dağıtımın çıktısı — bir bölüm ve ona düşen slayt sayısı. */
export type PlannedSection = { label: string; slides: number; prefer?: SlideType[] }

/** Kapak + kapanış: her destede sabit iki slayt, dağıtımın dışında kalır. */
const FIXED_SLIDES = 2

function sectionsOf(framework: Framework): FrameworkSection[] {
  return FRAMEWORK_SECTIONS[framework] ?? FRAMEWORK_SECTIONS[DEFAULT_FRAMEWORK]
}

/**
 * Slayt sayısını bölümlere ağırlığa göre dağıtır (kapak ve kapanış hariç).
 *
 * Deterministik olmak zorunda: aynı girdi sihirbazda kullanıcıya gösterilen
 * listeyi de, modele giden istemi de üretiyor; ikisi uyuşmazsa kullanıcı
 * seçtiğinden başka bir deste alır.
 *
 * Yöntem — "en büyük kalan" (largest remainder):
 *   1) Her bölüme önce 1 slayt (bölüm varsa görünür olmalı).
 *   2) Kalan slaytlar ağırlığa oranla paylaştırılır, tam sayıya yuvarlanır.
 *   3) Yuvarlamadan artan slaytlar en büyük kesirli kalana, eşitlikte en büyük
 *      ağırlığa, o da eşitse listede önce gelene verilir.
 * Bu sayede toplam HER ZAMAN hedefe tam eşit çıkar.
 */
export function planSections(framework: Framework, slideCount: number, lang: SunumLang): PlannedSection[] {
  const all = sectionsOf(framework)
  // Gövde = toplam − (kapak + kapanış). En az bir gövde slaytı garanti edilir;
  // slideCount alt sınırı 3 olduğu için bu pratikte 1'e düşebiliyor.
  const body = Math.max(1, Math.floor(slideCount) - FIXED_SLIDES)

  // Bölüm sayısı gövdeden fazlaysa "her bölüme en az 1" tutturulamaz. O hâlde
  // en HAFİF bölümler elenir (eşitlikte sondaki), kalanların sırası korunur.
  let chosen = all
  if (body < all.length) {
    const keep = all
      .map((section, index) => ({ section, index }))
      .sort((a, b) => b.section.weight - a.section.weight || a.index - b.index)
      .slice(0, body)
      .sort((a, b) => a.index - b.index)
    chosen = keep.map((entry) => entry.section)
  }

  const totalWeight = chosen.reduce((sum, section) => sum + section.weight, 0) || chosen.length
  const rest = body - chosen.length // her bölüme verilen 1'den sonra kalanlar

  const shares = chosen.map((section, index) => {
    const exact = (rest * section.weight) / totalWeight
    const whole = Math.floor(exact)
    return { index, section, slides: 1 + whole, remainder: exact - whole }
  })

  // Yuvarlama artığını dağıt: kalan büyük → ağırlık büyük → sıra önce.
  let leftover = rest - shares.reduce((sum, share) => sum + share.slides - 1, 0)
  const order = shares
    .slice()
    .sort((a, b) => b.remainder - a.remainder || b.section.weight - a.section.weight || a.index - b.index)
  for (let i = 0; leftover > 0; i = (i + 1) % order.length) {
    order[i].slides += 1
    leftover -= 1
  }

  return shares.map((share) => ({
    label: share.section.label[lang],
    slides: share.slides,
    prefer: share.section.prefer,
  }))
}

/**
 * Plan istemine eklenecek, standardın iskeletini anlatan metin.
 *
 * @param compact Tek geçişli üretimde (generateUserPrompt) istem bütçesi dar;
 *   o modda tip ipuçları ve gerekçe cümlesi düşer, yalnızca bölüm/slayt tablosu
 *   kalır. Derin üretimin plan adımında tam metin kullanılır.
 */
export function frameworkRule(
  framework: Framework,
  slideCount: number,
  lang: SunumLang,
  compact = false,
): string {
  const sections = planSections(framework, slideCount, lang)
  const en = lang === 'en'

  const rows = sections.map((section, index) => {
    const count = en
      ? `${section.slides} slide${section.slides === 1 ? '' : 's'}`
      : `${section.slides} slayt`
    // Tip ipucu bir ÖNERİdir: alan kuralı (bkz. prompts.ts) hâlâ üstündür,
    // bölüm o tipin alanını dolduramıyorsa model "content"e düşmelidir.
    const hint = !compact && section.prefer?.length
      ? en
        ? ` (preferred types: ${section.prefer.join(', ')})`
        : ` (tercih edilen tipler: ${section.prefer.join(', ')})`
      : ''
    return `${index + 1}. ${section.label} — ${count}${hint}`
  })

  if (en) {
    const head =
      'CONTENT FRAMEWORK — build the slides BETWEEN the cover (slide 1) and the closing slide ' +
      'from these sections, in this exact order and with these slide counts:'
    const tail = compact
      ? 'Do not reorder, skip or add sections.'
      : 'Do not reorder, skip or add sections. The slide counts are binding. Each section may span ' +
        'several slides — when it does, give each one its own angle instead of repeating the section title.'
    return [head, rows.join('\n'), tail].join('\n')
  }

  const head =
    'İÇERİK STANDARDI — kapak (1. slayt) ile kapanış slaytı ARASINDAKİ slaytları şu bölümlere, ' +
    'şu sırayla ve şu slayt sayılarıyla kur:'
  const tail = compact
    ? 'Bölümlerin sırasını değiştirme, bölüm atlama, bölüm ekleme.'
    : 'Bölümlerin sırasını değiştirme, bölüm atlama, bölüm ekleme. Slayt sayıları bağlayıcıdır. ' +
      'Bir bölüm birden fazla slayt alıyorsa her slayta AYRI bir açı ver; bölüm başlığını tekrar etme.'
  return [head, rows.join('\n'), tail].join('\n')
}

/* ============================ standardın UYGULANMASI ============================ */

/**
 * Planı seçilen standarda HİZALAR.
 *
 * İstem standardı anlatıyor ama zayıf modeller ona uymuyor: bölüm atlıyor,
 * sırayı değiştiriyor, altı bölümlük bir iskeleti üç slaytta bitiriyor. Sonuç
 * kullanıcı açısından "standardı seçtim ama hiçbir şey değişmedi" oluyor.
 *
 * Bu yüzden hizalama İSTEMDE değil, çıktının üzerinde yapılıyor: beklenen bölüm
 * listesi tek doğruluk kaynağıdır, modelin ürettiği başlık ve görev tanımları
 * o iskelete oturtulur. Model iyi çalıştıysa kendi metinleri korunur; kaytardıysa
 * eksik bölümler bölüm adından doldurulur.
 */
export function alignToFramework(
  items: PlanItem[],
  framework: Framework,
  slideCount: number,
  lang: SunumLang,
): PlanItem[] {
  const sections = planSections(framework, slideCount, lang)
  if (sections.length === 0) return items

  // Kapak ve kapanış iskeletin dışında; hizalama yalnızca GÖVDEYE uygulanır.
  const cover = items.length > 0 && items[0].type === 'title' ? items[0] : null
  const closing =
    items.length > 1 && items[items.length - 1].type === 'conclusion' ? items[items.length - 1] : null
  const middle = items.slice(cover ? 1 : 0, closing ? items.length - 1 : items.length)

  const aligned: PlanItem[] = []
  let cursor = 0
  for (let s = 0; s < sections.length; s++) {
    const section = sections[s]
    for (let n = 0; n < section.slides; n++) {
      const source = middle[cursor]
      cursor += 1
      const preferred = section.prefer && section.prefer.length > 0 ? section.prefer[0] : 'content'
      aligned.push({
        // Modelin başlığı varsa korunur; yoksa bölüm adı başlık olur.
        title: source?.title || (section.slides > 1 ? `${section.label} ${n + 1}` : section.label),
        /*
         * Tip seçimi: modelin tercihi kural olarak KORUNUR. Tek istisna generic
         * "content" — o, modelin tembel varsayılanı; bölüm görsel bir tip
         * bekliyorsa oraya yükseltiliyor. Ters yönde zorlama yapılmıyor, çünkü
         * verisi olmayan bir slaytı grafiğe çevirmek boş grafik üretiyor.
         */
        type: source && source.type !== 'content' ? source.type : preferred,
        // Görev tanımına bölüm adı eklenir: genişletme adımı hangi bölümü
        // yazdığını bilmezse iki bölüm aynı şeyi anlatıyor.
        brief: source?.brief ? `${section.label} — ${source.brief}` : section.label,
      })
    }
  }

  const out: PlanItem[] = []
  if (cover) out.push(cover)
  for (let i = 0; i < aligned.length; i++) out.push(aligned[i])
  if (closing) out.push(closing)
  return out
}
