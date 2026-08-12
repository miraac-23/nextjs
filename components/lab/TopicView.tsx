'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { useT } from '@/lib/i18n/LanguageProvider'
import { ArrowRightIcon } from '@/components/Icons'

const BASE = '/calismalar/java-spring-egitim-portali'

export type TopicNeighbour = { category: string; slug: string; title: string } | null

export default function TopicView({
  category,
  categoryFallbackLabel,
  title,
  summary,
  source,
  comingSoon,
  planned,
  exampleCount,
  examples,
  readme,
  prev,
  next,
}: {
  category: string
  categoryFallbackLabel?: string
  title: string
  summary: string
  source: string
  comingSoon: boolean
  planned?: string[]
  exampleCount: number
  /**
   * Örnek blokları SUNUCUDA render edilip buraya geçilir; böylece
   * react-syntax-highlighter istemci paketine girmez.
   */
  examples: ReactNode
  /** Markdown anlatımı sunucuda render edilir ve buraya geçilir. */
  readme: ReactNode
  prev: TopicNeighbour
  next: TopicNeighbour
}) {
  const t = useT()
  const catLabel = t.portal.categories[category]?.label ?? categoryFallbackLabel ?? category

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-2 text-[12px] text-fg4">
        <Link href={BASE} className="font-medium transition-colors hover:text-accent-soft">
          {t.portal.breadcrumb}
        </Link>
        <span>/</span>
        <span className="text-fg3">{catLabel}</span>
        <span>/</span>
        <span className="text-fg2">{title}</span>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2 text-[11px]">
        <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 font-semibold uppercase tracking-wider text-accent-soft">
          {catLabel}
        </span>
        <span className="rounded-full border border-line/10 bg-surface/5 px-3 py-1 font-mono text-fg3">
          {source}
        </span>
      </div>

      <h1 className="font-display text-3xl font-bold tracking-tight text-fg sm:text-4xl">{title}</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-fg3">{summary}</p>

      {/* Ders içeriği Türkçedir; yalnızca İngilizce arayüzde uyarı gösterilir. */}
      {!comingSoon && t.portal.contentLanguageNotice && (
        <p className="mt-5 rounded-2xl border border-amber-400/25 bg-amber-400/[0.06] px-4 py-3 text-[13.5px] leading-relaxed text-amber-100/90">
          🇹🇷 {t.portal.contentLanguageNotice}
        </p>
      )}

      {comingSoon ? (
        <section className="glass mt-8 overflow-hidden rounded-3xl p-7 sm:p-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/30 bg-fuchsia-400/10 px-3.5 py-1.5 text-[12px] font-semibold uppercase tracking-wider text-fuchsia-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-fuchsia-400" />
            {t.portal.comingSoon}
          </span>
          <h2 className="mt-4 font-display text-2xl font-bold text-fg">{t.portal.comingSoonTitle}</h2>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-fg3">
            <strong className="text-fg2">{title}</strong> {t.portal.comingSoonBody}
          </p>

          {planned && planned.length > 0 && (
            <div className="mt-7">
              <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-fg4">
                {t.portal.plannedTitle}
              </div>
              <ul className="grid gap-2 sm:grid-cols-2">
                {planned.map((p) => (
                  <li
                    key={p}
                    className="flex items-start gap-2.5 rounded-xl border border-line/10 bg-surface/[0.03] px-4 py-3 text-[13.5px] text-fg2"
                  >
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent/70" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Link href={BASE} className="btn-ghost mt-8 px-5 py-2.5 text-[13px]">
            <ArrowRightIcon width={15} height={15} className="rotate-180" />
            {t.portal.browseReady}
          </Link>
        </section>
      ) : (
        <>
          {/* Anlatım */}
          <section className="glass mt-8 rounded-3xl p-5 sm:p-7">{readme}</section>

          {/* Örnekler */}
          {exampleCount > 0 && (
            <section className="mt-10">
              <h2 className="mb-5 flex items-center gap-2 font-display text-xl font-bold text-fg">
                <span className="text-accent">▶</span> {t.portal.codeExamples}
                <span className="text-[13px] font-normal text-fg4">({exampleCount})</span>
              </h2>
              <div className="space-y-6">{examples}</div>
            </section>
          )}
        </>
      )}

      {/* Prev / Next */}
      <nav className="mt-12 flex flex-col gap-3 sm:flex-row sm:justify-between">
        {prev ? (
          <Link
            href={`${BASE}/${prev.category}/${prev.slug}`}
            className="glass card-hover group flex-1 rounded-2xl p-4"
          >
            <div className="text-[11px] uppercase tracking-wider text-fg4">{t.portal.prev}</div>
            <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-fg2 group-hover:text-accent-soft">
              <ArrowRightIcon width={15} height={15} className="rotate-180" />
              {prev.title}
            </div>
          </Link>
        ) : (
          <span className="flex-1" />
        )}
        {next ? (
          <Link
            href={`${BASE}/${next.category}/${next.slug}`}
            className="glass card-hover group flex-1 rounded-2xl p-4 text-right"
          >
            <div className="text-[11px] uppercase tracking-wider text-fg4">{t.portal.next}</div>
            <div className="mt-1 flex items-center justify-end gap-2 text-sm font-semibold text-fg2 group-hover:text-accent-soft">
              {next.title}
              <ArrowRightIcon width={15} height={15} />
            </div>
          </Link>
        ) : (
          <span className="flex-1" />
        )}
      </nav>
    </>
  )
}
