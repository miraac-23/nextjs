import { MAX_CHART_SLICES, seriesOf } from '@/lib/sunum/themes'
import type { ChartPoint, ChartSlide as Model } from '@/lib/sunum/types'
import BarChart from '../charts/BarChart'
import LineChart from '../charts/LineChart'
import PieChart from '../charts/PieChart'
import { CONTENT_W, SlideHead, bodyHeight, compactClass, formatMeasure, textHeight } from './parts'
import type { SlideProps } from './types'

/**
 * Grafik slaytı. Grafikler React/SVG olarak üretilir (§7): ücretsiz, anında
 * render edilir ve PPTX tarafında da aynı veriden PowerPoint grafiği çıkar.
 *
 * Kategori sayısı sınırlıdır: pasta/halka grafikte 6'dan fazla dilim okunmaz,
 * fazlası "Diğer" altında toplanır — renk paleti döngüye sokulmaz.
 *
 * Varyantlar:
 *  chart-01 → tam genişlik grafik + açıklama.
 *  chart-02 → solda grafik, sağda değer listesi.
 *  chart-03 → küçük grafik, yanında büyük çıkarım cümlesi.
 *
 * Grafik yüksekliği ARTIK SABİT DEĞİL: başlık, açıklama ve alt bantlardan
 * geriye kalan alandan türetilir. Sabit 372px, örnek + vurgu bandı olan
 * slaytlarda bantların üstüne biniyordu.
 */

/** Grafiğin alabileceği en büyük / en küçük yükseklik. */
const PLOT_MAX = 372
const PLOT_MIN = 168
/** chart-02'de grafiğe ayrılan genişlik. */
const ANNOTATED_W = 660
/** chart-03'te grafiğe ayrılan genişlik. */
const TAKEAWAY_W = 520

const OTHER_LABEL = { tr: 'Diğer', en: 'Other' } as const

/** Değer listesi kademeleri — CSS `.sn-chart-values` değerleriyle aynı olmalı. */
const VALUE_TIERS = [
  { size: 17, lh: 1.4, gap: 12 },
  { size: 15, lh: 1.35, gap: 8 },
  { size: 13, lh: 1.3, gap: 5 },
]

/** Dilim sayısını sınırlar; artanları tek kalemde toplar. */
function foldSlices(points: ChartPoint[], lang: 'tr' | 'en'): ChartPoint[] {
  if (points.length <= MAX_CHART_SLICES) return points
  const head = points.slice(0, MAX_CHART_SLICES - 1)
  const rest = points.slice(MAX_CHART_SLICES - 1)
  const sum = rest.reduce((total, p) => total + Math.max(0, p.value), 0)
  return head.concat([{ label: OTHER_LABEL[lang], value: sum }])
}

function valuesHeight(count: number, tier: (typeof VALUE_TIERS)[number]): number {
  return count * Math.round(tier.size * tier.lh) + Math.max(0, count - 1) * tier.gap
}

export default function ChartSlide({ slide, theme, lang }: SlideProps<Model>) {
  const { chartType, unit, caption } = slide.content
  const circular = chartType === 'pie' || chartType === 'donut'
  const points = circular ? foldSlices(slide.content.points, lang) : slide.content.points
  const series = seriesOf(theme)
  const format = (n: number) => formatMeasure(n, unit, lang)
  const takeaway = slide.template === 'chart-03'
  // Pasta/halka her zaman açıklama listesiyle gelir; sütun/çizgi yalnızca chart-02'de.
  const annotated = circular || slide.template === 'chart-02' || takeaway
  const total = points.reduce((sum, p) => sum + Math.max(0, p.value), 0)

  const available = bodyHeight(slide)
  // chart-03'te açıklama grafiğin YANINDA, altında değil; gövdeden düşülmez.
  const captionH = caption && !takeaway ? 14 + textHeight(caption, CONTENT_W, 14, 1.4) : 0
  const plotH = Math.max(PLOT_MIN, Math.min(PLOT_MAX, available - captionH))

  const plotW = takeaway ? TAKEAWAY_W : annotated ? ANNOTATED_W : CONTENT_W
  const circleSize = Math.min(plotH, takeaway ? 300 : 340)

  const plot = circular ? (
    <PieChart
      points={points}
      size={circleSize}
      colors={series}
      surface={theme.bg}
      hole={chartType === 'donut' ? 0.55 : 0}
    />
  ) : chartType === 'line' ? (
    <LineChart
      points={points}
      width={plotW}
      height={plotH}
      color={theme.accent}
      surface={theme.bg}
      format={format}
    />
  ) : (
    <BarChart points={points} width={plotW} height={plotH} color={theme.accent} format={format} />
  )

  const valueTier = compactClass(
    VALUE_TIERS.map((t) => valuesHeight(points.length, t)),
    takeaway ? Math.max(90, available - 140) : available - captionH,
  )

  const values = (
    <ul className={`sn-chart-values${valueTier}`}>
      {points.map((p, i) => (
        <li key={i}>
          {circular ? (
            <span className="sn-chart-swatch" style={{ background: series[i % series.length] }} />
          ) : null}
          <span>{p.label}</span>
          <b>
            {format(p.value)}
            {/* Birim zaten yüzdeyse payı ikinci kez yazmak tekrar olur. */}
            {circular && total > 0 && unit !== '%'
              ? ` · ${formatMeasure(Math.round((Math.max(0, p.value) / total) * 100), '%', lang)}`
              : ''}
          </b>
        </li>
      ))}
    </ul>
  )

  /* --------------------------- chart-03: büyük çıkarım --------------------------- */
  if (takeaway) {
    // Çıkarım cümlesi slaytın asıl mesajı: grafik küçülür, cümle büyür.
    const size = caption ? (caption.length > 150 ? 20 : caption.length > 90 ? 24 : 28) : 24
    return (
      <>
        <SlideHead slide={slide} />
        <div className="sn-body">
          <div className="sn-chart-takeaway">
            <div className="sn-chart-takeaway-plot">{plot}</div>
            <div className="sn-chart-takeaway-note">
              {caption ? (
                <p className="sn-takeaway-text" style={{ fontSize: size }}>
                  {caption}
                </p>
              ) : null}
              {values}
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <SlideHead slide={slide} />
      <div className="sn-body">
        <div
          className="sn-chart-wrap"
          style={{
            gridTemplateColumns: annotated
              ? `minmax(0, ${circular ? circleSize + 20 : ANNOTATED_W}px) minmax(0, 1fr)`
              : 'minmax(0, 1fr)',
            justifyItems: circular ? 'center' : 'stretch',
          }}
        >
          {plot}
          {annotated ? values : null}
        </div>
        {caption ? <p className="sn-caption">{caption}</p> : null}
      </div>
    </>
  )
}
