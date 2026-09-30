// Ollama'ya giden istem (prompt) metinleri.
//
// İki kural promptun tamamını biçimlendirir:
//   1) Model YALNIZCA içerik ve akış üretir — renk, yazı tipi, konum asla istenmez (§2).
//   2) Çıktı yapısal JSON'dur; şema `format` alanıyla zorlanır, prompt onu tekrar
//      anlatmak yerine ALAN SEÇİMİNİ anlatır (hangi slayt tipinde hangi alan dolar).
//
// Dil: sunum dili kullanıcıdan gelir; prompt da o dilde yazılır. Türkçe istem,
// Türkçe çıktıyı belirgin biçimde iyileştiriyor (8B modelde dil kayması azalıyor).

import { frameworkRule } from '../frameworks'
import { SLIDE_GLYPHS } from '../types'
import {
  DEFAULT_TONE,
  type Audience,
  type GenerationRequest,
  type RefineAction,
  type RefineRequest,
  type SlideRequest,
  type SunumLang,
  type Tone,
} from '../types'

/** Ton yalnızca ÜSLUBU değiştirir; slayt yapısı ve tasarım tondan etkilenmez. */
const TONE_TR: Record<Tone, string> = {
  professional: 'Kurumsal ve ölçülü bir dil kullan; abartılı sıfat yok, somut ifade var.',
  academic: 'Akademik bir dil kullan; iddiaları temkinli kur, yöntem ve bulguyu ayır.',
  friendly: 'Samimi ve sade bir dil kullan; doğrudan dinleyiciye seslen, kısa cümle kur.',
  persuasive: 'İkna edici bir dil kullan; faydayı öne al, her bölümü net bir çıkarımla kapat.',
}

const TONE_EN: Record<Tone, string> = {
  professional: 'Use a corporate, measured register; no hype adjectives, concrete statements.',
  academic: 'Use an academic register; hedge claims, separate method from findings.',
  friendly: 'Use a warm, plain register; address the audience directly with short sentences.',
  persuasive: 'Use a persuasive register; lead with benefit and close each section with a clear takeaway.',
}

const AUDIENCE_TR: Record<Audience, string> = {
  professional:
    'profesyonel karma dinleyici; HİÇBİR ayrıntıyı eleme. Terimi kullan ama ilk geçtiğinde ' +
    'tek cümleyle tanımla; sayıyı, mekanizmayı ve karar noktasını birlikte ver. ' +
    'Ne basitleştir ne de jargona boğ.',
  student: 'üniversite öğrencileri; terimleri tanımla, örnek ver, cümleler kısa olsun',
  employee: 'kurum çalışanları; günlük işe etkisini ve uygulama adımlarını öne çıkar',
  management: 'üst yönetim; maliyet, risk, kazanım ve karar noktalarını öne çıkar, teknik ayrıntıya girme',
  technical: 'yazılım/teknik ekip; mimari, ölçeklenebilirlik ve somut teknoloji adlarını kullan',
  customer: 'müşteri/dış paydaş; fayda odaklı konuş, jargon kullanma',
  academic: 'akademik dinleyici; yöntem, bulgu ve kaynak mantığını öne çıkar, iddiaları temkinli kur',
  general: 'genel katılımcı; ön bilgi varsayma, günlük dilden örneklerle anlat',
}

const AUDIENCE_EN: Record<Audience, string> = {
  professional:
    'a mixed professional audience; drop NO detail. Use the term but define it in one clause the ' +
    'first time it appears; give the figure, the mechanism and the decision point together. ' +
    'Neither dumb it down nor bury it in jargon.',
  student: 'university students; define terms, give examples, keep sentences short',
  employee: 'company staff; emphasise day-to-day impact and rollout steps',
  management: 'executives; emphasise cost, risk, gain and decision points, avoid deep technical detail',
  technical: 'engineering team; use architecture, scalability and concrete technology names',
  customer: 'customers and external stakeholders; benefit-first, no jargon',
  academic: 'an academic audience; foreground method, findings and sourcing, hedge claims carefully',
  general: 'a general audience; assume no prior knowledge, use everyday examples',
}

/**
 * Kaç slayt GÖRSEL tipte olmalı?
 *
 * Kapak ve kapanış dışındaki slaytların kabaca yarısı. Alt sınır 2: iki görsel
 * slaytı olmayan bir deste "madde listesi yığını" gibi duruyor. Üst sınır 6:
 * her slaytı grafik yapmak da anlatımı boğuyor.
 */
function visualSlideQuota(slideCount: number): number {
  const middle = Math.max(1, slideCount - 2)
  return Math.max(2, Math.min(6, Math.round(middle / 2)))
}

/** Sunum süresine göre slayt başına konuşma yükü — madde sayısını buradan türetiyoruz. */
function densityHint(durationMinutes: number, slideCount: number): number {
  const perSlide = durationMinutes / Math.max(1, slideCount)
  if (perSlide < 0.8) return 3
  if (perSlide < 1.6) return 4
  return 5
}

