import type { ImageSlide as Model } from '@/lib/sunum/types'
import SunumGlyph from '../SunumGlyph'
import {
  BOX_BORDER,
  Bullets,
  CONTENT_W,
  SlideHead,
  bodyHeight,
  compactClass,
  textHeight,
} from './parts'
import type { SlideProps } from './types'

/**
 * Görsel slaytı.
 *
 * MVP'de harici görsel üretimi yoktur (§7): görsel alanı ya kullanıcının
 * yüklediği (ve cihazında saklanan) resimle ya da tema renginde bir simge
 * yer tutucusuyla dolar. Yüklenen görsel yalnızca `data:` URL olarak kabul
 * edilir — şema harici adresleri reddeder, slayt dışarıya istek atmaz.
 *
 *  image-01 → solda görsel, sağda maddeler.
 *  image-02 → tam genişlik görsel + alt yazı.
 *  image-03 → üstte görsel şeridi, altında kart ızgarası (mozaik).
 */

/** Mozaik kartlarının kademeleri — CSS `.sn-mosaic` değerleriyle aynı olmalı. */
const TILE_TIERS = [
  { padY: 16, padX: 18, size: 17, lh: 1.4, grid: 14 },
  { padY: 12, padX: 14, size: 15, lh: 1.35, grid: 11 },
  { padY: 9, padX: 11, size: 13, lh: 1.3, grid: 8 },
]

function tilesHeight(
  items: string[],
  columns: number,
  tier: (typeof TILE_TIERS)[number],
): number {
  const colW = (CONTENT_W - tier.grid * (columns - 1)) / columns
  const textW = Math.max(70, colW - tier.padX * 2)
  const rows = Math.ceil(items.length / columns)
  let total = tier.grid * Math.max(0, rows - 1)
  for (let r = 0; r < rows; r++) {
    let tallest = 0
    for (let c = 0; c < columns; c++) {
      const item = items[r * columns + c]
      if (item === undefined) continue
      const h = BOX_BORDER + tier.padY * 2 + textHeight(item, textW, tier.size, tier.lh)
      if (h > tallest) tallest = h
    }
    total += tallest
  }
  return total
}

export default function ImageSlide({ slide }: SlideProps<Model>) {
  const { glyph, bullets, caption, src } = slide.content
  const mosaic = slide.template === 'image-03' && bullets.length > 0
  const full = !mosaic && (slide.template === 'image-02' || bullets.length === 0)
  const available = bodyHeight(slide)
  // Alt yazı gövdenin içinde; görsel ve maddelere kalan alandan düşülür.
  const captionH = caption ? 14 + textHeight(caption, CONTENT_W, 14, 1.4) : 0
  const inner = Math.max(120, available - captionH)

  const frame = (
    <div className="sn-image-frame">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- data: URL; next/image gerekmez
        <img src={src} alt={caption || slide.title} />
      ) : (
        <SunumGlyph name={glyph} className="sn-glyph" />
      )}
    </div>
  )

  /* ------------------------------ image-03: mozaik ------------------------------ */
  if (mosaic) {
    const columns = bullets.length <= 2 ? Math.max(bullets.length, 1) : bullets.length === 4 ? 2 : 3
    // Görsel şeridi kalan alanın ~%40'ını alır; kartlar hep okunur kalsın diye sınırlı.
    const stripH = Math.max(120, Math.min(280, Math.round(inner * 0.42)))
    const tier = compactClass(
      TILE_TIERS.map((t) => tilesHeight(bullets, columns, t)),
      inner - stripH - 16,
    )
    return (
      <>
        <SlideHead slide={slide} />
        <div className="sn-body">
          <div className="sn-mosaic">
            <div className="sn-mosaic-strip" style={{ height: stripH }}>
              {frame}
            </div>
            <div
              className={`sn-mosaic-tiles${tier}`}
              style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
            >
              {bullets.map((text, i) => (
                <p key={i}>{text}</p>
              ))}
            </div>
          </div>
          {caption ? <p className="sn-caption">{caption}</p> : null}
        </div>
      </>
    )
  }

  return (
    <>
      <SlideHead slide={slide} />
      <div className="sn-body">
        {full ? (
          <div className="sn-image-full">{frame}</div>
        ) : (
          <div className="sn-image-grid">
            {frame}
            <Bullets items={bullets} width={(CONTENT_W - 28) / 2} available={inner} />
          </div>
        )}
        {caption ? (
          <p className="sn-caption" style={{ textAlign: full ? 'center' : 'left' }}>
            {caption}
          </p>
        ) : null}
      </div>
    </>
  )
}
