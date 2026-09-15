'use client'

/**
 * 4. adım — ATS & İndir.
 * Ana sütun: ATS raporu (skor, kategoriler, düzeltmeler, kontrol listesi, iş ilanı
 * eşleşmesi, parser görünümü). Yan sütun: indirme (PDF/DOCX/TXT), şablon/kâğıt
 * bilgisi, küçük canlı önizleme ve yedek.
 *
 * Rapor CvStudio'da bir kez hesaplanır (başlıktaki skor rozeti de onu kullanır)
 * ve buraya hazır gelir; bu adım yeniden analiz etmez. Görsel (design) şablonda
 * CvStudio önerilen ATS şablonuyla ikinci bir rapor da üretir → karşılaştırma kartı.
 */

import { useState } from 'react'
import AtsReport from '@/components/ats/AtsReport'
import JobMatchPanel from '@/components/ats/JobMatchPanel'
import TemplateCompare from '@/components/ats/TemplateCompare'
import { AtsIcon, prefersReducedMotion } from '@/components/ats/primitives'
import '@/components/ats/ats.css'
import type { AtsFixTarget, AtsReport as Report } from '@/lib/ats/types'
import { atsText } from '@/lib/ats/ui-text'
import { PAPER, downloadText, safeFileName } from '@/lib/cv/browser'
import { downloadDocx } from '@/lib/cv/docx'
import { getTemplate } from '@/lib/cv/templates'
import type { CvData, CvSettings } from '@/lib/cv/types'
import type { CvText } from '@/lib/cv/ui-text'
import type { Lang } from '@/lib/i18n/config'
import CvDocument from '../CvDocument'
import CvPaper from '../CvPaper'
import UiIcon from '../UiIcon'

const JOB_ID = 'cvs-ats-job'

type Props = {
  t: CvText
  lang: Lang
  data: CvData
  settings: CvSettings
  /** CvStudio'da hesaplanan rapor (seçili şablona göre); hesaplanamadıysa null. */
  report: Report | null
  /** Görsel şablon seçiliyken aynı veriyle önerilen ATS şablonuna göre hesaplanan rapor; aksi halde null. */
  altReport: Report | null
  /** Önerilen ATS uyumlu şablona geç (bu adımda kalınır). */
  onSwitchToAts: () => void
  /** Diğer ATS şablonlarını göster (ince ayar → şablon sekmesi). */
  onBrowseAts: () => void
  /** ATS'nin okuyacağı düz metin (TXT çıktısı). */
  plainText: string
  /** CV'de içerik var mı? Yoksa rapor yerine davet kartı gösterilir. */
  hasContent: boolean
  fileName: string
  setFileName: (v: string) => void
  pages: number
  onPages: (n: number) => void
  printing: boolean
  onDownload: () => void
  onExportJson: () => void
  onStartOver: () => void
  jobDescription: string
  onJobDescription: (v: string) => void
  targetTitle: string
  onTargetTitle: (v: string) => void
  /** 'details' | 'design' | 'sections' | 'template' → CvStudio ilgili adıma götürür. 'job' burada ele alınır. */
  onFix: (target: AtsFixTarget) => void
  onToast?: (message: string, tone?: 'ok' | 'error') => void
}

