'use client'

/**
 * 1. adım — şablon galerisi.
 * Kartlardaki önizlemeler sahte görseller değil, gerçek `CvDocument`in kart
 * genişliğine göre küçültülmüş halidir; seçilen tasarım birebir odur.
 * Ölçek tek bir ResizeObserver ile ölçülüp tüm kartlara uygulanır (tüm kartlar
 * aynı genişlikte olduğu için 97 ayrı gözlemciye gerek yoktur).
 *
 * BOŞ KART UYARISI — gözlemci bir KARTA bağlanmamalıdır. Filtre değişince
 * "ilk kart" başka bir şablon olur ve eski düğüm DOM'dan kalkar: gözlemci o
 * ölü düğümde asılı kalır, üstelik sökülen/gizlenen düğüm için 0 genişlik
 * bildirilir. Ölçek 0'a düşünce kartlar bembeyaz kalır ve bir daha toparlamaz.
 * Bu yüzden gözlemci hiç sökülmeyen ızgara kapsayıcısına bağlanır ve geçersiz
 * (0 / NaN) ölçümler yok sayılır — son geçerli genişlik korunur.
 *
 * PERFORMANS — 97 canlı küçük önizleme vardır. Ekran dışındaki kartların içeriği
 * `content-visibility: auto` ile (editor.css → `.cvs-thumb`) çizilmez; kutunun
 * boyutu aspect-ratio'dan geldiği için kaydırmada zıplama olmaz ve ölçüm yine
 * kutunun kendi genişliğinden okunabilir.
 *
 * İKİ AİLE — ATS (Ankara, 25) ve görsel (Elazığ, Malatya, Kastamonu, Bayburt,
 * Erzurum, Artvin; 72). Üç filtre satırı vardır: tür, il, stil. Tür ve il
 * sekmelerindeki sayılar diğer filtrelere göre canlı hesaplanır. Görsel kartlarda
 * "ATS skoru düşük olabilir" ipuçlu nötr bir rozet durur.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MM, PAPER } from '@/lib/cv/browser'
import { settingsForTemplate } from '@/lib/cv/state'
import {
  TEMPLATES,
  TPL_CATEGORIES,
  TPL_FAMILIES,
  TPL_REGIONS,
  isAtsTemplate,
  type CvTemplate,
  type TplCategory,
  type TplFamily,
  type TplRegion,
} from '@/lib/cv/templates'
import type { CvData, CvSettings } from '@/lib/cv/types'
import type { CvText } from '@/lib/cv/ui-text'
import type { Lang } from '@/lib/i18n/config'
import CvDocument from '../CvDocument'
import CvPaper from '../CvPaper'
import UiIcon from '../UiIcon'

type Props = {
  t: CvText
  lang: Lang
  /** Önizlemelerde kullanılacak veri — kullanıcı henüz bir şey yazmadıysa örnek veri. */
  preview: CvData
  settings: CvSettings
  onSelect: (templateId: string) => void
  /** Verilirse kartın üzerinde "seç ve devam et" düğmesi çıkar (1. adım). */
  onContinue?: (templateId: string) => void
}

const ATS_COUNT = TEMPLATES.filter(isAtsTemplate).length

