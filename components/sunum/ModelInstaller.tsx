'use client'

/**
 * Yerel model kurulum sihirbazı.
 *
 * Sıra ÖNEMLİ: cihazda Ollama yoksa yapılacak ilk iş onu İNDİRMEK. Daha önce
 * "indir" ve "başlat" yan yana duruyordu; kurulu olmayan bir cihazda kullanıcı
 * "başlat"a basıyor, "başlatılamadı, uygulamayı elle aç" mesajını alıyordu.
 * Artık adımlar sırayla açılıyor ve başlatma düğmesi yalnızca GERÇEKTEN
 * çalışabildiği dağıtımda çiziliyor.
 *
 *   1. İndirme — tarayıcıdan program kurulamaz; yapılabilecek en iyi şey
 *      işletim sistemine uygun tek tıklık indirme bağlantısı. Terminal komutu
 *      isteyene ayrıca sunuluyor ama varsayılan yol değil.
 *   2. Başlatma — uygulama sunucusu kullanıcının makinesindeyse bir DÜĞME
 *      (bkz. /api/ai/local/serve). Barındırılan dağıtımda (Vercel) o sunucu
 *      ziyaretçinin makinesi değildir; düğme hiç gösterilmez.
 *   3. Model indirme — TAMAMEN OTOMATİK, gerçek bayt ilerlemesiyle.
 *
 * Panel açık olduğu sürece servis arka planda YOKLANIR: Ollama açıldığı an akış
 * kendiliğinden ilerler, kullanıcının "kontrol et" demesi gerekmez.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Lang } from '@/lib/i18n/config'
import { FREE_MODELS, findModel } from '@/lib/sunum/ai/models'
import {
  INSTALL_RECIPES,
  PullError,
  detectPlatform,
  formatBytes,
  pullModel,
  serveCapability,
  startOllama,
  waitForOllama,
  type PullProgress,
  type ServeCapability,
} from '@/lib/sunum/ai/install'
import type { SunumText } from '@/lib/sunum/ui-text'
import Icon from './Icon'

type Props = {
  t: SunumText
  lang: Lang
  baseUrl: string
  /** Kurulu model etiketleri; boş dizi "Ollama var ama model yok" demek. */
  installed: string[]
  /** Ollama'ya hiç ulaşılamıyor mu? */
  offline: boolean
  /** Model kurulduğunda: seçilsin ve bağlantı tazelensin. */
  onInstalled: (model: string) => void
  onClose: () => void
}

/** Ollama'nın ham durum metnini kullanıcıya gösterilecek kısa etikete çevirir. */
function statusLabel(t: SunumText, status: string): string {
  const s = status.toLowerCase()
  if (s.indexOf('manifest') >= 0) return t.install.pullStatus.manifest
  if (s.indexOf('verify') >= 0) return t.install.pullStatus.verifying
  if (s.indexOf('writing') >= 0) return t.install.pullStatus.writing
  if (s.indexOf('success') >= 0) return t.install.pullStatus.success
  return t.install.pullStatus.downloading
}

