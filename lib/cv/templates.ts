// 40 CV şablonu. Adlar sırasıyla Elazığ, Malatya ve Kastamonu ilçelerinden gelir;
// kimlikler (CSS seçicisi ve localStorage için) bu adların ASCII karşılığıdır. Her şablon; bir DOM iskeleti (shell/head/body) + CSS varyantı
// (`.cv-doc[data-tpl="..."]`, bkz. app/cv-olustur/cv.css) + tipografi/renk ön ayarından oluşur.
// Tüm görseller CSS ile üretilir — dış görsel, ücretli font ya da ikon paketi yoktur.

/** Sayfa iskeleti: yan sütun var mı, hangi tarafta? */
export type Shell = 'plain' | 'aside-left' | 'aside-right'
/** Üst blok biçimi. `none` → kimlik bilgileri yan sütuna taşınır. */
export type Head = 'stack' | 'center' | 'band' | 'split' | 'hero' | 'none'
/** Gövde akışı: tek sütun mu, iki sütunlu mu? */
export type Body = 'flow' | 'duo'
export type SkillStyle = 'bar' | 'dots' | 'chips' | 'text' | 'ring'
export type PhotoShape = 'circle' | 'square' | 'rounded' | 'none'
export type TplCategory = 'corporate' | 'modern' | 'minimal' | 'creative' | 'technical' | 'academic'

export type CvTemplate = {
  id: string
  name: string
  shell: Shell
  head: Head
  body: Body
  category: TplCategory
  /** Vurgu rengi — kullanıcı 3. adımda değiştirebilir. */
  accent: string
  /** Yan sütun / bant zemini. */
  ink: string
  /** Yan sütun zemini `ink`ten farklıysa (açık renkli raylı şablonlar). */
  rail?: string
  /** Kâğıt zemini (krem tonlu şablonlar için beyazdan farklıdır). */
  paper: string
  font: 'sans' | 'serif' | 'mono' | 'display'
  skill: SkillStyle
  photo: PhotoShape
  /** Ön ayarlar: yazı ölçeği, satır yüksekliği, sayfa boşluğu (mm). */
  fontScale: number
  lineHeight: number
  margin: number
  /** Galeri kartındaki tek satırlık ayırt edici not (TR / EN). */
  noteTr: string
  noteEn: string
}

