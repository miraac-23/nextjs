'use client'

/**
 * CV belgesinin kendisi (design ailesi) — ekranda önizlenen ve yazdırıldığında PDF'e dönüşen düğüm.
 *
 * Tek bir DOM üretici, tüm görsel şablonları üç eksende kurar:
 *   data-shell → yan sütun var mı, hangi tarafta (plain / aside-left / aside-right)
 *   data-head  → üst blok biçimi (stack / center / band / split / hero / none)
 *   data-body  → gövde tek sütun mu iki sütun mu (flow / duo)
 * Şablona özgü ince farklar `data-tpl` seçicisiyle app/cv-olustur/cv.css (Elazığ, Malatya,
 * Kastamonu) ve templates-dogu.css (Bayburt, Erzurum, Artvin) içinde durur; tüm kurallar
 * `.cv-doc.cv-design` altındadır. Böylece her şablon için ayrı bileşen ağacı taşımak gerekmez.
 * Doğrudan değil, CvDocument dağıtıcısı üzerinden kullanılır (ATS şablonları CvAtsDocument'tedir).
 */

import { memo } from 'react'
import { getTemplate, isDesignTemplate, TEMPLATES, type DesignTemplate } from '@/lib/cv/templates'
import { PAPER } from '@/lib/cv/browser'
import { sectionHasContent } from '@/lib/cv/state'
import { DESIGN_BASE_PT, type CvData, type CvSettings, type SectionKey } from '@/lib/cv/types'
import type { CvText } from '@/lib/cv/ui-text'
import CvIcon, { type CvIconName } from './CvIcon'

/** Yan sütuna (ya da iki sütunlu gövdenin dar sütununa) düşen bölümler. */
const SIDE_SECTIONS = new Set<SectionKey>(['skills', 'languages', 'certificates', 'interests', 'references'])

/** Gövde yazı boyutunun punto cinsinden tabanı; kullanıcı ölçeği bununla çarpılır. */
const BASE_PT = DESIGN_BASE_PT

/** Kâğıt tonu ön ayarları. 'template' → şablonun kendi kâğıdı (undefined döner). */
const PAPER_TINTS: Record<string, string | undefined> = {
  template: undefined,
  white: '#ffffff',
  cream: '#fffdf6',
  gray: '#f6f7f9',
}

/**
 * Koyu kâğıtta metin tonları ters çevrilir. Bu, hem koyu tasarlanmış şablonlar
 * için hem de kullanıcı açık bir şablonu koyu kâğıda çevirdiğinde geçerlidir.
 */
const DARK_PAPER = {
  '--cv-text': '#eef2f8',
  '--cv-muted': 'rgba(238, 242, 248, 0.72)',
  '--cv-soft': 'rgba(238, 242, 248, 0.5)',
  '--cv-line': 'rgba(255, 255, 255, 0.16)',
  '--cv-tint': 'color-mix(in srgb, var(--cv-accent) 20%, transparent)',
} as React.CSSProperties

/**
 * Metin tonu ön ayarları. Üç değişken birlikte değişir: ana metin, ikincil metin
 * ve tarih/etiket gibi silik metin. 'template' hiçbirini ezmez.
 */
const INK_TONES: Record<string, React.CSSProperties> = {
  template: {},
  slate: { '--cv-text': '#1e2532', '--cv-muted': '#5c6678', '--cv-soft': '#8b94a5' } as React.CSSProperties,
  black: { '--cv-text': '#0b0d10', '--cv-muted': '#3f454e', '--cv-soft': '#6d747e' } as React.CSSProperties,
  navy: { '--cv-text': '#111f3a', '--cv-muted': '#42527a', '--cv-soft': '#75849f' } as React.CSSProperties,
  warm: { '--cv-text': '#2b2118', '--cv-muted': '#5f5145', '--cv-soft': '#8d8175' } as React.CSSProperties,
}

type Props = {
  data: CvData
  settings: CvSettings
  t: CvText
  /** Galeri kartları gibi etkileşimsiz bağlamlarda `true` — bağlantılar düz metne döner. */
  static?: boolean
}

