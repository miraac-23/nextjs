'use client'

/**
 * Slayt bazlı AI komutları (§6) ve yeniden tasarım karşılaştırması (§11).
 *
 * Her komut TEK bir slaytı yeniden yazar — sunumun tamamı yeniden üretilmez.
 * Sonuç DOĞRUDAN UYGULANMAZ: eski ve yeni sürüm yan yana gösterilir, kullanıcı
 * "Kullan" ya da "Vazgeç" der. Böylece beğenilmeyen bir AI çıktısı sunumu
 * hiçbir zaman bozmaz ve kullanıcı değişikliği görmeden kabul etmek zorunda kalmaz.
 *
 * AI erişilemiyorsa panel devre dışı bırakılır ve nedeni yazılır: iyileştirme
 * isteminin deterministik bir yedeği yoktur, sahte bir sonuç üretmek yanıltıcı olur.
 */

import { useRef, useState } from 'react'
import { refineSlide } from '@/lib/sunum/ai/client'
import { isAiError } from '@/lib/sunum/ai/provider'
import type { SunumTheme } from '@/lib/sunum/themes'
import { REFINE_ACTIONS, type Audience, type RefineAction, type Slide, type SunumLang, type Visual } from '@/lib/sunum/types'
import type { SunumText } from '@/lib/sunum/ui-text'
import Icon from './Icon'
import SlideCanvas from './SlideCanvas'
import SlideRenderer from './SlideRenderer'
import { GhostButton } from './ui'

type Props = {
  slide: Slide
  presentationTitle: string
  audience: Audience
  language: SunumLang
  theme: SunumTheme
  visual: Visual | undefined
  onSlide: (slide: Slide) => void
  onNotify: (message: string, tone?: 'ok' | 'error') => void
  /** Yerel AI kullanılabilir mi? false ise panel bilgilendirme gösterir. */
  available: boolean
  t: SunumText
}

export default function AiAssistantPanel({
  slide,
  presentationTitle,
  audience,
  language,
  theme,
  visual,
  onSlide,
  onNotify,
  available,
  t,
}: Props) {
  const [running, setRunning] = useState<RefineAction | null>(null)
  /** Önerilen yeni sürüm — kullanıcı onaylayana kadar sunuma yazılmaz. */
  const [proposal, setProposal] = useState<Slide | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const run = async (action: RefineAction) => {
    if (running) return
    setRunning(action)
    setProposal(null)
    const ctrl = new AbortController()
    abortRef.current = ctrl
    try {
      const next = await refineSlide(
        { slide, action, audience, language, presentationTitle },
        ctrl.signal,
      )
      // Kimlik ve konum korunur: AI yalnızca içeriği değiştirir.
      setProposal({ ...next, id: slide.id, presentationId: slide.presentationId, order: slide.order })
    } catch (e) {
      if (isAiError(e) && e.code === 'aborted') return
      onNotify(isAiError(e) ? e.message : t.errors.refineFailed, 'error')
    } finally {
      setRunning(null)
      abortRef.current = null
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs leading-relaxed text-fg4">{t.assistant.subtitle}</p>

      {!available ? (
        <p className="rounded-xl border border-amber-400/25 bg-amber-400/[0.06] px-3 py-2 text-xs text-amber-200">
          {t.assistant.needsAi}
        </p>
      ) : null}

      {/* ---------------------------- karşılaştırma ---------------------------- */}
      {proposal ? (
        <div className="sn-pop rounded-2xl border border-accent/30 bg-accent/[0.05] p-3">
          <p className="mb-2.5 flex items-center gap-1.5 text-[13px] font-semibold text-accent-soft">
            <Icon name="spark" />
            {t.assistant.compareTitle}
          </p>

          <div className="grid grid-cols-2 gap-2">
            <figure>
              <span className="block overflow-hidden rounded-lg border border-line/15 opacity-70">
                <SlideCanvas label={t.assistant.compareOld}>
                  <SlideRenderer slide={slide} theme={theme} lang={language} visual={visual} />
                </SlideCanvas>
              </span>
              <figcaption className="mt-1 text-[11px] text-fg4">{t.assistant.compareOld}</figcaption>
            </figure>
            <figure>
              <span className="block overflow-hidden rounded-lg border border-accent/50">
                <SlideCanvas label={t.assistant.compareNew}>
                  <SlideRenderer slide={proposal} theme={theme} lang={language} visual={visual} />
                </SlideCanvas>
              </span>
              <figcaption className="mt-1 text-[11px] font-semibold text-accent-soft">
                {t.assistant.compareNew}
              </figcaption>
            </figure>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => {
                onSlide(proposal)
                setProposal(null)
                onNotify(t.assistant.applied)
              }}
              className="btn-primary flex-1 whitespace-nowrap py-2 text-[13px]"
            >
              <Icon name="check" />
              {t.assistant.use}
            </button>
            <GhostButton icon="x" onClick={() => setProposal(null)}>
              {t.assistant.discard}
            </GhostButton>
          </div>
        </div>
      ) : null}

      {/* ------------------------------- komutlar ------------------------------- */}
      <div className="grid gap-1.5">
        {REFINE_ACTIONS.map((action) => {
          const busy = running === action
          return (
            <button
              key={action}
              type="button"
              disabled={!available || running !== null}
              onClick={() => void run(action)}
              className="flex items-center gap-2.5 rounded-xl border border-line/10 bg-surface/5 px-3 py-2.5 text-left text-[13px] font-medium text-fg2 transition-all hover:-translate-y-px hover:border-accent/50 hover:text-accent-soft disabled:translate-y-0 disabled:opacity-40"
            >
              <span className={`text-accent ${busy ? 'animate-pulse' : ''}`}>
                <Icon name={busy ? 'refresh' : 'spark'} />
              </span>
              <span className="flex-1">{t.refine[action]}</span>
              {busy ? <span className="text-[11px] text-fg4">{t.assistant.running}</span> : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
