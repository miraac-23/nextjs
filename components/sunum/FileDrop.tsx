'use client'

/**
 * PDF / DOCX yükleme alanı — sürükle-bırak destekli (§3).
 *
 * Dosya cihazdan çıkmaz: metin tarayıcıda çıkarılır (lib/sunum/extract.ts),
 * AI'ya yalnızca çıkarılan METİN gider. Bu yüzden "yükleme" sırasında ağ
 * trafiği yoktur; gösterilen ilerleme gerçek ayrıştırma süresidir.
 *
 * Bileşen hem açılış ekranında (kompakt) hem sihirbazda (geniş) kullanılır.
 */

import { useCallback, useRef, useState, type DragEvent } from 'react'
import { ExtractError, extractDocument, type ExtractedDocument } from '@/lib/sunum/extract'
import type { SunumText } from '@/lib/sunum/ui-text'
import Icon from './Icon'

const ACCEPT =
  '.pdf,.docx,.txt,.md,application/pdf,' +
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown'

type Props = {
  t: SunumText
  doc: ExtractedDocument | null
  onDoc: (doc: ExtractedDocument | null) => void
  /** Kompakt: açılış ekranındaki iki küçük buton. Geniş: sihirbazdaki bırakma alanı. */
  variant?: 'compact' | 'zone'
  /** Kompakt varyantta buton etiketini seçer. */
  label?: string
}

export default function FileDrop({ t, doc, onDoc, variant = 'zone', label }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [reading, setReading] = useState(false)
  const [over, setOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** İç içe sürükleme olaylarında sayaç tutulmazsa vurgulama titrer. */
  const depth = useRef(0)

  const handle = useCallback(
    async (file: File | null) => {
      setError(null)
      if (!file) return
      setReading(true)
      try {
        onDoc(await extractDocument(file))
      } catch (e) {
        const code = e instanceof ExtractError ? e.code : 'failed'
        setError(
          code === 'too-large'
            ? t.errors.fileTooLarge
            : code === 'type'
              ? t.errors.fileType
              : code === 'empty'
                ? t.errors.fileEmpty
                : t.errors.fileFailed,
        )
        onDoc(null)
      } finally {
        setReading(false)
        if (inputRef.current) inputRef.current.value = ''
      }
    },
    [onDoc, t],
  )

  const onDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    depth.current = 0
    setOver(false)
    void handle(event.dataTransfer.files?.[0] ?? null)
  }

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept={ACCEPT}
      className="hidden"
      onChange={(e) => void handle(e.target.files?.[0] ?? null)}
    />
  )

  if (doc) {
    return (
      <div className="sn-pop flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/25 bg-accent/[0.06] px-3.5 py-3">
        <p className="flex min-w-0 items-center gap-2 text-xs text-fg2">
          <span className="text-accent">
            <Icon name="check" />
          </span>
          <span className="truncate">{t.form.uploadDone(doc.fileName, doc.chars)}</span>
        </p>
        <button
          type="button"
          onClick={() => onDoc(null)}
          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-semibold text-fg3 transition-colors hover:text-rose-400"
        >
          <Icon name="trash" />
          {t.form.uploadRemove}
        </button>
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <>
        {input}
        <button
          type="button"
          disabled={reading}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-line/15 bg-surface/5 px-4 py-2 text-[13px] font-semibold text-fg2 transition-colors hover:border-accent/50 hover:text-accent-soft disabled:opacity-50"
        >
          <Icon name={reading ? 'refresh' : 'upload'} />
          {reading ? t.form.analyzing : (label ?? t.form.upload)}
        </button>
        {error ? <span className="text-xs text-rose-400">{error}</span> : null}
      </>
    )
  }

  return (
    <div>
      {input}
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        onDragEnter={(e) => {
          e.preventDefault()
          depth.current++
          setOver(true)
        }}
        onDragLeave={() => {
          depth.current = Math.max(0, depth.current - 1)
          if (depth.current === 0) setOver(false)
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-5 py-8 text-center transition-colors ${
          over ? 'border-accent bg-accent/[0.07]' : 'border-line/20 hover:border-accent/50 hover:bg-surface/[0.03]'
        }`}
      >
        <span
          className={`grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent ${reading ? 'animate-pulse' : ''}`}
        >
          <Icon name={reading ? 'refresh' : 'upload'} className="h-5 w-5" />
        </span>
        <span className="text-sm font-semibold text-fg2">
          {reading ? t.form.analyzing : over ? t.form.dropHere : t.form.upload}
        </span>
        <span className="text-xs text-fg4">{t.form.dropHint}</span>
        {/* Ayrıştırma süresi dosyaya göre değişir; belirsiz ilerleme dürüst olanı. */}
        {reading ? (
          <span className="mt-1 h-1 w-40 overflow-hidden rounded-full bg-surface/10">
            <span className="block h-full w-1/3 animate-[marquee_1.1s_linear_infinite] rounded-full bg-accent" />
          </span>
        ) : null}
      </div>
      {error ? <small className="mt-2 block text-xs text-rose-400">{error}</small> : null}
    </div>
  )
}
