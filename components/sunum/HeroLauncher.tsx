'use client'

/**
 * /sunum açılış ekranı (§2).
 *
 * Ürün prensibi: kullanıcı boş bir canvas ile karşılaşmaz, TEK bir soruyla
 * karşılaşır. Konuyu yazıp Enter'a basması sunumu başlatmaya yeter; hedef kitle,
 * süre ve tema sihirbazda üç tıkla geçilir.
 *
 * Buradaki her giriş yolu (yazmak, chip seçmek, dosya yüklemek) aynı yere çıkar:
 * niyet sessionStorage'a bırakılır, sihirbaz onu alıp doğru adımdan başlar.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/i18n/LanguageProvider'
import { saveIntent } from '@/lib/sunum/draft'
import type { ExtractedDocument } from '@/lib/sunum/extract'
import { LIMITS } from '@/lib/sunum/schema'
import { sunumText } from '@/lib/sunum/ui-text'
import type { Audience, SourceMode } from '@/lib/sunum/types'
import FileDrop from './FileDrop'
import Icon from './Icon'

export default function HeroLauncher() {
  const { lang } = useLanguage()
  const t = sunumText(lang)
  const router = useRouter()

  const [topic, setTopic] = useState('')
  const [doc, setDoc] = useState<ExtractedDocument | null>(null)
  const [pasting, setPasting] = useState(false)
  const [pasted, setPasted] = useState('')
  const [error, setError] = useState<string | null>(null)

  const start = (override?: { topic?: string; audience?: Audience }) => {
    const finalTopic = (override?.topic ?? topic).trim() || doc?.fileName.replace(/\.[a-z0-9]+$/i, '') || ''
    if (!finalTopic) {
      setError(t.errors.topicRequired)
      return
    }
    const source = [pasted.trim(), doc?.text ?? ''].filter(Boolean).join('\n\n').slice(0, LIMITS.sourceText)
    // Kullanıcı burada dosya yükleyerek ya da metin yapıştırarak niyetini zaten
    // gösterdi; sihirbaz aynı soruyu baştan sormasın diye mod devredilir.
    // Varsayılan AI'lı varyant: açılış ekranı "AI sunum" vaadiyle giriliyor.
    const sourceMode: SourceMode = doc ? 'doc-ai' : pasted.trim().length > 0 ? 'text-ai' : 'topic-ai'
    saveIntent({
      topic: finalTopic.slice(0, LIMITS.topic),
      sourceText: source || undefined,
      fileName: doc?.fileName,
      audience: override?.audience,
      sourceMode,
      // Konu zaten girildi: sihirbaz doğrudan hedef kitleye açılsın.
      startStep: 1,
    })
    router.push('/sunum/yeni')
  }

  return (
    <section className="sn-enter">
      <p className="section-label">{t.hero.eyebrow}</p>
      <h1 className="max-w-3xl font-display text-3xl font-bold leading-[1.12] tracking-tight text-fg sm:text-[2.75rem]">
        {t.hero.title}
        <br />
        <span className="gradient-text">{t.hero.lead}</span>
      </h1>

      {/* ------------------------------ ana giriş ------------------------------ */}
      <div className="mt-9 max-w-3xl">
        <label htmlFor="sn-hero-topic" className="mb-2.5 block text-sm font-medium text-fg3">
          {t.hero.question}
        </label>
        <div
          className={`flex flex-col gap-2 rounded-2xl border bg-surface/[0.04] p-2 transition-colors sm:flex-row sm:items-center ${
            error ? 'border-rose-400/50' : 'border-line/15 focus-within:border-accent/60'
          }`}
        >
          <input
            id="sn-hero-topic"
            value={topic}
            maxLength={LIMITS.topic}
            placeholder={t.hero.placeholder}
            onChange={(e) => {
              setTopic(e.target.value)
              if (error) setError(null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') start()
            }}
            className="w-full flex-1 bg-transparent px-3 py-2.5 text-[15px] text-fg outline-none placeholder:text-fg4 sm:text-base"
          />
          <button type="button" onClick={() => start()} className="btn-primary whitespace-nowrap px-6 py-3">
            <Icon name="spark" />
            {t.hero.cta}
          </button>
        </div>
        {error ? <p className="mt-2 text-xs text-rose-400">{error}</p> : null}

        {/* --------------------------- alternatif yollar --------------------------- */}
        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <span className="text-xs text-fg4">{t.hero.or}</span>
          <FileDrop t={t} doc={doc} onDoc={setDoc} variant="compact" />
          {!doc && !pasting ? (
            <button
              type="button"
              onClick={() => setPasting(true)}
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-line/15 bg-surface/5 px-4 py-2 text-[13px] font-semibold text-fg2 transition-colors hover:border-accent/50 hover:text-accent-soft"
            >
              <Icon name="type" />
              {t.hero.paste}
            </button>
          ) : null}
        </div>

        {pasting ? (
          <div className="sn-pop mt-3">
            <textarea
              autoFocus
              rows={5}
              value={pasted}
              maxLength={LIMITS.description}
              placeholder={t.form.descriptionPlaceholder}
              onChange={(e) => setPasted(e.target.value)}
              className="w-full resize-y rounded-xl border border-line/15 bg-surface/5 px-3 py-2.5 text-sm leading-relaxed text-fg outline-none transition-colors placeholder:text-fg4 focus:border-accent/60"
            />
          </div>
        ) : null}

        {/* ------------------------------- örnekler ------------------------------- */}
        <div className="mt-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-fg4">{t.hero.chipsLabel}</p>
          <div className="flex flex-wrap gap-2">
            {t.hero.chips.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => start({ topic: chip.topic, audience: chip.audience })}
                className="inline-flex items-center gap-1.5 rounded-full border border-line/10 bg-surface/5 px-3.5 py-2 text-[13px] font-medium text-fg2 transition-all hover:-translate-y-0.5 hover:border-accent/50 hover:text-accent-soft"
              >
                <Icon name="plus" />
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ----------------------------- nasıl çalışır ----------------------------- */}
      <ol className="mt-12 grid gap-5 border-t border-line/10 pt-8 sm:grid-cols-3">
        {t.hero.steps.map((step, i) => (
          <li key={step.title} className="flex gap-3">
            <span className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg bg-accent/10 text-[12px] font-bold text-accent">
              {i + 1}
            </span>
            <span>
              <span className="block text-sm font-semibold text-fg">{step.title}</span>
              <span className="mt-1 block text-[13px] leading-relaxed text-fg3">{step.body}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}
