// Derin (çok geçişli) sunum üretimi.
//
// Sorun: tek yapısal çağrıda üretim, ücretsiz sağlayıcıların ≈1500 token'lık
// çıktı bütçesini TÜM desteye bölüyor. 8 slaytlık bir destede slayt başına
// ~130 karakter kalıyor — doğru ama içi boş maddeler. Kaynak doküman verilse
// bile aynı tavan geçerli: belgeden gelen ayrıntı bütçeye sığmıyor.
//
// Çözüm iki adım:
//   1) PLAN — tek küçük çağrı. Yalnızca tip + başlık + görev tanımı üretir
//      (≈300 token), en dar bütçede bile tamamı gelir.
//   2) GENİŞLETME — slayt başına bir çağrı. Her slayt bütçenin TAMAMINI kendine
//      kullanır; maddeler etiket değil cümle olur, örnek ve konuşmacı notu sığar.
//
// Kaynak doküman varsa her slayda dokümanın YALNIZCA ilgili bölümü gider
// (retrieve.ts). Bu hem bütçeyi korur hem modelin odağını slaydın konusunda
// tutar — tüm belgeyi her çağrıya koymak ikisini de bozuyordu.
//
// Çağrılar SIRAYLA yapılır: ücretsiz sağlayıcılar eşzamanlı isteklerde hız
// sınırına takılıyor. Sıralı akış ayrıca gerçek ilerleme yayımlamayı sağlıyor —
// her slayt bittiğinde kullanıcı onu görüyor, sahte yüzde çubuğu yok (§7).

import { LIMITS } from '../schema'
import { alignToFramework, planSections } from '../frameworks'
import { SourceIndex } from '../retrieve'
import { defaultTemplate } from '../templates'
import {
  DEFAULT_FRAMEWORK,
  DEFAULT_TONE,
  isSlideType,
  type DeckPlan,
  type GenerationRequest,
  type PlanItem,
  type Presentation,
  type Slide,
  type SlideRequest,
  type SlideType,
  uid,
} from '../types'
import { normalizeSlide } from './normalize'
import { AiError, isAiError } from './provider'

/** Bir slayda gönderilecek kaynak parçasının üst sınırı. */
const EXCERPT_BUDGET = 2200
/** Plan adımına verilen kaynak özetinin üst sınırı — plan ayrıntı değil yapı kurar. */
const OUTLINE_BUDGET = 4000

/** Derin üretimin adım adım bildirdiği gerçek ilerleme. */
export type DeepEvent =
  | { kind: 'plan'; title: string; subtitle?: string; total: number }
  | { kind: 'slide'; index: number; total: number; slide: Slide }
  /** Hız sınırına takılındı; `ms` kadar beklenip yeniden denenecek. */
  | { kind: 'wait'; index: number; total: number; ms: number }

/* ------------------------------ hız ayarlaması ------------------------------ */

/**
 * Ücretsiz sağlayıcılar arka arkaya gelen istekleri hız sınırına takıyor.
 * Ölçüldü: Pollinations'a 6 genişletme çağrısı peş peşe gönderildiğinde ALTISI
 * birden 402/429 döndü ve deste boş slaytlarla doldu.
 *
 * Çözüm sabit bir gecikme değil, KENDİNİ AYARLAYAN bir aralık: başta kısa
 * beklenir, sınıra takılınca aralık iki katına çıkar, arka arkaya başarıdan
 * sonra yavaşça düşer. Böylece hızlı sağlayıcı yavaşlatılmaz, yavaş sağlayıcıda
 * da deste tamamlanır — sağlayıcı başına sabit sayı yazmaya gerek kalmaz.
 */
class Pacer {
  private intervalMs = 900
  private last = 0

  async wait(): Promise<void> {
    const due = this.last + this.intervalMs - Date.now()
    if (due > 0) await sleep(due)
    this.last = Date.now()
  }

  /** Sınıra takıldık: aralığı büyüt ve bu denemeden önce beklenecek süreyi ver. */
  backoff(attempt: number): number {
    this.intervalMs = Math.min(15_000, Math.round(this.intervalMs * 2))
    return Math.min(30_000, 2500 * Math.pow(2, attempt))
  }

