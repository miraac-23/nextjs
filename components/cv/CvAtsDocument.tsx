'use client'

/**
 * CV belgesinin kendisi — ekranda önizlenen ve yazdırıldığında PDF'e dönüşen düğüm.
 *
 * ATS İLKESİ: tek sütun, DOM sırası == okuma sırası. Konumlandırma, CSS sütunu,
 * görsel, SVG, ikon ya da bilgi taşıyan ::before/::after yoktur. Ayraçlar (" | ")
 * gerçek metin düğümüdür; böylece kopyala-yapıştır ve PDF metin çıkarımı ekranda
 * görüneni birebir okur. İçerik lib/cv/model.ts'teki ortak modelden gelir — DOCX
 * çıktısı ve ATS skoru da aynı modeli kullandığı için üçü hep aynı metni üretir.
 *
 * Şablonlar (Ankara ilçeleri) arasındaki farklar yalnızca `data-*` öznitelikleri ve
 * satır içi CSS değişkenleridir (app/cv-olustur/cv.css → "BELGE — ATS"; tüm kurallar
 * `.cv-doc.cv-ats` altındadır, görsel şablonların sınıflarıyla çakışmaz). Galeride
 * onlarca kopya birden render edildiği için bileşen durumsuz ve efektsizdir.
 * Doğrudan değil, CvDocument dağıtıcısı üzerinden kullanılır.
 */

import { Fragment, memo } from 'react'
import { PAPER } from '@/lib/cv/browser'
import { docText } from '@/lib/cv/doc-text'
import { buildCvModel, type CvModel, type CvModelEntry, type CvModelSection } from '@/lib/cv/model'
import { getTemplate, isAtsTemplate } from '@/lib/cv/templates'
import { FONT_STACKS, isAtsFont, type CvData, type CvSettings } from '@/lib/cv/types'

type Props = {
  data: CvData
  settings: CvSettings
  /** Galeri kartları gibi etkileşimsiz bağlamlarda `true` — bağlantılar düz metne döner. */
  static?: boolean
}

type ContactItem = CvModel['contactPrimary'][number]

function CvAtsDocument({ data, settings, static: isStatic }: Props) {
  const model = buildCvModel(data, settings)
  const paper = PAPER[settings.paper] ?? PAPER.a4
  // Ortak ayarlarda görsel aileye özgü bir font (Inter, Source Serif…) kalmış olabilir;
  // ATS belgesi yalnızca standart fontlarla basılır, tanınmayan anahtar Arial'a düşer.
  const font = FONT_STACKS[isAtsFont(settings.fontFamily) ? settings.fontFamily : 'arial']
  const headingFont = isAtsFont(settings.headingFont) ? FONT_STACKS[settings.headingFont] : font
  const tpl = getTemplate(settings.templateId)
  // Görsel şablonun vurgusu (açık/parlak olabilir) ATS kâğıdına taşınmaz.
  const accent = settings.accent || (isAtsTemplate(tpl) ? tpl.accent : '#1f2937')
  // ATS ailesi yalnızca iki işaret basar: '-' ya da '•'.
  const bulletKind = settings.bulletStyle === 'dash' ? 'dash' : 'dot'

  const style = {
    '--cv-accent': accent,
    '--cv-font': font.css,
    '--cv-hfont': headingFont.css,
    '--cv-fs': `${settings.bodySize}pt`,
    '--cv-h2-fs': `${settings.headingSize}pt`,
    '--cv-name-fs': `${settings.nameSize}pt`,
    '--cv-lh': settings.lineHeight,
    '--cv-pad': `${settings.margin}mm`,
    '--cv-gap': `${settings.sectionGap}mm`,
    width: `${paper.w}mm`,
    minHeight: `${paper.h}mm`,
  } as React.CSSProperties

  return (
    <div
      className="cv-doc cv-ats"
      data-tpl={settings.templateId}
      data-heading={settings.headingStyle}
      data-align={settings.headerAlign}
      data-datepos={settings.datePosition}
      data-bullet={bulletKind}
      lang={model.lang}
      style={style}
    >
      {/* Bilinçli olarak <header> değil: iletişim bilgisi belge gövdesinde durmalı. */}
      <div className="cv-head">
        <h1 className="cv-name">{model.name || <span className="cv-ph">{model.namePlaceholder}</span>}</h1>
        <p className="cv-title">{model.title || <span className="cv-ph">{model.titlePlaceholder}</span>}</p>
        <ContactLine items={model.contactPrimary} separator={model.separator} isStatic={isStatic} />
        <ContactLine items={model.contactLinks} separator={model.separator} isStatic={isStatic} />
        {model.personal.length > 0 && (
          <p className="cv-personal">
            {model.personal.map((x, i) => (
              <Fragment key={x.label}>
                {i > 0 && model.separator}
                {`${x.label}: ${x.value}`}
              </Fragment>
            ))}
          </p>
        )}
      </div>

      {model.sections.map((s) => (
        <Section key={s.key} section={s} settings={settings} lang={model.lang} />
      ))}
    </div>
  )
}

