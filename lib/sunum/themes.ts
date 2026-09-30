// Sunum temaları — React önizlemesi, PDF çıktısı ve PPTX üreticisi AYNI paleti kullanır.
// Bu yüzden değerler CSS değişkeni değil düz hex'tir: PptxGenJS "RRGGBB" ister, CSS de hex kabul eder.
//
// Palet neden burada sabit? Slayt kâğıdı site temasından (koyu/açık) bağımsızdır —
// sunum beyaz perdeye ya da PDF'e basılır; ekranda koyu tema seçili olsa bile slayt
// kendi zeminini korur (bkz. app/sunum/sunum.css → `.sn-slide` kendi renklerini alır).

/** Grafiklerde kullanılan kategorik seri paleti — açık zeminli temalar için. */
const SERIES_LIGHT = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300']

/** Aynı altı rengin koyu zemin için basamaklanmış hâli (otomatik çevirme değil, seçilmiş adımlar). */
const SERIES_DARK = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300']

/**
 * Her iki palet de CVD (renk körlüğü) ayrımı, açıklık bandı ve kroma tabanı
 * kontrollerinden geçirildi. Açık paletin üç rengi zemine karşı 3:1 altında kaldığı
 * için grafiklerde DEĞER ETİKETİ zorunludur (kimlik yalnızca renge bırakılmaz) —
 * grafik bileşenleri bu yüzden her dilimi/çubuğu etiketler.
 */
export const CHART_SERIES = { light: SERIES_LIGHT, dark: SERIES_DARK } as const

/** Grafikte en fazla kaç kategori gösterilir; fazlası "Diğer" altında toplanır. */
export const MAX_CHART_SLICES = 6

export type ThemeId =
  | 'professional-blue'
  | 'midnight-violet'
  | 'clean-slate'
  | 'academic-serif'
  | 'warm-sand'
  | 'forest-green'
  | 'tech-dark'
  | 'corporate-navy'
  | 'crimson-editorial'
  | 'mono-graphite'
  | 'ocean-teal'
  | 'aurora-dark'

/** Slayt tipografisi — hem CSS ailesine hem PPTX font adına eşlenir. */
export type ThemeFont = 'sans' | 'display' | 'serif'

export type SunumTheme = {
  id: ThemeId
  name: { tr: string; en: string }
  /** Koyu zeminli tema mı? Grafik paleti ve gölge seçimi buna bakar. */
  dark: boolean
  /** Slayt zemini. */
  bg: string
  /** Kart/panel zemini (iki sütun, istatistik kutuları, süreç adımları). */
  panel: string
  /** Kenarlık rengi. */
  line: string
  /** Ana metin. */
  fg: string
  /** İkincil metin (alt başlık, açıklama). */
  fg2: string
  /** Vurgu — başlık altı çizgi, madde işareti, tek serili grafik. */
  accent: string
  /** İkincil vurgu — karşılaştırmanın sağ tarafı, ikinci seri. */
  accent2: string
  /** Vurgu zemini üstündeki metin. */
  onAccent: string
  /** Başlık/kapanış slaytının gradyan durakları. */
  heroFrom: string
  heroTo: string
  onHero: string
  font: ThemeFont
  /** Office'te kurulu olduğu varsayılabilen güvenli aile (PPTX çıktısı). */
  pptxFont: string
}

