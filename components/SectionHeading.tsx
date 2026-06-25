import Reveal from './Reveal'

export default function SectionHeading({
  label,
  title,
  description,
}: {
  label: string
  title: string
  description?: string
}) {
  return (
    <Reveal className="mx-auto mb-14 max-w-2xl text-center">
      <span className="section-label justify-center">
        <span className="h-px w-6 bg-accent/60" />
        {label}
      </span>
      <h2 className="font-display text-3xl font-bold tracking-tight text-fg sm:text-4xl">
        {title}
      </h2>
      {description && <p className="mt-4 text-[15px] leading-relaxed text-fg3">{description}</p>}
    </Reveal>
  )
}
