'use client'

/**
 * Sihirbaz 3. adım — sunum ayarları (§5).
 *
 * Kullanıcıyı onlarca ayarla boğmama kuralı: ekranda yalnızca dört şey var
 * (süre, slayt, dil, ton). Süre değiştiğinde slayt sayısı otomatik önerilir —
 * dakikada bir slayt iyi bir başlangıçtır ve kullanıcı isterse ezer.
 * AI bağlantısı ve model seçimi "gelişmiş" başlığı altında gizli.
 */

import { useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { planSections } from '@/lib/sunum/frameworks'
import { LIMITS } from '@/lib/sunum/schema'
import {
  DEPTHS,
  FRAMEWORKS,
  TONES,
  type Depth,
  type Framework,
  type SunumLang,
  type Tone,
} from '@/lib/sunum/types'
import type { SunumText } from '@/lib/sunum/ui-text'
import ConnectionPanel from '../ConnectionPanel'
import Icon from '../Icon'
import RequirementsField from './RequirementsField'
import { Range, Select } from '../ui'
import type { AiStatus } from '@/lib/sunum/ai/client'

type Props = {
  t: SunumText
  duration: number
  onDuration: (n: number) => void
  slideCount: number
  onSlideCount: (n: number) => void
  language: SunumLang
  onLanguage: (v: SunumLang) => void
  tone: Tone
  onTone: (v: Tone) => void
  depth: Depth
  onDepth: (v: Depth) => void
  /** Anlatım iskeleti — seçilen standardın bölümleri altta önizlenir. */
  framework: Framework
  onFramework: (v: Framework) => void
  requirements: string
  /** Güncelleyici fonksiyon kabul eder (bkz. RequirementsField). */
  onRequirements: Dispatch<SetStateAction<string>>
  onAiStatus: (status: AiStatus) => void
}

/** Dakikada ~1 slayt; kapak ve kapanış için iki slayt eklenir. */
export function suggestSlideCount(minutes: number): number {
  return Math.max(LIMITS.slideCountMin, Math.min(LIMITS.slideCountMax, Math.round(minutes * 0.9) + 2))
}

export default function StepSettings({
  t,
  duration,
  onDuration,
  slideCount,
  onSlideCount,
  language,
  onLanguage,
  tone,
  onTone,
  depth,
  onDepth,
  framework,
  onFramework,
  requirements,
  onRequirements,
  onAiStatus,
}: Props) {
  const [advanced, setAdvanced] = useState(false)
  /** Kullanıcı slayt sayısına dokunduysa süre değişimi onu ezmemeli. */
  const [slidesTouched, setSlidesTouched] = useState(false)

  /**
   * Seçilen standardın bölüm dağılımı. Üretimde modele giden dağıtımın ta
   * kendisi (aynı saf fonksiyon), yani kullanıcı burada gördüğü iskeleti alır.
   * Slayt sayısı sürükledikçe değiştiği için memo'lu.
   */
  const sections = useMemo(
    () => planSections(framework, slideCount, language),
    [framework, slideCount, language],
  )

  return (
    <div className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <Range
          label={t.form.duration}
          value={duration}
          min={LIMITS.durationMin}
          max={60}
          unit={t.form.minutesUnit}
          onChange={(minutes) => {
            onDuration(minutes)
            if (!slidesTouched) onSlideCount(suggestSlideCount(minutes))
          }}
        />
        <Range
          label={t.form.slideCount}
          value={slideCount}
          min={LIMITS.slideCountMin}
          max={LIMITS.slideCountMax}
          unit={t.form.slidesUnit}
          onChange={(n) => {
            setSlidesTouched(true)
            onSlideCount(n)
          }}
        />
        <Select<SunumLang>
          label={t.form.language}
          value={language}
          onChange={onLanguage}
          options={[
            { value: 'tr', label: 'Türkçe' },
            { value: 'en', label: 'English' },
          ]}
        />
        <Select<Tone>
          label={t.form.tone}
          value={tone}
          onChange={onTone}
          options={TONES.map((value) => ({ value, label: t.tones[value] }))}
        />
      </div>

      {/* Derinlik: hız ile içerik zenginliği arasındaki gerçek takas. Seçenekler
          ne yaptığını açıkça yazar; "daha iyi" gibi bir söz verilmez. */}
      <div className="border-t border-line/10 pt-5">
        <p className="section-label mb-2.5">{t.form.depth}</p>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {DEPTHS.map((value) => {
            const active = depth === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => onDepth(value)}
                aria-pressed={active}
                className={`rounded-2xl border p-3.5 text-left transition-colors ${
                  active ? 'border-accent/60 bg-accent/10' : 'border-line/12 hover:border-accent/40'
                }`}
              >
                <span className={`block text-[13px] font-semibold ${active ? 'text-accent-soft' : 'text-fg2'}`}>
                  {t.depths[value].label}
                </span>
                <span className="mt-1 block text-[11.5px] leading-relaxed text-fg4">
                  {t.depths[value].hint}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* İçerik standardı: AI'nın her konuda aynı iskeleti üretmesini kırar.
          10 seçenek tek tek açıklanırsa ekran şişiyor; bu yüzden ızgarada
          yalnızca ad var, açıklama ve bölüm listesi SEÇİLİNİN altında tek bir
          panelde gösteriliyor — kullanıcı seçtiği iskeleti somut görüyor. */}
      <div className="border-t border-line/10 pt-5">
        <p className="section-label mb-1">{t.frameworkTitle}</p>
        <p className="mb-2.5 text-[11.5px] leading-relaxed text-fg4">{t.frameworkSub}</p>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {FRAMEWORKS.map((value) => {
            const active = framework === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => onFramework(value)}
                aria-pressed={active}
                className={`rounded-2xl border px-3 py-2.5 text-left text-[12.5px] font-semibold transition-colors ${
                  active
                    ? 'border-accent/60 bg-accent/10 text-accent-soft'
                    : 'border-line/12 text-fg3 hover:border-accent/40'
                }`}
              >
                {/* Uzun adlar (ör. "Yatırımcı sunumu") 400px'te taşmasın. */}
                <span className="block break-words leading-snug">{t.frameworks[value].label}</span>
              </button>
            )
          })}
        </div>

        <div className="sn-pop mt-3 rounded-2xl border border-line/12 p-3.5">
          <p className="text-[11.5px] leading-relaxed text-fg3">{t.frameworks[framework].hint}</p>
          <p className="section-label mt-3 mb-2">{t.frameworkSections}</p>
          <ul className="flex flex-wrap gap-1.5">
            {sections.map((section, index) => (
              <li
                key={`${section.label}-${index}`}
                // `bg-surface/40` açık gri bir hap üretip metni okunmaz yapıyordu;
                // projenin her yerinde bu tür rozetler `/5` yoğunlukta.
                className="rounded-full border border-line/12 bg-surface/5 px-2.5 py-1 text-[11px] text-fg2"
              >
                <span className="break-words">{section.label}</span>
                <span className="text-fg3"> · {section.slides} {t.form.slidesUnit}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-line/10 pt-5">
        <RequirementsField t={t} value={requirements} onChange={onRequirements} />
      </div>

      <div className="border-t border-line/10 pt-4">
        <button
          type="button"
          onClick={() => setAdvanced((v) => !v)}
          aria-expanded={advanced}
          className="inline-flex items-center gap-2 text-[13px] font-semibold text-fg3 transition-colors hover:text-accent-soft"
        >
          <span className={`transition-transform ${advanced ? 'rotate-180' : ''}`}>
            <Icon name="chevron" />
          </span>
          {t.form.advanced}
        </button>

        {advanced ? (
          <div className="sn-pop mt-4">
            <ConnectionPanel t={t} onStatus={onAiStatus} defaultOpen />
          </div>
        ) : null}
      </div>
    </div>
  )
}