  /** Sorunsuz geçen çağrıdan sonra aralığı kademeli gevşet. */
  relax(): void {
    this.intervalMs = Math.max(600, Math.round(this.intervalMs * 0.85))
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Hız sınırı geçici bir durumdur: beklenip yeniden denenir, pes edilmez. */
const RATE_ATTEMPTS = 4

export type DeepPorts = {
  /** Planı üretir (sunucu ya da doğrudan sağlayıcı — çağıran karar verir). */
  plan: (req: GenerationRequest, sourceOutline: string, signal?: AbortSignal) => Promise<DeckPlan>
  /** Tek slaytı üretir. */
  slide: (req: SlideRequest, signal?: AbortSignal) => Promise<Slide>
}

/**
 * Süreye göre slayt başına madde hedefi.
 *
 * Derin üretimde bütçe slayt başına olduğu için hedef, tek geçişli üretimdeki
 * `densityHint`ten belirgin biçimde yüksek: orada 3–5 kısa madde, burada 4–6
 * tam cümle.
 */
function bulletTarget(durationMinutes: number, slideCount: number): number {
  const perSlide = durationMinutes / Math.max(1, slideCount)
  if (perSlide < 0.9) return 4
  if (perSlide < 1.8) return 5
  return 6
}

/** Modelin gevşek plan çıktısını sıkı `DeckPlan`e çevirir. */
export function normalizePlan(draft: unknown, req: GenerationRequest): DeckPlan {
  const d = (draft ?? {}) as { title?: unknown; subtitle?: unknown; slides?: unknown }
  const text = (v: unknown, max: number): string =>
    typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : ''

  /**
   * Model başlığa sık sık "… Sunumu Planı" ekliyor — istemde yasaklamak tek
   * başına yetmedi, bu yüzden deterministik olarak da kırpılıyor. Kullanıcının
   * göreceği şey destenin başlığı; "plan" bir iç adımın adı.
   */
  // Yalnızca "SUNUM planı" kalıbı kırpılır. Sadece "…Planı" ile biten başlık
  // dokunulmadan kalır: "Kalkınma Planı" gerçek bir sunum başlığıdır ve onu
  // "Kalkınma"ya indirmek içeriği yanlış adlandırır.
  const deckTitle = (raw: string): string =>
    raw
      .replace(/\s*[-–—:]?\s*(sunum(u)?|deste(si)?|presentation|slide deck)\s*plan(ı|i)?\s*$/i, '')
      .replace(/^\s*plan\s*[-–—:]\s*/i, '')
      .trim() || raw

  const rows = Array.isArray(d.slides) ? d.slides : []
  const items: PlanItem[] = []
  for (let i = 0; i < rows.length && items.length < LIMITS.slideCountMax; i++) {
    const row = (rows[i] ?? {}) as { type?: unknown; title?: unknown; brief?: unknown }
    const title = text(row.title, LIMITS.title)
    if (!title) continue
    const type: SlideType = isSlideType(row.type) ? row.type : 'content'
    items.push({ type, title, brief: text(row.brief, LIMITS.brief) })
  }

  // Kapak ve kapanış garantisi: plan bunları atlarsa yapı bozuluyor.
  if (items.length === 0 || items[0].type !== 'title') {
    items.unshift({ type: 'title', title: deckTitle(text(d.title, LIMITS.title)) || req.topic, brief: '' })
  }
  if (items[items.length - 1].type !== 'conclusion') {
    items.push({
      type: 'conclusion',
      title: req.language === 'en' ? 'Conclusion' : 'Sonuç',
      brief: '',
    })
  }

  /*
   * Hedefe kırparken KAPAK ve KAPANIŞ korunur, ortadan kesilir.
   *
   * Önce baştan kırpılıyordu: model hedeften fazla bölüm döndürdüğünde az önce
   * garantiye alınan kapanış slaytı tam da kırpmada uçuyordu. Ölçülen sonuç,
   * kapanışsız biten bir desteydi — üstelik hiçbir uyarı olmadan.
   */
  const limit = Math.max(2, Math.min(req.slideCount, LIMITS.slideCountMax))
  let trimmed = items
  if (items.length > limit) {
    const cover = items[0]
    const closing = items[items.length - 1]
    trimmed = [cover, ...items.slice(1, limit - 1), closing]
  }

  return {
    title: deckTitle(text(d.title, LIMITS.title)) || req.topic,
    subtitle: text(d.subtitle, LIMITS.subtitle) || undefined,
    items: trimmed,
  }
}

/**
 * AI'sız plan: standardın bölüm listesinden kurulur.
 *
 * Model planı üretemediğinde kullanılır. İçerik değil YAPI üretir; her slaydın
 * metni yine slayt başına AI çağrısıyla yazılır, yani sonuç yer tutucu bir
 * deste değil gerçek bir sunum olur.
 */
function fallbackPlan(req: GenerationRequest): DeckPlan {
  const framework = req.framework ?? DEFAULT_FRAMEWORK
  const sections = planSections(framework, req.slideCount, req.language)
  const items: PlanItem[] = [{ type: 'title', title: req.topic, brief: '' }]
  for (let s = 0; s < sections.length; s++) {
    const section = sections[s]
    const preferred = section.prefer && section.prefer.length > 0 ? section.prefer[0] : 'content'
    for (let n = 0; n < section.slides; n++) {
      items.push({
        type: preferred,
        title: section.slides > 1 ? `${section.label} ${n + 1}` : section.label,
        brief: section.label,
      })
    }
  }
  items.push({ type: 'conclusion', title: req.language === 'en' ? 'Conclusion' : 'Sonuç', brief: '' })
  return { title: req.topic, items }
}

/** Kapak slaydını plandan deterministik kurar — AI çağrısı harcamaya değmez. */
function coverSlide(plan: DeckPlan, presentationId: string): Slide {
  return {
    id: uid('sl'),
    presentationId,
    order: 0,
    type: 'title',
    template: defaultTemplate('title'),
    title: plan.title,
    subtitle: plan.subtitle,
    icon: 'idea',
    content: {},
  }
}

/**
 * Planı slayt slayt genişletir.
 *
 * Tek bir slaydın üretimi başarısız olursa deste iptal EDİLMEZ: o slayt planın
 * başlığıyla, içerik alanı boş olarak eklenir ve kullanıcı editörde tamamlar.
 * Yarım bir deste, hiç deste olmamasından iyidir — ücretsiz sağlayıcılarda
 * kota hatası her an gelebiliyor.
 */
export async function generateDeep(
  req: GenerationRequest,
  presentationId: string,
  ports: DeepPorts,
  onEvent?: (event: DeepEvent) => void,
  signal?: AbortSignal,
): Promise<{ plan: DeckPlan; slides: Slide[] }> {
  const index = new SourceIndex(req.sourceText ?? '')
  const outline = index.empty ? '' : index.select(req.topic, OUTLINE_BUDGET)

  /*
   * Plan çökerse üretim ÇÖKMEZ.
   *
   * Plan tek bir çağrı ve uzun destelerde model geçersiz JSON döndürebiliyor.
   * Eskiden bu hata yukarı fırlayıp tüm derin üretimi iptal ediyor, ardından
   * tek geçişli yol da başarısız olunca deste yerel taslaktan kuruluyordu —
   * yani kullanıcı HER SLAYDI "bu maddeyi kendi notunla doldur" olan bir deste
   * görüyordu. Oysa planı deterministik olarak kurabiliyoruz: standardın bölüm
   * listesi zaten elimizde. İçerik yine slayt başına AI ile yazılıyor.
   */
  let raw: DeckPlan
  try {
    raw = await ports.plan(req, outline, signal)
  } catch (e) {
    if (isAiError(e) && e.code === 'aborted') throw e
    raw = fallbackPlan(req)
  }
  /*
   * Standart, istemde ANLATILIYOR ama modelin uyduğu garanti değil — bölüm
   * atlıyor, sırayı bozuyor. Hizalama çıktının üzerinde yapılıyor ki kullanıcı
   * seçtiği iskeleti gerçekten alsın.
   */
  const plan: DeckPlan = req.framework
    ? { ...raw, items: alignToFramework(raw.items, req.framework, req.slideCount, req.language) }
    : raw
  onEvent?.({ kind: 'plan', title: plan.title, subtitle: plan.subtitle, total: plan.items.length })

  const target = bulletTarget(req.durationMinutes, plan.items.length)
  const pacer = new Pacer()
  const slides: Slide[] = []
  const titles: string[] = []

  for (let i = 0; i < plan.items.length; i++) {
    if (signal?.aborted) throw new AiError('aborted')
    const item = plan.items[i]

    // Kapak AI'ya sorulmaz: planın başlığı zaten kapağın içeriği.
    if (i === 0 && item.type === 'title') {
      const cover = coverSlide(plan, presentationId)
      slides.push(cover)
      titles.push(cover.title)
      onEvent?.({ kind: 'slide', index: 0, total: plan.items.length, slide: cover })
      continue
    }

    const excerpt = index.empty ? '' : index.select(`${item.title} ${item.brief}`, EXCERPT_BUDGET)
    const slideReq: SlideRequest = {
      presentationTitle: plan.title,
      topic: req.topic,
      audience: req.audience,
      language: req.language,
      tone: req.tone ?? DEFAULT_TONE,
      type: item.type,
      existingTitles: titles.slice(),
      instruction: item.title,
      brief: item.brief || undefined,
      sourceExcerpt: excerpt || undefined,
      bulletTarget: target,
      // Örnek derin modun asıl vaadi; şemada zorunlu olmazsa model atlıyor.
      wantExample: item.type !== 'conclusion',
    }

    let slide: Slide | null = null
    for (let attempt = 0; attempt < RATE_ATTEMPTS && !slide; attempt++) {
      if (signal?.aborted) throw new AiError('aborted')
      await pacer.wait()
      try {
        const next = await ports.slide(slideReq, signal)
        slide = { ...next, id: uid('sl'), presentationId, order: i, title: next.title || item.title }
        pacer.relax()
      } catch (e) {
        if (isAiError(e) && e.code === 'aborted') throw e
        /*
         * Yeniden denenecek hatalar: hız sınırı, geçici HTTP hatası ve ZAMAN
         * AŞIMI. Zaman aşımı önce pes etme sebebiydi; yerel modellerde ilk
         * çağrı modeli belleğe yüklediği için uzun sürüyor, ikincisi hızlı
         * dönüyor. Tek denemede vazgeçmek o slaytı boş bırakıyordu.
         */
        const retryable =
          isAiError(e) && (e.code === 'rate-limited' || e.code === 'http' || e.code === 'timeout')
        if (!retryable || attempt === RATE_ATTEMPTS - 1) break
        const ms = pacer.backoff(attempt)
        onEvent?.({ kind: 'wait', index: i, total: plan.items.length, ms })
        await sleep(ms)
      }
    }

    if (!slide) {
      // Genişletme hiç başarılamadı. Boş bir slayt bırakmak yerine PLANIN kendi
      // görev tanımı maddeye çevriliyor: kullanıcı slaytın ne anlatması
      // gerektiğini görüyor ve koç panelinden tek tuşla tamamlatabiliyor.
      slide = normalizeSlide(
        { type: item.type, title: item.title, bullets: item.brief ? [item.brief] : [] },
        { presentationId, order: i, lang: req.language, preferredType: item.type },
      )
    }

    slides.push(slide)
    titles.push(slide.title)
    onEvent?.({ kind: 'slide', index: i, total: plan.items.length, slide })
  }

  return { plan, slides }
}

/** Derin üretim sonucunu tam bir `Presentation`a bağlar. */
export function assembleDeep(
  req: GenerationRequest,
  presentationId: string,
  plan: DeckPlan,
  slides: Slide[],
): Presentation {
  const now = new Date().toISOString()
  return {
    id: presentationId,
    title: plan.title,
    subtitle: plan.subtitle,
    description: req.sourceText ? undefined : req.topic,
    audience: req.audience,
    durationMinutes: req.durationMinutes,
    theme: req.theme,
    language: req.language,
    tone: req.tone,
    requirements: req.requirements,
    visual: req.visual,
    // Koç paneli destenin hangi iskeletle üretildiğini bilmeli.
    framework: req.framework,
    createdAt: now,
    updatedAt: now,
    source: 'ai',
    slides: slides.map((s, i) => ({ ...s, order: i })),
  }
}
