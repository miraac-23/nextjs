'use client'

/**
 * Sağ panel — İçerik sekmesi (§10).
 *
 * Yalnızca METİN alanları: başlık, alt başlık, tipe özel içerik ve konuşmacı
 * notu. Tip ve yerleşim seçimi Tasarım sekmesine ait — bu ayrım ürünün temel
 * prensibini yansıtır: kullanıcı tasarım değil içerik düzenler (§26).
 */

import { LIMITS } from '@/lib/sunum/schema'
import { SLIDE_GLYPHS, type Slide, type SlideGlyph } from '@/lib/sunum/types'
import type { SunumText } from '@/lib/sunum/ui-text'
import ContentEditor from './editors/ContentEditor'
import SlideMediaEditor from './SlideMediaEditor'
import TextToolbar from './TextToolbar'
import { Area, Field, Select } from './ui'

type Props = {
  slide: Slide
  onSlide: (slide: Slide) => void
  t: SunumText
}

/**
 * AI görsel isteminin varsayılanı: slaydın başlığı ve varsa ilk somut satırı.
 * Kullanıcı istemi elle yazmak zorunda kalmasın diye slayttan türetiliyor.
 */
function mediaSuggest(slide: Slide): string {
  const extra =
    slide.type === 'content' || slide.type === 'conclusion'
      ? slide.content.bullets.find((b) => b.trim().length > 0)
      : slide.subtitle
  return [slide.title, extra].filter(Boolean).join(' — ').slice(0, 180)
}

export default function ContentPanel({ slide, onSlide, t }: Props) {
  const e = t.editor

  return (
    <div className="space-y-4">
      <Field
        label={e.titleField}
        value={slide.title}
        onChange={(title) => onSlide({ ...slide, title })}
        maxLength={LIMITS.title}
      />

      {/* Alıntı slaytında başlık şablonda basılmaz; alt başlık da anlamsız kalır. */}
      {slide.type !== 'quote' ? (
        <Field
          label={e.subtitleField}
          value={slide.subtitle ?? ''}
          onChange={(subtitle) => onSlide({ ...slide, subtitle: subtitle || undefined })}
          maxLength={LIMITS.subtitle}
        />
      ) : null}

      {/* Vurgu: slayttan akılda kalması istenen tek cümle. AI doldurur,
          kullanıcı değiştirebilir. Kapak ve alıntıda basılmaz. */}
      {slide.type !== 'title' && slide.type !== 'quote' ? (
        <Field
          label={e.highlight}
          value={slide.highlight ?? ''}
          onChange={(highlight) => onSlide({ ...slide, highlight: highlight || undefined })}
          hint={e.highlightHint}
          maxLength={LIMITS.bullet}
        />
      ) : null}

      {/* Somut örnek: konudan üretilen sunumlarda içeriği somutlaştıran alan.
          AI doldurur; boş bırakılırsa slaytta bant hiç çizilmez. */}
      {slide.type !== 'title' && slide.type !== 'quote' ? (
        <Area
          label={e.exampleField}
          value={slide.example ?? ''}
          onChange={(example) => onSlide({ ...slide, example: example || undefined })}
          hint={e.exampleHint}
          rows={2}
          maxLength={LIMITS.example}
        />
      ) : null}

      {/* Simge anlamsal bir etikettir; bu yüzden Tasarım değil İçerik sekmesinde. */}
      <Select<SlideGlyph>
        label={e.iconField}
        value={slide.icon ?? 'idea'}
        onChange={(icon) => onSlide({ ...slide, icon })}
        options={SLIDE_GLYPHS.map((value) => ({ value, label: t.glyphs[value] }))}
        hint={e.iconHint}
      />

      {/* Görsel her slaytta olabilir — tipe bağlı değil. Önce yalnızca "Görsel"
          tipinde vardı ve AI o tipi neredeyse hiç üretmediği için kullanıcı
          pratikte hiçbir slayda görsel ekleyemiyordu. */}
      <div className="border-t border-line/10 pt-4">
        <p className="section-label mb-2.5">{t.media.title}</p>
        <SlideMediaEditor
          t={t}
          value={slide.media}
          onChange={(media) => onSlide({ ...slide, media })}
          suggest={mediaSuggest(slide)}
        />
      </div>

      <div className="space-y-4 border-t border-line/10 pt-4">
        <ContentEditor slide={slide} onSlide={onSlide} t={t} />
      </div>

      {/* Metin biçimi: içeriğin NASIL göründüğü değil, kullanıcının metne
          uyguladığı biçim. Tasarım sekmesine değil buraya ait, çünkü tek bir
          slaydın metnini biçimliyor — tema ve yerleşim seçimi hâlâ orada. */}
      <div className="border-t border-line/10 pt-4">
        <p className="section-label mb-1.5">{t.format.title}</p>
        <p className="mb-3 text-xs leading-relaxed text-fg4">{t.format.hint}</p>
        <TextToolbar
          t={t}
          value={slide.textStyle}
          onChange={(textStyle) => onSlide({ ...slide, textStyle })}
        />
      </div>

      <div className="border-t border-line/10 pt-4">
        <Area
          label={e.notesField}
          value={slide.notes ?? ''}
          onChange={(notes) => onSlide({ ...slide, notes: notes || undefined })}
          hint={e.notesHint}
          rows={3}
          maxLength={LIMITS.notes}
        />
      </div>
    </div>
  )
}