const FIELD_GUIDE_TR = `Slayt tipleri ve dolduracağın alanlar:
- title: kapak. title + subtitle.
- content: bullets (madde listesi).
- two-column: left.heading/left.bullets ve right.heading/right.bullets.
- comparison: left ve right (karşıt iki yaklaşım) + verdict (tek cümle sonuç).
- statistics: stats[] → value (kısa sayı/oran) + label.
- chart: chart.chartType (bar|line|pie|donut) + chart.points[] (label, value sayısal) + chart.unit.
- timeline: steps[] → label (yıl/dönem) + title.
- process: steps[] → title (+ kısa description).
- architecture: layers[] → name + nodes[] (katmandaki bileşenler).
- image: bullets + caption (görsel yer tutucusu otomatik gelir).
- quote: quote.text + quote.author.
- conclusion: bullets + cta (kapanış cümlesi).

Ayrıca HER slaytta şu iki alanı da doldur:
- "highlight": o slayttan akılda kalması gereken TEK cümle (en fazla 12 kelime).
  Başlığı tekrar etme; çıkarımı yaz.
- "icon": slaytın konusunu anlatan simge adı. Bu bir TASARIM tercihi değil,
  anlamsal bir etikettir — nasıl çizileceğine şablon karar verir.`

const FIELD_GUIDE_EN = `Slide types and the fields you must fill:
- title: cover. title + subtitle.
- content: bullets.
- two-column: left.heading/left.bullets and right.heading/right.bullets.
- comparison: left and right (two opposing approaches) + verdict (one-sentence conclusion).
- statistics: stats[] → value (short number/ratio) + label.
- chart: chart.chartType (bar|line|pie|donut) + chart.points[] (label, numeric value) + chart.unit.
- timeline: steps[] → label (year/period) + title.
- process: steps[] → title (+ short description).
- architecture: layers[] → name + nodes[] (components in that layer).
- image: bullets + caption (the visual placeholder is added automatically).
- quote: quote.text + quote.author.
- conclusion: bullets + cta (closing line).

Also fill these two fields on EVERY slide:
- "highlight": the ONE sentence that should stick (max 12 words). Do not repeat
  the title; write the takeaway.
- "icon": the name of the icon that describes the slide's subject. This is not a
  DESIGN choice but a semantic label — the template decides how it is drawn.`

/**
 * Biçim örneği.
 *
 * Neden gerekli: bazı sağlayıcılar `response_format` alsa da ŞEMAYI ZORLAMIYOR
 * (yalnızca "JSON döndür" diyor). O durumda yapıyı taşıyan tek şey istem oluyor.
 * Kısa ve somut bir örnek, alan adlarının doğru seçilmesini belirgin biçimde
 * artırıyor — örnek olmadan model "bullets" yerine rastgele bir alan yazabiliyor.
 */
const SHAPE_EXAMPLE = `{"title":"…","subtitle":"…","slides":[
{"type":"title","title":"…","subtitle":"…"},
{"type":"content","title":"…","bullets":["…","…"],"icon":"shield","example":"Somut, gerçek bir örnek.","highlight":"Akılda kalacak tek cümle"},
{"type":"comparison","title":"…","left":{"heading":"…","bullets":["…"]},"right":{"heading":"…","bullets":["…"]},"comparisonVerdict":"…"},
{"type":"statistics","title":"…","icon":"chart","stats":[{"value":"%38","label":"…"}]},
{"type":"chart","title":"…","chart":{"chartType":"bar","unit":"%","points":[{"label":"2024","value":45}]}},
{"type":"process","title":"…","steps":[{"title":"…","description":"…"}]},
{"type":"timeline","title":"…","steps":[{"label":"2024","title":"…"}]},
{"type":"architecture","title":"…","layers":[{"name":"…","nodes":["…","…"]}]},
{"type":"conclusion","title":"…","bullets":["…"],"cta":"…"}]}`

/**
 * KONU MODU istemi.
 *
 * Kaynak doküman verilmediğinde modelin varsayılan davranışı konuyu başlık
 * seviyesinde geçmek oluyor: doğru ama içi boş maddeler ("X önemlidir",
 * "Y giderek yaygınlaşıyor"). Bu blok tam olarak onu hedefliyor — modelden
 * tanım + işleyiş + SOMUT örnek isteniyor, ve uydurma sayı/kaynak yasaklanıyor.
 *
 * Kaynak metin varsa bu blok kullanılmaz: orada doğruluk ölçütü kaynağın
 * kendisidir, modelin dünya bilgisi değil.
 *
 * `compact` (dar çıktı bütçeli ücretsiz sağlayıcılar) durumunda ÖRNEK istenmez.
 * Ölçülen davranış: 1500 token'lık bütçede örnek isteyince model ya örneği hiç
 * yazmıyor ya da desteyi yarıda bırakıyor — ikisi de daha kötü bir sonuç. Örnek
 * orada ikinci geçişe bırakılır (Koç paneli → "Eksik örnekleri AI ile yaz"),
 * çünkü slayt başına yapılan çağrının bütçesi bu iş için fazlasıyla yeterli.
 */
