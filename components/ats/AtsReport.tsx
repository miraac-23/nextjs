'use client'

/**
 * ATS raporu — hem CV Stüdyosu'nun son adımında hem de yükleme sayfasında aynı
 * bileşen kullanılır. Rapor metinleri (kontrol başlıkları, açıklamalar, kategori
 * adları) skor motorundan yerelleştirilmiş gelir; burada yalnızca kabuk metinleri
 * vardır (lib/ats/ui-text.ts).
 *
 * Model: beş kategori (formatting, searchability, hardSkills, softSkills,
 * recruiterTips) — Jobscan / Resume Worded yapısı + katı ATS biçim kuralları.
 */

import { useMemo, useState, type ReactNode } from 'react'
import type {
  AtsCheck,
  AtsFixTarget,
  AtsKeywordHit,
  AtsKeywordReport,
  AtsReport as Report,
  AtsStatus,
  ResumeSection,
  StructuredResume,
} from '@/lib/ats/types'
import { atsText, type AtsText } from '@/lib/ats/ui-text'
import type { Lang } from '@/lib/i18n/config'
import { AtsIcon, CATEGORY_ICON, Meter, ScoreRing, StatusIcon, toneOf, type AtsIconName } from './primitives'
import './ats.css'

type Props = {
  report: Report
  lang: Lang
  onFix?: (target: AtsFixTarget) => void
  variant?: 'builder' | 'upload'
  /** Hero kartının hemen altına yerleşir (ör. şablon karşılaştırması, iş ilanı paneli). */
  afterHero?: ReactNode
}

type Filter = 'all' | 'fail' | 'warn' | 'pass'

/** Ağırlıklar ondalıklı olabilir; gereksiz ".0" gösterilmez. */
const num = (n: number) => (Math.round(n * 10) / 10).toString()

const isSkillKey = (key: string) => key === 'hardSkills' || key === 'softSkills'

export default function AtsReport({ report, lang, onFix, variant = 'builder', afterHero }: Props) {
  const t = atsText(lang)

  // Yükleme sayfasında CV'yi düzenleyecek bir form yok; yalnızca ilan hedefi anlamlı.
  const canFix = (target?: AtsFixTarget): target is AtsFixTarget =>
    !!onFix && !!target && (variant === 'builder' || target === 'job')

  const hasInfo = report.checks.some((c) => c.status === 'info')

  return (
    <div className="ats-report" data-variant={variant}>
      {report.template && (
        <TemplateStrip
          template={report.template}
          t={t}
          onChange={canFix('template') ? () => onFix?.('template') : undefined}
        />
      )}

      <Hero report={report} t={t} variant={variant} hasInfo={hasInfo} />

      {afterHero}

      <div className="ats-duo">
        <Categories report={report} t={t} />
        <TopFixes report={report} t={t} canFix={canFix} onFix={onFix} />
      </div>

      <Method report={report} t={t} />

      <Keywords keywords={report.keywords} t={t} onAdd={canFix('job') ? () => onFix?.('job') : undefined} />

      <Checks report={report} t={t} canFix={canFix} onFix={onFix} />

      <Checklist checks={report.checks} t={t} />

      <ParserView report={report} t={t} />
    </div>
  )
}

/* ============================== şablon şeridi ============================== */

function TemplateStrip({
  template,
  t,
  onChange,
}: {
  template: NonNullable<Report['template']>
  t: AtsText
  onChange?: () => void
}) {
  const ats = template.family === 'ats'
  return (
    <div className="ats-tplstrip cvs-panel" data-family={template.family}>
      <span className="ats-tplstrip-ic" aria-hidden="true">
        <AtsIcon name={ats ? 'shield' : 'palette'} />
      </span>
      <span className="ats-tplstrip-txt">
        <small>{t.template.computedFor}</small>
        <span>
          <b>{template.name}</b>
          <span className="ats-fam" data-family={template.family}>
            {t.template.family[template.family]}
          </span>
        </span>
      </span>
      {onChange && (
        <button type="button" className="cvs-btn sm ats-tplstrip-btn" onClick={onChange}>
          <AtsIcon name="layers" />
          {t.template.change}
        </button>
      )}
    </div>
  )
}

