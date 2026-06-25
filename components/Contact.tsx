import { profile, socials } from '@/lib/data'
import SectionHeading from './SectionHeading'
import Reveal from './Reveal'
import { iconMap, MailIcon, PhoneIcon, MapPinIcon, ArrowUpRightIcon } from './Icons'

export default function Contact() {
  const contactItems = [
    { icon: MailIcon, label: 'E-posta', value: profile.email, href: `mailto:${profile.email}` },
    { icon: PhoneIcon, label: 'Telefon', value: profile.phone, href: `tel:${profile.phone.replace(/\s/g, '')}` },
    { icon: MapPinIcon, label: 'Konum', value: profile.location, href: undefined },
  ]

  return (
    <section id="iletisim" className="relative py-24 sm:py-32">
      <div className="container-x">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2.5rem] border border-line/10 bg-gradient-to-br from-page via-page to-surface2/10 p-8 sm:p-14">
            <div className="pointer-events-none absolute inset-0 aurora opacity-70" />
            <div className="pointer-events-none absolute -bottom-20 left-1/2 h-60 w-[120%] -translate-x-1/2 rounded-full bg-accent/10 blur-[120px]" />

            <div className="relative grid gap-10 lg:grid-cols-2">
              <div>
                <span className="section-label">
                  <span className="h-px w-6 bg-accent/60" />
                  İletişim
                </span>
                <h2 className="font-display text-3xl font-bold tracking-tight text-fg sm:text-4xl">
                  Birlikte değer <span className="gradient-text">üretelim</span>
                </h2>
                <p className="mt-4 max-w-md text-[15px] leading-relaxed text-fg2">
                  Yeni projeler, iş birlikleri veya sadece bir merhaba için bana ulaşabilirsiniz. En kısa sürede dönüş yapıyorum.
                </p>

                <div className="mt-8 flex flex-wrap gap-2.5">
                  {socials.map((s) => {
                    const Icon = iconMap[s.icon]
                    return (
                      <a
                        key={s.label}
                        href={s.href}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={s.label}
                        className="group grid h-12 w-12 place-items-center rounded-2xl border border-line/10 bg-surface/5 text-fg2 transition-all duration-300 hover:-translate-y-1 hover:border-accent/50 hover:text-accent-soft"
                      >
                        {Icon && <Icon width={20} height={20} />}
                      </a>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-3">
                {contactItems.map((item) => {
                  const Inner = (
                    <div className="glass card-hover flex items-center gap-4 rounded-2xl p-5">
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-accent/20 to-violet-glow/20 text-accent">
                        <item.icon width={22} height={22} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs uppercase tracking-wider text-fg4">
                          {item.label}
                        </div>
                        <div className="truncate font-medium text-fg">{item.value}</div>
                      </div>
                      {item.href && (
                        <ArrowUpRightIcon
                          width={18}
                          height={18}
                          className="text-fg4 transition-colors group-hover:text-accent"
                        />
                      )}
                    </div>
                  )
                  return item.href ? (
                    <a key={item.label} href={item.href} className="group block">
                      {Inner}
                    </a>
                  ) : (
                    <div key={item.label} className="group">
                      {Inner}
                    </div>
                  )
                })}

                <a href={`mailto:${profile.email}`} className="btn-primary mt-2 w-full">
                  <MailIcon width={18} height={18} />
                  Mesaj Gönder
                </a>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
