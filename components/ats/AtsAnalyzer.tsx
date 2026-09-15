'use client'

/**
 * ATS CV Analizi — yükleme sayfasının kök bileşeni.
 *
 * Akış: dosya bırak/seç → ayrıştır (parseFile, tamamen tarayıcıda) → analyze →
 * rapor. Dosya hiçbir sunucuya gönderilmez ve saklanmaz. İlan değişince yalnızca
 * `analyze` yeniden çalışır; ayrıştırılmış belge bellekte tutulur.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Swal from 'sweetalert2'
import 'sweetalert2/dist/sweetalert2.min.css'
import { analyze } from '@/lib/ats/analyze'
import { structuredToCv } from '@/lib/ats/to-cv'
import type { AtsCategoryKey, AtsDocument, AtsFixTarget, AtsParseErrorCode, AtsReport as Report } from '@/lib/ats/types'
import { ATS_SCORE_CAPS, atsText } from '@/lib/ats/ui-text'
import { completeness, initialState, loadState, saveState } from '@/lib/cv/state'
import { RECOMMENDED_ATS_TEMPLATE_ID, TEMPLATES } from '@/lib/cv/templates'
import { useLanguage } from '@/lib/i18n/LanguageProvider'
import AtsReport from './AtsReport'
import JobMatchPanel from './JobMatchPanel'
import { AtsIcon, CATEGORY_ICON, prefersReducedMotion } from './primitives'
import './ats.css'

const MAX_BYTES = 10 * 1024 * 1024
const ACCEPT = '.pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain'
const JOB_ID = 'ats-upload-job'
const ERROR_CODES: AtsParseErrorCode[] = ['unsupported', 'too-large', 'encrypted', 'empty', 'corrupt']
/** Tanıtım kartlarının sırası — motorun kategori sırasıyla aynı. */
const CATEGORY_KEYS: AtsCategoryKey[] = ['formatting', 'searchability', 'hardSkills', 'softSkills', 'recruiterTips']
const ATS_TEMPLATE_COUNT = TEMPLATES.filter((tpl) => tpl.family === 'ats').length

/** Diyaloglar body'ye taşınır; paleti cv.css'teki `.cvs-swal` sınıfından alır. */
const dialog = Swal.mixin({
  customClass: { popup: 'cvs-swal', container: 'cvs-swal-bg', confirmButton: 'cvs-btn primary', cancelButton: 'cvs-btn' },
  reverseButtons: true,
  buttonsStyling: false,
})

type Phase = 'idle' | 'analyzing' | 'report'

const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms))

function extOf(name: string): string {
  const i = name.lastIndexOf('.')
  return i < 0 ? '' : name.slice(i + 1).toLowerCase()
}

/** Ayrıştırmaya girmeden yakalanabilen hatalar — kullanıcı boşuna beklemesin. */
function precheck(file: File): AtsParseErrorCode | null {
  if (['pdf', 'docx', 'txt'].indexOf(extOf(file.name)) < 0) return 'unsupported'
  if (file.size > MAX_BYTES) return 'too-large'
  if (file.size === 0) return 'empty'
  return null
}

function errorCode(err: unknown): AtsParseErrorCode {
  const code = err && typeof err === 'object' && 'code' in err ? (err as { code: unknown }).code : null
  return ERROR_CODES.indexOf(code as AtsParseErrorCode) >= 0 ? (code as AtsParseErrorCode) : 'corrupt'
}

