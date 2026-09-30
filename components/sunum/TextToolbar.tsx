'use client'

/**
 * Metin biçimi araç çubuğu — Word'ün biçim şeridinin slayda uyarlanmış hâli.
 *
 * Ürün kararı: biçim SERBEST değil, KAPALI bir kümeden seçiliyor. Yazı tipi
 * projenin yüklediği ailelerden, renk temanın rollerinden, punto ise şablonun
 * kendi kademesini çarpan bir katsayıdan (mutlak punto değil). Sebebi tek:
 * kullanıcı biçim değiştirirken kontrast garantisi ve 1280×720 kutuya sığma
 * güvencesi bozulmasın. Serbest punto/renk verilse ikisi de anında kırılıyor.
 *
 * Bileşen DURUMSUZ: tek doğruluk kaynağı `value`, her değişiklik `onChange` ile
 * yukarı gider. Varsayılana dönen alanlar temizlenir ve hiçbir alan kalmazsa
 * `undefined` döner — slayt kaydında "biçim yok" ile "her şey varsayılan" aynı
 * şey olmalı, aksi hâlde dışa aktarma ve şema karşılaştırmaları kirlenir.
 */

import {
  TEXT_ALIGNS,
  TEXT_FONTS,
  TEXT_SCALE_MAX,
  TEXT_SCALE_MIN,
  TEXT_TONES,
  type TextAlign,
  type TextFont,
  type TextStyle,
} from '@/lib/sunum/types'
import type { SunumText } from '@/lib/sunum/ui-text'
import { Label, Range, Select } from './ui'

/** Punto adımı. Kullanıcı bir tıkla %5 değiştirir; daha küçük adım fark ettirmiyor. */
const SCALE_STEP = 0.05
/** Satır aralığı sınırları — şema 0,9–2 kabul ediyor; üst sınır okunur tutuldu. */
const LH_MIN = 0.9
const LH_MAX = 1.6
const LH_STEP = 0.05

type Props = {
  t: SunumText
  value?: TextStyle
  onChange: (style: TextStyle | undefined) => void
}

/**
 * 0,05 katına yuvarlar.
 *
 * Kayan nokta toplamı 1,05 yerine 1.0500000000000003 üretiyor; bu değer birkaç
 * tıkta sınırı aşıp Zod doğrulamasında slaydı geçersiz kılıyordu.
 */
function snap(value: number, step: number): number {
  // İkinci yuvarlama şart: 23 × 0,05 = 1.1500000000000001 çıkıyor ve bu değer
  // hem kayda hem arayüze olduğu gibi yazılıyordu.
  return Math.round((Math.round(value / step) * step) * 100) / 100
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * Varsayılana dönen alanları düşürür; hiçbir alan kalmazsa `undefined` döner.
 * Böylece "Biçimi sıfırla" ile tek tek varsayılana çekmek AYNI kaydı üretir.
 */
function normalize(style: TextStyle): TextStyle | undefined {
  const next: TextStyle = {}
  if (style.font && style.font !== 'theme') next.font = style.font
  if (style.scale !== undefined && style.scale !== 1) next.scale = style.scale
  if (style.bold) next.bold = true
  if (style.italic) next.italic = true
  if (style.underline) next.underline = true
  if (style.align && style.align !== 'left') next.align = style.align
  if (style.tone && style.tone !== 'default') next.tone = style.tone
  if (style.lineHeight !== undefined && style.lineHeight !== 1) next.lineHeight = style.lineHeight
  return Object.keys(next).length === 0 ? undefined : next
}

/** Aç-kapa ve seçim düğmelerinin ortak görünümü (sağ panelin dilinde). */
function Toggle({
  pressed,
  label,
  onClick,
  children,
}: {
  /** Aç-kapa/seçim düğmelerinde basılı durumu; düz eylemlerde verilmez. */
  pressed?: boolean
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`inline-flex h-9 min-w-[2.25rem] items-center justify-center gap-1.5 rounded-xl border px-2.5 text-[13px] font-semibold transition-colors ${
        pressed
          ? 'border-accent/60 bg-accent/10 text-accent-soft'
          : 'border-line/12 bg-surface/5 text-fg2 hover:border-accent/50 hover:text-accent-soft'
      }`}
    >
      {children}
    </button>
  )
}

/** Hizalama simgeleri — ikon setinde karşılıkları yok, aynı çizim diliyle burada. */
function AlignGlyph({ align }: { align: TextAlign }) {
  // Kısa satırlar hizaya göre kayar; uzun satırlar tam genişlikte kalır.
  const short: Record<TextAlign, string> = { left: 'M3 9h8', center: 'M5 9h8', right: 'M7 9h8' }
  return (
    <svg
      viewBox="0 0 18 18"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M3 5h12" />
      <path d={short[align]} />
      <path d="M3 13h12" />
    </svg>
  )
}

