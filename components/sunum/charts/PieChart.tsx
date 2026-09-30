/**
 * Pasta / halka grafiği — bağımlılıksız SVG.
 *
 *  · Kategorik kimlik taşıdığı için doğrulanmış seri paleti kullanılır
 *    (bkz. lib/sunum/themes.ts → CHART_SERIES); renkler sırayla atanır, döngüye girmez.
 *  · Dilimler arasında 2 px zemin rengi boşluk bırakılır — komşu renkler birbirine
 *    yapışmaz, renk körlüğünde de ayrım korunur.
 *  · %8'den büyük dilimlere yüzde etiketi basılır; küçük dilimler sağdaki
 *    açıklama listesinde adıyla ve değeriyle yazılır (kimlik renge bırakılmaz).
 */

import type { ChartPoint } from '@/lib/sunum/types'

type Props = {
  points: ChartPoint[]
  size: number
  colors: readonly string[]
  surface: string
  /** 0 → pasta, 0.55 → halka. */
  hole?: number
}

function arcPath(cx: number, cy: number, r: number, inner: number, from: number, to: number): string {
  const large = to - from > Math.PI ? 1 : 0
  const x1 = cx + r * Math.cos(from)
  const y1 = cy + r * Math.sin(from)
  const x2 = cx + r * Math.cos(to)
  const y2 = cy + r * Math.sin(to)
  if (inner <= 0) {
    return `M${cx} ${cy} L${x1} ${y1} A${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`
  }
  const ix2 = cx + inner * Math.cos(to)
  const iy2 = cy + inner * Math.sin(to)
  const ix1 = cx + inner * Math.cos(from)
  const iy1 = cy + inner * Math.sin(from)
  return `M${x1} ${y1} A${r} ${r} 0 ${large} 1 ${x2} ${y2} L${ix2} ${iy2} A${inner} ${inner} 0 ${large} 0 ${ix1} ${iy1} Z`
}

export default function PieChart({ points, size, colors, surface, hole = 0 }: Props) {
  const total = points.reduce((sum, p) => sum + Math.max(0, p.value), 0)
  if (total <= 0) return null

  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 6
  const inner = hole > 0 ? r * hole : 0
  let angle = -Math.PI / 2

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="presentation">
      {points.map((p, i) => {
        const share = Math.max(0, p.value) / total
        const from = angle
        const to = angle + share * Math.PI * 2
        angle = to
        const mid = (from + to) / 2
        const labelR = inner > 0 ? (r + inner) / 2 : r * 0.64
        return (
          <g key={i}>
            <path
              className="sn-slice"
              d={arcPath(cx, cy, r, inner, from, to)}
              fill={colors[i % colors.length]}
              stroke={surface}
              strokeWidth={2}
            />
            {share >= 0.08 ? (
              <text
                x={cx + labelR * Math.cos(mid)}
                y={cy + labelR * Math.sin(mid) + 5}
                textAnchor="middle"
                className="sn-slice-label"
              >
                {Math.round(share * 100)}%
              </text>
            ) : null}
          </g>
        )
      })}
    </svg>
  )
}
