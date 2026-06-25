import Link from 'next/link'
import type { BlogPost } from '@/lib/data'
import { ClockIcon, ArrowRightIcon } from './Icons'

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function BlogCard({ post }: { post: BlogPost }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="glass card-hover group flex h-full flex-col overflow-hidden rounded-3xl"
    >
      <div className={`relative h-40 overflow-hidden bg-gradient-to-br ${post.cover}`}>
        <div className="absolute inset-0 bg-grid-pattern bg-[size:24px_24px] opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-t from-page/80 to-transparent" />
        <span className="absolute left-4 top-4 rounded-full border border-line/15 bg-page/70 px-3 py-1 text-[11px] font-semibold text-accent-soft backdrop-blur">
          {post.tag}
        </span>
        <span className="absolute bottom-4 right-4 font-display text-4xl font-bold text-fg/10">
          {post.tag[0]}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <div className="mb-3 flex items-center gap-3 text-[11px] text-fg4">
          <span>{formatDate(post.date)}</span>
          <span className="flex items-center gap-1">
            <ClockIcon width={12} height={12} />
            {post.readingTime}
          </span>
        </div>

        <h3 className="font-display text-lg font-semibold leading-snug text-fg transition-colors group-hover:text-accent-soft">
          {post.title}
        </h3>
        <p className="mt-2 flex-1 text-[13.5px] leading-relaxed text-fg3">{post.excerpt}</p>

        <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent transition-all duration-300 group-hover:gap-3">
          Devamını oku
          <ArrowRightIcon width={16} height={16} />
        </span>
      </div>
    </Link>
  )
}