function CvDesignDocument({ data, settings, t, static: isStatic }: Props) {
  const tpl = designTemplate(settings.templateId)
  const accent = settings.accent || tpl.accent
  const paper = PAPER[settings.paper] ?? PAPER.a4

  // Kullanıcı ezmeleri boşsa şablonun kendi seçimi geçerlidir.
  const skillStyle = settings.skillStyle || tpl.skill
  const photoShape = settings.photoShape || tpl.photo
  const paperColor = PAPER_TINTS[settings.paperTint] ?? tpl.paper
  const railColor = settings.rail || tpl.rail || tpl.ink
  const paperIsDark = luminance(paperColor) < 0.45

  const visible = settings.order.filter(
    (key) => !settings.hidden.includes(key) && sectionHasContent(data, key),
  )
  const hasAside = tpl.shell !== 'plain'
  const isDuo = tpl.body === 'duo'
  const splitSides = hasAside || isDuo

  const sideKeys = splitSides ? visible.filter((k) => SIDE_SECTIONS.has(k)) : []
  const mainKeys = splitSides ? visible.filter((k) => !SIDE_SECTIONS.has(k)) : visible

  // Kimlik ve iletişim yalnızca BİR yerde görünmeli. Üst blok varsa ad/unvan/fotoğraf
  // oradadır; bant ve bölünmüş başlıkların ayrıca iletişim alanı da vardır. Diğer
  // durumlarda yan sütun (varsa) iletişimi üstlenir.
  const identityInAside = hasAside && tpl.head === 'none'
  const contactInHead = tpl.head === 'none' ? false : tpl.head === 'band' || tpl.head === 'split' ? true : !hasAside
  const contactInAside = hasAside && !contactInHead

  const label = (key: SectionKey) => settings.labels[key]?.trim() || t.sections[key]

  const contactSource: { icon: CvIconName; text: string; href?: string }[] = [
    { icon: 'mail', text: data.contact.email, href: data.contact.email ? `mailto:${data.contact.email}` : undefined },
    { icon: 'phone', text: data.contact.phone, href: data.contact.phone ? `tel:${data.contact.phone.replace(/\s+/g, '')}` : undefined },
    { icon: 'pin', text: data.contact.location },
    { icon: 'globe', text: data.contact.website, href: toHref(data.contact.website) },
    { icon: 'linkedin', text: data.contact.linkedin, href: toHref(data.contact.linkedin) },
    { icon: 'github', text: data.contact.github, href: toHref(data.contact.github) },
  ]
  const contactItems = contactSource.filter((c) => c.text.trim().length > 0)

  const personalSource: { icon: CvIconName; text: string }[] = [
    { icon: 'calendar', text: data.profile.birthDate },
    { icon: 'flag', text: data.profile.nationality },
    { icon: 'car', text: data.profile.drivingLicense },
    { icon: 'shield', text: data.profile.military },
  ]
  const personalItems = personalSource.filter((c) => c.text.trim().length > 0)

  const showPhoto = settings.showPhoto && photoShape !== 'none' && !!data.profile.photo

  /* ------------------------------ ortak parçalar ------------------------------ */

  const Photo = () =>
    showPhoto ? (
      // Kullanıcının kendi cihazından gelen data URL; next/image bunu optimize edemez.
      // eslint-disable-next-line @next/next/no-img-element
      <img className="cv-photo" src={data.profile.photo} alt="" data-shape={photoShape} />
    ) : null

  const ContactList = ({ variant }: { variant: 'row' | 'stack' }) => (
    <ul className={variant === 'row' ? 'cv-contact cv-contact-row' : 'cv-contact cv-contact-stack'}>
      {contactItems.map((c) => (
        <li key={c.icon}>
          {settings.showIcons && <CvIcon name={c.icon} />}
          <Maybe href={isStatic ? undefined : c.href}>{c.text}</Maybe>
        </li>
      ))}
    </ul>
  )

  const PersonalList = ({ variant }: { variant: 'row' | 'stack' }) =>
    personalItems.length ? (
      <ul className={variant === 'row' ? 'cv-contact cv-contact-row cv-personal' : 'cv-contact cv-contact-stack cv-personal'}>
        {personalItems.map((c) => (
          <li key={c.icon}>
            {settings.showIcons && <CvIcon name={c.icon} />}
            <span>{c.text}</span>
          </li>
        ))}
      </ul>
    ) : null

  const Identity = () => (
    <div className="cv-id">
      <h1 className="cv-name">
        {data.profile.fullName.trim() || <span className="cv-ph">{t.f.fullName}</span>}
      </h1>
      {data.profile.title.trim() ? (
        <p className="cv-role">{data.profile.title}</p>
      ) : (
        <p className="cv-role cv-ph">{t.f.jobTitle}</p>
      )}
    </div>
  )

  /* --------------------------------- bölümler --------------------------------- */

  function Section({ k, place }: { k: SectionKey; place: 'main' | 'side' }) {
    return (
      <section
        className="cv-sec"
        data-sec={k}
        data-place={place}
        // Zorunlu sayfa başı: yalnızca ana sütunda anlamlıdır (yan sütun kendi akışındadır).
        data-break={place === 'main' && settings.pageBreaks.includes(k) ? 'page' : undefined}
      >
        <h2 className="cv-h2">
          <span>{label(k)}</span>
        </h2>
        <div className="cv-sec-body">{sectionBody(k, place)}</div>
      </section>
    )
  }

  function sectionBody(k: SectionKey, place: 'main' | 'side') {
    switch (k) {
      case 'summary':
        return <p className="cv-summary">{data.profile.summary}</p>

      case 'experience':
        return (
          <>
            {data.experience
              .filter((e) => e.role.trim() || e.company.trim())
              .map((e) => (
                <article className="cv-item" key={e.id}>
                  <div className="cv-item-top">
                    <h3 className="cv-item-title">{e.role}</h3>
                    <span className="cv-item-date">{dateRange(e.start, e.end, e.current, t.present)}</span>
                  </div>
                  <p className="cv-item-sub">{joinDot([e.company, e.location])}</p>
                  {e.summary.trim() && <p className="cv-item-text">{e.summary}</p>}
                  <Bullets value={e.bullets} />
                </article>
              ))}
          </>
        )

      case 'education':
        return (
          <>
            {data.education
              .filter((e) => e.degree.trim() || e.school.trim())
              .map((e) => (
                <article className="cv-item" key={e.id}>
                  <div className="cv-item-top">
                    <h3 className="cv-item-title">{e.degree}</h3>
                    <span className="cv-item-date">{dateRange(e.start, e.end, false, t.present)}</span>
                  </div>
                  <p className="cv-item-sub">{joinDot([e.school, e.location, e.grade])}</p>
                  {e.summary.trim() && <p className="cv-item-text">{e.summary}</p>}
                </article>
              ))}
          </>
        )

      case 'projects':
        return (
          <>
            {data.projects
              .filter((p) => p.name.trim())
              .map((p) => (
                <article className="cv-item" key={p.id}>
                  <div className="cv-item-top">
                    <h3 className="cv-item-title">
                      {p.name}
                      {p.link.trim() && (
                        <Maybe href={isStatic ? undefined : toHref(p.link)} className="cv-item-link">
                          <CvIcon name="link" />
                        </Maybe>
                      )}
                    </h3>
                    {p.role.trim() && <span className="cv-item-date">{p.role}</span>}
                  </div>
                  {p.summary.trim() && <p className="cv-item-text">{p.summary}</p>}
                  {p.tech.trim() && (
                    <p className="cv-tech">
                      {p.tech
                        .split(',')
                        .map((x) => x.trim())
                        .filter(Boolean)
                        .map((x) => (
                          <span className="cv-chip" key={x}>
                            {x}
                          </span>
                        ))}
                    </p>
                  )}
                </article>
              ))}
          </>
        )

      case 'certificates':
        return (
          <ul className="cv-list">
            {data.certificates
              .filter((c) => c.name.trim())
              .map((c) => (
                <li key={c.id}>
                  <span className="cv-list-main">{c.name}</span>
                  <span className="cv-list-meta">{joinDot([c.issuer, c.date])}</span>
                </li>
              ))}
          </ul>
        )

      case 'awards':
        return (
          <ul className="cv-list">
            {data.awards
              .filter((a) => a.name.trim())
              .map((a) => (
                <li key={a.id}>
                  <span className="cv-list-main">{a.name}</span>
                  <span className="cv-list-meta">{joinDot([a.issuer, a.date])}</span>
                  {a.summary.trim() && <span className="cv-list-note">{a.summary}</span>}
                </li>
              ))}
          </ul>
        )

      case 'references':
        return (
          <ul className="cv-list">
            {data.references
              .filter((r) => r.name.trim())
              .map((r) => (
                <li key={r.id}>
                  <span className="cv-list-main">{r.name}</span>
                  <span className="cv-list-meta">{joinDot([r.role, r.company])}</span>
                  {r.contact.trim() && <span className="cv-list-note">{r.contact}</span>}
                </li>
              ))}
          </ul>
        )

      case 'interests': {
        const items = data.interests
          .split(/[,\n]/)
          .map((x) => x.trim())
          .filter(Boolean)
        return (
          <p className="cv-chips">
            {items.map((x) => (
              <span className="cv-chip" key={x}>
                {x}
              </span>
            ))}
          </p>
        )
      }

      case 'skills':
        return <SkillBlock place={place} />

      case 'languages':
        return <LanguageBlock />
    }
  }

  function SkillBlock({ place }: { place: 'main' | 'side' }) {
    const items = data.skills.filter((s) => s.name.trim())
    const groupNames = Array.from(new Set(items.map((s) => s.group.trim()).filter(Boolean)))
    const grouped = groupNames.length > 1

    const render = (list: typeof items) => (
      <div className="cv-skills" data-style={skillStyle} data-place={place}>
        {list.map((s) => (
          <div className="cv-skill" key={s.id}>
            <span className="cv-skill-name">{s.name}</span>
            <Meter level={s.level} style={skillStyle} />
          </div>
        ))}
      </div>
    )

    if (!grouped) return render(items)
    return (
      <>
        {groupNames.map((g) => (
          <div className="cv-group" key={g}>
            <h4 className="cv-h4">{g}</h4>
            {render(items.filter((s) => s.group.trim() === g))}
          </div>
        ))}
        {items.some((s) => !s.group.trim()) && render(items.filter((s) => !s.group.trim()))}
      </>
    )
  }

  function LanguageBlock() {
    const items = data.languages.filter((l) => l.name.trim())
    // Rozet/çip tabanlı şablonlarda dil seviyesi metin olarak daha okunaklıdır.
    const style = skillStyle === 'chips' || skillStyle === 'text' ? 'text' : skillStyle
    return (
      <div className="cv-skills cv-langs" data-style={style}>
        {items.map((l) => (
          <div className="cv-skill" key={l.id}>
            <span className="cv-skill-name">{l.name}</span>
            {l.level.trim() && <span className="cv-skill-note">{l.level}</span>}
            {style !== 'text' && <Meter level={l.score} style={style} />}
          </div>
        ))}
      </div>
    )
  }

  /* --------------------------------- iskelet --------------------------------- */

  const headHasSideColumn = tpl.head === 'band' || tpl.head === 'split'

  const head =
    tpl.head === 'none' ? null : (
      <header className="cv-head">
        <div className="cv-head-main">
          <Photo />
          <div className="cv-head-text">
            <Identity />
            {contactInHead && !headHasSideColumn && <ContactList variant="row" />}
          </div>
        </div>
        {contactInHead && headHasSideColumn && (
          <div className="cv-head-side">
            <ContactList variant="stack" />
          </div>
        )}
        {contactInHead && <PersonalList variant="row" />}
      </header>
    )

  const aside = hasAside ? (
    <aside className="cv-aside">
      {identityInAside && (
        <div className="cv-aside-id">
          <Photo />
          <Identity />
        </div>
      )}
      {contactInAside && (contactItems.length > 0 || personalItems.length > 0) && (
        <section className="cv-sec" data-sec="contact" data-place="side">
          <h2 className="cv-h2">
            <span>{t.f.contact}</span>
          </h2>
          <div className="cv-sec-body">
            <ContactList variant="stack" />
            <PersonalList variant="stack" />
          </div>
        </section>
      )}
      {sideKeys.map((k) => (
        <Section k={k} place="side" key={k} />
      ))}
    </aside>
  ) : null

  const sideColumn =
    !hasAside && isDuo && sideKeys.length ? (
      <div className="cv-col cv-col-side">
        {sideKeys.map((k) => (
          <Section k={k} place="side" key={k} />
        ))}
      </div>
    ) : null

  return (
    <div
      className="cv-doc cv-design"
      data-tpl={tpl.id}
      data-shell={tpl.shell}
      data-head={tpl.head}
      data-body={tpl.body}
      data-font={settings.fontFamily}
      data-font-h={settings.headingFont}
      data-bullet={settings.bulletStyle}
      data-justify={settings.justify ? 'on' : 'off'}
      data-tone={paperIsDark ? 'dark' : 'light'}
      data-photo={showPhoto ? photoShape : 'none'}
      style={
        {
          '--cv-accent': accent,
          '--cv-ink': tpl.ink,
          '--cv-rail-user': railColor,
          ...railTokens(railColor),
          '--cv-paper': paperColor,
          '--cv-pad': `${settings.margin}mm`,
          '--cv-sec-gap': `${settings.sectionGap}mm`,
          '--cv-lh': settings.lineHeight,
          '--cv-ls': `${settings.letterSpacing}em`,
          '--cv-fs': `${(BASE_PT * settings.fontScale).toFixed(2)}pt`,
          '--cv-h-scale': settings.headingScale,
          '--cv-photo-w': `${settings.photoSize}mm`,
          // Önce kâğıt tonundan gelen otomatik palet, sonra kullanıcının açık seçimi.
          ...(paperIsDark ? DARK_PAPER : null),
          ...INK_TONES[settings.inkTone],
          width: `${paper.w}mm`,
          minHeight: `${paper.h}mm`,
        } as React.CSSProperties
      }
    >
      {head}
      <div className="cv-body">
        {tpl.shell === 'aside-left' && aside}
        <div className="cv-col cv-col-main">
          {mainKeys.map((k) => (
            <Section k={k} place="main" key={k} />
          ))}
        </div>
        {sideColumn}
        {tpl.shell === 'aside-right' && aside}
      </div>
    </div>
  )
}

