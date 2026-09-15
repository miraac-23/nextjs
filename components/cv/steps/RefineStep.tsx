'use client'

/**
 * 3. adım — ince ayar.
 * Solda tasarım/bölüm/şablon kontrolleri, sağda büyük canlı önizleme.
 * Bölüm sırası HTML5 sürükle-bırak ile değiştirilir; dokunmatik cihazlarda
 * aynı işi yukarı/aşağı düğmeleri görür (sürükleme tek erişim yolu değildir).
 *
 * İKİ AİLE — Tasarım sekmesi seçili şablonun ailesine göre değişir:
 *   design → özgün görsel kontroller (DESIGN_LIMITS). Üstte "ATS etkisi" kartı,
 *            riskli seçeneklerin (fotoğraf, gösterge, ikon, font, sütun) yanında
 *            skoru düşürdüklerini söyleyen küçük uyarılar ve ATS şablonuna geçiş düğmesi.
 *   ats    → ATS'yi bozabilecek hiçbir seçenek yoktur: kolon, fotoğraf, ikon, skill bar,
 *            arka plan tonu yok; font listesi standart fontlarla, boyut ve boşluklar
 *            ATS_LIMITS ile sınırlıdır. Hazır vurgu tonlarının hepsi beyaz zeminde
 *            ≥4.5:1 kontrastlıdır; serbest seçilen renk bu eşiğin altındaysa uyarılır.
 * Belge dili ve kâğıt her iki ailede ortaktır.
 */

import { useEffect, useState } from 'react'
import { PAPER } from '@/lib/cv/browser'
import { DOC_TEXT, type DocLang } from '@/lib/cv/doc-text'
import { sectionHasContent } from '@/lib/cv/state'
import {
  RECOMMENDED_ATS_TEMPLATE_ID,
  getTemplate,
  isAtsTemplate,
  type AtsTemplate,
  type DesignTemplate,
} from '@/lib/cv/templates'
import {
  ATS_FONT_KEYS,
  ATS_LIMITS,
  DESIGN_FONT_KEYS,
  DESIGN_LIMITS,
  FONT_STACKS,
  SECTION_KEYS,
  isAtsFont,
  type BulletStyle,
  type ContactSeparator,
  type CvData,
  type CvSettings,
  type DateFormat,
  type DatePosition,
  type EntryOrder,
  type FontKey,
  type HeaderAlign,
  type HeadingStyle,
  type InkTone,
  type PaperTint,
  type PhotoShapeOverride,
  type SectionKey,
  type SkillStyleOverride,
} from '@/lib/cv/types'
import { cvText, type CvText } from '@/lib/cv/ui-text'
import type { Lang } from '@/lib/i18n/config'
import CvDocument from '../CvDocument'
import CvPaper from '../CvPaper'
import UiIcon from '../UiIcon'
import { Range, Segmented, Switch } from '../fields'
import TemplateStep from './TemplateStep'

/**
 * ATS ailesi — profesyonel, koyu vurgu tonları. Beyaz zemin üzerindeki kontrast oranları
 * (WCAG göreli parlaklık formülüyle hesaplandı): lacivert 10.4, mavi 6.7, petrol 7.3,
 * deniz yeşili 5.5, zümrüt 5.5, çivit 9.9, mor 9.0, bordo 8.0, kiremit 7.3,
 * hardal 6.9, füme 10.4, antrasit 17.7 — hepsi ≥4.5:1.
 */
const ATS_SWATCHES = [
  '#1e3a8a', '#1d4ed8', '#155e75', '#0f766e',
  '#047857', '#3730a3', '#5b21b6', '#9f1239',
  '#9a3412', '#854d0e', '#334155', '#111827',
]

/** Design ailesi — serbestçe seçilebilen vurgu renkleri; hepsi koyu zeminde de okunur tonlar. */
const DESIGN_SWATCHES = [
  '#1d4ed8', '#0891b2', '#0f766e', '#047857',
  '#4f46e5', '#7c3aed', '#db2777', '#dc2626',
  '#ea580c', '#b45309', '#334155', '#111827',
]

/** WCAG kontrast eşiği (normal metin). */
const MIN_CONTRAST = 4.5

type FontOption = { id: FontKey; label: string; font: string; title?: string }

