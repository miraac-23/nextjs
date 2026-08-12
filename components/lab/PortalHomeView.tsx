'use client'

import Link from 'next/link'
import { useT } from '@/lib/i18n/LanguageProvider'
import PortalIndex, { type IndexCat, type IndexItem } from './PortalIndex'
import { ArrowRightIcon } from '@/components/Icons'

export default function PortalHomeView({
  items,
  categories,
  counts,
}: {
  items: IndexItem[]
  categories: IndexCat[]
  counts: { topics: number; examples: number; runnable: number; categories: number }
}) {
  const t = useT()

  const stats = [
    { value: String(counts.topics), label: t.portal.statTopics },
    { value: String(counts.examples), label: t.portal.statExamples },
    { value: String(counts.runnable), label: t.portal.statRealOutput },
    { value: String(counts.categories), label: t.portal.statCategories },
  ]

  return (
    <>
      <Link
        href="/blog#calismalar"
        className="inline-flex items-center gap-2 text-sm font-medium text-fg3 transition-colors hover:text-accent-soft"
      >
        <ArrowRightIcon width={16} height={16} className="rotate-180" />
        {t.portal.backToWorks}
      </Link>

      <div className="mt-6 max-w-3xl">
        <span className="section-label">
          <span className="h-px w-6 bg-accent/60" />
          {t.portal.label}
        </span>
        <h1 className="font-display text-3xl font-bold tracking-tight text-fg sm:text-4xl lg:text-5xl">
          {t.portal.titlePre} <span className="gradient-text">{t.portal.titleAccent}</span>
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-fg3">{t.portal.intro}</p>

        {/* Ders içeriği Türkçedir; yalnızca İngilizce arayüzde uyarı gösterilir. */}
        {t.portal.contentLanguageNotice && (
          <p className="mt-4 rounded-2xl border border-amber-400/25 bg-amber-400/[0.06] px-4 py-3 text-[13.5px] leading-relaxed text-amber-100/90">
            🇹🇷 {t.portal.contentLanguageNotice}
          </p>
        )}
      </div>

      <div className="mt-10 grid grid-cols-2 gap-3 sm:max-w-2xl sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="glass rounded-2xl px-4 py-4 text-center">
            <div className="font-display text-2xl font-bold text-fg">{s.value}</div>
            <div className="mt-1 text-[11px] uppercase tracking-wider text-fg4">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-14">
        <PortalIndex items={items} categories={categories} />
      </div>
    </>
  )
}
