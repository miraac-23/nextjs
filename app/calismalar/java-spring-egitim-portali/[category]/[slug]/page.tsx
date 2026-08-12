import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Markdown from '@/components/lab/Markdown'
import ExampleBlock from '@/components/lab/ExampleBlock'
import TopicSidebar from '@/components/lab/TopicSidebar'
import TopicView from '@/components/lab/TopicView'
import { portalCategories, portalTopics } from '@/lib/portal'

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
  const neighbour = (t: typeof prev) =>
    t ? { category: t.category, slug: t.slug, title: t.title } : null

  return (
    <>
      <Navbar />
      <main className="relative pt-28 pb-24 sm:pt-32">
        <div className="pointer-events-none absolute inset-0 aurora opacity-40" />

        <div className="relative mx-auto w-full max-w-[88rem] px-5 sm:px-8">
          <div className="grid gap-8 lg:grid-cols-[290px_minmax(0,1fr)]">
            <aside>
              <TopicSidebar items={navItems} categories={navCats} activeId={topic.id} />
            </aside>

            <article className="min-w-0">
              <TopicView
                category={topic.category}
                categoryFallbackLabel={cat?.label}
                title={topic.title}
                summary={topic.summary}
                source={topic.source}
                comingSoon={Boolean(topic.comingSoon)}
                planned={topic.planned}
                exampleCount={topic.examples.length}
                examples={topic.examples.map((ex) => (
                  <ExampleBlock key={ex.file} example={ex} category={topic.category} />
                ))}
                readme={<Markdown>{topic.readme}</Markdown>}
                prev={neighbour(prev)}
                next={neighbour(next)}
              />
            </article>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