/** ATS standart fontları — düğme kendi adıyla ve kendi fontuyla yazılır. */
const ATS_FONT_OPTIONS: FontOption[] = ATS_FONT_KEYS.map((k) => ({
  id: k,
  label: FONT_STACKS[k].label,
  font: FONT_STACKS[k].css,
}))

const HEADING_STYLES: HeadingStyle[] = ['rule', 'caps-rule', 'caps', 'overline', 'underline', 'smallcaps', 'plain']
const HEADER_ALIGNS: HeaderAlign[] = ['left', 'center']
const DATE_POSITIONS: DatePosition[] = ['right', 'inline']
const ENTRY_ORDERS: EntryOrder[] = ['title-first', 'company-first']
const ATS_BULLET_STYLES: BulletStyle[] = ['dot', 'dash']
const DESIGN_BULLET_STYLES: BulletStyle[] = ['dot', 'square', 'dash', 'arrow', 'check']
const DOC_LANGS: DocLang[] = ['tr', 'en']

const PAPER_TINTS: PaperTint[] = ['template', 'white', 'cream', 'gray']
const INK_TONES: InkTone[] = ['template', 'slate', 'black', 'navy', 'warm']
const PHOTO_SHAPES: PhotoShapeOverride[] = ['', 'circle', 'square', 'rounded']
const SKILL_STYLES: SkillStyleOverride[] = ['', 'bar', 'dots', 'chips', 'text', 'ring']
/** ATS'nin okuyamadığı grafik göstergeler. */
const METER_STYLES: string[] = ['bar', 'dots', 'ring']

export type RefineTab = 'design' | 'sections' | 'template'

type Props = {
  t: CvText
  lang: Lang
  data: CvData
  settings: CvSettings
  setSettings: (next: CvSettings) => void
  onTemplate: (id: string) => void
  onReset: () => void
  /** Açılışta (ve değiştiğinde) gösterilecek sekme — ATS skorundaki "düzelt" bağlantıları kullanır. */
  initialTab?: RefineTab
}

/** "#rrggbb" / "#rgb" rengin beyaz zemindeki kontrast oranı; çözülemezse null. */
function contrastOnWhite(hex: string): number | null {
  const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(hex.trim())
  if (!m) return null
  let h = m[1]
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const ch = [0, 2, 4].map((i) => {
    const v = parseInt(h.substr(i, 2), 16) / 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  })
  const lum = 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]
  return 1.05 / (lum + 0.05)
}

/** 19 → "19", 19.2 → "19.2" (kayan nokta artıklarını da temizler). */
const num = (v: number, digits = 1) => String(Math.round(v * Math.pow(10, digits)) / Math.pow(10, digits))

const lower = (v: string) => v.trim().toLocaleLowerCase('tr-TR')

/** Riskli kontrolün altındaki küçük "ATS skorunu düşürür" satırı. */
function Risk({ text }: { text: string }) {
  return (
    <small className="cvs-hint warn risk" role="status">
      <UiIcon name="warn" />
      <span>{text}</span>
    </small>
  )
}

type ControlProps = {
  t: CvText
  data: CvData
  settings: CvSettings
  set: (part: Partial<CvSettings>) => void
  onTemplate: (id: string) => void
  onReset: () => void
}

/* ================================ ortak parçalar ================================ */

function DocLangField({ t, settings, set }: Pick<ControlProps, 't' | 'settings' | 'set'>) {
  return (
    <>
      <h4 className="cvs-group-label">{t.editor.groupLang}</h4>
      <div className="cvs-field">
        <span>{t.editor.docLang}</span>
        <Segmented
          ariaLabel={t.editor.docLang}
          value={settings.docLang}
          onChange={(v) => set({ docLang: v })}
          options={DOC_LANGS.map((id) => ({ id, label: t.editor.docLangs[id] }))}
        />
        <small className="cvs-hint">{t.editor.docLangHint}</small>
      </div>
    </>
  )
}

function PaperField({ t, settings, set }: Pick<ControlProps, 't' | 'settings' | 'set'>) {
  return (
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
  )
}

function ResetButton({ t, onReset }: Pick<ControlProps, 't' | 'onReset'>) {
  return (
    <>
      <hr className="cvs-hr" />
      <button type="button" className="cvs-btn" onClick={onReset}>
        <UiIcon name="refresh" />
        {t.editor.reset}
      </button>
    </>
  )
}

