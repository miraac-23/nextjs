'use client'

/**
 * 2. adım — bilgi girişi.
 * Solda akordeonlu form, sağda canlı önizleme. 1100px altında ikisi sekmeyle
 * değişir; böylece telefonda form tam genişlikte kalır.
 *
 * ATS yönlendirmesi — form kullanıcıyı ATS kurallarına göre yazmaya iter:
 * özet için cümle/kelime sayacı ve birinci tekil uyarısı, deneyim maddeleri için
 * 3–6 madde uyarısı, tanınmayan tarih uyarısı. Uyarılar yumuşaktır, hiçbir girişi
 * engellemez.
 *
 * İKİ AİLE — fotoğraf yükleme her zaman açıktır ama yalnızca görsel şablonlar basar
 * (ATS için önerilmediği ipucuyla). Yetenek/dil seviye kaydırıcıları yalnızca görsel
 * şablon seçiliyken görünür: ATS'ler grafik göstergeyi okuyamaz, ATS ailesi de basmaz.
 */

import { useMemo, useRef, useState } from 'react'
import { readImageScaled } from '@/lib/cv/browser'
import { docText, type DocLang } from '@/lib/cv/doc-text'
import { parseDate, splitBullets } from '@/lib/cv/model'
import { getTemplate, isAtsTemplate } from '@/lib/cv/templates'
import { uid, type CvData, type CvSettings, type SkillItem } from '@/lib/cv/types'
import type { CvText } from '@/lib/cv/ui-text'
import CvDocument from '../CvDocument'
import CvPaper from '../CvPaper'
import UiIcon from '../UiIcon'
import { Accordion, AddButton, Area, Check, Entry, Field } from '../fields'

/** Tekrarlanan (liste) bölümlerin anahtarları. */
type ListKey = 'experience' | 'education' | 'skills' | 'languages' | 'projects' | 'certificates' | 'awards' | 'references'

type Props = {
  t: CvText
  data: CvData
  settings: CvSettings
  setData: (next: CvData) => void
  onFillSample: () => void
  onClear: () => void
  onExport: () => void
  onImport: (file: File) => void
  onToast: (message: string, tone?: 'ok' | 'error') => void
}

/** Standart yetkinlik kategorileri — öneri listesi, belge diline göre önce gelir. */
const SKILL_GROUPS: Record<DocLang, string[]> = {
  tr: ['Programlama Dilleri', 'Backend', 'Frontend', 'Veritabanları', 'Mesajlaşma', 'DevOps', 'Bulut', 'Test', 'Araçlar'],
  en: ['Languages', 'Backend', 'Frontend', 'Databases', 'Messaging', 'DevOps', 'Cloud', 'Testing', 'Tools'],
}

/** CEFR seviyeleri — dil seviyesi serbest metindir, bunlar yalnızca öneridir. */
const CEFR: Record<DocLang, string[]> = {
  tr: ['A1 (Başlangıç)', 'A2 (Temel)', 'B1 (Orta)', 'B2 (Orta-İleri)', 'C1 (İleri)', 'C2 (Üst Düzey)', 'Ana dil'],
  en: ['A1 (Beginner)', 'A2 (Elementary)', 'B1 (Intermediate)', 'B2 (Upper Intermediate)', 'C1 (Advanced)', 'C2 (Proficient)', 'Native'],
}

/** Yeni yetenek/dil kaydının gösterge seviyesi (1–5) — şablon değişirse boş gösterge çizilmesin. */
const DEFAULT_LEVEL = 4

// Datalist kimlikleri — aynı anda tek DetailsStep render edildiği için sabit olabilir.
const DL_GROUPS = 'cvs-dl-skill-groups'
const DL_CEFR = 'cvs-dl-cefr'

/* ------------------------------ metin analizi ------------------------------ */

