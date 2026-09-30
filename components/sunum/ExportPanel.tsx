'use client'

/**
 * İndirme paneli (§9).
 *
 * PPTX ve PDF aynı `Presentation` modelinden üretilir; iki ayrı içerik yoktur:
 *   PPTX → lib/sunum/export/pptx.ts (PptxGenJS, dinamik import)
 *   PDF  → tarayıcının yazdırma motoru (#sunum-print-root + @page landscape)
 *
 * PptxGenJS ~1 MB olduğu için yalnızca butona basıldığında yüklenir; editörün
 * ilk açılış maliyetine eklenmez.
 */

import { useState } from 'react'
import Icon from './Icon'
import { downloadText } from '@/lib/cv/browser'
import { downloadBlob, safeFileName } from '@/lib/sunum/export/browser'
import { toBackupJson } from '@/lib/sunum/store'
import type { Presentation } from '@/lib/sunum/types'
import type { SunumText } from '@/lib/sunum/ui-text'
import { Field, GhostButton } from './ui'

type Props = {
  presentation: Presentation
  /** Yazdırma kökünü mount edip window.print() çağırması üst bileşenin işi. */
  onPrint: () => void
  printing: boolean
  onNotify: (message: string, tone?: 'ok' | 'error') => void
  t: SunumText
}

export default function ExportPanel({ presentation, onPrint, printing, onNotify, t }: Props) {
  const [fileName, setFileName] = useState(() => safeFileName(presentation.title, 'sunum'))
  const [busy, setBusy] = useState(false)

  const base = safeFileName(fileName, 'sunum')

  const downloadPptx = async () => {
    setBusy(true)
    try {
      const { pptxBlob } = await import('@/lib/sunum/export/pptx')
      const blob = await pptxBlob(presentation)
      downloadBlob(`${base}.pptx`, blob)
      onNotify(t.exportPanel.pptxDone)
    } catch (e) {
      onNotify(e instanceof Error ? e.message : t.errors.exportFailed, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <Field label={t.exportPanel.fileName} value={fileName} onChange={setFileName} maxLength={120} />

      <div className="grid gap-2">
        <button
          type="button"
          className="btn-primary w-full whitespace-nowrap py-2.5 text-[13px]"
          disabled={busy}
          onClick={() => void downloadPptx()}
        >
          <Icon name={busy ? 'refresh' : 'download'} />
          {busy ? t.exportPanel.pptxBusy : t.exportPanel.pptx}
        </button>

        <GhostButton icon="printer" full disabled={printing} onClick={onPrint}>
          {printing ? t.exportPanel.pdfBusy : t.exportPanel.pdf}
        </GhostButton>

        <GhostButton
          icon="upload"
          full
          onClick={() => downloadText(`${base}.json`, toBackupJson(presentation))}
        >
          {t.exportPanel.json}
        </GhostButton>
      </div>

      <p className="text-xs leading-relaxed text-fg4">{t.exportPanel.hint}</p>
    </div>
  )
}
