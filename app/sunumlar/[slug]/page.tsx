import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { presentations, getPresentation } from '@/lib/presentations'
import { ArrowRightIcon, ArrowUpRightIcon } from '@/components/Icons'

export function generateStaticParams() {
  return presentations.map((p) => ({ slug: p.slug }))
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const p = getPresentation(params.slug)
  if (!p) return { title: 'Sunum bulunamadı' }
  return {
    title: `${p.title} — Sunum`,
    description: p.description,
  }
}

export default function SunumViewer({ params }: { params: { slug: string } }) {
  const p = getPresentation(params.slug)
  if (!p) notFound()

  return (
    <div className="flex h-[100dvh] flex-col bg-[#0a0e1c]">
      {/* Site chrome — ince üst bar */}
      <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-page/80 px-4 backdrop-blur">
        <Link
          href="/sunumlar"
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-fg2 transition-colors hover:text-accent-soft"
        >
          <ArrowRightIcon width={15} height={15} className="rotate-180" />
          Sunumlar
        </Link>

        <span className="truncate px-2 text-center font-display text-[13px] font-semibold text-fg">
          {p.title}
        </span>

        <a
          href={p.embedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-fg2 transition-colors hover:text-accent-soft"
        >
          Yeni sekme
          <ArrowUpRightIcon width={15} height={15} />
        </a>
      </div>

      {/* Bağımsız sunum uygulaması */}
      <iframe
        src={p.embedUrl}
        title={p.title}
        className="min-h-0 w-full flex-1 border-0"
        allow="fullscreen"
        allowFullScreen
      />
    </div>
  )
}
