'use client'

/**
 * Sihirbaz 1. adım — girdi kaynağı ve ne anlatılacağı (§3).
 *
 * Adımın başında mod seçtiriliyor çünkü "metin yapıştırdım ama AI onu baştan
 * yazdı" ile "dosyam aynen slayda dönüşsün" bambaşka iki beklenti. Önceden
 * sistem bunu girdiye bakıp tahmin ediyordu ve iki beklentiden birini her
 * seferinde yanlış karşılıyordu.
 *
 * Alanlar moda göre gizleniyor: seçime göre yalnızca DOLDURULMASI gereken
 * alan ekranda kalınca adım tek kararlık kalıyor, "doldurulacak form" hissi
 * geri gelmiyor.
 */

import type { ExtractedDocument } from '@/lib/sunum/extract'
import { LIMITS } from '@/lib/sunum/schema'
import { SOURCE_MODES, usesAi, type SourceMode } from '@/lib/sunum/types'
import type { SunumText } from '@/lib/sunum/ui-text'
import FileDrop from '../FileDrop'
import Icon from '../Icon'

type Props = {
  t: SunumText
  mode: SourceMode
  onMode: (v: SourceMode) => void
  topic: string
  onTopic: (v: string) => void
  description: string
  onDescription: (v: string) => void
  doc: ExtractedDocument | null
  onDoc: (doc: ExtractedDocument | null) => void
  error: string | null
  /** Seçilen modun beklediği kaynak eksik — konu hatasından ayrı tutulur ki
   *  kullanıcı hangi alanın eksik olduğunu alanın yanında görsün. */
  sourceError: string | null
}

export default function StepContent({
  t,
  mode,
  onMode,
  topic,
  onTopic,
  description,
  onDescription,
  doc,
  onDoc,
  error,
  sourceError,
}: Props) {
  const wantsText = mode === 'text-only' || mode === 'text-ai'
  const wantsDoc = mode === 'doc-only' || mode === 'doc-ai'

  return (
    <div className="space-y-6">
      {/* ----------------------------- mod seçimi ----------------------------- */}
      <div>
        <p className="text-[15px] font-semibold text-fg">{t.sourceModeTitle}</p>
        <p className="mt-1 text-xs leading-relaxed text-fg4">{t.sourceModeSub}</p>

        <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {SOURCE_MODES.map((item) => {
            const active = item === mode
            return (
              <button
                key={item}
                type="button"
                aria-pressed={active}
                onClick={() => onMode(item)}
                className={`rounded-2xl border p-3.5 text-left transition-colors ${
                  active ? 'border-accent/60 bg-accent/10' : 'border-line/12 bg-surface/5 hover:border-accent/40'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className={`text-[13px] font-semibold ${active ? 'text-accent-soft' : 'text-fg'}`}>
                    {t.sourceModes[item].label}
                  </span>
                  {active ? <Icon name="check" className="h-3.5 w-3.5 flex-shrink-0 text-accent" /> : null}
                </span>
                <span className="mt-1.5 block text-xs leading-relaxed text-fg3">{t.sourceModes[item].hint}</span>
              </button>
            )
          })}
        </div>

        {/* AI'sız modda üretim tamamen cihazda yapılıyor; kullanıcı slaytlarda
            kendi cümlelerini göreceğini ÖNCEDEN bilmeli. */}
        {!usesAi(mode) ? (
          <p className="mt-3 inline-flex items-center rounded-full border border-amber-400/25 bg-amber-400/[0.06] px-3 py-1.5 text-xs font-medium text-amber-200">
            {t.sourceModeNoAi}
          </p>
        ) : null}
      </div>

      {/* -------------------------------- konu -------------------------------- */}
      <div>
        <label htmlFor="sn-topic" className="mb-2 block text-[15px] font-semibold text-fg">
          {t.form.topic}
        </label>
        <input
          id="sn-topic"
          autoFocus
          value={topic}
          maxLength={LIMITS.topic}
          placeholder={t.form.topicPlaceholder}
          onChange={(e) => onTopic(e.target.value)}
          className={`w-full rounded-xl border bg-surface/5 px-4 py-3 text-[15px] text-fg outline-none transition-colors placeholder:text-fg4 ${
            error ? 'border-rose-400/60' : 'border-line/15 focus:border-accent/60'
          }`}
        />
        {error ? (
          <p className="mt-2 text-xs text-rose-400">{error}</p>
        ) : (
          <p className="mt-2 text-xs text-fg4">{t.form.topicHint}</p>
        )}
      </div>

      {/* ------------------------- moda göre kaynak alanı ------------------------- */}
      {wantsDoc ? (
        <div>
          <FileDrop t={t} doc={doc} onDoc={onDoc} />
          {sourceError ? <p className="mt-2 text-xs text-rose-400">{sourceError}</p> : null}
        </div>
      ) : null}

      {wantsText ? (
        <div className="sn-pop">
          <label htmlFor="sn-desc" className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-fg3">
            {t.form.description}
          </label>
          <textarea
            id="sn-desc"
            rows={8}
            value={description}
            maxLength={LIMITS.description}
            placeholder={t.form.descriptionPlaceholder}
            onChange={(e) => onDescription(e.target.value)}
            className={`w-full resize-y rounded-xl border bg-surface/5 px-3.5 py-3 text-sm leading-relaxed text-fg outline-none transition-colors placeholder:text-fg4 ${
              sourceError ? 'border-rose-400/60' : 'border-line/15 focus:border-accent/60'
            }`}
          />
          {sourceError ? <p className="mt-2 text-xs text-rose-400">{sourceError}</p> : null}
        </div>
      ) : null}
    </div>
  )
}
