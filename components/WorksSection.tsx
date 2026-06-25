import Link from 'next/link'
import Reveal from './Reveal'
import { works } from '@/lib/works'
import { ArrowRightIcon } from './Icons'

export default function WorksSection() {
  return (
    <section id="calismalar" className="container-x relative mt-24">
      <Reveal className="mx-auto mb-12 max-w-2xl text-center">
        <span className="section-label justify-center">
          <span className="h-px w-6 bg-accent/60" />
          Çalışmalarım
        </span>
        <h2 className="font-display text-3xl font-bold tracking-tight text-fg sm:text-4xl">
          İnteraktif <span className="gradient-text">Çalışmalar</span>
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-fg3">
          Yazıların ötesinde; tarayıcıda gezilebilen, çalıştırılabilir mühendislik çalışmaları.
        </p>
      </Reveal>

      <div className="grid gap-6">
        {works.map((work, i) => (
          <Reveal key={work.slug} delay={i * 80}>
            <Link
              href={work.href}
              className="glass card-hover group grid gap-6 overflow-hidden rounded-3xl p-6 sm:p-8 lg:grid-cols-[1.4fr_1fr]"
            >
              <div className="flex flex-col">
                <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-accent-soft">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                  {work.badge}
                </span>

                <h3 className="font-display text-xl font-bold leading-snug text-fg transition-colors group-hover:text-accent-soft sm:text-2xl">
                  {work.title}
                </h3>
                <p className="mt-1 text-[13px] font-medium text-fg4">{work.subtitle}</p>
                <p className="mt-3 flex-1 text-[14px] leading-relaxed text-fg3">
                  {work.description}
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {work.tags.map((t) => (
                    <span key={t} className="chip">
                      {t}
                    </span>
                  ))}
                </div>

                <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-accent transition-all duration-300 group-hover:gap-3">
                  Çalışmayı aç
                  <ArrowRightIcon width={16} height={16} />
                </span>
              </div>

              <div
                className={`relative flex flex-col justify-center gap-4 overflow-hidden rounded-2xl border border-line/10 bg-gradient-to-br ${work.cover} p-6`}
              >
                <div className="absolute inset-0 bg-grid-pattern bg-[size:22px_22px] opacity-30" />
                <div className="relative grid grid-cols-3 gap-3">
                  {work.stats.map((s) => (
                    <div key={s.label} className="text-center">
                      <div className="font-display text-2xl font-bold text-fg">{s.value}</div>
                      <div className="mt-1 text-[10.5px] uppercase tracking-wider text-fg2/80">
                        {s.label}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="relative rounded-xl border border-line/10 bg-page/70 p-3 font-mono text-[11px] leading-relaxed text-emerald-300/90 backdrop-blur">
                  <span className="text-fg4">$ java Ornek1.java</span>
                  <br />
                  Merhaba! Java dünyasına hoş geldin.
                  <br />
                  <span className="text-accent-soft">▶ Çalıştır → çıktı hazır</span>
                </div>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