export const TEMPLATES: CvTemplate[] = [
  {
    id: 'agin', name: 'Ağın', shell: 'aside-left', head: 'none', body: 'flow', category: 'corporate',
    accent: '#1d4ed8', ink: '#132038', paper: '#ffffff', font: 'sans', skill: 'bar', photo: 'square',
    fontScale: 1, lineHeight: 1.45, margin: 0,
    noteTr: 'Koyu yan sütun, kurumsal denge', noteEn: 'Dark sidebar, corporate balance',
  },
  {
    id: 'alacakaya', name: 'Alacakaya', shell: 'plain', head: 'band', body: 'duo', category: 'modern',
    accent: '#0891b2', ink: '#0e2a35', paper: '#ffffff', font: 'sans', skill: 'chips', photo: 'circle',
    fontScale: 1, lineHeight: 1.45, margin: 13,
    noteTr: 'Degrade bant başlık, iki sütun gövde', noteEn: 'Gradient band header, two-column body',
  },
  {
    id: 'aricak', name: 'Arıcak', shell: 'plain', head: 'stack', body: 'flow', category: 'minimal',
    accent: '#111827', ink: '#111827', paper: '#ffffff', font: 'sans', skill: 'text', photo: 'none',
    fontScale: 0.98, lineHeight: 1.5, margin: 18,
    noteTr: 'İnce çizgiler, bol beyaz alan', noteEn: 'Hairline rules, generous white space',
  },
  {
    id: 'baskil', name: 'Baskil', shell: 'aside-left', head: 'none', body: 'flow', category: 'technical',
    accent: '#22d3ee', ink: '#0b1120', paper: '#ffffff', font: 'sans', skill: 'dots', photo: 'square',
    fontScale: 0.98, lineHeight: 1.42, margin: 0,
    noteTr: 'Gece mavisi sütun, camgöbeği vurgu', noteEn: 'Midnight column, cyan accent',
  },
  {
    id: 'karakocan', name: 'Karakoçan', shell: 'aside-right', head: 'stack', body: 'flow', category: 'modern',
    accent: '#7c3aed', ink: '#2a1a4d', rail: '#f6f3ff', paper: '#ffffff', font: 'sans', skill: 'bar', photo: 'circle',
    fontScale: 1, lineHeight: 1.45, margin: 13,
    noteTr: 'Sağ yan sütun, mor ışıma', noteEn: 'Right rail, violet glow',
  },
  {
    id: 'keban', name: 'Keban', shell: 'plain', head: 'band', body: 'flow', category: 'corporate',
    accent: '#047857', ink: '#053b2c', paper: '#ffffff', font: 'sans', skill: 'chips', photo: 'rounded',
    fontScale: 1, lineHeight: 1.48, margin: 13,
    noteTr: 'Düz renk bant, sakin kurumsal ton', noteEn: 'Solid band, calm corporate tone',
  },
  {
    id: 'kovancilar', name: 'Kovancılar', shell: 'plain', head: 'split', body: 'flow', category: 'corporate',
    accent: '#1d4ed8', ink: '#12224a', paper: '#ffffff', font: 'sans', skill: 'bar', photo: 'square',
    fontScale: 1, lineHeight: 1.45, margin: 14,
    noteTr: 'Sol kenar şeridi, bölünmüş başlık', noteEn: 'Edge stripe, split header',
  },
  {
    id: 'maden', name: 'Maden', shell: 'plain', head: 'center', body: 'flow', category: 'academic',
    accent: '#b45309', ink: '#3f2d1b', paper: '#ffffff', font: 'serif', skill: 'text', photo: 'none',
    fontScale: 1.02, lineHeight: 1.5, margin: 17,
    noteTr: 'Serif klasik, ortalanmış künye', noteEn: 'Classic serif, centred masthead',
  },
  {
    id: 'palu', name: 'Palu', shell: 'plain', head: 'stack', body: 'duo', category: 'minimal',
    accent: '#334155', ink: '#1e293b', paper: '#ffffff', font: 'sans', skill: 'chips', photo: 'none',
    fontScale: 0.97, lineHeight: 1.45, margin: 15,
    noteTr: 'İsviçre ızgarası, eşit iki sütun', noteEn: 'Swiss grid, two even columns',
  },
  {
    id: 'sivrice', name: 'Sivrice', shell: 'plain', head: 'hero', body: 'flow', category: 'creative',
    accent: '#dc2626', ink: '#3b0d0d', paper: '#ffffff', font: 'display', skill: 'dots', photo: 'circle',
    fontScale: 1.02, lineHeight: 1.45, margin: 14,
    noteTr: 'İri isim bloğu, sıcak vurgu', noteEn: 'Oversized name block, warm accent',
  },
  {
    id: 'battalgazi', name: 'Battalgazi', shell: 'aside-left', head: 'none', body: 'flow', category: 'technical',
    accent: '#16a34a', ink: '#0d1a16', paper: '#ffffff', font: 'mono', skill: 'bar', photo: 'square',
    fontScale: 0.94, lineHeight: 1.45, margin: 0,
    noteTr: 'Monospace, geliştirici odaklı', noteEn: 'Monospace, developer-first',
  },
  {
    id: 'yesilyurt', name: 'Yeşilyurt', shell: 'plain', head: 'center', body: 'flow', category: 'academic',
    accent: '#7c2d12', ink: '#3c2415', paper: '#fffdf8', font: 'serif', skill: 'text', photo: 'none',
    fontScale: 1.01, lineHeight: 1.52, margin: 16,
    noteTr: 'İnce çerçeve, fildişi kâğıt', noteEn: 'Thin frame, ivory stock',
  },
  {
    id: 'akcadag', name: 'Akçadağ', shell: 'plain', head: 'band', body: 'flow', category: 'modern',
    accent: '#0284c7', ink: '#0b2c42', paper: '#ffffff', font: 'sans', skill: 'dots', photo: 'circle',
    fontScale: 1, lineHeight: 1.45, margin: 13,
    noteTr: 'Zaman tüneli deneyim akışı', noteEn: 'Timeline experience flow',
  },
  {
    id: 'arapgir', name: 'Arapgir', shell: 'plain', head: 'stack', body: 'flow', category: 'minimal',
    accent: '#374151', ink: '#111827', paper: '#ffffff', font: 'sans', skill: 'text', photo: 'none',
    fontScale: 0.94, lineHeight: 1.38, margin: 13,
    noteTr: 'Yoğun ve ATS dostu — tek sütun', noteEn: 'Dense, ATS-friendly single column',
  },
  {
    id: 'arguvan', name: 'Arguvan', shell: 'plain', head: 'hero', body: 'duo', category: 'creative',
    accent: '#ea580c', ink: '#43200a', paper: '#ffffff', font: 'sans', skill: 'ring', photo: 'circle',
    fontScale: 1, lineHeight: 1.45, margin: 14,
    noteTr: 'Ortalanmış portre, halka göstergeler', noteEn: 'Centred portrait, ring meters',
  },
  {
    id: 'darende', name: 'Darende', shell: 'plain', head: 'center', body: 'flow', category: 'academic',
    accent: '#1e40af', ink: '#1b2a4a', paper: '#ffffff', font: 'serif', skill: 'text', photo: 'none',
    fontScale: 0.99, lineHeight: 1.5, margin: 18,
    noteTr: 'Akademik düzen, yayın ağırlıklı', noteEn: 'Academic layout, publication-led',
  },
  {
    id: 'dogansehir', name: 'Doğanşehir', shell: 'aside-right', head: 'band', body: 'flow', category: 'creative',
    accent: '#db2777', ink: '#3d0f2b', rail: '#fdf2f8', paper: '#ffffff', font: 'sans', skill: 'ring', photo: 'circle',
    fontScale: 0.99, lineHeight: 1.42, margin: 0,
    noteTr: 'İnfografik göstergeler, canlı vurgu', noteEn: 'Infographic meters, vivid accent',
  },
  {
    id: 'doganyol', name: 'Doğanyol', shell: 'plain', head: 'band', body: 'duo', category: 'corporate',
    accent: '#0f766e', ink: '#08302c', paper: '#ffffff', font: 'sans', skill: 'bar', photo: 'rounded',
    fontScale: 1, lineHeight: 1.45, margin: 13,
    noteTr: 'Geniş bant, sağda portre', noteEn: 'Wide band, portrait on the right',
  },
  {
    id: 'hekimhan', name: 'Hekimhan', shell: 'plain', head: 'stack', body: 'flow', category: 'minimal',
    accent: '#92400e', ink: '#43301f', paper: '#faf7f1', font: 'serif', skill: 'text', photo: 'none',
    fontScale: 1.01, lineHeight: 1.52, margin: 17,
    noteTr: 'Keten dokulu zemin, yumuşak serif', noteEn: 'Linen stock, soft serif',
  },
  {
    id: 'kale', name: 'Kale', shell: 'plain', head: 'split', body: 'flow', category: 'creative',
    accent: '#4f46e5', ink: '#1c1b4b', paper: '#ffffff', font: 'display', skill: 'chips', photo: 'square',
    fontScale: 1, lineHeight: 1.44, margin: 14,
    noteTr: 'Geometrik köşe bloğu, iddialı tipografi', noteEn: 'Geometric corner block, bold type',
  },

  /* ---------------------------- Malatya (devam) ---------------------------- */
  {
    id: 'kuluncak', name: 'Kuluncak', shell: 'plain', head: 'stack', body: 'flow', category: 'minimal',
    accent: '#0f766e', ink: '#12312c', paper: '#ffffff', font: 'serif', skill: 'text', photo: 'none',
    fontScale: 1, lineHeight: 1.5, margin: 16,
    noteTr: 'Başlıklar sol kenar boşluğunda', noteEn: 'Headings live in the left margin',
  },
  {
    id: 'puturge', name: 'Pütürge', shell: 'plain', head: 'band', body: 'flow', category: 'modern',
    accent: '#b91c1c', ink: '#3f1212', paper: '#ffffff', font: 'sans', skill: 'chips', photo: 'circle',
    fontScale: 1, lineHeight: 1.45, margin: 13,
    noteTr: 'Numaralı bölümler, keskin bant', noteEn: 'Numbered sections, hard-edged band',
  },
  {
    id: 'yazihan', name: 'Yazıhan', shell: 'aside-left', head: 'stack', body: 'flow', category: 'corporate',
    accent: '#0369a1', ink: '#0b2942', paper: '#ffffff', font: 'sans', skill: 'bar', photo: 'rounded',
    fontScale: 1, lineHeight: 1.45, margin: 0,
    noteTr: 'Başlık üstte, künye yan sütunda', noteEn: 'Header on top, details in the rail',
  },

  /* ------------------------------- Kastamonu ------------------------------- */
  {
    id: 'abana', name: 'Abana', shell: 'plain', head: 'center', body: 'duo', category: 'academic',
    accent: '#7e22ce', ink: '#3b1a63', paper: '#ffffff', font: 'serif', skill: 'text', photo: 'none',
    fontScale: 1.01, lineHeight: 1.5, margin: 16,
    noteTr: 'Dergi düzeni, gömme baş harf', noteEn: 'Editorial layout, drop cap',
  },
  {
    id: 'agli', name: 'Ağlı', shell: 'plain', head: 'hero', body: 'flow', category: 'creative',
    accent: '#22d3ee', ink: '#0b1220', paper: '#111825', font: 'sans', skill: 'dots', photo: 'circle',
    fontScale: 1, lineHeight: 1.46, margin: 14,
    noteTr: 'Koyu kâğıt, gece teması', noteEn: 'Dark stock, night theme',
  },
  {
    id: 'arac', name: 'Araç', shell: 'plain', head: 'stack', body: 'flow', category: 'corporate',
    accent: '#4d7c0f', ink: '#22330d', paper: '#ffffff', font: 'sans', skill: 'chips', photo: 'square',
    fontScale: 0.99, lineHeight: 1.45, margin: 13,
    noteTr: 'Çerçeveli bölüm kutuları', noteEn: 'Framed section boxes',
  },
  {
    id: 'azdavay', name: 'Azdavay', shell: 'aside-right', head: 'none', body: 'flow', category: 'modern',
    accent: '#fb923c', ink: '#3d1a08', paper: '#ffffff', font: 'sans', skill: 'bar', photo: 'circle',
    fontScale: 0.99, lineHeight: 1.44, margin: 0,
    noteTr: 'Sağda koyu künye sütunu', noteEn: 'Dark detail column on the right',
  },
  {
    id: 'bozkurt', name: 'Bozkurt', shell: 'plain', head: 'split', body: 'duo', category: 'minimal',
    accent: '#1e293b', ink: '#0f172a', paper: '#ffffff', font: 'display', skill: 'text', photo: 'none',
    fontScale: 0.97, lineHeight: 1.45, margin: 15,
    noteTr: 'Ağır tipografi, iki sütun', noteEn: 'Heavy type, two columns',
  },
  {
    id: 'cide', name: 'Cide', shell: 'plain', head: 'band', body: 'flow', category: 'modern',
    accent: '#0891b2', ink: '#083344', paper: '#ffffff', font: 'sans', skill: 'dots', photo: 'rounded',
    fontScale: 1, lineHeight: 1.46, margin: 13,
    noteTr: 'Sekme biçimli bölüm başlıkları', noteEn: 'Tab-shaped section headings',
  },
  {
    id: 'catalzeytin', name: 'Çatalzeytin', shell: 'aside-left', head: 'center', body: 'flow', category: 'academic',
    accent: '#9a3412', ink: '#4a2410', rail: '#f8f2ea', paper: '#ffffff', font: 'serif', skill: 'text', photo: 'none',
    fontScale: 1, lineHeight: 1.5, margin: 0,
    noteTr: 'Açık künye sütunu, ortalanmış başlık', noteEn: 'Light rail, centred masthead',
  },
  {
    id: 'daday', name: 'Daday', shell: 'plain', head: 'stack', body: 'flow', category: 'technical',
    accent: '#16a34a', ink: '#0e2a19', paper: '#ffffff', font: 'mono', skill: 'bar', photo: 'none',
    fontScale: 0.95, lineHeight: 1.45, margin: 14,
    noteTr: 'Tarihler sol sütunda hizalı', noteEn: 'Dates aligned in a left column',
  },
  {
    id: 'devrekani', name: 'Devrekani', shell: 'plain', head: 'center', body: 'flow', category: 'academic',
    accent: '#111827', ink: '#111827', paper: '#ffffff', font: 'serif', skill: 'text', photo: 'none',
    fontScale: 1, lineHeight: 1.5, margin: 17,
    noteTr: 'Gazete kuralları, ince çizgiler', noteEn: 'Newspaper rules, hairlines',
  },
  {
    id: 'doganyurt', name: 'Doğanyurt', shell: 'aside-right', head: 'hero', body: 'flow', category: 'creative',
    accent: '#e11d48', ink: '#2b0d1f', paper: '#ffffff', font: 'display', skill: 'ring', photo: 'circle',
    fontScale: 1, lineHeight: 1.44, margin: 0,
    noteTr: 'Dev baş harf, koyu sağ ray', noteEn: 'Oversized monogram, dark right rail',
  },
  {
    id: 'hanonu', name: 'Hanönü', shell: 'plain', head: 'stack', body: 'duo', category: 'modern',
    accent: '#0d9488', ink: '#0b3b36', paper: '#fbfaf7', font: 'sans', skill: 'chips', photo: 'rounded',
    fontScale: 1, lineHeight: 1.46, margin: 13,
    noteTr: 'Yumuşak kartlar, sıcak kâğıt', noteEn: 'Soft cards, warm stock',
  },
  {
    id: 'ihsangazi', name: 'İhsangazi', shell: 'plain', head: 'band', body: 'duo', category: 'technical',
    accent: '#2563eb', ink: '#0f1e3d', paper: '#ffffff', font: 'mono', skill: 'bar', photo: 'square',
    fontScale: 0.95, lineHeight: 1.44, margin: 13,
    noteTr: 'Teknik çizim ızgarası', noteEn: 'Blueprint grid',
  },
  {
    id: 'inebolu', name: 'İnebolu', shell: 'plain', head: 'stack', body: 'duo', category: 'minimal',
    accent: '#374151', ink: '#111827', paper: '#ffffff', font: 'sans', skill: 'text', photo: 'none',
    fontScale: 0.93, lineHeight: 1.36, margin: 12,
    noteTr: 'Sıkı iki sütun, tek sayfa hedefi', noteEn: 'Tight two columns, aimed at one page',
  },
  {
    id: 'kure', name: 'Küre', shell: 'aside-left', head: 'none', body: 'flow', category: 'creative',
    accent: '#a78bfa', ink: '#241a4d', paper: '#ffffff', font: 'sans', skill: 'ring', photo: 'circle',
    fontScale: 0.99, lineHeight: 1.44, margin: 0,
    noteTr: 'Degrade ray, halka göstergeler', noteEn: 'Gradient rail, ring meters',
  },
  {
    id: 'pinarbasi', name: 'Pınarbaşı', shell: 'plain', head: 'split', body: 'flow', category: 'corporate',
    accent: '#be123c', ink: '#4c0519', paper: '#ffffff', font: 'sans', skill: 'bar', photo: 'square',
    fontScale: 1, lineHeight: 1.45, margin: 14,
    noteTr: 'Her kayıtta sol vurgu şeridi', noteEn: 'An accent stripe on every entry',
  },
  {
    id: 'taskopru', name: 'Taşköprü', shell: 'plain', head: 'center', body: 'flow', category: 'corporate',
    accent: '#0f172a', ink: '#0f172a', paper: '#ffffff', font: 'display', skill: 'dots', photo: 'circle',
    fontScale: 1, lineHeight: 1.46, margin: 15,
    noteTr: 'Madalyon başlık, ince çerçeve', noteEn: 'Medallion header, thin frame',
  },
  {
    id: 'tosya', name: 'Tosya', shell: 'plain', head: 'hero', body: 'flow', category: 'creative',
    accent: '#f59e0b', ink: '#1c1917', paper: '#1c1917', font: 'serif', skill: 'text', photo: 'none',
    fontScale: 1.01, lineHeight: 1.5, margin: 15,
    noteTr: 'Koyu kâğıt, altın vurgu', noteEn: 'Dark stock, gold accent',
  },
]

export const DEFAULT_TEMPLATE_ID = 'agin'

export function getTemplate(id: string): CvTemplate {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0]
}

/** Galeri filtreleri — sıra, sekmelerde görünen sıradır. */
export const TPL_CATEGORIES: TplCategory[] = [
  'corporate',
  'modern',
  'minimal',
  'creative',
  'technical',
  'academic',
]