/**
 * Belge ağacı büyüktür (galeride onlarca kopyası birden durur) ve tamamen props'un
 * fonksiyonudur — iç durumu yoktur. Üst bileşenler aynı `data`/`settings`
 * nesnelerini geçtiği sürece yeniden render edilmesine gerek yoktur.
 */
export default memo(CvDesignDocument)

/* ================================ yardımcılar ================================ */

/** Katalog henüz yüklenmemişse bile belge çökmesin diye asgari görsel şablon. */
const FALLBACK_DESIGN: DesignTemplate = {
  family: 'design',
  id: 'fallback',
  name: 'Fallback',
  region: 'elazig',
  category: 'modern',
  shell: 'plain',
  head: 'stack',
  body: 'flow',
  accent: '#0e7490',
  ink: '#0f172a',
  paper: '#ffffff',
  font: 'sans',
  skill: 'bar',
  photo: 'circle',
  fontScale: 1,
  lineHeight: 1.45,
  margin: 14,
  noteTr: '',
  noteEn: '',
}

/**
 * Seçili kimlik bir görsel şablon değilse (ör. ATS şablonu dağıtıcı atlanarak buraya
 * geldiyse) katalogdaki ilk görsel şablona düşülür — renderer asla çökmez.
 */
function designTemplate(id: string): DesignTemplate {
  const tpl = getTemplate(id)
  if (isDesignTemplate(tpl)) return tpl
  return TEMPLATES.find(isDesignTemplate) ?? FALLBACK_DESIGN
}

