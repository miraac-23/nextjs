// 40 CV şablonu. Adlar sırasıyla Elazığ, Malatya ve Kastamonu ilçelerinden gelir;
// kimlikler (CSS seçicisi ve localStorage için) bu adların ASCII karşılığıdır. Her şablon; bir DOM iskeleti (shell/head/body) + CSS varyantı
// (`.cv-doc[data-tpl="..."]`, bkz. app/cv-olustur/cv.css) + tipografi/renk ön ayarından oluşur.
// Tüm görseller CSS ile üretilir — dış görsel, ücretli font ya da ikon paketi yoktur.
//
// design ailesinin özgün 40 şablonu (git HEAD'deki katalog, birebir). Tipler lib/cv/templates.ts'tedir.

import type { DesignTemplate } from './templates'

export const LEGACY_TEMPLATES: DesignTemplate[] = [
  {
    family: 'design', id: 'agin', name: 'Ağın', region: 'elazig', shell: 'aside-left', head: 'none', body: 'flow', category: 'corporate',
    accent: '#1d4ed8', ink: '#132038', paper: '#ffffff', font: 'sans', skill: 'bar', photo: 'square',
    fontScale: 1, lineHeight: 1.45, margin: 0,
    noteTr: 'Koyu yan sütun, kurumsal denge', noteEn: 'Dark sidebar, corporate balance',
  },
  {
    family: 'design', id: 'alacakaya', name: 'Alacakaya', region: 'elazig', shell: 'plain', head: 'band', body: 'duo', category: 'modern',
    accent: '#0891b2', ink: '#0e2a35', paper: '#ffffff', font: 'sans', skill: 'chips', photo: 'circle',
    fontScale: 1, lineHeight: 1.45, margin: 13,
    noteTr: 'Degrade bant başlık, iki sütun gövde', noteEn: 'Gradient band header, two-column body',
  },
  {
    family: 'design', id: 'aricak', name: 'Arıcak', region: 'elazig', shell: 'plain', head: 'stack', body: 'flow', category: 'minimal',
    accent: '#111827', ink: '#111827', paper: '#ffffff', font: 'sans', skill: 'text', photo: 'none',
    fontScale: 0.98, lineHeight: 1.5, margin: 18,
    noteTr: 'İnce çizgiler, bol beyaz alan', noteEn: 'Hairline rules, generous white space',
  },
  {
    family: 'design', id: 'baskil', name: 'Baskil', region: 'elazig', shell: 'aside-left', head: 'none', body: 'flow', category: 'technical',
    accent: '#22d3ee', ink: '#0b1120', paper: '#ffffff', font: 'sans', skill: 'dots', photo: 'square',
    fontScale: 0.98, lineHeight: 1.42, margin: 0,
    noteTr: 'Gece mavisi sütun, camgöbeği vurgu', noteEn: 'Midnight column, cyan accent',
  },
  {
    family: 'design', id: 'karakocan', name: 'Karakoçan', region: 'elazig', shell: 'aside-right', head: 'stack', body: 'flow', category: 'modern',
    accent: '#7c3aed', ink: '#2a1a4d', rail: '#f6f3ff', paper: '#ffffff', font: 'sans', skill: 'bar', photo: 'circle',
    fontScale: 1, lineHeight: 1.45, margin: 13,
    noteTr: 'Sağ yan sütun, mor ışıma', noteEn: 'Right rail, violet glow',
  },
  {
    family: 'design', id: 'keban', name: 'Keban', region: 'elazig', shell: 'plain', head: 'band', body: 'flow', category: 'corporate',
    accent: '#047857', ink: '#053b2c', paper: '#ffffff', font: 'sans', skill: 'chips', photo: 'rounded',
    fontScale: 1, lineHeight: 1.48, margin: 13,
    noteTr: 'Düz renk bant, sakin kurumsal ton', noteEn: 'Solid band, calm corporate tone',
  },
  {
    family: 'design', id: 'kovancilar', name: 'Kovancılar', region: 'elazig', shell: 'plain', head: 'split', body: 'flow', category: 'corporate',
    accent: '#1d4ed8', ink: '#12224a', paper: '#ffffff', font: 'sans', skill: 'bar', photo: 'square',
    fontScale: 1, lineHeight: 1.45, margin: 14,
    noteTr: 'Sol kenar şeridi, bölünmüş başlık', noteEn: 'Edge stripe, split header',
  },
  {
    family: 'design', id: 'maden', name: 'Maden', region: 'elazig', shell: 'plain', head: 'center', body: 'flow', category: 'academic',
    accent: '#b45309', ink: '#3f2d1b', paper: '#ffffff', font: 'serif', skill: 'text', photo: 'none',
    fontScale: 1.02, lineHeight: 1.5, margin: 17,
    noteTr: 'Serif klasik, ortalanmış künye', noteEn: 'Classic serif, centred masthead',
  },
  {
    family: 'design', id: 'palu', name: 'Palu', region: 'elazig', shell: 'plain', head: 'stack', body: 'duo', category: 'minimal',
    accent: '#334155', ink: '#1e293b', paper: '#ffffff', font: 'sans', skill: 'chips', photo: 'none',
    fontScale: 0.97, lineHeight: 1.45, margin: 15,
    noteTr: 'İsviçre ızgarası, eşit iki sütun', noteEn: 'Swiss grid, two even columns',
  },
  {
    family: 'design', id: 'sivrice', name: 'Sivrice', region: 'elazig', shell: 'plain', head: 'hero', body: 'flow', category: 'creative',
    accent: '#dc2626', ink: '#3b0d0d', paper: '#ffffff', font: 'display', skill: 'dots', photo: 'circle',
    fontScale: 1.02, lineHeight: 1.45, margin: 14,
    noteTr: 'İri isim bloğu, sıcak vurgu', noteEn: 'Oversized name block, warm accent',
  },
  {
    family: 'design', id: 'battalgazi', name: 'Battalgazi', region: 'malatya', shell: 'aside-left', head: 'none', body: 'flow', category: 'technical',
    accent: '#16a34a', ink: '#0d1a16', paper: '#ffffff', font: 'mono', skill: 'bar', photo: 'square',
    fontScale: 0.94, lineHeight: 1.45, margin: 0,
    noteTr: 'Monospace, geliştirici odaklı', noteEn: 'Monospace, developer-first',
  },
  {
    family: 'design', id: 'yesilyurt', name: 'Yeşilyurt', region: 'malatya', shell: 'plain', head: 'center', body: 'flow', category: 'academic',
    accent: '#7c2d12', ink: '#3c2415', paper: '#fffdf8', font: 'serif', skill: 'text', photo: 'none',
    fontScale: 1.01, lineHeight: 1.52, margin: 16,
    noteTr: 'İnce çerçeve, fildişi kâğıt', noteEn: 'Thin frame, ivory stock',
  },
  {
    family: 'design', id: 'akcadag', name: 'Akçadağ', region: 'malatya', shell: 'plain', head: 'band', body: 'flow', category: 'modern',
    accent: '#0284c7', ink: '#0b2c42', paper: '#ffffff', font: 'sans', skill: 'dots', photo: 'circle',
    fontScale: 1, lineHeight: 1.45, margin: 13,
    noteTr: 'Zaman tüneli deneyim akışı', noteEn: 'Timeline experience flow',
  },
  {
    family: 'design', id: 'arapgir', name: 'Arapgir', region: 'malatya', shell: 'plain', head: 'stack', body: 'flow', category: 'minimal',
    accent: '#374151', ink: '#111827', paper: '#ffffff', font: 'sans', skill: 'text', photo: 'none',
    fontScale: 0.94, lineHeight: 1.38, margin: 13,
    noteTr: 'Yoğun ve ATS dostu — tek sütun', noteEn: 'Dense, ATS-friendly single column',
  },
  {
    family: 'design', id: 'arguvan', name: 'Arguvan', region: 'malatya', shell: 'plain', head: 'hero', body: 'duo', category: 'creative',
    accent: '#ea580c', ink: '#43200a', paper: '#ffffff', font: 'sans', skill: 'ring', photo: 'circle',
    fontScale: 1, lineHeight: 1.45, margin: 14,
    noteTr: 'Ortalanmış portre, halka göstergeler', noteEn: 'Centred portrait, ring meters',
  },
  {
    family: 'design', id: 'darende', name: 'Darende', region: 'malatya', shell: 'plain', head: 'center', body: 'flow', category: 'academic',
    accent: '#1e40af', ink: '#1b2a4a', paper: '#ffffff', font: 'serif', skill: 'text', photo: 'none',
    fontScale: 0.99, lineHeight: 1.5, margin: 18,
    noteTr: 'Akademik düzen, yayın ağırlıklı', noteEn: 'Academic layout, publication-led',
  },
  {
    family: 'design', id: 'dogansehir', name: 'Doğanşehir', region: 'malatya', shell: 'aside-right', head: 'band', body: 'flow', category: 'creative',
    accent: '#db2777', ink: '#3d0f2b', rail: '#fdf2f8', paper: '#ffffff', font: 'sans', skill: 'ring', photo: 'circle',
    fontScale: 0.99, lineHeight: 1.42, margin: 0,
    noteTr: 'İnfografik göstergeler, canlı vurgu', noteEn: 'Infographic meters, vivid accent',
  },
  {
    family: 'design', id: 'doganyol', name: 'Doğanyol', region: 'malatya', shell: 'plain', head: 'band', body: 'duo', category: 'corporate',
    accent: '#0f766e', ink: '#08302c', paper: '#ffffff', font: 'sans', skill: 'bar', photo: 'rounded',
    fontScale: 1, lineHeight: 1.45, margin: 13,
    noteTr: 'Geniş bant, sağda portre', noteEn: 'Wide band, portrait on the right',
  },
  {
    family: 'design', id: 'hekimhan', name: 'Hekimhan', region: 'malatya', shell: 'plain', head: 'stack', body: 'flow', category: 'minimal',
    accent: '#92400e', ink: '#43301f', paper: '#faf7f1', font: 'serif', skill: 'text', photo: 'none',
    fontScale: 1.01, lineHeight: 1.52, margin: 17,
    noteTr: 'Keten dokulu zemin, yumuşak serif', noteEn: 'Linen stock, soft serif',
  },
  {
    family: 'design', id: 'kale', name: 'Kale', region: 'malatya', shell: 'plain', head: 'split', body: 'flow', category: 'creative',
    accent: '#4f46e5', ink: '#1c1b4b', paper: '#ffffff', font: 'display', skill: 'chips', photo: 'square',
    fontScale: 1, lineHeight: 1.44, margin: 14,
    noteTr: 'Geometrik köşe bloğu, iddialı tipografi', noteEn: 'Geometric corner block, bold type',
  },

  /* ---------------------------- Malatya (devam) ---------------------------- */
  {
    family: 'design', id: 'kuluncak', name: 'Kuluncak', region: 'malatya', shell: 'plain', head: 'stack', body: 'flow', category: 'minimal',
    accent: '#0f766e', ink: '#12312c', paper: '#ffffff', font: 'serif', skill: 'text', photo: 'none',
    fontScale: 1, lineHeight: 1.5, margin: 16,
    noteTr: 'Başlıklar sol kenar boşluğunda', noteEn: 'Headings live in the left margin',
  },
  {
    family: 'design', id: 'puturge', name: 'Pütürge', region: 'malatya', shell: 'plain', head: 'band', body: 'flow', category: 'modern',
    accent: '#b91c1c', ink: '#3f1212', paper: '#ffffff', font: 'sans', skill: 'chips', photo: 'circle',
    fontScale: 1, lineHeight: 1.45, margin: 13,
    noteTr: 'Numaralı bölümler, keskin bant', noteEn: 'Numbered sections, hard-edged band',
  },
  {
    family: 'design', id: 'yazihan', name: 'Yazıhan', region: 'malatya', shell: 'aside-left', head: 'stack', body: 'flow', category: 'corporate',
    accent: '#0369a1', ink: '#0b2942', paper: '#ffffff', font: 'sans', skill: 'bar', photo: 'rounded',
    fontScale: 1, lineHeight: 1.45, margin: 0,
    noteTr: 'Başlık üstte, künye yan sütunda', noteEn: 'Header on top, details in the rail',
  },

  /* ------------------------------- Kastamonu ------------------------------- */
  {
    family: 'design', id: 'abana', name: 'Abana', region: 'kastamonu', shell: 'plain', head: 'center', body: 'duo', category: 'academic',
    accent: '#7e22ce', ink: '#3b1a63', paper: '#ffffff', font: 'serif', skill: 'text', photo: 'none',
    fontScale: 1.01, lineHeight: 1.5, margin: 16,
    noteTr: 'Dergi düzeni, gömme baş harf', noteEn: 'Editorial layout, drop cap',
  },
  {
    family: 'design', id: 'agli', name: 'Ağlı', region: 'kastamonu', shell: 'plain', head: 'hero', body: 'flow', category: 'creative',
    accent: '#22d3ee', ink: '#0b1220', paper: '#111825', font: 'sans', skill: 'dots', photo: 'circle',
    fontScale: 1, lineHeight: 1.46, margin: 14,
    noteTr: 'Koyu kâğıt, gece teması', noteEn: 'Dark stock, night theme',
  },
  {
    family: 'design', id: 'arac', name: 'Araç', region: 'kastamonu', shell: 'plain', head: 'stack', body: 'flow', category: 'corporate',
    accent: '#4d7c0f', ink: '#22330d', paper: '#ffffff', font: 'sans', skill: 'chips', photo: 'square',
    fontScale: 0.99, lineHeight: 1.45, margin: 13,
    noteTr: 'Çerçeveli bölüm kutuları', noteEn: 'Framed section boxes',
  },
  {
    family: 'design', id: 'azdavay', name: 'Azdavay', region: 'kastamonu', shell: 'aside-right', head: 'none', body: 'flow', category: 'modern',
    accent: '#fb923c', ink: '#3d1a08', paper: '#ffffff', font: 'sans', skill: 'bar', photo: 'circle',
    fontScale: 0.99, lineHeight: 1.44, margin: 0,
    noteTr: 'Sağda koyu künye sütunu', noteEn: 'Dark detail column on the right',
  },
  {
    family: 'design', id: 'bozkurt', name: 'Bozkurt', region: 'kastamonu', shell: 'plain', head: 'split', body: 'duo', category: 'minimal',
    accent: '#1e293b', ink: '#0f172a', paper: '#ffffff', font: 'display', skill: 'text', photo: 'none',
    fontScale: 0.97, lineHeight: 1.45, margin: 15,
    noteTr: 'Ağır tipografi, iki sütun', noteEn: 'Heavy type, two columns',
  },
  {
    family: 'design', id: 'cide', name: 'Cide', region: 'kastamonu', shell: 'plain', head: 'band', body: 'flow', category: 'modern',
    accent: '#0891b2', ink: '#083344', paper: '#ffffff', font: 'sans', skill: 'dots', photo: 'rounded',
    fontScale: 1, lineHeight: 1.46, margin: 13,
    noteTr: 'Sekme biçimli bölüm başlıkları', noteEn: 'Tab-shaped section headings',
  },
  {
    family: 'design', id: 'catalzeytin', name: 'Çatalzeytin', region: 'kastamonu', shell: 'aside-left', head: 'center', body: 'flow', category: 'academic',
    accent: '#9a3412', ink: '#4a2410', rail: '#f8f2ea', paper: '#ffffff', font: 'serif', skill: 'text', photo: 'none',
    fontScale: 1, lineHeight: 1.5, margin: 0,
    noteTr: 'Açık künye sütunu, ortalanmış başlık', noteEn: 'Light rail, centred masthead',
  },
  {
    family: 'design', id: 'daday', name: 'Daday', region: 'kastamonu', shell: 'plain', head: 'stack', body: 'flow', category: 'technical',
    accent: '#16a34a', ink: '#0e2a19', paper: '#ffffff', font: 'mono', skill: 'bar', photo: 'none',
    fontScale: 0.95, lineHeight: 1.45, margin: 14,
    noteTr: 'Tarihler sol sütunda hizalı', noteEn: 'Dates aligned in a left column',
  },
  {
    family: 'design', id: 'devrekani', name: 'Devrekani', region: 'kastamonu', shell: 'plain', head: 'center', body: 'flow', category: 'academic',
    accent: '#111827', ink: '#111827', paper: '#ffffff', font: 'serif', skill: 'text', photo: 'none',
    fontScale: 1, lineHeight: 1.5, margin: 17,
    noteTr: 'Gazete kuralları, ince çizgiler', noteEn: 'Newspaper rules, hairlines',
  },
  {
    family: 'design', id: 'doganyurt', name: 'Doğanyurt', region: 'kastamonu', shell: 'aside-right', head: 'hero', body: 'flow', category: 'creative',
    accent: '#e11d48', ink: '#2b0d1f', paper: '#ffffff', font: 'display', skill: 'ring', photo: 'circle',
    fontScale: 1, lineHeight: 1.44, margin: 0,
    noteTr: 'Dev baş harf, koyu sağ ray', noteEn: 'Oversized monogram, dark right rail',
  },
  {
    family: 'design', id: 'hanonu', name: 'Hanönü', region: 'kastamonu', shell: 'plain', head: 'stack', body: 'duo', category: 'modern',
    accent: '#0d9488', ink: '#0b3b36', paper: '#fbfaf7', font: 'sans', skill: 'chips', photo: 'rounded',
    fontScale: 1, lineHeight: 1.46, margin: 13,
    noteTr: 'Yumuşak kartlar, sıcak kâğıt', noteEn: 'Soft cards, warm stock',
  },
  {
    family: 'design', id: 'ihsangazi', name: 'İhsangazi', region: 'kastamonu', shell: 'plain', head: 'band', body: 'duo', category: 'technical',
    accent: '#2563eb', ink: '#0f1e3d', paper: '#ffffff', font: 'mono', skill: 'bar', photo: 'square',
    fontScale: 0.95, lineHeight: 1.44, margin: 13,
    noteTr: 'Teknik çizim ızgarası', noteEn: 'Blueprint grid',
  },
  {
    family: 'design', id: 'inebolu', name: 'İnebolu', region: 'kastamonu', shell: 'plain', head: 'stack', body: 'duo', category: 'minimal',
    accent: '#374151', ink: '#111827', paper: '#ffffff', font: 'sans', skill: 'text', photo: 'none',
    fontScale: 0.93, lineHeight: 1.36, margin: 12,
    noteTr: 'Sıkı iki sütun, tek sayfa hedefi', noteEn: 'Tight two columns, aimed at one page',
  },
  {
    family: 'design', id: 'kure', name: 'Küre', region: 'kastamonu', shell: 'aside-left', head: 'none', body: 'flow', category: 'creative',
    accent: '#a78bfa', ink: '#241a4d', paper: '#ffffff', font: 'sans', skill: 'ring', photo: 'circle',
    fontScale: 0.99, lineHeight: 1.44, margin: 0,
    noteTr: 'Degrade ray, halka göstergeler', noteEn: 'Gradient rail, ring meters',
  },
  {
    family: 'design', id: 'pinarbasi', name: 'Pınarbaşı', region: 'kastamonu', shell: 'plain', head: 'split', body: 'flow', category: 'corporate',
    accent: '#be123c', ink: '#4c0519', paper: '#ffffff', font: 'sans', skill: 'bar', photo: 'square',
    fontScale: 1, lineHeight: 1.45, margin: 14,
    noteTr: 'Her kayıtta sol vurgu şeridi', noteEn: 'An accent stripe on every entry',
  },
  {
    family: 'design', id: 'taskopru', name: 'Taşköprü', region: 'kastamonu', shell: 'plain', head: 'center', body: 'flow', category: 'corporate',
    accent: '#0f172a', ink: '#0f172a', paper: '#ffffff', font: 'display', skill: 'dots', photo: 'circle',
    fontScale: 1, lineHeight: 1.46, margin: 15,
    noteTr: 'Madalyon başlık, ince çerçeve', noteEn: 'Medallion header, thin frame',
  },
  {
    family: 'design', id: 'tosya', name: 'Tosya', region: 'kastamonu', shell: 'plain', head: 'hero', body: 'flow', category: 'creative',
    accent: '#f59e0b', ink: '#1c1917', paper: '#1c1917', font: 'serif', skill: 'text', photo: 'none',
    fontScale: 1.01, lineHeight: 1.5, margin: 15,
    noteTr: 'Koyu kâğıt, altın vurgu', noteEn: 'Dark stock, gold accent',
  },
]
