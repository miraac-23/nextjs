import Link from 'next/link'
import { blogPosts } from '@/lib/data'
import SectionHeading from './SectionHeading'
import Reveal from './Reveal'
import BlogCard from './BlogCard'
import { ArrowRightIcon } from './Icons'

export default function BlogPreview() {
  const posts = blogPosts.slice(0, 3)
  return (
    <section id="blog" className="relative py-24 sm:py-32">
      <div className="container-x">
        <SectionHeading
          label="Blog"
          title="Yazılar & Notlar"
          description="Mühendislik pratiğinden öğrendiklerim; mimari, güvenlik, performans ve DevOps üzerine notlar."
        />

        <div className="grid gap-5 md:grid-cols-3">
          {posts.map((post, i) => (
            <Reveal key={post.slug} delay={i * 80}>
              <BlogCard post={post} />
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-10 text-center">
          <Link href="/blog" className="btn-ghost">
            Tüm yazıları gör
            <ArrowRightIcon width={18} height={18} />
          </Link>
        </Reveal>
      </div>
    </section>
  )
}
