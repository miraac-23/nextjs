'use client'

/**
 * Görsel (design) şablon seçiliyken son adımda gösterilen karşılaştırma kartı:
 * aynı CV + aynı ilan, önerilen ATS uyumlu şablonla yeniden puanlanır ve fark
 * gösterilir. İkinci rapor CvStudio'da hesaplanır; burada yalnızca karşılaştırılır.
 */

import { useMemo } from 'react'
import type { AtsCheck, AtsReport as Report } from '@/lib/ats/types'
import { atsText } from '@/lib/ats/ui-text'
import type { Lang } from '@/lib/i18n/config'
import { AtsIcon, CATEGORY_ICON, ScoreRing } from './primitives'
import './ats.css'

type Props = {
  /** Seçili görsel şablonla hesaplanan rapor. */
  report: Report
  /** Aynı veri ve ilanla önerilen ATS şablonuyla hesaplanan rapor. */
  alt: Report
  /** Rapor şablon bilgisi taşımazsa gösterilecek ad. */
  currentName?: string
  lang: Lang
  onSwitch: () => void
  onBrowse: () => void
}

const MAX_REASONS = 4

/** Şablondan kaynaklanan kayıplar: ATS şablonunda daha çok puan alan (ya da hiç olmayan) başarısız kontroller. */
function templateLosses(report: Report, alt: Report): { check: AtsCheck; loss: number }[] {
  const out: { check: AtsCheck; loss: number }[] = []
  report.checks.forEach((c) => {
    if (c.status !== 'fail' && c.status !== 'warn') return
    const other = alt.checks.find((x) => x.id === c.id)
    const loss = (other ? other.earned : c.weight) - c.earned
    if (loss > 0.05) out.push({ check: c, loss })
  })
  return out.sort((a, b) => b.loss - a.loss).slice(0, MAX_REASONS)
}

export default function TemplateCompare({ report, alt, currentName: nameProp, lang, onSwitch, onBrowse }: Props) {
  const t = atsText(lang)
  const tx = t.compare
  const losses = useMemo(() => templateLosses(report, alt), [report, alt])
  const delta = alt.score - report.score
  const currentName = report.template?.name ?? nameProp ?? tx.current
  const altName = alt.template?.name ?? 'Çankaya'

  return (
    <section className="ats-compare cvs-panel" data-better={delta > 0 || undefined} aria-labelledby="ats-compare-h">
      <div className="ats-compare-glow" aria-hidden="true" />

      <div className="ats-compare-head">
        <span className="ats-eyebrow">
          <AtsIcon name="scale" className="ats-inline-ic" />
          {tx.eyebrow}
        </span>
        <h3 id="ats-compare-h">{tx.title}</h3>
        <p>{tx.desc}</p>
      </div>

      <div className="ats-compare-vs" role="group" aria-label={`${currentName}: ${report.score} → ${altName}: ${alt.score}`}>
        <div className="ats-compare-side" data-grade={report.grade}>
          <ScoreRing score={report.score} grade={report.grade} size={92} stroke={11} animate={false} />
          <span className="ats-compare-lbl">
            <small>{tx.current}</small>
            <b>{currentName}</b>
          </span>
        </div>

        <div className="ats-compare-arrow" aria-hidden="true">
          <AtsIcon name="arrow" />
          {delta !== 0 && (
            <span className="ats-compare-delta" data-up={delta > 0 || undefined}>
              {tx.delta(delta)}
            </span>
          )}
        </div>

        <div className="ats-compare-side" data-grade={alt.grade} data-target>
          <ScoreRing score={alt.score} grade={alt.grade} size={92} stroke={11} animate={false} />
          <span className="ats-compare-lbl">
            <small>{t.template.family.ats}</small>
            <b>{tx.target(altName)}</b>
          </span>
        </div>
      </div>

      <div className="ats-compare-why">
        <h4 className="ats-group-h">{tx.whyTitle}</h4>
        {losses.length === 0 ? (
          <p className="ats-empty">{tx.whyEmpty}</p>
        ) : (
          <ul>
            {losses.map(({ check, loss }) => (
              <li key={check.id} data-status={check.status}>
                <AtsIcon name={CATEGORY_ICON[check.category] ?? 'layers'} className="ats-inline-ic" />
                <span title={check.detail}>{check.title}</span>
                <em>{tx.whyPts(Math.max(1, Math.round(loss)))}</em>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="ats-compare-actions">
        <button type="button" className="cvs-btn primary" onClick={onSwitch}>
          <AtsIcon name="shield" />
          {tx.switchCta}
        </button>
        <button type="button" className="cvs-btn" onClick={onBrowse}>
          <AtsIcon name="layers" />
          {tx.browseCta}
        </button>
      </div>

      <p className="ats-compare-note">
        <AtsIcon name="info" className="ats-inline-ic" />
        {tx.note}
      </p>
    </section>
  )
}
