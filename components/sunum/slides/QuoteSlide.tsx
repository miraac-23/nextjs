import type { QuoteSlide as Model } from '@/lib/sunum/types'
import SunumGlyph from '../SunumGlyph'
import type { SlideProps } from './types'

/**
 * Alıntı.
 *  quote-01 → sade zeminde ortalanmış büyük alıntı.
 *  quote-02 → gradyan zeminde (`.sn-hero` sınıfı SlideRenderer'da eklenir).
 *  quote-03 → solda dev tırnak + alıntı, sağda kaynak kartı (portre alanı).
 *
 * Punto kademesi uzunluğa göre iner; üçüncü kademe yeni, çünkü 320 karakterden
 * uzun alıntılar 26px'te on satırı geçip slayttan taşıyordu.
 */
function quoteClass(text: string): string {
  if (text.length > 320) return ' sn-quote-xlong'
  if (text.length > 160) return ' sn-quote-long'
  return ''
}

export default function QuoteSlide({ slide }: SlideProps<Model>) {
  const { text, author, role } = slide.content
  const by = [author, role].filter(Boolean).join(' · ')
  const cls = quoteClass(text)

  if (slide.template === 'quote-03') {
    return (
      <div className="sn-quote-split">
        <div className="sn-quote sn-quote-wide">
          <div className="sn-quote-mark" aria-hidden="true">
            &ldquo;
          </div>
          <blockquote className={`sn-quote-text${cls}`}>{text}</blockquote>
        </div>
        <aside className="sn-quote-card">
          <span className="sn-quote-portrait" aria-hidden="true">
            <SunumGlyph name={slide.icon ?? 'message'} />
          </span>
          {author ? <div className="sn-quote-author">{author}</div> : null}
          {role ? <div className="sn-quote-role">{role}</div> : null}
        </aside>
      </div>
    )
  }

  return (
    <div className="sn-quote">
      <div className="sn-quote-mark" aria-hidden="true">
        &ldquo;
      </div>
      <blockquote className={`sn-quote-text${cls}`}>{text}</blockquote>
      {by ? <div className="sn-quote-by">— {by}</div> : null}
    </div>
  )
}
