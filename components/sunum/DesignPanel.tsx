'use client'

/**
 * Sağ panel — Tasarım sekmesi (§10).
 *
 * Kasıtlı olarak DAR: tema, slayt tipi ve yerleşim. Font, renk, hizalama,
 * boşluk gibi ayarlar yok — çünkü ürünün vaadi kullanıcının tasarım yapmak
 * zorunda kalmaması (§26). Yerleşimler tipin gerçek önizlemesiyle listelenir.
 */

import { templatesFor } from '@/lib/sunum/templates'
import { convertSlideType } from '@/lib/sunum/templates'
import { THEMES, getTheme, type ThemeId } from '@/lib/sunum/themes'
import { DEFAULT_VISUAL, SLIDE_TYPES, VISUALS, type Slide, type SlideType, type SunumLang, type Visual } from '@/lib/sunum/types'
import type { Lang } from '@/lib/i18n/config'
import type { SunumText } from '@/lib/sunum/ui-text'
import SlideCanvas from './SlideCanvas'
import SlideRenderer from './SlideRenderer'
import { Label, Select } from './ui'

type Props = {
  slide: Slide
  onSlide: (slide: Slide) => void
  theme: ThemeId
  onTheme: (id: ThemeId) => void
  visual: Visual
  onVisual: (v: Visual) => void
  deckLang: SunumLang
  uiLang: Lang
  t: SunumText
}

export default function DesignPanel({ slide, onSlide, theme, onTheme, visual, onVisual, deckLang, uiLang, t }: Props) {
  const variants = templatesFor(slide.type)
  const themeObject = getTheme(theme)

  return (
    <div className="space-y-5">
      {/* -------------------------------- tema -------------------------------- */}
      <div>
        <Label>{t.editor.theme}</Label>
        <div className="grid grid-cols-4 gap-1.5">
          {THEMES.map((item) => {
            const active = item.id === theme
            return (
              <button
                key={item.id}
                type="button"
                title={item.name[uiLang]}
                aria-label={item.name[uiLang]}
                aria-pressed={active}
                onClick={() => onTheme(item.id)}
                className={`h-9 rounded-lg border transition-all ${
                  active ? 'border-accent ring-2 ring-accent/25' : 'border-line/15 hover:border-accent/50'
                }`}
                style={{ background: `linear-gradient(135deg, ${item.heroFrom}, ${item.heroTo})` }}
              >
                <span className="mx-auto block h-1 w-5 rounded-full" style={{ background: item.accent }} />
              </button>
            )
          })}
        </div>
      </div>

      {/* ---------------------------- görsel yoğunluk ---------------------------- */}
      <div>
        <Label hint={t.editor.visualHint}>{t.editor.visual}</Label>
        <div className="flex gap-1 rounded-xl border border-line/10 bg-surface/5 p-1">
          {VISUALS.map((level) => (
            <button
              key={level}
              type="button"
              aria-pressed={visual === level}
              onClick={() => onVisual(level)}
              className={`flex-1 rounded-lg px-2 py-1.5 text-[12px] font-semibold transition-colors ${
                visual === level ? 'bg-accent/15 text-accent-soft' : 'text-fg3 hover:text-fg2'
              }`}
            >
              {t.visuals[level]}
            </button>
          ))}
        </div>
      </div>

      {/* ------------------------------ slayt tipi ------------------------------ */}
      <Select<SlideType>
        label={t.editor.slideType}
        value={slide.type}
        onChange={(type) => onSlide(convertSlideType(slide, type, deckLang))}
        options={SLIDE_TYPES.map((value) => ({ value, label: t.slideTypes[value] }))}
      />

      {/* ------------------------------- yerleşim ------------------------------- */}
      {variants.length > 1 ? (
        <div>
          <Label>{t.editor.template}</Label>
          <div className="grid grid-cols-2 gap-2">
            {variants.map((variant) => {
              const active = variant.id === slide.template
              // Yerleşim önizlemesi GERÇEK slaytla yapılır: kullanıcı kendi
              // içeriğinin o düzende nasıl duracağını görür.
              const preview: Slide = { ...slide, template: variant.id }
              return (
                <button
                  key={variant.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onSlide({ ...slide, template: variant.id })}
                  className={`overflow-hidden rounded-lg border text-left transition-all ${
                    active ? 'border-accent ring-2 ring-accent/25' : 'border-line/12 hover:border-accent/50'
                  }`}
                >
                  <SlideCanvas label={variant.name[uiLang]}>
                    <SlideRenderer slide={preview} theme={themeObject} lang={deckLang} visual={visual} />
                  </SlideCanvas>
                  <span className="block truncate px-2 py-1.5 text-[11px] text-fg3">{variant.name[uiLang]}</span>
                </button>
              )
            })}
          </div>
          <p className="mt-2 text-[11px] leading-snug text-fg4">
            {variants.find((v) => v.id === slide.template)?.hint[uiLang]}
          </p>
        </div>
      ) : null}
    </div>
  )
}
