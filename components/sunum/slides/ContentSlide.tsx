import type { ContentSlide as Model } from '@/lib/sunum/types'
import type { SlideProps } from './types'
import {
  BOX_BORDER,
  Bullets,
  CONTENT_W,
  SlideHead,
  bodyHeight,
  bulletClassMulti,
  compactClass,
  textHeight,
} from './parts'

/**
 * İçerik slaytı — beş yerleşim.
 *  content-01 → madde listesi.
 *  content-02 → numaralı kart ızgarası.
 *  content-03 → maddeler iki kolona bölünür (uzun listeler için).
 *  content-04 → ilk madde büyük bir panelde, kalanlar yanında destekleyici.
 *  content-05 → rozetli kontrol listesi satırları.
 *
 * Hepsi ortak kuralı paylaşır: kullanılabilir yükseklik `bodyHeight(slide)`
 * ile ÖNCEDEN hesaplanır ve punto ona göre seçilir. Böylece 8 uzun madde +
 * örnek bandı + vurgu bandı bir arada olduğunda bile taşma olmuyor.
 */

/** Kart ızgarasının kademeleri — CSS `.sn-cards` değerleriyle aynı olmalı. */
const CARD_TIERS = [
  { padY: 26, padX: 28, gap: 10, num: 15, size: 19, lh: 1.4, grid: 18 },
  { padY: 18, padX: 22, gap: 8, num: 14, size: 16, lh: 1.38, grid: 14 },
  { padY: 13, padX: 18, gap: 6, num: 13, size: 14, lh: 1.35, grid: 10 },
]

/** Kart sayısına göre kolon adedi: 4 kart 2×2, 5–6 kart 3×2 daha dengeli durur. */
function cardColumns(count: number): number {
  if (count <= 2) return Math.max(count, 1)
  if (count === 4) return 2
  return 3
}

function cardsHeight(items: string[], columns: number, tier: (typeof CARD_TIERS)[number]): number {
  const colW = (CONTENT_W - tier.grid * (columns - 1)) / columns
  const textW = colW - tier.padX * 2
  const rows = Math.ceil(items.length / columns)
  let total = tier.grid * Math.max(0, rows - 1)
  for (let r = 0; r < rows; r++) {
    let tallest = 0
    for (let c = 0; c < columns; c++) {
      const item = items[r * columns + c]
      if (item === undefined) continue
      const h =
        BOX_BORDER +
        tier.padY * 2 +
        Math.round(tier.num * 1.2) +
        tier.gap +
        textHeight(item, textW, tier.size, tier.lh)
      if (h > tallest) tallest = h
    }
    total += tallest
  }
  return total
}

/** Kontrol listesi kademeleri — CSS `.sn-check-list` değerleriyle aynı olmalı. */
const CHECK_TIERS = [
  { padY: 14, size: 19, lh: 1.4, gap: 12, badge: 36 },
  { padY: 11, size: 17, lh: 1.38, gap: 9, badge: 30 },
  { padY: 8, size: 15, lh: 1.35, gap: 7, badge: 26 },
  { padY: 5, size: 13, lh: 1.3, gap: 5, badge: 22 },
]

function checkHeight(items: string[], tier: (typeof CHECK_TIERS)[number]): number {
  const textW = CONTENT_W - 44 - tier.badge - 16
  let total = tier.gap * Math.max(0, items.length - 1)
  for (let i = 0; i < items.length; i++) {
    const text = textHeight(items[i], textW, tier.size, tier.lh)
    total += BOX_BORDER + tier.padY * 2 + Math.max(tier.badge, text)
  }
  return total
}

export default function ContentSlide({ slide }: SlideProps<Model>) {
  const bullets = slide.content.bullets
  const available = bodyHeight(slide)

  if (bullets.length === 0) {
    return (
      <>
        <SlideHead slide={slide} />
        <div className="sn-body" />
      </>
    )
  }

  /* ------------------------------ content-02: kartlar ------------------------------ */
  if (slide.template === 'content-02') {
    const columns = cardColumns(bullets.length)
    const tier = compactClass(
      CARD_TIERS.map((t) => cardsHeight(bullets, columns, t)),
      available,
    )
    return (
      <>
        <SlideHead slide={slide} />
        <div className="sn-body">
          <div
            className={`sn-cards${tier}`}
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {bullets.map((text, i) => (
              <section className="sn-card" key={i}>
                <span className="sn-step-num">{String(i + 1).padStart(2, '0')}</span>
                <p className="sn-card-text">{text}</p>
              </section>
            ))}
          </div>
        </div>
      </>
    )
  }

  /* --------------------------- content-03: iki kolon madde --------------------------- */
  if (slide.template === 'content-03') {
    // Sol sütun bir fazla alır: göz soldan sağa okuduğu için dolu-boş dengesi orada iyi durur.
    const cut = Math.ceil(bullets.length / 2)
    const left = bullets.slice(0, cut)
    const right = bullets.slice(cut)
    const colW = (CONTENT_W - 44) / 2
    const cls = bulletClassMulti([left, right], colW, available)
    return (
      <>
        <SlideHead slide={slide} />
        <div className="sn-body">
          <div className="sn-bullet-cols">
            <ul className={`sn-bullets${cls}`}>
              {left.map((text, i) => (
                <li key={i}>{text}</li>
              ))}
            </ul>
            {right.length > 0 ? (
              <ul className={`sn-bullets${cls}`}>
                {right.map((text, i) => (
                  <li key={i}>{text}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </>
    )
  }

  /* --------------------------- content-04: öne çıkan madde --------------------------- */
  if (slide.template === 'content-04' && bullets.length > 1) {
    const lead = bullets[0]
    const rest = bullets.slice(1)
    const leadW = 430
    // Öne çıkan maddenin puntosu da uzunluğuna göre iner; panel kutusu sabit.
    const leadSizes = [30, 25, 21, 18]
    let leadSize = leadSizes[leadSizes.length - 1]
    for (let i = 0; i < leadSizes.length; i++) {
      if (textHeight(lead, leadW - 56, leadSizes[i], 1.3) <= available - 90) {
        leadSize = leadSizes[i]
        break
      }
    }
    return (
      <>
        <SlideHead slide={slide} />
        <div className="sn-body">
          <div className="sn-lead">
            <section className="sn-lead-main">
              <span className="sn-step-num">01</span>
              <p className="sn-lead-text" style={{ fontSize: leadSize }}>
                {lead}
              </p>
            </section>
            <Bullets items={rest} width={CONTENT_W - leadW - 26} available={available} />
          </div>
        </div>
      </>
    )
  }

  /* --------------------------- content-05: işaretli liste --------------------------- */
  if (slide.template === 'content-05') {
    const tier = compactClass(
      CHECK_TIERS.map((t) => checkHeight(bullets, t)),
      available,
    )
    return (
      <>
        <SlideHead slide={slide} />
        <div className="sn-body">
          <div className={`sn-check-list${tier}`}>
            {bullets.map((text, i) => (
              <div className="sn-check-row" key={i}>
                <span className="sn-check-badge" aria-hidden="true">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 10.5l4 4 8-9" />
                  </svg>
                </span>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </>
    )
  }

  /* ------------------------------ content-01: maddeler ------------------------------ */
  return (
    <>
      <SlideHead slide={slide} />
      <div className="sn-body">
        <Bullets items={bullets} available={available} />
      </div>
    </>
  )
}