/**
 * Yan sütun zemini kullanıcı tarafından değiştirilebildiği için üzerindeki
 * metin renkleri sabit olamaz: zeminin parlaklığına göre koyu ya da açık
 * bir palet döndürülür. Koyu zeminde ham vurgu rengi okunmadığından beyaza
 * doğru açılmış bir tonu kullanılır.
 */
function railTokens(rail: string): React.CSSProperties {
  return (luminance(rail) > 0.55
    ? {
        '--cv-rail-fg': 'color-mix(in srgb, var(--cv-ink) 72%, transparent)',
        '--cv-rail-strong': 'var(--cv-ink)',
        '--cv-rail-track': 'color-mix(in srgb, var(--cv-accent) 22%, transparent)',
        '--cv-rail-chip': 'color-mix(in srgb, var(--cv-accent) 12%, transparent)',
        '--cv-rail-accent': 'var(--cv-accent)',
      }
    : {
        '--cv-rail-fg': 'rgba(255, 255, 255, 0.82)',
        '--cv-rail-strong': '#ffffff',
        '--cv-rail-track': 'rgba(255, 255, 255, 0.2)',
        '--cv-rail-chip': 'rgba(255, 255, 255, 0.13)',
        '--cv-rail-accent': 'color-mix(in srgb, var(--cv-accent) 45%, #ffffff)',
      }) as React.CSSProperties
}

