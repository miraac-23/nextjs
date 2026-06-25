import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import BlogCard from '@/components/BlogCard'
import Reveal from '@/components/Reveal'
import { blogPosts } from '@/lib/data'

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
          <Reveal className="mx-auto max-w-2xl text-center">
            <span className="section-label justify-center">
              <span className="h-px w-6 bg-accent/60" />
              Blog
            </span>
            <h1 className="font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Yazılar & <span className="gradient-text">Notlar</span>
            </h1>
            <p className="mt-4 text-[15px] leading-relaxed text-slate-400">
              Mühendislik pratiğinden öğrendiklerim. Spring Boot mikroservislerinden Next.js
              performansına, güvenlikten DevOps’a uzanan notlar.
            </p>
          </Reveal>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {blogPosts.map((post, i) => (
              <Reveal key={post.slug} delay={i * 70}>
                <BlogCard post={post} />
              </Reveal>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