function depthRules(lang: SunumLang, hasSource: boolean, compact: boolean): string[] {
  if (lang === 'en') {
    if (hasSource) {
      return [
        'Take numbers ONLY from the source text; never invent figures that are not in it.',
        'Put a concrete case FROM THE SOURCE into the "example" field of each content slide. ' +
          'If the source has no case for that slide, leave "example" empty rather than inventing one.',
      ]
    }
    const rules = [
      'TOPIC MODE — there is no source document, so you open the subject yourself:',
      '- Never write a shallow bullet. "X is important" carries no information: write WHAT it is, ' +
        'WHY it matters, or HOW it works. Every bullet must teach something.',
      '- Build depth across the deck: define the subject and its boundary early, then go deeper — ' +
        'components, how it actually works, where it fails, what to do about it.',
      '- Be honest with figures: never invent a statistic or a source name. Use widely known, rounded ' +
        'values and say so ("roughly twice", "around 30%").',
    ]
    if (!compact) {
      rules.splice(
        3,
        0,
        '- Fill the "example" field on EVERY slide except the cover and the closing: a REAL, CONCRETE ' +
          'example — a named product, company, event, or a scenario from the audience\'s own day. ' +
          'Not a generic sentence.',
      )
    }
    return rules
  }
  if (hasSource) {
    return [
      'Sayıları YALNIZCA kaynak metinden al; metinde olmayan rakam uydurma.',
      'Her içerik slaytının "example" alanına KAYNAKTAKİ somut bir vakayı yaz. ' +
        'O slayt için kaynakta vaka yoksa "example" alanını boş bırak, uydurma.',
    ]
  }
  const rules = [
    'KONU MODU — kaynak doküman YOK, konuyu sen açacaksın:',
    '- Yüzeysel madde yazma. "X önemlidir" bir bilgi değildir: NE olduğunu, NEDEN önemli olduğunu ' +
      'ya da NASIL işlediğini yaz. Her madde bir şey öğretmeli.',
    '- Deste boyunca derinleş: önce konuyu tanımla ve sınırını çiz, sonra bileşenlerine, gerçek ' +
      'işleyişine, nerede tıkandığına ve ne yapıldığına in.',
    '- Sayılarda dürüst ol: emin olmadığın rakamı ve kaynak adını UYDURMA. Yaygın bilinen, yuvarlak ' +
      'değerler kullan ve bunu belli et ("yaklaşık iki katı", "%30 civarı").',
  ]
  if (!compact) {
    rules.splice(
      3,
      0,
      '- Kapak ve kapanış dışındaki HER slaytta "example" alanını doldur: GERÇEK ve SOMUT bir örnek — ' +
        'adı geçen bir ürün, kurum, olay ya da dinleyicinin kendi gününden bir senaryo. ' +
        'Genel geçer bir cümle değil.',
    )
  }
  return rules
}

/** Simge adları — şemayı zorlamayan sağlayıcılarda listeyi istem taşır. */
function iconRule(lang: SunumLang): string {
  const names = SLIDE_GLYPHS.join(', ')
  return lang === 'en'
    ? `Set "icon" on every slide to the most fitting name from this list: ${names}.`
    : `Her slaytta "icon" alanına şu adlardan konuya en uygun olanı yaz: ${names}.`
}

/** Dar bütçede biçim örneğinden "example" düşer; orada öncelik desteyi bitirmek. */
function shapeExample(compact: boolean): string {
  if (!compact) return SHAPE_EXAMPLE
  return SHAPE_EXAMPLE.replace('"example":"Somut, gerçek bir örnek.",', '')
}

export function systemPrompt(lang: SunumLang): string {
  if (lang === 'en') {
    return [
      'You are a presentation architect. You produce the CONTENT and the FLOW of a deck.',
      'You never decide design: no colours, fonts, sizes or positions — the rendering engine owns those.',
      'Answer with JSON only, matching the provided schema. No prose, no markdown, no explanation.',
      'Every slide must carry real substance: no placeholders, no "Lorem ipsum", no repeated slides.',
      FIELD_GUIDE_EN,
    ].join('\n\n')
  }
  return [
    'Sen bir sunum mimarısın. Bir sunumun İÇERİĞİNİ ve AKIŞINI üretirsin.',
    'Tasarıma asla karar vermezsin: renk, yazı tipi, boyut, konum senin işin değil — onları render motoru belirler.',
    'Yalnızca verilen şemaya uyan JSON ile yanıt ver. Açıklama, düz metin ya da markdown yazma.',
    'Her slayt gerçek içerik taşımalı: yer tutucu metin, "örnek metin" ya da tekrar eden slayt olmamalı.',
    FIELD_GUIDE_TR,
  ].join('\n\n')
}

/**
 * @param compact Sağlayıcının çıktı bütçesi dar mı? Ücretsiz katmanlar yanıtı
 *   sabit bir token sayısında kesiyor; bu durumda modelden baştan KISA yazması
 *   istenir, aksi hâlde sunum yarıda kesiliyor.
 */