/** #rgb / #rrggbb için kabaca algılanan parlaklık (0–1). Tanınmayan değer koyu sayılır. */
function luminance(hex: string): number {
  const v = hex.trim().replace('#', '')
  const full = v.length === 3 ? v.split('').map((c) => c + c).join('') : v
  if (!/^[0-9a-f]{6}$/i.test(full)) return 0
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** 1–5 arası seviyeyi şablonun stiline göre çizer. */
function Meter({ level, style }: { level: number; style: string }) {
  const v = Math.max(0, Math.min(5, Math.round(level || 0)))
  if (v === 0 || style === 'text' || style === 'chips') return null

  if (style === 'dots') {
    return (
      <span className="cv-dots" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={i <= v ? 'on' : ''} />
        ))}
      </span>
    )
  }

  if (style === 'ring') {
    const r = 15.5
    const c = 2 * Math.PI * r
    return (
      <svg className="cv-ring" viewBox="0 0 36 36" aria-hidden="true">
        <circle className="cv-ring-bg" cx="18" cy="18" r={r} />
        <circle className="cv-ring-fg" cx="18" cy="18" r={r} strokeDasharray={`${((c * v) / 5).toFixed(2)} ${c.toFixed(2)}`} />
        <text className="cv-ring-txt" x="18" y="18" dominantBaseline="central" textAnchor="middle">
          {v}
        </text>
      </svg>
    )
  }

  return (
    <span className="cv-meter" aria-hidden="true">
      <span className="cv-meter-fill" style={{ width: `${(v / 5) * 100}%` }} />
    </span>
  )
}

