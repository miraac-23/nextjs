import { experiences } from '@/lib/data'
import SectionHeading from './SectionHeading'
import Reveal from './Reveal'

export default function Experience() {
  return (
    <section id="deneyim" className="relative py-24 sm:py-32">
      <div className="container-x">
        <SectionHeading
          label="Deneyim"
          title="Profesyonel Yolculuk"
          description="Staj döneminden ulusal ölçekli sistemlere uzanan, sorumluluğu giderek artan bir kariyer çizgisi."
        />

        <div className="relative mx-auto max-w-3xl">
          <span className="absolute left-4 top-2 h-[calc(100%-2rem)] w-px bg-gradient-to-b from-accent via-violet-glow/40 to-transparent sm:left-1/2" />

          <div className="space-y-8">
            {experiences.map((exp, i) => (
              <Reveal key={exp.company} delay={i * 60}>
                <div
                  className={`relative pl-12 sm:w-1/2 ${
                    i % 2 === 0 ? 'sm:ml-0 sm:pr-10 sm:pl-0 sm:text-right' : 'sm:ml-auto sm:pl-10'
                  }`}
                >
                  <span
                    className={`absolute top-2 grid h-8 w-8 place-items-center rounded-full border border-accent/40 bg-page left-0 ${
                      i % 2 === 0 ? 'sm:left-auto sm:-right-4' : 'sm:-left-4'
                    }`}
                  >
                    <span className="h-2.5 w-2.5 rounded-full bg-accent">
                      {exp.current && (
                        <span className="absolute inset-0 m-auto h-2.5 w-2.5 animate-pulse-ring rounded-full bg-accent" />
                      )}
                    </span>
                  </span>

                  <div className="glass card-hover rounded-2xl p-5">
                    <div
                      className={`mb-2 flex flex-wrap items-center gap-2 ${
                        i % 2 === 0 ? 'sm:justify-end' : ''
                      }`}
                    >
                      <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-0.5 text-[11px] font-semibold text-accent-soft">
                        {exp.period}
                      </span>
                      {exp.current && (
                        <span className="rounded-full bg-emerald-400/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                          Aktif
                        </span>
                      )}
                    </div>
                    <h3 className="font-display text-lg font-semibold text-fg">{exp.role}</h3>
                    <div className="text-sm font-medium text-accent-soft">{exp.company}</div>
                    <ul
                      className={`mt-3 space-y-2 text-[13.5px] leading-relaxed text-fg3 ${
                        i % 2 === 0 ? 'sm:text-left' : ''
                      }`}
                    >
                      {exp.points.map((p, idx) => (
                        <li key={idx} className="flex gap-2">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent/60" />
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
