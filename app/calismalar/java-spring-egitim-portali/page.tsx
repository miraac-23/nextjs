import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import PortalHomeView from '@/components/lab/PortalHomeView'
import { portalCategories, portalTopics, readyTopicCount } from '@/lib/portal'

export const metadata: Metadata = {
  title: 'Java & Spring İnteraktif Eğitim Portalı — Miraç Güntoğar',
  description:
    "Java'dan Spring Boot'a 170+ konu, çalıştırılabilir örnekler ve gerçek JVM çıktıları. Tüm mantık frontend'e taşındı.",
}

const totalExamples = portalTopics.reduce((n, t) => n + t.examples.length, 0)
const totalRunnable = portalTopics.reduce(
  (n, t) => n + t.examples.filter((e) => e.runnable).length,
  0
)

const indexItems = portalTopics.map((t) => ({
  id: t.id,
  category: t.category,
  slug: t.slug,
  title: t.title,
  summary: t.summary,
  count: t.examples.length,
  runnable: t.examples.filter((e) => e.runnable).length,
  comingSoon: Boolean(t.comingSoon),
}))

const navCats = portalCategories.map((c) => ({
  id: c.id,
  label: c.label,
  accent: c.accent,
  blurb: c.blurb,
}))

const counts = {
  topics: readyTopicCount,
  examples: totalExamples,
  runnable: totalRunnable,
  categories: portalCategories.length,
}

export default function PortalHome() {
  return (
    <>
      <Navbar />
      <main className="relative pt-32 pb-24 sm:pt-40">
        <div className="pointer-events-none absolute inset-0 aurora opacity-50" />
        <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-accent/15 blur-[120px]" />

        <div className="relative mx-auto w-full max-w-[88rem] px-5 sm:px-8">
          <PortalHomeView items={indexItems} categories={navCats} counts={counts} />
        </div>
      </main>
      <Footer />
    </>
  )
}
