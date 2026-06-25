import Link from 'next/link'
import { profile, socials, stats } from '@/lib/data'
import { iconMap, ArrowRightIcon, DownloadIcon, SparkleIcon } from './Icons'

export default function Hero() {
  return (
    <section id="home" className="relative overflow-hidden pt-36 pb-20 sm:pt-44 sm:pb-28">
      {/* Background layers */}
      <div className="pointer-events-none absolute inset-0 aurora" />
      <div className="pointer-events-none absolute inset-0 bg-grid-pattern bg-[size:46px_46px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
      <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-accent/20 blur-[120px]" />

      <div className="container-x relative">
        <div className="grid items-center gap-14 lg:grid-cols-[1.15fr_0.85fr]">
          {/* Left: copy */}
          <div className="animate-fade-up">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-slate-300">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Yeni fırsatlara açık · {profile.location}
            </div>

            <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Merhaba, ben <br className="hidden sm:block" />
              <span className="gradient-text bg-[length:200%_auto] animate-gradient-x">
                {profile.name}
              </span>
            </h1>

            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-300">
              <span className="font-semibold text-slate-100">{profile.role}</span>{' '}
              <span className="text-slate-400">— {profile.tagline}</span>
            </p>

            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-slate-400">
              {profile.summary}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/#projects" className="btn-primary">
                Projelerimi Gör
                <ArrowRightIcon width={18} height={18} />
              </Link>
              <a href="/MiracGuntogarCv.pdf" className="btn-ghost" target="_blank" rel="noreferrer">
                <DownloadIcon width={18} height={18} />
                CV İndir
              </a>
            </div>

            <div className="mt-9 flex flex-wrap items-center gap-2.5">
              {socials.map((s) => {
                const Icon = iconMap[s.icon]
                return (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={s.label}
                    className="group grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition-all duration-300 hover:-translate-y-1 hover:border-accent/50 hover:text-accent-soft"
                  >
                    {Icon && <Icon width={19} height={19} />}
                  </a>
                )
              })}
            </div>
          </div>

          {/* Right: visual card */}
          <div className="relative mx-auto w-full max-w-sm animate-fade-up [animation-delay:150ms]">
            <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-tr from-accent/20 via-transparent to-violet-glow/20 blur-2xl" />
            <div className="relative animate-float">
              <div className="glass overflow-hidden rounded-[2rem] p-6">
                <div className="flex items-center justify-between">
                  <div className="flex gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-red-400/70" />
                    <span className="h-3 w-3 rounded-full bg-amber-400/70" />
                    <span className="h-3 w-3 rounded-full bg-emerald-400/70" />
                  </div>
                  <span className="font-mono text-[11px] text-slate-500">profile.ts</span>
                </div>

                <pre className="mt-5 overflow-hidden font-mono text-[12.5px] leading-relaxed text-slate-300">
                  <code>
                    <span className="text-violet-glow">const</span>{' '}
                    <span className="text-accent-soft">engineer</span> = {'{'}
                    {'\n'} role: <span className="text-emerald-300">{`'Fullstack'`}</span>,
                    {'\n'} stack: [<span className="text-emerald-300">{`'Java'`}</span>,{' '}
                    <span className="text-emerald-300">{`'Spring'`}</span>,
                    {'\n'}    <span className="text-emerald-300">{`'Next.js'`}</span>],
                    {'\n'} focus: <span className="text-emerald-300">{`'ölçeklenebilirlik'`}</span>,
                    {'\n'} learning: <span className="text-amber-300">true</span>,
                    {'\n'}
                    {'}'}
                  </code>
                </pre>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  {stats.map((s) => (
                    <div
                      key={s.label}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center"
                    >
                      <div className="font-display text-2xl font-bold gradient-text">{s.value}</div>
                      <div className="mt-1 text-[11px] uppercase tracking-wider text-slate-400">
                        {s.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="absolute -right-4 -top-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-ink-800/90 px-3 py-2 shadow-xl backdrop-blur">
                <SparkleIcon width={16} height={16} className="text-accent" />
                <span className="text-xs font-medium text-slate-200">TAKBİS · Ulusal Ölçek</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
