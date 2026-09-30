/**
 * Slide Engine'in React tarafı.
 *
 * Tek sorumluluk: `Slide` modelini doğru şablona yönlendirmek ve slayt kâğıdını
 * (tema değişkenleri + 1280×720 kutu) kurmak. Burada AI çağrısı, veri getirme ya
 * da yan etki YOKTUR — saf render. Bu yüzden aynı bileşen küçük resimde, editör
 * tuvalinde, sunum modunda ve yazdırma kökünde birebir kullanılabiliyor.
 *
 * `switch` ayrık birleşim üzerinde çalışır: yeni bir slayt tipi eklendiğinde
 * derleyici `default` dalındaki `never` ataması üzerinden burayı da uyarır.
 */

import { getTheme, type SunumTheme } from '@/lib/sunum/themes'
import { DEFAULT_VISUAL, type Presentation, type Slide, type SunumLang, type Visual } from '@/lib/sunum/types'
import ArchitectureSlide from './slides/ArchitectureSlide'
import ChartSlide from './slides/ChartSlide'
import ColumnsSlide from './slides/ColumnsSlide'
import ConclusionSlide from './slides/ConclusionSlide'
import ContentSlide from './slides/ContentSlide'
import ImageSlide from './slides/ImageSlide'
import ProcessSlide from './slides/ProcessSlide'
import QuoteSlide from './slides/QuoteSlide'
import StatisticsSlide from './slides/StatisticsSlide'
import TimelineSlide from './slides/TimelineSlide'
import TitleSlide from './slides/TitleSlide'
import { ExampleBand, slideVars } from './slides/parts'
import SlideMediaLayer from './slides/SlideMediaLayer'
import { EditableText } from './slides/edit'

type Props = {
  slide: Slide
  /** Sunumun teması; verilmezse varsayılan tema kullanılır. */
  theme: SunumTheme
  lang: SunumLang
  /**
   * Slaytı sahneleyerek göster (§16). Sunum modu ve üretim önizlemesi true
   * geçer; editör tuvali ve küçük resimler geçmez — düzenleme sırasında sürekli
   * yeniden oynayan animasyon işi imkânsızlaştırır.
   */
  animate?: boolean
  /** Dekoratif katmanların yoğunluğu (bkz. app/sunum/sunum.css → .sn-v-*). */
  visual?: Visual
}

/** Gradyan zeminli (hero) şablonlar — kapak, gradyan kapanış ve alıntı bandı. */
function isHero(slide: Slide): boolean {
  if (slide.type === 'title') return slide.template !== 'title-02'
  if (slide.type === 'conclusion') return slide.template !== 'conclusion-02'
  if (slide.type === 'quote') return slide.template === 'quote-02'
  return false
}

function SlideBody({ slide, theme, lang, animate = false }: Props) {
  switch (slide.type) {
    case 'title':
      return <TitleSlide slide={slide} theme={theme} lang={lang} animate={animate} />
    case 'content':
      return <ContentSlide slide={slide} theme={theme} lang={lang} animate={animate} />
    case 'two-column':
    case 'comparison':
      return <ColumnsSlide slide={slide} theme={theme} lang={lang} animate={animate} />
    case 'statistics':
      return <StatisticsSlide slide={slide} theme={theme} lang={lang} animate={animate} />
    case 'chart':
      return <ChartSlide slide={slide} theme={theme} lang={lang} animate={animate} />
    case 'timeline':
      return <TimelineSlide slide={slide} theme={theme} lang={lang} animate={animate} />
    case 'process':
      return <ProcessSlide slide={slide} theme={theme} lang={lang} animate={animate} />
    case 'architecture':
      return <ArchitectureSlide slide={slide} theme={theme} lang={lang} animate={animate} />
    case 'image':
      return <ImageSlide slide={slide} theme={theme} lang={lang} animate={animate} />
    case 'quote':
      return <QuoteSlide slide={slide} theme={theme} lang={lang} animate={animate} />
    case 'conclusion':
      return <ConclusionSlide slide={slide} theme={theme} lang={lang} animate={animate} />
    default: {
      const exhaustive: never = slide
      void exhaustive
      return null
    }
  }
}

export default function SlideRenderer({ slide, theme, lang, animate = false, visual = DEFAULT_VISUAL }: Props) {
  const split = slide.type === 'title' && slide.template === 'title-02'
  const className = [
    'sn-slide',
    `sn-v-${visual}`,
    isHero(slide) ? 'sn-hero' : '',
    split ? 'sn-cover-split' : '',
    animate ? 'sn-animate' : '',
  ]
    .filter(Boolean)
    .join(' ')

  // Kapak ve bölünmüş kapak kendi yerleşimini kurar; bantlar oralara girmez.
  const banded = slide.type !== 'title' && slide.type !== 'quote'
  const showHighlight = !!slide.highlight && banded
  const showExample = !!slide.example && banded

  // Zemin görseli içeriğin ALTINA girer; diğer ikisi akışta yerini alır.
  const media = slide.media
  const background = media && media.placement === 'background' ? media : null
  const inFlow = media && media.placement !== 'background' ? media : null

  return (
    /*
     * Metin biçimi değişkenleri KÖKTE basılır.
     *
     * `SlideHead` de aynı değişkenleri yazıyor, ama kapak, alıntı ve gradyan
     * kapanış şablonları başlığı kendileri çiziyor ve `SlideHead` kullanmıyor —
     * o slaytlarda biçim hiç uygulanmıyordu. Kökte basmak hepsini kapsıyor.
     */
    <div className={`${className}${media ? ' sn-has-media' : ''}`} style={slideVars(theme, slide.textStyle)}>
      {background ? <SlideMediaLayer media={background} hero={isHero(slide)} animate={animate} /> : null}
      <SlideBody slide={slide} theme={theme} lang={lang} animate={animate} />
      {/* Şerit ve köşe kutusu gövdenin ALTINDA, bantların ÜSTÜNDE durur. Başlıkla
          gövdenin arasına girmiyorlar, çünkü oraya girmek için SlideBody'nin
          içine sızmak gerekir ve o zaman her şablon ayrı ayrı bilmek zorunda kalır. */}
      {inFlow ? <SlideMediaLayer media={inFlow} hero={isHero(slide)} animate={animate} /> : null}
      {showExample ? <ExampleBand text={slide.example as string} lang={lang} /> : null}
      {showHighlight ? (
        <p className="sn-highlight">
          <EditableText value={slide.highlight as string} path={{ field: 'highlight' }} />
        </p>
      ) : null}
    </div>
  )
}

/**
 * Sunumun tüm slaytlarını sırayla basar — yazdırma kökü (#sunum-print-root) ve
 * sunum modunun ön yüklemesi bunu kullanır.
 */
export function SlideDeck({ presentation }: { presentation: Presentation }) {
  const theme = getTheme(presentation.theme)
  const slides = presentation.slides.slice().sort((a, b) => a.order - b.order)
  return (
    <>
      {slides.map((slide) => (
        <SlideRenderer
          key={slide.id}
          slide={slide}
          theme={theme}
          lang={presentation.language}
          visual={presentation.visual ?? DEFAULT_VISUAL}
        />
      ))}
    </>
  )
}
