import type { TimelineStep, TimelineSlide as Model } from '@/lib/sunum/types'
import { BOX_BORDER, CONTENT_W, SlideHead, bodyHeight, compactClass, textHeight } from './parts'
import type { SlideProps } from './types'

/**
 * Zaman çizelgesi.
 *  timeline-01 → yatay şerit (5 adıma kadar okunur; fazlası dikeye düşer).
 *  timeline-02 → dikey raylı liste.
 *  timeline-03 → dönem başlıklı kart sütunları (rayı olmayan, ızgara düzeni).
 *
 * Yatay varyantın otomatik dikeye düşmesi korunuyor: kullanıcı şablon
 * değiştirmek zorunda kalmasın. Yeni olan, her varyantın kalan yüksekliğe göre
 * punto kademesi seçmesi — 8 açıklamalı dönem eskiden slayttan taşıyordu.
 */

/** Yatay şerit kademeleri — CSS `.sn-timeline-h` değerleriyle aynı olmalı. */
const H_TIERS = [
  { label: 56, dot: 48, title: 18, tlh: 1.35, desc: 14, dlh: 1.4, descGap: 8 },
  { label: 44, dot: 38, title: 16, tlh: 1.3, desc: 13, dlh: 1.35, descGap: 6 },
  { label: 36, dot: 30, title: 14, tlh: 1.28, desc: 12, dlh: 1.3, descGap: 5 },
  { label: 30, dot: 24, title: 13, tlh: 1.25, desc: 11, dlh: 1.28, descGap: 4 },
]

/** Dikey ray kademeleri — CSS `.sn-timeline-v` değerleriyle aynı olmalı. */
const V_TIERS = [
  { title: 18, tlh: 1.35, desc: 14, dlh: 1.4, descGap: 8, pad: 18 },
  { title: 16, tlh: 1.3, desc: 13, dlh: 1.35, descGap: 6, pad: 12 },
  { title: 14, tlh: 1.28, desc: 12, dlh: 1.3, descGap: 5, pad: 8 },
  { title: 13, tlh: 1.25, desc: 11, dlh: 1.28, descGap: 4, pad: 5 },
]

/** Kart sütunu kademeleri — CSS `.sn-tl-cards` değerleriyle aynı olmalı. */
const CARD_TIERS = [
  { padY: 20, padX: 20, chip: 15, title: 18, tlh: 1.35, desc: 14, dlh: 1.4, gap: 10, grid: 16 },
  { padY: 15, padX: 16, chip: 14, title: 16, tlh: 1.3, desc: 13, dlh: 1.35, gap: 8, grid: 12 },
  { padY: 11, padX: 13, chip: 13, title: 14, tlh: 1.28, desc: 12, dlh: 1.3, gap: 6, grid: 9 },
  { padY: 8, padX: 11, chip: 12, title: 13, tlh: 1.25, desc: 11, dlh: 1.28, gap: 5, grid: 7 },
]

function horizontalHeight(steps: TimelineStep[], tier: (typeof H_TIERS)[number]): number {
  const colW = CONTENT_W / Math.max(steps.length, 1) - 20
  let tallest = 0
  for (let i = 0; i < steps.length; i++) {
    let h = textHeight(steps[i].title, colW, tier.title, tier.tlh)
    const desc = steps[i].description
    if (desc) h += tier.descGap + textHeight(desc, colW, tier.desc, tier.dlh)
    if (h > tallest) tallest = h
  }
  // 8px üst boşluk + dönem etiketi + nokta kuşağı.
  return 8 + tier.label + tier.dot + tallest
}

function verticalHeight(steps: TimelineStep[], tier: (typeof V_TIERS)[number]): number {
  // 120px dönem sütunu + 28px ray + 2 × 16px boşluk düşülür.
  const textW = CONTENT_W - 180
  let total = 0
  for (let i = 0; i < steps.length; i++) {
    let h = textHeight(steps[i].title, textW, tier.title, tier.tlh)
    const desc = steps[i].description
    if (desc) h += tier.descGap + textHeight(desc, textW, tier.desc, tier.dlh)
    total += h + (i < steps.length - 1 ? tier.pad : 0)
  }
  return total
}

