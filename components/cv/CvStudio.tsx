'use client'

/**
 * CV Stüdyosu — kök bileşen.
 *
 * Araç tamamen tarayıcıda çalışır: sunucu, hesap ve ücretli servis yoktur.
 * Durum localStorage'a otomatik yazılır, PDF çıktısı tarayıcının kendi
 * yazdırma motoruyla alınır (bkz. lib/cv/browser.ts → printDocument).
 *
 * Akış dört adımdır: şablon → bilgiler → ince ayar → ATS & indir. Kullanıcı
 * ziyaret ettiği adımlara serbestçe dönebilir, bir adım ileriye atlayabilir.
 *
 * ATS raporu burada bir kez hesaplanır: başlıktaki skor rozeti ve son adım aynı
 * sonucu kullanır. Yazarken her tuşta analiz çalışmasın diye girdiler gecikmeli.
 * Skor SEÇİLİ şablonun gerçek yerleşimine göre çıkar; görsel (design) şablonda son
 * adım aynı veriyi önerilen ATS şablonuyla da puanlayıp karşılaştırma gösterir.
 */

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createPortal } from 'react-dom'
import Swal from 'sweetalert2'
import 'sweetalert2/dist/sweetalert2.min.css'
import { ScoreRing } from '@/components/ats/primitives'
import '@/components/ats/ats.css'
import { analyze } from '@/lib/ats/analyze'
import { fromCv } from '@/lib/ats/from-cv'
import type { AtsFixTarget } from '@/lib/ats/types'
import { atsText } from '@/lib/ats/ui-text'
import { PAPER, downloadText, printDocument, safeFileName } from '@/lib/cv/browser'
import {
  clearState,
  completeness,
  initialState,
  loadState,
  normalize,
  sampleCv,
  saveState,
  settingsForTemplate,
} from '@/lib/cv/state'
import type { CvState } from '@/lib/cv/types'
import { RECOMMENDED_ATS_TEMPLATE_ID, TEMPLATES, getTemplate } from '@/lib/cv/templates'
import { cvText } from '@/lib/cv/ui-text'
import { useLanguage } from '@/lib/i18n/LanguageProvider'
import CvDocument from './CvDocument'
import CvScreenLoader from './CvScreenLoader'
import UiIcon from './UiIcon'
import DetailsStep from './steps/DetailsStep'
import ExportStep from './steps/ExportStep'
import RefineStep from './steps/RefineStep'
import TemplateStep from './steps/TemplateStep'

/** Diyaloglar body'ye taşındığı için `.cvs-app` dışında kalır; paleti kendi sınıfından alır. */
const dialog = Swal.mixin({
  customClass: { popup: 'cvs-swal', container: 'cvs-swal-bg' },
  reverseButtons: true,
  buttonsStyling: false,
})

/** İş ilanı ve hedef unvan — CV verisinden ayrı tutulur, "yeni CV" ile silinmez. */
const JOB_KEY = 'cv-studio:ats-job'

type RefineTab = 'design' | 'sections' | 'template'

/** Değeri `ms` boyunca değişmezse yayınlar; ilk değer beklemeden gelir. */
function useDebounced<T>(value: T, ms: number): T {
  const [out, setOut] = useState(value)
  useEffect(() => {
    const id = window.setTimeout(() => setOut(value), ms)
    return () => window.clearTimeout(id)
  }, [value, ms])
  return out
}

