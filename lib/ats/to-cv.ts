// Yüklenen (ayrıştırılmış) CV → CV Stüdyosu veri modeli. "Bu CV'yi ATS Stüdyosu'nda yeniden
// oluştur" düğmesi kullanır. Seviye göstergeleri (level/score) bilinçli olarak 0'dır.

import type { CvData } from '../cv/types'
import { uid } from '../cv/types'
import type { StructuredResume } from './types'
import { findDateTokens, fold, parseLooseDate, splitSegments } from './text'

/** Tarihi Stüdyo'nun çözebileceği "AA/YYYY" ya da "YYYY" biçimine çevirir; çözülemezse olduğu gibi. */
function normDate(raw: string): string {
  const d = parseLooseDate(raw || '')
  if (!d || d.present || !d.year) return d?.present ? '' : (raw || '').trim()
  return d.month ? `${String(d.month).padStart(2, '0')}/${d.year}` : String(d.year)
}

function parseLanguage(line: string): { name: string; level: string } {
  const s = line.trim()
  let m = s.match(/^([^:()–—\-|,]{2,40}?)\s*[:–—\-|]\s*(.+)$/)
  if (m) return { name: m[1].trim(), level: m[2].trim() }
  m = s.match(/^([^()]{2,40}?)\s*\((.+)\)\s*$/)
  if (m) return { name: m[1].trim(), level: m[2].trim() }
  m = s.match(/^(.{2,40}?)\s+((?:[ABC][12])(?:\s*\(.+\))?|native|fluent|advanced|intermediate|beginner|elementary|ana dil|anadil|ileri|orta|başlangıç|temel)$/i)
  if (m) return { name: m[1].trim(), level: m[2].trim() }
  return { name: s, level: '' }
}

function sectionLines(s: StructuredResume, kind: string): string[] {
  const out: string[] = []
  s.sections
    .filter((x) => x.kind === kind)
    .forEach((x) =>
      x.body
        .split('\n')
        .map((l) => l.trim().replace(/^[•\-*▪►▶→✓✔➤○●◦■–—·]+\s*/, ''))
        .filter(Boolean)
        .forEach((l) => out.push(l)),
    )
  return out
}

export function structuredToCv(s: StructuredResume): CvData {
  const skills: CvData['skills'] = []
  const seen: Record<string, true> = {}
  const pushSkill = (name: string, group: string) => {
    const k = fold(name)
    if (!name.trim() || seen[k]) return
    seen[k] = true
    skills.push({ id: uid('s'), name: name.trim(), level: 0, group: group.trim() })
  }
  if (s.skillGroups.length) s.skillGroups.forEach((g) => g.items.forEach((i) => pushSkill(i, g.label)))
  s.skills.forEach((i) => pushSkill(i, ''))

  const certificates: CvData['certificates'] = s.certifications.map((line) => {
    const parts = splitSegments(line).length > 1 ? splitSegments(line) : line.split(/\s[–—-]\s|,\s(?=[A-ZÇĞİÖŞÜ])/)
    let date = ''
    const rest: string[] = []
    parts.forEach((p) => {
      const tok = findDateTokens(fold(p)).filter((x) => x.kind !== 'present')
      if (!date && tok.length && p.replace(/[\d/.\-\s]/g, '').length <= 10) date = normDate(p)
      else rest.push(p.trim())
    })
    return { id: uid('c'), name: rest[0] || line.trim(), issuer: rest.slice(1).join(', '), date, link: '' }
  })

  const awards: CvData['awards'] = sectionLines(s, 'awards').map((l) => ({ id: uid('a'), name: l, issuer: '', date: '', summary: '' }))
  const interests = sectionLines(s, 'interests').join(', ')

  return {
    profile: {
      fullName: s.name,
      title: s.title,
      photo: '',
      summary: s.summary,
      birthDate: '',
      nationality: '',
      drivingLicense: '',
      military: '',
    },
    contact: {
      email: s.contact.email,
      phone: s.contact.phone,
      location: s.contact.location,
      website: s.contact.website,
      linkedin: s.contact.linkedin,
      github: s.contact.github,
    },
    experience: s.experience.map((e) => ({
      id: uid('e'),
      role: e.title,
      company: e.company,
      location: e.location,
      start: normDate(e.start),
      end: e.current ? '' : normDate(e.end),
      current: e.current,
      summary: e.description,
      bullets: e.bullets.join('\n'),
    })),
    education: s.education.map((e) => ({
      id: uid('ed'),
      degree: e.degree,
      school: e.school,
      location: e.location,
      start: normDate(e.start),
      end: normDate(e.end),
      grade: '',
      summary: '',
    })),
    skills,
    languages: s.languages.map((l) => {
      const p = parseLanguage(l)
      return { id: uid('l'), name: p.name, level: p.level, score: 0 }
    }),
    projects: s.projects.map((p) => ({
      id: uid('p'),
      name: p.name,
      role: '',
      link: '',
      summary: p.description,
      tech: p.tech.join(', '),
      highlights: p.bullets.join('\n'),
    })),
    certificates,
    awards,
    references: [],
    interests,
  }
}
