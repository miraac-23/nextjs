// Slayt şablon kayıtları (Slide Engine'in "tasarım" tarafı).
//
// AI yalnızca `type` ve içerik üretir; hangi şablon varyantının kullanılacağına
// burası karar verir. Model tanımadığı bir şablon adı döndürürse `resolveTemplate`
// sessizce o tipin ilk varyantına düşer — böylece çıktı her zaman render edilebilir.

import {
  SLIDE_TYPES,
  isSlideType,
  uid,
  type Slide,
  type SlideType,
  type SunumLang,
} from './types'

export type SlideTemplate = {
  id: string
  type: SlideType
  name: { tr: string; en: string }
  /** Kısa yerleşim özeti — editörde şablon seçicide gösterilir. */
  hint: { tr: string; en: string }
}

/**
 * Şablon listesi.
 *
 * SIRA ÖNEMLİDİR: `defaultTemplate` her tipin İLK varyantını döndürür, bu yüzden
 * `-01` şablonlarının yerleşimi dokunulmazdır (mevcut desteler onunla üretildi).
 * Yeni varyantlar daima sona eklenir ve gerçekten FARKLI bir yerleşim getirir —
 * yalnızca renk değiştiren bir varyant kullanıcıya seçenek değil gürültüdür.
 */
export const TEMPLATES: SlideTemplate[] = [
  { id: 'title-01', type: 'title', name: { tr: 'Kapak · Gradyan', en: 'Cover · Gradient' }, hint: { tr: 'Ortalanmış başlık, tam zemin', en: 'Centered title, full bleed' } },
  { id: 'title-02', type: 'title', name: { tr: 'Kapak · Bölünmüş', en: 'Cover · Split' }, hint: { tr: 'Solda başlık, sağda vurgu bandı', en: 'Title left, accent band right' } },
  { id: 'title-03', type: 'title', name: { tr: 'Kapak · Alt Şerit', en: 'Cover · Footer Band' }, hint: { tr: 'Üstte dev başlık, altta bilgi şeridi', en: 'Oversized title, info strip below' } },
  { id: 'title-04', type: 'title', name: { tr: 'Kapak · Köşe Blok', en: 'Cover · Corner Block' }, hint: { tr: 'Asimetrik tipografi, köşede blok', en: 'Asymmetric type, corner block' } },

  { id: 'content-01', type: 'content', name: { tr: 'İçerik · Maddeler', en: 'Content · Bullets' }, hint: { tr: 'Klasik madde listesi', en: 'Classic bullet list' } },
  { id: 'content-02', type: 'content', name: { tr: 'İçerik · Kartlar', en: 'Content · Cards' }, hint: { tr: 'Numaralı kart ızgarası', en: 'Numbered card grid' } },
  { id: 'content-03', type: 'content', name: { tr: 'İçerik · İki Kolon', en: 'Content · Two Columns' }, hint: { tr: 'Maddeler iki kolona bölünür', en: 'Bullets split into two columns' } },
  { id: 'content-04', type: 'content', name: { tr: 'İçerik · Öne Çıkan', en: 'Content · Lead' }, hint: { tr: 'Büyük ilk madde + destekleyiciler', en: 'Big first point + supporting' } },
  { id: 'content-05', type: 'content', name: { tr: 'İçerik · İşaretli Liste', en: 'Content · Checklist' }, hint: { tr: 'Rozetli madde satırları', en: 'Badged bullet rows' } },

  { id: 'two-column-01', type: 'two-column', name: { tr: 'İki Sütun · Panel', en: 'Two Column · Panels' }, hint: { tr: 'Eşit iki panel', en: 'Two equal panels' } },
  { id: 'two-column-02', type: 'two-column', name: { tr: 'İki Sütun · Vurgulu', en: 'Two Column · Accent' }, hint: { tr: 'Sol panel vurgu renginde', en: 'Left panel in accent' } },
  { id: 'two-column-03', type: 'two-column', name: { tr: 'İki Sütun · Ayraçlı', en: 'Two Column · Divided' }, hint: { tr: 'Zeminsiz sütunlar, ortada ayraç', en: 'Plain columns, centre divider' } },

  { id: 'comparison-01', type: 'comparison', name: { tr: 'Karşılaştırma · Önce/Sonra', en: 'Comparison · Before/After' }, hint: { tr: 'Başlıklı iki kolon + sonuç', en: 'Two headed columns + verdict' } },
  { id: 'comparison-02', type: 'comparison', name: { tr: 'Karşılaştırma · Satır', en: 'Comparison · Rows' }, hint: { tr: 'Satır satır eşleştirme', en: 'Row-by-row pairing' } },
  { id: 'comparison-03', type: 'comparison', name: { tr: 'Karşılaştırma · Karşı Karşıya', en: 'Comparison · Versus' }, hint: { tr: 'İki panel, ortada VS rozeti', en: 'Two panels, VS badge between' } },

  { id: 'statistics-01', type: 'statistics', name: { tr: 'İstatistik · Şerit', en: 'Statistics · Row' }, hint: { tr: 'Yan yana büyük sayılar', en: 'Big numbers in a row' } },
  { id: 'statistics-02', type: 'statistics', name: { tr: 'İstatistik · Izgara', en: 'Statistics · Grid' }, hint: { tr: '2×2 kart ızgarası', en: '2×2 card grid' } },
  { id: 'statistics-03', type: 'statistics', name: { tr: 'İstatistik · Tek Dev Sayı', en: 'Statistics · Hero Number' }, hint: { tr: 'Solda dev sayı, sağda destek', en: 'Hero number left, support right' } },

  { id: 'chart-01', type: 'chart', name: { tr: 'Grafik · Tam', en: 'Chart · Full' }, hint: { tr: 'Geniş grafik + açıklama', en: 'Wide chart + caption' } },
  { id: 'chart-02', type: 'chart', name: { tr: 'Grafik · Yorumlu', en: 'Chart · Annotated' }, hint: { tr: 'Solda grafik, sağda değerler', en: 'Chart left, values right' } },
  { id: 'chart-03', type: 'chart', name: { tr: 'Grafik · Çıkarım', en: 'Chart · Takeaway' }, hint: { tr: 'Küçük grafik + büyük çıkarım', en: 'Small chart + big takeaway' } },

  { id: 'timeline-01', type: 'timeline', name: { tr: 'Zaman Çizelgesi · Yatay', en: 'Timeline · Horizontal' }, hint: { tr: 'Soldan sağa adımlar', en: 'Left-to-right steps' } },
  { id: 'timeline-02', type: 'timeline', name: { tr: 'Zaman Çizelgesi · Dikey', en: 'Timeline · Vertical' }, hint: { tr: 'Alt alta dönemler', en: 'Stacked periods' } },
  { id: 'timeline-03', type: 'timeline', name: { tr: 'Zaman Çizelgesi · Dönem Sütunları', en: 'Timeline · Period Columns' }, hint: { tr: 'Dönem başlıklı kart sütunları', en: 'Period-headed card columns' } },

  { id: 'process-01', type: 'process', name: { tr: 'Süreç · Oklar', en: 'Process · Arrows' }, hint: { tr: 'Zincir hâlinde adımlar', en: 'Chained steps' } },
  { id: 'process-02', type: 'process', name: { tr: 'Süreç · Numaralı', en: 'Process · Numbered' }, hint: { tr: 'Numaralı dikey adımlar', en: 'Numbered vertical steps' } },
  { id: 'process-03', type: 'process', name: { tr: 'Süreç · Döngü', en: 'Process · Cycle' }, hint: { tr: 'Dairesel, kapanan akış', en: 'Circular, closing loop' } },

  { id: 'architecture-01', type: 'architecture', name: { tr: 'Mimari · Katmanlar', en: 'Architecture · Layers' }, hint: { tr: 'Üst üste katman blokları', en: 'Stacked layer blocks' } },
  { id: 'architecture-02', type: 'architecture', name: { tr: 'Mimari · Akış Şeması', en: 'Architecture · Flow' }, hint: { tr: 'Kutu-çizgi, yukarıdan aşağı', en: 'Box-and-line, top to bottom' } },
  { id: 'architecture-03', type: 'architecture', name: { tr: 'Mimari · Sütunlar', en: 'Architecture · Columns' }, hint: { tr: 'Yan yana katman sütunları', en: 'Side-by-side layer columns' } },

  { id: 'image-01', type: 'image', name: { tr: 'Görsel · Yanda', en: 'Image · Beside' }, hint: { tr: 'Solda görsel, sağda maddeler', en: 'Visual left, bullets right' } },
  { id: 'image-02', type: 'image', name: { tr: 'Görsel · Tam', en: 'Image · Full' }, hint: { tr: 'Tam genişlik görsel + alt yazı', en: 'Full width visual + caption' } },
  { id: 'image-03', type: 'image', name: { tr: 'Görsel · Mozaik', en: 'Image · Mosaic' }, hint: { tr: 'Üstte görsel şeridi, altta kartlar', en: 'Visual strip above, cards below' } },

  { id: 'quote-01', type: 'quote', name: { tr: 'Alıntı · Ortalı', en: 'Quote · Centered' }, hint: { tr: 'Büyük alıntı, sade zemin', en: 'Large quote, plain ground' } },
  { id: 'quote-02', type: 'quote', name: { tr: 'Alıntı · Bant', en: 'Quote · Band' }, hint: { tr: 'Vurgu zeminli alıntı', en: 'Accent ground quote' } },
  { id: 'quote-03', type: 'quote', name: { tr: 'Alıntı · Portreli', en: 'Quote · Portrait' }, hint: { tr: 'Büyük tırnak + yanda kaynak kartı', en: 'Big mark + source card beside' } },

  { id: 'conclusion-01', type: 'conclusion', name: { tr: 'Kapanış · Gradyan', en: 'Closing · Gradient' }, hint: { tr: 'Gradyan zemin + çağrı', en: 'Gradient ground + CTA' } },
  { id: 'conclusion-02', type: 'conclusion', name: { tr: 'Kapanış · Sade', en: 'Closing · Plain' }, hint: { tr: 'Maddeler + kapanış cümlesi', en: 'Bullets + closing line' } },
  { id: 'conclusion-03', type: 'conclusion', name: { tr: 'Kapanış · Kontrol Listesi', en: 'Closing · Checklist' }, hint: { tr: 'Onay işaretli iki kolon + çağrı', en: 'Ticked two columns + CTA' } },
]