export function generateUserPrompt(req: GenerationRequest, sourceText: string, compact = false): string {
  const bullets = compact ? 3 : densityHint(req.durationMinutes, req.slideCount)
  const visualQuota = visualSlideQuota(req.slideCount)
  const en = req.language === 'en'
  const audience = en ? AUDIENCE_EN[req.audience] : AUDIENCE_TR[req.audience]

  const lines: string[] = []
  if (en) {
    lines.push(`Topic: ${req.topic}`)
    lines.push(`Audience: ${audience}`)
    lines.push(`Talk length: ${req.durationMinutes} minutes · exactly ${req.slideCount} slides`)
    lines.push(`Aim for ${bullets} bullets per content slide, max ${compact ? 10 : 14} words each.`)
    if (compact) {
      lines.push('Keep sentences short and avoid repetition — but never leave a slide without its content.')
    }
    lines.push(
      `Structure: slide 1 is "title", the last one is "conclusion". At least ${visualQuota} of the slides ` +
        'in between MUST be VISUAL: statistics, chart, process, timeline, comparison or architecture. ' +
        'Never repeat the same type three times in a row.',
    )
    lines.push(
      'On VISUAL slides do NOT write "bullets" — fill only that type\'s own field ' +
        '(chart→chart.points, statistics→stats, process/timeline→steps, architecture→layers). ' +
        'Those slides are shorter; spend your budget on them.',
    )
    // İçerik standardı seçildiyse iskeleti burada söylüyoruz: yapı kurallarının
    // hemen ardından, ton ve biçim kurallarından önce. Tek geçişli üretimde
    // istem bütçesi dar olduğu için kısa biçim (compact) kullanılır.
    if (req.framework) lines.push(frameworkRule(req.framework, req.slideCount, 'en', true))
    for (const rule of depthRules('en', !!sourceText, compact)) lines.push(rule)
    if (!compact) lines.push(iconRule('en'))
    lines.push(TONE_EN[req.tone ?? DEFAULT_TONE])
    lines.push(
      'FIELD RULE: on each slide fill ONLY that type\'s field — content→bullets, ' +
        'statistics→stats, chart→chart, timeline/process→steps, architecture→layers, quote→quote. ' +
        'If you cannot fill a type\'s field, do NOT use that type — use "content" instead. ' +
        'Never squeeze content into another field. A title alone is NOT enough: ' +
        'every slide except the cover and quotes must have its content field filled.',
    )
    lines.push('Shape example (copy the FORMAT, not the content):\n' + shapeExample(compact))
    if (req.requirements) {
      lines.push(
        "THE USER'S REQUESTS (follow these; reflect the actionable ones in the structure):\n" +
          req.requirements,
      )
    }
    lines.push('Write every string in English.')
    if (sourceText) {
      lines.push('Build the deck strictly from the source material below. Do not invent figures that are not in it.')
      lines.push('--- SOURCE ---')
      lines.push(sourceText)
      lines.push('--- END SOURCE ---')
    }
  } else {
    lines.push(`Konu: ${req.topic}`)
    lines.push(`Hedef kitle: ${audience}`)
    lines.push(`Sunum süresi: ${req.durationMinutes} dakika · tam olarak ${req.slideCount} slayt`)
    lines.push(`İçerik slaytlarında ${bullets} madde hedefle, her madde en fazla ${compact ? 10 : 14} kelime.`)
    // "Kısa yaz" talimatı tek başına modeli içeriği tamamen atlamaya itiyordu;
    // kısalık madde SAYISINA değil madde UZUNLUĞUNA uygulanmalı.
    if (compact) {
      lines.push('Kısa cümleler kur ve tekrar etme — ama hiçbir slaytı maddesiz bırakma.')
    }
    lines.push(
      `Yapı: 1. slayt "title", son slayt "conclusion" olsun. ARADAKİ slaytların EN AZ ${visualQuota} tanesi ` +
        'GÖRSEL tipte olmalı: statistics, chart, process, timeline, comparison ya da architecture. ' +
        'Aynı tipi üst üste üç kez kullanma.',
    )
    // Görsel slaytlar madde taşımaz; bu hem daha etkili hem DAHA UCUZ. Küçük
    // modeller bütçesini metne harcayıp görsel üretmiyordu, bu kural onu çeviriyor.
    lines.push(
      'GÖRSEL SLAYTLARDA "bullets" YAZMA — yalnızca o tipin kendi alanını doldur ' +
        '(chart→chart.points, statistics→stats, process/timeline→steps, architecture→layers). ' +
        'Bu slaytlar daha kısadır; bütçeni onlara ayır.',
    )
    // İçerik standardı seçildiyse iskeleti burada söylüyoruz (bkz. EN dalı).
    if (req.framework) lines.push(frameworkRule(req.framework, req.slideCount, 'tr', true))
    for (const rule of depthRules('tr', !!sourceText, compact)) lines.push(rule)
    if (!compact) lines.push(iconRule('tr'))
    lines.push(TONE_TR[req.tone ?? DEFAULT_TONE])
    lines.push(
      'ALAN KURALI: her slaytta YALNIZCA o tipin alanını doldur — content→bullets, ' +
        'statistics→stats, chart→chart, timeline/process→steps, architecture→layers, quote→quote. ' +
        'Bir tipin alanını dolduramayacaksan o tipi KULLANMA, onun yerine "content" kullan. ' +
        'İçeriği başka bir alana sıkıştırma. Başlık TEK BAŞINA yeterli değildir: ' +
        'kapak ve alıntı dışındaki HER slaytın içerik alanı dolu olmalı.',
    )
    lines.push('Biçim örneği (İÇERİĞİ değil, BİÇİMİ örnek al):\n' + shapeExample(compact))
    // Kullanıcının kendi beklentisi diğer kurallardan SONRA gelir ki en taze
    // talimat o olsun; modeller son talimatı daha güçlü uyguluyor.
    if (req.requirements) {
      lines.push(
        'KULLANICININ İSTEKLERİ (bunlara mutlaka uy, uygulanabilir olanları yapıya yansıt):\n' +
          req.requirements,
      )
    }
    lines.push('Tüm metinleri Türkçe yaz.')
    if (sourceText) {
      lines.push('Sunumu yalnızca aşağıdaki kaynak metinden üret. Metinde olmayan sayı ya da iddia uydurma.')
      lines.push('--- KAYNAK ---')
      lines.push(sourceText)
      lines.push('--- KAYNAK SONU ---')
    }
  }
  return lines.join('\n')
}

