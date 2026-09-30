'use client'

/**
 * Modülün küçük arayüz parçaları.
 *
 * Yeni bir UI kütüphanesi eklenmedi (§13): her şey projenin mevcut Tailwind
 * semantic token'larıyla (page/surface/line/fg/fg2/accent) ve globals.css
 * içindeki `.btn-primary` / `.btn-ghost` / `.glass` bileşen sınıflarıyla kuruldu.
 * Bu sayede modül site temasıyla (koyu/açık) otomatik uyumlu.
 */

import { useId, type ReactNode } from 'react'
import Icon, { type IconName } from './Icon'

const INPUT =
  'w-full rounded-xl border border-line/10 bg-surface/5 px-3 py-2.5 text-sm text-fg outline-none transition-colors placeholder:text-fg4 focus:border-accent/60 disabled:opacity-50'

export function Card({
  children,
  className,
  as: Tag = 'section',
}: {
  children: ReactNode
  className?: string
  as?: 'section' | 'div' | 'aside'
}) {
  return (
    <Tag className={`rounded-2xl border border-line/10 bg-surface/[0.03] p-4 sm:p-5 ${className ?? ''}`}>
      {children}
    </Tag>
  )
}

export function Label({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-fg3">
      {children}
      {hint ? <span className="ml-2 font-normal normal-case tracking-normal text-fg4">{hint}</span> : null}
    </span>
  )
}

export function Field({
  label,
  value,
  onChange,
  placeholder,
  hint,
  error,
  disabled,
  maxLength,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  hint?: string
  error?: string
  disabled?: boolean
  maxLength?: number
}) {
  const id = useId()
  return (
    <label htmlFor={id} className="block">
      <Label>{label}</Label>
      <input
        id={id}
        type="text"
        className={INPUT}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
      />
      {error ? (
        <small className="mt-1.5 block text-xs text-rose-400">{error}</small>
      ) : hint ? (
        <small className="mt-1.5 block text-xs text-fg4">{hint}</small>
      ) : null}
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
  disabled,
  maxLength,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  hint?: string
  rows?: number
  disabled?: boolean
  maxLength?: number
}) {
  const id = useId()
  return (
    <label htmlFor={id} className="block">
      <Label>{label}</Label>
      <textarea
        id={id}
        className={`${INPUT} resize-y leading-relaxed`}
        rows={rows}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint ? <small className="mt-1.5 block text-xs text-fg4">{hint}</small> : null}
    </label>
  )
}

export type Option<T extends string> = { value: T; label: string }

export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  hint,
  disabled,
}: {
  label: string
  value: T
  options: Option<T>[]
  onChange: (v: T) => void
  hint?: string
  disabled?: boolean
}) {
  const id = useId()
  return (
    <label htmlFor={id} className="block">
      <Label>{label}</Label>
      <div className="relative">
        <select
          id={id}
          className={`${INPUT} appearance-none pr-9`}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value as T)}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-fg3">
          <Icon name="chevron" />
        </span>
      </div>
      {hint ? <small className="mt-1.5 block text-xs text-fg4">{hint}</small> : null}
    </label>
  )
}

/** Sayı seçici — kaydırıcı + değer rozeti. Süre ve slayt sayısı için. */
export function Range({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
  disabled,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  onChange: (v: number) => void
  disabled?: boolean
}) {
  const id = useId()
  return (
    <label htmlFor={id} className="block">
      <span className="mb-1.5 flex items-baseline justify-between">
        <Label>{label}</Label>
        <span className="text-sm font-semibold text-accent-soft">
          {value}
          {unit ? ` ${unit}` : ''}
        </span>
      </span>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-surface/10 accent-accent disabled:opacity-50"
      />
    </label>
  )
}

/** Küçük ikon butonu — slayt listesi ve satır içi eylemler. */
export function IconButton({
  icon,
  title,
  onClick,
  disabled,
  tone = 'default',
}: {
  icon: IconName
  title: string
  onClick: () => void
  disabled?: boolean
  tone?: 'default' | 'danger'
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className={`grid h-8 w-8 place-items-center rounded-lg border border-line/10 bg-surface/5 transition-colors disabled:opacity-40 ${
        tone === 'danger' ? 'text-fg3 hover:border-rose-400/50 hover:text-rose-400' : 'text-fg3 hover:border-accent/50 hover:text-accent-soft'
      }`}
    >
      <Icon name={icon} />
    </button>
  )
}

/** Satır içi ikincil buton. */
export function GhostButton({
  children,
  onClick,
  icon,
  disabled,
  full,
  type = 'button',
}: {
  children: ReactNode
  onClick?: () => void
  icon?: IconName
  disabled?: boolean
  full?: boolean
  type?: 'button' | 'submit'
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-line/10 bg-surface/5 px-3.5 py-2 text-[13px] font-semibold text-fg2 transition-colors hover:border-accent/50 hover:text-accent-soft disabled:opacity-40 ${
        full ? 'w-full' : ''
      }`}
    >
      {icon ? <Icon name={icon} /> : null}
      {children}
    </button>
  )
}

export function Badge({ children, tone = 'muted' }: { children: ReactNode; tone?: 'muted' | 'ok' | 'warn' }) {
  const tones = {
    muted: 'border-line/10 bg-surface/5 text-fg3',
    ok: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
    warn: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
  } as const
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  )
}

/** Boş/hata durumu kartı — modül boyunca aynı görünüm. */
export function StateCard({
  icon = 'info',
  title,
  description,
  action,
  tone = 'muted',
}: {
  icon?: IconName
  title: string
  description?: string
  action?: ReactNode
  tone?: 'muted' | 'error'
}) {
  return (
    <div
      className={`rounded-2xl border p-8 text-center ${
        tone === 'error' ? 'border-rose-400/25 bg-rose-400/[0.04]' : 'border-line/10 bg-surface/[0.03]'
      }`}
    >
      <span
        className={`mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl ${
          tone === 'error' ? 'bg-rose-400/10 text-rose-300' : 'bg-accent/10 text-accent'
        }`}
      >
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <h3 className="font-display text-base font-semibold text-fg">{title}</h3>
      {description ? <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-fg3">{description}</p> : null}
      {action ? <div className="mt-5 flex flex-wrap justify-center gap-3">{action}</div> : null}
    </div>
  )
}

/** Kısa bildirim. Sayfanın altında sabit; kendi kendini kapatmaz, çağıran zamanlar. */
export function Toast({ message, tone = 'ok' }: { message: string; tone?: 'ok' | 'error' }) {
  return (
    <div
      role="status"
      className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border px-5 py-2.5 text-sm font-medium shadow-lg backdrop-blur-xl ${
        tone === 'error'
          ? 'border-rose-400/30 bg-rose-500/15 text-rose-200'
          : 'border-accent/30 bg-accent/15 text-accent-soft'
      }`}
    >
      {message}
    </div>
  )
}
