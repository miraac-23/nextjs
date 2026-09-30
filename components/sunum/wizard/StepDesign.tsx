'use client'

/**
 * Sihirbaz 4. adım — tasarım (§6).
 *
 * Tema seçimi GERÇEK slayt önizlemesi üzerinden yapılır: kartlarda renk lekesi
 * değil, kullanıcının kendi konusuyla oluşturulmuş bir kapak slaytı var. Aynı
 * SlideRenderer kullanıldığı için önizleme ile sonuç birebir aynı.
 */

import { useMemo } from 'react'
import { THEMES, getTheme, type ThemeId } from '@/lib/sunum/themes'
import { VISUALS, uid, type Slide, type SunumLang, type Visual } from '@/lib/sunum/types'
import type { SunumText } from '@/lib/sunum/ui-text'
import SlideCanvas from '../SlideCanvas'
import SlideRenderer from '../SlideRenderer'

type Props = {
  t: SunumText
  value: ThemeId
  onChange: (id: ThemeId) => void
  topic: string
  durationMinutes: number
  language: SunumLang
  themeLabelLang: 'tr' | 'en'
  visual: Visual
  onVisual: (v: Visual) => void
}

export default function StepDesign({
  t,
  value,
  onChange,
  topic,
  durationMinutes,
  language,
  themeLabelLang,
  visual,
  onVisual,
}: Props) {
  // Önizleme slaytı bir kez kurulur; tema değişince yeniden üretilmesine gerek yok.
  const sample = useMemo<Slide>(() => {
    const subtitle = language === 'en' ? `${durationMinutes}-minute talk` : `${durationMinutes} dakikalık sunum`
    return {
      id: uid('preview'),
      presentationId: 'preview',
      order: 0,
      type: 'title',
      template: 'title-01',
      title: topic.trim() || t.hero.placeholder,
      subtitle,
      content: {},
    }
  }, [topic, durationMinutes, language, t.hero.placeholder])

  return (
    <fieldset>
      <legend className="mb-4 text-[15px] font-semibold text-fg">{t.form.theme}</legend>

      {/* Görsel yoğunluk tema kartlarının ÜSTÜNDE: seçim anında kartlara yansıyor. */}
      <div className="mb-4">
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-fg3">{t.editor.visual}</p>
        <div className="flex gap-1 rounded-xl border border-line/10 bg-surface/5 p-1">
          {VISUALS.map((level) => (
            <button
              key={level}
              type="button"
              aria-pressed={visual === level}
              onClick={() => onVisual(level)}
              className={`flex-1 rounded-lg px-3 py-2 text-[12.5px] font-semibold transition-colors ${
                visual === level ? 'bg-accent/15 text-accent-soft' : 'text-fg3 hover:text-fg2'
              }`}
            >
              {t.visuals[level]}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-fg4">{t.editor.visualHint}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {THEMES.map((theme) => {
          const active = theme.id === value
          return (
            <button
              key={theme.id}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(theme.id)}
              className={`overflow-hidden rounded-2xl border text-left transition-all ${
                active
                  ? 'border-accent/70 ring-2 ring-accent/20'
                  : 'border-line/12 hover:-translate-y-0.5 hover:border-accent/40'
              }`}
            >
              <SlideCanvas label={theme.name[themeLabelLang]}>
                <SlideRenderer slide={sample} theme={getTheme(theme.id)} lang={language} visual={visual} />
              </SlideCanvas>
              <span className="flex items-center justify-between gap-2 px-3 py-2.5">
                <span className={`truncate text-[13px] font-semibold ${active ? 'text-accent-soft' : 'text-fg2'}`}>
                  {theme.name[themeLabelLang]}
                </span>
                <span className="flex flex-shrink-0 gap-1">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: theme.accent }} />
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: theme.accent2 }} />
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