/* ================================ derin üretim ================================ */

/**
 * PLAN istemi — derin üretimin ilk adımı.
 *
 * Çıktı bilinçli olarak KÜÇÜK: slayt başına tip, başlık ve bir cümlelik görev
 * tanımı. 8 slaytlık bir plan ≈300 token; en dar bütçeli ücretsiz sağlayıcıda
 * bile tamamı sığıyor. İçeriğin kendisi ikinci adımda, slayt başına ayrı bir
 * çağrıda yazılıyor — asıl derinlik kazancı buradan geliyor.
 */
/**
 * Plan adımının çıktı bütçesi.
 *
 * Sabit 1200 token'dı ve ölçüldü: 8 ve 16 slaytlık planlar sığıyor, 25 slaytlık
 * plan bütçeyi aşıp JSON'u ortasından kesiyordu — sonuç "Model geçerli JSON
 * döndürmedi" hatası ve ardından tüm üretimin yerel taslağa düşüp her slaydı
 * aynı yer tutucuyla doldurması. Bir plan satırı (tip + başlık + görev tanımı)
 * ortalama ~85 token; üstüne başlık/alt başlık ve yapısal pay ekleniyor.
 */
export function planBudget(slideCount: number): number {
  return Math.min(4096, Math.max(900, Math.round(slideCount * 110 + 400)))
}

export function planSystemPrompt(lang: SunumLang): string {
  if (lang === 'en') {
    return [
      'You are a presentation architect. You produce only the PLAN of a deck, never its content.',
      'For each slide give: the type, the title, and a one-sentence brief saying what that slide must cover.',
      'The brief is an instruction to the writer, not the slide text. Be specific: name the angle, the ' +
        'comparison, or the figure that slide should carry.',
      'The "title" field is the DECK\'s own title — never "… presentation plan" or "Plan for …".',
      'Answer with JSON only, matching the provided schema.',
    ].join('\n\n')
  }
  return [
    'Sen bir sunum mimarısın. Yalnızca sunumun PLANINI çıkarırsın, içeriğini değil.',
    'Her slayt için: tip, başlık ve o slaytın NE anlatması gerektiğini söyleyen tek cümlelik görev tanımı.',
    'Görev tanımı slaytın metni DEĞİL, yazara verilen talimattır. Somut ol: hangi açıyı, hangi ' +
      'karşılaştırmayı ya da hangi veriyi taşıyacağını söyle.',
    '"title" alanı SUNUMUN kendi başlığıdır — "… Sunumu Planı" ya da "… için Plan" YAZMA.',
    'Yalnızca verilen şemaya uyan JSON ile yanıt ver.',
  ].join('\n\n')
}

export function planUserPrompt(req: GenerationRequest, sourceOutline: string): string {
  const en = req.language === 'en'
  const audience = en ? AUDIENCE_EN[req.audience] : AUDIENCE_TR[req.audience]
  const visualQuota = visualSlideQuota(req.slideCount)
  const lines: string[] = []

  if (en) {
    lines.push(`Topic: ${req.topic}`)
    lines.push(`Audience: ${audience}`)
    lines.push(`Talk length: ${req.durationMinutes} minutes · exactly ${req.slideCount} slides`)
    lines.push(
      `Structure: slide 1 is "title", the last one is "conclusion". At least ${visualQuota} of the ` +
        'slides in between MUST be visual: statistics, chart, process, timeline, comparison or ' +
        'architecture. Never repeat the same type three times in a row.',
    )
    lines.push(
      'Build a real arc: define the subject, then go deeper — how it works, what the numbers say, ' +
        'where it breaks, what to do. Never two slides that cover the same ground.',
    )
    // Standart seçiliyse GENEL akış tavsiyesinin ARDINDAN gelir: daha somut
    // olan kural sonda durduğunda model onu baskın talimat sayıyor. Planın
    // tamamı burada belirleniyor; slayt yazma adımı bu plandan besleniyor.
    if (req.framework) lines.push(frameworkRule(req.framework, req.slideCount, 'en'))
    if (req.requirements) lines.push("THE USER'S REQUESTS (reflect these in the plan):\n" + req.requirements)
    if (sourceOutline) {
      lines.push('Plan the deck around the source material below; each slide must map to part of it.')
      lines.push('--- SOURCE OUTLINE ---')
      lines.push(sourceOutline)
      lines.push('--- END ---')
    }
    lines.push('Write every string in English.')
  } else {
    lines.push(`Konu: ${req.topic}`)
    lines.push(`Hedef kitle: ${audience}`)
    lines.push(`Sunum süresi: ${req.durationMinutes} dakika · tam olarak ${req.slideCount} slayt`)
    lines.push(
      `Yapı: 1. slayt "title", son slayt "conclusion" olsun. ARADAKİ slaytların EN AZ ${visualQuota} ` +
        'tanesi görsel tipte olmalı: statistics, chart, process, timeline, comparison ya da ' +
        'architecture. Aynı tipi üst üste üç kez kullanma.',
    )
    lines.push(
      'Gerçek bir akış kur: önce konuyu tanımla, sonra derinleş — nasıl işliyor, veriler ne diyor, ' +
        'nerede tıkanıyor, ne yapılmalı. İki slayt aynı şeyi anlatmasın.',
    )
    // Standart seçiliyse genel akış tavsiyesini EZER (bkz. EN dalı).
    if (req.framework) lines.push(frameworkRule(req.framework, req.slideCount, 'tr'))
    if (req.requirements) lines.push('KULLANICININ İSTEKLERİ (plana yansıt):\n' + req.requirements)
    if (sourceOutline) {
      lines.push('Planı aşağıdaki kaynak materyalin etrafında kur; her slayt kaynağın bir parçasına karşılık gelsin.')
      lines.push('--- KAYNAK ÖZETİ ---')
      lines.push(sourceOutline)
      lines.push('--- SON ---')
    }
    lines.push('Tüm metinleri Türkçe yaz.')
  }
  return lines.join('\n')
}

