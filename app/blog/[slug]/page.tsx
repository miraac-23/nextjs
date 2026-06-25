import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import BlogCard from '@/components/BlogCard'
import { blogPosts } from '@/lib/data'
import { ArrowRightIcon, ClockIcon } from '@/components/Icons'

type Params = { params: { slug: string } }

export function generateStaticParams() {
  return blogPosts.map((p) => ({ slug: p.slug }))
}

export function generateMetadata({ params }: Params): Metadata {
  const post = blogPosts.find((p) => p.slug === params.slug)
  if (!post) return { title: 'Yazı bulunamadı' }
  return {
    title: `${post.title} — Miraç Güntoğar`,
    description: post.excerpt,
  }
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function BlogPostPage({ params }: Params) {
  const post = blogPosts.find((p) => p.slug === params.slug)
  if (!post) notFound()

  const related = blogPosts.filter((p) => p.slug !== post.slug).slice(0, 3)

  return (
    <>
      <Navbar />
      <main className="relative pt-32 pb-24 sm:pt-40">
        <div className="pointer-events-none absolute inset-0 aurora opacity-50" />

        <article className="container-x relative">
          <div className="mx-auto max-w-3xl">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition-colors hover:text-accent-soft"
            >
              <ArrowRightIcon width={16} height={16} className="rotate-180" />
              Blog’a dön
            </Link>

            <div className="mt-6 flex flex-wrap items-center gap-3 text-[12px] text-slate-500">
              <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 font-semibold text-accent-soft">
                {post.tag}
              </span>
              <span>{formatDate(post.date)}</span>
              <span className="flex items-center gap-1">
                <ClockIcon width={13} height={13} />
                {post.readingTime} okuma
              </span>
            </div>

            <h1 className="mt-5 font-display text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
              {post.title}
            </h1>

            <p className="mt-5 text-lg leading-relaxed text-slate-300">{post.excerpt}</p>

            <div className={`mt-10 h-px w-full bg-gradient-to-r ${post.cover}`} />

            <div className="prose-content mt-10 space-y-6">
              {post.content.map((para, i) => (
                <p key={i} className="text-[16px] leading-[1.8] text-slate-300">
                  {para}
                </p>
              ))}
            </div>

            <div className="mt-12 flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-accent to-violet-glow font-display text-sm font-bold text-ink-950">
                  MG
                </span>
                <div>
                  <div className="text-sm font-semibold text-slate-100">Miraç Güntoğar</div>
                  <div className="text-xs text-slate-500">Fullstack Yazılım Geliştirici</div>
                </div>
              </div>
              <Link href="/#contact" className="btn-ghost px-5 py-2.5 text-[13px]">
                İletişim
              </Link>
            </div>
          </div>
        </article>

        {related.length > 0 && (
          <section className="container-x relative mt-24">
            <h2 className="mb-8 text-center font-display text-2xl font-bold text-white">
              İlgili <span className="gradient-text">Yazılar</span>
            </h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <BlogCard key={p.slug} post={p} />
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  )
}
