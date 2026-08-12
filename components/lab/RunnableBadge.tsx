'use client'

import { useT } from '@/lib/i18n/LanguageProvider'

/**
 * Örnek başlığındaki "çalıştırılabilir / ortam gerekir" rozeti.
 * ExampleBlock'un SUNUCU bileşeni kalabilmesi için ayrı tutuldu — aksi halde
 * react-syntax-highlighter istemci paketine girip sayfayı ~230 kB şişiriyor.
 */
export default function RunnableBadge({ runnable }: { runnable: boolean }) {
  const t = useT()
  return (
    <span
      className={`rounded-full border px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider ${
        runnable
          ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
          : 'border-amber-400/30 bg-amber-400/10 text-amber-200'
      }`}
    >
      {runnable ? t.portal.runnable : t.portal.needsEnv}
    </span>
  )
}
