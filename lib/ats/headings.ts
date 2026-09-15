// Bölüm başlığı tanıyıcı — TR + EN standart başlıklar, eş anlamlılar ve yaratıcı başlıklar.
// standard=false → ATS'nin kategorize etmekte zorlanacağı (yaratıcı/kişisel) başlık.

import type { ResumeSectionKind } from './types'
import { fold } from './text'

export type HeadingMatch = { kind: ResumeSectionKind; standard: boolean }

const STD: [ResumeSectionKind, string][] = [
  ['summary', 'professional summary|summary|profile|professional profile|career summary|executive summary|summary of qualifications|career profile|objective|career objective|professional objective|personal statement|profil|profesyonel ozet|ozet|kariyer ozeti|profesyonel profil|kariyer hedefi|ozgecmis ozeti|kisa ozet|profil ozeti|kariyer profili'],
  ['experience', 'experience|work experience|professional experience|employment history|employment|work history|career history|relevant experience|professional background|employment experience|experiences|internships|internship experience|deneyim|deneyimler|is deneyimi|is deneyimleri|mesleki deneyim|is tecrubesi|is tecrubeleri|tecrube|tecrubeler|profesyonel deneyim|calisma deneyimi|staj deneyimi|stajlar|kariyer gecmisi|mesleki tecrube'],
  ['education', 'education|education and training|academic background|academic history|educational background|academic qualifications|education & training|egitim|egitim bilgileri|egitim durumu|ogrenim|ogrenim bilgileri|akademik gecmis|egitim gecmisi|akademik bilgiler'],
  ['skills', 'skills|technical skills|core competencies|competencies|key skills|skills & competencies|skills and competencies|technologies|tech stack|technical competencies|areas of expertise|expertise|core skills|professional skills|hard skills|soft skills|skills & tools|skills and tools|tools & technologies|tools and technologies|technical expertise|it skills|computer skills|skill set|skillset|yetenekler|yetkinlikler|teknik yetkinlikler|teknik beceriler|beceriler|teknik bilgiler|bilgisayar becerileri|uzmanlik alanlari|teknik yetenekler|temel yetkinlikler|yetkinlik|teknolojiler|kullanilan teknolojiler|bilgisayar bilgisi|mesleki yetkinlikler'],
  ['projects', 'projects|personal projects|key projects|selected projects|academic projects|side projects|project experience|open source|open source projects|notable projects|projeler|kisisel projeler|proje deneyimi|akademik projeler|onemli projeler|acik kaynak projeler'],
  ['certifications', 'certifications|certificates|certification|licenses & certifications|licenses and certifications|licences & certifications|courses & certifications|certifications & courses|certifications and training|training|trainings|courses|professional development|sertifikalar|sertifika|kurslar|sertifikalar ve kurslar|kurs ve sertifikalar|egitim ve sertifikalar|sertifikalar & kurslar|aldigi egitimler|mesleki gelisim|lisanslar ve sertifikalar'],
  ['languages', 'languages|language skills|foreign languages|language|yabanci dil|yabanci diller|diller|dil bilgisi|dil becerileri|dil'],
  ['awards', 'awards|honors|honours|honors & awards|awards & honors|awards and honors|achievements|accomplishments|awards & achievements|oduller|basarilar|odul ve basarilar|oduller ve basarilar'],
  ['interests', 'interests|hobbies|hobbies & interests|hobbies and interests|interests & hobbies|ilgi alanlari|hobiler|hobi ve ilgi alanlari'],
  ['references', 'references|referees|referanslar|referans'],
  ['contact', 'contact|contact information|contact details|personal information|personal details|iletisim|iletisim bilgileri|kisisel bilgiler|kisisel bilgi'],
  ['other', 'volunteer|volunteer experience|volunteering|volunteer work|gonullu calismalar|gonulluluk|gonullu deneyim|publications|yayinlar|memberships|professional memberships|uyelikler|activities|extracurricular activities|leadership|leadership experience|additional information|ek bilgiler|diger bilgiler|military service|askerlik durumu|askerlik|conferences|konferanslar|patents|patentler|research|arastirma|research experience|presentations|sunumlar|affiliations'],
]

