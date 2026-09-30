'use client'

/**
 * Seçili slaytın İÇERİK alanlarını düzenler.
 *
 * Her slayt tipi kendi dalında ele alınır ve `onSlide` ile yalnızca `content`
 * değiştirilerek geri döner — kimlik, sıra, şablon gibi teknik alanlara
 * dokunulmaz. `switch` ayrık birleşim üzerinde çalıştığı için yeni bir slayt
 * tipi eklendiğinde derleyici burayı da uyarır.
 */

import { LIMITS } from '@/lib/sunum/schema'
import {
  CHART_KINDS,
  SLIDE_GLYPHS,
  type ChartKind,
  type ArchLayer,
  type ChartPoint,
  type ProcessStep,
  type Slide,
  type SlideGlyph,
  type StatItem,
  type TimelineStep,
} from '@/lib/sunum/types'
import type { SunumText } from '@/lib/sunum/ui-text'
import MediaField from '../MediaField'
import { Area, Field, Select } from '../ui'
import ListEditor from './ListEditor'
import RowList, { MiniInput } from './RowList'

type Props = {
  slide: Slide
  onSlide: (slide: Slide) => void
  t: SunumText
}

/**
 * Görsel istemi için varsayılan konu: slaytın başlığı, varsa ilk maddesiyle
 * birlikte. Kullanıcı istem alanını boş bırakırsa üretim bu metni kullanır.
 */
function imageSuggest(title: string, bullets: string[]): string {
  const first = bullets.find((b) => b.trim().length > 0)
  return [title, first].filter(Boolean).join(' — ').trim()
}

