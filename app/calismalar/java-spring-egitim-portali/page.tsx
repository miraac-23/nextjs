import type { Metadata } from 'next'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import PortalIndex from '@/components/lab/PortalIndex'
import { ArrowRightIcon } from '@/components/Icons'
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

const stats = [
  { value: String(readyTopicCount), label: 'Konu' },
  { value: String(totalExamples), label: 'Örnek' },
  { value: String(totalRunnable), label: 'Gerçek çıktı' },
  { value: String(portalCategories.length), label: 'Kategori' },
]

export default function PortalHome() {
  return (
    <>
      <Navbar />
      <main className="relative pt-32 pb-24 sm:pt-40">
        <div className="pointer-events-none absolute inset-0 aurora opacity-50" />
        <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-accent/15 blur-[120px]" />

        <div className="relative mx-auto w-full max-w-[88rem] px-5 sm:px-8">
          <Link
            href="/blog#calismalar"
            className="inline-flex items-center gap-2 text-sm font-medium text-fg3 transition-colors hover:text-accent-soft"
          >
            <ArrowRightIcon width={16} height={16} className="rotate-180" />
            Çalışmalara dön
          </Link>

          <div className="mt-6 max-w-3xl">
            <span className="section-label">
              <span className="h-px w-6 bg-accent/60" />
              Çalışma · İnteraktif Portal
            </span>
            <h1 className="font-display text-3xl font-bold tracking-tight text-fg sm:text-4xl lg:text-5xl">
              Java & Spring <span className="gradient-text">Eğitim Portalı</span>
            </h1>
            <p className="mt-4 text-[15px] leading-relaxed text-fg3">
              Bu çalışmanın orijinali <strong className="text-fg2">React + Spring Boot</strong>{' '}
              mimarisindeydi: backend, örnek Java kodunu derleyip canlı çalıştırıyordu. Burada tüm
              anlatımları ve örnekleri <strong className="text-fg2">tek bir Next.js frontend</strong>’ine
              topladım. Çalıştırılabilir örneklerin çıktısı <strong className="text-fg2">yerel JDK 21
              ile gerçekten koşturularak önceden yakalandı</strong>; tarayıcıda JVM olmadığından “Çalıştır”
              bu hazır çıktıyı gösterir. Spring/Spring Boot örnekleri (Gradle ortamı gerektiren) kod +
              anlatım olarak, açık etiketle sunulur.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-3 sm:max-w-2xl sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="glass rounded-2xl px-4 py-4 text-center">
                <div className="font-display text-2xl font-bold text-fg">{s.value}</div>
                <div className="mt-1 text-[11px] uppercase tracking-wider text-fg4">
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-14">
            <PortalIndex items={indexItems} categories={navCats} />
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