export const THEMES: SunumTheme[] = [
  {
    id: 'professional-blue',
    name: { tr: 'Profesyonel Mavi', en: 'Professional Blue' },
    dark: false,
    bg: '#ffffff',
    panel: '#f1f6fd',
    line: '#d7e3f4',
    fg: '#0f1b2d',
    fg2: '#4a5a70',
    accent: '#1f6fd0',
    accent2: '#0d4f9e',
    onAccent: '#ffffff',
    heroFrom: '#0b3a73',
    heroTo: '#1f6fd0',
    onHero: '#ffffff',
    font: 'sans',
    pptxFont: 'Calibri',
  },
  {
    id: 'midnight-violet',
    name: { tr: 'Gece Moru', en: 'Midnight Violet' },
    dark: true,
    bg: '#0b1020',
    panel: '#161d33',
    line: '#2b3453',
    fg: '#f4f6fb',
    fg2: '#a7b2ca',
    accent: '#8b95ff',
    accent2: '#3cc9e0',
    onAccent: '#0b1020',
    heroFrom: '#0b1020',
    heroTo: '#302066',
    onHero: '#ffffff',
    font: 'display',
    pptxFont: 'Trebuchet MS',
  },
  {
    id: 'clean-slate',
    name: { tr: 'Sade Gri', en: 'Clean Slate' },
    dark: false,
    bg: '#fbfbfa',
    panel: '#f1f1ef',
    line: '#e0e0db',
    fg: '#14161a',
    fg2: '#585d67',
    accent: '#2b2f38',
    accent2: '#6b7280',
    onAccent: '#ffffff',
    heroFrom: '#14161a',
    heroTo: '#3a404b',
    onHero: '#ffffff',
    font: 'sans',
    pptxFont: 'Arial',
  },
  {
    id: 'academic-serif',
    name: { tr: 'Akademik', en: 'Academic' },
    dark: false,
    bg: '#fdfcf8',
    panel: '#f4f1e8',
    line: '#e2dccb',
    fg: '#1b1a17',
    fg2: '#555046',
    accent: '#8a5a2b',
    accent2: '#a9762f',
    onAccent: '#ffffff',
    heroFrom: '#2a2318',
    heroTo: '#5c452a',
    onHero: '#fdfcf8',
    font: 'serif',
    pptxFont: 'Georgia',
  },
  {
    id: 'warm-sand',
    name: { tr: 'Sıcak Kum', en: 'Warm Sand' },
    dark: false,
    bg: '#fffaf5',
    panel: '#fdefe3',
    line: '#f2dcc6',
    fg: '#2a1f17',
    fg2: '#6a5647',
    accent: '#b34d10',
    accent2: '#8d3b08',
    onAccent: '#ffffff',
    heroFrom: '#75290f',
    heroTo: '#b34d10',
    onHero: '#ffffff',
    font: 'sans',
    pptxFont: 'Calibri',
  },
  {
    id: 'forest-green',
    name: { tr: 'Orman Yeşili', en: 'Forest Green' },
    dark: false,
    bg: '#f8fbf9',
    panel: '#e9f4ee',
    line: '#cde3d6',
    fg: '#10231a',
    fg2: '#466055',
    accent: '#14785a',
    accent2: '#0b5a44',
    onAccent: '#ffffff',
    heroFrom: '#06281f',
    heroTo: '#14785a',
    onHero: '#ffffff',
    font: 'sans',
    pptxFont: 'Calibri',
  },
  {
    id: 'tech-dark',
    name: { tr: 'Teknik Karanlık', en: 'Tech Dark' },
    dark: true,
    bg: '#0d1117',
    panel: '#161b22',
    line: '#2a313c',
    fg: '#e9eef5',
    fg2: '#9aa6b6',
    accent: '#3fbfd6',
    accent2: '#7ee08a',
    onAccent: '#0d1117',
    heroFrom: '#0d1117',
    heroTo: '#13323c',
    onHero: '#ffffff',
    font: 'display',
    pptxFont: 'Consolas',
  },
  {
    id: 'corporate-navy',
    name: { tr: 'Kurumsal Lacivert', en: 'Corporate Navy' },
    dark: true,
    bg: '#0d1626',
    panel: '#152238',
    line: '#27395a',
    fg: '#f2f6fc',
    fg2: '#a9bcd8',
    accent: '#e0b358',
    accent2: '#c3913a',
    onAccent: '#1a1206',
    heroFrom: '#0a1220',
    heroTo: '#1d3352',
    onHero: '#ffffff',
    font: 'sans',
    pptxFont: 'Calibri',
  },
  {
    id: 'crimson-editorial',
    name: { tr: 'Editoryal Kızıl', en: 'Crimson Editorial' },
    dark: false,
    bg: '#fffdfb',
    panel: '#fbf1ec',
    line: '#ecd8d0',
    fg: '#1d1512',
    fg2: '#5c4a44',
    accent: '#a62a2a',
    accent2: '#7d1c1c',
    onAccent: '#ffffff',
    heroFrom: '#5c1414',
    heroTo: '#a62a2a',
    onHero: '#ffffff',
    font: 'serif',
    pptxFont: 'Georgia',
  },
  {
    id: 'mono-graphite',
    name: { tr: 'Grafit', en: 'Graphite' },
    dark: false,
    bg: '#ffffff',
    panel: '#f4f4f5',
    line: '#dcdcde',
    fg: '#111113',
    fg2: '#54545a',
    accent: '#1f1f23',
    accent2: '#000000',
    onAccent: '#ffffff',
    heroFrom: '#1f1f23',
    heroTo: '#45454d',
    onHero: '#ffffff',
    font: 'display',
    pptxFont: 'Arial',
  },
  {
    id: 'ocean-teal',
    name: { tr: 'Okyanus', en: 'Ocean Teal' },
    dark: false,
    bg: '#fbfeff',
    panel: '#e8f6f7',
    line: '#c6e4e7',
    fg: '#0c2124',
    fg2: '#3d5f64',
    accent: '#0d7480',
    accent2: '#075159',
    onAccent: '#ffffff',
    heroFrom: '#063b42',
    heroTo: '#0d7480',
    onHero: '#ffffff',
    font: 'sans',
    pptxFont: 'Calibri',
  },
  {
    id: 'aurora-dark',
    name: { tr: 'Kuzey Işıkları', en: 'Aurora Dark' },
    dark: true,
    bg: '#07101a',
    panel: '#0f1d2b',
    line: '#1f3548',
    fg: '#eef7ff',
    fg2: '#9db4c9',
    accent: '#3fd8c5',
    accent2: '#26a896',
    onAccent: '#032a25',
    heroFrom: '#07223a',
    heroTo: '#0d5a6b',
    onHero: '#ffffff',
    font: 'display',
    pptxFont: 'Arial',
  },
]