export default function CvStudio() {
  const { lang } = useLanguage()
  const t = useMemo(() => cvText(lang), [lang])
  const at = atsText(lang)

  const [booting, setBooting] = useState(true)
  const [ready, setReady] = useState(false)
  const [state, setState] = useState<CvState>(() => initialState(undefined, lang))
  const [step, setStep] = useState(0)
  const [maxStep, setMaxStep] = useState(0)
  const [refineTab, setRefineTab] = useState<RefineTab>('design')
  const [fileName, setFileName] = useState('')
  const [pages, setPages] = useState(1)
  const [printing, setPrinting] = useState(false)
  const [toast, setToast] = useState<{ message: string; tone: 'ok' | 'error' } | null>(null)
  const [printHost, setPrintHost] = useState<HTMLElement | null>(null)
  const [jobDesc, setJobDesc] = useState('')
  const [targetTitle, setTargetTitle] = useState('')

  const { data, settings } = state

  /* ------------------------------- kurulum -------------------------------- */

  // localStorage yalnızca tarayıcıda vardır; SSR çıktısı boş kabuktur.
  useEffect(() => {
    const saved = loadState()
    if (saved) {
      setState(saved)
      // İçerik girmiş kullanıcı kaldığı yerden devam etsin; sadece şablona
      // bakıp ayrılmış birinin karşısına yine galeri çıkar.
      if (completeness(saved.data) > 0) {
        setStep(1)
        setMaxStep(3)
      }
    }
    try {
      const raw = localStorage.getItem(JOB_KEY)
      const job = raw ? (JSON.parse(raw) as { description?: unknown; title?: unknown }) : null
      if (job && typeof job.description === 'string') setJobDesc(job.description)
      if (job && typeof job.title === 'string') setTargetTitle(job.title)
    } catch {
      /* bozuk kayıt yok sayılır */
    }
    setReady(true)
  }, [])

  // Otomatik kayıt — her tuş vuruşunda yazmamak için gecikmeli.
  useEffect(() => {
    if (!ready) return
    const id = window.setTimeout(() => saveState(state), 400)
    return () => window.clearTimeout(id)
  }, [state, ready])

  useEffect(() => {
    if (!ready) return
    const id = window.setTimeout(() => {
      try {
        if (!jobDesc.trim() && !targetTitle.trim()) localStorage.removeItem(JOB_KEY)
        else localStorage.setItem(JOB_KEY, JSON.stringify({ description: jobDesc, title: targetTitle }))
      } catch {
        /* kota/gizli sekme */
      }
    }, 400)
    return () => window.clearTimeout(id)
  }, [jobDesc, targetTitle, ready])

  // Yazdırma kopyası için body altında bir kapsayıcı. Adım 4'te doldurulur.
  useEffect(() => {
    const el = document.createElement('div')
    el.id = 'cv-print-root'
    document.body.appendChild(el)
    setPrintHost(el)
    return () => {
      el.remove()
    }
  }, [])

  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(null), 2600)
    return () => window.clearTimeout(id)
  }, [toast])

  const notify = useCallback((message: string, tone: 'ok' | 'error' = 'ok') => setToast({ message, tone }), [])

  /* -------------------------------- eylemler ------------------------------- */

  const setData = useCallback((next: CvState['data']) => setState((s) => ({ ...s, data: next })), [])
  const setSettings = useCallback((next: CvState['settings']) => setState((s) => ({ ...s, settings: next })), [])

  const pickTemplate = useCallback((templateId: string) => {
    // Şablon ön ayarları uygulanır; bölüm sırası/gizlilik/CV dili gibi kullanıcı
    // tercihleri settingsForTemplate içinde korunur.
    setState((s) => ({ ...s, settings: settingsForTemplate(templateId, s.settings) }))
  }, [])

  const go = useCallback((next: number) => {
    setStep(next)
    setMaxStep((m) => Math.max(m, next))
    // Adım değişince sayfanın üstüne dön — uzun formda alt kısımda kalmak kafa karıştırır.
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  /** "Diğer ATS şablonlarını gör": galeri filtresi dışarıdan açılamadığı için ince ayar adımının şablon sekmesine gider. */
  const browseTemplates = useCallback(() => {
    setRefineTab('template')
    go(2)
  }, [go])

  /** Önerilen ATS uyumlu şablona geçer; kullanıcı son adımda kalır ve yeni skoru görür. */
  const switchToAts = useCallback(() => {
    pickTemplate(RECOMMENDED_ATS_TEMPLATE_ID)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [pickTemplate])

  /** Rapordaki "Düzelt" düğmeleri: ilgili adıma (ve düzenleme sekmesine) götürür. */
  const fixIt = useCallback(
    (target: AtsFixTarget) => {
      if (target === 'details') go(1)
      else if (target === 'template') browseTemplates()
      else if (target === 'design' || target === 'sections') {
        setRefineTab(target)
        go(2)
      }
    },
    [go, browseTemplates],
  )

  function fillSample() {
    setState((s) => ({ ...s, data: sampleCv(lang) }))
    notify(t.form.fillSample)
  }

  async function clearAll() {
    const res = await dialog.fire({
      title: t.form.clearAll,
      text: t.form.clearConfirm,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: t.form.clearAll,
      cancelButtonText: t.cancel,
      customClass: { popup: 'cvs-swal', container: 'cvs-swal-bg', confirmButton: 'cvs-btn danger', cancelButton: 'cvs-btn' },
    })
    if (!res.isConfirmed) return
    setState((s) => ({ ...initialState(s.settings.templateId, s.settings.docLang), settings: s.settings }))
  }

  function exportJson() {
    downloadText(`${safeFileName(autoName)}.json`, JSON.stringify(state, null, 2))
  }

  function importJson(file: File) {
    const reader = new FileReader()
    reader.onerror = () => notify(t.form.importError, 'error')
    reader.onload = () => {
      try {
        const parsed = normalize(JSON.parse(String(reader.result)))
        if (!parsed) throw new Error('invalid')
        setState(parsed)
        notify(t.form.importJson)
      } catch {
        notify(t.form.importError, 'error')
      }
    }
    reader.readAsText(file)
  }

  async function startOver() {
    const res = await dialog.fire({
      title: t.exportStep.startOver,
      text: t.exportStep.startOverConfirm,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: t.exportStep.startOver,
      cancelButtonText: t.cancel,
      customClass: { popup: 'cvs-swal', container: 'cvs-swal-bg', confirmButton: 'cvs-btn danger', cancelButton: 'cvs-btn' },
    })
    if (!res.isConfirmed) return
    clearState()
    setState(initialState(undefined, lang))
    setFileName('')
    setRefineTab('design')
    setStep(0)
    setMaxStep(0)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  /** Örnek veri her render'da yeniden üretilirse galerideki önizlemeler de
   *  boşuna yeniden render edilir; dile göre bir kez kurulur. */
  const sample = useMemo(() => sampleCv(lang), [lang])

  const autoName = useMemo(() => {
    const person = data.profile.fullName.trim()
    return safeFileName(person ? `${person} - CV` : 'CV')
  }, [data.profile.fullName])

  const effectiveName = fileName.trim() || autoName

  function download() {
    setPrinting(true)
    printDocument(effectiveName, () => setPrinting(false))
  }

  /* --------------------------------- ATS ----------------------------------- */

  const pct = completeness(data)
  const hasContent = pct > 0

  // Yazarken analiz her tuşta koşmasın: veri ve ilan gecikmeli, düşük öncelikli.
  const atsState = useDeferredValue(useDebounced(state, 300))
  const atsJob = useDeferredValue(useDebounced(jobDesc, 350))
  const atsTitle = useDeferredValue(useDebounced(targetTitle, 350))
  // Gerçek sayfa sayısı yalnızca son adımdaki önizleme ölçtüğünde bilinir.
  const atsPages = step === 3 ? pages : undefined

  const ats = useMemo(() => {
    if (!ready || completeness(atsState.data) === 0) return null
    try {
      const { doc, structured, template } = fromCv(atsState.data, atsState.settings, atsPages ? { pages: atsPages } : undefined)
      const report = analyze({ doc, structured, template, lang, jobDescription: atsJob, targetTitle: atsTitle })
      return { doc, report }
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') console.error('[ats] rapor hesaplanamadı', err)
      return null
    }
  }, [ready, atsState, atsPages, lang, atsJob, atsTitle])

  // Karşılaştırma raporu: yalnızca son adımda ve görsel şablon seçiliyken. Aynı veri + aynı
  // ilan, önerilen ATS şablonunun ön ayarlarıyla (kullanıcının bölüm sırası/dil/kâğıt tercihi
  // korunur). Ölçülen sayfa sayısı görsel şablona ait olduğundan geçirilmez; motor tahmin eder.
  const atsFamily = getTemplate(atsState.settings.templateId).family
  const wantAlt = step === 3 && atsFamily === 'design' && !!ats
  const altReport = useMemo(() => {
    if (!wantAlt) return null
    try {
      const altSettings = settingsForTemplate(RECOMMENDED_ATS_TEMPLATE_ID, atsState.settings)
      const { doc, structured, template } = fromCv(atsState.data, altSettings)
      return analyze({ doc, structured, template, lang, jobDescription: atsJob, targetTitle: atsTitle })
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') console.error('[ats] karşılaştırma raporu hesaplanamadı', err)
      return null
    }
  }, [wantAlt, atsState, lang, atsJob, atsTitle])

  const currentTpl = getTemplate(settings.templateId)

  /* --------------------------------- render -------------------------------- */

  const steps = t.steps

  if (booting) {
    return (
      <div className="cvs-app cvs-boot">
        <CvScreenLoader brand={t.loader.brand} lines={t.loader.lines} ready={t.loader.ready} onDone={() => setBooting(false)} />
      </div>
    )
  }

  return (
    <div className="cvs-app">
      {/* Tamamlanma halkasının degrade tanımı — sayfada bir kez. */}
      <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute' }}>
        <defs>
          <linearGradient id="cvsGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--cvs-accent)" />
            <stop offset="100%" stopColor="var(--cvs-accent-2)" />
          </linearGradient>
        </defs>
      </svg>

      <header className="cvs-top">
        <div>
          <span className="cvs-eyebrow">
            <UiIcon name="spark" className="cvs-eyebrow-ic" />
            {t.stepOf(step + 1, steps.length)}
          </span>
          <h1 className="cvs-title">{t.appTitle}</h1>
          <p className="cvs-sub">{t.appSub}</p>
        </div>

        <div className="cvs-actions">
          <Link href="/ats-analiz" className="cvs-btn sm ats-toplink">
            <UiIcon name="search" />
            {at.builder.analyzeLink}
          </Link>
          <span className="cvs-badge">
            <span className="dot" />
            {t.freeBadge}
          </span>
          <div className="cvs-progress" title={`${pct}%`}>
            <svg viewBox="0 0 36 36">
              <circle className="bg" cx="18" cy="18" r="15.5" />
              <circle className="fg" cx="18" cy="18" r="15.5" strokeDasharray={`${(97.4 * pct) / 100} 97.4`} />
            </svg>
            <span className="cvs-progress-txt">
              <b>{pct}%</b>
              <small>{t.steps[1].sub}</small>
            </span>
          </div>
          {hasContent && ats && (
            <button
              type="button"
              className="ats-badge"
              data-grade={ats.report.grade}
              onClick={() => go(3)}
              title={at.badgeTitle(ats.report.score, at.template.family[currentTpl.family], currentTpl.name)}
              aria-label={at.badgeTitle(ats.report.score, at.template.family[currentTpl.family], currentTpl.name)}
            >
              <ScoreRing score={ats.report.score} grade={ats.report.grade} size={34} stroke={11} label={false} animate={false} />
              <span className="ats-badge-txt">
                <b>{ats.report.score}</b>
                <small>{at.badge}</small>
              </span>
            </button>
          )}
        </div>
      </header>

      <nav className="cvs-steps" aria-label={t.appTitle}>
        {steps.map((s, i) => (
          <button
            key={s.title}
            type="button"
            className="cvs-step"
            data-state={i === step ? 'active' : i < step ? 'done' : 'todo'}
            disabled={i > maxStep + 1}
            onClick={() => go(i)}
            aria-current={i === step ? 'step' : undefined}
          >
            <span className="cvs-step-num">{i < step ? <UiIcon name="check" className="cvs-stat-ic" /> : i + 1}</span>
            <span className="cvs-step-txt">
              <b>{s.title}</b>
              {/* Şablon adımının alt metni katalogdan gelir; sayı sabit yazılmaz. */}
              <small>{i === 0 ? t.gallery.count(TEMPLATES.length) : s.sub}</small>
            </span>
          </button>
        ))}
      </nav>

      {step === 0 && (
        <section className="cvs-panel cvs-panel-pad">
          <h2 className="cvs-title" style={{ fontSize: '1.35rem' }}>
            {t.gallery.title}
          </h2>
          <p className="cvs-sub" style={{ marginBottom: '1.3rem' }}>
            {t.gallery.desc(TEMPLATES.length)}
          </p>
          <TemplateStep
            t={t}
            lang={lang}
            preview={pct > 0 ? data : sample}
            settings={settings}
            onSelect={pickTemplate}
            onContinue={(id) => {
              pickTemplate(id)
              go(1)
            }}
          />
        </section>
      )}

      {step === 1 && (
        <section>
          <h2 className="cvs-title" style={{ fontSize: '1.35rem' }}>
            {t.form.title}
          </h2>
          <p className="cvs-sub" style={{ marginBottom: '1.1rem' }}>
            {t.form.desc}
          </p>
          <DetailsStep
            t={t}
            data={data}
            settings={settings}
            setData={setData}
            onFillSample={fillSample}
            onClear={() => void clearAll()}
            onExport={exportJson}
            onImport={importJson}
            onToast={notify}
          />
        </section>
      )}

      {step === 2 && (
        <section>
          <h2 className="cvs-title" style={{ fontSize: '1.35rem' }}>
            {t.editor.title}
          </h2>
          <p className="cvs-sub" style={{ marginBottom: '1.1rem' }}>
            {t.editor.desc}
          </p>
          <RefineStep
            t={t}
            lang={lang}
            data={data}
            settings={settings}
            setSettings={setSettings}
            onTemplate={pickTemplate}
            onReset={() => setSettings(settingsForTemplate(settings.templateId, settings))}
            initialTab={refineTab}
          />
        </section>
      )}

      {step === 3 && (
        <section>
          <h2 className="cvs-title" style={{ fontSize: '1.35rem' }}>
            {steps[3].title}
          </h2>
          <p className="cvs-sub" style={{ marginBottom: '1.1rem' }}>
            {t.exportStep.desc}
          </p>
          <ExportStep
            t={t}
            lang={lang}
            data={data}
            settings={settings}
            report={ats?.report ?? null}
            altReport={altReport}
            onSwitchToAts={switchToAts}
            onBrowseAts={browseTemplates}
            plainText={ats?.doc.text ?? ''}
            hasContent={hasContent}
            fileName={fileName || autoName}
            setFileName={setFileName}
            pages={pages}
            onPages={setPages}
            printing={printing}
            onDownload={download}
            onExportJson={exportJson}
            onStartOver={() => void startOver()}
            jobDescription={jobDesc}
            onJobDescription={setJobDesc}
            targetTitle={targetTitle}
            onTargetTitle={setTargetTitle}
            onFix={fixIt}
            onToast={notify}
          />
        </section>
      )}

      <div className="cvs-nav">
        <button type="button" className="cvs-btn" onClick={() => go(Math.max(0, step - 1))} disabled={step === 0}>
          <UiIcon name="left" />
          {t.back}
        </button>
        {step < steps.length - 1 ? (
          <button type="button" className="cvs-btn primary" onClick={() => go(step + 1)}>
            {step === steps.length - 2 ? t.finish : t.next}
            <UiIcon name="right" />
          </button>
        ) : (
          <button type="button" className="cvs-btn primary" onClick={download} disabled={printing}>
            <UiIcon name="download" />
            {t.exportStep.download}
          </button>
        )}
      </div>

      {toast && (
        <div className="cvs-toast" data-tone={toast.tone} role="status">
          <UiIcon name={toast.tone === 'error' ? 'x' : 'check'} className="cvs-stat-ic" />
          {toast.message}
        </div>
      )}

      {/* Yazdırma kopyası: ekranda gizli, @media print içinde tek görünen düğüm.
          Yalnızca indirme adımında monte edilir — belgeyi boşuna iki kez render etmeyiz.
          Kenar boşluğunu belgenin (her sayfada klonlanan) iç boşluğu verir; @page margin 0. */}
      {step === 3 &&
        printHost &&
        createPortal(
          <>
            <style>{`@page { size: ${(PAPER[settings.paper] ?? PAPER.a4).w}mm ${(PAPER[settings.paper] ?? PAPER.a4).h}mm; margin: 0; }`}</style>
            <CvDocument data={data} settings={settings} />
          </>,
          printHost,
        )}
    </div>
  )
}
