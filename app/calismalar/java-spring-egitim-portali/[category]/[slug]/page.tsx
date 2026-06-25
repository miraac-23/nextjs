import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Markdown from '@/components/lab/Markdown'
import ExampleBlock from '@/components/lab/ExampleBlock'
import TopicSidebar from '@/components/lab/TopicSidebar'
import { ArrowRightIcon } from '@/components/Icons'
import { portalCategories, portalTopics } from '@/lib/portal'

const BASE = '/calismalar/java-spring-egitim-portali'

type Params = { params: { category: string; slug: string } }

export function generateStaticParams() {
  return portalTopics.map((t) => ({ category: t.category, slug: t.slug }))
}

function findTopic(category: string, slug: string) {
  return portalTopics.find((t) => t.category === category && t.slug === slug)
}

export function generateMetadata({ params }: Params): Metadata {
  const topic = findTopic(params.category, params.slug)
  if (!topic) return { title: 'Konu bulunamadı' }
  return {
    title: `${topic.title} — Eğitim Portalı`,
    description: topic.summary,
  }
}

const navItems = portalTopics.map((t) => ({
  id: t.id,
  category: t.category,
  slug: t.slug,
  title: t.title,
  comingSoon: Boolean(t.comingSoon),
}))
const navCats = portalCategories.map((c) => ({ id: c.id, label: c.label, accent: c.accent }))

export default function TopicPage({ params }: Params) {
  const topic = findTopic(params.category, params.slug)
  if (!topic) notFound()

  const cat = portalCategories.find((c) => c.id === topic.category)
  const sameCat = portalTopics.filter((t) => t.category === topic.category)
  const idx = sameCat.findIndex((t) => t.id === topic.id)
  const prev = idx > 0 ? sameCat[idx - 1] : null
  const next = idx < sameCat.length - 1 ? sameCat[idx + 1] : null

  return (
    <>
      <Navbar />
      <main className="relative pt-28 pb-24 sm:pt-32">
        <div className="pointer-events-none absolute inset-0 aurora opacity-40" />

        <div className="relative mx-auto w-full max-w-[88rem] px-5 sm:px-8">
          <div className="mb-6 flex flex-wrap items-center gap-2 text-[12px] text-fg4">
            <Link href={BASE} className="font-medium transition-colors hover:text-accent-soft">
              Eğitim Portalı
            </Link>
            <span>/</span>
            <span className="text-fg3">{cat?.label}</span>
            <span>/</span>
            <span className="text-fg2">{topic.title}</span>
          </div>

          <div className="grid gap-8 lg:grid-cols-[290px_minmax(0,1fr)]">
            <aside>
              <TopicSidebar items={navItems} categories={navCats} activeId={topic.id} />
            </aside>

            <article className="min-w-0">
              <div className="mb-5 flex flex-wrap items-center gap-2 text-[11px]">
                <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 font-semibold uppercase tracking-wider text-accent-soft">
                  {cat?.label}
                </span>
                <span className="rounded-full border border-line/10 bg-surface/5 px-3 py-1 font-mono text-fg3">
                  {topic.source}
                </span>
              </div>

              <h1 className="font-display text-3xl font-bold tracking-tight text-fg sm:text-4xl">
                {topic.title}
              </h1>
              <p className="mt-3 text-[15px] leading-relaxed text-fg3">{topic.summary}</p>

              {topic.comingSoon ? (
                /* Çalışma devam ediyor — yakında */
                <section className="glass mt-8 overflow-hidden rounded-3xl p-7 sm:p-10">
                  <span className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/30 bg-fuchsia-400/10 px-3.5 py-1.5 text-[12px] font-semibold uppercase tracking-wider text-fuchsia-300">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-fuchsia-400" />
                    Yakında
                  </span>
                  <h2 className="mt-4 font-display text-2xl font-bold text-fg">
                    Bu konunun içeriği hazırlanıyor 🚧
                  </h2>
                  <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-fg3">
                    <strong className="text-fg2">{topic.title}</strong> üzerinde çalışma devam ediyor.
                    Anlatım ve örnekler çok yakında bu sayfada yer alacak.
                  </p>

                  {topic.planned && topic.planned.length > 0 && (
                    <div className="mt-7">
                      <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-fg4">
                        Planlanan başlıklar
                      </div>
                      <ul className="grid gap-2 sm:grid-cols-2">
                        {topic.planned.map((p) => (
                          <li
                            key={p}
                            className="flex items-start gap-2.5 rounded-xl border border-line/10 bg-surface/[0.03] px-4 py-3 text-[13.5px] text-fg2"
                          >
                            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent/70" />
                            {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <Link href={BASE} className="btn-ghost mt-8 px-5 py-2.5 text-[13px]">
                    <ArrowRightIcon width={15} height={15} className="rotate-180" />
                    Hazır konulara göz at
                  </Link>
                </section>
              ) : (
                <>
                  {/* Anlatım */}
                  <section className="glass mt-8 rounded-3xl p-5 sm:p-7">
                    <Markdown>{topic.readme}</Markdown>
                  </section>

                  {/* Örnekler */}
                  {topic.examples.length > 0 && (
                    <section className="mt-10">
                      <h2 className="mb-5 flex items-center gap-2 font-display text-xl font-bold text-fg">
                        <span className="text-accent">▶</span> Kod Örnekleri
                        <span className="text-[13px] font-normal text-fg4">
                          ({topic.examples.length})
                        </span>
                      </h2>
                      <div className="space-y-6">
                        {topic.examples.map((ex) => (
                          <ExampleBlock key={ex.file} example={ex} category={topic.category} />
                        ))}
                      </div>
                    </section>
                  )}
                </>
              )}

              {/* Prev / Next */}
              <nav className="mt-12 flex flex-col gap-3 sm:flex-row sm:justify-between">
                {prev ? (
                  <Link
                    href={`${BASE}/${prev.category}/${prev.slug}`}
                    className="glass card-hover group flex-1 rounded-2xl p-4"
                  >
                    <div className="text-[11px] uppercase tracking-wider text-fg4">Önceki</div>
                    <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-fg2 group-hover:text-accent-soft">
                      <ArrowRightIcon width={15} height={15} className="rotate-180" />
                      {prev.title}
                    </div>
                  </Link>
                ) : (
                  <span className="flex-1" />
                )}
                {next ? (
                  <Link
                    href={`${BASE}/${next.category}/${next.slug}`}
                    className="glass card-hover group flex-1 rounded-2xl p-4 text-right"
                  >
                    <div className="text-[11px] uppercase tracking-wider text-fg4">Sonraki</div>
                    <div className="mt-1 flex items-center justify-end gap-2 text-sm font-semibold text-fg2 group-hover:text-accent-soft">
                      {next.title}
                      <ArrowRightIcon width={15} height={15} />
                    </div>
                  </Link>
                ) : (
                  <span className="flex-1" />
                )}
              </nav>
            </article>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