/* ============================== slayt iyileştirme ============================== */

/**
 * Komut yalnızca bir üst-veri alanı mı yazdırıyor?
 *
 * Bu üç komutta slaydın METNİ değişmemeli, yalnızca ilgili alan dolmalı. Dönen
 * ad şemada o alanı zorunlu kılmak için kullanılıyor — "metni değiştirme"
 * talimatını "hiçbir şey yazma" diye okuyan modeller aksi hâlde yalnızca
 * {type, title} döndürüyor.
 */
export function metaField(action: RefineAction): 'notes' | 'highlight' | 'example' | undefined {
  if (action === 'notes' || action === 'highlight' || action === 'example') return action
  return undefined
}

const ACTION_TR: Record<RefineAction, string> = {
  shorten: 'Metinleri kısalt. Anlamı koru, madde sayısını en fazla 4e indir, her madde en fazla 10 kelime olsun.',
  professional: 'Daha profesyonel ve kurumsal bir üslupla yeniden yaz. Abartılı sıfatları at, somut ifadeler kullan.',
  simplify: 'Öğrenci seviyesine indir. Terimleri sadeleştir, gerekirse kısa bir örnek ekle.',
  toBullets: 'İçeriği en fazla 3 net maddeye dönüştür. Tipi "content" yap.',
  toChart: 'Slayttaki sayısal bilgiyi grafiğe çevir. Tipi "chart" yap, chart.points[] alanını doldur; sayı yoksa en makul tahminleri kullan ve chart.unit yaz.',
  toProcess: 'İçeriği sıralı adımlara çevir. Tipi "process" yap ve steps[] alanını doldur.',
  toTimeline:
    'İçeriği zaman çizelgesine çevir. Tipi "timeline" yap; steps[] içinde label (yıl/dönem) ve title doldur. Tarih yoksa mantıklı bir sıralama kur.',
  toStats:
    'İçerikteki en çarpıcı üç ölçütü büyük sayılara çevir. Tipi "statistics" yap, stats[] alanını doldur (value kısa olsun: "%38", "45 dk").',
  toComparison:
    'İçeriği iki karşıt sütuna böl. Tipi "comparison" yap; left ve right alanlarını başlık ve maddelerle doldur, comparisonVerdict alanına tek cümlelik sonucu yaz.',
  toArchitecture:
    'İçeriği katmanlı bir yapı şemasına çevir. Tipi "architecture" yap; layers[] içinde name ve nodes[] doldur.',
  expand: 'İçeriği zenginleştir: eksik kalan noktayı tamamla, en fazla 6 madde olacak şekilde detay ekle.',
  notes: 'Slaytın metnini DEĞİŞTİRME. Yalnızca `notes` alanına konuşmacının okuyacağı 3-4 cümlelik anlatım notu yaz.',
  highlight:
    'Slaytın metnini DEĞİŞTİRME. Yalnızca `highlight` alanına, bu slayttan akılda kalması gereken TEK cümleyi yaz (en fazla 12 kelime). Başlığı tekrar etme.',
  example:
    'Slaytın metnini DEĞİŞTİRME. Yalnızca `example` alanına, bu slaytın söylediğinin GERÇEK ve somut bir örneğini yaz: adı geçen bir ürün, kurum, olay ya da dinleyicinin günlük hayatından bir senaryo. En fazla iki cümle. Uydurma istatistik ya da kaynak adı verme; emin değilsen genel ama gerçek bir örnek seç.',
}