// Türkçe harfler de kelimenin parçası sayılır; aksi halde "yazılım" gibi kelimeler
// bölünüp sahte eşleşmeler (ör. tek başına "m") üretirdi.
const WORD_SPLIT = /[^a-z0-9'’çğıöşüâîû]+/
const FIRST_PERSON_TR = ['ben', 'benim', 'bana', 'beni', 'bende', 'benden']
const FIRST_PERSON_EN = ['i', 'my', 'me', "i'm", 'i’m', "i've", 'i’ve', 'mine', 'myself']

function countSentences(text: string): number {
  return text.split(/[.!?…]+(?:\s+|$)/).filter((s) => s.trim().length > 0).length
}

function countWords(text: string): number {
  const v = text.trim()
  return v ? v.split(/\s+/).length : 0
}

/** Özette geçen birinci tekil kelimeler (tekilleştirilmiş). Basit kelime sınırı kontrolü yeter. */
function firstPersonWords(text: string): string[] {
  const hits: string[] = []
  const trTokens = text.toLocaleLowerCase('tr-TR').split(WORD_SPLIT)
  // "İ" → toLowerCase "i̇" (birleşik nokta) üretir ve kelimeyi böler; önce düz "I"ya çevrilir.
  const enTokens = text.replace(/İ/g, 'I').toLowerCase().split(WORD_SPLIT)
  trTokens.forEach((w) => {
    if (FIRST_PERSON_TR.indexOf(w) >= 0) hits.push(w)
  })
  enTokens.forEach((w) => {
    if (FIRST_PERSON_EN.indexOf(w) >= 0) hits.push(w === 'i' ? 'I' : w.replace(/^i/, 'I'))
  })
  return Array.from(new Set(hits))
}

/** "Java, Spring Boot, CI/CD (GitLab, GitHub)" → parantez içindeki virgüller bölünmez. */
function splitSkills(text: string): string[] {
  const out: string[] = []
  let depth = 0
  let cur = ''
  for (let i = 0; i < text.length; i++) {
    const ch = text.charAt(i)
    if (ch === '(') depth++
    else if (ch === ')') depth = Math.max(0, depth - 1)
    if ((ch === ',' || ch === ';' || ch === '\n') && depth === 0) {
      out.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  out.push(cur)
  return out.map((s) => s.trim().replace(/^[-–•*·]+\s*/, '').trim()).filter(Boolean)
}

export default function DetailsStep({ t, data, settings, setData, onFillSample, onClear, onExport, onImport, onToast }: Props) {
  const [pane, setPane] = useState<'form' | 'preview'>('form')
  const [bulkGroup, setBulkGroup] = useState('')
  const [bulkText, setBulkText] = useState('')
  const jsonInput = useRef<HTMLInputElement>(null)
  const photoInput = useRef<HTMLInputElement>(null)

  const tpl = getTemplate(settings.templateId)
  const ats = isAtsTemplate(tpl)

  const setProfile = (k: keyof CvData['profile'], v: string) => setData({ ...data, profile: { ...data.profile, [k]: v } })
  const setContact = (k: keyof CvData['contact'], v: string) => setData({ ...data, contact: { ...data.contact, [k]: v } })

  // Liste işlemleri tek bir yerde toplanır; her bölüm için ayrı ayrı yazılmaz.
  // Öğe tipleri bölüme göre değiştiği için burada gevşek tiplenir, çağrı
  // noktalarında `data.<bölüm>` üzerinden tip güvenliği korunur.
  const mutate = (key: ListKey, fn: (list: any[]) => any[]) => setData({ ...data, [key]: fn(data[key] as any[]) } as CvData)
  const add = (key: ListKey, item: unknown) => mutate(key, (l) => [...l, item])
  const remove = (key: ListKey, id: string) => mutate(key, (l) => l.filter((x) => x.id !== id))
  const patch = (key: ListKey, id: string, part: Record<string, unknown>) =>
    mutate(key, (l) => l.map((x) => (x.id === id ? { ...x, ...part } : x)))
  const move = (key: ListKey, index: number, dir: -1 | 1) =>
    mutate(key, (l) => {
      const next = [...l]
      const j = index + dir
      if (j < 0 || j >= next.length) return l
      ;[next[index], next[j]] = [next[j], next[index]]
      return next
    })

  const entryLabels = { up: t.form.moveUp, down: t.form.moveDown, remove: t.form.remove }
  const docLang = settings.docLang

  async function onPhoto(file?: File) {
    if (!file) return
    try {
      setProfile('photo', await readImageScaled(file))
    } catch {
      onToast(t.form.photoError, 'error')
    }
  }

  /** 1–5 seviye kaydırıcısı — yalnızca görsel şablonların göstergeleri için. */
  const levelSlider = (value: number, onChange: (v: number) => void, note?: boolean) => (
    <label className="cvs-field">
      <span>
        {t.f.level} — {t.form.levelLabel(value)}
      </span>
      <input
        type="range"
        min={1}
        max={5}
        step={1}
        value={value || 1}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ padding: 0, border: 0, background: 'transparent' }}
      />
      {note && <small className="cvs-hint">{t.form.levelAtsNote}</small>}
    </label>
  )

  // Tarih yer tutucuları şablonun tarih biçimini ve belge dilini izler.
  const months = docText(docLang).months
  const datePh =
    settings.dateFormat === 'short'
      ? { start: `${months[0]} 2022`, end: `${months[2]} 2025`, single: `${months[5]} 2024` }
      : { start: '01/2022', end: '03/2025', single: '06/2024' }

  /** Çözülemeyen tarih için yumuşak uyarı; boş alan ve kilitli alan uyarı üretmez. */
  const dateWarn = (value: string, disabled?: boolean) =>
    !disabled && value.trim() !== '' && parseDate(value) === null ? t.form.dateInvalid : undefined

  const summary = data.profile.summary
  const summaryInfo = useMemo(() => {
    const sentences = countSentences(summary)
    return { sentences, words: countWords(summary), firstPerson: firstPersonWords(summary) }
  }, [summary])
  const summaryFilled = summary.trim() !== ''
  const summaryOff = summaryFilled && (summaryInfo.sentences < 2 || summaryInfo.sentences > 4)

  // Öneri listesi: belge dilindeki standart kategoriler, diğer dildekiler, kullanıcının kendi grupları.
  const groupSuggestions = useMemo(() => {
    const other: DocLang = docLang === 'tr' ? 'en' : 'tr'
    const own = data.skills.map((s) => s.group.trim()).filter(Boolean)
    return Array.from(new Set(SKILL_GROUPS[docLang].concat(SKILL_GROUPS[other], own)))
  }, [docLang, data.skills])

  function addBulk() {
    const group = bulkGroup.trim()
    const norm = (v: string) => v.trim().toLocaleLowerCase('tr-TR')
    const seen = new Set(data.skills.filter((s) => norm(s.group) === norm(group)).map((s) => norm(s.name)))
    const items: SkillItem[] = []
    splitSkills(bulkText).forEach((name) => {
      if (seen.has(norm(name))) return
      seen.add(norm(name))
      // level yalnızca görsel şablonların göstergesinde kullanılır; ATS ailesi basmaz.
      items.push({ id: uid('s'), name, level: DEFAULT_LEVEL, group })
    })
    if (items.length > 0) {
      setData({ ...data, skills: data.skills.concat(items) })
      setBulkText('')
    }
    onToast(t.form.bulkAdded(items.length), items.length > 0 ? 'ok' : 'error')
  }

  return (
    <>
      <datalist id={DL_GROUPS}>
        {groupSuggestions.map((g) => (
          <option key={g} value={g} />
        ))}
      </datalist>
      <datalist id={DL_CEFR}>
        {CEFR[docLang].map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      <div className="cvs-panetabs">
        <button type="button" aria-pressed={pane === 'form'} onClick={() => setPane('form')}>
          {t.form.formTab}
        </button>
        <button type="button" aria-pressed={pane === 'preview'} onClick={() => setPane('preview')}>
          {t.form.previewTab}
        </button>
      </div>

      <div className="cvs-split">
        {/* ------------------------------- FORM ------------------------------- */}
        <div className="cvs-pane" style={{ display: pane === 'form' ? 'block' : 'none' }}>
          <div className="cvs-actions" style={{ marginBottom: '0.9rem' }}>
            <button type="button" className="cvs-btn sm" onClick={onFillSample}>
              <UiIcon name="spark" />
              {t.form.fillSample}
            </button>
            <button type="button" className="cvs-btn sm" onClick={onExport}>
              <UiIcon name="download" />
              {t.form.exportJson}
            </button>
            <button type="button" className="cvs-btn sm" onClick={() => jsonInput.current?.click()}>
              <UiIcon name="upload" />
              {t.form.importJson}
            </button>
            <button type="button" className="cvs-btn sm danger" onClick={onClear}>
              <UiIcon name="trash" />
              {t.form.clearAll}
            </button>
            <input
              ref={jsonInput}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) onImport(f)
                e.target.value = ''
              }}
            />
          </div>

          {/* --- kimlik --- */}
          <Accordion icon="user" title={t.f.identity} defaultOpen>
            <div className="cvs-row-2">
              <Field label={t.f.fullName} value={data.profile.fullName} onChange={(v) => setProfile('fullName', v)} />
              <Field
                label={t.f.jobTitle}
                value={data.profile.title}
                onChange={(v) => setProfile('title', v)}
                placeholder="Senior Backend Developer"
                hint={t.form.titleHint}
              />
            </div>

            <div className="cvs-field">
              <span>{t.f.photo}</span>
              <div className="cvs-actions">
                {data.profile.photo && (
                  // Kullanıcının cihazından gelen data URL — next/image ile optimize edilemez.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={data.profile.photo}
                    alt=""
                    style={{ width: 46, height: 46, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--cvs-border)' }}
                  />
                )}
                <button type="button" className="cvs-btn sm" onClick={() => photoInput.current?.click()}>
                  <UiIcon name="upload" />
                  {data.profile.photo ? t.form.photoChange : t.form.photoAdd}
                </button>
                {data.profile.photo && (
                  <button type="button" className="cvs-btn sm danger" onClick={() => setProfile('photo', '')}>
                    {t.form.photoRemove}
                  </button>
                )}
                <input
                  ref={photoInput}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    void onPhoto(e.target.files?.[0])
                    e.target.value = ''
                  }}
                />
              </div>
              <small className="cvs-hint">{t.form.photoHint}</small>
              {/* ATS şablonu seçiliyken fotoğraf basılmaz; görselde basılır ama skoru düşürür. */}
              <small className={`cvs-hint${!ats && data.profile.photo ? ' warn' : ''}`}>
                {!ats && data.profile.photo && <UiIcon name="warn" />}
                <span>{t.form.photoDesignOnly}</span>
              </small>
            </div>

            <Area
              label={t.f.summary}
              value={summary}
              onChange={(v) => setProfile('summary', v)}
              rows={5}
              hint={t.form.summaryHint}
              meta={summaryFilled ? t.form.summaryStats(summaryInfo.sentences, summaryInfo.words) : undefined}
              metaWarn={summaryOff}
              warn={[
                summaryOff && t.form.summaryLength,
                summaryInfo.firstPerson.length > 0 && t.form.firstPerson(summaryInfo.firstPerson.map((w) => `“${w}”`).join(', ')),
              ]}
            />
          </Accordion>

          {/* --- iletişim: ATS'nin beklediği sırayla — Şehir | Telefon | E-posta, LinkedIn | GitHub | Portföy --- */}
          <Accordion icon="globe" title={t.f.contact} defaultOpen>
            <div className="cvs-row-3">
              <Field label={t.f.location} value={data.contact.location} onChange={(v) => setContact('location', v)} placeholder="İstanbul, Türkiye" />
              <Field label={t.f.phone} type="tel" value={data.contact.phone} onChange={(v) => setContact('phone', v)} placeholder="+90 5xx xxx xx xx" />
              <Field label={t.f.email} type="email" value={data.contact.email} onChange={(v) => setContact('email', v)} placeholder="ad.soyad@mail.com" />
            </div>
            <div className="cvs-row-3">
              <Field label={t.f.linkedin} value={data.contact.linkedin} onChange={(v) => setContact('linkedin', v)} placeholder="linkedin.com/in/…" />
              <Field label={t.f.github} value={data.contact.github} onChange={(v) => setContact('github', v)} placeholder="github.com/…" />
              <Field label={t.f.website} value={data.contact.website} onChange={(v) => setContact('website', v)} placeholder="site.com" />
            </div>
          </Accordion>

          {/* --- deneyim --- */}
          <Accordion icon="briefcase" title={t.sections.experience} count={data.experience.length} defaultOpen>
            <div className="cvs-repeat">
              {data.experience.length === 0 && <p className="cvs-empty">{t.form.empty}</p>}
              {data.experience.map((e, i) => {
                const bulletCount = splitBullets(e.bullets).length
                const bulletsFilled = e.bullets.trim() !== ''
                const bulletsOff = bulletsFilled && (bulletCount < 3 || bulletCount > 6)
                return (
                  <Entry
                    key={e.id}
                    index={i}
                    total={data.experience.length}
                    title={e.role || `${t.sections.experience} ${i + 1}`}
                    subtitle={e.company}
                    labels={entryLabels}
                    onMove={(d) => move('experience', i, d)}
                    onRemove={() => remove('experience', e.id)}
                  >
                    <div className="cvs-row-2">
                      <Field label={t.f.company} value={e.company} onChange={(v) => patch('experience', e.id, { company: v })} />
                      <Field label={t.f.role} value={e.role} onChange={(v) => patch('experience', e.id, { role: v })} />
                    </div>
                    <div className="cvs-row-3">
                      <Field label={t.f.location} value={e.location} onChange={(v) => patch('experience', e.id, { location: v })} />
                      <Field
                        label={t.f.start}
                        value={e.start}
                        onChange={(v) => patch('experience', e.id, { start: v })}
                        placeholder={datePh.start}
                        warn={dateWarn(e.start)}
                      />
                      <Field
                        label={t.f.end}
                        value={e.current ? t.present : e.end}
                        onChange={(v) => patch('experience', e.id, { end: v })}
                        placeholder={datePh.end}
                        disabled={e.current}
                        warn={dateWarn(e.end, e.current)}
                      />
                    </div>
                    <Check
                      label={t.form.current}
                      checked={e.current}
                      // "Devam ediyor" işaretlenince bitiş tarihi hem kilitlenir hem temizlenir;
                      // aksi halde CV'de görünmeyen eski bir tarih formda kalırdı.
                      onChange={(v) => patch('experience', e.id, { current: v, ...(v ? { end: '' } : null) })}
                    />
                    <Area label={t.f.description} rows={2} value={e.summary} onChange={(v) => patch('experience', e.id, { summary: v })} />
                    <Area
                      label={t.f.achievements}
                      rows={5}
                      value={e.bullets}
                      onChange={(v) => patch('experience', e.id, { bullets: v })}
                      hint={t.form.bulletsHint}
                      meta={bulletsFilled ? t.form.bulletsCount(bulletCount) : undefined}
                      metaWarn={bulletsOff}
                      warn={bulletsOff ? t.form.bulletsRange : undefined}
                    />
                  </Entry>
                )
              })}
              <AddButton
                label={t.form.add}
                onClick={() =>
                  add('experience', { id: uid('e'), role: '', company: '', location: '', start: '', end: '', current: false, summary: '', bullets: '' })
                }
              />
            </div>
          </Accordion>

          {/* --- eğitim --- */}
          <Accordion icon="cap" title={t.sections.education} count={data.education.length}>
            <div className="cvs-repeat">
              {data.education.length === 0 && <p className="cvs-empty">{t.form.empty}</p>}
              {data.education.map((e, i) => (
                <Entry
                  key={e.id}
                  index={i}
                  total={data.education.length}
                  title={e.degree || `${t.sections.education} ${i + 1}`}
                  subtitle={e.school}
                  labels={entryLabels}
                  onMove={(d) => move('education', i, d)}
                  onRemove={() => remove('education', e.id)}
                >
                  <div className="cvs-row-2">
                    <Field label={t.f.degree} value={e.degree} onChange={(v) => patch('education', e.id, { degree: v })} />
                    <Field label={t.f.school} value={e.school} onChange={(v) => patch('education', e.id, { school: v })} />
                  </div>
                  <div className="cvs-row-3">
                    <Field label={t.f.location} value={e.location} onChange={(v) => patch('education', e.id, { location: v })} />
                    <Field
                      label={t.f.start}
                      value={e.start}
                      onChange={(v) => patch('education', e.id, { start: v })}
                      placeholder={datePh.start}
                      warn={dateWarn(e.start)}
                    />
                    <Field
                      label={t.f.end}
                      value={e.end}
                      onChange={(v) => patch('education', e.id, { end: v })}
                      placeholder={datePh.end}
                      warn={dateWarn(e.end)}
                    />
                  </div>
                  <div className="cvs-row-2">
                    <Field label={t.f.grade} value={e.grade} onChange={(v) => patch('education', e.id, { grade: v })} />
                  </div>
                  <Area label={t.f.description} rows={2} value={e.summary} onChange={(v) => patch('education', e.id, { summary: v })} />
                </Entry>
              ))}
              <AddButton
                label={t.form.add}
                onClick={() => add('education', { id: uid('ed'), degree: '', school: '', location: '', start: '', end: '', grade: '', summary: '' })}
              />
            </div>
          </Accordion>

          {/* --- teknik yetkinlikler: kategori + ad, metin olarak basılır --- */}
          <Accordion icon="spark" title={t.sections.skills} count={data.skills.length}>
            <p className="cvs-hint">{ats ? t.form.skillsHint : t.form.skillsHintDesign}</p>

            <div className="cvs-bulk">
              <div className="cvs-bulk-head">
                <UiIcon name="plus" />
                <b>{t.form.bulkTitle}</b>
              </div>
              <div className="cvs-bulk-grid">
                <Field label={t.form.bulkGroup} value={bulkGroup} onChange={setBulkGroup} list={DL_GROUPS} placeholder="Backend" />
                <Area label={t.f.skillName} rows={2} value={bulkText} onChange={setBulkText} placeholder={t.form.bulkPlaceholder} hint={t.form.bulkHint} />
              </div>
              <button type="button" className="cvs-btn sm" disabled={!bulkText.trim()} onClick={addBulk}>
                <UiIcon name="plus" />
                {t.form.bulkAdd}
              </button>
            </div>

            <div className="cvs-repeat">
              {data.skills.length === 0 && <p className="cvs-empty">{t.form.empty}</p>}
              {data.skills.map((s, i) => (
                <Entry
                  key={s.id}
                  index={i}
                  total={data.skills.length}
                  title={s.name || `${t.f.skillName} ${i + 1}`}
                  subtitle={s.group}
                  labels={entryLabels}
                  onMove={(d) => move('skills', i, d)}
                  onRemove={() => remove('skills', s.id)}
                >
                  <div className="cvs-row-2">
                    <Field label={t.f.skillName} value={s.name} onChange={(v) => patch('skills', s.id, { name: v })} />
                    <Field
                      label={t.f.group}
                      value={s.group}
                      onChange={(v) => patch('skills', s.id, { group: v })}
                      placeholder="Backend"
                      list={DL_GROUPS}
                      hint={i === 0 ? t.form.skillGroupHint : undefined}
                    />
                  </div>
                  {!ats && levelSlider(s.level, (v) => patch('skills', s.id, { level: v }), i === 0)}
                </Entry>
              ))}
              <AddButton
                label={t.form.add}
                onClick={() => add('skills', { id: uid('s'), name: '', level: DEFAULT_LEVEL, group: bulkGroup.trim() })}
              />
            </div>
          </Accordion>

          {/* --- yabancı dil: seviye serbest metindir (CEFR önerili) --- */}
          <Accordion icon="globe" title={t.sections.languages} count={data.languages.length}>
            <div className="cvs-repeat">
              {data.languages.length === 0 && <p className="cvs-empty">{t.form.empty}</p>}
              {data.languages.map((l, i) => (
                <Entry
                  key={l.id}
                  index={i}
                  total={data.languages.length}
                  title={l.name || `${t.f.langName} ${i + 1}`}
                  subtitle={l.level}
                  labels={entryLabels}
                  onMove={(d) => move('languages', i, d)}
                  onRemove={() => remove('languages', l.id)}
                >
                  <div className="cvs-row-2">
                    <Field label={t.f.langName} value={l.name} onChange={(v) => patch('languages', l.id, { name: v })} />
                    <Field
                      label={t.f.langLevel}
                      value={l.level}
                      onChange={(v) => patch('languages', l.id, { level: v })}
                      placeholder={docLang === 'en' ? 'C1 (Advanced)' : 'C1 (İleri)'}
                      list={DL_CEFR}
                      hint={i === 0 ? t.form.langLevelHint : undefined}
                    />
                  </div>
                  {!ats && levelSlider(l.score, (v) => patch('languages', l.id, { score: v }), i === 0)}
                </Entry>
              ))}
              <AddButton label={t.form.add} onClick={() => add('languages', { id: uid('l'), name: '', level: '', score: DEFAULT_LEVEL })} />
            </div>
          </Accordion>

          {/* --- projeler --- */}
          <Accordion icon="folder" title={t.sections.projects} count={data.projects.length}>
            <div className="cvs-repeat">
              {data.projects.length === 0 && <p className="cvs-empty">{t.form.empty}</p>}
              {data.projects.map((p, i) => (
                <Entry
                  key={p.id}
                  index={i}
                  total={data.projects.length}
                  title={p.name || `${t.f.projectName} ${i + 1}`}
                  subtitle={p.role}
                  labels={entryLabels}
                  onMove={(d) => move('projects', i, d)}
                  onRemove={() => remove('projects', p.id)}
                >
                  <div className="cvs-row-2">
                    <Field label={t.f.projectName} value={p.name} onChange={(v) => patch('projects', p.id, { name: v })} />
                    <Field label={t.f.role} value={p.role} onChange={(v) => patch('projects', p.id, { role: v })} />
                  </div>
                  <Field label={t.f.link} value={p.link} onChange={(v) => patch('projects', p.id, { link: v })} placeholder="github.com/…" />
                  <Area
                    label={t.f.description}
                    rows={2}
                    value={p.summary}
                    onChange={(v) => patch('projects', p.id, { summary: v })}
                    hint={t.form.projectSummaryHint}
                  />
                  <Field
                    label={t.f.tech}
                    value={p.tech}
                    onChange={(v) => patch('projects', p.id, { tech: v })}
                    placeholder="React, Spring Boot"
                    hint={t.form.techHint}
                  />
                  <Area
                    label={t.f.highlights}
                    rows={3}
                    value={p.highlights ?? ''}
                    onChange={(v) => patch('projects', p.id, { highlights: v })}
                    hint={t.form.highlightsHint}
                  />
                </Entry>
              ))}
              <AddButton
                label={t.form.add}
                onClick={() => add('projects', { id: uid('p'), name: '', role: '', link: '', summary: '', tech: '', highlights: '' })}
              />
            </div>
          </Accordion>

          {/* --- sertifikalar --- */}
          <Accordion icon="badge" title={t.sections.certificates} count={data.certificates.length}>
            <div className="cvs-repeat">
              {data.certificates.length === 0 && <p className="cvs-empty">{t.form.empty}</p>}
              {data.certificates.map((c, i) => (
                <Entry
                  key={c.id}
                  index={i}
                  total={data.certificates.length}
                  title={c.name || `${t.f.certName} ${i + 1}`}
                  subtitle={c.issuer}
                  labels={entryLabels}
                  onMove={(d) => move('certificates', i, d)}
                  onRemove={() => remove('certificates', c.id)}
                >
                  <Field label={t.f.certName} value={c.name} onChange={(v) => patch('certificates', c.id, { name: v })} />
                  <div className="cvs-row-2">
                    <Field label={t.f.issuer} value={c.issuer} onChange={(v) => patch('certificates', c.id, { issuer: v })} />
                    <Field
                      label={t.f.date}
                      value={c.date}
                      onChange={(v) => patch('certificates', c.id, { date: v })}
                      placeholder={datePh.single}
                      warn={dateWarn(c.date)}
                    />
                  </div>
                </Entry>
              ))}
              <AddButton label={t.form.add} onClick={() => add('certificates', { id: uid('c'), name: '', issuer: '', date: '', link: '' })} />
            </div>
          </Accordion>

          {/* --- ödüller --- */}
          <Accordion icon="trophy" title={t.sections.awards} count={data.awards.length}>
            <div className="cvs-repeat">
              {data.awards.length === 0 && <p className="cvs-empty">{t.form.empty}</p>}
              {data.awards.map((a, i) => (
                <Entry
                  key={a.id}
                  index={i}
                  total={data.awards.length}
                  title={a.name || `${t.f.awardName} ${i + 1}`}
                  subtitle={a.issuer}
                  labels={entryLabels}
                  onMove={(d) => move('awards', i, d)}
                  onRemove={() => remove('awards', a.id)}
                >
                  <Field label={t.f.awardName} value={a.name} onChange={(v) => patch('awards', a.id, { name: v })} />
                  <div className="cvs-row-2">
                    <Field label={t.f.issuer} value={a.issuer} onChange={(v) => patch('awards', a.id, { issuer: v })} />
                    <Field
                      label={t.f.date}
                      value={a.date}
                      onChange={(v) => patch('awards', a.id, { date: v })}
                      placeholder={datePh.single}
                      warn={dateWarn(a.date)}
                    />
                  </div>
                  <Area label={t.f.description} rows={2} value={a.summary} onChange={(v) => patch('awards', a.id, { summary: v })} />
                </Entry>
              ))}
              <AddButton label={t.form.add} onClick={() => add('awards', { id: uid('a'), name: '', issuer: '', date: '', summary: '' })} />
            </div>
          </Accordion>

          {/* --- ilgi alanları --- */}
          <Accordion icon="heart" title={t.sections.interests}>
            <Area
              label={t.sections.interests}
              rows={2}
              value={data.interests}
              onChange={(v) => setData({ ...data, interests: v })}
              hint={t.form.interestsHint}
            />
          </Accordion>

          {/* --- referanslar --- */}
          <Accordion icon="users" title={t.sections.references} count={data.references.length}>
            <div className="cvs-repeat">
              {data.references.length === 0 && <p className="cvs-empty">{t.form.empty}</p>}
              {data.references.map((r, i) => (
                <Entry
                  key={r.id}
                  index={i}
                  total={data.references.length}
                  title={r.name || `${t.f.refName} ${i + 1}`}
                  subtitle={r.company}
                  labels={entryLabels}
                  onMove={(d) => move('references', i, d)}
                  onRemove={() => remove('references', r.id)}
                >
                  <div className="cvs-row-2">
                    <Field label={t.f.refName} value={r.name} onChange={(v) => patch('references', r.id, { name: v })} />
                    <Field label={t.f.role} value={r.role} onChange={(v) => patch('references', r.id, { role: v })} />
                  </div>
                  <div className="cvs-row-2">
                    <Field label={t.f.company} value={r.company} onChange={(v) => patch('references', r.id, { company: v })} />
                    <Field label={t.f.refContact} value={r.contact} onChange={(v) => patch('references', r.id, { contact: v })} />
                  </div>
                </Entry>
              ))}
              <AddButton label={t.form.add} onClick={() => add('references', { id: uid('r'), name: '', role: '', company: '', contact: '' })} />
            </div>
          </Accordion>

          {/* --- ek bilgiler: ATS/uluslararası başvurularda çoğu zaman gereksiz, bu yüzden kapalı ve en sonda --- */}
          <Accordion icon="info" title={t.form.extraTitle}>
            <p className="cvs-hint">{t.form.extraHint}</p>
            <div className="cvs-row-2">
              <Field label={t.f.birthDate} value={data.profile.birthDate} onChange={(v) => setProfile('birthDate', v)} />
              <Field label={t.f.nationality} value={data.profile.nationality} onChange={(v) => setProfile('nationality', v)} />
            </div>
            <div className="cvs-row-2">
              <Field label={t.f.drivingLicense} value={data.profile.drivingLicense} onChange={(v) => setProfile('drivingLicense', v)} />
              <Field label={t.f.military} value={data.profile.military} onChange={(v) => setProfile('military', v)} />
            </div>
          </Accordion>
        </div>

        {/* ----------------------------- ÖNİZLEME ----------------------------- */}
        <div className="cvs-pane" style={{ display: pane === 'preview' ? 'block' : 'none' }}>
          <div className="cvs-sticky">
            <div className="cvs-stage">
              <div className="cvs-stage-bar">
                <span>{t.form.previewTab}</span>
                <span>{tpl.name}</span>
              </div>
              <div className="cvs-scroll" aria-label={t.a11yPreview}>
                {/* Kenar boşluğu kılavuzu yalnızca ATS ailesinde; görsel şablonlar boşluğu kendi çizer. */}
                <CvPaper paper={settings.paper} marginMm={ats ? settings.margin : undefined} pageLabel={(n) => String(n)}>
                  <CvDocument data={data} settings={settings} static />
                </CvPaper>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
