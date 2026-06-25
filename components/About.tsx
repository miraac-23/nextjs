import { profile, education } from '@/lib/data'
import SectionHeading from './SectionHeading'
import Reveal from './Reveal'
import { GraduationIcon } from './Icons'

export default function About() {
  return (
    <section id="about" className="relative py-24 sm:py-32">
      <div className="container-x">
        <SectionHeading
          label="Hakkımda"
          title="Kullanıcı odaklı sistemler inşa ediyorum"
        />

        <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr]">
          <Reveal className="space-y-5">
            {profile.about.map((p, i) => (
              <p key={i} className="text-[15.5px] leading-relaxed text-slate-300">
                {p}
              </p>
            ))}

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                { k: 'Konum', v: profile.location },
                { k: 'Deneyim', v: '4+ Yıl' },
                { k: 'Odak', v: 'Backend & Frontend' },
                { k: 'Yabancı Dil', v: 'İngilizce (A2)' },
              ].map((item) => (
                <div
                  key={item.k}
                  className="glass rounded-2xl p-4"
                >
                  <div className="text-xs uppercase tracking-wider text-slate-500">{item.k}</div>
                  <div className="mt-1 font-medium text-slate-100">{item.v}</div>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="glass rounded-3xl p-6">
              <div className="mb-5 flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-accent/20 to-violet-glow/20 text-accent">
                  <GraduationIcon width={20} height={20} />
                </span>
                <h3 className="font-display text-lg font-semibold text-white">Eğitim</h3>
              </div>

              <div className="relative space-y-6 pl-6">
                <span className="absolute left-[7px] top-1 h-[calc(100%-1rem)] w-px bg-gradient-to-b from-accent/50 via-white/10 to-transparent" />
                {education.map((e) => (
                  <div key={e.degree} className="relative">
                    <span className="absolute -left-[22px] top-1.5 h-3 w-3 rounded-full border-2 border-accent bg-ink-900" />
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-accent">
                      {e.period}
                    </div>
                    <div className="mt-0.5 text-sm font-semibold text-slate-100">{e.degree}</div>
                    <div className="text-sm text-slate-400">{e.school}</div>
                    <div className="text-xs text-slate-500">{e.detail}</div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