export default function ContentEditor({ slide, onSlide, t }: Props) {
  const e = t.editor

  switch (slide.type) {
    case 'title':
      return (
        <>
          <Field
            label={e.presenter}
            value={slide.content.presenter ?? ''}
            onChange={(presenter) => onSlide({ ...slide, content: { ...slide.content, presenter: presenter || undefined } })}
          />
          <Field
            label={e.context}
            value={slide.content.context ?? ''}
            onChange={(context) => onSlide({ ...slide, content: { ...slide.content, context: context || undefined } })}
          />
        </>
      )

    case 'content':
      return (
        <ListEditor
          label={e.bullets}
          items={slide.content.bullets}
          onChange={(bullets) => onSlide({ ...slide, content: { bullets } })}
          addLabel={e.addBullet}
          removeLabel={e.remove}
          max={LIMITS.bullets}
        />
      )

    case 'conclusion':
      return (
        <>
          <ListEditor
            label={e.bullets}
            items={slide.content.bullets}
            onChange={(bullets) => onSlide({ ...slide, content: { ...slide.content, bullets } })}
            addLabel={e.addBullet}
            removeLabel={e.remove}
            max={LIMITS.bullets}
          />
          <Field
            label={e.cta}
            value={slide.content.cta ?? ''}
            onChange={(cta) => onSlide({ ...slide, content: { ...slide.content, cta: cta || undefined } })}
          />
        </>
      )

    case 'two-column':
    case 'comparison': {
      const { left, right } = slide.content
      return (
        <>
          <div className="rounded-xl border border-line/10 p-3">
            <Field
              label={`${e.leftColumn} · ${e.heading}`}
              value={left.heading}
              onChange={(heading) => onSlide({ ...slide, content: { ...slide.content, left: { ...left, heading } } })}
            />
            <div className="mt-3">
              <ListEditor
                label={e.bullets}
                items={left.bullets}
                onChange={(bullets) => onSlide({ ...slide, content: { ...slide.content, left: { ...left, bullets } } })}
                addLabel={e.addBullet}
                removeLabel={e.remove}
                max={LIMITS.bullets}
              />
            </div>
          </div>
          <div className="rounded-xl border border-line/10 p-3">
            <Field
              label={`${e.rightColumn} · ${e.heading}`}
              value={right.heading}
              onChange={(heading) => onSlide({ ...slide, content: { ...slide.content, right: { ...right, heading } } })}
            />
            <div className="mt-3">
              <ListEditor
                label={e.bullets}
                items={right.bullets}
                onChange={(bullets) => onSlide({ ...slide, content: { ...slide.content, right: { ...right, bullets } } })}
                addLabel={e.addBullet}
                removeLabel={e.remove}
                max={LIMITS.bullets}
              />
            </div>
          </div>
          {slide.type === 'comparison' ? (
            <Field
              label={e.verdict}
              value={slide.content.verdict ?? ''}
              onChange={(verdict) => onSlide({ ...slide, content: { ...slide.content, verdict: verdict || undefined } })}
            />
          ) : null}
        </>
      )
    }

    case 'statistics':
      return (
        <>
          <RowList<StatItem>
            label={e.stats}
            items={slide.content.stats}
            onChange={(stats) => onSlide({ ...slide, content: { ...slide.content, stats } })}
            addLabel={e.addStat}
            removeLabel={e.remove}
            blank={() => ({ value: '', label: '' })}
            max={LIMITS.stats}
          >
            {(stat, set) => (
              <>
                <MiniInput value={stat.value} onChange={(value) => set({ ...stat, value })} placeholder={e.statValue} />
                <MiniInput value={stat.label} onChange={(label) => set({ ...stat, label })} placeholder={e.statLabel} />
                <MiniInput
                  value={stat.caption ?? ''}
                  onChange={(caption) => set({ ...stat, caption: caption || undefined })}
                  placeholder={e.statCaption}
                />
              </>
            )}
          </RowList>
          <Field
            label={e.footnote}
            value={slide.content.footnote ?? ''}
            onChange={(footnote) => onSlide({ ...slide, content: { ...slide.content, footnote: footnote || undefined } })}
          />
        </>
      )

    case 'chart':
      return (
        <>
          <Select<ChartKind>
            label={e.chartType}
            value={slide.content.chartType}
            onChange={(chartType) => onSlide({ ...slide, content: { ...slide.content, chartType } })}
            options={CHART_KINDS.map((value) => ({ value, label: t.chartKinds[value] }))}
          />
          <Field
            label={e.unit}
            value={slide.content.unit ?? ''}
            onChange={(unit) => onSlide({ ...slide, content: { ...slide.content, unit: unit || undefined } })}
          />
          <RowList<ChartPoint>
            label={e.chartData}
            items={slide.content.points}
            onChange={(points) => onSlide({ ...slide, content: { ...slide.content, points } })}
            addLabel={e.addPoint}
            removeLabel={e.remove}
            blank={() => ({ label: '', value: 0 })}
            max={LIMITS.chartPoints}
          >
            {(point, set) => (
              <div className="grid grid-cols-[1fr_88px] gap-2">
                <MiniInput value={point.label} onChange={(label) => set({ ...point, label })} placeholder={e.chartLabel} />
                <MiniInput
                  type="number"
                  value={String(point.value)}
                  onChange={(raw) => {
                    // Boş alan 0 sayılır; şema sonlu sayı bekler.
                    const next = Number(raw)
                    set({ ...point, value: Number.isFinite(next) ? next : 0 })
                  }}
                  placeholder={e.chartValue}
                />
              </div>
            )}
          </RowList>
          <Field
            label={e.caption}
            value={slide.content.caption ?? ''}
            onChange={(caption) => onSlide({ ...slide, content: { ...slide.content, caption: caption || undefined } })}
          />
        </>
      )

    case 'timeline':
      return (
        <RowList<TimelineStep>
          label={e.steps}
          items={slide.content.steps}
          onChange={(steps) => onSlide({ ...slide, content: { steps } })}
          addLabel={e.addStep}
          removeLabel={e.remove}
          blank={() => ({ label: '', title: '' })}
          max={LIMITS.steps}
        >
          {(step, set) => (
            <>
              <MiniInput value={step.label} onChange={(label) => set({ ...step, label })} placeholder={e.stepLabel} />
              <MiniInput value={step.title} onChange={(title) => set({ ...step, title })} placeholder={e.stepTitle} />
              <MiniInput
                value={step.description ?? ''}
                onChange={(description) => set({ ...step, description: description || undefined })}
                placeholder={e.stepDescription}
              />
            </>
          )}
        </RowList>
      )

    case 'process':
      return (
        <RowList<ProcessStep>
          label={e.steps}
          items={slide.content.steps}
          onChange={(steps) => onSlide({ ...slide, content: { steps } })}
          addLabel={e.addStep}
          removeLabel={e.remove}
          blank={() => ({ title: '' })}
          max={LIMITS.steps}
        >
          {(step, set) => (
            <>
              <MiniInput value={step.title} onChange={(title) => set({ ...step, title })} placeholder={e.stepTitle} />
              <MiniInput
                value={step.description ?? ''}
                onChange={(description) => set({ ...step, description: description || undefined })}
                placeholder={e.stepDescription}
              />
            </>
          )}
        </RowList>
      )

    case 'architecture':
      return (
        <>
          <RowList<ArchLayer>
            label={e.layers}
            items={slide.content.layers}
            onChange={(layers) => onSlide({ ...slide, content: { ...slide.content, layers } })}
            addLabel={e.addLayer}
            removeLabel={e.remove}
            blank={() => ({ name: '', nodes: [] })}
            max={LIMITS.layers}
          >
            {(layer, set) => (
              <>
                <MiniInput value={layer.name} onChange={(name) => set({ ...layer, name })} placeholder={e.layerName} />
                <MiniInput
                  value={layer.nodes.join(', ')}
                  onChange={(raw) =>
                    set({
                      ...layer,
                      nodes: raw
                        .split(',')
                        .map((n) => n.trim())
                        .filter(Boolean)
                        .slice(0, LIMITS.nodes),
                    })
                  }
                  placeholder={e.nodes}
                />
              </>
            )}
          </RowList>
          <Field
            label={e.note}
            value={slide.content.note ?? ''}
            onChange={(note) => onSlide({ ...slide, content: { ...slide.content, note: note || undefined } })}
          />
        </>
      )

    case 'image':
      return (
        <>
          <MediaField
            t={t}
            value={slide.content.src}
            onChange={(src) => onSlide({ ...slide, content: { ...slide.content, src } })}
            suggest={imageSuggest(slide.title, slide.content.bullets)}
          />
          <Select<SlideGlyph>
            label={e.glyph}
            value={slide.content.glyph}
            onChange={(glyph) => onSlide({ ...slide, content: { ...slide.content, glyph } })}
            options={SLIDE_GLYPHS.map((value) => ({ value, label: t.glyphs[value] }))}
          />
          <ListEditor
            label={e.bullets}
            items={slide.content.bullets}
            onChange={(bullets) => onSlide({ ...slide, content: { ...slide.content, bullets } })}
            addLabel={e.addBullet}
            removeLabel={e.remove}
            max={LIMITS.bullets}
          />
          <Field
            label={e.caption}
            value={slide.content.caption ?? ''}
            onChange={(caption) => onSlide({ ...slide, content: { ...slide.content, caption: caption || undefined } })}
          />
        </>
      )

    case 'quote':
      return (
        <>
          <Area
            label={e.quoteText}
            value={slide.content.text}
            onChange={(text) => onSlide({ ...slide, content: { ...slide.content, text } })}
            rows={4}
            maxLength={600}
          />
          <Field
            label={e.quoteAuthor}
            value={slide.content.author ?? ''}
            onChange={(author) => onSlide({ ...slide, content: { ...slide.content, author: author || undefined } })}
          />
          <Field
            label={e.quoteRole}
            value={slide.content.role ?? ''}
            onChange={(role) => onSlide({ ...slide, content: { ...slide.content, role: role || undefined } })}
          />
        </>
      )

    default: {
      const exhaustive: never = slide
      void exhaustive
      return null
    }
  }
}
