'use client'

/**
 * Üretim ekranı (§7).
 *
 * Burada SAHTE İLERLEME YOK. Ekranda gördüğü her sayı ve her adım bir gerçek
 * olaydan doğar:
 *
 *   analyze  → istek gönderildi (metin seyreltmesi istemcide zaten bitti)
 *   outline  → model deste başlığını yazdı, yani plana karar verdi (`meta` olayı)
 *   slides   → her tamamlanan slayt için bir `slide` olayı geliyor (n/toplam)
 *   design   → üretim çözüldü; normalize ve şablon ataması yapıldı
 *   check    → yerel kalite denetimi koştu
 *
 * Yüzde = tamamlanan slayt / beklenen slayt. Zamanlayıcı GEÇEN süreyi sayar;
 * "kalan süre" tahmini bilerek YOK, çünkü slayt başına model gecikmesi ölçülemez
 * ve yanlış bir ETA, uzun beklemede güveni bitiren şeydir. Tek "hareketli ama
 * bilgi taşımayan" öge çubuğun altındaki tarama izidir; o da belirsizliği
 * dürüstçe anlatır (bkz. GenerationScreen.module.css).
 *
 * Derin modda slayt başına bir AI çağrısı yapılır; ekran DAKİKALARCA açık
 * kalabilir. O yüzden ekranın ölü durmaması için saniyede bir tazelenen gerçek
 * bilgiler var: geçen süre, tamamlanan slayt sayısı, en son yazılan slaytın
 * başlığı ve hız sınırı beklemesinin geri sayımı.
 *
 * Akış desteklenmiyorsa (eski Ollama) olaylar gelmez; adımlar yine gerçek
 * dönüm noktalarında ilerler — sadece daha seyrek.
 *
 * Ayrıca: slayt yazılırken model yanıtı DAKİKAYA yaklaşan sürelerde bekleniyor
 * (derin modda slayt başına 40–90 sn). O ölü an artık sol sütundaki küçük bir
 * satırla değil, ayrı bir bekleme popup'ıyla anlatılıyor (aşağıdaki `mw*`
 * blokları). O popup da SAHTE İLERLEME göstermez: içinde yüzde ya da tahmini
 * süre yok, yalnızca belirsiz bir "çalışıyor" hareketi ve gerçek olaylardan
 * gelen bilgiler var (yazılmakta olan slaytın numarası, tamamlanan sayısı, en
 * son tamamlanan slaytın başlığı). Gerçek yüzde arkadaki çubukta kalır.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { generatePresentation, type GenerateOutcome } from '@/lib/sunum/ai/client'
import { isAiError } from '@/lib/sunum/ai/provider'
import { getTheme } from '@/lib/sunum/themes'
import type { GenerationRequest, Slide } from '@/lib/sunum/types'
import type { SunumText } from '@/lib/sunum/ui-text'
import Icon from './Icon'
import SlideCanvas from './SlideCanvas'
import SlideRenderer from './SlideRenderer'
import { StateCard } from './ui'
import styles from './GenerationScreen.module.css'

/** Adım kimlikleri ui-text'teki `generating.steps` anahtarlarıyla birebir aynı. */
const ORDER = ['analyze', 'outline', 'slides', 'design', 'check'] as const

/*
 * Yanıt geldikten sonra düşünme ekranının yeniden açılması için beklenen süre.
 *
 * Bu, bir süre TAHMİNİ değil; DEVİR penceresi. Model yanıtladığında ekran
 * ilerleme kartına geçiyor ve kullanıcı yeni slaydın oturduğunu, sayacın ve
 * çubuğun ilerlediğini görüyor; ardından sıradaki düşünme ekranı açılıyor.
 * 900 ms denendi ve yetmedi — kart göz kırpması gibi geçiyordu. Model zaten
 * slayt başına 40–90 saniye harcadığı için bu pencere üretimi yavaşlatmıyor.
 */
const MODEL_WAIT_RESUME_MS = 1900

/** Çıkış animasyonu süresi. CSS'teki `.mwOut` süreleriyle aynı kalmalı. */
const MODEL_WAIT_EXIT_MS = 240

/**
 * Yumuşak varlık: `open` false olunca öge hemen sökülmez, çıkış animasyonu kadar
 * ekranda tutulur. NEDEN: bekleme popup'ı her slaytta bir kapanıp açılıyor;
 * anında sökülse ekran "çat" diye değişir, açılış/kapanış okunmaz.
 */
