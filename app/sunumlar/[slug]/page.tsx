import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { presentations, getPresentation } from '@/lib/presentations'
import SunumViewerChrome from '@/components/sunumlar/SunumViewerChrome'
import DeckFrame from '@/components/sunumlar/DeckFrame'

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
      <SunumViewerChrome slug={p.slug} />

      {/* Bağımsız sunum uygulaması */}
      <DeckFrame src={p.embedUrl} title={p.title} />
    </div>
  )
}
