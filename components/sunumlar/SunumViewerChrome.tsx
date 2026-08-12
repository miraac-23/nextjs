'use client'

import Link from 'next/link'
import { useContent, useLanguage, useT } from '@/lib/i18n/LanguageProvider'
import { ArrowRightIcon, ArrowUpRightIcon } from '@/components/Icons'

export default function SunumViewerChrome({ slug }: { slug: string }) {
  const t = useT()
  const { lang } = useLanguage()
  const { presentations } = useContent()
  const p = presentations.find((item) => item.slug === slug)
  if (!p) return null

  // Sunum uygulaması aynı origin'de olduğu için dili localStorage'dan da okur;
  // ?lang= ile açılışta doğru dille başlaması garanti edilir.
  const embedWithLang = `${p.embedUrl}?lang=${lang}`

  return (
    <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-page/80 px-4 backdrop-blur">
      <Link
        href="/sunumlar"
        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-fg2 transition-colors hover:text-accent-soft"
      >
        <ArrowRightIcon width={15} height={15} className="rotate-180" />
        {t.presentations.backToList}
      </Link>

      <span className="truncate px-2 text-center font-display text-[13px] font-semibold text-fg">
        {p.title}
      </span>

      <a
        href={embedWithLang}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-fg2 transition-colors hover:text-accent-soft"
      >
        {t.presentations.newTabShort}
        <ArrowUpRightIcon width={15} height={15} />
      </a>
    </div>
  )
}