export default function TemplateStep({ t, lang, preview, settings, onSelect, onContinue }: Props) {
  const [query, setQuery] = useState('')
  const [family, setFamily] = useState<TplFamily | 'all'>('all')
  const [region, setRegion] = useState<TplRegion | 'all'>('all')
  const [cat, setCat] = useState<TplCategory | 'all'>('all')
  const [zoomed, setZoomed] = useState<CvTemplate | null>(null)
  const [thumbW, setThumbW] = useState(0)
  const galleryRef = useRef<HTMLDivElement>(null)

  /**
   * Kart genişliği önce gerçek bir `.cvs-thumb`ten, o yoksa (liste boşken)
   * ızgaranın çözülmüş ilk sütun izinden okunur. Geçersiz ölçüm — kapsayıcı o
   * an `display: none` ise gelir — yutulur; eski değer korunur.
   */
  const measureThumb = useCallback(() => {
    const grid = galleryRef.current
    if (!grid) return
    const thumb = grid.querySelector<HTMLElement>('.cvs-thumb')
    const raw = thumb ? thumb.clientWidth : parseFloat(getComputedStyle(grid).gridTemplateColumns)
    const next = Math.floor(raw)
    if (!Number.isFinite(next) || next <= 0) return
    setThumbW((prev) => (prev === next ? prev : next))
  }, [])

  useEffect(() => {
    const el = galleryRef.current
    if (!el) return
    const ro = new ResizeObserver(measureThumb)
    ro.observe(el)
    measureThumb()
    return () => ro.disconnect()
  }, [measureThumb])

  // Kart boyutunda tam veri okunmuyor; kırpılmış kopya hem daha hızlı hem daha dengeli görünüyor.
  const thumbData = useMemo(() => trimForThumb(preview), [preview])

  /** Önce stil + arama uygulanır; tür ve il sayaçları bu ara listeden hesaplanır. */
  const base = useMemo(() => {
    const locale = lang === 'en' ? 'en-US' : 'tr-TR'
    const q = query.trim().toLocaleLowerCase(locale)
    return TEMPLATES.filter((tpl) => {
      if (cat !== 'all' && tpl.category !== cat) return false
      if (!q) return true
      const note = lang === 'en' ? tpl.noteEn : tpl.noteTr
      const hay = `${tpl.name} ${note} ${t.categories[tpl.category]} ${t.regions[tpl.region]} ${t.families[tpl.family]}`
      return hay.toLocaleLowerCase(locale).includes(q)
    })
  }, [query, cat, lang, t])

  // Tür sayaçları o an seçili ile, il sayaçları o an seçili türe göre süzülür:
  // her sekme tıklandığında gerçekten kaç şablon göreceğini gösterir.
  const familyCounts = useMemo(() => {
    const counts: Record<TplFamily | 'all', number> = { all: 0, ats: 0, design: 0 }
    base.forEach((tpl) => {
      if (region !== 'all' && tpl.region !== region) return
      counts.all++
      counts[tpl.family]++
    })
    return counts
  }, [base, region])

  const regionCounts = useMemo(() => {
    const counts = { all: 0 } as Record<TplRegion | 'all', number>
    TPL_REGIONS.forEach((r) => (counts[r] = 0))
    base.forEach((tpl) => {
      if (family !== 'all' && tpl.family !== family) return
      counts.all++
      counts[tpl.region] = (counts[tpl.region] ?? 0) + 1
    })
    return counts
  }, [base, family])

  const list = useMemo(
    () =>
      base.filter((tpl) => (family === 'all' || tpl.family === family) && (region === 'all' || tpl.region === region)),
    [base, family, region],
  )

  // Boş ↔ dolu geçişinde ölçüm kaynağı (ızgara izi ↔ gerçek kart) değişir.
  useEffect(measureThumb, [measureThumb, list])

  const scale = thumbW > 0 ? thumbW / (PAPER.a4.w * MM) : 0

  /**
   * Kart ayarları şablon başına bir kez kurulur. Render sırasında üretilseydi
   * üst bileşenin her render'ında 97 yeni nesne doğar ve `CvDocument` ağacının
   * 97 kopyası birden yeniden render edilirdi.
   */
  const cardSettings = useMemo(() => {
    const map: Record<string, CvSettings> = {}
    for (const tpl of TEMPLATES) map[tpl.id] = previewSettings(tpl.id, settings)
    return map
    // Devralınan alanlar previewSettings ile birebir aynı; settings'in tamamı değil.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.order, settings.hidden, settings.labels, settings.paper, settings.docLang, settings.showPhoto])

  const zoomedSettings = zoomed ? cardSettings[zoomed.id] ?? previewSettings(zoomed.id, settings) : null

  const badge = (tpl: CvTemplate) =>
    isAtsTemplate(tpl) ? (
      <span className="cvs-atsbadge" title={t.gallery.atsBadgeTitle}>
        {t.gallery.atsBadge}
      </span>
    ) : (
      <span className="cvs-designbadge" title={t.gallery.designBadgeTitle}>
        <i aria-hidden="true" />
        {t.gallery.designBadge}
      </span>
    )

  return (
    <>
      {/* ------------------------- 1. satır: arama + tür ------------------------- */}
      <div className="cvs-filters">
        <div className="cvs-search">
          <UiIcon name="search" />
          <input
            type="search"
            value={query}
            placeholder={t.gallery.search}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={t.gallery.search}
          />
        </div>
        <div className="cvs-chipbar" role="group" aria-label={t.gallery.familyFilter}>
          <button type="button" className="cvs-tab" aria-pressed={family === 'all'} onClick={() => setFamily('all')}>
            {t.gallery.allFamilies}
            <span className="cvs-chipcount">{familyCounts.all}</span>
          </button>
          {TPL_FAMILIES.map((f) => (
            <button
              key={f}
              type="button"
              className="cvs-tab cvs-famtab"
              data-family={f}
              data-empty={familyCounts[f] === 0 || undefined}
              aria-pressed={family === f}
              onClick={() => setFamily(f)}
            >
              {f === 'ats' ? <UiIcon name="shieldCheck" /> : <UiIcon name="palette" />}
              {t.families[f]}
              <span className="cvs-chipcount">{familyCounts[f]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ------------------------------ 2. satır: il ----------------------------- */}
      <div className="cvs-filters cvs-filters-row">
        <div className="cvs-chipbar" role="group" aria-label={t.gallery.regionFilter}>
          <button type="button" className="cvs-tab" aria-pressed={region === 'all'} onClick={() => setRegion('all')}>
            {t.gallery.allRegions}
            <span className="cvs-chipcount">{regionCounts.all}</span>
          </button>
          {TPL_REGIONS.map((r) => (
            <button
              key={r}
              type="button"
              className="cvs-tab"
              data-empty={regionCounts[r] === 0 || undefined}
              aria-pressed={region === r}
              onClick={() => setRegion(r)}
            >
              {t.regions[r]}
              <span className="cvs-chipcount">{regionCounts[r]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ----------------------------- 3. satır: stil ---------------------------- */}
      <div className="cvs-filters cvs-filters-row">
        <div className="cvs-chipbar" role="group" aria-label={t.gallery.categoryFilter}>
          <button type="button" className="cvs-tab" aria-pressed={cat === 'all'} onClick={() => setCat('all')}>
            {t.gallery.all}
          </button>
          {TPL_CATEGORIES.map((c) => (
            <button key={c} type="button" className="cvs-tab" aria-pressed={cat === c} onClick={() => setCat(c)}>
              {t.categories[c]}
            </button>
          ))}
        </div>
      </div>

      {family === 'design' && (
        <p className="cvs-galnote">
          <UiIcon name="warn" />
          <span>{t.gallery.designNote}</span>
        </p>
      )}

      {list.length === 0 && <p className="cvs-empty">{t.gallery.empty}</p>}

      {/* Izgara liste boşken de DOM'da kalır: ölçüm gözlemcisinin hedefi odur. */}
      <div className="cvs-gallery" ref={galleryRef}>
        {list.map((tpl) => {
          const tplSettings = cardSettings[tpl.id]
          const meta = `${t.regions[tpl.region]} · ${t.categories[tpl.category]}`
          return (
            <div
              key={tpl.id}
              className="cvs-tplcard"
              data-active={settings.templateId === tpl.id}
              data-family={tpl.family}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(tpl.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelect(tpl.id)
                }
              }}
              aria-pressed={settings.templateId === tpl.id}
              aria-label={`${tpl.name} — ${t.families[tpl.family]} · ${meta}`}
            >
              <div className="cvs-thumb">
                {scale > 0 && (
                  <div className="cvs-thumb-inner" style={{ transform: `scale(${scale})`, width: PAPER.a4.w * MM }}>
                    <CvDocument data={thumbData} settings={tplSettings} static />
                  </div>
                )}
                <span className="cvs-thumb-veil" />
                <div className="cvs-thumb-actions">
                  <button
                    type="button"
                    className="cvs-thumb-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      setZoomed(tpl)
                    }}
                  >
                    <UiIcon name="expand" />
                    {t.gallery.preview}
                  </button>
                  {onContinue && (
                    <button
                      type="button"
                      className="cvs-thumb-btn go"
                      onClick={(e) => {
                        e.stopPropagation()
                        onContinue(tpl.id)
                      }}
                    >
                      <UiIcon name="pencil" />
                      {t.gallery.continue}
                    </button>
                  )}
                </div>
              </div>

              <div className="cvs-tplfoot">
                <span className="cvs-tplname">
                  <b>{tpl.name}</b>
                  <small className="cvs-tplmeta">{meta}</small>
                  <small>{lang === 'en' ? tpl.noteEn : tpl.noteTr}</small>
                </span>
                {badge(tpl)}
                <span className="cvs-tick" aria-hidden="true">
                  <UiIcon name="check" />
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <p className="cvs-hint" style={{ marginTop: '1rem' }}>
        {t.gallery.liveNote} · {t.gallery.count(TEMPLATES.length)} · {t.families.ats} {ATS_COUNT} · {t.families.design}{' '}
        {TEMPLATES.length - ATS_COUNT}
      </p>

      {zoomed && zoomedSettings && (
        <div className="cvs-modal-bg" role="dialog" aria-modal="true" aria-label={t.gallery.previewTitle} onClick={() => setZoomed(null)}>
          <div className="cvs-modal" onClick={(e) => e.stopPropagation()}>
            <header className="cvs-modal-head">
              <h3>
                {zoomed.name} · {t.regions[zoomed.region]} · {t.categories[zoomed.category]} {badge(zoomed)}
              </h3>
              <button type="button" className="cvs-btn icon" onClick={() => setZoomed(null)} aria-label="×">
                <UiIcon name="x" />
              </button>
            </header>
            <div className="cvs-modal-body">
              {/* Kenar boşluğu kılavuzu yalnızca ATS ailesinde anlamlı; görsel şablonlar boşluğu kendi çizer. */}
              <CvPaper paper={settings.paper} marginMm={isAtsTemplate(zoomed) ? zoomedSettings.margin : undefined} guides={false}>
                <CvDocument data={preview} settings={zoomedSettings} static />
              </CvPaper>
            </div>
            <footer className="cvs-modal-foot">
              <button type="button" className="cvs-btn" onClick={() => setZoomed(null)}>
                {t.editor.changeTemplate}
              </button>
              <button
                type="button"
                className="cvs-btn primary"
                onClick={() => {
                  const id = zoomed.id
                  setZoomed(null)
                  if (onContinue) onContinue(id)
                  else onSelect(id)
                }}
              >
                <UiIcon name={onContinue ? 'pencil' : 'check'} />
                {onContinue ? t.gallery.continue : t.gallery.use}
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  )
}

/**
 * Kartlar şablonun KENDİ tipografi/renk ön ayarını gösterir; bölüm sırası, gizlilik,
 * başlıklar, kâğıt, belge dili ve fotoğraf tercihi kullanıcıdan devralınır. Sayfa
 * başları kartta anlamsızdır. Görsel şablonlar fotoğrafı yalnızca veride fotoğraf
 * varsa basar; boş veride çerçeve çizilmez.
 */
function previewSettings(templateId: string, user: CvSettings): CvSettings {
  return {
    ...settingsForTemplate(templateId, undefined, user.docLang),
    order: user.order,
    hidden: user.hidden,
    labels: user.labels,
    paper: user.paper,
    pageBreaks: [],
    docLang: user.docLang,
    showPhoto: user.showPhoto,
  }
}

/** Küçük önizlemede okunabilirlik için kayıtları kırpar. */
function trimForThumb(data: CvData): CvData {
  const cutBullets = (v: string) => v.split('\n').slice(0, 2).join('\n')
  return {
    ...data,
    experience: data.experience.slice(0, 3).map((e) => ({ ...e, bullets: cutBullets(e.bullets) })),
    education: data.education.slice(0, 2),
    skills: data.skills.slice(0, 8),
    projects: data.projects.slice(0, 2).map((p) => ({ ...p, highlights: cutBullets(p.highlights ?? '') })),
    certificates: data.certificates.slice(0, 2),
    awards: data.awards.slice(0, 1),
    references: data.references.slice(0, 1),
  }
}
