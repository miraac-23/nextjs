'use client'

import { useEffect, useState } from 'react'
import { SunIcon, MoonIcon } from './Icons'

type Theme = 'dark' | 'light'

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const [theme, setTheme] = useState<Theme | null>(null)

  useEffect(() => {
    const current = (document.documentElement.getAttribute('data-theme') as Theme) || 'dark'
    setTheme(current)
  }, [])

  function toggle() {
    const next: Theme = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    try {
      localStorage.setItem('theme', next)
    } catch {}
  }

  const isLight = theme === 'light'

  return (
    <button
      onClick={toggle}
      aria-label={isLight ? 'Koyu temaya geç' : 'Açık temaya geç'}
      title={isLight ? 'Koyu tema' : 'Açık tema'}
      className={`grid h-10 w-10 place-items-center rounded-xl border border-line/10 bg-surface/5 text-fg2 transition-colors hover:border-accent/50 hover:text-accent-soft ${className}`}
    >
      {/* Render after mount to avoid hydration mismatch */}
      {theme === null ? (
        <span className="h-[18px] w-[18px]" />
      ) : isLight ? (
        <MoonIcon width={18} height={18} />
      ) : (
        <SunIcon width={18} height={18} />
      )}
    </button>
  )
}