function useSoftPresence(open: boolean, exitMs: number): { mounted: boolean; closing: boolean } {
  const [lingering, setLingering] = useState(false)

  useEffect(() => {
    if (open) {
      setLingering(true)
      return
    }
    if (!lingering) return
    const id = window.setTimeout(() => setLingering(false), exitMs)
    return () => window.clearTimeout(id)
  }, [open, exitMs, lingering])

  return { mounted: open || lingering, closing: lingering && !open }
}

type Step = (typeof ORDER)[number]
type Phase = Step | 'done'

type Props = {
  t: SunumText
  request: GenerationRequest
  onDone: (outcome: GenerateOutcome) => void
  onCancel: () => void
}

/**
 * Geçen süreyi `m:ss` (gerekirse `s:mm:ss`) olarak yazar.
 * Metne çevrilmez: sayı her dilde aynı okunur, ui-text'e yeni anahtar gerekmez.
 */
function clock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const sec = total % 60
  const min = Math.floor(total / 60) % 60
  const hour = Math.floor(total / 3600)
  const mm = hour > 0 ? String(min).padStart(2, '0') : String(min)
  return `${hour > 0 ? `${hour}:` : ''}${mm}:${String(sec).padStart(2, '0')}`
}

export default function GenerationScreen({ t, request, onDone, onCancel }: Props) {
  const [phase, setPhase] = useState<Phase>('analyze')
  /**
   * Olaylar `index` ile geldiği için dizi SEYREK olabilir; tipi bunu itiraf
   * ediyor. Tamamlanan sayısı `length`ten değil, dolu hücrelerden sayılır —
   * aksi halde 5. slayt önce gelseydi yüzde şişerdi (yani sahte olurdu).
   */
  const [slides, setSlides] = useState<(Slide | undefined)[]>([])
  const [title, setTitle] = useState(request.topic)
  const [error, setError] = useState<string | null>(null)
  /**
   * Derin modda hız sınırına takılıp beklenen süre. Gizlemek yerine SÖYLENİYOR:
   * kullanıcı 20 saniye duran bir ekranı "kilitlendi" sanıyor, sebebini
   * okuyunca beklemeyi kabul ediyor. Süre olayla birlikte geldiği için geri
   * sayım da tahmin değil.
   */
  const [wait, setWait] = useState<{ until: number; total: number } | null>(null)
  /**
   * Model yanıtı bekleniyor mu? Tahmin değil, olaylardan türer: bir `slide`
   * olayı gelince KAPANIR (yeni önizleme görünsün), bir sonraki çağrı için kısa
   * bir soluk payından sonra yeniden AÇILIR. Hız sınırı beklemesinde kapalı
   * kalır; orada geri sayımlı ayrı kart var.
   */
  const [awaitingModel, setAwaitingModel] = useState(false)
  const [startedAt, setStartedAt] = useState(() => Date.now())
  /** Saniyelik tik; geçen süre ve geri sayım bundan türer. */
  const [now, setNow] = useState(() => Date.now())

  const abortRef = useRef<AbortController | null>(null)
  /** Bekleme popup'ını yeniden açacak zamanlayıcı; her yeni olayda sıfırlanır. */
  const resumeRef = useRef<number | null>(null)
  const theme = getTheme(request.theme)

  const clearResume = useCallback(() => {
    if (resumeRef.current !== null) {
      window.clearTimeout(resumeRef.current)
      resumeRef.current = null
    }
  }, [])

  /**
   * Yükleyiciyi kapat ve `after` ms sonra yeniden aç. `after` bir SÜRE TAHMİNİ
   * değil; ya kapanış payı (slayt geldi) ya da olayla birlikte gelen gerçek hız
   * sınırı beklemesidir (`wait.ms`) — yani bekleme bitince yükleyici döner.
   */
  const reopenModelWait = useCallback(
    (after: number) => {
      clearResume()
      setAwaitingModel(false)
      resumeRef.current = window.setTimeout(() => {
        resumeRef.current = null
        setAwaitingModel(true)
      }, after)
    },
    [clearResume],
  )

  /** Bileşen sökülürken sarkan zamanlayıcı kalmasın. */
  useEffect(() => clearResume, [clearResume])

  /** `onDone` satır içi okla geçiliyor; efektin tek sefer çalışması için ref'te. */
  const onDoneRef = useRef(onDone)
  useEffect(() => {
    onDoneRef.current = onDone
  }, [onDone])

  const run = useCallback(async () => {
    setError(null)
    setPhase('analyze')
    setSlides([])
    setWait(null)
    clearResume()
    setAwaitingModel(false)
    const t0 = Date.now()
    setStartedAt(t0)
    setNow(t0)

    const ctrl = new AbortController()
    abortRef.current = ctrl

    try {
      const outcome = await generatePresentation(request, {
        signal: ctrl.signal,
        onEvent: (event) => {
          if (event.kind === 'meta') {
            setTitle(event.title)
            // Model başlığı yazdıysa akışa karar vermiş demektir.
            setPhase((p) => (p === 'analyze' ? 'outline' : p))
            return
          }
          if (event.kind === 'wait') {
            // Geri sayımın ilk karesi doğru olsun diye saat de hemen tazeleniyor.
            const from = Date.now()
            setNow(from)
            setWait({ until: from + event.ms, total: event.ms })
            /*
             * Hız sınırı beklemesinde bekleme popup'ı KAPANIR: aynı anda iki
             * yükleyici (geri sayımlı kart + belirsiz popup) kafa karıştırır.
             * Bekleme bitip aynı slayt yeniden denendiğinde popup geri gelsin
             * diye süre olaydan alınıyor — yine tahmin değil.
             */
            reopenModelWait(event.ms)
            return
          }
          setWait(null)
          setPhase('slides')
          setSlides((current) => {
            const next = current.slice()
            next[event.index] = event.slide
            return next
          })
          // Slayt geldi: popup kapanır, sıradaki model çağrısı için yeniden açılır.
          reopenModelWait(MODEL_WAIT_RESUME_MS)
        },
      })

      if (ctrl.signal.aborted) return
      setPhase('design')
      // Kalite denetimi yerel ve senkron; yine de adımın görünmesi için bir kare bekle.
      await new Promise((resolve) => requestAnimationFrame(resolve))
      setPhase('check')
      const { assess } = await import('@/lib/sunum/decide/client')
      await assess(outcome.presentation)
      if (ctrl.signal.aborted) return
      setPhase('done')
      onDoneRef.current(outcome)
    } catch (e) {
      if (isAiError(e) && e.code === 'aborted') return
      if (ctrl.signal.aborted) return
      setError(e instanceof Error ? e.message : t.errors.generic)
    } finally {
      abortRef.current = null
      // Üretim bitti/iptal edildi/hata verdi: bekleme popup'ı arkada kalmasın.
      clearResume()
      setAwaitingModel(false)
    }
  }, [request, t, clearResume, reopenModelWait])

  useEffect(() => {
    void run()
    return () => abortRef.current?.abort()
  }, [run])

  /** Saat yalnızca üretim sürerken işler; bitince ya da hatada durur. */
  const ticking = !error && phase !== 'done'
  useEffect(() => {
    if (!ticking) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [ticking])

  /** Seyrek dizideki dolu hücreler = gerçekten tamamlanmış slaytlar. */
  const done = useMemo(() => slides.filter((s): s is Slide => s !== undefined), [slides])

  const waitLeftMs = wait ? Math.max(0, wait.until - now) : 0
  /** Bekleme süresi dolduğunda mesaj "yeniden deneniyor"a düşer; kart kaybolmaz. */
  const rateLimited = wait !== null && waitLeftMs > 0

  /*
   * Düşünme ekranının görünme koşulu — hepsi gerçek duruma bakar.
   *
   * İKİ ayrı bekleme var ve ikisi de "model düşünüyor":
   *   1. PLAN çağrısı — `analyze` adımında, ilk `meta` olayı gelene kadar.
   *      Yerel modelde tek başına ~60 saniye; ekran boş beklemesin diye
   *      kapsama alındı (önce yalnızca slayt çağrıları kapsanıyordu).
   *   2. SLAYT çağrısı — `slides` adımında, son `slide` olayından sonra
   *      yenisi gelene kadar (`awaitingModel`).
   *
   * Hız sınırı beklemesinde GÖSTERİLMEZ: orada geri sayımlı ayrı bir kart var
   * ve iki gösterge üst üste gelirse hangisinin ne anlattığı kayboluyor.
   * Hata varken de gösterilmez; aşağıdaki erken dönüş `StateCard`'ı verir.
   */
  const planPending = phase === 'analyze'
  const slidePending = phase === 'slides' && awaitingModel && done.length < request.slideCount
  const modelPending = !error && !rateLimited && (planPending || slidePending)
  const modelWait = useSoftPresence(modelPending, MODEL_WAIT_EXIT_MS)

  if (error) {
    return (
      <StateCard
        icon="warn"
        tone="error"
        title={t.errors.generic}
        description={error}
        action={
          <>
            <button type="button" className="btn-primary whitespace-nowrap" onClick={() => void run()}>
              <Icon name="refresh" />
              {t.errors.retry}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="btn-ghost whitespace-nowrap px-5 py-2.5 text-[13px]"
            >
              {t.wizard.cancel}
            </button>
          </>
        }
      />
    )
  }

  const stepIndex = phase === 'done' ? ORDER.length : ORDER.indexOf(phase)
  /**
   * Payda: istenen slayt sayısı. Üretim beklenenden fazla slayt döndürürse
   * (başlık/kapanış eklemesi) payda da büyür — yüzde asla %100'ü aşmaz ama
   * ekrandaki "n / m" yine GERÇEK sayıyı gösterir.
   */
  const expected = Math.max(request.slideCount, done.length, 1)
  const pct = Math.round((done.length / expected) * 100)
  const placeholders = Math.max(0, request.slideCount - done.length)
  const elapsed = clock(now - startedAt)
  const last = done.length > 0 ? done[done.length - 1] : null

  const waitPct = wait && wait.total > 0 ? Math.round((waitLeftMs / wait.total) * 100) : 0

  return (
    /*
     * Tam ekran POPUP. CV Stüdyosu'nun açılış yükleyicisiyle aynı görsel dil:
     * dalgalanan ışıma + ızgara zemin, ortada kendini çizen bir işaret, gradyanlı
     * başlık, ince ilerleme çubuğu ve durum satırı.
     *
     * Tek ve bilinçli fark: oradaki çubuk ZAMANDAN türer (hazırlık animasyonu),
     * buradaki ise tamamlanan slayt olaylarından. Bu ekranda sahte ilerleme
     * gösterilemez — yapılan iş gerçekten ölçülebiliyor.
     */
    <div className={styles.overlay} role="status" aria-live="polite">
      <span className={styles.backdrop} aria-hidden />

      {/*
        Devir animasyonu: düşünme ekranı kapanırken bu kart öne çıkar.
        `key` tamamlanan slayt sayısıyla değişiyor, yani her yanıttan sonra
        animasyon baştan oynuyor ve "model yanıtladı, sıra kartta" hissi
        oluşuyor. Değişmeseydi React ögeyi tazelemez ve geçiş görünmezdi.
      */}
      <div key={`popup-${done.length}`} className={`${styles.popup} ${styles.popupIn} glass`}>
        {/* ----------------------------- işaret ----------------------------- */}
        <div className={styles.mark} aria-hidden>
          {phase !== 'done' ? <span className={styles.halo} /> : null}
          <svg viewBox="0 0 64 64">
            {/* Slayt kâğıdı + üzerine sırayla düşen satırlar: deste yazılıyor. */}
            <path className={styles.sheet} d="M8 12h48v34a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4z" />
            <path className={styles.rule} d="M17 24h20" />
            <path className={styles.rule} d="M17 33h30" />
            <path className={styles.rule} d="M17 41h14" />
            <path className={styles.stand} d="M32 50v6M22 58h20" />
          </svg>
        </div>

        <h2 className={styles.brand}>{phase === 'done' ? t.generating.done : t.generating.title}</h2>
        {/* Başlık `meta` olayından gelir; gelmeden önce kullanıcının yazdığı konu durur. */}
        <p className={styles.deck}>{title}</p>

        {/* --------------------------- ilerleme --------------------------- */}
        <div
          className={styles.track}
          role="progressbar"
          aria-label={t.generating.steps.slides}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
        >
          <span className={styles.fill} style={{ width: `${pct}%` }}>
            {/* Parıltı dekoratif: ilerleme anlatmaz, çubuğun kendisi anlatır. */}
            {phase !== 'done' ? <i className={styles.sheen} aria-hidden /> : null}
          </span>
        </div>

        <p className={styles.status}>
          <span className="truncate">{t.generating.steps[phase === 'done' ? 'check' : phase]}</span>
          <b className="flex items-center gap-2.5 tabular-nums">
            <span className="font-mono text-fg4">{elapsed}</span>
            <span className="text-fg3">
              {done.length}/{expected}
            </span>
            <span className="gradient-text font-display text-[15px] font-semibold">{pct}%</span>
          </b>
        </p>

      <div className={`${styles.body} grid gap-5 sm:grid-cols-[minmax(0,210px)_minmax(0,1fr)]`}>
        {/* ------------------------------- adımlar ------------------------------- */}
        <aside className="min-w-0">
          <ol>
            {ORDER.map((step, i) => {
              const finished = i < stepIndex
              const active = i === stepIndex
              return (
                <li key={step} className={`${styles.step}${finished ? ` ${styles.stepDone}` : ''}`}>
                  <span
                    className={`absolute left-0 top-[2px] grid h-[19px] w-[19px] place-items-center rounded-full border ${
                      finished
                        ? 'border-accent bg-accent text-ink-950'
                        : active
                          ? 'border-accent bg-accent/10 text-accent'
                          : 'border-line/20 text-fg4'
                    }`}
                  >
                    {finished ? (
                      <Icon name="check" className="h-3 w-3" />
                    ) : active ? (
                      <span className={styles.beacon} />
                    ) : null}
                  </span>
                  <span
                    className={`block text-[13px] leading-[19px] ${
                      finished ? 'text-fg2' : active ? 'font-semibold text-fg' : 'text-fg4'
                    }`}
                  >
                    {t.generating.steps[step]}
                  </span>
                  {/* Slayt adımı altında gerçek sayaç: uzun beklemede tek canlı rakam. */}
                  {step === 'slides' && (active || finished) ? (
                    <span className="mt-0.5 block font-mono text-[11px] tabular-nums text-fg4">
                      {done.length} / {expected}
                    </span>
                  ) : null}
                </li>
              )
            })}
          </ol>

          {/* ------------------------------ canlı durum ------------------------------ */}
          <div className="mt-4">
            {rateLimited ? (
              <div className="rounded-xl border border-amber-400/25 bg-amber-400/10 p-3">
                <div className="flex gap-2">
                  <Icon name="info" className="mt-[2px] h-3.5 w-3.5 flex-none text-amber-300" />
                  <p className="text-[12px] leading-relaxed text-amber-200">
                    {t.generating.rateLimited(Math.ceil(waitLeftMs / 1000))}
                  </p>
                </div>
                {/* Süre olaydan geliyor; bu çubuk bilinen bir süreyi sayıyor, tahmin etmiyor. */}
                <div className={`${styles.waitTrack} mt-2.5`}>
                  <span className={styles.waitFill} style={{ width: `${waitPct}%` }} />
                </div>
              </div>
            ) : phase === 'done' ? (
              <p className="flex items-center gap-2 rounded-xl border border-accent/25 bg-accent/[0.07] px-3 py-2.5 text-[12px] text-fg2">
                <Icon name="check" className="h-3.5 w-3.5 flex-none text-accent" />
                {t.generating.done}
              </p>
            ) : (
              <div className="rounded-xl border border-line/10 bg-surface/[0.03] px-3 py-2.5">
                <p className="flex items-center gap-2 text-[12px] text-fg3">
                  <span className={styles.spinner} aria-hidden />
                  <span className="truncate">
                    {phase === 'slides' ? t.generating.slideN(done.length + 1) : t.generating.waiting}
                  </span>
                </p>
                {/* En son TAMAMLANAN slaytın gerçek başlığı: ekran ölü durmasın. */}
                {last ? (
                  <p className="mt-1.5 truncate text-[11px] text-fg4" title={last.title}>
                    {t.generating.slideN(done.length)} · {last.title}
                  </p>
                ) : null}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              abortRef.current?.abort()
              onCancel()
            }}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-line/15 px-4 py-2 text-[13px] font-semibold text-fg3 transition-colors hover:border-rose-400/50 hover:text-rose-400"
          >
            <Icon name="x" />
            {t.generating.cancel}
          </button>
        </aside>

        {/* ------------------------------ önizlemeler ------------------------------ */}
        <section className="min-w-0">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {done.map((slide, i) => (
              <figure
                key={slide.id}
                className={styles.rise}
                // Stagger: tek seferde gelen partide kartlar sırayla otursun.
                style={{ animationDelay: `${Math.min(i, 7) * 55}ms` }}
              >
                <span className="block overflow-hidden rounded-xl border border-accent/25">
                  <SlideCanvas label={slide.title}>
                    <SlideRenderer
                      slide={slide}
                      theme={theme}
                      lang={request.language}
                      visual={request.visual}
                      animate
                    />
                  </SlideCanvas>
                </span>
                <figcaption className="mt-1.5 flex items-center gap-1.5 text-[11px] text-fg4">
                  <Icon name="check" className="h-3 w-3 flex-none text-accent" />
                  <span className="truncate">{t.generating.slideN(i + 1)}</span>
                </figcaption>
              </figure>
            ))}

            {/* Henüz gelmemiş slaytlar için iskelet: kaç slayt beklendiği görünsün. */}
            {Array.from({ length: placeholders }).map((_, i) => (
              <figure key={`ph-${i}`}>
                <span
                  className={`block aspect-video rounded-xl border border-dashed bg-surface/[0.03] ${
                    i === 0 ? `border-accent/30 ${styles.skeleton}` : 'border-line/15'
                  }`}
                />
                <figcaption className="mt-1.5 truncate text-[11px] text-fg4">
                  {t.generating.slideN(done.length + i + 1)}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
        </div>
      </div>

      {/*
       * ------------------- model yanıt bekleme popup'ı -------------------
       * Ana kartın ÜSTÜNDE ayrı bir katman. Örtü `pointer-events: none`:
       * arkadaki "Vazgeç" düğmesi ve tüm ekran tıklanabilir kalır, yani iptal
       * davranışı hiç değişmez.
       *
       * İçindeki tek hareket belirsiz bir yörünge/nabız; yüzde ya da kalan süre
       * YOK. Bilgi satırları gerçek olaylardan: yazılan slaytın numarası
       * (tamamlananların sayısı + 1), tamamlanan/beklenen sayacı ve en son
       * tamamlanan slaytın başlığı.
       */}
      {modelWait.mounted ? (
        <div
          /*
           * Anahtar yön değişince değişiyor. NEDEN: açılış/kapanış CSS
           * animasyonu yalnızca YENİ bir ögede baştan oynar. Ana iş parçacığı
           * slayt önizlemesini çizerken meşgulse kapanış ve yeniden açılış
           * güncellemeleri tek karede birleşebiliyor; öge sökülmediği için
           * animasyon tekrar oynamıyor ve yükleyici "pat" diye geri geliyordu.
           * Anahtar değişince React ögeyi tazeliyor, geçiş her hâlde yumuşak.
           */
          key={`mw-${done.length}-${modelWait.closing ? 'out' : 'in'}`}
          className={`${styles.mwScrim}${modelWait.closing ? ` ${styles.mwOut}` : ''}`}
        >
          <div className={`${styles.mwCard} glass`}>
            <span className={styles.mwOrbit} aria-hidden>
              <i className={styles.mwGlow} />
              <i className={styles.mwRing} />
              <i className={styles.mwRingInner} />
              <i className={styles.mwCore} />
              <i className={styles.mwSat} />
            </span>

            <p className={styles.mwTitle}>{t.generating.waiting}</p>

            {/* Plan aşamasında henüz slayt yok; o an adımın kendi adı gösterilir. */}
            <p className={styles.mwBadge}>
              <span className={styles.beacon} aria-hidden />
              {planPending ? t.generating.steps.outline : t.generating.slideN(done.length + 1)}
            </p>

            {/* Dalga: yalnızca "çalışıyor" sinyali, hiçbir oranı temsil etmez. */}
            <span className={styles.mwWave} aria-hidden>
              <i />
              <i />
              <i />
            </span>

            {/* Sayaç gerçek: dolu hücre sayısı / istenen slayt sayısı.
                Plan aşamasında hiç slayt yok, o yüzden basılmaz. */}
            {planPending ? null : (
              <p className={styles.mwCount}>
                {done.length}/{expected}
              </p>
            )}

            {last ? (
              <p className={styles.mwLast} title={last.title}>
                {t.generating.slideN(done.length)} · {last.title}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
