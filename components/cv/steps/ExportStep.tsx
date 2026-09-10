'use client'

/**
 * 4. adım — PDF çıktısı.
 * Dönüştürme için hiçbir kütüphane ya da servis kullanılmaz: belge zaten
 * gerçek mm ölçülerinde kurulduğu için tarayıcının kendi yazdırma motoru
 * metni seçilebilir ve vektörel biçimde PDF'e basar.
 */

import { PAPER } from '@/lib/cv/browser'
import { getTemplate } from '@/lib/cv/templates'
import type { CvData, CvSettings } from '@/lib/cv/types'
import type { CvText } from '@/lib/cv/ui-text'
import CvDocument from '../CvDocument'
import CvPaper from '../CvPaper'
import UiIcon from '../UiIcon'

type Props = {
  t: CvText
  data: CvData
  settings: CvSettings
  fileName: string
  setFileName: (v: string) => void
  pages: number
  onPages: (n: number) => void
  printing: boolean
  onDownload: () => void
  onExportJson: () => void
  onStartOver: () => void
}

export default function ExportStep({
  t,
  data,
  settings,
  fileName,
  setFileName,
  pages,
  onPages,
  printing,
  onDownload,
  onExportJson,
  onStartOver,
}: Props) {
  const tpl = getTemplate(settings.templateId)

  return (
    <div className="cvs-done">
      <div className="cvs-stage">
        <div className="cvs-stage-bar">
          <span>{t.a11yPreview}</span>
          <span>{t.exportStep.pages(pages)}</span>
        </div>
        <div className="cvs-scroll">
          <CvPaper paper={settings.paper} onPages={onPages} pageLabel={(n) => String(n)}>
            <CvDocument data={data} settings={settings} t={t} static />
          </CvPaper>
        </div>
      </div>

      <div>
        <div className="cvs-panel cvs-panel-pad">
          <h2 style={{ fontSize: '1.15rem', marginBottom: '0.4rem' }}>{t.exportStep.title}</h2>
          <p className="cvs-sub" style={{ marginTop: 0 }}>
            {t.exportStep.desc}
          </p>

          <div className="cvs-hr" />

          <label className="cvs-field" style={{ marginBottom: '0.9rem' }}>
            <span>{t.exportStep.fileName}</span>
            <input value={fileName} onChange={(e) => setFileName(e.target.value)} placeholder="cv" />
          </label>

          <button type="button" className="cvs-btn primary lg" style={{ width: '100%' }} onClick={onDownload} disabled={printing}>
            <UiIcon name={printing ? 'printer' : 'download'} />
            {printing ? t.exportStep.preparing : t.exportStep.download}
          </button>

          <div className="cvs-rows" style={{ marginTop: '0.9rem' }}>
            <div className="cvs-stat">
              <UiIcon name="layout" className="cvs-stat-ic" />
              <span className="cvs-stat-k">{t.exportStep.templateLabel}</span>
              <span className="cvs-stat-v">{tpl.name}</span>
            </div>
            <div className="cvs-stat">
              <UiIcon name="printer" className="cvs-stat-ic" />
              <span className="cvs-stat-k">{t.editor.paper}</span>
              <span className="cvs-stat-v">{PAPER[settings.paper].label}</span>
            </div>
          </div>
        </div>

        <div className="cvs-panel cvs-panel-pad" style={{ marginTop: '1rem' }}>
          <h3 style={{ fontSize: '0.95rem', marginBottom: '0.75rem' }}>{t.exportStep.tipsTitle}</h3>
          <ul className="cvs-tips">
            {t.exportStep.tips.map((tip) => (
              <li key={tip}>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="cvs-panel cvs-panel-pad" style={{ marginTop: '1rem' }}>
          <h3 style={{ fontSize: '0.95rem', marginBottom: '0.4rem' }}>{t.exportStep.backupTitle}</h3>
          <p className="cvs-hint" style={{ marginBottom: '0.8rem' }}>
            {t.exportStep.backupDesc}
          </p>
          <div className="cvs-actions">
            <button type="button" className="cvs-btn" onClick={onExportJson}>
              <UiIcon name="download" />
              {t.form.exportJson}
            </button>
            <button type="button" className="cvs-btn danger" onClick={onStartOver}>
              <UiIcon name="refresh" />
              {t.exportStep.startOver}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