const CREATIVE: [ResumeSectionKind, string][] = [
  ['summary', 'about me|about|who i am|hello|hi there|my story|intro|introduction|hakkimda|ben kimim|kendimden bahsetmek gerekirse|merhaba|kisaca ben'],
  ['experience', 'my journey|journey|career journey|where i have been|where i\'ve been|what i have done|what i\'ve done|my experience|my career|work life|my work history|places i have worked|yolculugum|kariyer yolculugum|neler yaptim|calistigim yerler|deneyimlerim'],
  ['education', 'my education|learning journey|where i studied|schooling|egitim hayatim|okudugum okullar'],
  ['skills', 'my toolkit|toolkit|toolbox|my toolbox|what i know|my skills|superpowers|my superpowers|tools i use|my stack|what i bring|what i do|things i know|yeteneklerim|bildiklerim|neler biliyorum|araclarim|becerilerim|yetkinliklerim'],
  ['projects', 'my projects|things i have built|things i\'ve built|what i have built|what i\'ve built|my work|portfolio|side hustles|projelerim|yaptiklarim|neler yaptim'],
  ['certifications', 'my certificates|my certifications|sertifikalarim'],
  ['languages', 'languages i speak|konustugum diller|dillerim'],
  ['awards', 'my achievements|proud moments|basarilarim|odullerim'],
  ['interests', 'beyond work|outside work|when i am not working|fun facts|life outside work|passions|my interests|ilgi alanlarim|hobilerim|is disinda'],
]

const DICT: Record<string, HeadingMatch> = {}
STD.forEach(([kind, list]) => list.split('|').forEach((h) => (DICT[h] = { kind, standard: true })))
CREATIVE.forEach(([kind, list]) =>
  list.split('|').forEach((h) => {
    if (!DICT[h]) DICT[h] = { kind, standard: false }
  }),
)

/** Başlık metnini karşılaştırma anahtarına indirger. */
export function headingKey(line: string): string {
  return fold(line)
    .replace(/[’']/g, "'")
    .replace(/\s+and\s+/g, ' & ')
    .replace(/\s+ve\s+/g, ' ve ')
    .replace(/[^a-z0-9&' ]+/g, ' ')
    .replace(/\s*&\s*/g, ' & ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Satır bilinen bir bölüm başlığı mı? Yalnızca kısa satırlar (≤ 6 kelime / ≤ 48 karakter).
 * Harf aralıklı "E X P E R I E N C E" biçimini de tanır.
 */
export function recogniseHeading(line: string): HeadingMatch | null {
  let t = line.trim().replace(/[:：]\s*$/, '')
  if (!t || t.length > 48) return null
  if (/^(?:[A-Za-zÇĞİÖŞÜ]\s){3,}[A-Za-zÇĞİÖŞÜ]$/.test(t)) t = t.replace(/\s/g, '')
  const key = headingKey(t)
  if (!key || key.split(' ').length > 6) return null
  const alt = key.replace(/ & /g, ' and ')
  const hit = DICT[key] || DICT[alt] || DICT[key.replace(/ & /g, ' ve ')]
  if (hit) return hit
  // "My Skills" gibi iyelikli yaratıcı biçimler
  const my = key.match(/^(?:my|our) (.+)$/)
  if (my && DICT[my[1]]) return { kind: DICT[my[1]].kind, standard: false }
  return null
}

/** Tanınmayan başlığın muhtemel türünü tahmin eder (standard=false). */
export function guessHeadingKind(line: string): ResumeSectionKind {
  const k = headingKey(line)
  if (/experien|journey|career|employ|work|deneyim|tecrube|kariyer|staj/.test(k)) return 'experience'
  if (/skill|tool|stack|know|competenc|expertise|yetenek|beceri|yetkinlik|teknoloji/.test(k)) return 'skills'
  if (/educat|stud|school|academ|learn|egitim|okul|ogrenim/.test(k)) return 'education'
  if (/project|built|portfolio|proje/.test(k)) return 'projects'
  if (/about|profile|summary|intro|hakkimda|ozet|profil/.test(k)) return 'summary'
  if (/certif|licen|course|sertifika|kurs/.test(k)) return 'certifications'
  if (/languag|yabanci dil|diller/.test(k)) return 'languages'
  if (/award|honou?r|achiev|odul|basari/.test(k)) return 'awards'
  if (/interest|hobb|ilgi/.test(k)) return 'interests'
  if (/referen|referans/.test(k)) return 'references'
  return 'other'
}
