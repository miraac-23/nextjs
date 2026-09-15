'use client'

/**
 * ATS arayüzünün küçük yapı taşları: skor halkası, yatay ölçer, durum ikonu ve
 * ikon seti. Hepsi inline SVG'dir. (Grafik yasağı CV belgesi içindir; araç
 * arayüzünde halka/ölçer serbesttir.)
 */

import { useEffect, useId, useRef, useState } from 'react'
import type { AtsCategoryKey, AtsGrade, AtsStatus } from '@/lib/ats/types'

/* --------------------------------- yardımcı -------------------------------- */

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** 0–100 puanı renk tonuna çevirir (kategori ölçerleri ve rozetler için). */
export function toneOf(score: number): AtsGrade {
  if (score >= 85) return 'excellent'
  if (score >= 70) return 'good'
  if (score >= 50) return 'fair'
  return 'poor'
}

const GRADE_STOPS: Record<AtsGrade, [string, string]> = {
  excellent: ['#34d399', '#22d3ee'],
  good: ['#22d3ee', '#818cf8'],
  fair: ['#fbbf24', '#fb923c'],
  poor: ['#fb7185', '#f43f5e'],
}

/** Sayıyı önceki değerden yenisine akıcı biçimde sayar. */
export function useCountUp(target: number, duration = 1100): number {
  const [value, setValue] = useState(0)
  const from = useRef(0)

  useEffect(() => {
    const start = from.current
    if (prefersReducedMotion() || document.hidden || start === target) {
      from.current = target
      setValue(target)
      return
    }
    let raf = 0
    const t0 = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      const v = Math.round(start + (target - start) * eased)
      from.current = v
      setValue(v)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])

  return value
}

/** useId ":r1:" üretir; SVG url(#…) referansında iki nokta sorun çıkarır. */
function useSvgId(prefix: string): string {
  return `${prefix}${useId().replace(/[^a-zA-Z0-9]/g, '')}`
}

/* -------------------------------- skor halkası ------------------------------ */

type RingProps = {
  score: number
  grade: AtsGrade
  size?: number
  stroke?: number
  /** Ortadaki sayıyı gösterir; küçük rozetlerde kapatılır. */
  label?: boolean
  caption?: string
  animate?: boolean
}

export function ScoreRing({ score, grade, size = 180, stroke = 12, label = true, caption, animate = true }: RingProps) {
  const id = useSvgId('atsRing')
  const counted = useCountUp(score)
  const shown = animate ? counted : score
  const r = 50 - stroke / 2
  const c = 2 * Math.PI * r
  const [a, b] = GRADE_STOPS[grade]
  // Halka ilk boyamada boş başlar, sonra dolar — sayı ile birlikte ilerler.
  const [mounted, setMounted] = useState(!animate)
  useEffect(() => {
    if (!animate) return
    const raf = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(raf)
  }, [animate])
  const pct = Math.max(0, Math.min(100, mounted ? score : 0))

  return (
    <div className="ats-ring" data-grade={grade} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={a} />
            <stop offset="100%" stopColor={b} />
          </linearGradient>
        </defs>
        <circle className="ats-ring-track" cx="50" cy="50" r={r} strokeWidth={stroke} />
        <circle
          className="ats-ring-fill"
          cx="50"
          cy="50"
          r={r}
          strokeWidth={stroke}
          stroke={`url(#${id})`}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct / 100)}
        />
      </svg>
      {label && (
        <div className="ats-ring-label">
          <b>{shown}</b>
          {caption && <small>{caption}</small>}
        </div>
      )}
    </div>
  )
}

/* -------------------------------- yatay ölçer ------------------------------- */

export function Meter({ value, tone, muted }: { value: number; tone?: AtsGrade; muted?: boolean }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(raf)
  }, [])
  const v = Math.max(0, Math.min(100, value))
  return (
    <div className="ats-meter" data-tone={tone ?? toneOf(v)} data-muted={muted || undefined} aria-hidden="true">
      <span style={{ width: muted ? '100%' : `${mounted ? v : 0}%` }} />
    </div>
  )
}

/* --------------------------------- ikonlar --------------------------------- */

export type AtsIconName =
  | 'upload' | 'file' | 'shield' | 'spark' | 'check' | 'x' | 'alert' | 'info'
  | 'columns' | 'heading' | 'key' | 'text' | 'arrow' | 'refresh' | 'copy'
  | 'chevron' | 'target' | 'wand' | 'download' | 'layers' | 'eye' | 'lock'
  | 'search' | 'tool' | 'users' | 'bulb' | 'palette' | 'scale'

/** Beş skor kategorisinin ikonları — rapor, yöntem paneli ve yükleme sayfası ortak kullanır. */
export const CATEGORY_ICON: Record<AtsCategoryKey, AtsIconName> = {
  formatting: 'columns',
  searchability: 'search',
  hardSkills: 'tool',
  softSkills: 'users',
  recruiterTips: 'bulb',
}