export default function TextToolbar({ t, value, onChange }: Props) {
  const f = t.format
  const style: TextStyle = value ?? {}
  const scale = style.scale ?? 1
  const lineHeight = style.lineHeight ?? 1
  const align = style.align ?? 'left'
  const tone = style.tone ?? 'default'

  /** Tek alanı değiştirip normalleştirir — her düğme bunu çağırır. */
  const patch = (part: Partial<TextStyle>) => onChange(normalize({ ...style, ...part }))

  const setScale = (next: number) => {
    const clamped = clamp(snap(next, SCALE_STEP), TEXT_SCALE_MIN, TEXT_SCALE_MAX)
    patch({ scale: clamped })
  }

  return (
    <div className="space-y-3.5">
      <Select<TextFont>
        label={f.font}
        value={style.font ?? 'theme'}
        onChange={(font) => patch({ font })}
        options={TEXT_FONTS.map((font) => ({ value: font, label: f.fonts[font] }))}
      />

      {/* Punto: mutlak değer değil çarpan olduğu için YÜZDE gösterilir — "22px"
          yazmak yanıltıcı olurdu, şablon kademesi slayda göre değişiyor. */}
      <div>
        <Label>{f.size}</Label>
        <div className="flex items-center gap-2">
          <Toggle label={f.smaller} onClick={() => setScale(scale - SCALE_STEP)}>
            <span aria-hidden="true">A−</span>
          </Toggle>
          <output className="min-w-[3.5rem] rounded-xl border border-line/12 bg-surface/5 px-2 py-1.5 text-center text-[13px] font-semibold tabular-nums text-fg2">
            {Math.round(scale * 100)}%
          </output>
          <Toggle label={f.bigger} onClick={() => setScale(scale + SCALE_STEP)}>
            <span aria-hidden="true">A+</span>
          </Toggle>
        </div>
      </div>

      {/* Kalın/italik/altı çizili + hizalama: 400px'te iki satıra sarar, taşmaz. */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1.5" role="group" aria-label={f.title}>
          <Toggle pressed={!!style.bold} label={f.bold} onClick={() => patch({ bold: !style.bold })}>
            <span aria-hidden="true" className="font-bold">
              B
            </span>
          </Toggle>
          <Toggle pressed={!!style.italic} label={f.italic} onClick={() => patch({ italic: !style.italic })}>
            <span aria-hidden="true" className="italic">
              I
            </span>
          </Toggle>
          <Toggle
            pressed={!!style.underline}
            label={f.underline}
            onClick={() => patch({ underline: !style.underline })}
          >
            <span aria-hidden="true" className="underline">
              U
            </span>
          </Toggle>
        </div>

        <div className="flex gap-1.5" role="group" aria-label={f.align}>
          {TEXT_ALIGNS.map((option) => (
            <Toggle
              key={option}
              pressed={align === option}
              label={`${f.align}: ${f.aligns[option]}`}
              onClick={() => patch({ align: option })}
            >
              <AlignGlyph align={option} />
            </Toggle>
          ))}
        </div>
      </div>

      {/* Renk ROL olarak seçilir; karşılığını tema verir (gradyan zeminde ters
          kontrast). Bu yüzden düğmelerde serbest renk örneği gösterilmiyor. */}
      <div>
        <Label>{f.tone}</Label>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={f.tone}>
          {TEXT_TONES.map((option) => (
            <Toggle
              key={option}
              pressed={tone === option}
              label={`${f.tone}: ${f.tones[option]}`}
              onClick={() => patch({ tone: option })}
            >
              {f.tones[option]}
            </Toggle>
          ))}
        </div>
      </div>

      <Range
        label={f.lineHeight}
        value={lineHeight}
        min={LH_MIN}
        max={LH_MAX}
        step={LH_STEP}
        onChange={(next) => patch({ lineHeight: clamp(snap(next, LH_STEP), LH_MIN, LH_MAX) })}
      />

      <div>
        <button
          type="button"
          onClick={() => onChange(undefined)}
          disabled={value === undefined}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-line/12 bg-surface/5 px-3.5 py-2 text-[13px] font-semibold text-fg2 transition-colors hover:border-accent/50 hover:text-accent-soft disabled:opacity-40"
        >
          {f.reset}
        </button>
        <small className="mt-1.5 block text-xs text-fg4">{f.resetHint}</small>
      </div>
    </div>
  )
}
