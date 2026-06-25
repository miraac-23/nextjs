import Link from 'next/link'
import { profile, socials } from '@/lib/data'
import { iconMap } from './Icons'

export default function Footer() {
  return (
    <footer className="border-t border-line/5 py-12">
      <div className="container-x">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <Link href="/#anasayfa" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-accent to-violet-glow font-display text-sm font-bold text-ink-950">
              MG
            </span>
            <div>
              <div className="font-display text-sm font-semibold text-fg">{profile.name}</div>
              <div className="text-xs text-fg4">{profile.role}</div>
            </div>
          </Link>

          <div className="flex gap-2">
            {socials.map((s) => {
              const Icon = iconMap[s.icon]
              return (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={s.label}
                  className="grid h-10 w-10 place-items-center rounded-xl border border-line/10 bg-surface/5 text-fg3 transition-colors hover:border-accent/50 hover:text-accent-soft"
                >
                  {Icon && <Icon width={18} height={18} />}
                </a>
              )
            })}
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-line/5 pt-6 text-xs text-fg4 sm:flex-row">
          <p>© {2026} {profile.name}. Tüm hakları saklıdır.</p>
          <p className="flex items-center gap-1.5">
            <span className="font-mono">Next.js</span> · <span className="font-mono">Tailwind CSS</span> ile
            tasarlandı
          </p>
        </div>
      </div>
    </footer>
  )
}