function cardsHeight(
  steps: TimelineStep[],
  columns: number,
  tier: (typeof CARD_TIERS)[number],
): number {
  const colW = (CONTENT_W - tier.grid * (columns - 1)) / columns
  const textW = Math.max(80, colW - tier.padX * 2)
  const rows = Math.ceil(steps.length / columns)
  let total = tier.grid * Math.max(0, rows - 1)
  for (let r = 0; r < rows; r++) {
    let tallest = 0
    for (let c = 0; c < columns; c++) {
      const step = steps[r * columns + c]
      if (!step) continue
      // Kartın üst kenarlığı 3px (vurgu şeridi), yanları 1px.
      let h = BOX_BORDER + 2 + tier.padY * 2 + Math.round(tier.chip * 1.9) + tier.gap
      h += textHeight(step.title, textW, tier.title, tier.tlh)
      if (step.description) h += tier.gap + textHeight(step.description, textW, tier.desc, tier.dlh)
      if (h > tallest) tallest = h
    }
    total += tallest
  }
  return total
}

export default function TimelineSlide({ slide }: SlideProps<Model>) {
  const steps = slide.content.steps
  const available = bodyHeight(slide)

  /* --------------------------- timeline-03: dönem kartları --------------------------- */
  if (slide.template === 'timeline-03' && steps.length > 0) {
    const columns = steps.length <= 3 ? Math.max(steps.length, 1) : steps.length <= 8 ? 4 : 5
    const tier = compactClass(
      CARD_TIERS.map((t) => cardsHeight(steps, columns, t)),
      available,
    )
    return (
      <>
        <SlideHead slide={slide} />
        <div className="sn-body">
          <div
            className={`sn-tl-cards${tier}`}
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {steps.map((step, i) => (
              <div className="sn-tl-card" key={i}>
                <span className="sn-tl-chip">{step.label}</span>
                <div className="sn-tl-title">{step.title}</div>
                {step.description ? <div className="sn-tl-desc">{step.description}</div> : null}
              </div>
            ))}
          </div>
        </div>
      </>
    )
  }

  const vertical = slide.template === 'timeline-02' || steps.length > 5

  if (vertical) {
    const tier = compactClass(
      V_TIERS.map((t) => verticalHeight(steps, t)),
      available,
    )
    return (
      <>
        <SlideHead slide={slide} />
        <div className="sn-body">
          <div className="sn-timeline">
            <div className={`sn-timeline-v${tier}`}>
              {steps.map((step, i) => (
                <div className="sn-tl-row" key={i}>
                  <div className="sn-tl-when">{step.label}</div>
                  <div className="sn-tl-rail">
                    <span />
                  </div>
                  <div>
                    <div className="sn-tl-title">{step.title}</div>
                    {step.description ? <div className="sn-tl-desc">{step.description}</div> : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </>
    )
  }

  const tier = compactClass(
    H_TIERS.map((t) => horizontalHeight(steps, t)),
    available,
  )

  return (
    <>
      <SlideHead slide={slide} />
      <div className="sn-body">
        <div className="sn-timeline">
          <div
            className={`sn-timeline-h${tier}`}
            style={{ gridTemplateColumns: `repeat(${Math.max(steps.length, 1)}, minmax(0, 1fr))` }}
          >
            {steps.map((step, i) => (
              <div className="sn-tl-col" key={i}>
                <div className="sn-tl-label">{step.label}</div>
                <div className="sn-tl-dot" />
                <div className="sn-tl-title">{step.title}</div>
                {step.description ? <div className="sn-tl-desc">{step.description}</div> : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
