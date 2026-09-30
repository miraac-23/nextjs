'use client'

/**
 * Sunum modu — /sunum/[id]/preview (§17, §18).
 *
 * Tek slayt ekranı kaplar. Gezinme klavye (← → Space Home End), dokunmatik
 * kaydırma ve ekrandaki butonlarla yapılır. Tam ekran, genel görünüm (tüm
 * slaytlar) ve konuşmacı notları tek tuşla açılır.
 *
 * Geçişler bilinçli olarak ÜÇ seçenekle sınırlı (yumuşak / kaydır / yok) ve
 * varsayılan yumuşak geçiş. Slayt içeriği yalnızca burada sahnelenir
 * (`animate`), editörde değil — düzenlerken sürekli oynayan animasyon
 * çalışmayı imkânsız kılar.
 *
 * Yalnızca GÖRÜNTÜLER: düzenleme yoktur, bu yüzden kayıt da yoktur. Sunum
 * sırasında yanlışlıkla içerik değişmesi mümkün değil.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageProvider'
import { presentationStore } from '@/lib/sunum/store'
import { getTheme } from '@/lib/sunum/themes'
import type { Presentation } from '@/lib/sunum/types'
import { sunumText } from '@/lib/sunum/ui-text'
import Icon from './Icon'
import SlideCanvas from './SlideCanvas'
import SlideRenderer from './SlideRenderer'
import { StateCard } from './ui'

type Transition = 'fade' | 'slide' | 'none'
const TRANSITION_KEY = 'sunum-studio:transition'

/** Kaydırma jestinin slayt değiştirmesi için gereken en küçük mesafe (px). */
const SWIPE_PX = 48

