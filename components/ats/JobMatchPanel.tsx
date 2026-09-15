'use client'

/**
 * İş ilanı + hedef unvan girişi. Gecikmeli yeniden hesaplama üst bileşenin işidir;
 * bu panel yalnızca değeri taşır. `collapsible` açıkken ve ilan boşken yalnızca
 * davet kartı (CTA) görünür — rapor ekranı gereksiz yere uzamaz.
 */

import { useEffect, useState, type ReactNode } from 'react'
import { atsText } from '@/lib/ats/ui-text'
import { useLanguage } from '@/lib/i18n/LanguageProvider'
import type { Lang } from '@/lib/i18n/config'
import { AtsIcon } from './primitives'
import './ats.css'

type Props = {
  value: string
  onChange: (v: string) => void
  title: string
  onTitleChange: (v: string) => void
  lang?: Lang
  /** İlan boşken yalnızca CTA gösterilsin mi? */
  collapsible?: boolean
  /** Dışarıdan açma (ör. rapordaki "İş ilanını ekle" düğmesi). */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  textareaId?: string
  /** Panelin altına eklenecek eylemler (ör. "yeniden hesapla"). */
  footer?: ReactNode
}

export default function JobMatchPanel({
  value,
  onChange,
  title,
  onTitleChange,
  lang: langProp,
  collapsible,
  open: openProp,
  onOpenChange,
  textareaId = 'ats-job-desc',
  footer,
}: Props) {
  const ctx = useLanguage()
  const tx = atsText(langProp ?? ctx.lang).job
  const [openState, setOpenState] = useState(false)
  const open = openProp ?? openState
  const setOpen = (v: boolean) => {
    setOpenState(v)
    onOpenChange?.(v)
  }

  // İlan dışarıdan doldurulduysa (localStorage'dan) panel açık gelsin.
  useEffect(() => {
    if (value.trim() && !open) setOpen(true)
    // yalnızca değer değişince
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const expanded = !collapsible || open || !!value.trim() || !!title.trim()

  if (!expanded) {
    return (
      <button type="button" className="ats-jobcta" onClick={() => setOpen(true)}>
        <span className="ats-jobcta-ic">
          <AtsIcon name="target" />
        </span>
        <span className="ats-jobcta-txt">
          <b>{tx.cta}</b>
          <small>{tx.ctaSub}</small>
        </span>
        <AtsIcon name="arrow" className="ats-jobcta-go" />
      </button>
    )
  }

  return (
    <section className="ats-job cvs-panel" aria-labelledby={`${textareaId}-h`}>
      <div className="ats-job-head">
        <span className="ats-job-ic">
          <AtsIcon name="target" />
        </span>
        <div className="ats-job-titles">
          <h3 id={`${textareaId}-h`}>{tx.title}</h3>
          <p>{tx.desc}</p>
        </div>
        {collapsible && !value.trim() && !title.trim() && (
          <button type="button" className="cvs-btn sm" onClick={() => setOpen(false)}>
            {tx.collapse}
          </button>
        )}
      </div>

      <div className="ats-job-body">
        <label className="cvs-field">
          <span>{tx.targetTitle}</span>
          <input value={title} onChange={(e) => onTitleChange(e.target.value)} placeholder={tx.targetPlaceholder} maxLength={140} />
        </label>
        <label className="cvs-field">
          <span>{tx.posting}</span>
          <textarea
            id={textareaId}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={tx.postingPlaceholder}
            rows={6}
            spellCheck={false}
          />
        </label>
        <div className="ats-job-foot">
          <p className="cvs-hint">
            <AtsIcon name="lock" className="ats-inline-ic" />
            {tx.helper}
          </p>
          <div className="ats-job-meta">
            <span>{tx.chars(value.length)}</span>
            {(value || title) && (
              <button
                type="button"
                className="cvs-btn sm"
                onClick={() => {
                  onChange('')
                  onTitleChange('')
                }}
              >
                {tx.clear}
              </button>
            )}
          </div>
        </div>
        {footer}
      </div>
    </section>
  )
}
