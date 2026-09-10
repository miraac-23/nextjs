'use client'

/**
 * 3. adım — ince ayar.
 * Solda tasarım/bölüm/şablon kontrolleri, sağda büyük canlı önizleme.
 * Bölüm sırası HTML5 sürükle-bırak ile değiştirilir; dokunmatik cihazlarda
 * aynı işi yukarı/aşağı düğmeleri görür (sürükleme tek erişim yolu değildir).
 */

import { useState } from 'react'
import { PAPER } from '@/lib/cv/browser'
import { sectionHasContent } from '@/lib/cv/state'
import { getTemplate } from '@/lib/cv/templates'
import {
  SECTION_KEYS,
  type BulletStyle,
  type CvData,
  type CvSettings,
  type FontKey,
  type InkTone,
  type PaperTint,
  type PhotoShapeOverride,
  type SectionKey,
  type SkillStyleOverride,
} from '@/lib/cv/types'
import type { CvText } from '@/lib/cv/ui-text'
import type { Lang } from '@/lib/i18n/config'
import CvDocument from '../CvDocument'
import CvPaper from '../CvPaper'
import UiIcon from '../UiIcon'
import { Range, Segmented, Switch } from '../fields'
import TemplateStep from './TemplateStep'

/** Serbestçe seçilebilen vurgu renkleri — hepsi koyu zeminde de okunur tonlar. */
const SWATCHES = [
  '#1d4ed8', '#0891b2', '#0f766e', '#047857',
  '#4f46e5', '#7c3aed', '#db2777', '#dc2626',
  '#ea580c', '#b45309', '#334155', '#111827',
]

const FONT_OPTIONS: { id: FontKey; label: string; font: string }[] = [
  { id: 'sans', label: 'Aa', font: 'var(--font-sans), system-ui, sans-serif' },
  { id: 'serif', label: 'Aa', font: 'var(--font-serif), Georgia, serif' },
  { id: 'mono', label: 'Aa', font: 'var(--font-mono), ui-monospace, monospace' },
  { id: 'display', label: 'Aa', font: 'var(--font-display), system-ui, sans-serif' },
]

const PAPER_TINTS: PaperTint[] = ['template', 'white', 'cream', 'gray']
const INK_TONES: InkTone[] = ['template', 'slate', 'black', 'navy', 'warm']
const PHOTO_SHAPES: PhotoShapeOverride[] = ['', 'circle', 'square', 'rounded']
const SKILL_STYLES: SkillStyleOverride[] = ['', 'bar', 'dots', 'chips', 'text', 'ring']
const BULLET_STYLES: BulletStyle[] = ['dot', 'square', 'dash', 'arrow', 'check']

type Tab = 'design' | 'sections' | 'template'

type Props = {
  t: CvText
  lang: Lang
  data: CvData
  settings: CvSettings
  setSettings: (next: CvSettings) => void
  onTemplate: (id: string) => void
  onReset: () => void
}

