// design ailesinin Nevşehir şablonları — adlar Nevşehir'in 8 ilçesinden gelir (Merkez dahil).
// Her şablon; shell/head/body iskeleti + `.cv-doc.cv-design[data-tpl]` CSS varyantı
// (bkz. app/cv-olustur/templates-nevsehir.css) + tipografi/renk ön ayarından oluşur.
// Görsel dil Kapadokya'dan ilham alır (sıcak hava balonları, peribacaları, Avanos çömleği,
// Derinkuyu yeraltı katları, Açıksaray kaya oyma kemerleri, Hacıbektaş rozeti, Kozaklı
// termal suları, Acıgöl obsidyeni) ama tamamı CSS ile çizilir: dış görsel ya da font yoktur.
// Tipler lib/cv/templates.ts'tedir.

import type { DesignTemplate } from './templates'

export const NEVSEHIR_TEMPLATES: DesignTemplate[] = [
  {
    family: 'design', id: 'nevsehir', name: 'Nevşehir', region: 'nevsehir', shell: 'plain', head: 'band', body: 'flow', category: 'modern',
    accent: '#ea580c', ink: '#1e3a5f', paper: '#ffffff', font: 'display', skill: 'bar', photo: 'circle',
    fontScale: 1, lineHeight: 1.45, margin: 14,
    noteTr: 'Şafak göğü bandı, süzülen sıcak hava balonları', noteEn: 'Dawn-sky band with drifting hot-air balloons',
  },
  {
    family: 'design', id: 'acigol', name: 'Acıgöl', region: 'nevsehir', shell: 'aside-left', head: 'none', body: 'flow', category: 'executive',
    accent: '#8b5cf6', ink: '#111118', paper: '#ffffff', font: 'sans', skill: 'dots', photo: 'circle',
    fontScale: 0.99, lineHeight: 1.45, margin: 0,
    noteTr: 'Obsidyen yontu yan sütun, krater halkalı portre', noteEn: 'Knapped obsidian rail, crater-ringed portrait',
  },
  {
    family: 'design', id: 'avanos', name: 'Avanos', region: 'nevsehir', shell: 'aside-right', head: 'none', body: 'flow', category: 'creative',
    accent: '#b4532a', ink: '#3b2417', rail: '#f6ebe0', paper: '#fffcf7', font: 'serif', skill: 'dots', photo: 'rounded',
    fontScale: 1, lineHeight: 1.48, margin: 14,
    noteTr: 'Çömlek çarkı halkaları, Kızılırmak dalgalı başlıklar', noteEn: 'Potter’s-wheel rings, Kızılırmak wave headings',
  },
  {
    family: 'design', id: 'derinkuyu', name: 'Derinkuyu', region: 'nevsehir', shell: 'plain', head: 'split', body: 'flow', category: 'technical',
    accent: '#d97706', ink: '#292524', paper: '#ffffff', font: 'mono', skill: 'bar', photo: 'square',
    fontScale: 0.95, lineHeight: 1.45, margin: 15,
    noteTr: 'Kat kat inen derinlik cetveli, sürgü taşı işaretleri', noteEn: 'Depth gauge by level, rolling-stone door markers',
  },
  {
    family: 'design', id: 'gulsehir', name: 'Gülşehir', region: 'nevsehir', shell: 'plain', head: 'center', body: 'duo', category: 'corporate',
    accent: '#0e7490', ink: '#12303a', paper: '#ffffff', font: 'sans', skill: 'chips', photo: 'circle',
    fontScale: 1, lineHeight: 1.45, margin: 14,
    noteTr: 'Açıksaray kaya kemerleri, kemer pencereli başlıklar', noteEn: 'Açıksaray rock-cut arches, arched-window headings',
  },
  {
    family: 'design', id: 'hacibektas', name: 'Hacıbektaş', region: 'nevsehir', shell: 'plain', head: 'center', body: 'flow', category: 'academic',
    accent: '#7f1d1d', ink: '#2f2418', paper: '#fdfaf2', font: 'serif', skill: 'text', photo: 'none',
    fontScale: 1.01, lineHeight: 1.5, margin: 20,
    noteTr: 'Çift çizgili sayfa çerçevesi, on iki dilimli rozet', noteEn: 'Double-ruled page frame, twelve-point rosette',
  },
  {
    family: 'design', id: 'kozakli', name: 'Kozaklı', region: 'nevsehir', shell: 'plain', head: 'stack', body: 'duo', category: 'minimal',
    accent: '#0d9488', ink: '#134e4a', paper: '#ffffff', font: 'sans', skill: 'ring', photo: 'rounded',
    fontScale: 0.99, lineHeight: 1.5, margin: 15,
    noteTr: 'Termal buhar kabarcıkları, yumuşak hap başlıklar', noteEn: 'Thermal steam bubbles, soft pill headings',
  },
  {
    family: 'design', id: 'urgup', name: 'Ürgüp', region: 'nevsehir', shell: 'plain', head: 'hero', body: 'duo', category: 'creative',
    accent: '#c2410c', ink: '#44281a', paper: '#fffaf4', font: 'display', skill: 'bar', photo: 'circle',
    fontScale: 1, lineHeight: 1.45, margin: 14,
    noteTr: 'Künye altında peribacası silueti, şapkalı başlık işaretleri', noteEn: 'Fairy-chimney skyline under the masthead, capped markers',
  },
]
