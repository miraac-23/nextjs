'use client'

import { useState } from 'react'
import { useT } from '@/lib/i18n/LanguageProvider'

export default function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  const t = useT()
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 1400)
      }}
      className="rounded-lg border border-line/10 bg-surface/5 px-2.5 py-1 text-[11px] font-medium text-fg2 transition-colors hover:border-accent/50 hover:text-accent-soft"
    >
      {copied ? t.portal.copied : label ?? t.portal.copy}
    </button>
  )
}
