'use client'

import { useState } from 'react'
import Link from 'next/link'

export type NavItem = {
  id: string
  category: string
  slug: string
  title: string
  comingSoon?: boolean
}
export type NavCat = { id: string; label: string; accent: string }

const BASE = '/calismalar/java-spring-egitim-portali'

export default function TopicSidebar({
  items,
  categories,
  activeId,
}: {
  items: NavItem[]
  categories: NavCat[]
  activeId: string
}) {
  const activeCat = items.find((i) => i.id === activeId)?.category
  const [open, setOpen] = useState<Record<string, boolean>>(
    () => Object.fromEntries(categories.map((c) => [c.id, c.id === activeCat]))
  )
  const [mobileOpen, setMobileOpen] = useState(false)

  const toggle = (id: string) => setOpen((s) => ({ ...s, [id]: !s[id] }))

  const body = (
    <nav className="space-y-2">
      {categories.map((cat) => {
        const list = items.filter((i) => i.category === cat.id)
        if (list.length === 0) return null
        const isOpen = open[cat.id]
        return (
          <div key={cat.id} className="rounded-xl border border-line/5 bg-surface/[0.02]">
            <button
              onClick={() => toggle(cat.id)}
              className="flex w-full items-center justify-between gap-2 px-3 py-2.5"
            >
              <span className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full bg-gradient-to-r ${cat.accent}`} />
                <span className="text-[12px] font-semibold uppercase tracking-wider text-fg2">
                  {cat.label}
                </span>
                <span className="text-[11px] text-fg4">{list.length}</span>
              </span>
              <span className={`text-fg4 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                ▾
              </span>
            </button>
            {isOpen && (
              <ul className="space-y-0.5 px-2 pb-2">
                {list.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`${BASE}/${t.category}/${t.slug}`}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-[12.5px] leading-snug transition-colors ${
                        t.id === activeId
                          ? 'bg-accent/10 font-semibold text-accent-soft'
                          : 'text-fg3 hover:bg-surface/5 hover:text-fg2'
                      }`}
                    >
                      <span>{t.title}</span>
                      {t.comingSoon && (
                        <span className="shrink-0 rounded-full bg-fuchsia-400/15 px-1.5 py-0.5 text-[8.5px] font-semibold uppercase tracking-wider text-fuchsia-300">
                          Yakında
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
    </nav>
  )

  return (
    <>
      <button
        onClick={() => setMobileOpen((v) => !v)}
        className="glass mb-4 flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold text-fg2 lg:hidden"
      >
        <span>Tüm Konular ({items.length})</span>
        <span className={`transition-transform ${mobileOpen ? 'rotate-180' : ''}`}>▾</span>
      </button>
      <div className={`${mobileOpen ? 'block' : 'hidden'} lg:block`}>
        <div className="glass rounded-2xl p-3 lg:sticky lg:top-28 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
          {body}
        </div>
      </div>
    </>
  )
}
