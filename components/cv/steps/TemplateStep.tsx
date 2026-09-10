'use client'

/**
 * 1. adım — şablon galerisi.
 * Kartlardaki önizlemeler sahte görseller değil, gerçek `CvDocument`in kart
 * genişliğine göre küçültülmüş halidir; seçilen tasarım birebir odur.
 * Ölçek tek bir ResizeObserver ile ölçülüp tüm kartlara uygulanır (tüm kartlar
 * aynı genişlikte olduğu için 20 ayrı gözlemciye gerek yoktur).
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { MM, PAPER } from '@/lib/cv/browser'
import { settingsForTemplate } from '@/lib/cv/state'
import { TEMPLATES, TPL_CATEGORIES, type CvTemplate, type TplCategory } from '@/lib/cv/templates'
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

export default function TemplateStep({ t, lang, preview, settings, onSelect, onContinue }: Props) {
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<TplCategory | 'all'>('all')
  const [zoomed, setZoomed] = useState<CvTemplate | null>(null)
  const [thumbW, setThumbW] = useState(0)
  const thumbRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = thumbRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => setThumbW(entries[0].contentRect.width))
    ro.observe(el)
    setThumbW(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  // Kart boyutunda tam veri okunmuyor; kırpılmış kopya hem daha hızlı hem daha dengeli görünüyor.
  const thumbData = useMemo(() => trimForThumb(preview), [preview])

  const list = useMemo(() => {
    const q = query.trim().toLocaleLowerCase(lang === 'en' ? 'en-US' : 'tr-TR')
    return TEMPLATES.filter((tpl) => {
      if (cat !== 'all' && tpl.category !== cat) return false
      if (!q) return true
      const note = lang === 'en' ? tpl.noteEn : tpl.noteTr
      return `${tpl.name} ${note} ${t.categories[tpl.category]}`.toLocaleLowerCase(lang === 'en' ? 'en-US' : 'tr-TR').includes(q)
    })
  }, [query, cat, lang, t])

  const scale = thumbW > 0 ? thumbW / (PAPER.a4.w * MM) : 0

  return (
    <>
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
        <div className="cvs-chipbar">
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

      {list.length === 0 ? (
        <p className="cvs-empty">{t.gallery.empty}</p>
      ) : (
        <div className="cvs-gallery">
          {list.map((tpl, i) => {
            const tplSettings = previewSettings(tpl.id, settings)
            return (
              <div
                key={tpl.id}
                className="cvs-tplcard"
                data-active={settings.templateId === tpl.id}
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
                aria-label={`${tpl.name} — ${t.categories[tpl.category]}`}
              >
                <div className="cvs-thumb" ref={i === 0 ? thumbRef : undefined}>
                  {scale > 0 && (
                    <div className="cvs-thumb-inner" style={{ transform: `scale(${scale})`, width: PAPER.a4.w * MM }}>
                      <CvDocument data={thumbData} settings={tplSettings} t={t} static />
                    </div>
                  )}
                  <span className="cvs-tplcat">{t.categories[tpl.category]}</span>
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
                    <small>{lang === 'en' ? tpl.noteEn : tpl.noteTr}</small>
                  </span>
                  <span className="cvs-tick" aria-hidden="true">
                    <UiIcon name="check" />
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <p className="cvs-hint" style={{ marginTop: '1rem' }}>
        {t.gallery.liveNote} · {t.gallery.count(TEMPLATES.length)}
      </p>

      {zoomed && (
        <div className="cvs-modal-bg" role="dialog" aria-modal="true" aria-label={t.gallery.previewTitle} onClick={() => setZoomed(null)}>
          <div className="cvs-modal" onClick={(e) => e.stopPropagation()}>
            <header className="cvs-modal-head">
              <h3>
                {zoomed.name} · {t.categories[zoomed.category]}
              </h3>
              <button type="button" className="cvs-btn icon" onClick={() => setZoomed(null)} aria-label="×">
                <UiIcon name="x" />
              </button>
            </header>
            <div className="cvs-modal-body">
              <CvPaper paper={settings.paper} guides={false}>
                <CvDocument data={preview} settings={previewSettings(zoomed.id, settings)} t={t} static />
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

/** Kartlar şablonun KENDİ tipografi/renk ön ayarını gösterir; yalnızca bölüm
 *  sırası ve gizlilik tercihleri kullanıcıdan devralınır. */
function previewSettings(templateId: string, user: CvSettings): CvSettings {
  return {
    ...settingsForTemplate(templateId),
    order: user.order,
    hidden: user.hidden,
    labels: user.labels,
    paper: user.paper,
    showIcons: user.showIcons,
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
    projects: data.projects.slice(0, 2),
    certificates: data.certificates.slice(0, 2),
    awards: data.awards.slice(0, 1),
    references: data.references.slice(0, 1),
  }
}
