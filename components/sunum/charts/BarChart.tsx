/**
 * Sütun grafiği — tek seri, bağımlılıksız SVG.
 *
 * Tasarım kararları:
 *  · Tek ölçek/tek eksen. İkinci bir y ekseni asla eklenmez.
 *  · Değer ETİKETLERİ sütunların üstünde durur; bu yüzden sayısal eksen ve ızgara
 *    çizilmez (aynı bilgiyi iki kez göstermek slaytta gürültüdür).
 *  · Tek seri olduğu için renk kimlik taşımaz: tüm sütunlar tema vurgusundadır,
 *    kategori adı x ekseninde yazılıdır (kimlik yalnızca renge bırakılmaz).
 *  · Sütun üstleri 4 px yuvarlatılır, taban çizgisine oturur.
 */

import type { ChartPoint } from '@/lib/sunum/types'

type Props = {
  points: ChartPoint[]
  width: number
  height: number
  color: string
  /** Değeri birimiyle birlikte yazan biçimleyici (bkz. parts.tsx → formatMeasure). */
  format: (n: number) => string
}

const PAD = { top: 32, right: 10, bottom: 40, left: 10 }
const RADIUS = 4

/** Üstü yuvarlatılmış, tabana oturan sütun yolu. */
function barPath(x: number, y: number, w: number, h: number): string {
  if (h <= RADIUS) return `M${x} ${y + h} h${w} v${-h} h${-w} Z`
  const r = Math.min(RADIUS, w / 2)
  return `M${x} ${y + h} V${y + r} a${r} ${r} 0 0 1 ${r} ${-r} h${w - 2 * r} a${r} ${r} 0 0 1 ${r} ${r} V${y + h} Z`
}

export default function BarChart({ points, width, height, color, format }: Props) {
  if (points.length === 0) return null

  const plotW = width - PAD.left - PAD.right
  const plotH = height - PAD.top - PAD.bottom
  const values = points.map((p) => p.value)
  const max = Math.max(0, ...values)
  const min = Math.min(0, ...values)
  const span = max - min || 1
  // Sıfır çizgisinin dikey konumu: tüm değerler pozitifse tabandır.
  const zeroY = PAD.top + plotH * (max / span)

  const slot = plotW / points.length
  const barW = Math.max(12, Math.min(96, slot * 0.58))

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="presentation">
      <line x1={PAD.left} y1={zeroY} x2={width - PAD.right} y2={zeroY} className="sn-axis" />
      {points.map((p, i) => {
        const cx = PAD.left + slot * i + slot / 2
        const h = (Math.abs(p.value) / span) * plotH
        const y = p.value >= 0 ? zeroY - h : zeroY
        return (
          <g key={i}>
            <path className="sn-bar" d={barPath(cx - barW / 2, y, barW, h)} fill={color} />
            <text
              x={cx}
              y={p.value >= 0 ? y - 10 : y + h + 20}
              textAnchor="middle"
              className="sn-value-label"
            >
              {format(p.value)}
            </text>
            <text x={cx} y={height - PAD.bottom + 24} textAnchor="middle" className="sn-tick">
              {p.label.length > 14 ? p.label.slice(0, 13) + '…' : p.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