const BY_TYPE: Record<SlideType, SlideTemplate[]> = SLIDE_TYPES.reduce((acc, type) => {
  acc[type] = TEMPLATES.filter((t) => t.type === type)
  return acc
}, {} as Record<SlideType, SlideTemplate[]>)

/** Bir tipin tüm şablon varyantları (editördeki şablon seçici bunu listeler). */
export function templatesFor(type: SlideType): SlideTemplate[] {
  return BY_TYPE[type] ?? []
}

/** Tipin varsayılan şablonu — liste boş kalamaz, her tipin en az bir varyantı vardır. */
export function defaultTemplate(type: SlideType): string {
  const list = BY_TYPE[type]
  return list && list.length > 0 ? list[0].id : 'content-01'
}

/**
 * Şablon adını doğrular. Ad o tipe ait değilse (AI uydurmuşsa ya da tip
 * değiştirildiyse) tipin varsayılanına düşer.
 */
export function resolveTemplate(type: SlideType, template: unknown): string {
  if (typeof template === 'string') {
    const list = BY_TYPE[type] ?? []
    for (let i = 0; i < list.length; i++) if (list[i].id === template) return template
  }
  return defaultTemplate(type)
}

export function getTemplate(id: string): SlideTemplate | null {
  for (let i = 0; i < TEMPLATES.length; i++) if (TEMPLATES[i].id === id) return TEMPLATES[i]
  return null
}