/* ================================== hero =================================== */

function Hero({ report, t, variant, hasInfo }: { report: Report; t: AtsText; variant: 'builder' | 'upload'; hasInfo: boolean }) {
  const s = report.stats
  const stats: { k: string; v: string; ic: AtsIconName }[] = [
    { k: t.stats.sections, v: String(s.sectionsFound), ic: 'heading' },
    { k: t.stats.bullets, v: String(s.bullets), ic: 'text' },
    { k: t.stats.quantified, v: s.bullets ? `${s.quantifiedBullets}/${s.bullets}` : '—', ic: 'target' },
    { k: t.stats.pages, v: String(s.pages || '—'), ic: 'file' },
  ]
  if (s.experienceYears !== null && s.experienceYears !== undefined) {
    stats.push({ k: t.stats.years, v: t.stats.yearsValue(Math.round(s.experienceYears * 10) / 10), ic: 'layers' })
  }

  return (
    <section className="ats-hero cvs-panel" data-grade={report.grade} aria-live="polite">
      <div className="ats-hero-glow" aria-hidden="true" />
      <div className="ats-hero-ring">
        <ScoreRing score={report.score} grade={report.grade} caption={t.outOf} />
      </div>
      <div className="ats-hero-body">
        <div className="ats-hero-top">
          <span className="ats-eyebrow">
            <AtsIcon name="spark" className="ats-inline-ic" />
            {t.score}
          </span>
          <span className="ats-grade" data-grade={report.grade}>
            {report.gradeLabel}
          </span>
        </div>
        <h2 className="ats-headline">{report.headline}</h2>
        <p className="ats-hero-sub">{t.heroSub[variant]}</p>
        <dl className="ats-stats">
          {stats.map((x) => (
            <div key={x.k} className="ats-statbox">
              <dt>
                <AtsIcon name={x.ic} className="ats-inline-ic" />
                {x.k}
              </dt>
              <dd>{x.v}</dd>
            </div>
          ))}
        </dl>
        {hasInfo && (
          <p className="ats-note">
            <AtsIcon name="info" className="ats-inline-ic" />
            {t.notMeasurableNote}
          </p>
        )}
      </div>
    </section>
  )
}

/* =============================== kategoriler =============================== */

