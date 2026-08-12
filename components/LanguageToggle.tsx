'use client'

import { useEffect, useState } from 'react'
import { useLanguage, useT } from '@/lib/i18n/LanguageProvider'
import { GlobeIcon } from './Icons'

export default function LanguageToggle({ className = '' }: { className?: string }) {
  const { lang, toggleLang } = useLanguage()
  const t = useT()
  const [mounted, setMounted] = useState(false)

  // Tema düğmesiyle aynı yaklaşım: hidrasyon uyuşmazlığını önlemek için mount sonrası yazı.
  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <button
      onClick={toggleLang}
      aria-label={t.language.switchTo}
      title={t.language.switchTo}
      className={`flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-line/10 bg-surface/5 px-2.5 text-fg2 transition-colors hover:border-accent/50 hover:text-accent-soft ${className}`}
    >
      {/* Dar ekranlarda üst barın taşmaması için ikon yalnızca sm ve üzerinde gösterilir. */}
      <GlobeIcon width={17} height={17} className="hidden sm:block" />
      <span className="text-[12px] font-semibold uppercase tracking-wide">
        {mounted ? lang : <span className="inline-block w-[18px]" />}
      </span>
    </button>
  )
}
