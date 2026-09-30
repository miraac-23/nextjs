import type { ProcessStep, ProcessSlide as Model } from '@/lib/sunum/types'
import { BOX_BORDER, CONTENT_W, SlideHead, bodyHeight, compactClass, textHeight } from './parts'
import type { SlideProps } from './types'

/** Ok işareti — ayrı bir ikon paketi eklemek yerine satır içi SVG. */
function Arrow() {
  return (
    <div className="sn-arrow" aria-hidden="true">
      <svg width="26" height="20" viewBox="0 0 26 20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 10h20M16 4l6 6-6 6" />
      </svg>
    </div>
  )
}

/**
 * Süreç akışı.
 *  process-01 → yatay zincir (5 adıma kadar; fazlası dikeye düşer).
 *  process-02 → numaralı dikey adımlar; 6'dan fazla adım iki kolona bölünür.
 *  process-03 → dairesel döngü (kapanan süreçler için); 6'dan fazla adımda
 *               okunurluk kalmadığı için numaralı dikey düzene döner.
 *
 * Dikey listenin iki kolona bölünmesi bilinçli: 8 adımı tek kolonda tutmak
 * puntoyu 11px'e indiriyor ya da slayttan taşırıyordu; iki kolon aynı adımları
 * okunur puntoda gösteriyor.
 */

/** Yatay zincir kademeleri — CSS `.sn-process-h` değerleriyle aynı olmalı. */
const H_TIERS = [
  { padY: 24, padX: 20, gap: 12, num: 15, title: 19, tlh: 1.3, desc: 14, dlh: 1.4, arrow: 44 },
  { padY: 18, padX: 16, gap: 9, num: 14, title: 17, tlh: 1.28, desc: 13, dlh: 1.35, arrow: 34 },
  { padY: 13, padX: 13, gap: 7, num: 13, title: 15, tlh: 1.26, desc: 12, dlh: 1.3, arrow: 28 },
  { padY: 10, padX: 11, gap: 5, num: 12, title: 14, tlh: 1.24, desc: 11, dlh: 1.28, arrow: 24 },
]

/** Dikey adım kademeleri — CSS `.sn-process-v` değerleriyle aynı olmalı. */
const V_TIERS = [
  { padY: 16, padX: 22, badge: 40, gap: 18, title: 18, tlh: 1.3, desc: 14, dlh: 1.4, row: 12 },
  { padY: 12, padX: 18, badge: 34, gap: 14, title: 16, tlh: 1.28, desc: 13, dlh: 1.35, row: 9 },
  { padY: 9, padX: 15, badge: 29, gap: 12, title: 15, tlh: 1.26, desc: 12, dlh: 1.3, row: 7 },
  { padY: 7, padX: 12, badge: 25, gap: 10, title: 13, tlh: 1.24, desc: 11, dlh: 1.28, row: 5 },
]

function horizontalHeight(steps: ProcessStep[], tier: (typeof H_TIERS)[number]): number {
  const n = Math.max(steps.length, 1)
  const cardW = (CONTENT_W - tier.arrow * (n - 1)) / n
  const textW = Math.max(60, cardW - tier.padX * 2)
  let tallest = 0
  for (let i = 0; i < steps.length; i++) {
    let h = BOX_BORDER + tier.padY * 2 + Math.round(tier.num * 1.2) + tier.gap
    h += textHeight(steps[i].title, textW, tier.title, tier.tlh)
    const desc = steps[i].description
    if (desc) h += tier.gap + textHeight(desc, textW, tier.desc, tier.dlh)
    if (h > tallest) tallest = h
  }
  return tallest
}

function verticalHeight(
  steps: ProcessStep[],
  columns: number,
  tier: (typeof V_TIERS)[number],
): number {
  const colW = (CONTENT_W - (columns - 1) * 16) / columns
  const textW = Math.max(80, colW - tier.padX * 2 - tier.badge - tier.gap)
  const rows = Math.ceil(steps.length / columns)
  let total = tier.row * Math.max(0, rows - 1)
  for (let r = 0; r < rows; r++) {
    let tallest = 0
    for (let c = 0; c < columns; c++) {
      // Kolonlu düzende adımlar sütun sütun değil satır satır dizilir.
      const step = steps[r * columns + c]
      if (!step) continue
      let text = textHeight(step.title, textW, tier.title, tier.tlh)
      if (step.description) text += 4 + textHeight(step.description, textW, tier.desc, tier.dlh)
      const h = BOX_BORDER + tier.padY * 2 + Math.max(tier.badge, text)
      if (h > tallest) tallest = h
    }
    total += tallest
  }
  return total
}