function formatSize(bytes: number, lang: string): string {
  const loc = lang === 'en' ? 'en-US' : 'tr-TR'
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024)).toLocaleString(loc)} KB`
  return `${(bytes / 1024 / 1024).toLocaleString(loc, { maximumFractionDigits: 1 })} MB`
}

export default function AtsAnalyzer() {
  const { lang } = useLanguage()
  const t = atsText(lang)
  const tx = t.analyzer
  const router = useRouter()

  const [phase, setPhase] = useState<Phase>('idle')
  const [file, setFile] = useState<File | null>(null)
  const [doc, setDoc] = useState<AtsDocument | null>(null)
  const [report, setReport] = useState<Report | null>(null)
  const [error, setError] = useState<AtsParseErrorCode | null>(null)
  const [drag, setDrag] = useState(false)
  const [stepIdx, setStepIdx] = useState(0)

  const [jobDesc, setJobDesc] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [jobOpen, setJobOpen] = useState(false)
  // Raporun hangi ilanla hesaplandığı — "yeniden hesapla" düğmesi yalnızca fark varsa etkin.
  const [applied, setApplied] = useState({ desc: '', title: '' })
  const [recalcFlash, setRecalcFlash] = useState(false)

  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const runId = useRef(0)

  const scrollTop = useCallback(() => {
    const el = rootRef.current
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY - 110
    window.scrollTo({ top: Math.max(0, top), behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }, [])

  /* -------------------------------- analiz -------------------------------- */

  const start = useCallback(
    async (f: File) => {
      const pre = precheck(f)
      setFile(f)
      if (pre) {
        setError(pre)
        setPhase('idle')
        return
      }
      const id = ++runId.current
      const steps = tx.steps.length
      const reduce = prefersReducedMotion()
      // Adımlar zamanla ilerler; iş erken biterse bile en az bu kadar görünür kalır.
      const minMs = reduce ? 600 : 1300
      const began = performance.now()

      setError(null)
      setStepIdx(0)
      setPhase('analyzing')
      scrollTop()

      const ticker = window.setInterval(() => {
        const elapsed = performance.now() - began
        setStepIdx((i) => Math.max(i, Math.min(steps - 1, Math.floor(elapsed / (minMs / steps)))))
      }, 90)

      try {
        // Ayrıştırıcılar (pdf.js dahil) yalnızca gerektiğinde yüklenir.
        const { parseFile } = await import('@/lib/ats')
        const parsed = await parseFile(f)
        if (id !== runId.current) return
        setStepIdx((i) => Math.max(i, 3))
        const next = analyze({ doc: parsed, lang, jobDescription: jobDesc, targetTitle: jobTitle })
        const left = minMs - (performance.now() - began)
        if (left > 0) await wait(left)
        if (id !== runId.current) return
        setStepIdx(steps)
        await wait(reduce ? 0 : 260)
        if (id !== runId.current) return
        setDoc(parsed)
        setReport(next)
        setApplied({ desc: jobDesc, title: jobTitle })
        setPhase('report')
        scrollTop()
      } catch (err) {
        if (id !== runId.current) return
        if (process.env.NODE_ENV !== 'production') console.error('[ats] analiz başarısız', err)
        setError(errorCode(err))
        setPhase('idle')
      } finally {
        window.clearInterval(ticker)
      }
    },
    [jobDesc, jobTitle, lang, scrollTop, tx.steps.length],
  )

  function select(f: File) {
    const pre = precheck(f)
    setFile(f)
    setError(pre)
  }

  function reset() {
    runId.current++
    setPhase('idle')
    setFile(null)
    setDoc(null)
    setReport(null)
    setError(null)
    window.setTimeout(scrollTop, 0)
  }

  function recalc() {
    if (!doc) return
    setReport(analyze({ doc, lang, jobDescription: jobDesc, targetTitle: jobTitle }))
    setApplied({ desc: jobDesc, title: jobTitle })
    setRecalcFlash(true)
    window.setTimeout(() => setRecalcFlash(false), 2200)
  }

  // Arayüz dili değişince rapor metinleri de o dilde yeniden üretilir (yeniden ayrıştırma yok).
  useEffect(() => {
    if (!doc) return
    setReport(analyze({ doc, lang, jobDescription: applied.desc, targetTitle: applied.title }))
    // yalnızca dil değişiminde
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang])

  // Panodan dosya yapıştırma (yalnızca yükleme ekranında).
  useEffect(() => {
    if (phase !== 'idle') return
    const onPaste = (e: ClipboardEvent) => {
      const f = e.clipboardData?.files?.[0]
      if (!f) return
      e.preventDefault()
      void start(f)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [phase, start])

  function focusJob() {
    setJobOpen(true)
    window.setTimeout(() => {
      const el = document.getElementById(JOB_ID)
      if (!el) return
      el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'center' })
      el.focus({ preventScroll: true })
    }, 60)
  }

  function onFix(target: AtsFixTarget) {
    if (target === 'job') focusJob()
  }

  async function rebuild() {
    if (!report) return
    const existing = loadState()
    if (existing && completeness(existing.data) > 0) {
      const res = await dialog.fire({
        title: tx.overwriteTitle,
        text: tx.overwriteText,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: tx.overwriteConfirm,
        cancelButtonText: tx.cancel,
      })
      if (!res.isConfirmed) return
    }
    const data = structuredToCv(report.parsed)
    // Başlıkların dili yüklenen CV'nin dilini izler; arayüz dili farklı olabilir.
    const docLang = report.parsed.lang === 'en' || report.parsed.lang === 'tr' ? report.parsed.lang : lang
    // Yeniden oluşturma her zaman ATS uyumlu önerilen şablonla başlar.
    saveState({ ...initialState(RECOMMENDED_ATS_TEMPLATE_ID, docLang), data })
    router.push('/cv-olustur')
  }

  /* -------------------------------- render -------------------------------- */

  const dirty = applied.desc !== jobDesc || applied.title !== jobTitle

  return (
    <div className="ats-analyzer cvs-app" ref={rootRef}>
      {phase !== 'report' && (
        <header className="ats-az-hero">
          <div className="ats-az-copy">
            <span className="ats-eyebrow">
              <AtsIcon name="spark" className="ats-inline-ic" />
              {tx.eyebrow}
            </span>
            <h1 className="ats-az-title">
              {tx.title} <span>{tx.titleAccent}</span>
            </h1>
            <p className="ats-az-sub">{tx.sub}</p>
            <span className="ats-privacy">
              <AtsIcon name="shield" />
              {tx.privacy}
            </span>
          </div>
          <HeroArt />
        </header>
      )}

      {phase === 'idle' && (
        <>
          <section className="ats-upload cvs-panel">
            <div
              className="ats-drop"
              data-active={drag || undefined}
              role="button"
              tabIndex={0}
              aria-describedby="ats-drop-meta"
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  inputRef.current?.click()
                }
              }}
              onDragEnter={(e) => {
                e.preventDefault()
                setDrag(true)
              }}
              onDragOver={(e) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'copy'
                if (!drag) setDrag(true)
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDrag(false)
              }}
              onDrop={(e) => {
                e.preventDefault()
                setDrag(false)
                const f = e.dataTransfer.files?.[0]
                if (f) void start(f)
              }}
            >
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPT}
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  e.target.value = ''
                  if (f) select(f)
                }}
              />
              <span className="ats-drop-ic" aria-hidden="true">
                <AtsIcon name="upload" />
              </span>
              <span className="ats-drop-title">
                {drag ? (
                  tx.dropActive
                ) : (
                  <>
                    {tx.dropTitle}
                    <span className="ats-drop-or">
                      {' '}
                      {tx.dropOr} <u>{tx.dropBrowse}</u>
                    </span>
                  </>
                )}
              </span>
              <span className="ats-drop-meta" id="ats-drop-meta">
                {tx.dropMeta}
              </span>
              <span className="ats-drop-paste">{tx.dropPaste}</span>
            </div>

            {error && (
              <div className="ats-alert" role="alert">
                <AtsIcon name="alert" />
                <div>
                  <b>{tx.errorTitle}</b>
                  <p>{tx.errors[error]}</p>
                </div>
                <button type="button" className="cvs-btn sm icon" aria-label={tx.remove} onClick={() => setError(null)}>
                  <AtsIcon name="x" />
                </button>
              </div>
            )}

            {file && !error && (
              <div className="ats-file">
                <span className="ats-file-ic" data-ext={extOf(file.name)}>
                  <AtsIcon name="file" />
                  <small>{extOf(file.name).toUpperCase()}</small>
                </span>
                <span className="ats-file-meta">
                  <small>{tx.selected}</small>
                  <b title={file.name}>{file.name}</b>
                  <span>{formatSize(file.size, lang)}</span>
                </span>
                <button type="button" className="cvs-btn sm" onClick={() => setFile(null)}>
                  {tx.remove}
                </button>
              </div>
            )}

            <div className="ats-upload-job">
              <JobMatchPanel
                value={jobDesc}
                onChange={setJobDesc}
                title={jobTitle}
                onTitleChange={setJobTitle}
                lang={lang}
                collapsible
                open={jobOpen}
                onOpenChange={setJobOpen}
                textareaId={JOB_ID}
              />
            </div>

            <div className="ats-upload-actions">
              <button
                type="button"
                className="cvs-btn primary lg"
                disabled={!file || !!error}
                onClick={() => file && void start(file)}
              >
                <AtsIcon name="spark" />
                {tx.analyze}
              </button>
            </div>
          </section>

          <section className="ats-how" aria-labelledby="ats-how-h">
            <div className="ats-how-head">
              <h2 id="ats-how-h">{tx.howTitle}</h2>
              <p>{tx.howDesc}</p>
            </div>
            <div className="ats-how-grid" data-count={CATEGORY_KEYS.length}>
              {CATEGORY_KEYS.map((key, i) => (
                <article key={key} className="ats-how-card cvs-panel">
                  <span className="ats-how-top">
                    <span className="ats-how-ic">
                      <AtsIcon name={CATEGORY_ICON[key]} />
                    </span>
                    <span className="ats-how-n">{String(i + 1).padStart(2, '0')}</span>
                  </span>
                  <h3>{t.categoryNames[key]}</h3>
                  <p>{t.categoryInfo[key]}</p>
                </article>
              ))}
            </div>
            <p className="ats-how-caps">
              <AtsIcon name="shield" className="ats-inline-ic" />
              {tx.howCaps(ATS_SCORE_CAPS.unreadable, ATS_SCORE_CAPS.severe)}
            </p>
          </section>
        </>
      )}

      {phase === 'analyzing' && file && (
        <section className="ats-progress cvs-panel" role="status" aria-live="polite">
          <ScanArt />
          <div className="ats-progress-main">
            <span className="ats-eyebrow">
              <span className="ats-pulse" aria-hidden="true" />
              {tx.analyzing}
            </span>
            <h2 title={file.name}>{file.name}</h2>
            <div className="ats-progress-bar" aria-hidden="true">
              <span style={{ width: `${Math.round((Math.min(stepIdx + 0.6, tx.steps.length) / tx.steps.length) * 100)}%` }} />
            </div>
            <ol className="ats-progress-steps">
              {tx.steps.map((s, i) => {
                const state = i < stepIdx ? 'done' : i === stepIdx ? 'active' : 'todo'
                return (
                  <li key={s} data-state={state}>
                    <span className="ats-step-dot">{state === 'done' ? <AtsIcon name="check" /> : state === 'active' ? <i /> : null}</span>
                    {s}
                  </li>
                )
              })}
            </ol>
          </div>
        </section>
      )}

      {phase === 'report' && report && (
        <>
          <div className="ats-az-top">
            <section className="ats-az-file cvs-panel">
              <span className="ats-file-ic lg" data-ext={doc?.source}>
                <AtsIcon name="file" />
                <small>{(doc?.source ?? extOf(file?.name ?? '')).toUpperCase()}</small>
              </span>
              <div className="ats-file-meta">
                <small>{tx.reportFor}</small>
                <b title={file?.name}>{file?.name ?? doc?.fileName}</b>
                <span>
                  {[file ? formatSize(file.size, lang) : '', doc ? tx.pages(doc.pageCount || report.stats.pages) : ''].filter(Boolean).join(' · ')}
                </span>
              </div>
              <button type="button" className="cvs-btn" onClick={reset}>
                <AtsIcon name="upload" />
                {tx.uploadAnother}
              </button>
            </section>

            <section className="ats-rebuild">
              <div className="ats-rebuild-glow" aria-hidden="true" />
              <span className="ats-eyebrow">
                <AtsIcon name="wand" className="ats-inline-ic" />
                {tx.rebuildEyebrow}
              </span>
              <h2>{tx.rebuildTitle}</h2>
              <p>{tx.rebuildDesc(ATS_TEMPLATE_COUNT)}</p>
              <button type="button" className="cvs-btn primary" onClick={() => void rebuild()}>
                {tx.rebuildCta}
                <AtsIcon name="arrow" />
              </button>
            </section>
          </div>

          <AtsReport
            report={report}
            lang={lang}
            variant="upload"
            onFix={onFix}
            afterHero={
              <JobMatchPanel
                value={jobDesc}
                onChange={setJobDesc}
                title={jobTitle}
                onTitleChange={setJobTitle}
                lang={lang}
                collapsible
                open={jobOpen}
                onOpenChange={setJobOpen}
                textareaId={JOB_ID}
                footer={
                  <div className="ats-recalc">
                    {recalcFlash && (
                      <span className="ats-recalc-ok" role="status">
                        <AtsIcon name="check" />
                        {tx.recalcDone}
                      </span>
                    )}
                    <button type="button" className="cvs-btn primary" onClick={recalc} disabled={!dirty}>
                      <AtsIcon name="refresh" />
                      {tx.recalc}
                    </button>
                  </div>
                }
              />
            }
          />
        </>
      )}
    </div>
  )
}

/* ------------------------------- illüstrasyon ------------------------------- */

/** Hero görseli: taranan bir belge ve skor rozeti. Dekoratiftir. */
function HeroArt() {
  return (
    <div className="ats-az-art" aria-hidden="true">
      <svg viewBox="0 0 260 240">
        <defs>
          <linearGradient id="atsArtG" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
          <linearGradient id="atsArtBeam" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.45" />
          </linearGradient>
          <clipPath id="atsArtClip">
            <rect x="40" y="18" width="150" height="200" rx="14" />
          </clipPath>
        </defs>
        <rect className="ats-art-sheet" x="40" y="18" width="150" height="200" rx="14" />
        <g className="ats-art-lines">
          <rect x="60" y="42" width="78" height="9" rx="4.5" />
          <rect x="60" y="58" width="52" height="6" rx="3" opacity="0.7" />
          <rect x="60" y="82" width="46" height="6" rx="3" className="acc" />
          <rect x="60" y="96" width="110" height="5" rx="2.5" opacity="0.6" />
          <rect x="60" y="107" width="104" height="5" rx="2.5" opacity="0.6" />
          <rect x="60" y="118" width="84" height="5" rx="2.5" opacity="0.6" />
          <rect x="60" y="140" width="40" height="6" rx="3" className="acc" />
          <rect x="60" y="154" width="110" height="5" rx="2.5" opacity="0.6" />
          <rect x="60" y="165" width="96" height="5" rx="2.5" opacity="0.6" />
          <rect x="60" y="176" width="70" height="5" rx="2.5" opacity="0.6" />
        </g>
        <g clipPath="url(#atsArtClip)">
          <rect className="ats-art-beam" x="40" y="0" width="150" height="46" fill="url(#atsArtBeam)" />
        </g>
        <g transform="translate(196 170)">
          <circle r="38" className="ats-art-badge" />
          <circle r="29" fill="none" strokeWidth="7" className="ats-art-track" />
          <circle r="29" fill="none" strokeWidth="7" stroke="url(#atsArtG)" strokeLinecap="round" strokeDasharray="182" strokeDashoffset="22" transform="rotate(-90)" className="ats-art-arc" />
          <path d="M-9 1l6 6 12-13" fill="none" stroke="url(#atsArtG)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  )
}

function ScanArt() {
  return (
    <div className="ats-progress-art" aria-hidden="true">
      <svg viewBox="0 0 120 150">
        <rect className="ats-art-sheet" x="10" y="6" width="100" height="138" rx="10" />
        <g className="ats-art-lines">
          <rect x="24" y="22" width="50" height="7" rx="3.5" />
          <rect x="24" y="36" width="34" height="4" rx="2" opacity="0.7" />
          <rect x="24" y="54" width="30" height="5" rx="2.5" className="acc" />
          <rect x="24" y="66" width="72" height="4" rx="2" opacity="0.6" />
          <rect x="24" y="75" width="66" height="4" rx="2" opacity="0.6" />
          <rect x="24" y="84" width="56" height="4" rx="2" opacity="0.6" />
          <rect x="24" y="102" width="26" height="5" rx="2.5" className="acc" />
          <rect x="24" y="114" width="72" height="4" rx="2" opacity="0.6" />
          <rect x="24" y="123" width="48" height="4" rx="2" opacity="0.6" />
        </g>
        <rect className="ats-scan-line" x="10" y="6" width="100" height="3" rx="1.5" />
      </svg>
    </div>
  )
}