const ACTION_EN: Record<RefineAction, string> = {
  shorten: 'Shorten the text. Keep the meaning, drop to at most 4 bullets, max 10 words each.',
  professional: 'Rewrite in a more professional, corporate register. Remove hype adjectives, be concrete.',
  simplify: 'Bring it down to student level. Simplify terms and add a short example if useful.',
  toBullets: 'Turn the content into at most 3 crisp bullets. Set type to "content".',
  toChart: 'Turn the numeric information into a chart. Set type to "chart" and fill chart.points[]; if there are no numbers use the most reasonable estimates and set chart.unit.',
  toProcess: 'Turn the content into ordered steps. Set type to "process" and fill steps[].',
  toTimeline:
    'Turn the content into a timeline. Set type to "timeline"; fill steps[] with label (year/period) and title. If there are no dates, build a sensible ordering.',
  toStats:
    'Turn the three most striking measures into big numbers. Set type to "statistics" and fill stats[] (keep value short: "38%", "45 min").',
  toComparison:
    'Split the content into two opposing columns. Set type to "comparison"; fill left and right with a heading and bullets, and write the one-sentence conclusion into comparisonVerdict.',
  toArchitecture:
    'Turn the content into a layered structure diagram. Set type to "architecture"; fill layers[] with name and nodes[].',
  expand: 'Enrich the content: complete what is missing, add detail up to 6 bullets.',
  notes: 'Do NOT change the slide text. Only write a 3–4 sentence speaker note into the `notes` field.',
  highlight:
    'Do NOT change the slide text. Only write the ONE sentence that should stick into `highlight` (max 12 words). Do not repeat the title.',
  example:
    'Do NOT change the slide text. Only write into `example` one REAL, concrete example of what this slide claims: a named product, company, event, or a scenario from the audience\'s own day. At most two sentences. Never invent a statistic or a source name; if unsure, pick a general but real example.',
}

export function refineSystemPrompt(lang: SunumLang): string {
  if (lang === 'en') {
    return [
      'You edit a single presentation slide. You return the whole slide as JSON matching the schema.',
      'Keep the slide about the same subject. Never invent a different topic.',
      'You never decide design (colours, fonts, layout). JSON only — no prose, no markdown.',
      FIELD_GUIDE_EN,
    ].join('\n\n')
  }
  return [
    'Tek bir sunum slaytını düzenliyorsun. Slaytın tamamını şemaya uygun JSON olarak döndürürsün.',
    'Slaytın konusunu koru; başka bir konuya kaymaz.',
    'Tasarıma karar vermezsin (renk, yazı tipi, yerleşim). Yalnızca JSON — açıklama ya da markdown yazma.',
    FIELD_GUIDE_TR,
  ].join('\n\n')
}

export function refineUserPrompt(req: RefineRequest): string {
  const en = req.language === 'en'
  const instruction = en ? ACTION_EN[req.action] : ACTION_TR[req.action]
  const audience = en ? AUDIENCE_EN[req.audience] : AUDIENCE_TR[req.audience]
  // Slaytın kendisi JSON olarak verilir: model mevcut alanları görüp aynı şekilde döner.
  const current = JSON.stringify(slideForPrompt(req), null, 0)
  return en
    ? [
        `Deck title: ${req.presentationTitle}`,
        `Audience: ${audience}`,
        `Task: ${instruction}`,
        'Current slide:',
        current,
      ].join('\n')
    : [
        `Sunum başlığı: ${req.presentationTitle}`,
        `Hedef kitle: ${audience}`,
        `Görev: ${instruction}`,
        'Mevcut slayt:',
        current,
      ].join('\n')
}

/* ============================ konudan slayt üretme ============================ */

const TYPE_HINT_TR: Record<string, string> = {
  title: 'kapak',
  content: 'madde listesi',
  'two-column': 'iki sütun',
  comparison: 'karşılaştırma',
  statistics: 'büyük sayılar',
  chart: 'grafik',
  timeline: 'zaman çizelgesi',
  process: 'süreç adımları',
  architecture: 'katmanlı mimari',
  image: 'görsel + maddeler',
  quote: 'alıntı',
  conclusion: 'kapanış',
}

export function slideSystemPrompt(lang: SunumLang): string {
  if (lang === 'en') {
    return [
      'You write ONE slide for an existing presentation. Return a single slide object as JSON.',
    'FIELD ORDER: write "type" first, then "title", then that type\'s content field, and "highlight" last.',
      'It must fit the deck and must NOT repeat what the other slides already say.',
      'You never decide design (colours, fonts, layout). JSON only — no prose, no markdown.',
      FIELD_GUIDE_EN,
    ].join('\n\n')
  }
  return [
    'Var olan bir sunum için TEK bir slayt yazıyorsun. Tek bir slayt nesnesini JSON olarak döndür.',
    // Yanıt token bütçesinde kesilebiliyor; en kritik alanlar önce yazılırsa
    // kesilen çıktı bile kullanılabilir kalıyor (bkz. repairTruncatedJson).
    'ALAN SIRASI: önce "type", sonra "title", sonra o tipin içerik alanı, en son "highlight".',
    'Slayt sunuma uymalı ve diğer slaytlarda anlatılanı TEKRAR ETMEMELİ.',
    'Tasarıma karar vermezsin (renk, yazı tipi, yerleşim). Yalnızca JSON — açıklama ya da markdown yazma.',
    FIELD_GUIDE_TR,
  ].join('\n\n')
}