export default function ExportStep({
  t,
  lang,
  data,
  settings,
  report,
  altReport,
  onSwitchToAts,
  onBrowseAts,
  plainText,
  hasContent,
  fileName,
  setFileName,
  pages,
  onPages,
  printing,
  onDownload,
  onExportJson,
  onStartOver,
  jobDescription,
  onJobDescription,
  targetTitle,
  onTargetTitle,
  onFix,
  onToast,
}: Props) {
  const tx = atsText(lang)
  const tpl = getTemplate(settings.templateId)
  const design = tpl.family === 'design'
  // Görsel şablonlarda renkli zemin/fotoğraf için ek yazdırma ipuçları gerekir.
  const tips = design ? t.exportStep.tips.concat(t.exportStep.tipsDesign.filter((x) => t.exportStep.tips.indexOf(x) < 0)) : t.exportStep.tips
  const [jobOpen, setJobOpen] = useState(false)
  const baseName = safeFileName(fileName)

  function focusJob() {
    setJobOpen(true)
    // Panel açılıp textarea DOM'a girdikten sonra odaklan.
    window.setTimeout(() => {
      const el = document.getElementById(JOB_ID)
      if (!el) return
      el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'center' })
      el.focus({ preventScroll: true })
    }, 60)
  }

  function handleFix(target: AtsFixTarget) {
    if (target === 'job') focusJob()
    else onFix(target)
  }

  function docx() {
    const fail = (err?: unknown) => {
      if (process.env.NODE_ENV !== 'production') console.error('[cv] docx', err)
      onToast?.(tx.builder.docxError, 'error')
    }
    try {
      // İmza void; ileride Promise dönerse reddi de yakalanır.
      const out = downloadDocx(baseName, data, settings) as unknown
      if (out && typeof (out as Promise<void>).then === 'function') (out as Promise<void>).catch(fail)
    } catch (err) {
      fail(err)
    }
  }

  function txt() {
    downloadText(`${baseName}.txt`, plainText, 'text/plain')
  }

  const jobPanel = (
    <JobMatchPanel
      value={jobDescription}
      onChange={onJobDescription}
      title={targetTitle}
      onTitleChange={onTargetTitle}
      lang={lang}
      collapsible
      open={jobOpen}
      onOpenChange={setJobOpen}
      textareaId={JOB_ID}
    />
  )

  return (
    <div className="ats-export">
      <div className="ats-export-main">
        {!hasContent ? (
          <section className="ats-card cvs-panel ats-kw-empty">
            <span className="ats-kw-empty-ic">
              <AtsIcon name="file" />
            </span>
            <div>
              <h3>{tx.builder.emptyTitle}</h3>
              <p>{tx.builder.emptyDesc}</p>
            </div>
            <button type="button" className="cvs-btn primary" onClick={() => onFix('details')}>
              <AtsIcon name="arrow" />
              {tx.builder.emptyCta}
            </button>
          </section>
        ) : report ? (
          <AtsReport
            report={report}
            lang={lang}
            variant="builder"
            onFix={handleFix}
            afterHero={
              <>
                {/* Karşılaştırma yalnızca ATS şablonu gerçekten daha yüksek puan alıyorsa anlamlı. */}
                {design && altReport && altReport.score > report.score && (
                  <TemplateCompare
                    report={report}
                    alt={altReport}
                    currentName={tpl.name}
                    lang={lang}
                    onSwitch={onSwitchToAts}
                    onBrowse={onBrowseAts}
                  />
                )}
                {jobPanel}
              </>
            }
          />
        ) : (
          <>
            <div className="ats-alert" role="alert">
              <AtsIcon name="alert" />
              <div>
                <p>{tx.builder.reportError}</p>
              </div>
            </div>
            {jobPanel}
          </>
        )}
      </div>

      <aside className="ats-export-side">
        <div className="ats-side-card cvs-panel">
          <h2 className="ats-side-h">{t.exportStep.title}</h2>
          <p className="cvs-hint">{tx.builder.downloadDesc[tpl.family]}</p>

          <label className="cvs-field ats-side-name">
            <span>{t.exportStep.fileName}</span>
            <input value={fileName} onChange={(e) => setFileName(e.target.value)} placeholder="cv" />
          </label>

          <span className="ats-side-label">{t.exportStep.formatsTitle}</span>
          <div className="ats-formats">
            <button type="button" className="ats-format" data-primary onClick={onDownload} disabled={printing}>
              <span className="ats-format-ic">
                <UiIcon name={printing ? 'printer' : 'download'} />
              </span>
              <span className="ats-format-txt">
                <b>{printing ? t.exportStep.preparing : t.exportStep.download}</b>
                <small>{tx.builder.pdfSub}</small>
              </span>
              <em>{tx.builder.pdf}</em>
            </button>
            <button type="button" className="ats-format" onClick={docx}>
              <span className="ats-format-ic">
                <AtsIcon name="file" />
              </span>
              <span className="ats-format-txt">
                <b>{t.exportStep.downloadDocx}</b>
                <small>{tx.builder.docxSub}</small>
              </span>
              <em>{tx.builder.docx}</em>
            </button>
            {design && (
              <p className="ats-format-note">
                <AtsIcon name="shield" className="ats-inline-ic" />
                {tx.builder.docxNote}
              </p>
            )}
            <button type="button" className="ats-format" onClick={txt} disabled={!plainText.trim()}>
              <span className="ats-format-ic">
                <AtsIcon name="text" />
              </span>
              <span className="ats-format-txt">
                <b>{t.exportStep.downloadTxt}</b>
                <small>{tx.builder.txtSub}</small>
              </span>
              <em>{tx.builder.txt}</em>
            </button>
          </div>

          <div className="cvs-rows ats-side-stats">
            <div className="cvs-stat">
              <UiIcon name="layout" className="cvs-stat-ic" />
              <span className="cvs-stat-k">{t.exportStep.templateLabel}</span>
              <span className="cvs-stat-v ats-side-tpl">
                {tpl.name}
                <span className="ats-fam" data-family={tpl.family}>
                  {tx.template.family[tpl.family]}
                </span>
              </span>
            </div>
            <div className="cvs-stat">
              <UiIcon name="printer" className="cvs-stat-ic" />
              <span className="cvs-stat-k">{t.editor.paper}</span>
              <span className="cvs-stat-v">{PAPER[settings.paper]?.label ?? PAPER.a4.label}</span>
            </div>
            <div className="cvs-stat">
              <AtsIcon name="file" className="cvs-stat-ic" />
              <span className="cvs-stat-k">{tx.stats.pages}</span>
              <span className="cvs-stat-v">{t.exportStep.pages(pages)}</span>
            </div>
          </div>
        </div>

        <div className="cvs-stage ats-mini">
          <div className="cvs-stage-bar">
            <span>{tx.builder.livePreview}</span>
            <span>{t.exportStep.pages(pages)}</span>
          </div>
          <div className="cvs-scroll ats-mini-scroll" aria-label={t.a11yPreview}>
            <CvPaper paper={settings.paper} marginMm={settings.margin} onPages={onPages} pageLabel={(n) => String(n)}>
              <CvDocument data={data} settings={settings} static />
            </CvPaper>
          </div>
        </div>

        <details className="ats-side-card cvs-panel ats-tips">
          <summary>
            <UiIcon name="printer" className="cvs-stat-ic" />
            {t.exportStep.tipsTitle}
            <AtsIcon name="chevron" className="ats-tips-chev" />
          </summary>
          <ul className="cvs-tips">
            {tips.map((tip) => (
              <li key={tip}>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </details>

        <div className="ats-side-card cvs-panel">
          <h3 className="ats-side-h sm">{t.exportStep.backupTitle}</h3>
          <p className="cvs-hint">{t.exportStep.backupDesc}</p>
          <div className="cvs-actions">
            <button type="button" className="cvs-btn sm" onClick={onExportJson}>
              <UiIcon name="download" />
              {t.form.exportJson}
            </button>
            <button type="button" className="cvs-btn sm danger" onClick={onStartOver}>
              <UiIcon name="refresh" />
              {t.exportStep.startOver}
            </button>
          </div>
        </div>
      </aside>
    </div>
  )
}
