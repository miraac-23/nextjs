'use client'

/**
 * 2. adım — bilgi girişi.
 * Solda akordeonlu form, sağda canlı önizleme. 1100px altında ikisi sekmeyle
 * değişir; böylece telefonda form tam genişlikte kalır.
 */

import { useRef, useState } from 'react'
import { readImageScaled } from '@/lib/cv/browser'
import { uid, type CvData, type CvSettings } from '@/lib/cv/types'
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

export default function DetailsStep({ t, data, settings, setData, onFillSample, onClear, onExport, onImport, onToast }: Props) {
  const [pane, setPane] = useState<'form' | 'preview'>('form')
  const photoInput = useRef<HTMLInputElement>(null)
  const jsonInput = useRef<HTMLInputElement>(null)

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

  async function onPhoto(file?: File) {
    if (!file) return
    try {
      setProfile('photo', await readImageScaled(file))
    } catch {
      onToast(t.form.photoError, 'error')
    }
  }

  return (
    <>
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
              <Field label={t.f.jobTitle} value={data.profile.title} onChange={(v) => setProfile('title', v)} />
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
            </div>

            <Area
              label={t.f.summary}
              value={data.profile.summary}
              onChange={(v) => setProfile('summary', v)}
              rows={5}
              hint={t.form.required}
            />

            <div className="cvs-row-2">
              <Field label={t.f.birthDate} value={data.profile.birthDate} onChange={(v) => setProfile('birthDate', v)} />
              <Field label={t.f.nationality} value={data.profile.nationality} onChange={(v) => setProfile('nationality', v)} />
            </div>
            <div className="cvs-row-2">
              <Field label={t.f.drivingLicense} value={data.profile.drivingLicense} onChange={(v) => setProfile('drivingLicense', v)} />
              <Field label={t.f.military} value={data.profile.military} onChange={(v) => setProfile('military', v)} />
            </div>
          </Accordion>

          {/* --- iletişim --- */}
          <Accordion icon="globe" title={t.f.contact} defaultOpen>
            <div className="cvs-row-2">
              <Field label={t.f.email} type="email" value={data.contact.email} onChange={(v) => setContact('email', v)} />
              <Field label={t.f.phone} type="tel" value={data.contact.phone} onChange={(v) => setContact('phone', v)} />
            </div>
            <div className="cvs-row-2">
              <Field label={t.f.location} value={data.contact.location} onChange={(v) => setContact('location', v)} />
              <Field label={t.f.website} value={data.contact.website} onChange={(v) => setContact('website', v)} placeholder="site.com" />
            </div>
            <div className="cvs-row-2">
              <Field label={t.f.linkedin} value={data.contact.linkedin} onChange={(v) => setContact('linkedin', v)} placeholder="linkedin.com/in/…" />
              <Field label={t.f.github} value={data.contact.github} onChange={(v) => setContact('github', v)} placeholder="github.com/…" />
            </div>
          </Accordion>

          {/* --- deneyim --- */}
          <Accordion icon="briefcase" title={t.sections.experience} count={data.experience.length} defaultOpen>
            <div className="cvs-repeat">
              {data.experience.length === 0 && <p className="cvs-empty">{t.form.empty}</p>}
              {data.experience.map((e, i) => (
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
                    <Field label={t.f.role} value={e.role} onChange={(v) => patch('experience', e.id, { role: v })} />
                    <Field label={t.f.company} value={e.company} onChange={(v) => patch('experience', e.id, { company: v })} />
                  </div>
                  <div className="cvs-row-3">
                    <Field label={t.f.location} value={e.location} onChange={(v) => patch('experience', e.id, { location: v })} />
                    <Field label={t.f.start} value={e.start} onChange={(v) => patch('experience', e.id, { start: v })} placeholder="2022" />
                    <Field
                      label={t.f.end}
                      value={e.current ? t.present : e.end}
                      onChange={(v) => patch('experience', e.id, { end: v })}
                      placeholder="2024"
                      disabled={e.current}
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
                    rows={4}
                    value={e.bullets}
                    onChange={(v) => patch('experience', e.id, { bullets: v })}
                    hint={t.form.bulletsHint}
                  />
                </Entry>
              ))}
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
                    <Field label={t.f.start} value={e.start} onChange={(v) => patch('education', e.id, { start: v })} />
                    <Field label={t.f.end} value={e.end} onChange={(v) => patch('education', e.id, { end: v })} />
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

          {/* --- yetenekler --- */}
          <Accordion icon="spark" title={t.sections.skills} count={data.skills.length}>
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
                    <Field label={t.f.group} value={s.group} onChange={(v) => patch('skills', s.id, { group: v })} placeholder="Backend" />
                  </div>
                  <label className="cvs-field">
                    <span>
                      {t.f.level} — {t.form.levelLabel(s.level)}
                    </span>
                    <input
                      type="range"
                      min={1}
                      max={5}
                      step={1}
                      value={s.level}
                      onChange={(e) => patch('skills', s.id, { level: Number(e.target.value) })}
                      style={{ padding: 0, border: 0, background: 'transparent' }}
                    />
                  </label>
                </Entry>
              ))}
              <AddButton label={t.form.add} onClick={() => add('skills', { id: uid('s'), name: '', level: 4, group: '' })} />
            </div>
          </Accordion>

          {/* --- diller --- */}
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
                    <Field label={t.f.langLevel} value={l.level} onChange={(v) => patch('languages', l.id, { level: v })} placeholder="C1" />
                  </div>
                  <label className="cvs-field">
                    <span>
                      {t.f.level} — {t.form.levelLabel(l.score)}
                    </span>
                    <input
                      type="range"
                      min={1}
                      max={5}
                      step={1}
                      value={l.score}
                      onChange={(e) => patch('languages', l.id, { score: Number(e.target.value) })}
                      style={{ padding: 0, border: 0, background: 'transparent' }}
                    />
                  </label>
                </Entry>
              ))}
              <AddButton label={t.form.add} onClick={() => add('languages', { id: uid('l'), name: '', level: '', score: 4 })} />
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
                  <Area label={t.f.description} rows={2} value={p.summary} onChange={(v) => patch('projects', p.id, { summary: v })} />
                  <Field label={t.f.tech} value={p.tech} onChange={(v) => patch('projects', p.id, { tech: v })} placeholder="React, Spring Boot" />
                </Entry>
              ))}
              <AddButton label={t.form.add} onClick={() => add('projects', { id: uid('p'), name: '', role: '', link: '', summary: '', tech: '' })} />
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
                    <Field label={t.f.date} value={c.date} onChange={(v) => patch('certificates', c.id, { date: v })} />
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
                    <Field label={t.f.date} value={a.date} onChange={(v) => patch('awards', a.id, { date: v })} />
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
        </div>

        {/* ----------------------------- ÖNİZLEME ----------------------------- */}
        <div className="cvs-pane" style={{ display: pane === 'preview' ? 'block' : 'none' }}>
          <div className="cvs-sticky">
            <div className="cvs-stage">
              <div className="cvs-stage-bar">
                <span>{t.form.previewTab}</span>
                <span>{settings.templateId.toUpperCase()}</span>
              </div>
              <div className="cvs-scroll">
                <CvPaper paper={settings.paper} pageLabel={(n) => String(n)}>
                  <CvDocument data={data} settings={settings} t={t} static />
                </CvPaper>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
