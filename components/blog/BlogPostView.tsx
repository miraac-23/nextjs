'use client'

import Link from 'next/link'
import { useContent, useT } from '@/lib/i18n/LanguageProvider'
import BlogCard from '@/components/BlogCard'
import { ArrowRightIcon, ClockIcon } from '@/components/Icons'

function formatDate(date: string, locale: string) {
  return new Date(date).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function BlogPostView({ slug }: { slug: string }) {
  const t = useT()
  const { blogPosts, profile } = useContent()

  const post = blogPosts.find((p) => p.slug === slug)
  if (!post) return null

  const related = blogPosts.filter((p) => p.slug !== post.slug).slice(0, 3)

  return (
    <>
      <article className="container-x relative">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm font-medium text-fg3 transition-colors hover:text-accent-soft"
          >
            <ArrowRightIcon width={16} height={16} className="rotate-180" />
            {t.blog.back}
          </Link>

          <div className="mt-6 flex flex-wrap items-center gap-3 text-[12px] text-fg4">
            <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 font-semibold text-accent-soft">
              {post.tag}
            </span>
            <span>{formatDate(post.date, t.locale)}</span>
            <span className="flex items-center gap-1">
              <ClockIcon width={13} height={13} />
              {post.readingTime} {t.blog.reading}
            </span>
          </div>

          <h1 className="mt-5 font-display text-3xl font-bold leading-tight tracking-tight text-fg sm:text-4xl lg:text-5xl">
            {post.title}
          </h1>

          <p className="mt-5 text-lg leading-relaxed text-fg2">{post.excerpt}</p>

          <div className={`mt-10 h-px w-full bg-gradient-to-r ${post.cover}`} />

          <div className="prose-content mt-10 space-y-6">
            {post.content.map((para, i) => (
              <p key={i} className="text-[16px] leading-[1.8] text-fg2">
                {para}
              </p>
            ))}
          </div>

          <div className="mt-12 flex items-center justify-between gap-4 rounded-2xl border border-line/10 bg-surface/[0.03] p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-accent to-violet-glow font-display text-sm font-bold text-ink-950">
                MG
              </span>
              <div>
                <div className="text-sm font-semibold text-fg">{profile.name}</div>
                <div className="text-xs text-fg4">{profile.role}</div>
              </div>
            </div>
            <Link href="/#iletisim" className="btn-ghost px-5 py-2.5 text-[13px]">
              {t.blog.contact}
            </Link>
          </div>
        </div>
      </article>

      {related.length > 0 && (
        <section className="container-x relative mt-24">
          <h2 className="mb-8 text-center font-display text-2xl font-bold text-fg">
            {t.blog.relatedPre} <span className="gradient-text">{t.blog.relatedAccent}</span>
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p) => (
              <BlogCard key={p.slug} post={p} />
            ))}
          </div>
        </section>
      )}
    </>
  )
}
