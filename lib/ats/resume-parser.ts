// Sezgisel CV ayrıştırıcı — yüklenen belgenin düz metnini (ve varsa satır biçim
// ipuçlarını) StructuredResume'a çevirir. Kesinlik değil makul tahmin hedeflenir.

import type {
  AtsDocument,
  AtsLang,
  ResumeEducation,
  ResumeExperience,
  ResumeSection,
  ResumeSectionKind,
  StructuredResume,
} from './types'
import { guessHeadingKind, recogniseHeading } from './headings'
import {
  EMAIL_RE,
  GITHUB_RE,
  LINKEDIN_RE,
  bulletGlyph,
  findDateRanges,
  findDateTokens,
  findPhone,
  findWebsite,
  fold,
  looksLikeLocation,
  splitSegments,
  stripBullet,
  wordCount,
} from './text'

type Ln = {
  idx: number
  raw: string
  t: string
  f: string
  blank: boolean
  fontSize?: number
  bold?: boolean
  page: number
}

const AMBIGUOUS_HEADINGS: Record<string, true> = {}
'training courses leadership research activities language dil expertise technologies teknolojiler employment about hello intro journey toolkit toolbox portfolio achievements accomplishments competencies volunteering publications internships objective patents presentations conferences affiliations tecrube'
  .split(' ')
  .forEach((w) => (AMBIGUOUS_HEADINGS[w] = true))

export const ROLE_RE =
  /\b(?:developer|engineer|architect|manager|specialist|analyst|consultant|lead|designer|director|administrator|scientist|tester|intern|officer|coordinator|assistant|executive|representative|accountant|programmer|technician|owner|head|recruiter|associate|cto|ceo|cfo|vp|founder|co-founder|trainee|expert|partner|supervisor|agent|editor|writer|teacher|instructor|nurse|gelistirici\w*|muhendis\w*|uzman\w*|yonetici\w*|mudur\w*|analist\w*|danisman\w*|tasarimci\w*|stajyer\w*|sorumlu\w*|sef\w*|koordinator\w*|asistan\w*|temsilci\w*|muhasebeci\w*|mimar\w*|lider\w*|teknisyen\w*|operator\w*|kurucu\w*|ogretmen\w*|egitmen\w*|direktor\w*|yardimci\w*)\b/
const COMPANY_STRONG_RE =
  /\b(?:inc|ltd|llc|gmbh|corp|corporation|co|company|a\.?s|sti|holding|bank|banka\w*|group|grup|agency|ajans\w*|ventures|university|universitesi|hospital|hastane\w*|bakanlig\w*|belediye\w*|sanayi|ticaret|limited|sirketi|plc|ag|bv|srl)\b/
const COMPANY_RE =
  /\b(?:inc|ltd|llc|gmbh|corp|corporation|co|company|a\.?s|as|sti|holding|bank|banka\w*|bankasi|teknoloji\w*|technolog\w*|software|yazilim|bilisim|group|grup|solutions|systems|labs|studio|agency|ajans\w*|consulting|danismanlik|partners|ventures|university|universitesi|hospital|hastane\w*|bakanlig\w*|belediye\w*|sanayi|ticaret|limited|sirketi)\b/
const DEGREE_RE =
  /\b(?:bachelor\w*|master\w*|b\.?sc|m\.?sc|b\.?s|m\.?s|b\.?a|m\.?a|b\.?eng|m\.?eng|phd|ph\.d|mba|doctorate|associate degree|diploma|degree|high school|lisans|yuksek lisans|on lisans|onlisans|doktora|lise|mezun\w*|bolumu|muhendisligi|fakultesi|engineering|science|arts)\b/
const SCHOOL_RE = /\b(?:university|universite\w*|college|institute|school|academy|akademi\w*|lisesi|koleji|enstitusu|fakulte\w*|polytechnic|teknik)\b/
const TECH_LABEL_RE = /^(?:technologies|technology|tech stack|stack|tools|tech|teknolojiler|kullanilan teknolojiler|araclar)\s*:\s*/

function isContactish(t: string): boolean {
  return EMAIL_RE.test(t) || !!findPhone(t) || LINKEDIN_RE.test(t) || GITHUB_RE.test(t) || !!findWebsite(t)
}

