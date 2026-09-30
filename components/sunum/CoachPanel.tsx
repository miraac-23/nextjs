'use client'

/**
 * Sunum koçu paneli.
 *
 * Kalite panelinden farkı: orası SLAYTA bakar (taşma, kontrast, görsel biçim),
 * burası SUNUMU YAPACAK KİŞİYE bakar — ne eksik kalmış, süre tutar mı ve
 * kullanıcının yazdığı istekler karşılanmış mı.
 *
 * Rapor tamamen deterministiktir (lib/sunum/coach.ts): AI çağrısı yapmaz, aynı
 * sunum her zaman aynı sonucu verir. AI gerektiren tek eylem — eksik konuşmacı
 * notlarını yazdırmak — mevcut refine komutuna devredilir ve slayt slayt,
 * iptal edilebilir biçimde çalışır.
 */

import { useCallback, useMemo, useRef, useState } from 'react'
import { refineSlide } from '@/lib/sunum/ai/client'
import { isAiError } from '@/lib/sunum/ai/provider'
import { buildCoachReport, formatSeconds, visualizableSlides, type CoachItem } from '@/lib/sunum/coach'
import { blankSlide } from '@/lib/sunum/templates'
import { reindex, type Presentation, type RefineAction, type Slide, type SlideType } from '@/lib/sunum/types'
import type { SunumText } from '@/lib/sunum/ui-text'
import Icon from './Icon'
import { Badge, GhostButton } from './ui'

type Props = {
  presentation: Presentation
  onPresentation: (next: Presentation) => void
  onSelectSlide: (slideId: string) => void
  onNotify: (message: string, tone?: 'ok' | 'error') => void
  /** AI bağlı mı? Not yazdırma eylemi buna bağlı. */
  aiAvailable: boolean
  t: SunumText
}

const STATUS_STYLE = {
  met: 'border-emerald-400/25 bg-emerald-400/[0.05] text-emerald-200',
  missing: 'border-amber-400/25 bg-amber-400/[0.05] text-amber-200',
  manual: 'border-line/12 bg-surface/[0.03] text-fg3',
} as const

