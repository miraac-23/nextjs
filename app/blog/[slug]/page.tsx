import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import BlogPostView from '@/components/blog/BlogPostView'
import { blogPosts } from '@/lib/data'

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

export default function BlogPostPage({ params }: Params) {
  const post = blogPosts.find((p) => p.slug === params.slug)
  if (!post) notFound()

  return (
    <>
      <Navbar />
      <main className="relative pt-32 pb-24 sm:pt-40">
        <div className="pointer-events-none absolute inset-0 aurora opacity-50" />
        <BlogPostView slug={post.slug} />
      </main>
      <Footer />
    </>
  )
}