function Categories({ report, t }: { report: Report; t: AtsText }) {
  return (
    <section className="ats-card cvs-panel">
      <CardHead icon="layers" title={t.categoriesTitle} desc={t.categoriesDesc} />
      <ul className="ats-cats">
        {report.categories.map((c, i) => {
          // max 0 → kategori değerlendirilmedi (ilan yok ya da ilanda soft skill yok). İlan yokken
          // hard skills'in ilandan bağımsız kuralları (bağlam, kısaltma) puan taşıyabilir; o zaman skor + ipucu.
          const noJob = isSkillKey(c.key) && !report.keywords.provided
          const muted = c.max <= 0
          return (
            <li key={c.key} className="ats-cat" style={{ animationDelay: `${i * 60}ms` }}>
              <span className="ats-cat-ic">
                <AtsIcon name={CATEGORY_ICON[c.key] ?? 'layers'} />
              </span>
              <div className="ats-cat-main">
                <div className="ats-cat-row">
                  <span className="ats-cat-name">{c.label || t.categoryNames[c.key]}</span>
                  {muted ? (
                    <span className="ats-cat-none">{noJob ? t.noJob : t.noSoftInPosting}</span>
                  ) : (
                    <span className="ats-cat-score">
                      <b>{Math.round(c.score)}</b>
                      <small>
                        {num(c.earned)}/{num(c.max)}
                      </small>
                    </span>
                  )}
                </div>
                <Meter value={muted ? 0 : c.score} muted={muted} />
                {muted ? (
                  <span className="ats-cat-hint">{noJob ? t.noJobHint : t.noSoftInPostingHint}</span>
                ) : (
                  noJob && <span className="ats-cat-hint">{t.noJobPartial}</span>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/* ============================ nasıl puanlıyoruz? =========================== */

function Method({ report, t }: { report: Report; t: AtsText }) {
  const m = t.method
  const provided = report.keywords.provided
  // Ağırlıklar rapordan okunur (kategori max toplamı ≈ 100); sabit yazılmaz.
  const total = report.categories.reduce((a, c) => a + Math.max(0, c.max), 0)
  return (
    <details className="ats-method cvs-panel">
      <summary>
        <span className="ats-card-ic" aria-hidden="true">
          <AtsIcon name="scale" />
        </span>
        <span className="ats-method-sum">
          <b>{m.title}</b>
          <small>{m.summary}</small>
        </span>
        <AtsIcon name="chevron" className="ats-method-chev" />
      </summary>

      <div className="ats-method-body">
        <p className="ats-method-intro">{m.intro}</p>

        <div className="ats-method-grid">
          <div>
            <h4 className="ats-group-h">{m.weightsTitle(provided)}</h4>
            <ul className="ats-weights">
              {report.categories.map((c) => {
                const pct = total > 0 ? Math.round((Math.max(0, c.max) / total) * 100) : 0
                const off = pct === 0
                return (
                  <li key={c.key} data-off={off || undefined}>
                    <span className="ats-cat-ic" aria-hidden="true">
                      <AtsIcon name={CATEGORY_ICON[c.key] ?? 'layers'} />
                    </span>
                    <div className="ats-weights-main">
                      <div className="ats-weights-row">
                        <b>{c.label || t.categoryNames[c.key]}</b>
                        <em aria-label={`${m.weight} ${m.pct(pct)}`}>{off ? '—' : m.pct(pct)}</em>
                      </div>
                      <p>{t.categoryInfo[c.key]}</p>
                      <span className="ats-weights-bar" aria-hidden="true">
                        <i style={{ width: `${pct}%` }} />
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
            <p className="ats-method-note">
              <AtsIcon name="info" className="ats-inline-ic" />
              {provided ? m.jobNote.with : m.jobNote.without}
            </p>
          </div>

          <div className="ats-method-side">
            <div>
              <h4 className="ats-group-h">{m.capsTitle}</h4>
              <p className="ats-method-small">{m.capsDesc}</p>
              <ul className="ats-caps">
                {m.caps.map((c) => (
                  <li key={c.n}>
                    <em data-tone={toneOf(c.n)}>{m.capLabel(c.n)}</em>
                    <span>{c.d}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="ats-group-h">{m.gradesTitle}</h4>
              <ul className="ats-bands">
                {m.grades.map((g) => (
                  <li key={g.k} data-grade={g.k}>
                    <i aria-hidden="true" />
                    <b>{g.r}</b>
                    <span>{g.l}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </details>
  )
}

/* =========================== önce bunları düzelt =========================== */

type FixProps = {
  report: Report
  t: AtsText
  canFix: (target?: AtsFixTarget) => target is AtsFixTarget
  onFix?: (target: AtsFixTarget) => void
}

function TopFixes({ report, t, canFix, onFix }: FixProps) {
  const fixes = report.topFixes
  return (
    <section className="ats-card cvs-panel">
      <CardHead icon="wand" title={t.topFixesTitle} desc={t.topFixesDesc} />
      {fixes.length === 0 ? (
        <div className="ats-allgood">
          <StatusIcon status="pass" />
          <span>{t.topFixesEmpty}</span>
        </div>
      ) : (
        <ol className="ats-fixes">
          {fixes.map((c, i) => {
            const gain = Math.max(0, c.weight - c.earned)
            return (
              <li key={c.id} className="ats-fix" data-status={c.status}>
                <span className="ats-fix-n">{i + 1}</span>
                <div className="ats-fix-main">
                  <div className="ats-fix-row">
                    <b>{c.title}</b>
                    {gain > 0 && <span className="ats-gain">{t.gain(Math.max(1, Math.round(gain)))}</span>}
                  </div>
                  <p>{c.fix || c.detail}</p>
                </div>
                {canFix(c.fixTarget) && (
                  <button type="button" className="cvs-btn sm ats-fix-btn" onClick={() => onFix?.(c.fixTarget as AtsFixTarget)}>
                    {t.fix}
                    <AtsIcon name="arrow" />
                  </button>
                )}
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}

/* ============================== tüm kontroller ============================= */

function Checks({ report, t, canFix, onFix }: FixProps) {
  const [filter, setFilter] = useState<Filter>('all')
  const [open, setOpen] = useState<Record<string, boolean>>({})

  const counts = useMemo(() => {
    const c = { all: report.checks.length, fail: 0, warn: 0, pass: 0 }
    report.checks.forEach((x) => {
      if (x.status === 'fail' || x.status === 'warn' || x.status === 'pass') c[x.status] += 1
    })
    return c
  }, [report.checks])

  const groups = useMemo(() => {
    const visible = report.checks.filter((c) => filter === 'all' || c.status === filter)
    // Kategori sırası motorun verdiği sıradır; kategori listesinde olmayan anahtar sona eklenir.
    const keys = report.categories.map((c) => c.key)
    visible.forEach((c) => {
      if (keys.indexOf(c.category) < 0) keys.push(c.category)
    })
    return keys
      .map((key) => {
        const cat = report.categories.find((c) => c.key === key)
        return {
          key,
          label: cat?.label || t.categoryNames[key] || key,
          cat,
          items: visible.filter((c) => c.category === key).sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]),
        }
      })
      .filter((g) => g.items.length > 0)
  }, [report.checks, report.categories, filter, t])

  const filters: Filter[] = ['all', 'fail', 'warn', 'pass']

  return (
    <section className="ats-card cvs-panel">
      <CardHead icon="check" title={t.checksTitle} desc={t.checksDesc(report.checks.length)}>
        <div className="ats-chips" role="group" aria-label={t.checksTitle}>
          {filters.map((f) => (
            <button key={f} type="button" className="ats-chip" data-f={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {t.filters[f]}
              <span>{counts[f]}</span>
            </button>
          ))}
        </div>
      </CardHead>

      {groups.length === 0 ? (
        <p className="ats-empty">{t.filterEmpty}</p>
      ) : (
        <div className="ats-groups">
          {groups.map((g) => (
            <div key={g.key} className="ats-group">
              <h4 className="ats-group-h">
                <AtsIcon name={CATEGORY_ICON[g.key] ?? 'layers'} className="ats-inline-ic" />
                {g.label}
                {g.cat && g.cat.max > 0 && (
                  <span className="ats-group-score" data-tone={toneOf(g.cat.score)}>
                    {Math.round(g.cat.score)}
                  </span>
                )}
              </h4>
              <ul className="ats-checks">
                {g.items.map((c) => (
                  <CheckRow
                    key={c.id}
                    check={c}
                    t={t}
                    open={!!open[c.id]}
                    onToggle={() => setOpen((o) => ({ ...o, [c.id]: !o[c.id] }))}
                    fixable={canFix(c.fixTarget)}
                    onFix={onFix}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

const STATUS_ORDER: Record<AtsStatus, number> = { fail: 0, warn: 1, info: 2, pass: 3 }

function CheckRow({
  check: c,
  t,
  open,
  onToggle,
  fixable,
  onFix,
}: {
  check: AtsCheck
  t: AtsText
  open: boolean
  onToggle: () => void
  fixable: boolean
  onFix?: (target: AtsFixTarget) => void
}) {
  const bodyId = `ats-check-${c.id}`
  const hasMore = !!(c.detail || c.fix)
  return (
    <li className="ats-check" data-status={c.status} data-open={open || undefined}>
      <button type="button" className="ats-check-head" onClick={onToggle} aria-expanded={open} aria-controls={bodyId} disabled={!hasMore}>
        <StatusIcon status={c.status} label={t.status[c.status]} />
        <span className="ats-check-title">
          <b>{c.title}</b>
          {!open && c.detail && <small>{c.detail}</small>}
        </span>
        {c.status === 'info' ? (
          <span className="ats-pts" data-info>
            {t.notMeasurable}
          </span>
        ) : (
          <span className="ats-pts">{t.points(Number(num(c.earned)), Number(num(c.weight)))}</span>
        )}
        {hasMore && <AtsIcon name="chevron" className="ats-check-chev" />}
      </button>
      {open && hasMore && (
        <div className="ats-check-body" id={bodyId}>
          {c.detail && <p>{c.detail}</p>}
          {c.fix && c.status !== 'pass' && (
            <div className="ats-howto">
              <span>{t.howToFix}</span>
              <p>{c.fix}</p>
            </div>
          )}
          {fixable && c.fixTarget && c.status !== 'pass' && (
            <button type="button" className="cvs-btn sm primary" onClick={() => onFix?.(c.fixTarget as AtsFixTarget)}>
              <AtsIcon name="wand" />
              {t.fix}
            </button>
          )}
        </div>
      )}
    </li>
  )
}

/* ============================ çıktı kontrol listesi ========================= */

function Checklist({ checks, t }: { checks: AtsCheck[]; t: AtsText }) {
  const items = checks.filter((c) => c.checklist)
  const ok = items.filter((c) => c.status === 'pass').length
  return (
    <section className="ats-card cvs-panel">
      <CardHead icon="shield" title={t.checklistTitle} desc={t.checklistDesc}>
        {items.length > 0 && (
          <span className="ats-count" data-tone={toneOf(items.length ? (ok / items.length) * 100 : 0)}>
            {t.checklistCount(ok, items.length)}
          </span>
        )}
      </CardHead>
      {items.length === 0 ? (
        <p className="ats-empty">{t.checklistEmpty}</p>
      ) : (
        <ul className="ats-checklist">
          {items.map((c) => (
            <li key={c.id} data-status={c.status} title={c.detail}>
              <span className="ats-box" data-status={c.status} aria-label={t.status[c.status]} role="img">
                {c.status === 'pass' ? (
                  <AtsIcon name="check" />
                ) : c.status === 'fail' ? (
                  <AtsIcon name="x" />
                ) : c.status === 'warn' ? (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M7 12h10" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 16.5h.01M9.6 9.3a2.5 2.5 0 114 2c-.9.6-1.6 1.1-1.6 2.2" />
                  </svg>
                )}
              </span>
              <span className="ats-checklist-t">{c.title}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/* ============================ anahtar kelimeler ============================ */

const IMPORTANCE_ORDER = { high: 0, medium: 1, low: 2 } as const

type Missing = AtsKeywordReport['missing'][number]

function Keywords({ keywords: k, t, onAdd }: { keywords: AtsKeywordReport; t: AtsText; onAdd?: () => void }) {
  const signals = <Signals keywords={k} t={t} />

  if (!k.provided) {
    return (
      <>
        <section className="ats-card cvs-panel ats-kw-empty">
          <span className="ats-kw-empty-ic">
            <AtsIcon name="key" />
          </span>
          <div>
            <h3>{t.keywordsEmptyTitle}</h3>
            <p>{t.keywordsEmptyDesc}</p>
          </div>
          {onAdd && (
            <button type="button" className="cvs-btn primary" onClick={onAdd}>
              <AtsIcon name="target" />
              {t.keywordsEmptyCta}
            </button>
          )}
        </section>
        {hasSignals(k) && (
          <section className="ats-card cvs-panel">
            <CardHead icon="bulb" title={t.signalsTitle} desc={t.signalsDesc} />
            {signals}
          </section>
        )}
      </>
    )
  }

  const byContext = (a: AtsKeywordHit, b: AtsKeywordHit) => Number(b.inExperience) - Number(a.inExperience) || b.count - a.count
  const byImportance = (a: Missing, b: Missing) => IMPORTANCE_ORDER[a.importance] - IMPORTANCE_ORDER[b.importance]
  const extracted = k.extracted ?? []

  return (
    <section className="ats-card cvs-panel">
      <CardHead icon="key" title={t.keywordsTitle} desc={t.keywordsDesc} />

      <div className="ats-kw-top">
        <div className="ats-kw-title" data-ok={k.titleMatch === null ? undefined : String(k.titleMatch)}>
          <StatusIcon status={k.titleMatch === null ? 'info' : k.titleMatch ? 'pass' : 'fail'} />
          <div>
            <b>{t.titleMatch}</b>
            <p>{k.titleMatch === null ? t.titleMatchNone : k.titleMatch ? t.titleMatchYes : t.titleMatchNo}</p>
          </div>
        </div>
        <div className="ats-kw-legend">
          <span>
            <i data-kind="exp" /> {t.inExperience}
          </span>
          <span>
            <i data-kind="skills" /> {t.onlySkills}
          </span>
        </div>
      </div>

      <div className="ats-kw-groups">
        <SkillGroup
          kind="hard"
          icon="tool"
          title={t.hardTitle}
          desc={t.hardDesc}
          none={t.hardNone}
          rate={k.matchRate}
          total={extracted.filter((x) => !x.soft).length}
          matched={k.matched.filter((m) => !m.soft).sort(byContext)}
          missing={k.missing.filter((m) => !m.soft).sort(byImportance)}
          t={t}
        />
        <SkillGroup
          kind="soft"
          icon="users"
          title={t.softTitle}
          desc={t.softDesc}
          none={t.softNone}
          rate={k.softMatchRate ?? 0}
          total={extracted.filter((x) => x.soft).length}
          matched={k.matched.filter((m) => m.soft).sort(byContext)}
          missing={k.missing.filter((m) => m.soft).sort(byImportance)}
          t={t}
        />
      </div>

      {hasSignals(k) && <div className="ats-kw-signals">{signals}</div>}
    </section>
  )
}

function SkillGroup({
  kind,
  icon,
  title,
  desc,
  none,
  rate,
  total,
  matched,
  missing,
  t,
}: {
  kind: 'hard' | 'soft'
  icon: AtsIconName
  title: string
  desc: string
  none: string
  rate: number
  total: number
  matched: AtsKeywordHit[]
  missing: Missing[]
  t: AtsText
}) {
  const r = Math.round(rate)
  const empty = total === 0 && matched.length === 0 && missing.length === 0
  return (
    <div className="ats-kw-group" data-kind={kind}>
      <header className="ats-kw-group-head">
        {empty ? (
          <span className="ats-kw-na" aria-hidden="true">
            <AtsIcon name={icon} />
          </span>
        ) : (
          <ScoreRing score={r} grade={toneOf(r)} size={84} stroke={11} caption={t.matchRate} />
        )}
        <div>
          <h4>
            <AtsIcon name={icon} className="ats-inline-ic" />
            {title}
          </h4>
          <p>{desc}</p>
        </div>
      </header>

      {empty ? (
        <p className="ats-empty">{none}</p>
      ) : (
        <div className="ats-kw-cols">
          <div>
            <h5 className="ats-group-h">{t.matched(matched.length)}</h5>
            <div className="ats-tags">
              {matched.map((m) => (
                <span
                  key={m.term}
                  className="ats-tag"
                  data-kind={m.inExperience ? 'exp' : m.inSkills ? 'skills' : 'text'}
                  title={m.inExperience ? t.inExperience : m.inSkills ? t.onlySkills : undefined}
                >
                  {m.inExperience && <AtsIcon name="check" />}
                  {m.term}
                  {m.count > 1 && <small>×{m.count}</small>}
                </span>
              ))}
              {matched.length === 0 && <span className="ats-empty">—</span>}
            </div>
          </div>
          <div>
            <h5 className="ats-group-h">{t.missing(missing.length)}</h5>
            <div className="ats-tags">
              {missing.map((m) => (
                <span key={m.term} className="ats-tag" data-kind="missing" data-imp={m.importance} title={t.importance[m.importance]}>
                  <i aria-hidden="true" />
                  {m.term}
                  <small>{t.importance[m.importance]}</small>
                </span>
              ))}
              {missing.length === 0 && (
                <span className="ats-allgood sm">
                  <StatusIcon status="pass" />
                  {t.noneMissing}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function hasSignals(k: AtsKeywordReport): boolean {
  return (k.skillsOnly?.length ?? 0) + (k.stuffing?.length ?? 0) + (k.unexplainedAcronyms?.length ?? 0) + (k.buzzwords?.length ?? 0) > 0
}

/** İlandan bağımsız içerik sinyalleri: klişeler, bağlamsız yetenekler, tekrar, kısaltmalar. */
function Signals({ keywords: k, t }: { keywords: AtsKeywordReport; t: AtsText }) {
  const buzz = k.buzzwords ?? []
  const skillsOnly = k.skillsOnly ?? []
  const stuffing = k.stuffing ?? []
  const acronyms = k.unexplainedAcronyms ?? []
  return (
    <div className="ats-callouts">
      {buzz.length > 0 && <Callout tone="warn" title={t.buzzwordsTitle} desc={t.buzzwordsDesc} items={buzz} />}
      {skillsOnly.length > 0 && <Callout tone="warn" title={t.skillsOnlyTitle} desc={t.skillsOnlyDesc} items={skillsOnly} />}
      {stuffing.length > 0 && <Callout tone="fail" title={t.stuffingTitle} desc={t.stuffingDesc} items={stuffing} />}
      {acronyms.length > 0 && <Callout tone="info" title={t.acronymsTitle} desc={t.acronymsDesc} items={acronyms} />}
    </div>
  )
}

function Callout({ tone, title, desc, items }: { tone: AtsStatus; title: string; desc: string; items: string[] }) {
  return (
    <div className="ats-callout" data-status={tone}>
      <StatusIcon status={tone} />
      <div>
        <b>{title}</b>
        <p>{desc}</p>
        <div className="ats-tags sm">
          {items.map((x) => (
            <span key={x} className="ats-tag" data-kind="plain">
              {x}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ============================ parser görünümü ============================== */

const FOLD_LINES = 28

const norm = (s: string) => s.trim().toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ')

/** Metin satırlarından hangilerinin bölüm başlığı olduğunu bulur. */
function headingLines(lines: string[], sections: ResumeSection[]): Record<number, ResumeSection> {
  const out: Record<number, ResumeSection> = {}
  sections.forEach((s) => {
    const h = norm(s.heading)
    if (!h) return
    const start = s.lineRange?.[0]
    if (start !== undefined && lines[start] !== undefined && norm(lines[start]) === h && !out[start]) {
      out[start] = s
      return
    }
    // lineRange yoksa ya da başlık satırını içermiyorsa: aralığın hemen öncesi, sonra ilk eşleşme.
    if (start !== undefined && start > 0 && norm(lines[start - 1] ?? '') === h && !out[start - 1]) {
      out[start - 1] = s
      return
    }
    for (let i = 0; i < lines.length; i++) {
      if (!out[i] && norm(lines[i]) === h) {
        out[i] = s
        return
      }
    }
  })
  return out
}

function ParserView({ report, t }: { report: Report; t: AtsText }) {
  const [full, setFull] = useState(false)
  const [copied, setCopied] = useState(false)
  const lines = useMemo(() => report.text.split('\n'), [report.text])
  const heads = useMemo(() => headingLines(lines, report.parsed.sections ?? []), [lines, report.parsed.sections])
  const foldable = lines.length > FOLD_LINES + 6
  const shown = foldable && !full ? lines.slice(0, FOLD_LINES) : lines

  async function copy() {
    try {
      await navigator.clipboard.writeText(report.text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      /* pano izni yoksa sessizce geç */
    }
  }

  return (
    <section className="ats-card cvs-panel">
      <CardHead icon="eye" title={t.parserTitle} desc={t.parserDesc}>
        {report.text.trim() && (
          <button type="button" className="cvs-btn sm" onClick={() => void copy()}>
            <AtsIcon name={copied ? 'check' : 'copy'} />
            {copied ? t.copied : t.copy}
          </button>
        )}
      </CardHead>

      <Fields parsed={report.parsed} t={t} />

      {report.text.trim() ? (
        <div className="ats-pre-wrap" data-folded={foldable && !full ? 'true' : undefined}>
          <pre className="ats-pre">
            {shown.map((line, i) => {
              const sec = heads[i]
              return (
                <span key={i} className="ats-line" data-n={i + 1} data-heading={sec ? (sec.standard ? 'std' : 'custom') : undefined}>
                  {line || ' '}
                  {sec && (
                    <em className="ats-line-tag">
                      {t.sectionKinds[sec.kind] ?? sec.kind}
                      {!sec.standard && ` · ${t.nonStandard}`}
                    </em>
                  )}
                </span>
              )
            })}
          </pre>
          {foldable && (
            <button type="button" className="cvs-btn sm ats-fold" onClick={() => setFull((v) => !v)} aria-expanded={full}>
              <AtsIcon name="chevron" className={full ? 'ats-flip' : undefined} />
              {full ? t.showLess : t.showAll}
            </button>
          )}
        </div>
      ) : (
        <p className="ats-empty">{t.parserEmpty}</p>
      )}
    </section>
  )
}

function Fields({ parsed, t }: { parsed: StructuredResume; t: AtsText }) {
  const c = parsed.contact ?? ({} as StructuredResume['contact'])
  const fields: [keyof AtsText['fields'], string][] = [
    ['name', parsed.name],
    ['title', parsed.title],
    ['email', c.email],
    ['phone', c.phone],
    ['location', c.location],
    ['linkedin', c.linkedin],
    ['github', c.github],
    ['website', c.website],
  ]
  return (
    <div className="ats-fields">
      <h4 className="ats-group-h">{t.parserFields}</h4>
      <dl>
        {fields.map(([key, value]) => {
          const ok = !!(value ?? '').trim()
          return (
            <div key={key} className="ats-fieldrow" data-ok={ok}>
              <dt>
                <StatusIcon status={ok ? 'pass' : key === 'github' || key === 'website' ? 'info' : 'warn'} />
                {t.fields[key]}
              </dt>
              <dd title={ok ? value : undefined}>{ok ? value : t.notFound}</dd>
            </div>
          )
        })}
      </dl>
    </div>
  )
}

/* ================================= ortak =================================== */

export function CardHead({ icon, title, desc, children }: { icon: AtsIconName; title: string; desc?: string; children?: ReactNode }) {
  return (
    <header className="ats-card-head">
      <span className="ats-card-ic">
        <AtsIcon name={icon} />
      </span>
      <div className="ats-card-titles">
        <h3>{title}</h3>
        {desc && <p>{desc}</p>}
      </div>
      {children && <div className="ats-card-extra">{children}</div>}
    </header>
  )
}
