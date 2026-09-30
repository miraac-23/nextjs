import type { StatItem, StatisticsSlide as Model } from '@/lib/sunum/types'
import CountUp from './CountUp'
import { BOX_BORDER, CONTENT_W, SlideHead, bodyHeight, compactClass, textHeight } from './parts'
import type { SlideProps } from './types'

/**
 * Büyük sayılar. Bir ölçüt tek başına bir "hero number"dır; grafik yerine
 * doğrudan sayı göstermek slaytta çoğu zaman daha okunur (bkz. §7).
 *  statistics-01 → yan yana şerit.
 *  statistics-02 → kart ızgarası.
 *  statistics-03 → solda tek dev sayı, sağda destekleyici ölçütler.
 *
 * Kart yüksekliği etiket ve alt açıklamanın kaç satır süreceğine bağlı; eskiden
 * sabit punto kullanıldığı için 6 ölçütlü bir ızgara 800px'e çıkıp slayttan
 * taşıyordu. Artık kademe ölçüyle seçiliyor.
 */

/** Kart kademeleri — CSS `.sn-stats` değerleriyle aynı olmalı. */
const STAT_TIERS = [
  { padY: 26, padX: 22, gap: 10, value: 54, label: 17, cap: 14, grid: 20 },
  { padY: 18, padX: 18, gap: 8, value: 40, label: 15, cap: 13, grid: 14 },
  { padY: 13, padX: 14, gap: 6, value: 31, label: 14, cap: 12, grid: 10 },
]

/** Uzun değerler (`sn-stat-long`) CSS'te küçülür; kestirim de aynı oranı kullanır. */
function valueHeight(stat: StatItem, size: number): number {
  return Math.round(size * (stat.value.length > 6 ? 0.7 : 1))
}

function statsHeight(
  stats: StatItem[],
  columns: number,
  tier: (typeof STAT_TIERS)[number],
): number {
  const colW = (CONTENT_W - tier.grid * (columns - 1)) / columns
  const textW = Math.max(90, colW - tier.padX * 2)
  const rows = Math.ceil(stats.length / columns)
  let total = tier.grid * Math.max(0, rows - 1)
  for (let r = 0; r < rows; r++) {
    let tallest = 0
    for (let c = 0; c < columns; c++) {
      const stat = stats[r * columns + c]
      if (!stat) continue
      let h = BOX_BORDER + tier.padY * 2 + valueHeight(stat, tier.value)
      h += tier.gap + textHeight(stat.label, textW, tier.label, 1.35)
      if (stat.caption) h += tier.gap + textHeight(stat.caption, textW, tier.cap, 1.4)
      if (h > tallest) tallest = h
    }
    total += tallest
  }
  return total
}

/** statistics-03 yan sütunu — CSS `.sn-stat-side` değerleriyle aynı olmalı. */
const SIDE_TIERS = [
  { padY: 12, value: 26, label: 15, cap: 13, gap: 12 },
  { padY: 9, value: 22, label: 14, cap: 12, gap: 9 },
  { padY: 7, value: 19, label: 13, cap: 11, gap: 7 },
]

function sideHeight(rest: StatItem[], tier: (typeof SIDE_TIERS)[number]): number {
  // Sütun genişliği gövdenin yarısı (32px boşluk) eksi değer sütunu ve dolgu.
  const textW = (CONTENT_W - 32) / 2 - 36 - 96 - 16
  let total = tier.gap * Math.max(0, rest.length - 1)
  for (let i = 0; i < rest.length; i++) {
    let text = textHeight(rest[i].label, textW, tier.label, 1.35)
    if (rest[i].caption) text += textHeight(rest[i].caption as string, textW, tier.cap, 1.4)
    total += BOX_BORDER + tier.padY * 2 + Math.max(Math.round(tier.value * 1.2), text)
  }
  return total
}

/** Şerit ve ızgara varyantlarının kolon adedi. */
function columnsFor(template: string, count: number): number {
  if (count <= 1) return 1
  if (template === 'statistics-02') {
    if (count <= 2) return count
    if (count <= 4) return 2
    return count <= 6 ? 3 : 4
  }
  if (count <= 4) return count
  return count <= 6 ? 3 : 4
}

export default function StatisticsSlide({ slide, animate }: SlideProps<Model>) {
  const { stats, footnote } = slide.content
  const available = bodyHeight(slide)
  // Dipnot gövdenin içinde; kartlara kalan alandan düşülmezse üstüne biner.
  const footH = footnote ? 16 + textHeight(footnote, CONTENT_W, 14, 1.4) : 0
  const gridAvail = Math.max(120, available - footH)

  /* ------------------------ statistics-03: tek dev sayı ------------------------ */
  if (slide.template === 'statistics-03' && stats.length > 0) {
    const hero = stats[0]
    const rest = stats.slice(1)
    // Dev sayının puntosu değerin uzunluğuna göre iner: "1.284.000" 96px'te taşar.
    const heroSize = hero.value.length > 9 ? 56 : hero.value.length > 6 ? 72 : 96
    const sideTier = compactClass(
      SIDE_TIERS.map((t) => sideHeight(rest, t)),
      gridAvail,
    )
    return (
      <>
        <SlideHead slide={slide} />
        <div className="sn-body">
          <div className="sn-stat-hero">
            <section className="sn-stat-hero-main">
              <div className="sn-stat-hero-value" style={{ fontSize: heroSize }}>
                <CountUp text={hero.value} active={animate} />
              </div>
              <div className="sn-stat-hero-label">{hero.label}</div>
              {hero.caption ? <div className="sn-stat-caption">{hero.caption}</div> : null}
            </section>
            {rest.length > 0 ? (
              <div className={`sn-stat-side${sideTier}`}>
                {rest.map((stat, i) => (
                  <div className="sn-stat-side-row" key={i}>
                    <b>{stat.value}</b>
                    <span>
                      {stat.label}
                      {stat.caption ? <em>{stat.caption}</em> : null}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          {footnote ? <p className="sn-footnote">{footnote}</p> : null}
        </div>
      </>
    )
  }

  const columns = columnsFor(slide.template, Math.max(stats.length, 1))
  const tier = compactClass(
    STAT_TIERS.map((t) => statsHeight(stats, columns, t)),
    gridAvail,
  )

  return (
    <>
      <SlideHead slide={slide} />
      <div className="sn-body">
        <div
          className={`sn-stats${tier}`}
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {stats.map((stat, i) => (
            <div className="sn-stat" key={i}>
              <div className={`sn-stat-value${stat.value.length > 6 ? ' sn-stat-long' : ''}`}>
                <CountUp text={stat.value} active={animate} />
              </div>
              <div className="sn-stat-label">{stat.label}</div>
              {stat.caption ? <div className="sn-stat-caption">{stat.caption}</div> : null}
            </div>
          ))}
        </div>
        {footnote ? <p className="sn-footnote">{footnote}</p> : null}
      </div>
    </>
  )
}
