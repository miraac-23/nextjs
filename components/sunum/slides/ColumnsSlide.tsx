import type { ComparisonSlide, TwoColumnSlide } from '@/lib/sunum/types'
import type { SlideProps } from './types'
import {
  BOX_BORDER,
  CONTENT_W,
  Panel,
  SlideHead,
  bodyHeight,
  bulletClassMulti,
  compactClass,
  textHeight,
} from './parts'

/**
 * İki sütun ve karşılaştırma aynı iskeleti paylaşır; fark sonuç (verdict)
 * satırı ve varyantların yerleşimi:
 *   two-column-01/02 → eşit iki panel (02'de sol panel vurgu renginde).
 *   two-column-03    → zeminsiz sütunlar, ortada dikey ayraç.
 *   comparison-01    → başlıklı iki panel + sonuç.
 *   comparison-02    → satır satır eşleştirme.
 *   comparison-03    → iki panel, ortada VS rozeti.
 *
 * Sütun maddelerinin puntosu artık sabit değil: panel iç genişliği (≈500px)
 * ve kalan yükseklik hesaplanıp ortak kademe seçiliyor. Eski `.sn-two
 * .sn-bullets li { font-size: 18px }` kuralı yoğunluk sınıflarını EZİYORDU,
 * bu yüzden 6 uzun maddeli sütunlar panelin dışına taşıyordu.
 */

/** Satır düzeni (comparison-02) kademeleri — CSS `.sn-compare-rows` ile aynı. */
const ROW_TIERS = [
  { padY: 14, padX: 18, size: 17, lh: 1.4, gap: 10, head: 18 },
  { padY: 11, padX: 15, size: 15, lh: 1.38, gap: 8, head: 16 },
  { padY: 8, padX: 12, size: 13, lh: 1.32, gap: 6, head: 14 },
  { padY: 6, padX: 10, size: 12, lh: 1.3, gap: 4, head: 13 },
]

function rowsHeight(
  left: string[],
  right: string[],
  tier: (typeof ROW_TIERS)[number],
  gapX: number,
): number {
  const rows = Math.max(left.length, right.length)
  const colW = (CONTENT_W - gapX) / 2
  const textW = colW - tier.padX * 2
  // Başlık satırı + aralarındaki boşluklar.
  let total = Math.round(tier.head * 1.3) + tier.gap * rows
  for (let i = 0; i < rows; i++) {
    const l = left[i] ? textHeight(left[i], textW, tier.size, tier.lh) : 0
    const r = right[i] ? textHeight(right[i], textW, tier.size, tier.lh) : 0
    total += BOX_BORDER + tier.padY * 2 + Math.max(l, r, Math.round(tier.size * tier.lh))
  }
  return total
}

export default function ColumnsSlide({ slide }: SlideProps<TwoColumnSlide | ComparisonSlide>) {
  const { left, right } = slide.content
  const verdict = slide.type === 'comparison' ? slide.content.verdict : undefined
  const available = bodyHeight(slide)
  // Sonuç satırı gövdenin İÇİNDE; sütunlara kalan alandan düşülmezse üstüne biner.
  const verdictH = verdict ? 18 + textHeight(verdict, CONTENT_W, 18, 1.4) : 0

  /* ------------------------- comparison-02: satır eşleştirme ------------------------- */
  if (slide.type === 'comparison' && slide.template === 'comparison-02') {
    const rows = Math.max(left.bullets.length, right.bullets.length)
    const tier = compactClass(
      ROW_TIERS.map((t) => rowsHeight(left.bullets, right.bullets, t, 16)),
      available - verdictH,
    )
    return (
      <>
        <SlideHead slide={slide} />
        <div className="sn-body">
          <div className={`sn-compare-rows${tier}`}>
            <div className="sn-compare-head">
              <span>{left.heading}</span>
              <span>{right.heading}</span>
            </div>
            {Array.from({ length: rows }).map((_, i) => (
              <div className="sn-compare-row" key={i}>
                <div>{left.bullets[i] ?? ''}</div>
                <div>{right.bullets[i] ?? ''}</div>
              </div>
            ))}
          </div>
          {verdict ? <p className="sn-verdict">{verdict}</p> : null}
        </div>
      </>
    )
  }

  const divided = slide.type === 'two-column' && slide.template === 'two-column-03'
  const versus = slide.type === 'comparison' && slide.template === 'comparison-03'
  const accentLeft = slide.type === 'two-column' && slide.template === 'two-column-02'

  // Sütun iç genişliği: zeminsiz varyantta panel dolgusu yok, ortada ayraç var.
  const gapX = versus ? 96 : divided ? 56 : 22
  const colW = (CONTENT_W - gapX) / 2
  const innerW = divided ? colW : colW - 56
  const headH = Math.max(
    left.heading ? textHeight(left.heading, innerW, 19, 1.3) : 0,
    right.heading ? textHeight(right.heading, innerW, 19, 1.3) : 0,
  )
  // Ayraçlı varyantta panel dolgusu yok ama başlığın altında 12px boşluk + 3px
  // çizgi var; panelli varyantta ise 26px × 2 dolgu ve 1px × 2 kenarlık.
  const chrome =
    (divided ? 0 : 52 + BOX_BORDER) + (headH > 0 ? headH + 16 + (divided ? 15 : 0) : 0)
  const listAvail = Math.max(80, available - verdictH - chrome)
  const cls = bulletClassMulti([left.bullets, right.bullets], innerW, listAvail)

  const list = (items: string[]) => (
    <ul className={`sn-bullets${cls}`}>
      {items.map((text, i) => (
        <li key={i}>{text}</li>
      ))}
    </ul>
  )

  return (
    <>
      <SlideHead slide={slide} />
      <div className="sn-body">
        <div className={`sn-two${divided ? ' sn-two-divided' : ''}${versus ? ' sn-two-versus' : ''}`}>
          <Panel heading={left.heading} accent={accentLeft} plain={divided}>
            {list(left.bullets)}
          </Panel>
          {versus ? (
            <span className="sn-vs" aria-hidden="true">
              VS
            </span>
          ) : null}
          <Panel heading={right.heading} plain={divided}>
            {list(right.bullets)}
          </Panel>
        </div>
        {verdict ? <p className="sn-verdict">{verdict}</p> : null}
      </div>
    </>
  )
}