export default function CoachPanel({
  presentation,
  onPresentation,
  onSelectSlide,
  onNotify,
  aiAvailable,
  t,
}: Props) {
  type FillField = 'notes' | 'highlight' | 'example'
  const [writing, setWriting] = useState<
    { done: number; total: number; kind: 'fill'; field: FillField } | { done: number; total: number; kind: 'visual' } | null
  >(null)
  const abortRef = useRef<AbortController | null>(null)

  // Rapor saf ve ucuz; deste değiştikçe yeniden hesaplanır.
  const report = useMemo(() => buildCoachReport(presentation), [presentation])

  /**
   * Eksik alanı olan slaytlara sırayla AI ile o alanı yazdırır.
   *
   * Eşzamanlı değil SIRAYLA: ücretsiz sağlayıcılar paralel isteklerde hız
   * sınırına takılıyor. Her adımda ilerleme gösterilir ve iptal edilebilir.
   * Yalnızca HEDEF ALAN alınır — komut metni değiştirmemeli, garantiye alıyoruz.
   */
  const fillField = useCallback(async (field: FillField) => {
    const targets = presentation.slides.filter(
      (s) => s.type !== 'title' && s.type !== 'quote' && !s[field],
    )
    if (targets.length === 0) return

    const ctrl = new AbortController()
    abortRef.current = ctrl
    setWriting({ done: 0, total: targets.length, kind: 'fill', field })

    const updated = new Map<string, Slide>()
    try {
      for (let i = 0; i < targets.length; i++) {
        if (ctrl.signal.aborted) break
        try {
          const next = await refineSlide(
            {
              slide: targets[i],
              action: field,
              audience: presentation.audience,
              language: presentation.language,
              presentationTitle: presentation.title,
            },
            ctrl.signal,
          )
          const value = next[field]
          if (value) updated.set(targets[i].id, { ...targets[i], [field]: value })
        } catch (e) {
          if (isAiError(e) && e.code === 'aborted') break
          // Tek slayt başarısız olsa da kalanlara devam edilir.
        }
        setWriting({ done: i + 1, total: targets.length, kind: 'fill', field })
      }
    } finally {
      abortRef.current = null
      setWriting(null)
    }

    if (updated.size > 0) {
      onPresentation({
        ...presentation,
        slides: presentation.slides.map((s) => updated.get(s.id) ?? s),
      })
      onNotify(t.coach.fieldWritten(updated.size, t.coach.fillLabels[field]))
    }
  }, [presentation, onPresentation, onNotify, t])

  /**
   * Düz madde listesi olan slaytları görsel biçime çevirir (§ görsel yoğunluk).
   *
   * Her slayt için AYRI ve KÜÇÜK bir AI çağrısı yapılır: çıktı tek slayt
   * olduğu için bütçesi dar ücretsiz modeller de bunu başarabiliyor —
   * sunumun tamamını yeniden üretmek onlarda çalışmıyordu.
   */
  const visualize = useCallback(async () => {
    const targets = visualizableSlides(presentation)
    if (targets.length === 0) return

    const ctrl = new AbortController()
    abortRef.current = ctrl
    setWriting({ done: 0, total: targets.length, kind: 'visual' })

    const updated = new Map<string, Slide>()
    try {
      for (let i = 0; i < targets.length; i++) {
        if (ctrl.signal.aborted) break
        try {
          const next = await refineSlide(
            {
              slide: targets[i].slide,
              action: targets[i].action as RefineAction,
              audience: presentation.audience,
              language: presentation.language,
              presentationTitle: presentation.title,
            },
            ctrl.signal,
          )
          // Dönüşüm gerçekten olduysa al; model tipi değiştirmediyse dokunma.
          if (next.type !== 'content') {
            updated.set(targets[i].slide.id, {
              ...next,
              id: targets[i].slide.id,
              presentationId: targets[i].slide.presentationId,
              order: targets[i].slide.order,
            })
          }
        } catch (e) {
          if (isAiError(e) && e.code === 'aborted') break
        }
        setWriting({ done: i + 1, total: targets.length, kind: 'visual' })
      }
    } finally {
      abortRef.current = null
      setWriting(null)
    }

    if (updated.size > 0) {
      onPresentation({
        ...presentation,
        slides: presentation.slides.map((s) => updated.get(s.id) ?? s),
      })
      onNotify(t.coach.visualized(updated.size))
    }
  }, [presentation, onPresentation, onNotify, t])

  /**
   * Karşılanmamış bir isteği gerçek bir slayda çevirir: uygun tipte boş bir
   * slayt kapanıştan hemen önce eklenir ve seçilir. Model isteği atlasa bile
   * kullanıcı çıkmaza girmiyor.
   */
  const addSlideFor = (type: SlideType, seedTitle?: string) => {
    const slides = presentation.slides.slice()
    const last = slides[slides.length - 1]
    const at = last && last.type === 'conclusion' ? slides.length - 1 : slides.length
    const fresh = blankSlide(type, presentation.id, at, presentation.language)
    // Metin aranarak denetlenen isteklerde başlık da isteği karşılamalı.
    const slide = seedTitle ? { ...fresh, title: seedTitle } : fresh
    slides.splice(at, 0, slide)
    onPresentation({ ...presentation, slides: reindex(slides) })
    onSelectSlide(slide.id)
  }

  const act = (item: CoachItem) => {
    if (item.action === 'go' && item.slideId) {
      onSelectSlide(item.slideId)
      return
    }
    if (item.action === 'write-notes') void fillField('notes')
    if (item.action === 'write-highlights') void fillField('highlight')
    if (item.action === 'write-examples') void fillField('example')
    if (item.action === 'visualize') void visualize()
  }

  const { timing, items, requirements, readiness } = report

  return (
    <div className="space-y-4">
      {/* -------------------------------- hazırlık -------------------------------- */}
      <div className="rounded-2xl border border-line/10 bg-surface/[0.03] p-3.5">
        <div className="flex items-center gap-3">
          <span
            className={`grid h-12 w-12 flex-shrink-0 place-items-center rounded-xl text-base font-bold ${
              readiness >= 85
                ? 'bg-emerald-400/15 text-emerald-300'
                : readiness >= 55
                  ? 'bg-amber-400/15 text-amber-300'
                  : 'bg-rose-400/15 text-rose-300'
            }`}
          >
            {readiness}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-fg">{t.coach.readiness}</p>
            <p className="truncate text-xs text-fg4">
              {t.coach.estimated(timing.estimatedMinutes, timing.targetMinutes)}
            </p>
          </div>
          <Badge tone={timing.verdict === 'ok' ? 'ok' : 'warn'}>
            {formatSeconds(Math.round((timing.estimatedMinutes * 60) / Math.max(1, presentation.slides.length)))}
            {' / '}
            {t.coach.perSlide.toLowerCase()}
          </Badge>
        </div>
      </div>

      {/* --------------------------- kullanıcı istekleri --------------------------- */}
      {requirements.length > 0 ? (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-fg3">
            {t.coach.requirements}
          </h4>
          <ul className="space-y-1.5">
            {requirements.map((req, i) => (
              <li
                key={`${req.text}-${i}`}
                className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-[12.5px] ${STATUS_STYLE[req.status]}`}
              >
                <span className="mt-0.5 flex-shrink-0">
                  <Icon
                    name={req.status === 'met' ? 'check' : req.status === 'missing' ? 'warn' : 'info'}
                    className="h-3.5 w-3.5"
                  />
                </span>
                <span className="min-w-0 flex-1">{req.text}</span>
                {req.status === 'missing' && req.suggests ? (
                  <button
                    type="button"
                    onClick={() => addSlideFor(req.suggests as SlideType, req.seedTitle)}
                    className="flex-shrink-0 rounded-md border border-amber-400/40 px-2 py-0.5 text-[10.5px] font-semibold transition-colors hover:bg-amber-400/15"
                  >
                    {t.coach.addSlide(t.slideTypes[req.suggests])}
                  </button>
                ) : (
                  <span className="flex-shrink-0 text-[10.5px] opacity-70">{t.coach.statuses[req.status]}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* --------------------------- tamamlama istekleri --------------------------- */}
      {items.length === 0 ? (
        <p className="flex items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/[0.05] px-3.5 py-3 text-xs text-emerald-200">
          <Icon name="check" />
          {t.coach.allDone}
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={`${item.code}-${i}`} className="rounded-xl border border-line/12 bg-surface/[0.03] p-3">
              <p className="flex items-start gap-2 text-[13px] font-medium text-fg2">
                <span className="mt-0.5 flex-shrink-0 text-amber-300">
                  <Icon name="info" />
                </span>
                <span className="min-w-0 flex-1">
                  {t.coach.items[item.code]}
                  {item.count ? ` · ${item.count}` : ''}
                  {item.detail ? ` · ${item.detail}` : ''}
                </span>
              </p>
              <p className="mt-1 pl-[26px] text-[11.5px] leading-relaxed text-fg4">{t.coach.advice[item.code]}</p>

              {item.action ? (
                <div className="mt-2 pl-[26px]">
                  {item.action === 'write-notes' ||
                  item.action === 'write-highlights' ||
                  item.action === 'write-examples' ||
                  item.action === 'visualize' ? (
                    <button
                      type="button"
                      disabled={!aiAvailable || writing !== null}
                      onClick={() => act(item)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-2.5 py-1.5 text-[11.5px] font-semibold text-accent-soft transition-colors hover:bg-accent/20 disabled:opacity-40"
                    >
                      <Icon name={writing ? 'refresh' : 'wand'} className={`h-3.5 w-3.5 ${writing ? 'animate-spin' : ''}`} />
                      {writing
                        ? writing.kind === 'visual'
                          ? t.coach.visualizing(writing.done, writing.total)
                          : t.coach.writingField(writing.done, writing.total, t.coach.fillLabels[writing.field])
                        : item.action === 'write-notes'
                          ? t.coach.writeAllNotes
                          : item.action === 'write-highlights'
                            ? t.coach.writeAllHighlights
                            : item.action === 'write-examples'
                              ? t.coach.writeAllExamples
                              : t.coach.visualize}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => act(item)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-line/15 px-2.5 py-1.5 text-[11.5px] font-semibold text-fg3 transition-colors hover:border-accent/50 hover:text-accent-soft"
                    >
                      <Icon name="right" className="h-3.5 w-3.5" />
                      {t.coach.goTo}
                    </button>
                  )}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {/* ------------------------------- süre planı ------------------------------- */}
      <details className="rounded-2xl border border-line/10 bg-surface/[0.03] p-3.5">
        <summary className="cursor-pointer text-[13px] font-semibold text-fg2">{t.coach.timing}</summary>
        <ul className="mt-3 space-y-1">
          {presentation.slides.map((slide, i) => (
            <li key={slide.id} className="flex items-center gap-2 text-[12px]">
              <span className="w-5 flex-shrink-0 text-right text-fg4">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate text-fg3">{slide.title || t.slideTypes[slide.type]}</span>
              <span
                className={`flex-shrink-0 font-mono tabular-nums ${
                  slide.id === timing.heaviestId ? 'font-bold text-accent-soft' : 'text-fg4'
                }`}
              >
                {formatSeconds(timing.perSlide[slide.id] ?? 0)}
              </span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  )
}
