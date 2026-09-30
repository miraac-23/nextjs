'use client'

/**
 * Metin listesi düzenleyici (maddeler, katman bileşenleri, grafik verileri).
 *
 * Tek sorumluluk: dizi üzerinde ekle / sil / sırala / düzenle. Slaytın hangi
 * alanına bağlandığını bilmez — bu yüzden madde listesinden istatistik satırına
 * kadar her yerde tekrar kullanılabiliyor.
 */

import Icon from '../Icon'
import { Label } from '../ui'

const ROW =
  'w-full rounded-lg border border-line/10 bg-surface/5 px-2.5 py-2 text-[13px] text-fg outline-none transition-colors placeholder:text-fg4 focus:border-accent/60'

type Props = {
  label: string
  items: string[]
  onChange: (items: string[]) => void
  addLabel: string
  removeLabel: string
  placeholder?: string
  max?: number
  /** Uzun metinler için tek satır yerine çok satırlı alan. */
  multiline?: boolean
}

export default function ListEditor({
  label,
  items,
  onChange,
  addLabel,
  removeLabel,
  placeholder,
  max = 8,
  multiline = true,
}: Props) {
  const set = (index: number, value: string) => {
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
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-1.5">
            {multiline ? (
              <textarea
                className={`${ROW} resize-y leading-snug`}
                rows={2}
                value={item}
                placeholder={placeholder}
                onChange={(e) => set(i, e.target.value)}
              />
            ) : (
              <input className={ROW} value={item} placeholder={placeholder} onChange={(e) => set(i, e.target.value)} />
            )}
            <div className="flex flex-col gap-1">
              <button
                type="button"
                title={removeLabel}
                aria-label={removeLabel}
                onClick={() => onChange(items.filter((_, j) => j !== i))}
                className="grid h-6 w-6 place-items-center rounded-md border border-line/10 text-fg4 transition-colors hover:border-rose-400/50 hover:text-rose-400"
              >
                <Icon name="x" />
              </button>
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
            </div>
          </li>
        ))}
      </ul>
      {items.length < max ? (
        <button
          type="button"
          onClick={() => onChange(items.concat(['']))}
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-line/20 px-2.5 py-1.5 text-xs font-semibold text-fg3 transition-colors hover:border-accent/50 hover:text-accent-soft"
        >
          <Icon name="plus" />
          {addLabel}
        </button>
      ) : null}
    </div>
  )
}
