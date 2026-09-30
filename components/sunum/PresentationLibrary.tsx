'use client'

/**
 * /sunum — cihazda kayıtlı sunumların listesi.
 *
 * Veri localStorage'dan gelir (bkz. lib/sunum/store.ts). SSR sırasında
 * localStorage yoktur; bu yüzden liste hidrasyondan sonra doldurulur ve o ana
 * kadar iskelet gösterilir — boş durumla yükleme durumu karıştırılmaz.
 */

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import Icon from './Icon'
import { useLanguage } from '@/lib/i18n/LanguageProvider'
import { presentationStore, type PresentationSummary } from '@/lib/sunum/store'
import { getTheme } from '@/lib/sunum/themes'
import { uid } from '@/lib/sunum/types'
import { sunumText } from '@/lib/sunum/ui-text'
import { Badge, Card, IconButton, StateCard, Toast } from './ui'

function formatDate(iso: string, lang: 'tr' | 'en'): string {
  try {
    return new Date(iso).toLocaleString(lang === 'en' ? 'en-US' : 'tr-TR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso.slice(0, 10)
  }
}

export default function PresentationLibrary() {
  const { lang } = useLanguage()
  const t = sunumText(lang)

  const [ready, setReady] = useState(false)
  const [items, setItems] = useState<PresentationSummary[]>([])
  const [toast, setToast] = useState<{ message: string; tone: 'ok' | 'error' } | null>(null)

  const reload = useCallback(() => setItems(presentationStore.list()), [])

  useEffect(() => {
    reload()
    setReady(true)
  }, [reload])

  const notify = (message: string, tone: 'ok' | 'error' = 'ok') => {
    setToast({ message, tone })
    window.setTimeout(() => setToast(null), 2600)
  }

  const remove = (id: string) => {
    if (!window.confirm(t.library.removeConfirm)) return
    presentationStore.remove(id)
    reload()
    notify(t.library.removed)
  }

  const duplicate = (id: string) => {
    const source = presentationStore.get(id)
    if (!source) {
      notify(t.errors.notFound, 'error')
      return
    }
    const copyId = uid('p')
    const now = new Date().toISOString()
    const result = presentationStore.save({
      ...source,
      id: copyId,
      title: `${source.title} ${t.library.copySuffix}`,
      createdAt: now,
      updatedAt: now,
      // Slaytlar yeni sunuma bağlanır: kimlikler benzersiz kalsın.
      slides: source.slides.map((slide) => ({ ...slide, id: uid('sl'), presentationId: copyId })),
    })
    if (!result.ok) {
      notify(result.reason === 'quota' ? t.errors.saveQuota : t.errors.generic, 'error')
      return
    }
    reload()
  }

  if (!ready) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-2xl border border-line/10 bg-surface/[0.03]" />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <StateCard
        icon="layout"
        title={t.library.empty}
        description={t.library.emptyHint}
        action={
          <Link href="/sunum/yeni" className="btn-primary whitespace-nowrap">
            <Icon name="plus" />
            {t.library.create}
          </Link>
        }
      />
    )
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-fg">{t.library.title}</h2>
        <Link href="/sunum/yeni" className="btn-primary whitespace-nowrap px-5 py-2.5 text-[13px]">
          <Icon name="plus" />
          {t.library.create}
        </Link>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const theme = getTheme(item.theme)
          return (
            <li key={item.id}>
              <Card className="flex h-full flex-col gap-3">
                <Link href={`/sunum/${item.id}/editor`} className="group block">
                  <span
                    className="mb-3 block h-16 w-full rounded-xl"
                    style={{ background: `linear-gradient(135deg, ${theme.heroFrom}, ${theme.heroTo})` }}
                  >
                    <span className="ml-3 mt-3 block h-1.5 w-9 rounded-full" style={{ background: theme.accent }} />
                  </span>
                  <h3 className="line-clamp-2 font-display text-[15px] font-semibold text-fg transition-colors group-hover:text-accent-soft">
                    {item.title}
                  </h3>
                </Link>

                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge>{t.library.slides(item.slideCount)}</Badge>
                  <Badge>{t.library.minutes(item.durationMinutes)}</Badge>
                  <Badge>{t.audiences[item.audience]}</Badge>
                  {item.source === 'outline' ? <Badge tone="warn">{t.library.outlineBadge}</Badge> : null}
                </div>

                <p className="text-xs text-fg4">
                  {t.library.updated}: {formatDate(item.updatedAt, lang)}
                </p>

                <div className="mt-auto flex items-center gap-2 pt-1">
                  {/* Bağlantı, buton görünümünde: <button> içine <a> yerleştirmemek için. */}
                  <Link
                    href={`/sunum/${item.id}/editor`}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-line/10 bg-surface/5 px-3.5 py-2 text-[13px] font-semibold text-fg2 transition-colors hover:border-accent/50 hover:text-accent-soft"
                  >
                    <Icon name="pencil" />
                    {t.library.open}
                  </Link>
                  <IconButton icon="plus" title={t.library.duplicate} onClick={() => duplicate(item.id)} />
                  <IconButton icon="trash" title={t.library.remove} tone="danger" onClick={() => remove(item.id)} />
                </div>
              </Card>
            </li>
          )
        })}
      </ul>

      {toast ? <Toast message={toast.message} tone={toast.tone} /> : null}
    </>
  )
}
