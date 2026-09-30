'use client'

/**
 * /sunum/yeni — sunum oluşturma sihirbazı (§3).
 *
 * Tek uzun form yerine dört hızlı adım. Her adımda EN FAZLA bir karar var ve
 * hepsinin makul bir varsayılanı mevcut: kullanıcı isterse konuyu yazıp üç kez
 * "Devam"a basarak sunumu alabilir.
 *
 * Açılış ekranından gelen niyet (konu, yüklenen dosya, seçilen kitle) burada
 * devralınır ve sihirbaz doğru adımdan başlar — aynı bilgi iki kez sorulmaz.
 */

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/i18n/LanguageProvider'
import type { AiStatus } from '@/lib/sunum/ai/client'
import { takeIntent } from '@/lib/sunum/draft'
import type { ExtractedDocument } from '@/lib/sunum/extract'
import { LIMITS } from '@/lib/sunum/schema'
import { presentationStore } from '@/lib/sunum/store'
import { DEFAULT_THEME_ID, type ThemeId } from '@/lib/sunum/themes'
import {
  DEFAULT_AUDIENCE,
  DEFAULT_DEPTH,
  DEFAULT_FRAMEWORK,
  DEFAULT_SOURCE_MODE,
  DEFAULT_TONE,
  DEFAULT_VISUAL,
  needsSource,
  type Depth,
  type Framework,
  type GenerationRequest,
  type SourceMode,
  type SunumLang,
  type Tone,
  type Visual,
} from '@/lib/sunum/types'
import { sunumText } from '@/lib/sunum/ui-text'
import GenerationScreen from '../GenerationScreen'
import Icon from '../Icon'
import { StateCard } from '../ui'
import StepContent from './StepContent'
import StepDesign from './StepDesign'
import StepSettings, { suggestSlideCount } from './StepSettings'

const DEFAULT_DURATION = 10