const P: Record<AtsIconName, JSX.Element> = {
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="M15 15l5 5" />
    </>
  ),
  tool: <path d="M14.5 5.5a4 4 0 00-5 5L4 16v4h4l5.5-5.5a4 4 0 005-5l-2.5 2.5-2.5-.5-.5-2.5z" />,
  users: (
    <>
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M3.5 19.5a5.5 5.5 0 0111 0M15.5 5.6a3.2 3.2 0 010 5.8M17.5 14.2a5.5 5.5 0 013 5.3" />
    </>
  ),
  bulb: <path d="M9 17.5h6M10 20.5h4M12 3.5a6 6 0 00-3.6 10.8c.7.5 1.1 1.3 1.1 2.2h5c0-.9.4-1.7 1.1-2.2A6 6 0 0012 3.5z" />,
  palette: (
    <>
      <path d="M12 3.5a8.5 8.5 0 000 17c1.2 0 1.8-.8 1.8-1.7 0-1.3-1.1-1.5-1.1-2.6 0-.9.7-1.6 1.6-1.6h2.2a4 4 0 004-4c0-4.1-3.8-7.1-8.5-7.1z" />
      <circle cx="7.8" cy="11" r="1" />
      <circle cx="10.5" cy="7.5" r="1" />
      <circle cx="15" cy="7.8" r="1" />
    </>
  ),
  scale: <path d="M12 4v16M7 20h10M5 7h14M5 7l-2.5 6a2.5 2.5 0 005 0zM19 7l-2.5 6a2.5 2.5 0 005 0z" />,
  upload: <path d="M12 15.5V4M7.5 8.5L12 4l4.5 4.5M4.5 15v3a2 2 0 002 2h11a2 2 0 002-2v-3" />,
  file: (
    <>
      <path d="M14 3.5H7.5a2 2 0 00-2 2v13a2 2 0 002 2h9a2 2 0 002-2V8z" />
      <path d="M14 3.5V8h4.5M9 12.5h6M9 16h4" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3l7.5 3v5.5c0 4.3-3.1 8.1-7.5 9.5-4.4-1.4-7.5-5.2-7.5-9.5V6z" />
      <path d="M9 12l2.2 2.2L15.5 10" />
    </>
  ),
  spark: <path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9L12 3.5zM18.5 16l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2z" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  x: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  alert: <path d="M12 9v4.5M12 17h.01M10.3 4.2L2.8 17.5A2 2 0 004.5 20.5h15a2 2 0 001.7-3L13.7 4.2a2 2 0 00-3.4 0z" />,
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  columns: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2.5" />
      <path d="M8 8.5h8M8 12h8M8 15.5h5" />
    </>
  ),
  heading: <path d="M6 5v14M18 5v14M6 12h12" />,
  key: (
    <>
      <circle cx="8" cy="15" r="3.5" />
      <path d="M10.5 12.5L19 4M16 7l2.5 2.5M13.5 9.5L15.5 11.5" />
    </>
  ),
  text: <path d="M5 6.5h14M5 10.5h14M5 14.5h10M5 18.5h7" />,
  arrow: <path d="M5 12h14M13.5 6.5L19 12l-5.5 5.5" />,
  refresh: <path d="M20 11a8 8 0 10-1.5 5.5M20 20v-5h-5" />,
  copy: (
    <>
      <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
      <path d="M15.5 8.5V6.5a2 2 0 00-2-2h-7a2 2 0 00-2 2v7a2 2 0 002 2h2" />
    </>
  ),
  chevron: <path d="M6 9.5l6 6 6-6" />,
  target: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="0.6" />
    </>
  ),
  wand: <path d="M4 20L15 9M13 7l4 4M17.5 3.5v3M16 5h3M20.5 9.5v2M19.5 10.5h2M9.5 3.5v2M8.5 4.5h2" />,
  download: <path d="M12 3.5V15M7.5 10.5L12 15l4.5-4.5M4.5 20h15" />,
  layers: <path d="M12 4l8.5 4.5L12 13 3.5 8.5 12 4zM3.5 12.5L12 17l8.5-4.5M3.5 16.5L12 21l8.5-4.5" />,
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2.2" />
      <path d="M8 10.5V8a4 4 0 018 0v2.5" />
    </>
  ),
}

export function AtsIcon({ name, className }: { name: AtsIconName; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {P[name]}
    </svg>
  )
}

/** Kontrol durumu işareti — dolu daire içinde sembol. */
export function StatusIcon({ status, label }: { status: AtsStatus; label?: string }) {
  const glyph = status === 'pass' ? 'check' : status === 'fail' ? 'x' : status === 'warn' ? 'alert' : 'info'
  return (
    <span className="ats-status" data-status={status} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {status === 'warn' ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 9v4M12 16.5h.01" />
        </svg>
      ) : status === 'info' ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 11.5v5M12 7.5h.01" />
        </svg>
      ) : (
        <AtsIcon name={glyph} />
      )}
    </span>
  )
}