/* ------------------------------ dairesel döngü ------------------------------ */

/** Döngü halkasının yatay yarıçapı — kartlar 1136px kutudan taşmasın diye sabit. */
const CYCLE_RX = 330
/** Döngü kartının genişliği ve metin sütunu (CSS `.sn-cycle-step` ile aynı). */
const CYCLE_CARD_W = 212
const CYCLE_TEXT_W = CYCLE_CARD_W - 32 - 30 - 12

/**
 * Kartlar halkanın ÜSTÜNE ortalanır; bu yüzden halkanın dikey yarıçapı, kart
 * yüksekliğinin yarısı kadar içeri çekilmeli. Sabit bir kart yüksekliği
 * varsaymak alttaki adımın kırpılmasına yol açıyordu — en uzun başlık ölçülür.
 */
function cycleCardHeight(steps: ProcessStep[], withDesc: boolean): number {
  let tallest = 30
  for (let i = 0; i < steps.length; i++) {
    let h = textHeight(steps[i].title, CYCLE_TEXT_W, 15, 1.28)
    const desc = steps[i].description
    if (withDesc && desc) h += 3 + textHeight(desc, CYCLE_TEXT_W, 12, 1.3)
    if (h > tallest) tallest = h
  }
  return tallest + 24 + BOX_BORDER
}

export default function ProcessSlide({ slide }: SlideProps<Model>) {
  const steps = slide.content.steps
  const available = bodyHeight(slide)

  /* ----------------------------- process-03: döngü ----------------------------- */
  if (slide.template === 'process-03' && steps.length >= 3 && steps.length <= 6) {
    // Az adımlı döngülerde açıklama da sığar; 5+ adımda yalnızca başlık kalır.
    const withDesc = steps.length <= 4
    const cardH = cycleCardHeight(steps, withDesc)
    const ringH = Math.max(cardH + 120, Math.min(available, 400))
    const ry = Math.max(60, (ringH - cardH) / 2)
    return (
      <>
        <SlideHead slide={slide} />
        <div className="sn-body">
          <div className="sn-cycle" style={{ height: ringH }}>
            <span
              className="sn-cycle-ring"
              aria-hidden="true"
              style={{ width: CYCLE_RX * 2, height: ry * 2 }}
            />
            {steps.map((step, i) => {
              // Döngü tepeden başlar ve saat yönünde ilerler.
              const angle = (-90 + (360 / steps.length) * i) * (Math.PI / 180)
              return (
                <div
                  className="sn-cycle-step"
                  key={i}
                  style={{
                    left: `calc(50% + ${Math.round(Math.cos(angle) * CYCLE_RX)}px)`,
                    top: `calc(50% + ${Math.round(Math.sin(angle) * ry)}px)`,
                  }}
                >
                  <span className="sn-step-badge">{i + 1}</span>
                  <div>
                    <div className="sn-step-title">{step.title}</div>
                    {withDesc && step.description ? (
                      <div className="sn-step-desc">{step.description}</div>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </>
    )
  }

  const vertical =
    slide.template === 'process-02' || slide.template === 'process-03' || steps.length > 5

  if (vertical) {
    // 6'dan fazla adımda tek kolon puntoyu okunmaz hâle getiriyor.
    const columns = steps.length > 6 ? 2 : 1
    const tier = compactClass(
      V_TIERS.map((t) => verticalHeight(steps, columns, t)),
      available,
    )
    return (
      <>
        <SlideHead slide={slide} />
        <div className="sn-body">
          <div className={`sn-process-v${columns > 1 ? ' sn-process-cols' : ''}${tier}`}>
            {steps.map((step, i) => (
              <div className="sn-step-row" key={i}>
                <span className="sn-step-badge">{i + 1}</span>
                <div>
                  <div className="sn-step-title">{step.title}</div>
                  {step.description ? <div className="sn-step-desc">{step.description}</div> : null}
                </div>
              </div>
            ))}
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
        <div className={`sn-process-h${tier}`}>
          {steps.map((step, i) => (
            <div className="sn-step-slot" key={i}>
              <div className="sn-step-card">
                <span className="sn-step-num">{String(i + 1).padStart(2, '0')}</span>
                <div className="sn-step-title">{step.title}</div>
                {step.description ? <div className="sn-step-desc">{step.description}</div> : null}
              </div>
              {i < steps.length - 1 ? <Arrow /> : null}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