export default function Wizard() {
  const { lang } = useLanguage()
  const t = sunumText(lang)
  const router = useRouter()

  const [step, setStep] = useState(0)
  const [sourceMode, setSourceMode] = useState<SourceMode>(DEFAULT_SOURCE_MODE)
  const [topic, setTopic] = useState('')
  const [description, setDescription] = useState('')
  const [doc, setDoc] = useState<ExtractedDocument | null>(null)
  const [duration, setDuration] = useState(DEFAULT_DURATION)
  const [slideCount, setSlideCount] = useState(suggestSlideCount(DEFAULT_DURATION))
  const [deckLang, setDeckLang] = useState<SunumLang>(lang)
  const [tone, setTone] = useState<Tone>(DEFAULT_TONE)
  const [requirements, setRequirements] = useState('')
  const [visual, setVisual] = useState<Visual>(DEFAULT_VISUAL)
  const [depth, setDepth] = useState<Depth>(DEFAULT_DEPTH)
  const [framework, setFramework] = useState<Framework>(DEFAULT_FRAMEWORK)
  const [theme, setTheme] = useState<ThemeId>(DEFAULT_THEME_ID)

  const [topicError, setTopicError] = useState<string | null>(null)
  /** Konu hatasından ayrı: eksik olan kaynak, hatayı kendi alanının yanında görsün. */
  const [sourceError, setSourceError] = useState<string | null>(null)
  const [request, setRequest] = useState<GenerationRequest | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null)

  /** Açılış ekranından devralınan niyet yalnızca bir kez uygulanır. */
  const intentApplied = useRef(false)

  useEffect(() => {
    if (intentApplied.current) return
    intentApplied.current = true
    const intent = takeIntent()
    if (!intent) return
    setTopic(intent.topic)
    const mode = intent.sourceMode ?? DEFAULT_SOURCE_MODE
    setSourceMode(mode)
    // Doküman modunda metin `description` yerine bir belge olarak devralınır:
    // aksi halde dosya devredilmiş sayılmaz ve mod doğrulaması "dosya yükle"
    // diye tutturur; ayrıca aynı metin iki alanda birden durup iki kez gönderilirdi.
    if (intent.sourceText && (mode === 'doc-only' || mode === 'doc-ai')) {
      setDoc({
        fileName: intent.fileName ?? intent.topic,
        text: intent.sourceText,
        pageCount: 1,
        chars: intent.sourceText.length,
        truncated: false,
      })
    } else if (intent.sourceText) {
      setDescription(intent.sourceText)
    }
    if (typeof intent.startStep === 'number') setStep(Math.min(2, Math.max(0, intent.startStep)))
  }, [])

  // Site dili değişirse sunum dili de izler (kullanıcı henüz ayara girmediyse).
  useEffect(() => {
    setDeckLang(lang)
  }, [lang])

  /* -------------------------------- gezinme -------------------------------- */

  const canLeaveContent = () => {
    if (topic.trim().length === 0) {
      setTopicError(t.errors.topicRequired)
      return false
    }
    // Kaynak bekleyen modda boş devam etmek, kullanıcının SEÇTİĞİ moddan sessizce
    // "sadece konu"ya düşmek demek olurdu; sonuç da beklediğinden bambaşka çıkardı.
    if (needsSource(sourceMode)) {
      const docMode = sourceMode === 'doc-only' || sourceMode === 'doc-ai'
      if (docMode && !doc) {
        setSourceError(t.sourceModeNeedsDoc)
        return false
      }
      if (!docMode && description.trim().length === 0) {
        setSourceError(t.sourceModeNeedsText)
        return false
      }
    }
    setSourceError(null)
    return true
  }

  const next = () => {
    if (step === 0 && !canLeaveContent()) return
    setStep((s) => Math.min(2, s + 1))
  }

  const submit = () => {
    if (!canLeaveContent()) {
      setStep(0)
      return
    }
    /*
     * Kaynak metin SEÇİLEN MODA göre toplanır.
     *
     * Mod değiştirmek alanları yalnızca gizliyor, state'i silmiyor: kullanıcı
     * dosya yükleyip sonra "sadece konu"ya dönerse o dosya hâlâ bellekte duruyor.
     * Burada filtrelemezsek kullanıcı "konudan üret" derken belgesi de modele
     * gidiyor — seçiminin tam tersi. Gizlenen girdi gönderilmez.
     */
    const usesText = sourceMode === 'text-only' || sourceMode === 'text-ai'
    const usesDoc = sourceMode === 'doc-only' || sourceMode === 'doc-ai'
    const sourceText = [usesText ? description.trim() : '', usesDoc ? doc?.text ?? '' : '']
      .filter(Boolean)
      .join('\n\n')
      .slice(0, LIMITS.sourceText)
    setRequest({
      topic: topic.trim().slice(0, LIMITS.topic),
      sourceText: sourceText || undefined,
      // Hedef kitle artık sorulmuyor (bkz. types.ts → AUDIENCES yorumu).
      audience: DEFAULT_AUDIENCE,
      durationMinutes: duration,
      slideCount,
      theme,
      language: deckLang,
      tone,
      requirements: requirements.trim() || undefined,
      visual,
      depth,
      sourceMode,
      framework,
    })
  }

  /* -------------------------------- üretim -------------------------------- */

  if (request) {
    return (
      <>
        {saveError ? (
          <div className="mb-5">
            <StateCard icon="warn" tone="error" title={t.errors.generic} description={saveError} />
          </div>
        ) : null}
        <GenerationScreen
          t={t}
          request={request}
          onCancel={() => {
            setRequest(null)
            setSaveError(null)
          }}
          onDone={(outcome) => {
            const saved = presentationStore.save(outcome.presentation)
            if (!saved.ok) {
              setSaveError(saved.reason === 'quota' ? t.errors.saveQuota : t.errors.generic)
              setRequest(null)
              return
            }
            // Yedeğe düşme NEDENİ editöre taşınır: "AI kapalı" ile "kota doldu"
            // kullanıcıya farklı şeyler söyler.
            const suffix = outcome.usedFallback ? `?fallback=${outcome.reason === 'rate-limited' ? 'quota' : '1'}` : ''
            router.push(`/sunum/${outcome.presentation.id}/editor${suffix}`)
          }}
        />
      </>
    )
  }

  /* -------------------------------- sihirbaz -------------------------------- */

  const isLast = step === 2

  return (
    <div className="sn-enter">
      {/* ------------------------------ adım şeridi ------------------------------ */}
      <ol className="mb-8 flex flex-wrap items-center gap-x-2 gap-y-3">
        {t.wizard.steps.map((item, i) => {
          const done = i < step
          const active = i === step
          return (
            <li key={item.title} className="flex items-center gap-2">
              <button
                type="button"
                // Yalnızca GÖRÜLMÜŞ adımlara geri dönülebilir; ileri atlamak
                // doğrulamayı atlatırdı.
                disabled={i > step}
                onClick={() => setStep(i)}
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                  active
                    ? 'bg-accent/15 text-accent-soft'
                    : done
                      ? 'text-fg2 hover:text-accent-soft'
                      : 'text-fg4'
                } disabled:cursor-default`}
              >
                <span
                  className={`grid h-5 w-5 place-items-center rounded-full border text-[10px] ${
                    done ? 'border-accent bg-accent text-ink-950' : active ? 'border-accent text-accent' : 'border-line/20'
                  }`}
                >
                  {done ? <Icon name="check" className="h-3 w-3" /> : i + 1}
                </span>
                {item.title}
              </button>
              {i < t.wizard.steps.length - 1 ? <span className="text-fg4">·</span> : null}
            </li>
          )
        })}
      </ol>

      <div className="rounded-2xl border border-line/10 bg-surface/[0.03] p-5 sm:p-7">
        <p className="mb-5 text-xs font-semibold uppercase tracking-[0.12em] text-fg4">
          {t.wizard.stepOf(step + 1, t.wizard.steps.length)} · {t.wizard.steps[step].sub}
        </p>

        {step === 0 ? (
          <StepContent
            t={t}
            topic={topic}
            onTopic={(v) => {
              setTopic(v)
              if (topicError) setTopicError(null)
            }}
            mode={sourceMode}
            onMode={(v) => {
              setSourceMode(v)
              if (sourceError) setSourceError(null)
            }}
            description={description}
            onDescription={(v) => {
              setDescription(v)
              if (sourceError) setSourceError(null)
            }}
            doc={doc}
            onDoc={(v) => {
              setDoc(v)
              if (sourceError) setSourceError(null)
            }}
            error={topicError}
            sourceError={sourceError}
          />
        ) : null}

        {step === 1 ? (
          <StepSettings
            t={t}
            duration={duration}
            onDuration={setDuration}
            slideCount={slideCount}
            onSlideCount={setSlideCount}
            language={deckLang}
            onLanguage={setDeckLang}
            tone={tone}
            onTone={setTone}
            depth={depth}
            onDepth={setDepth}
            framework={framework}
            onFramework={setFramework}
            requirements={requirements}
            onRequirements={setRequirements}
            onAiStatus={setAiStatus}
          />
        ) : null}

        {step === 2 ? (
          <StepDesign
            t={t}
            value={theme}
            onChange={setTheme}
            topic={topic}
            durationMinutes={duration}
            language={deckLang}
            themeLabelLang={lang}
            visual={visual}
            onVisual={setVisual}
          />
        ) : null}

        {/* AI kapalıysa son adımda uyar: kullanıcı yerel taslağa düşeceğini bilsin. */}
        {isLast && aiStatus?.offline ? (
          <p className="mt-6 rounded-xl border border-amber-400/25 bg-amber-400/[0.06] px-3.5 py-2.5 text-xs leading-relaxed text-amber-200">
            {t.errors.aiOfflineDetail}
          </p>
        ) : null}

        <div className="mt-7 flex flex-wrap items-center gap-3 border-t border-line/10 pt-5">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line/15 px-4 py-2.5 text-[13px] font-semibold text-fg2 transition-colors hover:border-accent/50 hover:text-accent-soft"
            >
              <Icon name="left" />
              {t.wizard.back}
            </button>
          ) : null}

          {isLast ? (
            <button type="button" className="btn-primary whitespace-nowrap" onClick={submit}>
              <Icon name="spark" />
              {t.wizard.create}
            </button>
          ) : (
            <button type="button" className="btn-primary whitespace-nowrap" onClick={next}>
              {t.wizard.next}
              <Icon name="right" />
            </button>
          )}

          <Link href="/sunum" className="btn-ghost whitespace-nowrap px-5 py-2.5 text-[13px]">
            {t.wizard.cancel}
          </Link>
        </div>
      </div>
    </div>
  )
}
