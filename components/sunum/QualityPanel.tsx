'use client'

/**
 * Otomatik kalite kontrolü paneli (§25).
 *
 * Sunum oluşturulduktan sonra deste denetlenir ve bulgular TEK TIKLA
 * düzeltilebilecek eylemlerle gösterilir. İki motor var ve hangisinin
 * konuştuğu her zaman yazar:
 *
 *   Yerel denetim  → varsayılan. Hiçbir ağ çağrısı yok, metin cihazdan çıkmaz.
 *   Jev derin analiz → kullanıcı açıkça açarsa. Slayt METNİ TypeSafe AI'ya gider;
 *                      bu yüzden açıklama metni bunu net söyler ve varsayılan kapalıdır.
 *
 * Her bulgunun yanında kaynağı ("ölçüm" / "AI") görünür: kullanıcı neyin
 * hesaplandığını, neyin yorum olduğunu ayırt edebilsin.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { assess, deepCheckEnabled, probeJev, setDeepCheck } from '@/lib/sunum/decide/client'
import { applyAllFixes, applyFix, type DeckAssessment, type SlideIssue } from '@/lib/sunum/decide/quality'
import type { Presentation } from '@/lib/sunum/types'
import type { SunumText } from '@/lib/sunum/ui-text'
import Icon from './Icon'
import { Badge, GhostButton } from './ui'

type Props = {
  presentation: Presentation
  onPresentation: (next: Presentation) => void
  onSelectSlide: (slideId: string) => void
  onNotify: (message: string, tone?: 'ok' | 'error') => void
  t: SunumText
}

const SEVERITY_STYLE = {
  error: 'border-rose-400/30 bg-rose-400/[0.06]',
  warn: 'border-amber-400/25 bg-amber-400/[0.05]',
  info: 'border-line/12 bg-surface/[0.03]',
} as const

const SEVERITY_ICON = { error: 'warn', warn: 'warn', info: 'info' } as const

export default function QualityPanel({ presentation, onPresentation, onSelectSlide, onNotify, t }: Props) {
  const [report, setReport] = useState<DeckAssessment | null>(null)
  const [checking, setChecking] = useState(false)
  const [deep, setDeep] = useState(false)
  const [jevAvailable, setJevAvailable] = useState(false)

  const abortRef = useRef<AbortController | null>(null)
  /** Kullanıcının "devam" etiketi — bölme düzeltmesi ikinci slayta bunu ekler. */
  const continued = presentation.language === 'en' ? '(cont.)' : '(devam)'

  const run = useCallback(
    async (useDeep: boolean) => {
      abortRef.current?.abort()
      const ctrl = new AbortController()
      abortRef.current = ctrl
      setChecking(true)
      try {
        const result = await assess(presentation, { deep: useDeep, signal: ctrl.signal })
        if (!ctrl.signal.aborted) setReport(result)
      } finally {
        if (!ctrl.signal.aborted) setChecking(false)
      }
    },
    [presentation],
  )

  useEffect(() => {
    setDeep(deepCheckEnabled())
    void probeJev().then((status) => setJevAvailable(status.available))
    return () => abortRef.current?.abort()
  }, [])

  // Deste değiştikçe rapor eskir; yerel denetim ucuz olduğu için otomatik tazelenir.
  useEffect(() => {
    void run(false)
  }, [run])

  const fixOne = (issue: SlideIssue) => {
    const next = applyFix(presentation, issue, continued)
    if (!next) {
      onNotify(t.quality.noFix, 'error')
      return
    }
    onPresentation(next)
    onNotify(t.quality.fixed(1))
  }

  const fixAll = () => {
    if (!report) return
    const { presentation: next, applied } = applyAllFixes(presentation, report.issues, continued)
    if (applied === 0) {
      onNotify(t.quality.noFix, 'error')
      return
    }
    onPresentation(next)
    onNotify(t.quality.fixed(applied))
  }

  const toggleDeep = () => {
    const next = !deep
    setDeep(next)
    setDeepCheck(next)
    void run(next)
  }

  const issues = report?.issues ?? []
  const fixable = issues.filter((i) => i.fix !== 'none' && i.slideId).length
  const score = report?.score ?? 0

  return (
    <div className="space-y-4">
      {/* --------------------------------- puan --------------------------------- */}
      <div className="rounded-2xl border border-line/10 bg-surface/[0.03] p-3.5">
        <div className="flex items-center gap-3">
          <span
            className={`grid h-12 w-12 flex-shrink-0 place-items-center rounded-xl text-base font-bold ${
              score >= 85
                ? 'bg-emerald-400/15 text-emerald-300'
                : score >= 60
                  ? 'bg-amber-400/15 text-amber-300'
                  : 'bg-rose-400/15 text-rose-300'
            }`}
          >
            {checking ? <Icon name="refresh" className="h-5 w-5 animate-spin" /> : score}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-fg">{t.quality.score}</p>
            <p className="truncate text-xs text-fg4">
              {checking
                ? t.quality.checking
                : report?.source === 'jev'
                  ? t.quality.engineJev
                  : t.quality.engineLocal}
            </p>
          </div>
        </div>
        {/* Buton kendi satırında: dar panelde puan, etiket ve buton yan yana sığmıyor. */}
        <div className="mt-3">
          <GhostButton icon="refresh" full onClick={() => void run(deep)} disabled={checking}>
            {t.quality.recheck}
          </GhostButton>
        </div>
      </div>

      {/* ------------------------------ derin analiz ------------------------------ */}
      <div className="rounded-2xl border border-line/10 p-3.5">
        <label className="flex cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            checked={deep}
            disabled={!jevAvailable}
            onChange={toggleDeep}
            className="mt-0.5 h-4 w-4 flex-shrink-0 accent-accent disabled:opacity-40"
          />
          <span className="min-w-0">
            <span className="block text-[13px] font-semibold text-fg2">{t.quality.deep}</span>
            <span className="mt-1 block text-[11px] leading-relaxed text-fg4">
              {jevAvailable ? t.quality.deepHint : t.quality.deepUnavailable}
            </span>
          </span>
        </label>
      </div>

      {/* -------------------------------- bulgular -------------------------------- */}
      {issues.length === 0 && !checking ? (
        <p className="flex items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/[0.05] px-3.5 py-3 text-xs text-emerald-200">
          <Icon name="check" />
          {t.quality.clean}
        </p>
      ) : null}

      {fixable > 1 ? (
        <GhostButton icon="wand" full onClick={fixAll}>
          {t.quality.fixAll}
        </GhostButton>
      ) : null}

      <ul className="space-y-2">
        {issues.map((issue, i) => (
          <li key={`${issue.code}-${issue.slideId}-${i}`} className={`rounded-xl border p-3 ${SEVERITY_STYLE[issue.severity]}`}>
            <div className="flex items-start gap-2.5">
              <span
                className={`mt-0.5 flex-shrink-0 ${
                  issue.severity === 'error' ? 'text-rose-300' : issue.severity === 'warn' ? 'text-amber-300' : 'text-fg4'
                }`}
              >
                <Icon name={SEVERITY_ICON[issue.severity]} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-fg2">{t.quality.issues[issue.code]}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-fg4">
                  <span>
                    {issue.slideId ? `${issue.index + 1}. ${t.editor.slides.toLowerCase()}` : t.quality.deckWide}
                  </span>
                  {issue.detail ? <span>· {issue.detail}</span> : null}
                  <Badge>{issue.by === 'ai' ? t.quality.byAi : t.quality.byRule}</Badge>
                </p>
              </div>
            </div>

            {(issue.fix !== 'none' || issue.slideId) ? (
              <div className="mt-2.5 flex flex-wrap gap-1.5 pl-[26px]">
                {issue.fix !== 'none' ? (
                  <button
                    type="button"
                    onClick={() => fixOne(issue)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-2.5 py-1.5 text-[11.5px] font-semibold text-accent-soft transition-colors hover:bg-accent/20"
                  >
                    <Icon name="wand" className="h-3.5 w-3.5" />
                    {t.quality.fixes[issue.fix]}
                  </button>
                ) : null}
                {issue.slideId ? (
                  <button
                    type="button"
                    onClick={() => onSelectSlide(issue.slideId)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-line/15 px-2.5 py-1.5 text-[11.5px] font-semibold text-fg3 transition-colors hover:border-accent/50 hover:text-accent-soft"
                  >
                    <Icon name="right" className="h-3.5 w-3.5" />
                    {t.quality.goTo}
                  </button>
                ) : null}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
