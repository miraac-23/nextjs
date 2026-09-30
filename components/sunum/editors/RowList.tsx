'use client'

/**
 * Nesne listesi düzenleyici — istatistik satırları, grafik verileri, adımlar,
 * mimari katmanları. Satırın İÇİ çağırana bırakılır (`children`), bu yüzden tek
 * bileşen beş farklı alanı yönetiyor ve her biri için ayrı kalıp yazılmıyor.
 */

import type { ReactNode } from 'react'
import Icon from '../Icon'
import { Label } from '../ui'

type Props<T> = {
  label: string
  items: T[]
  onChange: (items: T[]) => void
  addLabel: string
  removeLabel: string
  /** Yeni satırın başlangıç değeri. */
  blank: () => T
  max?: number
  children: (item: T, set: (value: T) => void, index: number) => ReactNode
}

export default function RowList<T>({
  label,
  items,
  onChange,
  addLabel,
  removeLabel,
  blank,
  max = 8,
  children,
}: Props<T>) {
  const set = (index: number) => (value: T) => {
    const next = items.slice()
    next[index] = value
    onChange(next)
  }

  const move = (index: number, delta: number) => {
    const target = index + delta
    if (target < 0 || target >= items.length) return
    const next = items.slice()
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)
    onChange(next)
  }

  return (
    <div>
      <Label>{label}</Label>
      <ul className="space-y-2.5">
        {items.map((item, i) => (
          <li key={i} className="rounded-xl border border-line/10 bg-surface/[0.04] p-2.5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-fg4">{i + 1}</span>
              <span className="flex gap-1">
                <button
                  type="button"
                  title={`${label} ↑`}
                  aria-label={`${label} ↑`}
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                  className="grid h-6 w-6 place-items-center rounded-md border border-line/10 text-fg4 transition-colors hover:border-accent/50 hover:text-accent-soft disabled:opacity-30"
                >
                  <Icon name="up" />
                </button>
                <button
                  type="button"
                  title={`${label} ↓`}
                  aria-label={`${label} ↓`}
                  disabled={i === items.length - 1}
                  onClick={() => move(i, 1)}
                  className="grid h-6 w-6 place-items-center rounded-md border border-line/10 text-fg4 transition-colors hover:border-accent/50 hover:text-accent-soft disabled:opacity-30"
                >
                  <Icon name="down" />
                </button>
                <button
                  type="button"
                  title={removeLabel}
                  aria-label={removeLabel}
                  onClick={() => onChange(items.filter((_, j) => j !== i))}
                  className="grid h-6 w-6 place-items-center rounded-md border border-line/10 text-fg4 transition-colors hover:border-rose-400/50 hover:text-rose-400"
                >
                  <Icon name="x" />
                </button>
              </span>
            </div>
            <div className="space-y-2">{children(item, set(i), i)}</div>
          </li>
        ))}
      </ul>
      {items.length < max ? (
        <button
          type="button"
          onClick={() => onChange(items.concat([blank()]))}
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-line/20 px-2.5 py-1.5 text-xs font-semibold text-fg3 transition-colors hover:border-accent/50 hover:text-accent-soft"
        >
          <Icon name="plus" />
          {addLabel}
        </button>
      ) : null}
    </div>
  )
}

/** Satır içi küçük metin girdisi — RowList içindeki alanlar için. */
export function MiniInput({
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: 'text' | 'number'
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-line/10 bg-surface/5 px-2.5 py-1.5 text-[13px] text-fg outline-none transition-colors placeholder:text-fg4 focus:border-accent/60"
    />
  )
}
