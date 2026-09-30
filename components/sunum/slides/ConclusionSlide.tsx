import type { ConclusionSlide as Model } from '@/lib/sunum/types'
import {
  Bullets,
  CONTENT_H,
  CONTENT_W,
  SlideHead,
  bandsHeight,
  bodyHeight,
  bulletClassMulti,
  estimateLines,
  textHeight,
  titleClass,
} from './parts'
import type { SlideProps } from './types'

/**
 * Kapanış.
 *  conclusion-01 → gradyan zemin, büyük başlık, çağrı cümlesi.
 *  conclusion-02 → sade zemin, standart başlık düzeni.
 *  conclusion-03 → gradyan zemin, iki kolonlu onay listesi + çağrı.
 *
 * 01 ve 03 kendi başlığını basar (rozetli `SlideHead` kullanmaz), bu yüzden
 * kalan yükseklik `bodyHeight` ile değil elle hesaplanır: başlık puntosu,
 * çizgi ve çağrı satırı düşülür.
 */

/** `.sn-title` punto kademeleri — `titleClass` ile aynı eşikler. */
function titleSize(title: string): number {
  if (title.length > 84) return 28
  if (title.length > 52) return 33
  return 40
}

export default function ConclusionSlide({ slide }: SlideProps<Model>) {
  const { bullets, cta } = slide.content
  const hero = slide.template !== 'conclusion-02'
  const checklist = slide.template === 'conclusion-03'

  if (hero) {
    const size = titleSize(slide.title)
    const headH = estimateLines(slide.title, CONTENT_W, size) * Math.round(size * 1.15) + 20 + 30
    const ctaH = cta ? 28 + textHeight(cta, CONTENT_W, 20, 1.4) : 0
    const available = Math.max(120, CONTENT_H - headH - ctaH - bandsHeight(slide))

    const head = (
      <>
        <h2 className={`sn-title${titleClass(slide.title)}`} style={{ color: 'inherit' }}>
          {slide.title}
        </h2>
        <div className="sn-rule" />
      </>
    )

    if (checklist) {
      // Onay listesi iki kolona bölünür: kapanış slaytı "yapılacaklar" gibi okunur.
      const cut = Math.ceil(bullets.length / 2)
      const groups = [bullets.slice(0, cut), bullets.slice(cut)]
      const colW = (CONTENT_W - 32) / 2 - 44
      const cls = bulletClassMulti(groups, colW, available)
      return (
        <>
          {head}
          <div className="sn-close-checks" style={{ marginTop: 26 }}>
            {groups.map((group, g) =>
              group.length === 0 ? null : (
                <ul className={`sn-checks${cls}`} key={g}>
                  {group.map((text, i) => (
                    <li key={i}>{text}</li>
                  ))}
                </ul>
              ),
            )}
          </div>
          {cta ? <div className="sn-hero-cta">{cta}</div> : null}
        </>
      )
    }

    return (
      <>
        {head}
        <div style={{ marginTop: 30 }}>
          <Bullets items={bullets} available={available} />
        </div>
        {cta ? <div className="sn-hero-cta">{cta}</div> : null}
      </>
    )
  }

  const available = bodyHeight(slide)
  const ctaH = cta ? 28 + textHeight(cta, CONTENT_W, 20, 1.4) : 0

  return (
    <>
      <SlideHead slide={slide} />
      <div className="sn-body">
        <Bullets items={bullets} available={Math.max(100, available - ctaH)} />
        {cta ? <div className="sn-hero-cta" style={{ marginTop: 'auto' }}>{cta}</div> : null}
      </div>
    </>
  )
}
