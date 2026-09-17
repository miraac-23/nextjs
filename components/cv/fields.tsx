'use client'

/** Form ve düzenleyicide tekrar eden küçük arayüz parçaları. */

import { useId, useState } from 'react'
import UiIcon, { type UiIconName } from './UiIcon'

/** Yumuşak uyarılar: tek metin ya da (koşullu üretilmiş) metin listesi. Boş/false öğeler atlanır. */
type WarnProp = string | (string | false | null | undefined)[]

function warnList(warn?: WarnProp): string[] {
  if (!warn) return []
  const list = Array.isArray(warn) ? warn : [warn]
  return list.filter((w): w is string => typeof w === 'string' && w.length > 0)
}

/** Alan altındaki uyarı satırları — girişi engellemez, yalnızca yönlendirir. */
export function Warnings({ warn }: { warn?: WarnProp }) {
  const list = warnList(warn)
  if (list.length === 0) return null
  return (
    <>
      {list.map((w) => (
        <small key={w} className="cvs-hint warn" role="status">
          <UiIcon name="warn" />
          <span>{w}</span>
        </small>
      ))}
    </>
  )
}

export function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  hint,
  warn,
  list,
  disabled,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  hint?: string
  /** Yumuşak uyarı(lar) — ör. tanınmayan tarih. */
  warn?: WarnProp
  /** Öneri listesi için `<datalist>` kimliği. */
  list?: string
  disabled?: boolean
}) {
  return (
    <label className="cvs-field" data-disabled={disabled || undefined}>
      <span>{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        list={list}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint && <small className="cvs-hint">{hint}</small>}
      <Warnings warn={warn} />
    </label>
  )
}

export function Area({
  label,
  value,
  onChange,
  placeholder,
  hint,
  warn,
  meta,
  metaWarn,
  rows = 4,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  hint?: string
  warn?: WarnProp
  /** Başlık satırının sağında gösterilen canlı sayaç (ör. "3 cümle · 52 kelime"). */
  meta?: string
  /** Sayaç önerilen aralığın dışındaysa uyarı rengine geçer. */
  metaWarn?: boolean
  rows?: number
}) {
  return (
    <label className="cvs-field">
      <span className="cvs-field-head">
        <span>{label}</span>
        {meta && (
          <small className="cvs-count" data-warn={metaWarn || undefined}>
            {meta}
          </small>
        )}
      </span>
      <textarea rows={rows} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      {hint && <small className="cvs-hint">{hint}</small>}
      <Warnings warn={warn} />
    </label>
  )
}

export function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="cvs-check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  )
}

export function Switch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="cvs-switch">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  )
}

/** Adımın ondalık basamak sayısı — kayan nokta artıklarını (0.30000000004) temizlemek için. */
function stepDecimals(step: number): number {
  const txt = String(step)
  const dot = txt.indexOf('.')
  return dot < 0 ? 0 : txt.length - dot - 1
}

/**
 * Sayısal ayar: kaydırıcı + ince ayar için −/+ düğmeleri + elle yazılabilen değer kutusu.
 * Yazılan değer Enter/odak kaybında sınırlara kırpılır ve adıma yuvarlanır.
 * `recommended` verilirse değer bu aralığın dışına çıktığında yumuşak bir uyarı basılır.
 */
