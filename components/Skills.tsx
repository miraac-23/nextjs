import { skillGroups } from '@/lib/data'
import SectionHeading from './SectionHeading'
import Reveal from './Reveal'
import { iconMap } from './Icons'

export default function Skills() {
  return (
    <section id="skills" className="relative py-24 sm:py-32">
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 rounded-full bg-violet-glow/10 blur-[130px]" />
      <div className="container-x relative">
        <SectionHeading
          label="Yetenekler"
          title="Teknik Cephanelik"
          description="Uçtan uca ürün geliştirmek için kullandığım teknolojiler ve mühendislik yaklaşımları."
        />

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {skillGroups.map((group, i) => {
            const Icon = iconMap[group.icon]
            return (
              <Reveal key={group.title} delay={i * 80}>
                <div className="glass card-hover group h-full rounded-3xl p-6">
                  <div className="mb-5 flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-accent/20 to-violet-glow/20 text-accent transition-transform duration-500 group-hover:scale-110">
                      {Icon && <Icon width={22} height={22} />}
                    </span>
                    <h3 className="font-display text-base font-semibold text-white">{group.title}</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {group.items.map((item) => (
                      <span key={item} className="chip">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </Reveal>
            )
          })}

          <Reveal delay={400}>
            <div className="relative flex h-full flex-col justify-center overflow-hidden rounded-3xl border border-accent/20 bg-gradient-to-br from-accent/10 via-ink-800 to-violet-glow/10 p-6">
              <div className="font-display text-3xl font-bold gradient-text">SOLID</div>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                Clean Code ve SOLID prensipleriyle sürdürülebilir, test edilebilir ve okunabilir kod.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