export default function ModelInstaller({ t, lang, baseUrl, installed, offline, onInstalled, onClose }: Props) {
  const platform = detectPlatform()
  const recipe = INSTALL_RECIPES[platform]


  const [copied, setCopied] = useState<string | null>(null)
  const [waiting, setWaiting] = useState(false)
  const [waitedMs, setWaitedMs] = useState(0)
  const [pulling, setPulling] = useState<{ model: string; progress: PullProgress | null } | null>(null)
  const [error, setError] = useState<string | null>(null)

  /** Servis başlatma: düğme durumu ve kullanıcıya gösterilecek sonuç notu. */
  const [serving, setServing] = useState(false)
  const [serveNote, setServeNote] = useState<string | null>(null)
  /**
   * Bu dağıtım Ollama'yı sunucudan başlatabilir mi?
   *
   * `null` = henüz sorulmadı. Cevap gelene kadar başlatma düğmesi çizilmez;
   * barındırılan dağıtımda hiç çizilmez. Çalışmayacak bir düğme göstermek,
   * ardından "uygulamayı elle aç" demek en kötü sonuçtu.
   */
  const [cap, setCap] = useState<ServeCapability | null>(null)
  /**
   * Cihazda Ollama'nın KURULU OLMADIĞI anlaşıldı mı?
   *
   * Anlaşıldığında 2. adım kilitlenir ve 1. adım (indirme) öne çıkar: kurulu
   * olmayan bir cihazda "başlat" düğmesinin yapabileceği bir şey yok.
   */
  const [needsDownload, setNeedsDownload] = useState(false)

  const waitCtrl = useRef<AbortController | null>(null)
  const pullCtrl = useRef<AbortController | null>(null)
  /** Yoklama döngüsü `cap` değişince yeniden kurulmasın diye ref üzerinden okunur. */
  const hostedRef = useRef(false)
  const autoStarted = useRef(false)

  // Bileşen kapanırken devam eden bekleme/indirme bırakılmaz.
  useEffect(
    () => () => {
      waitCtrl.current?.abort()
      pullCtrl.current?.abort()
    },
    [],
  )

  /*
   * Yetenek sorgusu: başlatma düğmesi çizilmeden ÖNCE sunucuya "bunu yapabilir
   * misin" diye sorulur. Vercel gibi barındırılan bir dağıtımda yanıt hayır
   * olur ve düğme hiç görünmez.
   */
  useEffect(() => {
    const ctrl = new AbortController()
    void serveCapability(ctrl.signal).then((value) => {
      if (ctrl.signal.aborted) return
      hostedRef.current = value.hosted
      setCap(value)
    })
    return () => ctrl.abort()
  }, [])

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      window.setTimeout(() => setCopied(null), 1800)
    } catch {
      // Pano izni yoksa komut zaten ekranda yazılı.
    }
  }

  /** Kurulumun bitmesini bekler; servis göründüğü an akış kendiliğinden ilerler. */
  const startWaiting = useCallback(async () => {
    waitCtrl.current?.abort()
    const ctrl = new AbortController()
    waitCtrl.current = ctrl
    setWaiting(true)
    setWaitedMs(0)
    setError(null)

    const found = await waitForOllama(baseUrl, {
      signal: ctrl.signal,
      onTick: (elapsed) => setWaitedMs(elapsed),
      // Barındırılan dağıtımda sunucu yoklaması boşuna çağrı: oradaki
      // `localhost` Vercel'in kabı, kullanıcının makinesi değil.
      serverFallback: !hostedRef.current,
    })

    if (!ctrl.signal.aborted) {
      setWaiting(false)
      // Bulunduysa üst bileşen sağlık kontrolünü yeniler; model adı henüz yok.
      if (found) onInstalled('')
    }
  }, [baseUrl, onInstalled])

  /*
   * Yoklama panel açılır açılmaz KENDİLİĞİNDEN başlar.
   *
   * Önce kullanıcının "Kurdum, kontrol et"e basması gerekiyordu. Artık Ollama'yı
   * indirip açtığı an akış kendiliğinden ilerliyor; hiçbir düğmeye basmıyor.
   */
  useEffect(() => {
    if (!offline || autoStarted.current) return
    autoStarted.current = true
    void startWaiting()
  }, [offline, startWaiting])

  /**
   * Servisi sunucudan başlatır ve ardından beklemeyi devreye sokar.
   *
   * Sonuç ne olursa olsun kullanıcı terminale gitmek zorunda kalmıyor: başarıda
   * akış kendiliğinden ilerliyor, `ollama` bulunamadıysa 1. adıma yönlendiriliyor,
   * yalnızca sunucu yolunun hiç kullanılamadığı durumda komut gösteriliyor.
   */
  const startService = useCallback(async () => {
    setServing(true)
    setServeNote(null)
    const result = await startOllama()
    setServing(false)

    if (result === 'started' || result === 'already-running') {
      setServeNote(t.install.serviceStarted)
      void startWaiting()
      return
    }
    if (result === 'not-installed') {
      // Cihazda Ollama YOK. Yapılacak ilk iş indirmek; 2. adım kilitlenir ve
      // kullanıcı 1. adıma yönlendirilir.
      setNeedsDownload(true)
      setServeNote(t.install.needsDownload)
      return
    }
    if (result === 'hosted' || result === 'not-local') {
      // Sunucu kullanıcının makinesi değil: düğme baştan çizilmemeliydi.
      setCap({ canServe: false, hosted: result === 'hosted', running: false })
      setServeNote(null)
      return
    }
    // Başlatılamadı. Kullanıcıyı elle uğraştırmak yerine yoklama sürüyor:
    // uygulama açıldığı an kendiliğinden bağlanılıyor.
    setServeNote(t.install.serviceFailed)
  }, [t, startWaiting])

  const install = useCallback(
    async (model: string) => {
      pullCtrl.current?.abort()
      const ctrl = new AbortController()
      pullCtrl.current = ctrl
      setError(null)
      setPulling({ model, progress: null })

      try {
        await pullModel(baseUrl, model, (progress) => {
          if (!ctrl.signal.aborted) setPulling({ model, progress })
        }, ctrl.signal)
        if (ctrl.signal.aborted) return
        setPulling(null)
        onInstalled(model)
      } catch (e) {
        if (ctrl.signal.aborted) return
        const code = e instanceof PullError ? e.code : 'failed'
        setError(t.install.errors[code])
        setPulling(null)
      } finally {
        pullCtrl.current = null
      }
    },
    [baseUrl, onInstalled, t],
  )

  const isInstalled = (id: string) =>
    installed.some((tag) => tag === id || tag.toLowerCase().indexOf(id.toLowerCase()) === 0)

  return (
    <div className="sn-pop rounded-2xl border border-accent/25 bg-accent/[0.04] p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
            <Icon name="download" className="h-4 w-4 text-accent" />
            {t.install.title}
          </h3>
          <p className="mt-1 text-[11.5px] leading-relaxed text-fg4">{t.install.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t.install.close}
          className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg text-fg4 transition-colors hover:text-fg2"
        >
          <Icon name="x" />
        </button>
      </div>

      {/* ============================ 1 + 2: Ollama ============================ */}
      {offline ? (
        <div className="space-y-3">
          <p className="flex items-start gap-2 rounded-xl border border-amber-400/25 bg-amber-400/[0.06] px-3 py-2 text-xs leading-relaxed text-amber-200">
            <Icon name="warn" className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            {needsDownload ? t.install.needsDownload : t.install.notFound}
          </p>

          {/*
            Barındırılan dağıtımda dürüst açıklama.

            Bu sitenin sunucusu ziyaretçinin makinesi değil; oradan cihaza bir
            program kurulamaz. Kullanıcıyı çalışmayacak bir düğmeye göndermek
            yerine ne olduğu ve ne yapması gerektiği tek cümleyle söyleniyor.
          */}
          {cap?.hosted ? (
            <p className="rounded-xl border border-line/12 bg-surface/[0.04] px-3 py-2 text-[11.5px] leading-relaxed text-fg3">
              {t.install.hostedNote}
            </p>
          ) : null}

          {/* ------------------------------ 1. indir ------------------------------ */}
          <div className={needsDownload ? 'rounded-xl border border-accent/30 bg-accent/[0.05] p-3' : undefined}>
            <p className="mb-1.5 text-[12px] font-semibold text-fg2">{t.install.step1}</p>
            <a
              href={recipe.downloadUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="btn-primary inline-flex whitespace-nowrap px-4 py-2 text-[13px]"
            >
              <Icon name="download" />
              {t.install.downloadApp}
            </a>
            <p className="mt-1.5 text-[11px] leading-relaxed text-fg4">{t.install.downloadHint}</p>

            {/* Terminal komutu varsayılan yol DEĞİL; isteyene açılıyor. */}
            {recipe.command ? (
              <details className="mt-2">
                <summary className="cursor-pointer text-[11px] font-semibold text-fg4">
                  {t.install.advanced}
                </summary>
                <div className="mt-1.5">
                  <CommandRow
                    command={recipe.command}
                    copied={copied === 'install'}
                    onCopy={() => void copy(recipe.command as string, 'install')}
                    t={t}
                  />
                </div>
              </details>
            ) : null}
          </div>

          {/* ------------------------------ 2. başlat -----------------------------
            Düğme YALNIZCA sunucu gerçekten başlatabiliyorsa çiziliyor; ayrıca
            cihazda Ollama olmadığı anlaşıldıysa kilitleniyor. Barındırılan
            dağıtımda bu blok hiç görünmez.
          */}
          {cap?.canServe ? (
            <div>
              <p className="mb-1.5 text-[12px] font-semibold text-fg2">{t.install.step2}</p>
              <button
                type="button"
                onClick={() => void startService()}
                disabled={serving || needsDownload}
                className="btn-primary inline-flex whitespace-nowrap px-4 py-2 text-[13px] disabled:opacity-40"
              >
                <Icon name={serving ? 'refresh' : 'play'} className={serving ? 'animate-spin' : undefined} />
                {serving ? t.install.startingService : t.install.startService}
              </button>

              {serveNote ? (
                <p className="mt-2 text-[11.5px] leading-relaxed text-amber-200">{serveNote}</p>
              ) : null}

              <details className="mt-2">
                <summary className="cursor-pointer text-[11px] font-semibold text-fg4">
                  {t.install.advanced}
                </summary>
                <div className="mt-1.5">
                  <CommandRow
                    command={recipe.serveCommand}
                    copied={copied === 'serve'}
                    onCopy={() => void copy(recipe.serveCommand, 'serve')}
                    t={t}
                  />
                  <p className="mt-1 text-[11px] leading-relaxed text-fg4">{t.install.serveHint}</p>
                </div>
              </details>
            </div>
          ) : serveNote ? (
            <p className="text-[11.5px] leading-relaxed text-amber-200">{serveNote}</p>
          ) : null}

          {/*
            Otomatik algılama. Panel açıldığı anda kendiliğinden başlar: kullanıcı
            Ollama'yı indirip açtığında hiçbir düğmeye basmadan akış ilerler.
            "Kontrol et" düğmesi yalnızca yoklama durdurulduysa gösterilir.
          */}
          <div className="flex flex-wrap items-center gap-2 border-t border-line/10 pt-3">
            {waiting ? (
              <>
                <span className="inline-flex items-center gap-2 text-xs text-accent-soft">
                  <Icon name="refresh" className="h-3.5 w-3.5 animate-spin" />
                  {t.install.autoDetect(Math.round(waitedMs / 1000))}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    waitCtrl.current?.abort()
                    setWaiting(false)
                  }}
                  className="rounded-lg border border-line/15 px-2.5 py-1.5 text-[11.5px] font-semibold text-fg3 transition-colors hover:text-fg2"
                >
                  {t.install.stopWaiting}
                </button>
              </>
            ) : (
              <>
                <span className="text-[11.5px] text-fg4">{t.install.autoDetectIdle}</span>
                <button
                  type="button"
                  onClick={() => void startWaiting()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-[12px] font-semibold text-accent-soft transition-colors hover:bg-accent/20"
                >
                  <Icon name="check" className="h-3.5 w-3.5" />
                  {t.install.startWaiting}
                </button>
              </>
            )}
          </div>

          {/* Kurulumla hiç uğraşmak istemeyene kurulumsuz seçenek hatırlatılıyor. */}
          {cap?.hosted ? (
            <p className="text-[11px] leading-relaxed text-fg4">{t.install.hostedAlt}</p>
          ) : null}
        </div>
      ) : (
        /* ============================== 3: model ============================== */
        <div className="space-y-3">
          <p className="flex items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/[0.05] px-3 py-2 text-xs text-emerald-200">
            <Icon name="check" className="h-3.5 w-3.5" />
            {t.install.found}
          </p>

          <p className="text-[12px] font-semibold text-fg2">{t.install.step3}</p>

          <ul className="space-y-1.5">
            {FREE_MODELS.slice(0, 5).map((model) => {
              const here = isInstalled(model.id)
              const busy = pulling?.model === model.id
              return (
                <li
                  key={model.id}
                  className="flex items-center gap-2.5 rounded-xl border border-line/12 bg-surface/[0.03] px-3 py-2.5"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-semibold text-fg2">{model.name}</span>
                    <span className="mt-0.5 block truncate text-[11px] text-fg4">
                      {formatBytes(model.sizeGb * 1024 ** 3, lang)} · {model.note[lang]}
                    </span>
                  </span>

                  {here ? (
                    <span className="flex flex-shrink-0 items-center gap-1 text-[11px] font-semibold text-emerald-300">
                      <Icon name="check" className="h-3.5 w-3.5" />
                      {t.install.installed}
                    </span>
                  ) : busy ? (
                    <button
                      type="button"
                      onClick={() => pullCtrl.current?.abort()}
                      className="flex-shrink-0 rounded-lg border border-line/15 px-2.5 py-1.5 text-[11.5px] font-semibold text-fg3 transition-colors hover:text-rose-400"
                    >
                      {t.install.cancel}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={pulling !== null}
                      onClick={() => void install(model.id)}
                      className="flex-shrink-0 rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-[11.5px] font-semibold text-accent-soft transition-colors hover:bg-accent/20 disabled:opacity-40"
                    >
                      {t.install.install}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>

          {/* Gerçek bayt ilerlemesi: katman boyutu bilinmiyorsa belirsiz çubuk. */}
          {pulling ? (
            <div className="rounded-xl border border-accent/25 bg-accent/[0.06] px-3 py-2.5">
              <p className="mb-1.5 flex items-center justify-between gap-2 text-[11.5px] text-accent-soft">
                <span className="truncate">
                  {findModel(pulling.model)?.name ?? pulling.model} ·{' '}
                  {pulling.progress ? statusLabel(t, pulling.progress.status) : t.install.installing}
                </span>
                {pulling.progress && pulling.progress.totalBytes > 0 ? (
                  <span className="flex-shrink-0 font-mono tabular-nums">
                    {formatBytes(pulling.progress.completedBytes, lang)} /{' '}
                    {formatBytes(pulling.progress.totalBytes, lang)}
                  </span>
                ) : null}
              </p>
              <span className="block h-1.5 w-full overflow-hidden rounded-full bg-surface/15">
                <span
                  className={`block h-full rounded-full bg-accent transition-[width] duration-300 ${
                    pulling.progress?.ratio === null ? 'w-1/3 animate-[marquee_1.1s_linear_infinite]' : ''
                  }`}
                  style={
                    pulling.progress?.ratio != null
                      ? { width: `${Math.round(pulling.progress.ratio * 100)}%` }
                      : undefined
                  }
                />
              </span>
            </div>
          ) : null}
        </div>
      )}

      {/*
        Hata kutusu KENDİ kurtarma düğmesini taşır.
        
        Önce yalnızca metin vardı ve "aşağıdaki başlat düğmesini dene" diyordu;
        oysa o düğme yalnızca "Ollama bulunamadı" kolunda basılıyor. Servis ayakta
        sanılıp indirme başarısız olduğunda kullanıcı olmayan bir düğmeye
        yönlendiriliyordu. Düğme artık hatanın yanında.
      */}
      {error ? (
        <div className="mt-3 rounded-xl border border-rose-400/25 bg-rose-400/[0.06] px-3 py-2.5">
          <p className="text-xs leading-relaxed text-rose-200">{error}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {/* Düğme yalnızca sunucu gerçekten başlatabiliyorsa; aksi halde
                yoklama zaten arka planda sürüyor. */}
            {cap?.canServe ? (
            <button
              type="button"
              onClick={() => void startService()}
              disabled={serving || needsDownload}
              className="inline-flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-[11.5px] font-semibold text-accent-soft transition-colors hover:bg-accent/20 disabled:opacity-60"
            >
              <Icon name={serving ? 'refresh' : 'play'} className={`h-3.5 w-3.5 ${serving ? 'animate-spin' : ''}`} />
              {serving ? t.install.startingService : t.install.startService}
            </button>
            ) : null}
            {serveNote ? <span className="text-[11.5px] text-amber-200">{serveNote}</span> : null}
          </div>
        </div>
      ) : null}

      <details className="mt-3 border-t border-line/10 pt-3">
        <summary className="cursor-pointer text-[11.5px] font-semibold text-fg3">{t.install.why}</summary>
        <p className="mt-1.5 text-[11px] leading-relaxed text-fg4">{t.install.whyBody}</p>
      </details>
    </div>
  )
}

/** Kopyalanabilir tek satırlık komut. */
function CommandRow({
  command,
  copied,
  onCopy,
  t,
}: {
  command: string
  copied: boolean
  onCopy: () => void
  t: SunumText
}) {
  return (
    <div className="flex items-stretch gap-1.5">
      <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded-lg border border-line/12 bg-surface/[0.06] px-2.5 py-2 font-mono text-[11.5px] text-fg2">
        {command}
      </code>
      <button
        type="button"
        onClick={onCopy}
        title={t.connection.copyCommand}
        aria-label={t.connection.copyCommand}
        className="grid w-9 flex-shrink-0 place-items-center rounded-lg border border-line/15 text-fg3 transition-colors hover:border-accent/50 hover:text-accent-soft"
      >
        <Icon name={copied ? 'check' : 'download'} className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
