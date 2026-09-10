'use client'

/** Form ve düzenleyicide tekrar eden küçük arayüz parçaları. */

import { useId, useState } from 'react'
import UiIcon, { type UiIconName } from './UiIcon'

export function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  hint,
  disabled,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  hint?: string
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
        onChange={(e) => onChange(e.target.value)}
      />
      {hint && <small className="cvs-hint">{hint}</small>}
    </label>
  )
}

export function Area({
  label,
  value,
  onChange,
  placeholder,
  hint,
  rows = 4,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  hint?: string
  rows?: number
}) {
  return (
    <label className="cvs-field">
      <span>{label}</span>
      <textarea rows={rows} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      {hint && <small className="cvs-hint">{hint}</small>}
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

export function Range({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  format?: (v: number) => string
}) {
  return (
    <div className="cvs-range">
      <div className="cvs-range-top">
        <span>{label}</span>
        <b>{format ? format(value) : value}</b>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
      />
    </div>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  wrap,
}: {
  value: T
  options: { id: T; label: string; font?: string }[]
  onChange: (v: T) => void
  ariaLabel?: string
  /** Seçenek çoksa tek satıra sığmaz; sarmalı düzene geçer. */
  wrap?: boolean
}) {
  return (
    <div className={wrap ? 'cvs-seg wrap' : 'cvs-seg'} role="group" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
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