/** Satır başına bir madde; boş satırlar atılır. */
function Bullets({ value }: { value: string }) {
  const items = value
    .split('\n')
    .map((x) => x.trim().replace(/^[-•*]\s*/, ''))
    .filter(Boolean)
  if (!items.length) return null
  return (
    <ul className="cv-bullets">
      {items.map((x, i) => (
        <li key={i}>{x}</li>
      ))}
    </ul>
  )
}

/** Bağlantı varsa `<a>`, yoksa `<span>` — statik önizlemelerde tıklanabilirlik istenmez. */
function Maybe({ href, children, className }: { href?: string; children: React.ReactNode; className?: string }) {
  if (!href) return <span className={className}>{children}</span>
  return (
    <a className={className} href={href} target="_blank" rel="noreferrer noopener">
      {children}
    </a>
  )
}

function dateRange(start: string, end: string, current: boolean, present: string): string {
  const to = current ? present : end.trim()
  const from = start.trim()
  if (from && to) return `${from} — ${to}`
  return from || to || ''
}

function joinDot(parts: string[]): string {
  return parts.map((p) => p.trim()).filter(Boolean).join(' · ')
}

/** Şemasız yazılmış adresleri (ör. "github.com/x") tıklanabilir hale getirir. */
function toHref(value: string): string | undefined {
  const v = value.trim()
  if (!v) return undefined
  if (/^https?:\/\//i.test(v)) return v
  if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(v)) return `https://${v}`
  return undefined
}