export const DEFAULT_THEME_ID: ThemeId = 'professional-blue'

const BY_ID: Record<string, SunumTheme> = THEMES.reduce<Record<string, SunumTheme>>((acc, t) => {
  acc[t.id] = t
  return acc
}, {})

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(BY_ID, value)
}

/** Temayı kimliğinden verir; bilinmeyen kimlikte varsayılana düşer (null dönmez). */
export function getTheme(id: string | null | undefined): SunumTheme {
  return (id && BY_ID[id]) || BY_ID[DEFAULT_THEME_ID]
}

/** Temanın grafik serisi paleti (zemin açık/koyu oluşuna göre). */
export function seriesOf(theme: SunumTheme): readonly string[] {
  return theme.dark ? CHART_SERIES.dark : CHART_SERIES.light
}

/** CSS tarafında kullanılacak yazı tipi değişkeni. */
export function fontVar(font: ThemeFont): string {
  if (font === 'serif') return 'var(--font-serif), Georgia, serif'
  if (font === 'display') return 'var(--font-display), system-ui, sans-serif'
  return 'var(--font-sans), system-ui, sans-serif'
}

/** "#1f6fd0" → "1F6FD0" (PptxGenJS renk biçimi). */
export function pptxColor(hex: string): string {
  return hex.replace('#', '').toUpperCase()
}

/* ================================ kontrast ================================ */

function channel(value: number): number {
  const c = value / 255
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

/** "#1f6fd0" → göreli parlaklık (0 siyah – 1 beyaz). */
export function luminance(hex: string): number {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h[0] + h[0] + h[1] + h[1] + h[2] + h[2] : h
  const r = parseInt(full.slice(0, 2), 16) || 0
  const g = parseInt(full.slice(2, 4), 16) || 0
  const b = parseInt(full.slice(4, 6), 16) || 0
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/**
 * İki rengin WCAG kontrast oranı (1–21). Kalite kontrolü slayt metninin
 * projeksiyonda okunabilirliğini bununla ölçer; 4.5 gövde metni, 3.0 büyük
 * başlık ve grafik işaretleri için eşiktir.
 */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a)
  const lb = luminance(b)
  const hi = Math.max(la, lb)
  const lo = Math.min(la, lb)
  return (hi + 0.05) / (lo + 0.05)
}