export default function RefineStep({ t, lang, data, settings, setSettings, onTemplate, onReset }: Props) {
  const [tab, setTab] = useState<Tab>('design')
  const [pane, setPane] = useState<'form' | 'preview'>('form')
  const [zoom, setZoom] = useState<'fit' | '0.75' | '1'>('fit')
  const [dragging, setDragging] = useState<SectionKey | null>(null)
  const [over, setOver] = useState<SectionKey | null>(null)

  const tpl = getTemplate(settings.templateId)
  const set = (part: Partial<CvSettings>) => setSettings({ ...settings, ...part })

  function reorder(from: SectionKey, to: SectionKey) {
    if (from === to) return
    const next = [...settings.order]
    const i = next.indexOf(from)
    const j = next.indexOf(to)
    if (i < 0 || j < 0) return
    next.splice(i, 1)
    next.splice(j, 0, from)
    set({ order: next })
  }

  function shift(key: SectionKey, dir: -1 | 1) {
    const next = [...settings.order]
    const i = next.indexOf(key)
    const j = i + dir
    if (i < 0 || j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j], next[i]]
    set({ order: next })
  }

  function toggleHidden(key: SectionKey) {
    const hidden = settings.hidden.includes(key) ? settings.hidden.filter((k) => k !== key) : [...settings.hidden, key]
    set({ hidden })
  }

  function togglePageBreak(key: SectionKey) {
    const pageBreaks = settings.pageBreaks.includes(key)
      ? settings.pageBreaks.filter((k) => k !== key)
      : [...settings.pageBreaks, key]
    set({ pageBreaks })
  }

  const controls = (
    <>
      <div className="cvs-seg" role="group" aria-label={t.editor.title} style={{ marginBottom: '1rem' }}>
        <button type="button" aria-pressed={tab === 'design'} onClick={() => setTab('design')}>
          {t.editor.tabDesign}
        </button>
        <button type="button" aria-pressed={tab === 'sections'} onClick={() => setTab('sections')}>
          {t.editor.tabSections}
        </button>
        <button type="button" aria-pressed={tab === 'template'} onClick={() => setTab('template')}>
          {t.editor.tabTemplate}
        </button>
      </div>

      {tab === 'design' && (
        <div className="cvs-panel cvs-panel-pad">
          <div className="cvs-rows">
            {/* ------------------------------ renk ------------------------------ */}
            <h4 className="cvs-group-label">{t.editor.groupColor}</h4>

            <div className="cvs-field">
              <span>{t.editor.accent}</span>
              <div className="cvs-swatches">
                {SWATCHES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="cvs-swatch"
                    style={{ background: c }}
                    aria-pressed={settings.accent.toLowerCase() === c}
                    aria-label={c}
                    onClick={() => set({ accent: c })}
                  />
                ))}
                <input
                  type="color"
                  className="cvs-colorpick"
                  value={settings.accent}
                  onChange={(e) => set({ accent: e.target.value })}
                  aria-label={t.editor.accent}
                />
                <button type="button" className="cvs-btn sm" onClick={() => set({ accent: tpl.accent })}>
                  <UiIcon name="refresh" />
                  {t.editor.accentReset}
                </button>
              </div>
            </div>

            {/* Yan sütun rengi yalnızca raylı iskeletlerde bir şey ifade eder. */}
            {tpl.shell !== 'plain' && (
              <div className="cvs-field">
                <span>{t.editor.rail}</span>
                <div className="cvs-swatches">
                  <input
                    type="color"
                    className="cvs-colorpick"
                    value={settings.rail || tpl.rail || tpl.ink}
                    onChange={(e) => set({ rail: e.target.value })}
                    aria-label={t.editor.rail}
                  />
                  <button type="button" className="cvs-btn sm" onClick={() => set({ rail: '' })}>
                    <UiIcon name="refresh" />
                    {t.editor.railReset}
                  </button>
                </div>
              </div>
            )}

            <div className="cvs-field">
              <span>{t.editor.paperTint}</span>
              <Segmented
                wrap
                ariaLabel={t.editor.paperTint}
                value={settings.paperTint}
                onChange={(v) => set({ paperTint: v })}
                options={PAPER_TINTS.map((id) => ({ id, label: t.editor.paperTints[id] }))}
              />
            </div>

            <div className="cvs-field">
              <span>{t.editor.inkTone}</span>
              <Segmented
                wrap
                ariaLabel={t.editor.inkTone}
                value={settings.inkTone}
                onChange={(v) => set({ inkTone: v })}
                options={INK_TONES.map((id) => ({ id, label: t.editor.inkTones[id] }))}
              />
            </div>

            {/* ---------------------------- tipografi --------------------------- */}
            <h4 className="cvs-group-label">{t.editor.groupType}</h4>

            <div className="cvs-field">
              <span>{t.editor.font}</span>
              <Segmented
                ariaLabel={t.editor.font}
                value={settings.fontFamily}
                onChange={(v) => set({ fontFamily: v })}
                options={FONT_OPTIONS}
              />
              <small className="cvs-hint">{t.editor.fonts[settings.fontFamily]}</small>
            </div>

            <div className="cvs-field">
              <span>{t.editor.headingFont}</span>
              <Segmented
                ariaLabel={t.editor.headingFont}
                value={settings.headingFont}
                onChange={(v) => set({ headingFont: v })}
                options={FONT_OPTIONS}
              />
              <small className="cvs-hint">{t.editor.fonts[settings.headingFont]}</small>
            </div>

            <Range
              label={t.editor.fontScale}
              value={settings.fontScale}
              min={0.85}
              max={1.15}
              step={0.01}
              onChange={(v) => set({ fontScale: v })}
              format={(v) => `${Math.round(v * 100)}%`}
            />
            <Range
              label={t.editor.headingScale}
              value={settings.headingScale}
              min={0.8}
              max={1.3}
              step={0.01}
              onChange={(v) => set({ headingScale: v })}
              format={(v) => `${Math.round(v * 100)}%`}
            />
            <Range
              label={t.editor.lineHeight}
              value={settings.lineHeight}
              min={1.25}
              max={1.7}
              step={0.01}
              onChange={(v) => set({ lineHeight: v })}
              format={(v) => v.toFixed(2)}
            />
            <Range
              label={t.editor.letterSpacing}
              value={settings.letterSpacing}
              min={-0.02}
              max={0.06}
              step={0.005}
              onChange={(v) => set({ letterSpacing: v })}
              format={(v) => `${v > 0 ? '+' : ''}${(v * 1000).toFixed(0)}`}
            />

            {/* ----------------------------- yerleşim --------------------------- */}
            <h4 className="cvs-group-label">{t.editor.groupLayout}</h4>

            <Range
              label={t.editor.margin}
              value={settings.margin}
              min={0}
              max={24}
              step={1}
              onChange={(v) => set({ margin: v })}
              format={(v) => `${v} mm`}
            />
            <Range
              label={t.editor.sectionGap}
              value={settings.sectionGap}
              min={3}
              max={11}
              step={0.5}
              onChange={(v) => set({ sectionGap: v })}
              format={(v) => `${v} mm`}
            />

            <div className="cvs-field">
              <span>{t.editor.paper}</span>
              <Segmented
                ariaLabel={t.editor.paper}
                value={settings.paper}
                onChange={(v) => set({ paper: v })}
                options={[
                  { id: 'a4', label: 'A4' },
                  { id: 'letter', label: 'Letter' },
                ]}
              />
              <small className="cvs-hint">{PAPER[settings.paper].label}</small>
            </div>

            <Switch label={t.editor.justify} checked={settings.justify} onChange={(v) => set({ justify: v })} />

            {/* ----------------------------- fotoğraf --------------------------- */}
            <h4 className="cvs-group-label">{t.editor.groupPhoto}</h4>

            <Switch label={t.editor.photoToggle} checked={settings.showPhoto} onChange={(v) => set({ showPhoto: v })} />

            <div className="cvs-field">
              <span>{t.editor.photoShape}</span>
              <Segmented
                wrap
                ariaLabel={t.editor.photoShape}
                value={settings.photoShape}
                onChange={(v) => set({ photoShape: v })}
                options={PHOTO_SHAPES.map((id) => ({ id, label: t.editor.photoShapes[id] }))}
              />
              {tpl.photo === 'none' && !settings.photoShape && <small className="cvs-hint">{t.editor.photoNone}</small>}
            </div>

            <Range
              label={t.editor.photoSize}
              value={settings.photoSize}
              min={16}
              max={38}
              step={1}
              onChange={(v) => set({ photoSize: v })}
              format={(v) => `${v} mm`}
            />

            {/* ---------------------------- ayrıntılar -------------------------- */}
            <h4 className="cvs-group-label">{t.editor.groupDetails}</h4>

            <div className="cvs-field">
              <span>{t.editor.skillStyle}</span>
              <Segmented
                wrap
                ariaLabel={t.editor.skillStyle}
                value={settings.skillStyle}
                onChange={(v) => set({ skillStyle: v })}
                options={SKILL_STYLES.map((id) => ({ id, label: t.editor.skillStyles[id] }))}
              />
            </div>

            <div className="cvs-field">
              <span>{t.editor.bulletStyle}</span>
              <Segmented
                wrap
                ariaLabel={t.editor.bulletStyle}
                value={settings.bulletStyle}
                onChange={(v) => set({ bulletStyle: v })}
                options={BULLET_STYLES.map((id) => ({ id, label: t.editor.bulletStyles[id] }))}
              />
            </div>

            <Switch label={t.editor.iconsToggle} checked={settings.showIcons} onChange={(v) => set({ showIcons: v })} />

            <hr className="cvs-hr" />
            <button type="button" className="cvs-btn" onClick={onReset}>
              <UiIcon name="refresh" />
              {t.editor.reset}
            </button>
          </div>
        </div>
      )}

      {tab === 'sections' && (
        <div className="cvs-panel cvs-panel-pad">
          <h3 style={{ fontSize: '0.95rem', marginBottom: '0.35rem' }}>{t.editor.orderTitle}</h3>
          <p className="cvs-hint" style={{ marginBottom: '0.9rem' }}>
            {t.editor.orderHint}
          </p>

          <div className="cvs-order">
            {settings.order.map((key, i) => {
              const hidden = settings.hidden.includes(key)
              const breaks = settings.pageBreaks.includes(key)
              const filled = sectionHasContent(data, key)
              return (
                <div
                  key={key}
                  className="cvs-order-item"
                  draggable
                  data-dragging={dragging === key}
                  data-over={over === key && dragging !== key}
                  data-hidden={hidden}
                  data-break={breaks || undefined}
                  onDragStart={() => setDragging(key)}
                  onDragEnd={() => {
                    setDragging(null)
                    setOver(null)
                  }}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setOver(key)
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    if (dragging) reorder(dragging, key)
                    setDragging(null)
                    setOver(null)
                  }}
                >
                  <UiIcon name="grip" className="cvs-grip" />
                  <span className="cvs-order-name">{settings.labels[key]?.trim() || t.sections[key]}</span>
                  {!filled && <span className="cvs-order-tag">{t.editor.emptyBadge}</span>}
                  <button
                    type="button"
                    className="cvs-btn icon sm"
                    aria-label={t.form.moveUp}
                    title={t.form.moveUp}
                    disabled={i === 0}
                    onClick={() => shift(key, -1)}
                  >
                    <UiIcon name="up" />
                  </button>
                  <button
                    type="button"
                    className="cvs-btn icon sm"
                    aria-label={t.form.moveDown}
                    title={t.form.moveDown}
                    disabled={i === settings.order.length - 1}
                    onClick={() => shift(key, 1)}
                  >
                    <UiIcon name="down" />
                  </button>
                  <button
                    type="button"
                    className="cvs-btn icon sm"
                    aria-label={breaks ? t.editor.pageBreakOff : t.editor.pageBreakOn}
                    title={breaks ? t.editor.pageBreakOff : t.editor.pageBreakOn}
                    aria-pressed={breaks}
                    onClick={() => togglePageBreak(key)}
                  >
                    <UiIcon name="pageBreak" />
                  </button>
                  <button
                    type="button"
                    className="cvs-btn icon sm"
                    aria-label={hidden ? t.editor.show : t.editor.hide}
                    title={hidden ? t.editor.show : t.editor.hide}
                    onClick={() => toggleHidden(key)}
                  >
                    <UiIcon name={hidden ? 'eyeOff' : 'eye'} />
                  </button>
                </div>
              )
            })}
          </div>

          <hr className="cvs-hr" />

          <h3 style={{ fontSize: '0.95rem', marginBottom: '0.7rem' }}>{t.editor.rename}</h3>
          <div className="cvs-rows">
            {SECTION_KEYS.filter((k) => sectionHasContent(data, k)).map((k) => (
              <label className="cvs-field" key={k}>
                <span>{t.sections[k]}</span>
                <input
                  value={settings.labels[k] ?? ''}
                  placeholder={t.sections[k]}
                  onChange={(e) => set({ labels: { ...settings.labels, [k]: e.target.value } })}
                />
              </label>
            ))}
          </div>
        </div>
      )}

      {tab === 'template' && (
        <div className="cvs-panel cvs-panel-pad">
          <TemplateStep t={t} lang={lang} preview={data} settings={settings} onSelect={onTemplate} />
        </div>
      )}
    </>
  )

  return (
    <>
      <div className="cvs-panetabs">
        <button type="button" aria-pressed={pane === 'form'} onClick={() => setPane('form')}>
          {t.editor.tabDesign}
        </button>
        <button type="button" aria-pressed={pane === 'preview'} onClick={() => setPane('preview')}>
          {t.form.previewTab}
        </button>
      </div>

      <div className={`cvs-split editor${tab === 'template' ? ' wide' : ''}`}>
        <div className="cvs-pane" style={{ display: pane === 'form' ? 'block' : 'none' }}>{controls}</div>

        <div className="cvs-pane" style={{ display: pane === 'preview' ? 'block' : 'none' }}>
          <div className="cvs-sticky">
            <div className="cvs-stage">
              <div className="cvs-stage-bar">
                <span>{tpl.name}</span>
                <div className="cvs-actions">
                  <Segmented
                    ariaLabel={t.editor.zoom}
                    value={zoom}
                    onChange={setZoom}
                    options={[
                      { id: 'fit', label: t.editor.fit },
                      { id: '0.75', label: '75%' },
                      { id: '1', label: '100%' },
                    ]}
                  />
                </div>
              </div>
              <div className="cvs-scroll">
                <CvPaper paper={settings.paper} zoom={zoom === 'fit' ? 'fit' : Number(zoom)} pageLabel={(n) => String(n)}>
                  <CvDocument data={data} settings={settings} t={t} static />
                </CvPaper>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
