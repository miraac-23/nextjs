// design ailesinin yeni 32 şablonu — adlar Bayburt (3), Erzurum (20) ve Artvin (9) ilçelerinden gelir.
// Her şablon; shell/head/body iskeleti + `.cv-doc.cv-design[data-tpl]` CSS varyantı
// (bkz. app/cv-olustur/templates-dogu.css) + tipografi/renk ön ayarından oluşur.
// Görsel dil yöreden ilham alır (kale burçları, kayak pisti, çay terasları, Karagöl…) ama
// tamamı CSS ile çizilir: dış görsel ya da font yoktur, yazdırmada da aynı basılır.
// Tipler lib/cv/templates.ts'tedir.

import type { DesignTemplate } from './templates'

export const DOGU_TEMPLATES: DesignTemplate[] = [
  /* -------------------------------- Bayburt -------------------------------- */
  {
    family: 'design', id: 'bayburt', name: 'Bayburt', region: 'bayburt', shell: 'plain', head: 'band', body: 'flow', category: 'executive',
    accent: '#a16207', ink: '#2e2a26', paper: '#fdfbf7', font: 'serif', skill: 'text', photo: 'square',
    fontScale: 1, lineHeight: 1.5, margin: 15,
    noteTr: 'Kale burcu kesimli bant ve başlık çizgileri', noteEn: 'Crenellated castle band and section rules',
  },
  {
    family: 'design', id: 'aydintepe', name: 'Aydıntepe', region: 'bayburt', shell: 'aside-left', head: 'none', body: 'flow', category: 'creative',
    accent: '#c2410c', ink: '#3a2618', paper: '#ffffff', font: 'display', skill: 'bar', photo: 'rounded',
    fontScale: 0.99, lineHeight: 1.44, margin: 0,
    noteTr: 'Toprak katmanlı yan sütun, basamaklı başlıklar', noteEn: 'Earth-strata rail, stepped headings',
  },
  {
    family: 'design', id: 'demirozu', name: 'Demirözü', region: 'bayburt', shell: 'aside-right', head: 'none', body: 'flow', category: 'technical',
    accent: '#ea580c', ink: '#23272e', paper: '#ffffff', font: 'mono', skill: 'dots', photo: 'square',
    fontScale: 0.94, lineHeight: 1.45, margin: 0,
    noteTr: 'Çelik ray, perçinli bölüm plakaları', noteEn: 'Steel rail, riveted section plates',
  },

  /* -------------------------------- Erzurum -------------------------------- */
  {
    family: 'design', id: 'askale', name: 'Aşkale', region: 'erzurum', shell: 'plain', head: 'stack', body: 'flow', category: 'academic',
    accent: '#b91c1c', ink: '#1e3a5f', paper: '#fffef9', font: 'serif', skill: 'text', photo: 'none',
    fontScale: 1, lineHeight: 1.5, margin: 15,
    noteTr: 'Defter sayfası: kırmızı kenar çizgisi', noteEn: 'Notebook page with a red margin rule',
  },
  {
    family: 'design', id: 'aziziye', name: 'Aziziye', region: 'erzurum', shell: 'plain', head: 'stack', body: 'duo', category: 'corporate',
    accent: '#9f1239', ink: '#3b0a1e', paper: '#ffffff', font: 'sans', skill: 'bar', photo: 'square',
    fontScale: 1, lineHeight: 1.45, margin: 14,
    noteTr: 'Kenara taşan kurdele başlıklar', noteEn: 'Ribbon headings bleeding off the edge',
  },
  {
    family: 'design', id: 'cat', name: 'Çat', region: 'erzurum', shell: 'plain', head: 'stack', body: 'flow', category: 'modern',
    accent: '#4f46e5', ink: '#1e1b4b', paper: '#f7f7fb', font: 'display', skill: 'chips', photo: 'circle',
    fontScale: 0.98, lineHeight: 1.44, margin: 12,
    noteTr: 'Bento ızgarası: kart kart bölümler', noteEn: 'Bento grid of section cards',
  },
  {
    family: 'design', id: 'hinis', name: 'Hınıs', region: 'erzurum', shell: 'plain', head: 'center', body: 'flow', category: 'creative',
    accent: '#b42318', ink: '#3d1512', paper: '#fffaf3', font: 'serif', skill: 'dots', photo: 'circle',
    fontScale: 1, lineHeight: 1.48, margin: 15,
    noteTr: 'Kilim zikzak şeritli künye', noteEn: 'Kilim zigzag borders around the masthead',
  },
  {
    family: 'design', id: 'horasan', name: 'Horasan', region: 'erzurum', shell: 'plain', head: 'hero', body: 'duo', category: 'modern',
    accent: '#0e7490', ink: '#123040', paper: '#ffffff', font: 'sans', skill: 'ring', photo: 'circle',
    fontScale: 1, lineHeight: 1.45, margin: 14,
    noteTr: 'Köprü kemeri künye, kemer etiketler', noteEn: 'Bridge-arch masthead, arched labels',
  },
  {
    family: 'design', id: 'ispir', name: 'İspir', region: 'erzurum', shell: 'plain', head: 'stack', body: 'flow', category: 'modern',
    accent: '#0f766e', ink: '#12302d', paper: '#ffffff', font: 'sans', skill: 'bar', photo: 'circle',
    fontScale: 1, lineHeight: 1.46, margin: 14,
    noteTr: 'Sayfa tepesinde dağ silueti', noteEn: 'Mountain silhouette across the top',
  },
  {
    family: 'design', id: 'karacoban', name: 'Karaçoban', region: 'erzurum', shell: 'plain', head: 'split', body: 'flow', category: 'corporate',
    accent: '#a16207', ink: '#3b2f14', paper: '#ffffff', font: 'sans', skill: 'bar', photo: 'rounded',
    fontScale: 0.99, lineHeight: 1.45, margin: 13,
    noteTr: 'Defter-i kebir: çizgili kayıt satırları', noteEn: 'Ledger layout with banded entry rows',
  },
  {
    family: 'design', id: 'karayazi', name: 'Karayazı', region: 'erzurum', shell: 'plain', head: 'center', body: 'flow', category: 'minimal',
    accent: '#1f2937', ink: '#1f2937', paper: '#fbf8f1', font: 'mono', skill: 'text', photo: 'none',
    fontScale: 0.95, lineHeight: 1.5, margin: 18,
    noteTr: 'Daktilo sayfası, çift alt çizgi', noteEn: 'Typewritten page, double underlines',
  },
  {
    family: 'design', id: 'koprukoy', name: 'Köprüköy', region: 'erzurum', shell: 'plain', head: 'stack', body: 'flow', category: 'modern',
    accent: '#2563eb', ink: '#0f1f47', paper: '#ffffff', font: 'sans', skill: 'dots', photo: 'circle',
    fontScale: 1, lineHeight: 1.45, margin: 14,
    noteTr: 'Numaralı adımlar ortak omurgada', noteEn: 'Numbered steps along one spine',
  },
  {
    family: 'design', id: 'narman', name: 'Narman', region: 'erzurum', shell: 'aside-right', head: 'none', body: 'flow', category: 'creative',
    accent: '#c2410c', ink: '#5a2314', paper: '#fffaf6', font: 'display', skill: 'ring', photo: 'circle',
    fontScale: 0.99, lineHeight: 1.44, margin: 0,
    noteTr: 'Kızıl toprak ray, peribacası tepeler', noteEn: 'Red-earth rail with fairy-chimney peaks',
  },
  {
    family: 'design', id: 'oltu', name: 'Oltu', region: 'erzurum', shell: 'plain', head: 'split', body: 'flow', category: 'executive',
    accent: '#cbd5e1', ink: '#0a0a0b', paper: '#111113', font: 'display', skill: 'dots', photo: 'square',
    fontScale: 1, lineHeight: 1.47, margin: 15,
    noteTr: 'Oltu taşı siyahı, gümüş faset işaretler', noteEn: 'Jet-stone black with silver facets',
  },
  {
    family: 'design', id: 'olur', name: 'Olur', region: 'erzurum', shell: 'plain', head: 'stack', body: 'duo', category: 'creative',
    accent: '#d97706', ink: '#292524', paper: '#fafaf9', font: 'sans', skill: 'chips', photo: 'square',
    fontScale: 1, lineHeight: 1.45, margin: 14,
    noteTr: 'Polaroid portre, fosforlu başlıklar', noteEn: 'Polaroid portrait, highlighter headings',
  },
  {
    family: 'design', id: 'palandoken', name: 'Palandöken', region: 'erzurum', shell: 'plain', head: 'band', body: 'duo', category: 'modern',
    accent: '#0284c7', ink: '#0c2340', paper: '#ffffff', font: 'display', skill: 'bar', photo: 'circle',
    fontScale: 1, lineHeight: 1.45, margin: 13,
    noteTr: 'Kayak pisti eğimli bant, eğik etiketler', noteEn: 'Ski-slope diagonal band, slanted tags',
  },
  {
    family: 'design', id: 'pasinler', name: 'Pasinler', region: 'erzurum', shell: 'plain', head: 'stack', body: 'flow', category: 'creative',
    accent: '#facc15', ink: '#111111', paper: '#ffffff', font: 'display', skill: 'chips', photo: 'square',
    fontScale: 0.98, lineHeight: 1.44, margin: 14,
    noteTr: 'Kalın çerçeveli, sert gölgeli bloklar', noteEn: 'Heavy outlines with hard offset shadows',
  },
  {
    family: 'design', id: 'pazaryolu', name: 'Pazaryolu', region: 'erzurum', shell: 'plain', head: 'split', body: 'flow', category: 'minimal',
    accent: '#0f766e', ink: '#1c2b2a', paper: '#ffffff', font: 'sans', skill: 'text', photo: 'none',
    fontScale: 0.98, lineHeight: 1.45, margin: 14,
    noteTr: 'Bilet koçanı başlık, delikli ayraçlar', noteEn: 'Ticket-stub header, perforated dividers',
  },
  {
    family: 'design', id: 'senkaya', name: 'Şenkaya', region: 'erzurum', shell: 'plain', head: 'stack', body: 'duo', category: 'executive',
    accent: '#7c5a2a', ink: '#2b2118', paper: '#fdfcf9', font: 'serif', skill: 'dots', photo: 'rounded',
    fontScale: 1, lineHeight: 1.48, margin: 17,
    noteTr: 'Köşe süslü çerçeve, sütun çizgisi', noteEn: 'Corner-bracket frame, column rule',
  },
  {
    family: 'design', id: 'tekman', name: 'Tekman', region: 'erzurum', shell: 'aside-left', head: 'stack', body: 'flow', category: 'technical',
    accent: '#4338ca', ink: '#1e1b4b', rail: '#eef2fb', paper: '#ffffff', font: 'sans', skill: 'bar', photo: 'square',
    fontScale: 0.98, lineHeight: 1.44, margin: 0,
    noteTr: 'Cetvel çentikli başlıklar, buz mavisi ray', noteEn: 'Ruler-tick headings, ice-blue rail',
  },
  {
    family: 'design', id: 'tortum', name: 'Tortum', region: 'erzurum', shell: 'plain', head: 'band', body: 'flow', category: 'corporate',
    accent: '#0369a1', ink: '#0b2a4a', paper: '#ffffff', font: 'sans', skill: 'dots', photo: 'circle',
    fontScale: 1, lineHeight: 1.46, margin: 13,
    noteTr: 'Göl mavisi bant, halka halka dalgalar', noteEn: 'Lake-blue band with ripple rings',
  },
  {
    family: 'design', id: 'uzundere', name: 'Uzundere', region: 'erzurum', shell: 'aside-left', head: 'none', body: 'flow', category: 'modern',
    accent: '#0891b2', ink: '#0c3a44', rail: '#ecf7f8', paper: '#ffffff', font: 'sans', skill: 'bar', photo: 'circle',
    fontScale: 0.99, lineHeight: 1.46, margin: 0,
    noteTr: 'Şelale çizgili açık ray, dikey ritim', noteEn: 'Waterfall-lined light rail, vertical rhythm',
  },
  {
    family: 'design', id: 'yakutiye', name: 'Yakutiye', region: 'erzurum', shell: 'plain', head: 'center', body: 'duo', category: 'executive',
    accent: '#0f766e', ink: '#12343b', paper: '#ffffff', font: 'display', skill: 'chips', photo: 'rounded',
    fontScale: 0.99, lineHeight: 1.45, margin: 15,
    noteTr: 'Selçuklu çini şeridi, yıldız işaretler', noteEn: 'Seljuk tile strip, star markers',
  },

  /* --------------------------------- Artvin -------------------------------- */
  {
    family: 'design', id: 'artvin', name: 'Artvin', region: 'artvin', shell: 'plain', head: 'split', body: 'flow', category: 'corporate',
    accent: '#15803d', ink: '#0f2e1d', paper: '#ffffff', font: 'sans', skill: 'bar', photo: 'square',
    fontScale: 1, lineHeight: 1.45, margin: 14,
    noteTr: 'Çapraz bölünmüş iki tonlu başlık', noteEn: 'Diagonally split two-tone header',
  },
  {
    family: 'design', id: 'ardanuc', name: 'Ardanuç', region: 'artvin', shell: 'plain', head: 'center', body: 'flow', category: 'academic',
    accent: '#6b21a8', ink: '#2e1a47', paper: '#ffffff', font: 'serif', skill: 'text', photo: 'none',
    fontScale: 1, lineHeight: 1.5, margin: 17,
    noteTr: 'Roma rakamlı bölümler, künye kuralı', noteEn: 'Roman-numeral sections, journal rules',
  },
  {
    family: 'design', id: 'arhavi', name: 'Arhavi', region: 'artvin', shell: 'aside-right', head: 'none', body: 'flow', category: 'modern',
    accent: '#0d9488', ink: '#0b3140', paper: '#ffffff', font: 'sans', skill: 'dots', photo: 'circle',
    fontScale: 0.99, lineHeight: 1.45, margin: 0,
    noteTr: 'Karadeniz dalgası kenarlı sağ ray', noteEn: 'Right rail with a Black Sea wave edge',
  },
  {
    family: 'design', id: 'borcka', name: 'Borçka', region: 'artvin', shell: 'aside-left', head: 'none', body: 'flow', category: 'corporate',
    accent: '#059669', ink: '#06322a', paper: '#ffffff', font: 'sans', skill: 'bar', photo: 'rounded',
    fontScale: 0.99, lineHeight: 1.45, margin: 0,
    noteTr: 'Karagöl zümrüdü ray, yaprak işaretler', noteEn: 'Karagöl emerald rail, leaf markers',
  },
  {
    family: 'design', id: 'hopa', name: 'Hopa', region: 'artvin', shell: 'plain', head: 'stack', body: 'flow', category: 'modern',
    accent: '#4d7c0f', ink: '#1f3510', paper: '#ffffff', font: 'sans', skill: 'chips', photo: 'rounded',
    fontScale: 1, lineHeight: 1.46, margin: 14,
    noteTr: 'Çay teraslı şeritler, çizgili vurgular', noteEn: 'Tea-terrace stripes, striped accents',
  },
  {
    family: 'design', id: 'kemalpasa', name: 'Kemalpaşa', region: 'artvin', shell: 'plain', head: 'center', body: 'flow', category: 'corporate',
    accent: '#1e3a8a', ink: '#172554', paper: '#ffffff', font: 'display', skill: 'dots', photo: 'circle',
    fontScale: 0.99, lineHeight: 1.45, margin: 16,
    noteTr: 'Pasaport çerçevesi, damga etiketler', noteEn: 'Passport frame with stamped labels',
  },
  {
    family: 'design', id: 'murgul', name: 'Murgul', region: 'artvin', shell: 'plain', head: 'split', body: 'duo', category: 'technical',
    accent: '#b45309', ink: '#2a1a0e', paper: '#ffffff', font: 'mono', skill: 'bar', photo: 'square',
    fontScale: 0.95, lineHeight: 1.44, margin: 13,
    noteTr: 'Bakır tonlu eş yükselti eğrileri', noteEn: 'Copper-toned topographic contours',
  },
  {
    family: 'design', id: 'savsat', name: 'Şavşat', region: 'artvin', shell: 'plain', head: 'stack', body: 'flow', category: 'minimal',
    accent: '#3f7d3a', ink: '#1d3a1b', paper: '#ffffff', font: 'sans', skill: 'text', photo: 'circle',
    fontScale: 1, lineHeight: 1.5, margin: 16,
    noteTr: 'Yayla tepeleri, sade yeşil çizgi', noteEn: 'Rolling highland hills, quiet green lines',
  },
  {
    family: 'design', id: 'yusufeli', name: 'Yusufeli', region: 'artvin', shell: 'aside-right', head: 'stack', body: 'flow', category: 'creative',
    accent: '#0e7c86', ink: '#062c3a', paper: '#ffffff', font: 'display', skill: 'ring', photo: 'circle',
    fontScale: 0.99, lineHeight: 1.44, margin: 0,
    noteTr: 'Nehir degradeli ray, çağlayan çizgileri', noteEn: 'River-gradient rail with rapids streaks',
  },
]