function isAllCaps(t: string): boolean {
  const letters = t.replace(/[^A-Za-zÇĞİÖŞÜçğıöşü]/g, '')
  return letters.length >= 3 && letters === letters.toLocaleUpperCase('tr-TR') && letters !== letters.toLocaleLowerCase('tr-TR')
}

export function detectLang(text: string): AtsLang {
  const f = ' ' + fold(text).replace(/\s+/g, ' ') + ' '
  const count = (re: RegExp) => (f.match(re) || []).length
  const tr = count(/ (?:ve|ile|icin|bir|olarak|deneyim|egitim|yetkinlik\w*|gunumuz|universitesi|sagladi\w*|gelistirdi\w*) /g) + (text.match(/[ğşıİ]/g) || []).length / 8
  const en = count(/ (?:and|the|with|for|of|to|experience|education|skills|present|university|developed|built) /g)
  return tr > en ? 'tr' : 'en'
}

export function parseResume(doc: AtsDocument): StructuredResume {
  const textLines = (doc.text || '').replace(/\r/g, '').split('\n')
  const hintsAligned = doc.lines && doc.lines.length === textLines.length
  const hintMap: Record<string, { fontSize?: number; bold?: boolean; page: number }> = {}
  if (!hintsAligned && doc.lines) {
    for (const l of doc.lines) {
      const k = l.text.trim()
      if (k && !hintMap[k]) hintMap[k] = { fontSize: l.fontSize, bold: l.bold, page: l.page }
    }
  }
  const lines: Ln[] = textLines.map((raw, idx) => {
    const t = raw.trim()
    const h = hintsAligned ? doc.lines[idx] : hintMap[t]
    return { idx, raw, t, f: fold(t), blank: !t, fontSize: h?.fontSize, bold: h?.bold, page: h?.page ?? 1 }
  })
  const hasFont = lines.some((l) => l.fontSize !== undefined)

  // gövde font boyutu: karakter ağırlıklı mod
  let body = doc.layout.bodyFontSizePt
  if (!body && hasFont) {
    const w: Record<string, number> = {}
    for (const l of lines) if (l.fontSize) w[String(Math.round(l.fontSize * 2) / 2)] = (w[String(Math.round(l.fontSize * 2) / 2)] || 0) + l.t.length
    let best = 0
    Object.keys(w).forEach((k) => {
      if (w[k] > (best ? w[String(best)] : -1)) best = Number(k)
    })
    body = best || undefined
  }

  const nonBlank = lines.filter((l) => !l.blank)
  const topIdx = nonBlank.slice(0, 3).map((l) => l.idx)

  /* ------------------------------ başlıkları bul ------------------------------ */
  type H = { idx: number; kind: ResumeSectionKind; standard: boolean; text: string }
  const heads: H[] = []
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]
    if (l.blank || l.t.length > 48 || bulletGlyph(l.raw)) continue
    const prevBlank = i === 0 || lines[i - 1].blank
    const big = !!(body && l.fontSize && l.fontSize >= body + 1.2)
    const caps = isAllCaps(l.t)
    const colon = /[:：]\s*$/.test(l.t)
    const rec = recogniseHeading(l.t)
    if (rec) {
      const key = l.f.replace(/[^a-z ]/g, '').trim()
      if (AMBIGUOUS_HEADINGS[key] && !(caps || big || l.bold || colon || prevBlank)) continue
      if (topIdx.indexOf(i) >= 0 && rec.kind === 'other') continue
      heads.push({ idx: i, kind: rec.kind, standard: rec.standard, text: l.t.replace(/[:：]\s*$/, '') })
      continue
    }
    // biçimden başlık tahmini (bilinmeyen/yaratıcı başlıklar)
    if (topIdx.indexOf(i) >= 0) continue
    const wc = wordCount(l.t)
    if (wc === 0 || wc > 5 || l.t.length > 40 || /\d|@|https?:|www\./.test(l.t) || /[.,;]$/.test(l.t)) continue
    const nextBlankOrEnd = i + 1 >= lines.length
    if (nextBlankOrEnd) continue
    let formatted = false
    if (hasFont) formatted = big || (!!l.bold && caps && wc <= 4)
    else formatted = caps && wc <= 4 && prevBlank
    if (!formatted && colon && prevBlank && wc <= 4 && /^[A-ZÇĞİÖŞÜ]/.test(l.t)) {
      // "My Journey:" gibi iki noktayla biten kısa satır — ancak altında içerik varsa
      formatted = !!lines[i + 1] && !lines[i + 1].blank
    }
    if (!formatted) continue
    if (isContactish(l.t) || looksLikeLocation(l.t)) continue
    const kind = guessHeadingKind(l.t)
    if (kind === 'other') {
      // büyük harfli şirket adı olabilir: altında tarih aralığı varsa başlık sayma
      let dated = false
      for (let j = i + 1; j <= i + 3 && j < lines.length; j++) if (findDateRanges(lines[j].f).length) dated = true
      if (dated || /[A-Za-z]{2,}\s+\|/.test(l.t)) continue
    }
    heads.push({ idx: i, kind, standard: false, text: l.t.replace(/[:：]\s*$/, '') })
  }

  const firstHead = heads.length ? heads[0].idx : Math.min(lines.length, 10)
  const header = lines.slice(0, firstHead).filter((l) => !l.blank).slice(0, 12)

  /* --------------------------------- bölümler --------------------------------- */
  const sections: ResumeSection[] = []
  const bodyOf: { kind: ResumeSectionKind; lines: Ln[] }[] = []
  heads.forEach((h, k) => {
    const end = k + 1 < heads.length ? heads[k + 1].idx : lines.length
    const bl = lines.slice(h.idx + 1, end)
    sections.push({
      kind: h.kind,
      heading: h.text,
      standard: h.standard,
      body: bl.map((l) => l.t).join('\n').replace(/\n{3,}/g, '\n\n').trim(),
      lineRange: [h.idx, end],
    })
    bodyOf.push({ kind: h.kind, lines: bl })
  })
  const linesOf = (kind: ResumeSectionKind): Ln[] => {
    const out: Ln[] = []
    bodyOf.forEach((b) => {
      if (b.kind !== kind) return
      if (out.length) out.push({ idx: -1, raw: '', t: '', f: '', blank: true, page: 1 })
      b.lines.forEach((l) => out.push(l))
    })
    return out
  }

  /* --------------------------------- iletişim --------------------------------- */
  const contactPool = header.concat(linesOf('contact').filter((l) => !l.blank))
  const firstMatch = (pool: Ln[], fn: (t: string) => string): string => {
    for (const l of pool) {
      const v = fn(l.t)
      if (v) return v
    }
    return ''
  }
  const reVal = (re: RegExp) => (t: string) => {
    const m = t.match(re)
    return m ? m[0] : ''
  }
  const allNonBlank = nonBlank
  const email = firstMatch(contactPool, reVal(EMAIL_RE)) || firstMatch(allNonBlank, reVal(EMAIL_RE))
  const phone = firstMatch(contactPool, findPhone) || firstMatch(allNonBlank.slice(0, 25), findPhone)
  const linkedin = firstMatch(contactPool, reVal(LINKEDIN_RE)) || firstMatch(allNonBlank, reVal(LINKEDIN_RE))
  const github = firstMatch(contactPool, reVal(GITHUB_RE)) || firstMatch(allNonBlank.slice(0, 25), reVal(GITHUB_RE))
  const website = firstMatch(contactPool, (t) => (EMAIL_RE.test(t) ? findWebsite(t.replace(EMAIL_RE, ' ')) : findWebsite(t)))
  let location = ''
  for (const l of contactPool) {
    for (const seg of splitSegments(l.t)) {
      const s = seg.replace(/^(?:address|adres|location|konum|city|sehir|şehir)\s*:\s*/i, '')
      if (looksLikeLocation(s)) {
        location = s
        break
      }
    }
    if (location) break
  }

  /* -------------------------------- ad ve unvan -------------------------------- */
  let name = ''
  let title = ''
  let nameIdx = -1
  const nameOk = (s: string) => {
    const w = s.split(/\s+/).filter(Boolean)
    if (w.length < 1 || w.length > 5 || s.length > 45) return false
    if (/[\d@/:]/.test(s) || isContactish(s) || looksLikeLocation(s) || recogniseHeading(s)) return false
    return w.every((x) => /^[A-ZÇĞİÖŞÜ]/.test(x) || /^(?:de|da|van|von|bin|al|el|der|du|di|la|le)$/.test(x))
  }
  const headPool = header.length ? header : nonBlank.slice(0, 6)
  if (hasFont) {
    let best: Ln | null = null
    for (const l of headPool.slice(0, 6)) {
      const first = splitSegments(l.t)[0] || l.t
      if (l.fontSize && nameOk(first) && (!best || (best.fontSize ?? 0) < l.fontSize)) best = l
    }
    if (best) {
      name = splitSegments(best.t)[0] || best.t
      nameIdx = best.idx
    }
  }
  if (!name) {
    for (const l of headPool.slice(0, 6)) {
      const segs = splitSegments(l.t)
      const first = segs[0] || l.t
      const wc = first.split(/\s+/).length
      if (wc >= 2 && wc <= 4 && nameOk(first)) {
        name = first
        nameIdx = l.idx
        if (segs[1] && !isContactish(segs[1]) && !looksLikeLocation(segs[1]) && wordCount(segs[1]) <= 8) title = segs[1]
        break
      }
    }
  }
  if (nameIdx >= 0 && !title) {
    let seen = 0
    for (const l of headPool) {
      if (l.idx <= nameIdx) continue
      if (++seen > 3) break
      const seg = splitSegments(l.t)[0] || l.t
      if (isContactish(seg) || looksLikeLocation(seg) || recogniseHeading(seg)) continue
      if (wordCount(seg) <= 10 && seg.length <= 90 && !/[.!?]$/.test(seg)) title = seg
      break
    }
  }

  /* ---------------------------------- özet ---------------------------------- */
  let summary = linesOf('summary')
    .filter((l) => !l.blank)
    .map((l) => l.t)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!summary) {
    const para = header.filter((l) => wordCount(l.t) >= 15 && !isContactish(l.t))
    summary = para.map((l) => l.t).join(' ').trim()
  }

  const experience = parseExperience(linesOf('experience'))
  const education = parseEducation(linesOf('education'))
  const { skills, skillGroups } = parseSkills(linesOf('skills'))
  const projects = parseProjects(linesOf('projects'))
  const certifications = mergeWrapped(linesOf('certifications')).map(stripBullet).filter(Boolean)
  const languages: string[] = []
  mergeWrapped(linesOf('languages')).forEach((l) => {
    const t = stripBullet(l)
    if (!t) return
    const parts = t.split(/\s*[;|•·]\s*/)
    parts.forEach((p) => {
      const sub = p.split(/,\s*/)
      if (sub.length > 1 && sub.every((x) => wordCount(x) <= 4)) sub.forEach((x) => x.trim() && languages.push(x.trim()))
      else if (p.trim()) languages.push(p.trim())
    })
  })

  return {
    name,
    title,
    contact: { email, phone, location, linkedin, github, website },
    summary,
    sections,
    experience,
    education,
    skills,
    skillGroups,
    projects,
    certifications,
    languages,
    lang: detectLang(doc.text || ''),
  }
}

