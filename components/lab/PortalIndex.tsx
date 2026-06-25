'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

export type IndexItem = {
  id: string
  category: string
  slug: string
  title: string
  summary: string
  count: number
  runnable: number
  comingSoon?: boolean
}
export type IndexCat = { id: string; label: string; accent: string; blurb: string }

const BASE = '/calismalar/java-spring-egitim-portali'

export default function PortalIndex({
  items,
  categories,
}: {
  items: IndexItem[]
  categories: IndexCat[]
}) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState<string>('all')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter((t) => {
      if (active !== 'all' && t.category !== active) return false
      if (!q) return true
      return (
        t.title.toLowerCase().includes(q) ||
        t.summary.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q)
      )
    })
  }, [items, query, active])

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActive('all')}
            className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors ${
              active === 'all'
                ? 'bg-accent/15 text-accent-soft'
                : 'border border-line/10 text-fg3 hover:text-fg2'
            }`}
          >
            Tümü ({items.length})
          </button>
          {categories.map((c) => {
            const n = items.filter((i) => i.category === c.id).length
            if (!n) return null
            return (
              <button
                key={c.id}
                onClick={() => setActive(c.id)}
                className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors ${
                  active === c.id
                    ? 'bg-accent/15 text-accent-soft'
                    : 'border border-line/10 text-fg3 hover:text-fg2'
                }`}
              >
                {c.label} ({n})
              </button>
            )
          })}
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Konu ara…"
          className="w-full rounded-xl border border-line/10 bg-page/60 px-3.5 py-2 text-sm text-fg2 outline-none placeholder:text-fg4 focus:border-accent/50 sm:w-64"
        />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((t) => {
          const cat = categories.find((c) => c.id === t.category)
          return (
            <Link
              key={t.id}
              href={`${BASE}/${t.category}/${t.slug}`}
              className={`glass card-hover group flex flex-col rounded-2xl p-5 ${
                t.comingSoon ? 'border-dashed' : ''
              }`}
            >
              <div className="mb-2 flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full bg-gradient-to-r ${cat?.accent}`} />
                <span className="text-[10.5px] font-semibold uppercase tracking-wider text-fg4">
                  {cat?.label}
                </span>
                {t.comingSoon && (
                  <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-fuchsia-400/30 bg-fuchsia-400/10 px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-fuchsia-300">
                    <span className="h-1 w-1 animate-pulse rounded-full bg-fuchsia-400" />
                    Yakında
                  </span>
                )}
              </div>
              <h3 className="font-display text-[15px] font-semibold leading-snug text-fg transition-colors group-hover:text-accent-soft">
                {t.title}
              </h3>
              <p className="mt-2 line-clamp-3 flex-1 text-[12.5px] leading-relaxed text-fg3">
                {t.summary}
              </p>
              <div className="mt-4 flex items-center gap-2 text-[11px] text-fg4">
                {t.comingSoon ? (
                  <span className="rounded-md bg-fuchsia-400/10 px-2 py-0.5 text-fuchsia-300/90">
                    🚧 Çalışma devam ediyor
                  </span>
                ) : (
                  <>
                    <span className="rounded-md bg-surface/5 px-2 py-0.5">{t.count} örnek</span>
                    {t.runnable > 0 && (
                      <span className="rounded-md bg-emerald-400/10 px-2 py-0.5 text-emerald-300/80">
                        {t.runnable} çalıştırılabilir
                      </span>
                    )}
                  </>
                )}
              </div>
            </Link>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <p className="mt-12 text-center text-sm text-fg4">Sonuç bulunamadı.</p>
      )}
    </div>
  )
}
