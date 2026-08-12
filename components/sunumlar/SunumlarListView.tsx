'use client'

import Link from 'next/link'
import { useContent, useT } from '@/lib/i18n/LanguageProvider'
import Reveal from '@/components/Reveal'
import { ArrowRightIcon, ArrowUpRightIcon } from '@/components/Icons'

export default function SunumlarListView() {
  const t = useT()
  const { presentations } = useContent()

  return (
    <>
      <Reveal className="mx-auto max-w-2xl text-center">
        <span className="section-label justify-center">
          <span className="h-px w-6 bg-accent/60" />
          {t.presentations.label}
        </span>
        <h1 className="font-display text-4xl font-bold tracking-tight text-fg sm:text-5xl">
          {t.presentations.pageTitlePre}{' '}
          <span className="gradient-text">{t.presentations.pageTitleAccent}</span>
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-fg3">
          {t.presentations.pageDescription}
        </p>

        {/* Sunum uygulamaları Türkçedir; yalnızca İngilizce arayüzde uyarı gösterilir. */}
        {t.presentations.contentLanguageNotice && (
          <p className="mx-auto mt-5 max-w-xl rounded-2xl border border-amber-400/25 bg-amber-400/[0.06] px-4 py-3 text-left text-[13.5px] leading-relaxed text-amber-100/90">
            🇹🇷 {t.presentations.contentLanguageNotice}
          </p>
        )}
      </Reveal>

      <div className="mt-14 grid gap-6">
        {presentations.map((p, i) => (
          <Reveal key={p.slug} delay={i * 80}>
            <div className="glass card-hover group grid gap-6 overflow-hidden rounded-3xl p-6 sm:p-8 lg:grid-cols-[1.4fr_1fr]">
              <div className="flex flex-col">
                <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-accent-soft">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                  {p.badge}
                </span>

                <h2 className="font-display text-xl font-bold leading-snug text-fg transition-colors group-hover:text-accent-soft sm:text-2xl">
                  {p.title}
                </h2>
                <p className="mt-1 text-[13px] font-medium text-fg4">{p.subtitle}</p>
                <p className="mt-3 text-[14px] leading-relaxed text-fg3">{p.description}</p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {p.tags.map((tag) => (
                    <span key={tag} className="chip">
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Link href={`/sunumlar/${p.slug}`} className="btn-primary px-5 py-2.5 text-[13px]">
                    {t.presentations.openCta}
                    <ArrowRightIcon width={16} height={16} />
                  </Link>
                  <a
                    href={p.embedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-ghost px-5 py-2.5 text-[13px]"
                  >
                    {t.presentations.newTab}
                    <ArrowUpRightIcon width={16} height={16} />
                  </a>
                </div>
              </div>

              <div
                className={`relative flex flex-col justify-center gap-4 overflow-hidden rounded-2xl border border-line/10 bg-gradient-to-br ${p.cover} p-6`}
              >
                <div className="absolute inset-0 bg-grid-pattern bg-[size:22px_22px] opacity-30" />
                <div className="relative grid grid-cols-3 gap-3">
                  {p.stats.map((s) => (
                    <div key={s.label} className="text-center">
                      <div className="font-display text-2xl font-bold text-fg">{s.value}</div>
                      <div className="mt-1 text-[10.5px] uppercase tracking-wider text-fg2/80">
                        {s.label}
                      </div>
                    </div>
                  ))}
                </div>
                <ul className="relative space-y-1.5 rounded-xl border border-line/10 bg-page/70 p-4 text-[12px] leading-relaxed text-fg3 backdrop-blur">
                  {p.topics.map((topic, idx) => (
                    <li key={topic} className="flex items-center gap-2">
                      <span className="shrink-0 font-mono text-[10px] text-accent-soft">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      {topic}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </>
  )
}
