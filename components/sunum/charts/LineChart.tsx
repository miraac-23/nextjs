/**
 * Çizgi grafiği — tek seri, bağımlılıksız SVG.
 *
 *  · 2 px çizgi, 9 px işaretçi; işaretçilerin zemin renginde 2 px halkası var
 *    (üst üste binen noktalar birbirinden ayrılsın).
 *  · Etiketler SEÇİCİ basılır: 7'ye kadar tüm noktalar, üzerinde ilk/son/en yüksek.
 *    Her noktaya sayı yazmak çizgiyi okunmaz hâle getirir.
 *  · Eğri yumuşatma yok: yumuşatılmış çizgi olmayan ara değerleri var gibi gösterir.
 */

import type { ChartPoint } from '@/lib/sunum/types'

type Props = {
  points: ChartPoint[]
  width: number
  height: number
  color: string
  surface: string
  /** Değeri birimiyle birlikte yazan biçimleyici (bkz. parts.tsx → formatMeasure). */
  format: (n: number) => string
}

const PAD = { top: 34, right: 24, bottom: 40, left: 24 }

export default function LineChart({ points, width, height, color, surface, format }: Props) {
  if (points.length === 0) return null

  const plotW = width - PAD.left - PAD.right
  const plotH = height - PAD.top - PAD.bottom
  const values = points.map((p) => p.value)
  const max = Math.max(...values)
  const min = Math.min(...values)
  // Tek değerli/yatay seride sıfıra bölmeyi engelle, çizgi ortada dursun.
  const span = max - min || Math.abs(max) || 1
  const top = max + span * 0.12
  const bottom = min - span * 0.12
  const range = top - bottom || 1

  const xAt = (i: number) => PAD.left + (points.length === 1 ? plotW / 2 : (plotW * i) / (points.length - 1))
  const yAt = (v: number) => PAD.top + plotH * (1 - (v - bottom) / range)

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${xAt(i)} ${yAt(p.value)}`).join(' ')
  const maxIndex = values.indexOf(max)
  const labelled = (i: number) =>
    points.length <= 7 || i === 0 || i === points.length - 1 || i === maxIndex

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="presentation">
      <line x1={PAD.left} y1={height - PAD.bottom} x2={width - PAD.right} y2={height - PAD.bottom} className="sn-axis" />
      <path className="sn-line-path" d={path} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={xAt(i)} cy={yAt(p.value)} r={5.5} fill={color} stroke={surface} strokeWidth={2} />
          {labelled(i) ? (
            <text x={xAt(i)} y={yAt(p.value) - 14} textAnchor="middle" className="sn-value-label">
              {format(p.value)}
            </text>
          ) : null}
          <text x={xAt(i)} y={height - PAD.bottom + 24} textAnchor="middle" className="sn-tick">
            {p.label.length > 12 ? p.label.slice(0, 11) + '…' : p.label}
          </text>
        </g>
      ))}
    </svg>
  )
}
