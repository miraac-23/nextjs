import { projects } from '@/lib/data'
import SectionHeading from './SectionHeading'
import Reveal from './Reveal'
import { ArrowUpRightIcon } from './Icons'

export default function Projects() {
  return (
    <section id="projects" className="relative py-24 sm:py-32">
      <div className="pointer-events-none absolute right-0 top-1/4 h-72 w-72 rounded-full bg-accent/10 blur-[130px]" />
      <div className="container-x relative">
        <SectionHeading
          label="Projeler"
          title="Öne Çıkan Çalışmalar"
          description="Ulusal ölçekli sistemlerden kurumsal iç araçlara; uçtan uca geliştirdiğim çözümlerden bir seçki."
        />

        <div className="grid gap-5 md:grid-cols-2">
          {projects.map((project, i) => (
            <Reveal key={project.title} delay={i * 80}>
              <article
                className={`glass card-hover group relative h-full overflow-hidden rounded-3xl p-7 ${
                  project.highlight ? 'md:col-span-2' : ''
                }`}
              >
                <div
                  className={`pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl transition-opacity duration-500 ${
                    project.highlight ? 'bg-accent/15' : 'bg-violet-glow/10'
                  } opacity-0 group-hover:opacity-100`}
                />

                <div className="relative flex h-full flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      {project.highlight && (
                        <span className="mb-2 inline-block rounded-full border border-accent/30 bg-accent/10 px-3 py-0.5 text-[11px] font-semibold text-accent-soft">
                          ⭐ Amiral Gemisi Proje
                        </span>
                      )}
                      <h3 className="font-display text-xl font-bold text-white transition-colors group-hover:text-accent-soft">
                        {project.title}
                      </h3>
                      <p className="text-sm font-medium text-slate-400">{project.subtitle}</p>
                    </div>
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-400 transition-all duration-300 group-hover:border-accent/50 group-hover:text-accent group-hover:rotate-12">
                      <ArrowUpRightIcon width={18} height={18} />
                    </span>
                  </div>

                  <p className="mt-4 flex-1 text-[14.5px] leading-relaxed text-slate-300">
                    {project.description}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {project.tags.map((t) => (
                      <span key={t} className="chip">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
