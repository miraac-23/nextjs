// ATS uyumlu CV şablonları — Ankara'nın 25 ilçesi. Kimlikler (localStorage için) ilçe
// adlarının ASCII karşılığıdır. Render: CvAtsDocument (lib/cv/model.ts).
//
// Her şablon AYNI ATS iskeletini kullanır: tek kolon, doğal okuma sırası, tablo /
// metin kutusu / görsel / ikon / yetenek göstergesi yok, standart başlıklar, seçilebilir metin.
// Şablonları birbirinden ayıran şey yalnızca ATS açısından güvenli tercihlerdir:
// font çifti, başlık biçimi, hizalama, tarih biçimi/konumu, kayıt sırası, madde
// işareti, yazı boyutları, satır aralığı, kenar boşluğu ve tek bir koyu vurgu rengi
// (beyaz zeminde ≥ 4.5:1 kontrast).
//
// Çankaya varsayılan ve önerilen şablondur: en klasik, en güvenli ön ayar.

import type { AtsTemplate } from './templates'

export const ANKARA_TEMPLATES: AtsTemplate[] = [
  /* ------------------------ önerilen (varsayılan) ------------------------ */
  {
    family: 'ats', id: 'cankaya', name: 'Çankaya', region: 'ankara', category: 'corporate',
    font: 'arial', headingFont: 'arial', accent: '#1b2a4a',
    headingStyle: 'caps-rule', headerAlign: 'left', contactSeparator: 'pipe',
    dateFormat: 'numeric', datePosition: 'right', entryOrder: 'title-first', bulletStyle: 'dot',
    bodySize: 10.5, headingSize: 14, nameSize: 22, lineHeight: 1.3, margin: 20, sectionGap: 5,
    noteTr: 'Önerilen · Arial, büyük harf çizgili başlıklar, sola yaslı, AA/YYYY tarihler',
    noteEn: 'Recommended · Arial, uppercase ruled headings, left aligned, MM/YYYY dates',
  },

  /* ------------------------------- kurumsal ------------------------------- */
  {
    family: 'ats', id: 'altindag', name: 'Altındağ', region: 'ankara', category: 'corporate',
    font: 'helvetica', headingFont: 'helvetica', accent: '#0f172a',
    headingStyle: 'caps-rule', headerAlign: 'center', contactSeparator: 'pipe',
    dateFormat: 'numeric', datePosition: 'right', entryOrder: 'title-first', bulletStyle: 'dot',
    bodySize: 10.5, headingSize: 13.5, nameSize: 22, lineHeight: 1.3, margin: 21, sectionGap: 5.5,
    noteTr: 'Helvetica, büyük harf çizgili başlıklar, ortalı künye', noteEn: 'Helvetica, uppercase ruled headings, centred masthead',
  },
  {
    family: 'ats', id: 'etimesgut', name: 'Etimesgut', region: 'ankara', category: 'corporate',
    font: 'helvetica', headingFont: 'arial', accent: '#1e40af',
    headingStyle: 'rule', headerAlign: 'left', contactSeparator: 'pipe',
    dateFormat: 'numeric', datePosition: 'right', entryOrder: 'company-first', bulletStyle: 'dot',
    bodySize: 10.5, headingSize: 13.5, nameSize: 22, lineHeight: 1.3, margin: 19.5, sectionGap: 5,
    noteTr: 'Arial çizgili başlık, Helvetica metin, önce şirket adı', noteEn: 'Arial ruled headings, Helvetica body, company name first',
  },
  {
    family: 'ats', id: 'sincan', name: 'Sincan', region: 'ankara', category: 'corporate',
    font: 'arial', headingFont: 'arial', accent: '#be123c',
    headingStyle: 'rule', headerAlign: 'left', contactSeparator: 'pipe',
    dateFormat: 'short', datePosition: 'right', entryOrder: 'title-first', bulletStyle: 'dot',
    bodySize: 10.5, headingSize: 14, nameSize: 22, lineHeight: 1.3, margin: 20, sectionGap: 5,
    noteTr: 'Arial, çizgili başlıklar, kısa ay adları', noteEn: 'Arial, ruled headings, short month names',
  },
  {
    family: 'ats', id: 'yenimahalle', name: 'Yenimahalle', region: 'ankara', category: 'corporate',
    font: 'calibri', headingFont: 'calibri', accent: '#065f46',
    headingStyle: 'caps-rule', headerAlign: 'left', contactSeparator: 'pipe',
    dateFormat: 'short', datePosition: 'right', entryOrder: 'company-first', bulletStyle: 'dot',
    bodySize: 11, headingSize: 13.5, nameSize: 22, lineHeight: 1.3, margin: 20, sectionGap: 5,
    noteTr: 'Calibri, büyük harf çizgili başlıklar, önce şirket adı', noteEn: 'Calibri, uppercase ruled headings, company name first',
  },

  /* -------------------------------- modern -------------------------------- */
  {
    family: 'ats', id: 'golbasi', name: 'Gölbaşı', region: 'ankara', category: 'modern',
    font: 'helvetica', headingFont: 'helvetica', accent: '#075985',
    headingStyle: 'rule', headerAlign: 'left', contactSeparator: 'bullet',
    dateFormat: 'short', datePosition: 'inline', entryOrder: 'title-first', bulletStyle: 'dot',
    bodySize: 10.5, headingSize: 14, nameSize: 22, lineHeight: 1.35, margin: 20, sectionGap: 5.5,
    noteTr: 'Helvetica, çizgili başlıklar, satır içi tarihler', noteEn: 'Helvetica, ruled headings, inline dates',
  },
  {
    family: 'ats', id: 'kecioren', name: 'Keçiören', region: 'ankara', category: 'modern',
    font: 'helvetica', headingFont: 'helvetica', accent: '#0e5f73',
    headingStyle: 'overline', headerAlign: 'left', contactSeparator: 'bullet',
    dateFormat: 'short', datePosition: 'right', entryOrder: 'title-first', bulletStyle: 'dot',
    bodySize: 10.5, headingSize: 14, nameSize: 22, lineHeight: 1.35, margin: 20, sectionGap: 5.5,
    noteTr: 'Helvetica, üst çizgili başlıklar, kısa ay adları', noteEn: 'Helvetica, overlined headings, short month names',
  },
  {
    family: 'ats', id: 'mamak', name: 'Mamak', region: 'ankara', category: 'modern',
    font: 'arial', headingFont: 'arial', accent: '#b91c1c',
    headingStyle: 'overline', headerAlign: 'left', contactSeparator: 'bullet',
    dateFormat: 'short', datePosition: 'right', entryOrder: 'company-first', bulletStyle: 'dot',
    bodySize: 10.5, headingSize: 14, nameSize: 22, lineHeight: 1.3, margin: 19, sectionGap: 5.5,
    noteTr: 'Arial, üst çizgili başlıklar, önce şirket adı', noteEn: 'Arial, overlined headings, company name first',
  },
  {
    family: 'ats', id: 'pursaklar', name: 'Pursaklar', region: 'ankara', category: 'modern',
    font: 'calibri', headingFont: 'helvetica', accent: '#5b21b6',
    headingStyle: 'underline', headerAlign: 'left', contactSeparator: 'bullet',
    dateFormat: 'short', datePosition: 'right', entryOrder: 'title-first', bulletStyle: 'dot',
    bodySize: 11, headingSize: 14, nameSize: 23, lineHeight: 1.35, margin: 20, sectionGap: 5.5,
    noteTr: 'Helvetica altı çizili başlık, Calibri metin, kısa ay adları', noteEn: 'Helvetica underlined headings, Calibri body, short month names',
  },

  /* -------------------------------- sade -------------------------------- */
  {
    family: 'ats', id: 'akyurt', name: 'Akyurt', region: 'ankara', category: 'minimal',
    font: 'arial', headingFont: 'arial', accent: '#111827',
    headingStyle: 'plain', headerAlign: 'left', contactSeparator: 'pipe',
    dateFormat: 'numeric', datePosition: 'inline', entryOrder: 'title-first', bulletStyle: 'dash',
    bodySize: 10.5, headingSize: 13, nameSize: 20, lineHeight: 1.4, margin: 24, sectionGap: 6.5,
    noteTr: 'Arial, yalın kalın başlıklar, satır içi tarihler', noteEn: 'Arial, plain bold headings, inline dates',
  },
  {
    family: 'ats', id: 'bala', name: 'Bala', region: 'ankara', category: 'minimal',
    font: 'helvetica', headingFont: 'helvetica', accent: '#334155',
    headingStyle: 'caps', headerAlign: 'left', contactSeparator: 'pipe',
    dateFormat: 'numeric', datePosition: 'right', entryOrder: 'title-first', bulletStyle: 'dash',
    bodySize: 10, headingSize: 13, nameSize: 20, lineHeight: 1.3, margin: 22, sectionGap: 6,
    noteTr: 'Helvetica, aralıklı büyük harf başlıklar, tire madde işareti', noteEn: 'Helvetica, spaced uppercase headings, dash bullets',
  },
  {
    family: 'ats', id: 'evren', name: 'Evren', region: 'ankara', category: 'minimal',
    font: 'calibri', headingFont: 'calibri', accent: '#285e61',
    headingStyle: 'plain', headerAlign: 'center', contactSeparator: 'pipe',
    dateFormat: 'numeric', datePosition: 'right', entryOrder: 'title-first', bulletStyle: 'dash',
    bodySize: 10.5, headingSize: 13, nameSize: 20, lineHeight: 1.35, margin: 22, sectionGap: 6,
    noteTr: 'Calibri, yalın kalın başlıklar, ortalı künye', noteEn: 'Calibri, plain bold headings, centred masthead',
  },
  {
    family: 'ats', id: 'kalecik', name: 'Kalecik', region: 'ankara', category: 'minimal',
    font: 'georgia', headingFont: 'georgia', accent: '#92400e',
    headingStyle: 'plain', headerAlign: 'left', contactSeparator: 'bullet',
    dateFormat: 'short', datePosition: 'right', entryOrder: 'title-first', bulletStyle: 'dash',
    bodySize: 11, headingSize: 13.5, nameSize: 20, lineHeight: 1.4, margin: 24, sectionGap: 6.5,
    noteTr: 'Georgia, yalın kalın başlıklar, kısa ay adları', noteEn: 'Georgia, plain bold headings, short month names',
  },

  /* ------------------------------- yönetici ------------------------------- */
  {
    family: 'ats', id: 'beypazari', name: 'Beypazarı', region: 'ankara', category: 'executive',
    font: 'helvetica', headingFont: 'georgia', accent: '#3730a3',
    headingStyle: 'smallcaps', headerAlign: 'left', contactSeparator: 'pipe',
    dateFormat: 'short', datePosition: 'right', entryOrder: 'title-first', bulletStyle: 'dot',
    bodySize: 11, headingSize: 15, nameSize: 24, lineHeight: 1.35, margin: 22, sectionGap: 6.5,
    noteTr: 'Georgia küçük büyük harf başlık, Helvetica metin, kısa ay adları', noteEn: 'Georgia small-caps headings, Helvetica body, short month names',
  },
  {
    family: 'ats', id: 'kizilcahamam', name: 'Kızılcahamam', region: 'ankara', category: 'executive',
    font: 'cambria', headingFont: 'cambria', accent: '#9f1239',
    headingStyle: 'caps-rule', headerAlign: 'center', contactSeparator: 'bullet',
    dateFormat: 'short', datePosition: 'right', entryOrder: 'title-first', bulletStyle: 'dot',
    bodySize: 11, headingSize: 14.5, nameSize: 24, lineHeight: 1.4, margin: 24, sectionGap: 7,
    noteTr: 'Cambria, büyük harf çizgili başlıklar, ortalı künye', noteEn: 'Cambria, uppercase ruled headings, centred masthead',
  },
  {
    family: 'ats', id: 'nallihan', name: 'Nallıhan', region: 'ankara', category: 'executive',
    font: 'times', headingFont: 'cambria', accent: '#134a6b',
    headingStyle: 'caps', headerAlign: 'center', contactSeparator: 'pipe',
    dateFormat: 'short', datePosition: 'right', entryOrder: 'company-first', bulletStyle: 'dot',
    bodySize: 11, headingSize: 15, nameSize: 24, lineHeight: 1.45, margin: 25, sectionGap: 7.5,
    noteTr: 'Cambria aralıklı büyük harf başlık, Times New Roman metin, ortalı künye', noteEn: 'Cambria spaced uppercase headings, Times New Roman body, centred masthead',
  },
  {
    family: 'ats', id: 'polatli', name: 'Polatlı', region: 'ankara', category: 'executive',
    font: 'georgia', headingFont: 'arial', accent: '#991b1b',
    headingStyle: 'caps-rule', headerAlign: 'center', contactSeparator: 'bullet',
    dateFormat: 'short', datePosition: 'right', entryOrder: 'title-first', bulletStyle: 'dot',
    bodySize: 11, headingSize: 14.5, nameSize: 24, lineHeight: 1.35, margin: 23, sectionGap: 6.5,
    noteTr: 'Arial büyük harf çizgili başlık, Georgia metin, ortalı künye', noteEn: 'Arial uppercase ruled headings, Georgia body, centred masthead',
  },

  /* -------------------------------- teknik -------------------------------- */
  {
    family: 'ats', id: 'cubuk', name: 'Çubuk', region: 'ankara', category: 'technical',
    font: 'arial', headingFont: 'arial', accent: '#166534',
    headingStyle: 'caps', headerAlign: 'left', contactSeparator: 'pipe',
    dateFormat: 'numeric', datePosition: 'right', entryOrder: 'company-first', bulletStyle: 'dash',
    bodySize: 10, headingSize: 13, nameSize: 21, lineHeight: 1.2, margin: 18, sectionGap: 4,
    noteTr: 'Arial, aralıklı büyük harf başlıklar, sıkı düzen', noteEn: 'Arial, spaced uppercase headings, compact layout',
  },
  {
    family: 'ats', id: 'elmadag', name: 'Elmadağ', region: 'ankara', category: 'technical',
    font: 'arial', headingFont: 'calibri', accent: '#2548a8',
    headingStyle: 'rule', headerAlign: 'left', contactSeparator: 'bullet',
    dateFormat: 'numeric', datePosition: 'right', entryOrder: 'title-first', bulletStyle: 'dash',
    bodySize: 10, headingSize: 13.5, nameSize: 21, lineHeight: 1.2, margin: 18, sectionGap: 4,
    noteTr: 'Calibri çizgili başlık, Arial metin, sıkı düzen', noteEn: 'Calibri ruled headings, Arial body, compact layout',
  },
  {
    family: 'ats', id: 'kahramankazan', name: 'Kahramankazan', region: 'ankara', category: 'technical',
    font: 'calibri', headingFont: 'calibri', accent: '#0c4a6e',
    headingStyle: 'rule', headerAlign: 'left', contactSeparator: 'pipe',
    dateFormat: 'numeric', datePosition: 'right', entryOrder: 'title-first', bulletStyle: 'dash',
    bodySize: 10.5, headingSize: 13.5, nameSize: 22, lineHeight: 1.25, margin: 18, sectionGap: 4,
    noteTr: 'Calibri, çizgili başlıklar, sıkı düzen', noteEn: 'Calibri, ruled headings, compact layout',
  },
  {
    family: 'ats', id: 'sereflikochisar', name: 'Şereflikoçhisar', region: 'ankara', category: 'technical',
    font: 'calibri', headingFont: 'calibri', accent: '#264653',
    headingStyle: 'overline', headerAlign: 'left', contactSeparator: 'bullet',
    dateFormat: 'numeric', datePosition: 'right', entryOrder: 'title-first', bulletStyle: 'dash',
    bodySize: 10.5, headingSize: 13.5, nameSize: 21, lineHeight: 1.25, margin: 19, sectionGap: 4.5,
    noteTr: 'Calibri, üst çizgili başlıklar, sıkı düzen', noteEn: 'Calibri, overlined headings, compact layout',
  },

  /* ------------------------------- akademik ------------------------------- */
  {
    family: 'ats', id: 'ayas', name: 'Ayaş', region: 'ankara', category: 'academic',
    font: 'times', headingFont: 'times', accent: '#7c2d12',
    headingStyle: 'rule', headerAlign: 'center', contactSeparator: 'pipe',
    dateFormat: 'short', datePosition: 'inline', entryOrder: 'title-first', bulletStyle: 'dot',
    bodySize: 11.5, headingSize: 14, nameSize: 22, lineHeight: 1.3, margin: 25.4, sectionGap: 6,
    noteTr: 'Times New Roman, çizgili başlıklar, ortalı künye', noteEn: 'Times New Roman, ruled headings, centred masthead',
  },
  {
    family: 'ats', id: 'camlidere', name: 'Çamlıdere', region: 'ankara', category: 'academic',
    font: 'cambria', headingFont: 'cambria', accent: '#1e3a5f',
    headingStyle: 'underline', headerAlign: 'left', contactSeparator: 'pipe',
    dateFormat: 'numeric', datePosition: 'right', entryOrder: 'title-first', bulletStyle: 'dot',
    bodySize: 11, headingSize: 14, nameSize: 21, lineHeight: 1.3, margin: 25, sectionGap: 6,
    noteTr: 'Cambria, altı çizili başlıklar, sayısal tarihler', noteEn: 'Cambria, underlined headings, numeric dates',
  },
  {
    family: 'ats', id: 'gudul', name: 'Güdül', region: 'ankara', category: 'academic',
    font: 'georgia', headingFont: 'georgia', accent: '#78350f',
    headingStyle: 'smallcaps', headerAlign: 'center', contactSeparator: 'bullet',
    dateFormat: 'short', datePosition: 'right', entryOrder: 'title-first', bulletStyle: 'dot',
    bodySize: 11, headingSize: 14, nameSize: 22, lineHeight: 1.35, margin: 24, sectionGap: 6,
    noteTr: 'Georgia, küçük büyük harf başlıklar, ortalı künye', noteEn: 'Georgia, small-caps headings, centred masthead',
  },
  {
    family: 'ats', id: 'haymana', name: 'Haymana', region: 'ankara', category: 'academic',
    font: 'times', headingFont: 'times', accent: '#111111',
    headingStyle: 'caps-rule', headerAlign: 'center', contactSeparator: 'pipe',
    dateFormat: 'numeric', datePosition: 'right', entryOrder: 'title-first', bulletStyle: 'dash',
    bodySize: 11.5, headingSize: 13.5, nameSize: 22, lineHeight: 1.25, margin: 25.4, sectionGap: 5.5,
    noteTr: 'Times New Roman, büyük harf çizgili başlıklar, ortalı künye', noteEn: 'Times New Roman, uppercase ruled headings, centred masthead',
  },
]
