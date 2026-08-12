'use client'

import { useContent, useT } from '@/lib/i18n/LanguageProvider'
import BlogCard from '@/components/BlogCard'
import Reveal from '@/components/Reveal'

export default function BlogListView() {
  const t = useT()
  const { blogPosts } = useContent()

  return (
    <>
      <Reveal className="mx-auto max-w-2xl text-center">
        <span className="section-label justify-center">
          <span className="h-px w-6 bg-accent/60" />
          {t.blog.label}
        </span>
        <h1 className="font-display text-4xl font-bold tracking-tight text-fg sm:text-5xl">
          {t.blog.pageTitlePre} <span className="gradient-text">{t.blog.pageTitleAccent}</span>
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-fg3">{t.blog.pageDescription}</p>
      </Reveal>

      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {blogPosts.map((post, i) => (
          <Reveal key={post.slug} delay={i * 70}>
            <BlogCard post={post} />
          </Reveal>
        ))}
      </div>
    </>
  )
}