export function Range({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
  recommended,
  recommendedHint,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  format?: (v: number) => string
  recommended?: readonly [number, number]
  /** Önerilen aralık dışındayken gösterilecek metin. */
  recommendedHint?: string
}) {
  const decimals = stepDecimals(step)
  const [draft, setDraft] = useState<string | null>(null)

  const commit = (raw: number) => {
    if (!Number.isFinite(raw)) return
    const snapped = Math.round((raw - min) / step) * step + min
    const next = Number(Math.min(max, Math.max(min, snapped)).toFixed(decimals))
    if (next !== value) onChange(next)
  }

  const commitDraft = () => {
    if (draft !== null) commit(Number(draft.replace(',', '.')))
    setDraft(null)
  }

  const outOfRec = recommended !== undefined && (value < recommended[0] - 1e-9 || value > recommended[1] + 1e-9)

  return (
    <div className="cvs-range">
      <div className="cvs-range-top">
        <span>{label}</span>
        <b>{format ? format(value) : value}</b>
      </div>
      <div className="cvs-range-row">
        <button
          type="button"
          className="cvs-range-btn"
          onClick={() => commit(value - step)}
          disabled={value <= min}
          aria-label={`${label} −`}
        >
          −
        </button>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={label}
        />
        <button
          type="button"
          className="cvs-range-btn"
          onClick={() => commit(value + step)}
          disabled={value >= max}
          aria-label={`${label} +`}
        >
          +
        </button>
        <input
          type="number"
          className="cvs-range-num"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={draft ?? String(Number(value.toFixed(decimals)))}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitDraft}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commitDraft()
            } else if (e.key === 'Escape') {
              setDraft(null)
            }
          }}
          aria-label={`${label} (${min}–${max})`}
        />
      </div>
      {outOfRec && recommendedHint && (
        <small className="cvs-hint warn cvs-range-rec" role="status">
          <UiIcon name="warn" />
          <span>{recommendedHint}</span>
        </small>
      )}
    </div>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  wrap,
  className,
}: {
  value: T
  /** `title` → ipucu ve erişilebilir ad (ör. yalnızca "Aa" yazan font düğmeleri). */
  options: { id: T; label: string; font?: string; title?: string }[]
  onChange: (v: T) => void
  ariaLabel?: string
  /** Seçenek çoksa tek satıra sığmaz; sarmalı düzene geçer. */
  wrap?: boolean
  /** Ek sınıf — ör. font seçicinin 3 sütunlu ızgarası (`cvs-fontgrid`). */
  className?: string
}) {
  const cls = ['cvs-seg', wrap ? 'wrap' : '', className ?? ''].filter(Boolean).join(' ')
  return (
    <div className={cls} role="group" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          title={o.title}
          aria-label={o.title}
          style={o.font ? { fontFamily: o.font } : undefined}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Açılır bölüm — form uzun olduğu için her CV bölümü kendi akordeonunda durur. */
export function Accordion({
  icon,
  title,
  count,
  defaultOpen = false,
  children,
}: {
  icon: UiIconName
  title: string
  count?: number
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  const id = useId()
  return (
    <section className="cvs-acc" data-open={open}>
      <button type="button" className="cvs-acc-btn" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls={id}>
        <span className="cvs-acc-ic">
          <UiIcon name={icon} />
        </span>
        <span>{title}</span>
        {typeof count === 'number' && count > 0 && <span className="cvs-acc-count">{count}</span>}
        <UiIcon name="chevron" className="cvs-acc-chev" />
      </button>
      {open && (
        <div className="cvs-acc-body" id={id}>
          {children}
        </div>
      )}
    </section>
  )
}

/** Liste kayıtları için ortak kart: başlık, taşı/sil düğmeleri, gövde. */
export function Entry({
  title,
  subtitle,
  index,
  total,
  onMove,
  onRemove,
  labels,
  children,
}: {
  title: string
  subtitle?: string
  index: number
  total: number
  onMove: (dir: -1 | 1) => void
  onRemove: () => void
  labels: { up: string; down: string; remove: string }
  children: React.ReactNode
}) {
  return (
    <article className="cvs-entry">
      <header className="cvs-entry-head">
        <h4 className="cvs-entry-title">
          {title}
          {subtitle ? <span> · {subtitle}</span> : null}
        </h4>
        <button type="button" className="cvs-btn icon sm" title={labels.up} aria-label={labels.up} disabled={index === 0} onClick={() => onMove(-1)}>
          <UiIcon name="up" />
        </button>
        <button
          type="button"
          className="cvs-btn icon sm"
          title={labels.down}
          aria-label={labels.down}
          disabled={index === total - 1}
          onClick={() => onMove(1)}
        >
          <UiIcon name="down" />
        </button>
        <button type="button" className="cvs-btn icon sm danger" title={labels.remove} aria-label={labels.remove} onClick={onRemove}>
          <UiIcon name="trash" />
        </button>
      </header>
      <div className="cvs-entry-body">{children}</div>
    </article>
  )
}

export function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="cvs-btn" onClick={onClick}>
      <UiIcon name="plus" />
      {label}
    </button>
  )
}