/* ============================== boş slayt üretimi ============================== */

const PH = {
  tr: {
    title: 'Slayt başlığı',
    subtitle: 'Alt başlık',
    bullet: 'Madde metni',
    heading: 'Başlık',
    stat: 'Ölçüt',
    step: 'Adım',
    layer: 'Katman',
    node: 'Bileşen',
    quote: 'Buraya bir alıntı yazın.',
    cta: 'Sorular ve katkılar için teşekkürler.',
    period: 'Dönem',
    left: 'Mevcut durum',
    right: 'Yeni yaklaşım',
  },
  en: {
    title: 'Slide title',
    subtitle: 'Subtitle',
    bullet: 'Bullet text',
    heading: 'Heading',
    stat: 'Metric',
    step: 'Step',
    layer: 'Layer',
    node: 'Component',
    quote: 'Write a quote here.',
    cta: 'Thanks — questions are welcome.',
    period: 'Period',
    left: 'Current state',
    right: 'New approach',
  },
} as const

/**
 * Yeni slayt ("+ Slayt ekle") ya da tip değişimi için boş ama geçerli bir slayt üretir.
 * Her dalda `content` o tipin tam şeklini taşır; böylece renderer'lar null kontrolü
 * yapmak zorunda kalmaz.
 */
export function blankSlide(
  type: SlideType,
  presentationId: string,
  order: number,
  lang: SunumLang,
): Slide {
  const p = PH[lang]
  const base = {
    id: uid('sl'),
    presentationId,
    order,
    template: defaultTemplate(type),
    title: p.title,
    // Boş slaytın da rozeti olur: aksi hâlde elle eklenen slayt, AI'nın ürettiği
    // slaytların yanında başlıksız-rozetsiz duruyor ve deste dağınık görünüyor.
    // Kullanıcı İçerik sekmesinden değiştirebilir.
    icon: 'idea' as const,
  }

  switch (type) {
    case 'title':
      return { ...base, type, subtitle: p.subtitle, content: {} }
    case 'content':
      return { ...base, type, content: { bullets: [p.bullet, p.bullet, p.bullet] } }
    case 'two-column':
      return {
        ...base,
        type,
        content: {
          left: { heading: p.heading, bullets: [p.bullet, p.bullet] },
          right: { heading: p.heading, bullets: [p.bullet, p.bullet] },
        },
      }
    case 'comparison':
      return {
        ...base,
        type,
        content: {
          left: { heading: p.left, bullets: [p.bullet, p.bullet] },
          right: { heading: p.right, bullets: [p.bullet, p.bullet] },
        },
      }
    case 'statistics':
      return {
        ...base,
        type,
        content: {
          stats: [
            { value: '00', label: p.stat },
            { value: '00', label: p.stat },
            { value: '00', label: p.stat },
          ],
        },
      }
    case 'chart':
      return {
        ...base,
        type,
        content: {
          chartType: 'bar',
          points: [
            { label: 'A', value: 40 },
            { label: 'B', value: 65 },
            { label: 'C', value: 25 },
          ],
        },
      }
    case 'timeline':
      return {
        ...base,
        type,
        content: {
          steps: [
            { label: p.period, title: p.step },
            { label: p.period, title: p.step },
            { label: p.period, title: p.step },
          ],
        },
      }
    case 'process':
      return {
        ...base,
        type,
        content: { steps: [{ title: p.step }, { title: p.step }, { title: p.step }] },
      }
    case 'architecture':
      return {
        ...base,
        type,
        content: {
          layers: [
            { name: p.layer, nodes: [p.node, p.node] },
            { name: p.layer, nodes: [p.node, p.node] },
          ],
        },
      }
    case 'image':
      return { ...base, type, content: { glyph: 'idea', bullets: [p.bullet, p.bullet] } }
    case 'quote':
      return { ...base, type, title: '', content: { text: p.quote } }
    case 'conclusion':
      return { ...base, type, content: { bullets: [p.bullet, p.bullet], cta: p.cta } }
    default: {
      // Tip listesi büyüdüğünde derleyici burada hata verir.
      const exhaustive: never = type
      throw new Error(`unhandled slide type: ${String(exhaustive)}`)
    }
  }
}

/** Slaytı başka bir tipe çevirir: başlık/not korunur, içerik o tipin boş şekline döner. */
export function convertSlideType(slide: Slide, type: SlideType, lang: SunumLang): Slide {
  if (slide.type === type) return slide
  const fresh = blankSlide(type, slide.presentationId, slide.order, lang)
  return {
    ...fresh,
    id: slide.id,
    title: slide.title || fresh.title,
    subtitle: slide.subtitle,
    notes: slide.notes,
    // Tip değişse de slaytın KONUSU değişmiyor: vurgu, örnek ve simge taşınır.
    highlight: slide.highlight,
    example: slide.example,
    icon: slide.icon ?? fresh.icon,
    media: slide.media,
  }
}

export { isSlideType }