/* ============================== yardımcı ayrıştırıcılar ============================== */

/** PDF satır kırılmalarını birleştirir: küçük harfle başlayan satır öncekinin devamıdır. */
function mergeWrapped(lines: Ln[]): string[] {
  const out: string[] = []
  let prevBlank = true
  for (const l of lines) {
    if (l.blank) {
      prevBlank = true
      out.push('')
      continue
    }
    const glyph = bulletGlyph(l.raw)
    if (!glyph && !prevBlank && out.length && out[out.length - 1] && /^[a-zçğıöşü(]/.test(l.t) && !/[.!?:]$/.test(out[out.length - 1])) {
      out[out.length - 1] += ' ' + l.t
    } else out.push(l.raw.trim())
    prevBlank = false
  }
  return out
}

type Block = { text: string; bullet: boolean; blank: boolean; f: string }

/** Cümle gibi biten satır mı? ("A.Ş.", "Inc." gibi kısaltmalar hariç) */
function isSentence(t: string): boolean {
  return /[.!?]$/.test(t) && wordCount(t) > 6 && !/(?:\b[A-Za-zÇĞİÖŞÜçğıöşü]\.){1,3}$|\b(?:inc|ltd|co|corp|şti|sti|jr|sr)\.$/i.test(t)
}

function toBlocks(lines: Ln[]): Block[] {
  return mergeWrapped(lines).map((t) => ({ text: bulletGlyph(t) ? stripBullet(t) : t, bullet: !!bulletGlyph(t), blank: !t, f: fold(t) }))
}

function splitHeaderParts(s: string): string[] {
  return s
    .split(/\s[|•·]\s|\s[–—]\s|\s-\s|\t|\s{3,}|\|/)
    .map((x) => x.replace(/^[\s,|–—\-]+|[\s,|–—\-]+$/g, '').trim())
    .filter(Boolean)
}

function removeRange(text: string, from: number, to: number): string {
  return (text.slice(0, from) + ' ' + text.slice(to)).replace(/\(\s*\)/g, ' ').trim()
}

type Anchor = { i: number; start: string; end: string; current: boolean; rest: string }

function anchorsIn(blocks: Block[], allowSingle: boolean): Anchor[] {
  const out: Anchor[] = []
  blocks.forEach((b, i) => {
    if (b.blank || b.bullet || wordCount(b.text) > 16) return
    const r = findDateRanges(b.f)[0]
    if (r) {
      out.push({
        i,
        start: b.text.slice(r.start.start, r.start.end),
        end: r.end ? b.text.slice(r.end.start, r.end.end) : '',
        current: !!r.end && r.end.kind === 'present',
        rest: removeRange(b.text, r.from, r.to),
      })
      return
    }
    if (allowSingle) {
      const t = findDateTokens(b.f).filter((x) => x.kind !== 'present')
      if (t.length === 1 && wordCount(b.text) <= 10) {
        out.push({ i, start: '', end: b.text.slice(t[0].start, t[0].end), current: false, rest: removeRange(b.text, t[0].start, t[0].end) })
      }
    }
  })
  return out
}

/** Tarih çapaları etrafında kayıtları böler: başlık satırları (≤3) + içerik. */
function splitEntries(blocks: Block[], allowSingle: boolean): { anchor: Anchor | null; head: string[]; content: Block[] }[] {
  const anchors = anchorsIn(blocks, allowSingle)
  const out: { anchor: Anchor | null; head: string[]; content: Block[] }[] = []
  if (!anchors.length) {
    // tarih yok: boş satırla ayrılmış gruplar
    let cur: Block[] = []
    const flush = () => {
      if (!cur.length) return
      const headN = cur.findIndex((b) => b.bullet || wordCount(b.text) > 12)
      const hc = headN < 0 ? Math.min(2, cur.length) : Math.min(2, headN)
      out.push({ anchor: null, head: cur.slice(0, hc).map((b) => b.text), content: cur.slice(hc) })
      cur = []
    }
    blocks.forEach((b) => (b.blank ? flush() : cur.push(b)))
    flush()
    return out
  }
  const headStart: number[] = []
  anchors.forEach((a, k) => {
    const floor = k === 0 ? 0 : anchors[k - 1].i + 1
    let s = a.i
    let n = 0
    for (let j = a.i - 1; j >= floor && n < 3; j--) {
      const b = blocks[j]
      if (b.blank || b.bullet || wordCount(b.text) > 12 || isSentence(b.text) || TECH_LABEL_RE.test(b.f)) break
      s = j
      n++
    }
    headStart.push(s)
  })
  anchors.forEach((a, k) => {
    const endIdx = k + 1 < anchors.length ? headStart[k + 1] : blocks.length
    const head = blocks.slice(headStart[k], a.i).map((b) => b.text)
    let c = a.i + 1
    if (!head.length) {
      // tarih önce yazılmış: sonraki kısa satırlar başlık
      while (c < endIdx && head.length < 2) {
        const b = blocks[c]
        if (b.blank || b.bullet || wordCount(b.text) > 10 || isSentence(b.text)) break
        head.push(b.text)
        c++
      }
    } else if (head.length === 1 && !a.rest && c < endIdx) {
      // Tarih sağa yaslı düzenlerde PDF metni "Unvan / Tarih / Şirket | Konum" sırasıyla
      // gelir; tarihten sonraki kısa satır kaydın ikinci başlık satırıdır, içerik değil.
      const b = blocks[c]
      if (!b.blank && !b.bullet && wordCount(b.text) <= 10 && !isSentence(b.text) && !TECH_LABEL_RE.test(b.f)) {
        head.push(b.text)
        c++
      }
    }
    if (a.rest) head.push(a.rest)
    out.push({ anchor: a, head, content: blocks.slice(c, endIdx) })
  })
  return out
}

function contentToBullets(content: Block[]): { bullets: string[]; description: string } {
  const bullets: string[] = []
  const desc: string[] = []
  for (const b of content) {
    if (b.blank) continue
    if (b.bullet) bullets.push(b.text)
    else desc.push(b.text)
  }
  // glif yoksa kısa satırlar madde sayılır (PDF'te madde işareti kaybolmuş olabilir)
  if (!bullets.length && desc.length >= 2 && desc.every((d) => wordCount(d) <= 35 && !TECH_LABEL_RE.test(fold(d)))) {
    return { bullets: desc, description: '' }
  }
  return { bullets, description: desc.join('\n') }
}

function parseExperience(lines: Ln[]): ResumeExperience[] {
  if (!lines.some((l) => !l.blank)) return []
  const entries = splitEntries(toBlocks(lines), false)
  return entries
    .map(({ anchor, head, content }) => {
      const parts: string[] = []
      head.forEach((h) => splitHeaderParts(h).forEach((p) => parts.push(p)))
      let loc = ''
      const rest: string[] = []
      parts.forEach((p) => {
        if (!loc && looksLikeLocation(p)) loc = p
        else rest.push(p)
      })
      if (rest.length === 1) {
        const m = rest[0].match(/^(.+?)\s+(?:at|@|,)\s+(.+)$/) || rest[0].match(/^(.+?),\s*(.+)$/)
        if (m) rest.splice(0, 1, m[1].trim(), m[2].trim())
      }
      let title = ''
      let company = ''
      let roleIdx = rest.findIndex((p) => ROLE_RE.test(fold(p)) && !COMPANY_STRONG_RE.test(fold(p)))
      if (roleIdx < 0) roleIdx = rest.findIndex((p) => ROLE_RE.test(fold(p)))
      let compIdx = rest.findIndex((p, i) => i !== roleIdx && COMPANY_STRONG_RE.test(fold(p)))
      if (compIdx < 0) compIdx = rest.findIndex((p, i) => i !== roleIdx && COMPANY_RE.test(fold(p)))
      if (roleIdx >= 0) {
        title = rest[roleIdx]
        company = compIdx >= 0 ? rest[compIdx] : rest.find((_, i) => i !== roleIdx) || ''
      } else if (compIdx >= 0) {
        company = rest[compIdx]
        title = rest.find((_, i) => i !== compIdx) || ''
      } else {
        title = rest[0] || ''
        company = rest[1] || ''
      }
      const { bullets, description } = contentToBullets(content)
      return {
        title,
        company,
        location: loc,
        start: anchor?.start ?? '',
        end: anchor ? (anchor.current ? anchor.end : anchor.end) : '',
        current: !!anchor?.current,
        bullets,
        description,
      }
    })
    .filter((e) => e.title || e.company || e.bullets.length)
}

function parseEducation(lines: Ln[]): ResumeEducation[] {
  if (!lines.some((l) => !l.blank)) return []
  const entries = splitEntries(toBlocks(lines), true)
  return entries
    .map(({ anchor, head, content }) => {
      const parts: string[] = []
      head.concat(content.filter((b) => !b.blank && !b.bullet && wordCount(b.text) <= 12).map((b) => b.text)).forEach((h) =>
        splitHeaderParts(h).forEach((p) => (looksLikeLocation(p) ? parts.push(p) : p.split(/,\s+(?=[A-ZÇĞİÖŞÜ])/).forEach((x) => parts.push(x.trim())))),
      )
      let degree = ''
      let school = ''
      let location = ''
      for (const p of parts) {
        const f = fold(p)
        if (!location && looksLikeLocation(p)) location = p
        else if (!school && SCHOOL_RE.test(f)) school = p
        else if (!degree && DEGREE_RE.test(f)) degree = p
      }
      if (!degree && !school) {
        degree = parts[0] || ''
        school = parts[1] || ''
      } else if (!degree) degree = parts.find((p) => p !== school && p !== location && !/^(?:gpa|not ortalamasi|grade)/i.test(fold(p))) || ''
      return { degree, school, location, start: anchor?.start ?? '', end: anchor?.end ?? '' }
    })
    .filter((e) => e.degree || e.school)
}

function parseSkills(lines: Ln[]): { skills: string[]; skillGroups: { label: string; items: string[] }[] } {
  const groups: { label: string; items: string[] }[] = []
  const flat: string[] = []
  const loose: string[] = []
  const push = (arr: string[], v: string) => {
    const s = v.replace(/^[\s,;]+|[\s,;.]+$/g, '').trim()
    if (s && s.length <= 60 && flat.indexOf(s) < 0) {
      arr.push(s)
      flat.push(s)
    }
  }
  for (const raw of mergeWrapped(lines)) {
    const t = stripBullet(raw)
    if (!t) continue
    const m = t.match(/^([^:]{1,40}):\s*(.+)$/)
    if (m && wordCount(m[1]) <= 5) {
      const items: string[] = []
      m[2].split(/\s*[,;|•·]\s*/).forEach((x) => push(items, x))
      if (items.length) groups.push({ label: m[1].trim(), items })
      continue
    }
    const parts = t.split(/\s*[,;|•·]\s*|\s{3,}|\t/)
    if (parts.length > 1) parts.forEach((x) => push(loose, x))
    else if (wordCount(t) <= 6) push(loose, t)
  }
  if (loose.length) groups.push({ label: '', items: loose })
  return { skills: flat, skillGroups: groups }
}

function parseProjects(lines: Ln[]): StructuredResume['projects'] {
  const blocks = toBlocks(lines)
  const out: StructuredResume['projects'] = []
  let cur: StructuredResume['projects'][number] | null = null
  let prevKind: 'none' | 'blank' | 'bullet' | 'tech' | 'desc' | 'name' = 'none'
  for (const b of blocks) {
    if (b.blank) {
      prevKind = 'blank'
      continue
    }
    const techM = b.f.match(TECH_LABEL_RE)
    if (techM && cur) {
      b.text
        .slice(techM[0].length)
        .split(/\s*[,;|•·]\s*/)
        .forEach((x) => x.trim() && cur!.tech.push(x.trim()))
      prevKind = 'tech'
      continue
    }
    if (b.bullet && cur) {
      cur.bullets.push(b.text)
      prevKind = 'bullet'
      continue
    }
    const short = wordCount(b.text) <= 10 && !isSentence(b.text) && !/[.!?]$/.test(b.text)
    const startsNew = !cur || (short && (prevKind === 'blank' || prevKind === 'bullet' || prevKind === 'tech'))
    if (startsNew && !b.bullet) {
      const segs = splitHeaderParts(b.text)
      const nameText = segs.find((s) => !findWebsite(s) && !GITHUB_RE.test(s) && !findDateTokens(fold(s)).length) || segs[0] || b.text
      cur = { name: nameText, description: '', tech: [], bullets: [] }
      out.push(cur)
      prevKind = 'name'
      continue
    }
    if (!cur) continue
    if (prevKind === 'name' && short && wordCount(b.text) <= 6 && !cur.description) {
      // rol / bağlantı satırı — açıklamaya katma
      prevKind = 'desc'
      continue
    }
    cur.description = cur.description ? cur.description + ' ' + b.text : b.text
    prevKind = 'desc'
  }
  return out
}