/* ================================ design ailesi ================================ */

function DesignControls({ t, data, settings, set, onTemplate, onReset, tpl }: ControlProps & { tpl: DesignTemplate }) {
  const designFontOptions: FontOption[] = DESIGN_FONT_KEYS.map((k) => ({
    id: k,
    label: 'Aa',
    font: FONT_STACKS[k].css,
    title: t.editor.fonts[k],
  }))

  const skillEffective = settings.skillStyle || tpl.skill
  const photoShape = settings.photoShape || tpl.photo
  // Risk uyarıları yalnızca seçenek gerçekten belgeye basılıyorsa görünür.
  const photoRisk = settings.showPhoto && photoShape !== 'none' && !!data.profile.photo
  const meterRisk = METER_STYLES.indexOf(skillEffective) >= 0
  const columnsRisk = tpl.shell !== 'plain' || tpl.body === 'duo'

  const fontField = (key: 'fontFamily' | 'headingFont', label: string) => (
    <div className="cvs-field">
      <span>{label}</span>
      <small className="cvs-fontrow-label">{t.editor.fontRowDesign}</small>
      <Segmented<FontKey>
        ariaLabel={`${label} · ${t.editor.fontRowDesign}`}
        value={settings[key]}
        onChange={(v) => set({ [key]: v } as Partial<CvSettings>)}
        options={designFontOptions}
      />
      <small className="cvs-fontrow-label" data-ats="">
        <UiIcon name="shieldCheck" />
        {t.editor.fontRowAts}
      </small>
      <Segmented<FontKey>
        className="cvs-fontgrid"
        ariaLabel={`${label} · ${t.editor.fontRowAts}`}
        value={settings[key]}
        onChange={(v) => set({ [key]: v } as Partial<CvSettings>)}
        options={ATS_FONT_OPTIONS}
      />
      <small className="cvs-hint">{t.editor.fonts[settings[key]]}</small>
      {!isAtsFont(settings[key]) && <Risk text={t.editor.atsImpact.font} />}
    </div>
  )

  return (
    <div className="cvs-rows">
      <div className="cvs-impact" role="note">
        <div className="cvs-impact-head">
          <UiIcon name="warn" />
          <div>
            <b>{t.editor.atsImpact.title}</b>
            <p>{t.editor.atsImpact.desc}</p>
          </div>
        </div>
        <button type="button" className="cvs-btn sm" onClick={() => onTemplate(RECOMMENDED_ATS_TEMPLATE_ID)}>
          <UiIcon name="shieldCheck" />
          {t.editor.atsImpact.action}
        </button>
      </div>

      <DocLangField t={t} settings={settings} set={set} />

      {/* ------------------------------ renk ------------------------------ */}
      <h4 className="cvs-group-label">{t.editor.groupColor}</h4>

      <div className="cvs-field">
        <span>{t.editor.accent}</span>
        <div className="cvs-swatches">
          {DESIGN_SWATCHES.map((c) => (
            <button
              key={c}
              type="button"
              className="cvs-swatch"
              style={{ background: c }}
              aria-pressed={settings.accent.toLowerCase() === c}
              aria-label={c}
              title={c}
              onClick={() => set({ accent: c })}
            />
          ))}
          <input
            type="color"
            className="cvs-colorpick"
            value={/^#[0-9a-f]{6}$/i.test(settings.accent) ? settings.accent : tpl.accent}
            onChange={(e) => set({ accent: e.target.value })}
            aria-label={t.editor.accent}
          />
          <button
            type="button"
            className="cvs-btn sm"
            disabled={settings.accent.toLowerCase() === tpl.accent.toLowerCase()}
            onClick={() => set({ accent: tpl.accent })}
          >
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
            <button type="button" className="cvs-btn sm" disabled={!settings.rail} onClick={() => set({ rail: '' })}>
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

      {fontField('fontFamily', t.editor.font)}
      {fontField('headingFont', t.editor.headingFont)}

      <Range
        label={t.editor.fontScale}
        value={settings.fontScale}
        min={DESIGN_LIMITS.fontScale.min}
        max={DESIGN_LIMITS.fontScale.max}
        step={DESIGN_LIMITS.fontScale.step}
        onChange={(v) => set({ fontScale: v })}
        format={(v) => `${Math.round(v * 100)}%`}
      />
      <Range
        label={t.editor.headingScale}
        value={settings.headingScale}
        min={DESIGN_LIMITS.headingScale.min}
        max={DESIGN_LIMITS.headingScale.max}
        step={DESIGN_LIMITS.headingScale.step}
        onChange={(v) => set({ headingScale: v })}
        format={(v) => `${Math.round(v * 100)}%`}
      />
      <Range
        label={t.editor.lineHeight}
        value={settings.lineHeight}
        min={DESIGN_LIMITS.lineHeight.min}
        max={DESIGN_LIMITS.lineHeight.max}
        step={DESIGN_LIMITS.lineHeight.step}
        onChange={(v) => set({ lineHeight: v })}
        format={(v) => v.toFixed(2)}
      />
      <Range
        label={t.editor.letterSpacing}
        value={settings.letterSpacing}
        min={DESIGN_LIMITS.letterSpacing.min}
        max={DESIGN_LIMITS.letterSpacing.max}
        step={DESIGN_LIMITS.letterSpacing.step}
        onChange={(v) => set({ letterSpacing: v })}
        format={(v) => `${v > 0 ? '+' : ''}${(v * 1000).toFixed(0)}`}
      />

      {/* ----------------------------- yerleşim --------------------------- */}
      <h4 className="cvs-group-label">{t.editor.groupLayout}</h4>
      {columnsRisk && <Risk text={t.editor.atsImpact.columns} />}

      <Range
        label={t.editor.margin}
        value={settings.margin}
        min={DESIGN_LIMITS.margin.min}
        max={DESIGN_LIMITS.margin.max}
        step={DESIGN_LIMITS.margin.step}
        onChange={(v) => set({ margin: v })}
        format={(v) => `${v} mm`}
      />
      <Range
        label={t.editor.sectionGap}
        value={settings.sectionGap}
        min={DESIGN_LIMITS.sectionGap.min}
        max={DESIGN_LIMITS.sectionGap.max}
        step={DESIGN_LIMITS.sectionGap.step}
        onChange={(v) => set({ sectionGap: v })}
        format={(v) => `${num(v)} mm`}
      />

      <PaperField t={t} settings={settings} set={set} />

      <Switch label={t.editor.justify} checked={settings.justify} onChange={(v) => set({ justify: v })} />

      {/* ----------------------------- fotoğraf --------------------------- */}
      <h4 className="cvs-group-label">{t.editor.groupPhoto}</h4>

      <div className="cvs-field">
        <Switch label={t.editor.photoToggle} checked={settings.showPhoto} onChange={(v) => set({ showPhoto: v })} />
        {photoRisk && <Risk text={t.editor.atsImpact.photo} />}
      </div>

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
        min={DESIGN_LIMITS.photoSize.min}
        max={DESIGN_LIMITS.photoSize.max}
        step={DESIGN_LIMITS.photoSize.step}
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
        {meterRisk && <Risk text={t.editor.atsImpact.meters} />}
      </div>

      <div className="cvs-field">
        <span>{t.editor.bulletStyle}</span>
        <Segmented
          wrap
          ariaLabel={t.editor.bulletStyle}
          value={settings.bulletStyle}
          onChange={(v) => set({ bulletStyle: v })}
          options={DESIGN_BULLET_STYLES.map((id) => ({ id, label: t.editor.bulletStyles[id] }))}
        />
      </div>

      <div className="cvs-field">
        <Switch label={t.editor.iconsToggle} checked={settings.showIcons} onChange={(v) => set({ showIcons: v })} />
        {settings.showIcons && <Risk text={t.editor.atsImpact.icons} />}
      </div>

      <ResetButton t={t} onReset={onReset} />
    </div>
  )
}

/* ================================== ATS ailesi ================================== */

function AtsControls({ t, settings, set, onReset, tpl }: ControlProps & { tpl: AtsTemplate }) {
  const doc = DOC_TEXT[settings.docLang] ?? DOC_TEXT.tr
  const contrast = contrastOnWhite(settings.accent)
  const lowContrast = contrast !== null && contrast < MIN_CONTRAST

  return (
    <div className="cvs-rows">
      <div className="cvs-atsnote">
        <UiIcon name="shieldCheck" />
        <div>
          <b>{t.editor.atsSafeTitle}</b>
          <p>{t.editor.atsSafeDesc}</p>
        </div>
      </div>

      <DocLangField t={t} settings={settings} set={set} />

      {/* ------------------------------ renk ------------------------------ */}
      <h4 className="cvs-group-label">{t.editor.groupColor}</h4>

      <div className="cvs-field">
        <span>{t.editor.accent}</span>
        <div className="cvs-swatches">
          {ATS_SWATCHES.map((c) => (
            <button
              key={c}
              type="button"
              className="cvs-swatch"
              style={{ background: c }}
              aria-pressed={settings.accent.toLowerCase() === c}
              aria-label={c}
              title={c}
              onClick={() => set({ accent: c })}
            />
          ))}
          <input
            type="color"
            className="cvs-colorpick"
            value={/^#[0-9a-f]{6}$/i.test(settings.accent) ? settings.accent : tpl.accent}
            onChange={(e) => set({ accent: e.target.value })}
            aria-label={t.editor.accent}
          />
          <button
            type="button"
            className="cvs-btn sm"
            disabled={settings.accent.toLowerCase() === tpl.accent.toLowerCase()}
            onClick={() => set({ accent: tpl.accent })}
          >
            <UiIcon name="refresh" />
            {t.editor.accentReset}
          </button>
        </div>
        <small className="cvs-hint">{t.editor.accentHint}</small>
        {lowContrast && contrast !== null && (
          <small className="cvs-hint warn" role="status">
            <UiIcon name="warn" />
            <span>{t.editor.accentLowContrast(contrast.toFixed(1))}</span>
          </small>
        )}
      </div>

      {/* ---------------------------- tipografi --------------------------- */}
      <h4 className="cvs-group-label">{t.editor.groupType}</h4>

      <div className="cvs-field">
        <span>{t.editor.font}</span>
        <Segmented<FontKey>
          className="cvs-fontgrid"
          ariaLabel={t.editor.font}
          value={settings.fontFamily}
          onChange={(v) => set({ fontFamily: v })}
          options={ATS_FONT_OPTIONS}
        />
      </div>

      <div className="cvs-field">
        <span>{t.editor.headingFont}</span>
        <Segmented<FontKey>
          className="cvs-fontgrid"
          ariaLabel={t.editor.headingFont}
          value={settings.headingFont}
          onChange={(v) => set({ headingFont: v })}
          options={ATS_FONT_OPTIONS}
        />
        <small className="cvs-hint">{t.editor.fontHint}</small>
      </div>

      <Range
        label={t.editor.bodySize}
        value={settings.bodySize}
        min={ATS_LIMITS.bodySize.min}
        max={ATS_LIMITS.bodySize.max}
        step={ATS_LIMITS.bodySize.step}
        onChange={(v) => set({ bodySize: v })}
        format={(v) => `${num(v)} pt`}
      />
      <Range
        label={t.editor.headingSize}
        value={settings.headingSize}
        min={ATS_LIMITS.headingSize.min}
        max={ATS_LIMITS.headingSize.max}
        step={ATS_LIMITS.headingSize.step}
        onChange={(v) => set({ headingSize: v })}
        format={(v) => `${num(v)} pt`}
      />
      <Range
        label={t.editor.nameSize}
        value={settings.nameSize}
        min={ATS_LIMITS.nameSize.min}
        max={ATS_LIMITS.nameSize.max}
        step={ATS_LIMITS.nameSize.step}
        onChange={(v) => set({ nameSize: v })}
        format={(v) => `${num(v)} pt`}
      />
      <Range
        label={t.editor.lineHeight}
        value={settings.lineHeight}
        min={ATS_LIMITS.lineHeight.min}
        max={ATS_LIMITS.lineHeight.max}
        step={ATS_LIMITS.lineHeight.step}
        onChange={(v) => set({ lineHeight: v })}
        format={(v) => v.toFixed(2)}
      />

      {/* ----------------------------- yerleşim --------------------------- */}
      <h4 className="cvs-group-label">{t.editor.groupLayout}</h4>

      <Range
        label={t.editor.margin}
        value={settings.margin}
        min={ATS_LIMITS.margin.min}
        max={ATS_LIMITS.margin.max}
        step={ATS_LIMITS.margin.step}
        onChange={(v) => set({ margin: v })}
        format={(v) => `${num(v)} mm · ${(v / 25.4).toFixed(2)} in`}
      />
      <Range
        label={t.editor.sectionGap}
        value={settings.sectionGap}
        min={ATS_LIMITS.sectionGap.min}
        max={ATS_LIMITS.sectionGap.max}
        step={ATS_LIMITS.sectionGap.step}
        onChange={(v) => set({ sectionGap: v })}
        format={(v) => `${num(v)} mm`}
      />

      <PaperField t={t} settings={settings} set={set} />

      <div className="cvs-field">
        <span>{t.editor.headingStyle}</span>
        <Segmented
          wrap
          ariaLabel={t.editor.headingStyle}
          value={settings.headingStyle}
          onChange={(v) => set({ headingStyle: v })}
          options={HEADING_STYLES.map((id) => ({ id, label: t.editor.headingStyles[id] }))}
        />
      </div>

      <div className="cvs-row-2">
        <div className="cvs-field">
          <span>{t.editor.headerAlign}</span>
          <Segmented
            ariaLabel={t.editor.headerAlign}
            value={settings.headerAlign}
            onChange={(v) => set({ headerAlign: v })}
            options={HEADER_ALIGNS.map((id) => ({ id, label: t.editor.headerAligns[id] }))}
          />
        </div>
        <div className="cvs-field">
          <span>{t.editor.contactSeparator}</span>
          <Segmented<ContactSeparator>
            ariaLabel={t.editor.contactSeparator}
            value={settings.contactSeparator}
            onChange={(v) => set({ contactSeparator: v })}
            options={[
              { id: 'pipe', label: '|' },
              { id: 'bullet', label: '•' },
            ]}
          />
        </div>
      </div>

      <div className="cvs-row-2">
        <div className="cvs-field">
          <span>{t.editor.dateFormat}</span>
          <Segmented<DateFormat>
            ariaLabel={t.editor.dateFormat}
            value={settings.dateFormat}
            onChange={(v) => set({ dateFormat: v })}
            options={[
              { id: 'numeric', label: '01/2024' },
              { id: 'short', label: `${doc.months[0]} 2024` },
            ]}
          />
        </div>
        <div className="cvs-field">
          <span>{t.editor.datePosition}</span>
          <Segmented
            ariaLabel={t.editor.datePosition}
            value={settings.datePosition}
            onChange={(v) => set({ datePosition: v })}
            options={DATE_POSITIONS.map((id) => ({ id, label: t.editor.datePositions[id] }))}
          />
        </div>
      </div>

      <div className="cvs-row-2">
        <div className="cvs-field">
          <span>{t.editor.entryOrder}</span>
          <Segmented
            wrap
            ariaLabel={t.editor.entryOrder}
            value={settings.entryOrder}
            onChange={(v) => set({ entryOrder: v })}
            options={ENTRY_ORDERS.map((id) => ({ id, label: t.editor.entryOrders[id] }))}
          />
        </div>
        <div className="cvs-field">
          <span>{t.editor.bulletStyle}</span>
          <Segmented
            ariaLabel={t.editor.bulletStyle}
            // ATS ailesi yalnızca nokta/tire basar; görselden gelen diğer işaretler nokta sayılır.
            value={settings.bulletStyle === 'dash' ? 'dash' : 'dot'}
            onChange={(v) => set({ bulletStyle: v })}
            options={ATS_BULLET_STYLES.map((id) => ({ id, label: t.editor.bulletStyles[id] }))}
          />
        </div>
      </div>

      <ResetButton t={t} onReset={onReset} />
    </div>
  )
}

/* ==================================== adım ==================================== */

export default function RefineStep({ t, lang, data, settings, setSettings, onTemplate, onReset, initialTab }: Props) {
  const [tab, setTab] = useState<RefineTab>(initialTab ?? 'design')
  const [pane, setPane] = useState<'form' | 'preview'>('form')
  const [zoom, setZoom] = useState<'fit' | '0.75' | '1'>('fit')
  const [dragging, setDragging] = useState<SectionKey | null>(null)
  const [over, setOver] = useState<SectionKey | null>(null)

  // "Düzelt" bağlantısı başka bir sekmeyi işaret ederse (bileşen zaten açıkken de) ona geçilir.
  useEffect(() => {
    if (!initialTab) return
    setTab(initialTab)
    setPane('form')
  }, [initialTab])

  const tpl = getTemplate(settings.templateId)
  const ats = isAtsTemplate(tpl)
  const doc = DOC_TEXT[settings.docLang] ?? DOC_TEXT.tr
  // Görsel şablon başlıkları belge dilindeki arayüz metinlerinden (cvText(docLang).sections) basar.
  const docUi = cvText(settings.docLang)
  const set = (part: Partial<CvSettings>) => setSettings({ ...settings, ...part })

  /** Belgede o bölüm için basılacak standart başlık (özel başlık yoksa). */
  const standardHeading = (key: SectionKey) => (ats ? doc.headings[key] : docUi.sections[key])

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

  /**
   * Özel başlık standart başlıklardan farklı mı? (Boş = standart.) Belge dilindeki
   * ATS başlığı, arayüz dilindeki ve belge dilindeki bölüm adları standart sayılır.
   */
  function isNonStandard(key: SectionKey): boolean {
    const custom = lower(settings.labels[key] ?? '')
    if (!custom) return false
    return [doc.headings[key], t.sections[key], docUi.sections[key]].every((h) => lower(h) !== custom)
  }

  function clearLabel(key: SectionKey) {
    const labels = { ...settings.labels }
    delete labels[key]
    set({ labels })
  }

  const controlProps: ControlProps = { t, data, settings, set, onTemplate, onReset }

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
          {isAtsTemplate(tpl) ? <AtsControls {...controlProps} tpl={tpl} /> : <DesignControls {...controlProps} tpl={tpl} />}
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
                  {/* Belgede görünecek başlık gösterilir: özel başlık ya da şablonun standart başlığı. */}
                  <span className="cvs-order-name">{settings.labels[key]?.trim() || standardHeading(key)}</span>
                  {isNonStandard(key) && (
                    <span className="cvs-order-warn" title={t.editor.nonStandard} aria-label={t.editor.nonStandard}>
                      <UiIcon name="warn" />
                    </span>
                  )}
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

          <h3 style={{ fontSize: '0.95rem', marginBottom: '0.35rem' }}>{t.editor.rename}</h3>
          <p className="cvs-hint" style={{ marginBottom: '0.9rem' }}>
            {t.editor.renameHint}
          </p>
          <div className="cvs-rows">
            {/* İçeriği olan bölümler + içeriği olmasa da standart dışı başlığı kalmış olanlar. */}
            {SECTION_KEYS.filter((k) => sectionHasContent(data, k) || isNonStandard(k)).map((k) => {
              const nonStandard = isNonStandard(k)
              return (
                <div className="cvs-field" key={k}>
                  <label className="cvs-rename">
                    <span>{t.sections[k]}</span>
                    <input
                      value={settings.labels[k] ?? ''}
                      placeholder={standardHeading(k)}
                      onChange={(e) => set({ labels: { ...settings.labels, [k]: e.target.value } })}
                    />
                  </label>
                  {nonStandard && (
                    <div className="cvs-rename-warn">
                      <span className="cvs-chip-warn">
                        <UiIcon name="warn" />
                        {t.editor.nonStandard}
                      </span>
                      <button type="button" className="cvs-btn sm" onClick={() => clearLabel(k)}>
                        <UiIcon name="refresh" />
                        {t.editor.backToStandard}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
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
                <span className="cvs-stage-tpl">
                  <span>{tpl.name}</span>
                  {ats ? (
                    <span className="cvs-atsbadge" title={t.gallery.atsBadgeTitle}>
                      {t.gallery.atsBadge}
                    </span>
                  ) : (
                    <span className="cvs-designbadge" title={t.gallery.designBadgeTitle}>
                      <i aria-hidden="true" />
                      {t.gallery.designBadge}
                    </span>
                  )}
                </span>
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
              <div className="cvs-scroll" aria-label={t.a11yPreview}>
                {/* Kenar boşluğu kılavuzu yalnızca ATS ailesinde; görsel şablonlar boşluğu kendi çizer. */}
                <CvPaper
                  paper={settings.paper}
                  marginMm={ats ? settings.margin : undefined}
                  zoom={zoom === 'fit' ? 'fit' : Number(zoom)}
                  pageLabel={(n) => String(n)}
                >
                  <CvDocument data={data} settings={settings} static />
                </CvPaper>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
