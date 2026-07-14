import Link from 'next/link'
import { presentations } from '@/lib/presentations'
import SectionHeading from './SectionHeading'
import Reveal from './Reveal'
import { ArrowRightIcon } from './Icons'

export default function SunumlarPreview() {
  const items = presentations.slice(0, 2)
  return (
    <section id="sunumlar" className="relative py-24 sm:py-32">
      <div className="container-x">
        <SectionHeading
          label="Sunumlar"
          title="İnteraktif Eğitim Sunumları"
          description="Tarayıcıda gezilebilen, kavramları benzetmelerle anlatan ve tıkla-göster Soru–Cevap ile pekiştiren sunumlar."
        />

        <div className="grid gap-6">
          {items.map((p, i) => (
            <Reveal key={p.slug} delay={i * 80}>
              <Link
                href={`/sunumlar/${p.slug}`}
                className="glass card-hover group grid gap-6 overflow-hidden rounded-3xl p-6 sm:p-8 lg:grid-cols-[1.4fr_1fr]"
              >
                <div className="flex flex-col">
                  <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-accent-soft">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                    {p.badge}
                  </span>

                  <h3 className="font-display text-xl font-bold leading-snug text-fg transition-colors group-hover:text-accent-soft sm:text-2xl">
                    {p.title}
                  </h3>
                  <p className="mt-1 text-[13px] font-medium text-fg4">{p.subtitle}</p>
                  <p className="mt-3 flex-1 text-[14px] leading-relaxed text-fg3">{p.description}</p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {p.tags.map((t) => (
                      <span key={t} className="chip">
                        {t}
                      </span>
                    ))}
                  </div>

                  <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-accent transition-all duration-300 group-hover:gap-3">
                    Sunumu aç
                    <ArrowRightIcon width={16} height={16} />
                  </span>
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
                  <div className="relative rounded-xl border border-line/10 bg-page/70 p-3 font-mono text-[11px] leading-relaxed text-emerald-300/90 backdrop-blur">
                    <span className="text-fg4">← → ile gez · S–C tıkla-göster</span>
                    <br />
                    <span className="text-accent-soft">▶ Slaytları aç → kavramları keşfet</span>
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-10 text-center">
          <Link href="/sunumlar" className="btn-ghost">
            Tüm sunumları gör
            <ArrowRightIcon width={18} height={18} />
          </Link>
        </Reveal>
      </div>
    </section>
  )
}
