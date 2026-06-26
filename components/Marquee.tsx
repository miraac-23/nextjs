const tech = [
  'Java',
  'Spring Boot',
  'Spring Security',
  'React',
  'Next.js',
  'TypeScript',
  'Kotlin',
  'PostgreSQL',
  'Docker',
  'Mikroservis',
  'REST API',
  'JWT',
  'CI/CD',
  'React Native',
  'Git',
]

export default function Marquee() {
  return (
    <div className="relative overflow-hidden border-y border-line/5 bg-surface/[0.02] py-6">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-page to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-page to-transparent" />
      <div className="flex w-max animate-marquee items-center gap-10">
        {[...tech, ...tech].map((t, i) => (
          <span
            key={i}
            className="flex items-center gap-3 whitespace-nowrap font-display text-lg font-semibold text-fg4"
          >
            {t}
            <span className="h-1.5 w-1.5 rounded-full bg-accent/50" />
          </span>
        ))}
      </div>
    </div>
  )
}
