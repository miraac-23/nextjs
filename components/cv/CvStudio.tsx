'use client'

/**
 * CV Stüdyosu — kök bileşen.
 *
 * Araç tamamen tarayıcıda çalışır: sunucu, hesap ve ücretli servis yoktur.
 * Durum localStorage'a otomatik yazılır, PDF çıktısı tarayıcının kendi
 * yazdırma motoruyla alınır (bkz. lib/cv/browser.ts → printDocument).
 *
 * Akış dört adımdır: şablon → bilgiler → ince ayar → indirme. Kullanıcı
 * ziyaret ettiği adımlara serbestçe dönebilir, bir adım ileriye atlayabilir.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Swal from 'sweetalert2'
import 'sweetalert2/dist/sweetalert2.min.css'
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
import { TEMPLATES } from '@/lib/cv/templates'
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

export default function CvStudio() {
  const { lang } = useLanguage()
  const t = useMemo(() => cvText(lang), [lang])

  const [booting, setBooting] = useState(true)
  const [ready, setReady] = useState(false)
  const [state, setState] = useState<CvState>(() => initialState())
  const [step, setStep] = useState(0)
  const [maxStep, setMaxStep] = useState(0)
  const [fileName, setFileName] = useState('')
  const [pages, setPages] = useState(1)
  const [printing, setPrinting] = useState(false)
  const [toast, setToast] = useState<{ message: string; tone: 'ok' | 'error' } | null>(null)
  const [printHost, setPrintHost] = useState<HTMLElement | null>(null)

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
    setReady(true)
  }, [])

  // Otomatik kayıt — her tuş vuruşunda yazmamak için gecikmeli.
  useEffect(() => {
    if (!ready) return
    const id = window.setTimeout(() => saveState(state), 400)
    return () => window.clearTimeout(id)
  }, [state, ready])

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
    // Şablon ön ayarları uygulanır; bölüm sırası/gizlilik gibi kullanıcı
    // tercihleri settingsForTemplate içinde korunur.
    setState((s) => ({ ...s, settings: settingsForTemplate(templateId, s.settings) }))
  }, [])

  const go = useCallback((next: number) => {
    setStep(next)
    setMaxStep((m) => Math.max(m, next))
    // Adım değişince sayfanın üstüne dön — uzun formda alt kısımda kalmak kafa karıştırır.
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

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
    setState((s) => ({ ...initialState(s.settings.templateId), settings: s.settings }))
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
    setState(initialState())
    setFileName('')
    setStep(0)
    setMaxStep(0)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  /** Örnek veri her render'da yeniden üretilirse galerideki 20 önizleme de
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

  /* --------------------------------- render -------------------------------- */

  const pct = completeness(data)
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
          />
        </section>
      )}

      {step === 3 && (
        <ExportStep
          t={t}
          data={data}
          settings={settings}
          fileName={fileName || autoName}
          setFileName={setFileName}
          pages={pages}
          onPages={setPages}
          printing={printing}
          onDownload={download}
          onExportJson={exportJson}
          onStartOver={() => void startOver()}
        />
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
          Yalnızca indirme adımında monte edilir — belgeyi boşuna iki kez render etmeyiz. */}
      {step === 3 &&
        printHost &&
        createPortal(
          <>
            <style>{`@page { size: ${PAPER[settings.paper].w}mm ${PAPER[settings.paper].h}mm; margin: 0; }`}</style>
            <CvDocument data={data} settings={settings} t={t} />
          </>,
          printHost,
        )}
    </div>
  )
}
