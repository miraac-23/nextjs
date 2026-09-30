'use client'

/** Modül sayfalarının ortak başlığı — site kabuğuyla aynı tipografi ve rozet dili. */

import { useLanguage } from '@/lib/i18n/LanguageProvider'
import { sunumText } from '@/lib/sunum/ui-text'

export default function SunumHeader({ compact = false }: { compact?: boolean }) {
  const { lang } = useLanguage()
  const t = sunumText(lang)

  if (compact) {
    return (
      <div className="mb-5">
        <span className="section-label">{t.appTitle}</span>
      </div>
    )
  }

  return (
    <header className="mb-8 max-w-3xl">
      <span className="section-label">{t.appTitle}</span>
      <h1 className="font-display text-2xl font-bold leading-tight text-fg sm:text-3xl">
        <span className="gradient-text">{t.appTitle}</span>
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-fg3 sm:text-base">{t.appSub}</p>
      <p className="mt-3 text-xs text-fg4">{t.freeBadge}</p>
    </header>
  )
}