export function slideUserPrompt(req: SlideRequest): string {
  const en = req.language === 'en'
  const audience = en ? AUDIENCE_EN[req.audience] : AUDIENCE_TR[req.audience]
  const lines: string[] = []

  if (en) {
    lines.push(`Deck: ${req.presentationTitle}`)
    lines.push(`Topic: ${req.topic}`)
    lines.push(`Audience: ${audience}`)
    if (req.existingTitles.length > 0) {
      lines.push('Slides already in the deck (do not repeat these):\n- ' + req.existingTitles.join('\n- '))
    }
    lines.push(
      req.type
        ? `Write a slide of type "${req.type}" and fill ONLY that type's field.`
        : 'Pick the type that best fits the content and fill only that type\'s field.',
    )
    if (req.instruction) lines.push(`What it should cover: ${req.instruction}`)
    if (req.brief) lines.push(`This slide's job: ${req.brief}`)
    if (req.bulletTarget) {
      lines.push(
        `Write ${req.bulletTarget} bullets. Each one a full, informative sentence of 12–22 words — ` +
          'not a label. A bullet that only names a thing is wasted: say what it is, what it causes, ' +
          'or what follows from it.',
      )
    }
    if (req.sourceExcerpt) {
      lines.push(
        'Build this slide STRICTLY from the source section below. Use its figures verbatim; never ' +
          'invent a number that is not there. If the section does not cover something, leave it out.',
      )
      lines.push('--- SOURCE SECTION ---')
      lines.push(req.sourceExcerpt)
      lines.push('--- END ---')
    }
    lines.push(TONE_EN[req.tone ?? DEFAULT_TONE])
    lines.push('Also fill "highlight" with the one sentence that should stick (max 12 words).')
    lines.push(
      req.sourceExcerpt
        ? 'Fill "example" with a concrete case taken FROM THE SOURCE SECTION above — a figure in ' +
            'context, a named entity, a described situation. Two sentences at most.'
        : 'Fill "example" with one REAL, concrete example of this slide\'s point — a named product, ' +
            'company, event or an everyday scenario. Never invent a statistic or a source name. ' +
            'Two sentences at most.',
    )
    lines.push(iconRule('en'))
    lines.push('Write every string in English.')
  } else {
    lines.push(`Sunum: ${req.presentationTitle}`)
    lines.push(`Konu: ${req.topic}`)
    lines.push(`Hedef kitle: ${audience}`)
    if (req.existingTitles.length > 0) {
      lines.push('Destede zaten olan slaytlar (bunları TEKRAR ETME):\n- ' + req.existingTitles.join('\n- '))
    }
    lines.push(
      req.type
        ? `"${req.type}" (${TYPE_HINT_TR[req.type] ?? req.type}) tipinde bir slayt yaz ve YALNIZCA o tipin alanını doldur.`
        : 'İçeriğe en uygun tipi sen seç ve yalnızca o tipin alanını doldur.',
    )
    if (req.instruction) lines.push(`Slaytın konusu: ${req.instruction}`)
    if (req.brief) lines.push(`Bu slaytın görevi: ${req.brief}`)
    // Derin üretimin asıl kazancı burada: tek slaytın bütçesi tüm desteye
    // bölünmediği için maddeler etiket değil, gerçek cümle olabiliyor.
    if (req.bulletTarget) {
      lines.push(
        `${req.bulletTarget} madde yaz. Her madde 12–22 kelimelik TAM ve bilgi taşıyan bir cümle ` +
          'olsun — etiket değil. Yalnızca bir şeyin adını söyleyen madde boşa gider: ne olduğunu, ' +
          'neye yol açtığını ya da bundan ne çıktığını yaz.',
      )
    }
    if (req.sourceExcerpt) {
      lines.push(
        'Bu slaytı YALNIZCA aşağıdaki kaynak bölümünden kur. Sayıları olduğu gibi kullan; ' +
          'bölümde olmayan rakam uydurma. Bölümde geçmeyen bir şeyi slayda koyma.',
      )
      lines.push('--- KAYNAK BÖLÜMÜ ---')
      lines.push(req.sourceExcerpt)
      lines.push('--- SON ---')
    }
    lines.push(TONE_TR[req.tone ?? DEFAULT_TONE])
    lines.push('"highlight" alanına akılda kalması gereken tek cümleyi yaz (en fazla 12 kelime).')
    lines.push(
      req.sourceExcerpt
        ? '"example" alanına YUKARIDAKİ KAYNAK BÖLÜMÜNDEN somut bir vaka yaz — bağlamıyla birlikte ' +
            'bir sayı, adı geçen bir kurum ya da anlatılan bir durum. En fazla iki cümle.'
        : '"example" alanına bu slaytın söylediğinin GERÇEK ve somut bir örneğini yaz — adı geçen bir ' +
            'ürün, kurum, olay ya da günlük hayattan bir senaryo. Uydurma istatistik ya da kaynak adı ' +
            'verme. En fazla iki cümle.',
    )
    lines.push(iconRule('tr'))
    lines.push('Tüm metinleri Türkçe yaz.')
  }

  return lines.join('\n')
}

/**
 * Slaytı modele verirken teknik alanları (id, order, template, presentationId) atar:
 * model bunlarla uğraşmasın, sistem tarafı zaten yeniden atıyor. Gömülü görsel de
 * gönderilmez — base64 veri modele hiçbir şey katmaz, sadece bağlamı doldurur.
 */
function slideForPrompt(req: RefineRequest): Record<string, unknown> {
  const { slide } = req
  const content = slide.type === 'image' ? { ...slide.content, src: undefined } : slide.content
  return {
    type: slide.type,
    title: slide.title,
    subtitle: slide.subtitle,
    content,
    notes: slide.notes,
  }
}