export default function PresentMode({ id }: { id: string }) {
  const { lang } = useLanguage()
  const t = sunumText(lang)

  const [ready, setReady] = useState(false)
  const [presentation, setPresentation] = useState<Presentation | null>(null)
  const [index, setIndex] = useState(0)
  const [showNotes, setShowNotes] = useState(false)
  const [overview, setOverview] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [transition, setTransition] = useState<Transition>('fade')
  /** Geçiş yönü: sağa mı sola mı gidiliyor (kaydırma animasyonu için). */
  const [direction, setDirection] = useState(1)

  const stageRef = useRef<HTMLDivElement>(null)
  const touchX = useRef<number | null>(null)

  useEffect(() => {
    setPresentation(presentationStore.get(id))
    setReady(true)
    try {
      const saved = localStorage.getItem(TRANSITION_KEY)
      if (saved === 'fade' || saved === 'slide' || saved === 'none') setTransition(saved)
    } catch {
      /* gizli mod — varsayılan geçiş kullanılır */
    }
  }, [id])

  const total = presentation ? presentation.slides.length : 0

  const go = useCallback(
    (delta: number) => {
      setDirection(delta >= 0 ? 1 : -1)
      setIndex((current) => Math.min(Math.max(current + delta, 0), Math.max(total - 1, 0)))
    },
    [total],
  )

  const toggleFullscreen = useCallback(() => {
    const el = stageRef.current
    if (!el) return
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
    else void el.requestFullscreen?.().catch(() => {})
  }, [])

  // Tam ekran durumu dışarıdan da değişebilir (Esc, tarayıcı menüsü).
  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  useEffect(() => {
    if (!presentation) return
    const onKey = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowRight':
        case 'PageDown':
        case ' ':
          event.preventDefault()
          overview ? setOverview(false) : go(1)
          break
        case 'ArrowLeft':
        case 'PageUp':
          event.preventDefault()
          go(-1)
          break
        case 'Home':
          setIndex(0)
          break
        case 'End':
          setIndex(Math.max(total - 1, 0))
          break
        case 'n':
        case 'N':
          setShowNotes((v) => !v)
          break
        case 'o':
        case 'O':
          setOverview((v) => !v)
          break
        case 'f':
        case 'F':
          toggleFullscreen()
          break
        case 'Escape':
          if (overview) setOverview(false)
          break
        default:
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [presentation, go, total, overview, toggleFullscreen])

  if (!ready) {
    return <div className="mx-auto aspect-video w-full max-w-5xl animate-pulse rounded-2xl bg-surface/[0.04]" />
  }

  if (!presentation || total === 0) {
    return (
      <StateCard
        icon="warn"
        tone="error"
        title={t.errors.notFound}
        description={t.errors.notFoundHint}
        action={
          <Link href="/sunum" className="btn-primary whitespace-nowrap">
            {t.editor.back}
          </Link>
        }
      />
    )
  }

  const safeIndex = Math.min(index, total - 1)
  const current = presentation.slides[safeIndex]
  const theme = getTheme(presentation.theme)
  const transitionClass =
    transition === 'fade' ? 'sn-transition-fade' : transition === 'slide' ? 'sn-transition-slide' : ''

  return (
    <div className="sn-app mx-auto w-full max-w-6xl">
      {/* -------------------------------- başlık -------------------------------- */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5">
        <Link
          href={`/sunum/${presentation.id}/editor`}
          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-line/10 px-3 py-2 text-[13px] font-semibold text-fg2 transition-colors hover:border-accent/50 hover:text-accent-soft"
        >
          <Icon name="left" />
          {t.previewer.exit}
        </Link>

        <p className="min-w-0 flex-1 truncate text-center font-display text-sm font-semibold text-fg">
          {presentation.title}
        </p>

        <div className="flex items-center gap-1.5">
          <select
            aria-label={t.previewer.transition}
            value={transition}
            onChange={(e) => {
              const next = e.target.value as Transition
              setTransition(next)
              try {
                localStorage.setItem(TRANSITION_KEY, next)
              } catch {
                /* tercih kaydedilemezse oturum boyunca geçerli */
              }
            }}
            className="rounded-xl border border-line/10 bg-surface/5 px-2.5 py-2 text-[12px] text-fg2 outline-none transition-colors focus:border-accent/60"
          >
            <option value="fade">{t.previewer.transitions.fade}</option>
            <option value="slide">{t.previewer.transitions.slide}</option>
            <option value="none">{t.previewer.transitions.none}</option>
          </select>

          <ToolButton
            active={overview}
            title={t.previewer.overview}
            icon="grid"
            onClick={() => setOverview((v) => !v)}
          />
          <ToolButton
            active={showNotes}
            title={t.previewer.notes}
            icon={showNotes ? 'eye' : 'eyeOff'}
            onClick={() => setShowNotes((v) => !v)}
          />
          <ToolButton
            active={fullscreen}
            title={fullscreen ? t.previewer.exitFullscreen : t.previewer.fullscreen}
            icon={fullscreen ? 'compress' : 'expand'}
            onClick={toggleFullscreen}
          />
        </div>
      </div>

      {/* -------------------------------- sahne -------------------------------- */}
      <div
        ref={stageRef}
        className="relative bg-page"
        onTouchStart={(e) => {
          touchX.current = e.touches[0]?.clientX ?? null
        }}
        onTouchEnd={(e) => {
          const start = touchX.current
          touchX.current = null
          if (start === null) return
          const delta = (e.changedTouches[0]?.clientX ?? start) - start
          if (Math.abs(delta) > SWIPE_PX) go(delta < 0 ? 1 : -1)
        }}
      >
        {overview ? (
          <div className="sn-pop grid max-h-[70vh] grid-cols-2 gap-3 overflow-y-auto p-1 sm:grid-cols-3 lg:grid-cols-4">
            {presentation.slides.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => {
                  setIndex(i)
                  setOverview(false)
                }}
                className={`overflow-hidden rounded-xl border text-left transition-all ${
                  i === safeIndex ? 'border-accent ring-2 ring-accent/25' : 'border-line/12 hover:border-accent/50'
                }`}
              >
                <SlideCanvas label={slide.title}>
                  <SlideRenderer
                    slide={slide}
                    theme={theme}
                    lang={presentation.language}
                    visual={presentation.visual}
                  />
                </SlideCanvas>
                <span className="block px-2 py-1.5 text-[11px] text-fg4">{i + 1}</span>
              </button>
            ))}
          </div>
        ) : (
          <div
            // `key` değişince React düğümü yeniler; animasyon her slaytta baştan oynar.
            key={current.id}
            className={transitionClass}
            style={{ ['--sn-dir' as string]: `${direction * 28}px` }}
          >
            <SlideCanvas shadow>
              <SlideRenderer
                slide={current}
                theme={theme}
                lang={presentation.language}
                visual={presentation.visual}
                animate
              />
            </SlideCanvas>
          </div>
        )}
      </div>

      {/* ------------------------------- gezinme ------------------------------- */}
      {!overview ? (
        <div className="mt-4 flex items-center justify-center gap-4">
          <NavButton
            side="prev"
            label={t.previewer.prev}
            disabled={safeIndex === 0}
            onClick={() => go(-1)}
          />
          <span className="min-w-[68px] text-center text-sm font-semibold tabular-nums text-fg3">
            {t.previewer.counter(safeIndex + 1, total)}
          </span>
          <NavButton
            side="next"
            label={t.previewer.next}
            disabled={safeIndex >= total - 1}
            onClick={() => go(1)}
          />
        </div>
      ) : null}

      {showNotes && !overview ? (
        <div className="sn-pop mt-4 rounded-2xl border border-line/10 bg-surface/[0.03] p-4">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-fg3">{t.previewer.notes}</p>
          <p className="whitespace-pre-line text-sm leading-relaxed text-fg2">{current.notes || '—'}</p>
        </div>
      ) : null}

      <p className="mt-4 text-center text-xs text-fg4">{t.previewer.hint}</p>
    </div>
  )
}

function ToolButton({
  active,
  title,
  icon,
  onClick,
}: {
  active: boolean
  title: string
  icon: 'grid' | 'eye' | 'eyeOff' | 'expand' | 'compress'
  onClick: () => void
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      onClick={onClick}
      className={`grid h-9 w-9 place-items-center rounded-xl border transition-colors ${
        active ? 'border-accent/60 bg-accent/10 text-accent-soft' : 'border-line/10 text-fg3 hover:border-accent/50'
      }`}
    >
      <Icon name={icon} />
    </button>
  )
}

function NavButton({
  side,
  label,
  disabled,
  onClick,
}: {
  side: 'prev' | 'next'
  label: string
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-line/10 px-4 py-2.5 text-[13px] font-semibold text-fg2 transition-colors hover:border-accent/50 hover:text-accent-soft disabled:opacity-40"
    >
      {side === 'prev' ? <Icon name="left" /> : null}
      {label}
      {side === 'next' ? <Icon name="right" /> : null}
    </button>
  )
}
