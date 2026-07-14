import type { Metadata } from 'next'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Reveal from '@/components/Reveal'
import { presentations } from '@/lib/presentations'
import { ArrowRightIcon, ArrowUpRightIcon } from '@/components/Icons'

export const metadata: Metadata = {
  title: 'Sunumlar — Miraç Güntoğar',
  description:
    'Tarayıcıda gezilebilen interaktif eğitim sunumları. Java & Spring kapsamlı eğitim sunumu ve daha fazlası.',
}

export default function SunumlarPage() {
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
              Sunumlar
            </span>
            <h1 className="font-display text-4xl font-bold tracking-tight text-fg sm:text-5xl">
              İnteraktif <span className="gradient-text">Eğitim Sunumları</span>
            </h1>
            <p className="mt-4 text-[15px] leading-relaxed text-fg3">
              Slaytlar arasında gezinen, kavramları benzetmelerle anlatan ve tıkla-göster
              Soru–Cevap ile pekiştiren tarayıcı tabanlı sunumlar. Kurulum gerektirmez.
            </p>
          </Reveal>

          <div className="mt-14 grid gap-6">
            {presentations.map((p, i) => (
              <Reveal key={p.slug} delay={i * 80}>
                <div className="glass card-hover group grid gap-6 overflow-hidden rounded-3xl p-6 sm:p-8 lg:grid-cols-[1.4fr_1fr]">
                  <div className="flex flex-col">
                    <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-accent-soft">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                      {p.badge}
                    </span>

                    <h2 className="font-display text-xl font-bold leading-snug text-fg transition-colors group-hover:text-accent-soft sm:text-2xl">
                      {p.title}
                    </h2>
                    <p className="mt-1 text-[13px] font-medium text-fg4">{p.subtitle}</p>
                    <p className="mt-3 text-[14px] leading-relaxed text-fg3">{p.description}</p>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {p.tags.map((t) => (
                        <span key={t} className="chip">
                          {t}
                        </span>
                      ))}
                    </div>

                    <div className="mt-6 flex flex-wrap items-center gap-3">
                      <Link href={`/sunumlar/${p.slug}`} className="btn-primary px-5 py-2.5 text-[13px]">
                        Sunumu Aç
                        <ArrowRightIcon width={16} height={16} />
                      </Link>
                      <a
                        href={p.embedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-ghost px-5 py-2.5 text-[13px]"
                      >
                        Yeni sekmede
                        <ArrowUpRightIcon width={16} height={16} />
                      </a>
                    </div>
                  </div>

                  <div
                    className={`relative flex flex-col justify-center gap-4 overflow-hidden rounded-2xl border border-line/10 bg-gradient-to-br ${p.cover} p-6`}
                  >
                    <div className="absolute inset-0 bg-grid-pattern bg-[size:22px_22px] opacity-30" />
                    <div className="relative grid grid-cols-3 gap-3">
                      {p.stats.map((s) => (
                        <div key={s.label} className="text-center">
                          <div className="font-display text-2xl font-bold text-fg">{s.value}</div>
                          <div className="mt-1 text-[10.5px] uppercase tracking-wider text-fg2/80">
                            {s.label}
                          </div>
                        </div>
                      ))}
                    </div>
                    <ul className="relative space-y-1.5 rounded-xl border border-line/10 bg-page/70 p-4 text-[12px] leading-relaxed text-fg3 backdrop-blur">
                      {p.topics.map((t, idx) => (
                        <li key={t} className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-accent-soft">
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