/**
 * Belge tamamen props'un fonksiyonudur — iç durumu yoktur. Üst bileşenler aynı
 * `data`/`settings` nesnelerini geçtiği sürece yeniden render edilmesine gerek yoktur.
 */
export default memo(CvAtsDocument)

/* ================================ parçalar ================================ */

/** "Ankara | +90 … | mail@x.com" — ayraç gerçek metindir, ikon yoktur. */
function ContactLine({ items, separator, isStatic }: { items: ContactItem[]; separator: string; isStatic?: boolean }) {
  if (!items.length) return null
  return (
    <p className="cv-contact">
      {items.map((c, i) => (
        <Fragment key={c.kind}>
          {i > 0 && separator}
          {c.href && !isStatic ? (
            <a href={c.href} target="_blank" rel="noreferrer noopener">
              {c.text}
            </a>
          ) : (
            c.text
          )}
        </Fragment>
      ))}
    </p>
  )
}

function Section({ section: s, settings, lang }: { section: CvModelSection; settings: CvSettings; lang: CvModel['lang'] }) {
  return (
    <section className="cv-sec" data-sec={s.key} data-break={s.pageBreak ? 'page' : undefined}>
      <h2 className="cv-h2">{s.heading}</h2>

      {s.kind === 'paragraph' && s.paragraph && <p className="cv-summary">{s.paragraph}</p>}

      {s.kind === 'groups' &&
        s.groups?.map((g, i) => (
          <p className="cv-skill-line" key={g.label || i}>
            {g.label ? (
              <>
                <strong>{g.label}:</strong> {g.items.join(', ')}
              </>
            ) : (
              g.items.join(', ')
            )}
          </p>
        ))}

      {s.kind === 'lines' &&
        s.lines?.map((line, i) => (
          <p className="cv-line" key={i}>
            {line}
          </p>
        ))}

      {s.kind === 'entries' &&
        s.entries?.map((e) => (
          <Entry
            key={e.id}
            entry={e}
            // Şirket-önce sıralaması yalnızca deneyimde anlamlıdır; diğerleri başlık-önce.
            companyFirst={s.key === 'experience' && settings.entryOrder === 'company-first'}
            dateRight={settings.datePosition === 'right'}
            bullet={settings.bulletStyle === 'dash' ? '-' : '•'}
            lang={lang}
          />
        ))}
    </section>
  )
}

function Entry({
  entry: e,
  companyFirst,
  dateRight,
  bullet,
  lang,
}: {
  entry: CvModelEntry
  companyFirst: boolean
  dateRight: boolean
  bullet: string
  lang: CvModel['lang']
}) {
  let primary = companyFirst ? e.org : e.title
  let secondary = companyFirst ? e.title : e.org
  // Tek alan doluysa kalın satır boş kalmasın.
  if (!primary) {
    primary = secondary
    secondary = ''
  }

  const sub = (dateRight ? [secondary, e.location] : [secondary, e.location, e.date]).filter(Boolean).join(' | ')

  return (
    <div className="cv-entry">
      <p className="cv-entry-line">
        <strong className="cv-entry-title">{primary}</strong>
        {/* Tarih DOM'da başlıktan SONRA gelir; baştaki boşluk `white-space: pre`
            ile korunur ki metin çıkarımı "Unvan01/2020" gibi yapışık okumasın. */}
        {dateRight && e.date && <span className="cv-entry-date">{` ${e.date}`}</span>}
      </p>
      {sub && <p className="cv-entry-sub">{sub}</p>}
      {e.meta && <p className="cv-entry-meta">{e.meta}</p>}
      {e.link && <p className="cv-entry-link">{e.link}</p>}
      {e.text && <p className="cv-entry-text">{e.text}</p>}
      {e.bullets.length > 0 && (
        <ul className="cv-bullets">
          {/* Madde işareti gerçek metin düğümüdür: Chrome yerel liste işaretini PDF'e
              şekil olarak çizer ve ATS metninde "•" hiç görünmez. */}
          {e.bullets.map((b, i) => (
            <li key={i}>
              <span className="cv-bullet-mark">{bullet} </span>
              {b}
            </li>
          ))}
        </ul>
      )}
      {e.tech.length > 0 && (
        <p className="cv-tech">
          <strong>{docText(lang).technologies}:</strong> {e.tech.join(', ')}
        </p>
      )}
    </div>
  )
}
