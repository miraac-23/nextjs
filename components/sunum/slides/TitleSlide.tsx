import type { TitleSlide as Model } from '@/lib/sunum/types'
import type { SlideProps } from './types'
import { longClass } from './parts'

/**
 * Kapak. Dört varyant:
 *  title-01 → tam zemin gradyan, ortalanmış metin.
 *  title-02 → solda metin, sağda vurgu paneli (site kabuğundan bağımsız).
 *  title-03 → üstte dev başlık, altta tam genişlik bilgi şeridi.
 *  title-04 → asimetrik: metin sol alta yaslı, sağ üstte köşe bloğu.
 *
 * 01 dışındaki varyantlar da gradyan zemine oturur: hangi kapağın "hero"
 * olduğuna SlideRenderer karar veriyor ve orası bu ekibin dokunmadığı dosya.
 * Bu yüzden ayrım RENKTE değil YERLEŞİMDE aranır — zaten istenen de bu.
 */

/**
 * Kapak başlığı punto kademesi.
 *
 * Üçüncü kademe yeni: `max-width: 26ch` yüzünden 90 karakterden uzun başlıklar
 * 48px'te dört satıra çıkıp kapaktan taşıyordu.
 */
function coverClass(title: string): string {
  if (title.length > 90) return ' sn-title-xlong'
  return longClass(title, 40)
}

export default function TitleSlide({ slide }: SlideProps<Model>) {
  const meta = [slide.content.presenter, slide.content.context].filter(Boolean).join('  ·  ')
  const cls = coverClass(slide.title)

  if (slide.template === 'title-02') {
    return (
      <>
        <div className="sn-cover-main">
          <div className="sn-cover-rule" />
          <h1 className={`sn-cover-title${cls}`}>{slide.title}</h1>
          {slide.subtitle ? <p className="sn-cover-sub">{slide.subtitle}</p> : null}
          {meta ? <p className="sn-cover-meta-inline">{meta}</p> : null}
        </div>
        <div className="sn-cover-side" aria-hidden="true" />
      </>
    )
  }

  // title-03: başlık üst bloğa yaslanır, alt kenarda tam genişlik bilgi şeridi.
  if (slide.template === 'title-03') {
    return (
      <div className="sn-cover-strip">
        <div className="sn-cover-strip-main">
          <div className="sn-cover-rule" />
          <h1 className={`sn-cover-title${cls}`}>{slide.title}</h1>
        </div>
        {slide.subtitle || meta ? (
          <div className="sn-cover-strip-band">
            {slide.subtitle ? <p className="sn-cover-strip-sub">{slide.subtitle}</p> : null}
            {meta ? <span className="sn-cover-strip-meta">{meta}</span> : null}
          </div>
        ) : null}
      </div>
    )
  }

  // title-04: köşe bloğu dekoratif, metin sol alta yaslı — asimetrik denge.
  if (slide.template === 'title-04') {
    return (
      <>
        <span className="sn-cover-block" aria-hidden="true" />
        <div className="sn-cover-anchor">
          <div className="sn-cover-rule" />
          <h1 className={`sn-cover-title${cls}`}>{slide.title}</h1>
          {slide.subtitle ? <p className="sn-cover-sub">{slide.subtitle}</p> : null}
          {meta ? <p className="sn-cover-meta-inline">{meta}</p> : null}
        </div>
      </>
    )
  }

  return (
    <>
      <div className="sn-cover-rule" />
      <h1 className={`sn-cover-title${cls}`}>{slide.title}</h1>
      {slide.subtitle ? <p className="sn-cover-sub">{slide.subtitle}</p> : null}
      {meta ? <div className="sn-cover-meta">{meta}</div> : null}
    </>
  )
}
