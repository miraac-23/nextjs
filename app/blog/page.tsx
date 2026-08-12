import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import WorksSection from '@/components/WorksSection'
import BlogListView from '@/components/blog/BlogListView'
import { works } from '@/lib/works'
import { worksEn } from '@/lib/works.en'

export const metadata: Metadata = {
  title: 'Blog — Miraç Güntoğar',
  description: 'Mimari, güvenlik, performans ve DevOps üzerine mühendislik notları.',
}

export default function BlogPage() {
  return (
    <>
      <Navbar />
      <main className="relative pt-36 pb-24 sm:pt-44">
        <div className="pointer-events-none absolute inset-0 aurora opacity-60" />
        <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-accent/15 blur-[120px]" />

        <div className="container-x relative">
          <BlogListView />

          <WorksSection items={{ tr: works, en: worksEn }} />
        </div>
      </main>
      <Footer />
    </>
  )
}
