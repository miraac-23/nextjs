// CV belgesinin İÇİNE basılan metinler (arayüz metinleri değil — onlar ui-text.ts'te).
// Başlıklar ATS'lerin kategorize ettiği standart adlardır; yaratıcı başlık kullanılmaz.

import type { SectionKey } from './types'

export type DocLang = 'tr' | 'en'

export const DOC_TEXT = {
  tr: {
    headings: {
      summary: 'Profesyonel Özet',
      experience: 'İş Deneyimi',
      education: 'Eğitim',
      skills: 'Teknik Yetkinlikler',
      languages: 'Yabancı Dil',
      projects: 'Projeler',
      certificates: 'Sertifikalar',
      awards: 'Ödüller',
      interests: 'İlgi Alanları',
      references: 'Referanslar',
    } as Record<SectionKey, string>,
    present: 'Günümüz',
    months: ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'],
    personal: {
      birthDate: 'Doğum Tarihi',
      nationality: 'Uyruk',
      drivingLicense: 'Ehliyet',
      military: 'Askerlik',
    },
    technologies: 'Teknolojiler',
    grade: 'Not Ortalaması',
    otherSkills: 'Diğer',
    placeholderName: 'Ad Soyad',
    placeholderTitle: 'Profesyonel Unvan',
  },
  en: {
    headings: {
      summary: 'Professional Summary',
      experience: 'Work Experience',
      education: 'Education',
      skills: 'Technical Skills',
      languages: 'Languages',
      projects: 'Projects',
      certificates: 'Certifications',
      awards: 'Awards',
      interests: 'Interests',
      references: 'References',
    } as Record<SectionKey, string>,
    present: 'Present',
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    personal: {
      birthDate: 'Date of Birth',
      nationality: 'Nationality',
      drivingLicense: 'Driving License',
      military: 'Military Service',
    },
    technologies: 'Technologies',
    grade: 'GPA',
    otherSkills: 'Other',
    placeholderName: 'Full Name',
    placeholderTitle: 'Professional Title',
  },
}

export type DocText = (typeof DOC_TEXT)['tr']

export function docText(lang: DocLang): DocText {
  return lang === 'en' ? DOC_TEXT.en : DOC_TEXT.tr
}
