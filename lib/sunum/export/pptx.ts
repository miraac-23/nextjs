// PPTX üreticisi (§9).
//
// Aynı `Presentation` modelini React renderer ile paylaşır: PPTX için ayrı içerik
// ÜRETİLMEZ, yalnızca aynı veri farklı bir çıktı diline çevrilir. Tema renkleri de
// tek kaynaktan gelir (lib/sunum/themes.ts), böylece ekran ile dosya tutarlı olur.
//
// Ölçü birimi inç; 16:9 slayt 10 × 5.625 inçtir.
//
// YERLEŞİM İLKESİ — metin kaymalarının kökü buradaydı:
//   Ekran tarafı slaytı SABİT 1280×720 px kutuda çiziyor ve "bu metin kaç satır
//   sürer" sorusunu saf aritmetikle yanıtlıyor (components/sunum/slides/parts.tsx).
//   Bu dosya AYNI kestirimi PPTX biriminde tekrar eder:
//     · 1280 px = 10 inç  →  128 px = 1 inç  →  punto = px × 0.5625
//     · her metin kutusunun yüksekliği İÇERİKTEN hesaplanır (sabit değil),
//     · `valign` / `margin` / `lineSpacingMultiple` AÇIKÇA yazılır,
//     · punto kademeleri ekrandaki px kademelerinin birebir karşılığıdır.
//   Bu üçü birlikte olmadan PowerPoint kendi varsayılanlarını uyguluyor ve metin
//   ekrandakinden başka yere düşüyordu (ayrıntılı gerekçeler ilgili yardımcıların
//   başındaki yorumlarda).
//
// Bilinçli sınırlar:
//   · Gradyan zemin PPTX'te doğrudan desteklenmediği için ince şeritlerle taklit edilir.
//   · Grafikler PowerPoint'in KENDİ grafik nesnesi olarak eklenir (kullanıcı düzenleyebilir),
//     ekrandaki SVG ile birebir aynı çizim değildir; veri aynıdır.
//   · Yazı boyutu içerik yoğunluğuna göre hesaplanır; PowerPoint'te otomatik küçültme yoktur.
//   · Ekrandaki 39 şablonun bir kısmı (ör. `-03`/`-04` varyantları) PPTX'te aynı
//     yerleşime düşer: dosya biçimi o dekoratif farkları taşıyamıyor. Ölçü ve
//     tipografi yine de her şablon kimliği için doğru hesaplanır.

import type PptxGenJSType from 'pptxgenjs'
import { getTheme, pptxColor, seriesOf, type SunumTheme } from '../themes'
import {
  TEXT_SCALE_MAX,
  TEXT_SCALE_MIN,
  type ArchitectureContent,
  type ChartContent,
  type ColumnBlock,
  type ConclusionContent,
  type ContentContent,
  type ImageContent,
  type Presentation,
  type ProcessContent,
  type QuoteContent,
  type Slide,
  type StatItem,
  type StatisticsContent,
  type SunumLang,
  type TextAlign,
  type TextFont,
  type TextTone,
  type TimelineContent,
  type TitleContent,
} from '../types'

const W = 10
const H = 5.625

/* ================================ ölçek dönüşümü ================================ */

/**
 * Ekran ile PPTX arasındaki TEK ölçek.
 *
 * Slayt ekranda 1280×720 px, dosyada 10×5.625 inç. İkisi de aynı 16:9 yüzey
 * olduğu için 1280 px = 10 inç, yani 128 px = 1 inç.
 *
 * Kaymaların birinci sebebi bu dönüşümün hiç yapılmamasıydı: punto değerleri
 * px değerleriyle aynı büyüklük sanılıp elle seçiliyordu (ekranda 22 px madde,
 * dosyada 16 pt madde = 28.4 px). Dosyadaki metin ekrandakinden %25–30 büyük
 * çıkıyor, aynı cümle bir satır fazla sürüyor ve kutudan taşıyordu.
 */
const PX_PER_IN = 128
const PT_PER_IN = 72

/** Ekran pikselini inç'e çevirir. */
function inch(px: number): number {
  return px / PX_PER_IN
}

/** Ekran pikselini PowerPoint puntosuna çevirir (0.1 pt'a yuvarlanır). */
function pts(px: number): number {
  return Math.round((px * PT_PER_IN * 10) / PX_PER_IN) / 10
}

/* ================================= ölçü motoru ================================= */

/**
 * Ortalama karakter genişliğinin punto'ya oranı — parts.tsx → CHAR_RATIO ile
 * AYNI sayı olmalı; yoksa ekranın "sığar" dediği metin dosyada taşar.
 */
const CHAR_RATIO = 0.485

/**
 * PowerPoint'te "tek satır" aralığı puntonun 1.0 katı DEĞİL, yazı tipinin doğal
 * satır yüksekliğidir (≈1.2 em). Dolayısıyla ekrandaki `line-height: 1.45`
 * karşılığı `lineSpacingMultiple: 1.45 / 1.2`dir.
 *
 * Çarpan düzeltilmeden yazıldığında PowerPoint her satıra %20 fazla yer veriyor;
 * 8 maddelik bir listede bu 0.4 inç eder ve liste alttaki bandın üstüne biner.
 * Kutu yüksekliği ise GERÇEK adım olan `lineHeight × punto` ile hesaplanır —
 * ikisi ayrı tutulmazsa ya kutu şişer ya metin taşar.
 */
const PPT_SINGLE = 1.2

/** `lineHeight` (ekran değeri) → PowerPoint `lineSpacingMultiple`. */
function lineSpacing(lineHeight: number): number {
  const lh = Math.max(0.6, Math.min(4, lineHeight))
  return Math.round((lh / PPT_SINGLE) * 1000) / 1000
}

/**
 * Metnin verilen genişlikte kaç satır süreceğini kestirir.
 *
 * parts.tsx → `estimateLines` ile aynı aritmetik; tek fark birim: orada px,
 * burada punto. `widthPt / sizePt` oranı `widthPx / sizePx` ile aynı olduğu için
 * sonuç birebir örtüşür. Sert satır sonları ('\n') ayrı paragraf sayılır —
 * PPTX tarafında `a\nb` biçiminde tek kutuya yazılan metinler var ve onların
 * satır sayısı tek parça sayıldığında kutu her zaman eksik kalıyordu.
 */
function lineCount(text: string, widthIn: number, sizePt: number): number {
  if (!text) return 0
  const perLine = Math.max(6, Math.floor((widthIn * PT_PER_IN) / (sizePt * CHAR_RATIO)))
  const parts = text.split('\n')
  let lines = 0
  for (let i = 0; i < parts.length; i++) lines += Math.max(1, Math.ceil(parts[i].length / perLine))
  return Math.max(1, lines)
}

/** Metnin kaplayacağı dikey alan (inç) — parts.tsx → `textHeight` karşılığı. */
function textH(text: string, widthIn: number, sizePt: number, lineHeight: number): number {
  return (lineCount(text, widthIn, sizePt) * sizePt * lineHeight) / PT_PER_IN
}

/**
 * Metin kutusunun yüksekliği: kestirim + 3 px güvenlik payı.
 *
 * Kestirim ±%3 hata payıyla çalışıyor (bkz. parts.tsx); sınır durumda kutuyu
 * birkaç piksel uzun vermek, son satırın alttaki bloğa taşmasından iyidir.
 */
function boxH(fmt: Fmt, text: string, widthIn: number, sizePt: number, lineHeight: number): number {
  // `lineHeight` ŞABLONUN değeri; kullanıcının `textStyle.lineHeight` çarpanı
  // burada uygulanır. `putText` de aynı çarpanı `lineSpacingMultiple`e yazıyor;
  // ikisinden biri unutulursa kutu yarı boyda kalıyor ve metin dışına taşıyor.
  return textH(text, widthIn, sizePt, lineHeight * fmt.lineScale) + inch(3)
}

/**
 * Kademe seçimi: ilk sığan kademeyi döndürür, hiçbiri sığmazsa en sıkısını
 * (parts.tsx → `pickTier` ile aynı davranış).
 */
function pickTier<T>(tiers: T[], height: (tier: T) => number, available: number): T {
  for (let i = 0; i < tiers.length; i++) if (height(tiers[i]) <= available) return tiers[i]
  return tiers[tiers.length - 1]
}

/**
 * En sıkı kademe de sığmadığında son çare: puntoyu sürekli ölçekle küçültür.
 *
 * Ekranda bu işi CSS `overflow: hidden` yapıyor — taşan içerik KIRPILIR ve
 * alttaki banda binmez. PPTX'te kırpma yok: bir metin kutusu içeriğinden kısaysa
 * PowerPoint metni kutunun dışına taşırır. O yüzden burada "taşma" yerine
 * "küçülme" seçilir; okunurluk düşer ama bloklar üst üste binmez.
 *
 * Yükseklik punto ölçeğine göre azalan (monoton) olduğu için ikili arama güvenli.
 */
const MIN_FIT_SCALE = 0.4

function fitScale(fmt: Fmt, height: (f: Fmt) => number, available: number): Fmt {
  if (height(fmt) <= available) return fmt
  /*
   * Sıkışırken kullanıcının `lineHeight` tercihi de şablon değerine (1) doğru
   * çekilir ve puntodan HIZLI (k²) kısılır: satır aralığı dekoratif, punto ise
   * okunurluğun kendisi. 2.0 satır aralığı tam sıkışmada 1.16'ya iner.
   */
  const at = (k: number): Fmt => ({
    ...fmt,
    fit: fmt.fit * k,
    lineScale: 1 + (fmt.lineScale - 1) * k * k,
  })
  let lo = MIN_FIT_SCALE
  let hi = 1
  for (let i = 0; i < 12; i++) {
    const mid = (lo + hi) / 2
    if (height(at(mid)) <= available) lo = mid
    else hi = mid
  }
  return at(lo)
}

/**
 * Gövde içindeki sabit ek satırlar (karşılaştırma sonucu, dipnot, alt yazı,
 * kapanış çağrısı) gövdenin en çok üçte birini alabilir.
 *
 * Bunlar gövdenin KARDEŞİ: yüksekliği ana içerikten düşülüyor. Kullanıcı
 * `scale`ı 1.35'e çekip uzun bir sonuç cümlesi yazdığında iki satırlık bu blok
 * gövdenin yarısını yiyor ve ana içerik bandın üstüne biniyordu.
 */
const EXTRA_SHARE = 0.34

function fitExtra(
  fmt: Fmt,
  text: string,
  widthIn: number,
  screenPx: number,
  lh: number,
  bodyAvailable: number,
): Fmt {
  return fitScale(fmt, (f) => boxH(f, text, widthIn, sz(f, screenPx), lh), bodyAvailable * EXTRA_SHARE)
}

/* ================================= ızgara ================================= */

/**
 * Ekrandaki `.sn-slide` kutusunun birebir karşılığı: padding 64 / 72 / 56 px.
 * Sayılar app/sunum/sunum.css ile AYNI olmalı.
 */
const GRID = {
  marginX: inch(72),
  top: inch(64),
  bottom: inch(56),
} as const

/** `.sn-head` alt boşluğu (parts.tsx → HEAD_GAP). */
const HEAD_GAP_PX = 24

/** Yan boşluklar düşülünce kalan genişlik: 1136 px = 8.875 inç. */
const contentW = W - GRID.marginX * 2

type Pptx = PptxGenJSType
type PptxSlide = ReturnType<Pptx['addSlide']>
type TextRuns = Parameters<PptxSlide['addText']>[0]
type TextOpts = NonNullable<Parameters<PptxSlide['addText']>[1]>

type Box = { x: number; y: number; w: number; h: number }

/* =============================== renk yardımcıları =============================== */

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h[0] + h[0] + h[1] + h[1] + h[2] + h[2] : h
  return [
    parseInt(full.slice(0, 2), 16) || 0,
    parseInt(full.slice(2, 4), 16) || 0,
    parseInt(full.slice(4, 6), 16) || 0,
  ]
}

function rgbToHex(r: number, g: number, b: number): string {
  const part = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
  return `#${part(r)}${part(g)}${part(b)}`
}

/** İki rengi `t` (0-1) oranında karıştırır — gradyan şeritleri ve tint'ler için. */
function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a)
  const [r2, g2, b2] = hexToRgb(b)
  return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t)
}

/** Vurgu renginin zemine karıştırılmış açık tonu (panel dolgusu). */
function tint(theme: SunumTheme, color: string, amount = 0.88): string {
  return mix(color, theme.bg, amount)
}

/* ============================== metin biçimi (textStyle) ============================== */

/** Gradyan zeminli slayt mı? Metin rengi ve bant renkleri buna göre seçilir. */
function isHeroSlide(s: Slide): boolean {
  // Kapağın DÖRT varyantı da gradyan zemine oturur (drawTitle her hâlde gradyan
  // basıyor); eskiden `title-02` hariç tutuluyordu ve o slaytta ton eşlemesi
  // koyu zemine koyu metin veriyordu.
  if (s.type === 'title') return true
  if (s.type === 'conclusion') return s.template !== 'conclusion-02'
  if (s.type === 'quote') return s.template === 'quote-02'
  return false
}

/**
 * Metin rolleri. `textStyle.tone` verilmediğinde şablonun kendi rolü geçerlidir;
 * `onAccent` (vurgu zemini üstündeki metin) kontrast kilitli olduğu için tondan
 * ETKİLENMEZ — kullanıcı biçim değiştirirken okunabilirlik garantisi bozulmasın.
 */
type Role = 'body' | 'muted' | 'accent' | 'accent2' | 'onAccent'

/** `TextStyle.font` → PowerPoint'te kurulu sayılabilen aileler. */
const FONT_FACES: Record<Exclude<TextFont, 'theme'>, string> = {
  sans: 'Calibri',
  serif: 'Georgia',
  display: 'Arial',
  mono: 'Consolas',
}

/**
 * Slaydın çözümlenmiş metin biçimi.
 *
 * `scale` mutlak punto değil ÇARPAN olduğu için satır sayısını da değiştirir;
 * bu yüzden kutu yüksekliği kestirimleri hep `sz()` üzerinden gider (bkz. GÖREV 2).
 */
type Fmt = {
  theme: SunumTheme
  hero: boolean
  fontFace: string
  scale: number
  /**
   * Sığdırma çarpanı (kullanıcıya AİT DEĞİL, `fitScale` ayarlar).
   *
   * `scale` yalnızca puntoyu çarpar — kullanıcı "yazı büyük olsun" dediğinde iç
   * boşluklar da büyümemeli. `fit` ise bloğun TAMAMINI küçültür: punto, iç
   * boşluk, rozet ve satır arası birlikte iner. Ekrandaki `overflow: hidden`
   * karşılığı budur; kırpmak yerine ölçekliyoruz.
   */
  fit: number
  /** Şablonun kendi satır aralığını çarpar (1 = dokunma). */
  lineScale: number
  bold?: boolean
  italic?: boolean
  underline: boolean
  align?: TextAlign
  tone?: TextTone
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function fmtOf(theme: SunumTheme, s: Slide): Fmt {
  const st = s.textStyle
  const font = st?.font
  return {
    theme,
    hero: isHeroSlide(s),
    fontFace: font && font !== 'theme' ? FONT_FACES[font] : theme.pptxFont,
    // Sınırlar şemadakiyle aynı (lib/sunum/schema.ts → textStyleSchema);
    // eski/elle düzenlenmiş kayıtlarda aralık dışı değer gelebilir.
    scale: clamp(typeof st?.scale === 'number' ? st.scale : 1, TEXT_SCALE_MIN, TEXT_SCALE_MAX),
    lineScale: clamp(typeof st?.lineHeight === 'number' ? st.lineHeight : 1, 0.9, 2),
    fit: 1,
    bold: st?.bold,
    italic: st?.italic,
    underline: st?.underline === true,
    align: st?.align,
    tone: st?.tone,
  }
}

/** Şablonun px puntosunu kullanıcı ölçeği ve sığdırma çarpanıyla punto'ya çevirir. */
function sz(fmt: Fmt, screenPx: number): number {
  return Math.max(5, pts(screenPx * fmt.scale * fmt.fit))
}

/**
 * Yerleşim ölçüsü (inç): iç boşluk, rozet, satır arası boşluk gibi PUNTO OLMAYAN
 * değerler. Kullanıcının `scale`ından etkilenmez — yalnızca sığdırma küçültür.
 */
function gp(fmt: Fmt, screenPx: number): number {
  return inch(screenPx * fmt.fit)
}

/** Aynı ölçünün punto karşılığı (paragraf boşluğu, madde girintisi). */
function gpt(fmt: Fmt, screenPx: number): number {
  return pts(screenPx * fmt.fit)
}

/** Rol + ton → tema rengi. */
function ink(fmt: Fmt, role: Role): string {
  const t = fmt.theme
  // Gradyan zeminde ikincil metin: fg2 okunmaz, zemin karşıtının kırılmış hâli.
  const heroMuted = mix(t.onHero, t.heroTo, 0.3)
  if (role === 'onAccent') return t.onAccent
  switch (fmt.tone) {
    case 'accent':
      return t.accent
    case 'muted':
      return fmt.hero ? heroMuted : t.fg2
    case 'default':
      return fmt.hero ? t.onHero : t.fg
    default:
      break
  }
  if (role === 'accent') return t.accent
  if (role === 'accent2') return t.accent2
  if (role === 'muted') return fmt.hero ? heroMuted : t.fg2
  return fmt.hero ? t.onHero : t.fg
}

/* ================================ çizim bağlamı ================================ */

/**
 * Bir slaydı çizmek için gereken her şey.
 *
 * `bodyBottom` gövdenin alt sınırı: örnek bandı, vurgu bandı ve slayt görseli
 * için ayrılan yerin ÜSTÜ. Eskiden bu değer modül düzeyinde değişken bir
 * "rezerv"di ve bantların gerçek yüksekliğiyle uyuşmuyordu; artık her slayt için
 * bantların ÖLÇÜLEN yüksekliğinden hesaplanıp buradan okunuyor.
 */
type Ctx = {
  pptx: Pptx
  slide: PptxSlide
  theme: SunumTheme
  fmt: Fmt
  s: Slide
  bodyBottom: number
  /** Başlık bloğunun kullanabileceği en büyük yükseklik (bkz. `header`). */
  headMax: number
  lang: SunumLang
}

/** Bir metin bloğunun tipografik ayarları. */
type Ink = {
  /** Punto (pt) — `sz()` ile üretilmiş olmalı. */
  size: number
  /** Ekran karşılığı satır yüksekliği çarpanı. */
  lh: number
  role?: Role
  /** Rol yerine doğrudan renk (gradyan üstü karışımlar). */
  color?: string
  bold?: boolean
  italic?: boolean
  align?: TextAlign
  valign?: 'top' | 'middle' | 'bottom'
  /**
   * Tek satırlık işaret (kart numarası, rozet, dev sayı, tırnak, bant etiketi).
   *
   * Kullanıcının `lineHeight` çarpanı bunlara UYGULANMAZ: tek satırda satır
   * aralığının görsel bir işlevi yok, yalnızca işareti kutusundan taşırıyor.
   */
  solo?: boolean
}

/**
 * Tek metin yazma noktası.
 *
 * Buradan geçmeyen `addText` çağrısı kalmamalı: `valign`, `margin` ve
 * `lineSpacingMultiple` verilmediğinde PowerPoint kendi varsayılanını uyguluyor
 * ve metin ekrandakinden başka yere düşüyor —
 *   · varsayılan dikey hiza ORTA (pptxgenjs `anchor="ctr"` yazıyor): içerikten
 *     kısa bir kutuda metin aşağı kayıyor,
 *   · varsayılan iç boşluk [3.5, 7, 3.5, 7] pt: kutuyu yatayda 0.19 inç
 *     daraltıyor, yani satır sarması kestirimden ERKEN oluyor.
 */
function putText(ctx: Ctx, content: TextRuns, box: Box, o: Ink): void {
  const fmt = ctx.fmt
  const opts: TextOpts = {
    x: box.x,
    y: box.y,
    // Sıfır ölçülü kutu bozuk XML üretiyor (PptxGenJS cy=0'ı 0.3 inç'e çeviriyor),
    // ama taban bir piksele indirilir: daha büyük bir taban, küçük satırlarda
    // kutuyu kendi yerinden UZUN yapıp bir sonraki bloğa taşırıyordu.
    w: Math.max(inch(2), box.w),
    h: Math.max(inch(1), box.h),
    fontFace: fmt.fontFace,
    fontSize: o.size,
    color: pptxColor(o.color ?? ink(fmt, o.role ?? 'body')),
    // Kullanıcı biçimi şablonun kararını EZER (kullanıcı açıkça istedi);
    // verilmediyse şablonun kendi değeri geçerli.
    bold: fmt.bold ?? o.bold ?? false,
    italic: fmt.italic ?? o.italic ?? false,
    align: fmt.align ?? o.align ?? 'left',
    valign: o.valign ?? 'top',
    // İç boşluk sıfır: kutu koordinatları zaten iç boşluğu içeriyor ve satır
    // sarması kestirimi kutunun TAM genişliğine göre yapılıyor.
    margin: 0,
    lineSpacingMultiple: lineSpacing(o.lh * (o.solo ? 1 : fmt.lineScale)),
    // Otomatik küçültme/büyütme kapalı: yüksekliği biz hesaplıyoruz.
    fit: 'none',
    wrap: true,
    isTextBox: true,
  }
  if (fmt.underline) opts.underline = { style: 'sng' }
  ctx.slide.addText(content, opts)
}

/* ================================ ortak parçalar ================================ */

/**
 * Gradyan taklidi: yatay şeritler hâlinde renk geçişi. 18 şerit gözle ayırt
 * edilemeyecek kadar yumuşak, dosya boyutunu da ölçülebilir biçimde büyütmüyor.
 */
function gradientBackground(pptx: Pptx, slide: PptxSlide, from: string, to: string): void {
  const bands = 18
  const bandH = H / bands
  for (let i = 0; i < bands; i++) {
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: i * bandH,
      // Şeritler arasında beyaz çizgi görünmesin diye yarım şerit taşırılır.
      w: W,
      h: bandH + 0.02,
      fill: { color: pptxColor(mix(from, to, i / (bands - 1))) },
      line: { type: 'none' },
    })
  }
}

/** Panel: hafif dolgu + ince kenarlık. İki sütun, karşılaştırma, istatistik kutuları. */
function panel(ctx: Ctx, box: Box, fill?: string): void {
  ctx.slide.addShape(ctx.pptx.ShapeType.roundRect, {
    ...box,
    h: Math.max(inch(10), box.h),
    rectRadius: 0.06,
    fill: { color: pptxColor(fill ?? ctx.theme.panel) },
    line: { color: pptxColor(ctx.theme.line), width: 0.75 },
  })
}

/** Dolgusuz dikdörtgen (çizgi, nokta, ok, rozet). */
function bar(ctx: Ctx, box: Box, color: string): void {
  ctx.slide.addShape(ctx.pptx.ShapeType.rect, {
    ...box,
    fill: { color: pptxColor(color) },
    line: { type: 'none' },
  })
}

/* ---------------------------------- başlık ---------------------------------- */

/**
 * `.sn-title` punto kademeleri — parts.tsx → `titleSize` ile AYNI eşikler.
 * Eski PPTX kodu 64/42 eşikleriyle çalışıyordu; aynı başlık ekranda 33 px,
 * dosyada 23 pt (= 41 px) olunca satır sayısı şaşıyor ve başlık alt çizginin
 * üstüne biniyordu.
 */
function titlePx(title: string): number {
  if (title.length > 84) return 28
  if (title.length > 52) return 33
  return 40
}

/** Alt başlık sütunu: `max-width: 62ch` ≈ 533 px. */
const SUBTITLE_W = Math.min(contentW, inch(533))

/** Başlık bloğunun (başlık + çizgi + alt başlık + boşluk) yüksekliği — çizmeden. */
function headHeight(fmt: Fmt, s: Slide): number {
  if (!s.title && !s.subtitle) return 0
  let h = 0
  // `.sn-rule`: 16 px üst boşluk + 4 px kalınlık.
  if (s.title) h += boxH(fmt, s.title, contentW, sz(fmt, titlePx(s.title)), 1.15) + gp(fmt, 20)
  if (s.subtitle) h += gp(fmt, 14) + boxH(fmt, s.subtitle, SUBTITLE_W, sz(fmt, 18), 1.5)
  return h + gp(fmt, HEAD_GAP_PX)
}

/**
 * Başlık + vurgu çizgisi + alt başlık. Gövdenin başladığı Y'yi (inç) döndürür.
 * Ölçüler parts.tsx → `headHeight` ile birebir aynı sırayı izler.
 *
 * `ctx.headMax` aşılırsa yalnızca BAŞLIK bloğunun puntosu küçülür: uzun başlık +
 * uzun alt başlık + büyük `textStyle.scale` birleşiminde başlık slaydın yarısını
 * yiyip gövdeye yer bırakmıyordu.
 */
function header(ctx: Ctx): number {
  const s = ctx.s
  const fmt = fitScale(ctx.fmt, (f) => headHeight(f, s), ctx.headMax)
  ctx = { ...ctx, fmt }
  let y = GRID.top
  if (s.title) {
    const size = sz(fmt, titlePx(s.title))
    const h = boxH(fmt, s.title, contentW, size, 1.15)
    putText(ctx, s.title, { x: GRID.marginX, y, w: contentW, h }, {
      size,
      lh: 1.15,
      role: 'body',
      bold: true,
      valign: 'top',
    })
    y += h
    // `.sn-rule`: 16 px üst boşluk + 4 px kalınlık, 72 px genişlik.
    // Dekoratif şekiller `textStyle.tone`dan ETKİLENMEZ: ton metnin rengidir,
    // slaydın çizgi/rozet/ok gibi yapısal işaretleri temanın vurgusunda kalır.
    bar(ctx, { x: GRID.marginX, y: y + gp(fmt, 16), w: inch(72), h: inch(4) }, ctx.theme.accent)
    y += gp(fmt, 20)
  }
  if (s.subtitle) {
    // `.sn-subtitle`: 14 px üst boşluk, 18 px punto, satır aralığı 1.5,
    // max-width 62ch ≈ 533 px. Kutu genişliği ÖLÇÜLEN genişlikle aynı olmalı;
    // yoksa PowerPoint başka yerde sarar ve kestirim tutmaz.
    const size = sz(fmt, 18)
    const w = SUBTITLE_W
    const h = boxH(fmt, s.subtitle, w, size, 1.5)
    y += gp(fmt, 14)
    putText(ctx, s.subtitle, { x: GRID.marginX, y, w, h }, { size, lh: 1.5, role: 'muted', valign: 'top' })
    y += h
  }
  if (!s.title && !s.subtitle) return y
  return y + gp(fmt, HEAD_GAP_PX)
}

/**
 * Gövdeye kalan dikey alan (inç).
 *
 * Taban bilinçli olarak çok küçük: "en az şu kadar olsun" demek, alanı gerçekten
 * olmadığında kutuyu bandın üstüne taşırıyordu. Yer darsa çözüm alan uydurmak
 * değil puntoyu küçültmek (bkz. `fitScale`, `MIN_BODY`).
 */
function bodyAvail(ctx: Ctx, top: number): number {
  return Math.max(inch(24), ctx.bodyBottom - top)
}

/* --------------------------------- maddeler --------------------------------- */

type BulletTier = { size: number; lh: number; gap: number }

/** Madde kademeleri — parts.tsx → BULLET_TIERS (ve CSS `.sn-bullets`) ile aynı px. */
const BULLET_TIERS: BulletTier[] = [
  { size: 22, lh: 1.45, gap: 18 },
  { size: 19, lh: 1.42, gap: 13 },
  { size: 17, lh: 1.38, gap: 10 },
  { size: 15, lh: 1.35, gap: 8 },
  { size: 13, lh: 1.32, gap: 6 },
]

/**
 * Madde işaretinin sol boşluğu (`.sn-bullets li` padding-left = 30 px).
 *
 * PptxGenJS varsayılanı 27 pt (= 0.375 inç = 48 px): metin sütunu ekrandakinden
 * 0.14 inç dar kalıyor ve uzun maddeler bir satır fazla sürüyordu. Hem `bullet.indent`
 * hem de kestirimdeki genişlik bu değerden okunur.
 */
const BULLET_INDENT_PX = 30

function bulletsH(fmt: Fmt, items: string[], widthIn: number, tier: BulletTier): number {
  const size = sz(fmt, tier.size)
  const textW = Math.max(inch(80), widthIn - gp(fmt, BULLET_INDENT_PX))
  let h = gp(fmt, tier.gap) * Math.max(0, items.length - 1)
  for (let i = 0; i < items.length; i++) h += textH(items[i], textW, size, tier.lh * fmt.lineScale)
  return h
}

/** Grupların en uzun olanının yüksekliği (ortak kademe ve sığdırma için). */
function bulletsHMax(fmt: Fmt, groups: string[][], widthIn: number, tier: BulletTier): number {
  let tallest = 0
  for (let g = 0; g < groups.length; g++) {
    const h = bulletsH(fmt, groups[g], widthIn, tier)
    if (h > tallest) tallest = h
  }
  return tallest
}

/**
 * Birden çok sütuna bölünmüş listeler için ORTAK kademe (parts.tsx →
 * `bulletClassMulti`): yan yana iki farklı punto slaytı bozuk gösteriyor.
 */
function pickBulletTier(fmt: Fmt, groups: string[][], widthIn: number, available: number): BulletTier {
  return pickTier(BULLET_TIERS, (tier) => bulletsHMax(fmt, groups, widthIn, tier), available)
}

function bulletBlock(ctx: Ctx, items: string[], box: Box, tier: BulletTier, role: Role = 'body'): void {
  if (items.length === 0) return
  const size = sz(ctx.fmt, tier.size)
  // Madde girintisi ve paragraf arası boşluk da bloğun sığdırma çarpanını okur.
  const runs = items.map((text, i) => ({
    text,
    options: {
      bullet: { characterCode: '2022', indent: gpt(ctx.fmt, BULLET_INDENT_PX) },
      breakLine: true,
      // Madde arası boşluk paragraf ÖNÜNE verilir: `paraSpaceAfter` son maddeden
      // sonra da boşluk bırakıp bloğu bir gap uzatıyordu.
      paraSpaceBefore: i === 0 ? 0 : gpt(ctx.fmt, tier.gap),
    },
  }))
  putText(ctx, runs, box, { size, lh: tier.lh, role, valign: 'top' })
}

/**
 * Madde listesini verilen kutuya yerleştirir: kademe seç → sığmıyorsa İKİ KOLONA
 * böl → hâlâ sığmıyorsa puntoyu küçült.
 *
 * İki kolon ekrandaki çözümün aynısı (content-03 / conclusion-03 maddeleri iki
 * kolona bölüyor): 8 uzun maddeyi tek kolonda tutmak ya puntoyu okunmaz yapıyor
 * ya da listeyi alttaki bandın üstüne taşırıyor. Ekran taşan kısmı kırpıyor,
 * PPTX kırpamıyor; bölmek içeriği de okunurluğu da koruyan tek yol.
 */
function bulletsInto(ctx: Ctx, items: string[], box: Box, role: Role = 'body'): void {
  if (items.length === 0) return
  const fmt = ctx.fmt
  const smallest = BULLET_TIERS[BULLET_TIERS.length - 1]
  const colGap = inch(32)
  const splitW = (box.w - colGap) / 2
  // Bölme yalnızca kolon hâlâ okunur genişlikteyse (≥ 2.3 inç) anlamlı.
  const split =
    items.length > 3 &&
    splitW >= inch(300) &&
    bulletsHMax(fmt, [items], box.w, smallest) > box.h
  const groups = split
    ? [items.slice(0, Math.ceil(items.length / 2)), items.slice(Math.ceil(items.length / 2))]
    : [items]
  const colW = split ? splitW : box.w
  const tier = pickBulletTier(fmt, groups, colW, box.h)
  const inner: Ctx = { ...ctx, fmt: fitScale(fmt, (f) => bulletsHMax(f, groups, colW, tier), box.h) }
  for (let g = 0; g < groups.length; g++) {
    bulletBlock(inner, groups[g], { x: box.x + g * (colW + colGap), y: box.y, w: colW, h: box.h }, tier, role)
  }
}

/* ================================ slayt çizicileri ================================ */

/**
 * Kapak. Ekranda `.sn-hero` zeminde dikeyde ORTALANIR (`justify-content: center`),
 * bu yüzden blok yüksekliği önce ölçülür sonra ortalanır. Eski kod y'leri sabit
 * yazıyordu (1.95 / 3.5) ve iki satırlık bir başlık alt başlığın üstüne biniyordu.
 */
function drawTitle(ctx: Ctx, c: TitleContent): void {
  const s = ctx.s
  const theme = ctx.theme
  gradientBackground(ctx.pptx, ctx.slide, theme.heroFrom, theme.heroTo)

  // `.sn-cover-title`: 62 / 48 / 38 px, satır aralığı 1.08, eşikler 40 / 90 karakter.
  // max-width 22ch / 26ch → ölçüm genişliği puntoya bağlı; kutu da aynı genişlikte.
  const titleW = Math.min(contentW, inch(s.title.length > 40 ? 620 : 680))
  const subW = Math.min(contentW, inch(507))
  // `.sn-cover-rule` 84×5 px + 28 px alt boşluk.
  const ruleBlock = inch(5) + inch(28)
  const stack = (f: Fmt): number => {
    const t = s.title ? boxH(f, s.title, titleW, sz(f, s.title.length > 90 ? 38 : s.title.length > 40 ? 48 : 62), 1.08) : 0
    const sub = s.subtitle ? inch(26) + boxH(f, s.subtitle, subW, sz(f, 22), 1.5) : 0
    return ruleBlock + t + sub
  }
  // Künye satırı `.sn-cover-meta` gibi alta yaslanır; görsel şeridi varsa onun
  // üstünde kalır (ekranda da görsel gövdenin kardeşi olarak yer kaplar).
  const footer = [c.presenter, c.context].filter((v): v is string => !!v).join('  ·  ')
  const footBase = Math.min(H - inch(52), ctx.bodyBottom)
  const footH = footer ? boxH(ctx.fmt, footer, contentW, sz(ctx.fmt, 15), 1.4) : 0
  // Kapak metni sığmazsa küçülür: kapaktaki dev punto + uzun başlık birleşimi
  // alt başlığı ve künye satırını slayttan taşırıyordu.
  const usable = Math.max(inch(60), footBase - GRID.top - (footer ? footH + inch(16) : 0))
  const fmt = fitScale(ctx.fmt, stack, usable)
  ctx = { ...ctx, fmt }

  const titleSize = sz(fmt, s.title.length > 90 ? 38 : s.title.length > 40 ? 48 : 62)
  const titleH = s.title ? boxH(fmt, s.title, titleW, titleSize, 1.08) : 0
  const subSize = sz(fmt, 22)
  const subH = s.subtitle ? boxH(fmt, s.subtitle, subW, subSize, 1.5) : 0
  const stackH = stack(fmt)
  let y = GRID.top + Math.max(0, (usable - stackH) / 2)

  bar(ctx, { x: GRID.marginX, y, w: inch(84), h: inch(5) }, theme.accent)
  y += ruleBlock

  if (s.title) {
    putText(ctx, s.title, { x: GRID.marginX, y, w: titleW, h: titleH }, {
      size: titleSize,
      lh: 1.08,
      color: ink(fmt, 'body'),
      bold: true,
      valign: 'top',
    })
    y += titleH
  }
  if (s.subtitle) {
    y += inch(26)
    putText(ctx, s.subtitle, { x: GRID.marginX, y, w: subW, h: subH }, {
      size: subSize,
      lh: 1.5,
      color: ink(fmt, 'muted'),
      valign: 'top',
    })
  }

  // `.sn-cover-meta`: sol 72 px, alt 52 px, 15 px punto.
  if (footer) {
    const size = sz(fmt, 15)
    const h = boxH(fmt, footer, contentW, size, 1.4)
    putText(ctx, footer, { x: GRID.marginX, y: footBase - h, w: contentW, h }, {
      size,
      lh: 1.4,
      color: mix(theme.onHero, theme.heroTo, 0.35),
      valign: 'bottom',
    })
  }
}

/** İçerik kartı kademeleri — ContentSlide → CARD_TIERS ile aynı px. */
const CARD_TIERS = [
  { padY: 26, padX: 28, gap: 10, num: 15, size: 19, lh: 1.4, grid: 18 },
  { padY: 18, padX: 22, gap: 8, num: 14, size: 16, lh: 1.38, grid: 14 },
  { padY: 13, padX: 18, gap: 6, num: 13, size: 14, lh: 1.35, grid: 10 },
]

/** Kart sayısına göre kolon adedi (ContentSlide → cardColumns). */
function cardColumns(count: number): number {
  if (count <= 2) return Math.max(count, 1)
  if (count === 4) return 2
  return 3
}

function drawContent(ctx: Ctx, c: ContentContent): void {
  const top = header(ctx)
  const avail = bodyAvail(ctx, top)
  // `fmt` bilinçli olarak `let`: kademe seçildikten sonra blok hâlâ sığmıyorsa
  // `fitScale` puntoyu küçültür ve aşağıdaki bütün ölçüler yeni değeri okur.
  let fmt = ctx.fmt

  if (ctx.s.template === 'content-02' && c.bullets.length > 0) {
    const items = c.bullets.slice(0, 6)
    const cols = cardColumns(items.length)
    const rows = Math.ceil(items.length / cols)

    /** Kart yüksekliği: numara satırı + metin; satırın en uzun kartı belirler. */
    const rowHeights = (tier: (typeof CARD_TIERS)[number]): number[] => {
      const cardW = (contentW - gp(fmt, tier.grid) * (cols - 1)) / cols
      const textW = Math.max(inch(70), cardW - gp(fmt, tier.padX * 2))
      const numH = (sz(fmt, tier.num) * 1.2) / PT_PER_IN
      const out: number[] = []
      for (let r = 0; r < rows; r++) {
        let tallest = 0
        for (let col = 0; col < cols; col++) {
          const item = items[r * cols + col]
          if (!item) continue
          const h =
            gp(fmt, tier.padY * 2) +
            numH +
            gp(fmt, tier.gap) +
            textH(item, textW, sz(fmt, tier.size), tier.lh * fmt.lineScale)
          if (h > tallest) tallest = h
        }
        out.push(tallest)
      }
      return out
    }
    const total = (tier: (typeof CARD_TIERS)[number]): number => {
      const hs = rowHeights(tier)
      let sum = gp(fmt, tier.grid) * Math.max(0, rows - 1)
      for (let i = 0; i < hs.length; i++) sum += hs[i]
      return sum
    }
    const tier = pickTier(CARD_TIERS, total, avail)
    fmt = fitScale(fmt, (f) => { fmt = f; return total(tier) }, avail)
    ctx = { ...ctx, fmt }
    const hs = rowHeights(tier)
    const cardW = (contentW - gp(fmt, tier.grid) * (cols - 1)) / cols
    const textW = cardW - gp(fmt, tier.padX * 2)
    const numH = (sz(fmt, tier.num) * 1.2) / PT_PER_IN
    // Izgara dikeyde ortalanır (`.sn-stats`/kart ızgaraları `align-content: center`).
    let y = top + Math.max(0, (avail - total(tier)) / 2)

    for (let r = 0; r < rows; r++) {
      for (let col = 0; col < cols; col++) {
        const i = r * cols + col
        if (i >= items.length) break
        const box = { x: GRID.marginX + col * (cardW + gp(fmt, tier.grid)), y, w: cardW, h: hs[r] }
        panel(ctx, box)
        putText(ctx, String(i + 1).padStart(2, '0'), {
          x: box.x + gp(fmt, tier.padX),
          y: box.y + gp(fmt, tier.padY),
          w: textW,
          h: numH,
        }, { size: sz(fmt, tier.num), lh: 1.2, role: 'accent', bold: true, valign: 'top', solo: true })
        putText(ctx, items[i], {
          x: box.x + gp(fmt, tier.padX),
          y: box.y + gp(fmt, tier.padY) + numH + gp(fmt, tier.gap),
          w: textW,
          h: box.h - gp(fmt, tier.padY * 2) - numH - gp(fmt, tier.gap),
        }, { size: sz(fmt, tier.size), lh: tier.lh, role: 'body', valign: 'top' })
      }
      y += hs[r] + gp(fmt, tier.grid)
    }
    return
  }

  // content-03 ekranda maddeleri HER ZAMAN iki kolona böler; diğer şablonlarda
  // bölme yalnızca liste sığmadığında devreye girer (bkz. `bulletsInto`).
  if (ctx.s.template === 'content-03' && c.bullets.length > 3) {
    const gap = inch(32)
    const colW = (contentW - gap) / 2
    const cut = Math.ceil(c.bullets.length / 2)
    const groups = [c.bullets.slice(0, cut), c.bullets.slice(cut)]
    const tier = pickBulletTier(fmt, groups, colW, avail)
    ctx = { ...ctx, fmt: fitScale(fmt, (f) => bulletsHMax(f, groups, colW, tier), avail) }
    for (let g = 0; g < groups.length; g++) {
      bulletBlock(ctx, groups[g], { x: GRID.marginX + g * (colW + gap), y: top, w: colW, h: avail }, tier)
    }
    return
  }

  bulletsInto(ctx, c.bullets, { x: GRID.marginX, y: top, w: contentW, h: avail })
}

/** Karşılaştırma satır kademeleri — ColumnsSlide → ROW_TIERS ile aynı px. */
const ROW_TIERS = [
  { padY: 14, padX: 18, size: 17, lh: 1.4, gap: 10, head: 18 },
  { padY: 11, padX: 15, size: 15, lh: 1.38, gap: 8, head: 16 },
  { padY: 8, padX: 12, size: 13, lh: 1.32, gap: 6, head: 14 },
  { padY: 6, padX: 10, size: 12, lh: 1.3, gap: 4, head: 13 },
]

/**
 * İki sütun / karşılaştırma.
 *
 * Panel içi ölçüler CSS `.sn-panel` (padding 26×28 px) ve `.sn-panel-head`
 * (19 px, 16 px alt boşluk) ile aynı. Sütun yüksekliği sonuç satırının ölçülen
 * yüksekliğinden düşülür: eskiden sabit 0.62 inç ayrılıyordu ve iki satırlık bir
 * sonuç cümlesi slayt dışına taşıyordu.
 */
function drawColumns(
  ctx: Ctx,
  left: ColumnBlock,
  right: ColumnBlock,
  opts: { verdict?: string; accentLeft?: boolean; rows?: boolean },
): void {
  const top = header(ctx)
  let fmt = ctx.fmt
  const gap = inch(22)
  const colW = (contentW - gap) / 2
  const avail = bodyAvail(ctx, top)

  // Sonuç satırı gövdenin üçte birinden fazlasını alamaz.
  const verdictFmt = opts.verdict ? fitExtra(fmt, opts.verdict, contentW, 18, 1.4, avail) : fmt
  const verdictSize = sz(verdictFmt, 18)
  const verdictH = opts.verdict ? boxH(verdictFmt, opts.verdict, contentW, verdictSize, 1.4) : 0
  const verdictCtx: Ctx = { ...ctx, fmt: verdictFmt }
  const colH = Math.max(inch(24), avail - (opts.verdict ? verdictH + gp(verdictFmt, 18) : 0))

  if (opts.rows) {
    // comparison-02: satır satır eşleştirme. Kutu yükseklikleri satırın en uzun
    // metnine göre; kalan alan yetmezse kademe iner.
    const pairs = Math.max(left.bullets.length, right.bullets.length)
    const rowsH = (t: (typeof ROW_TIERS)[number]): number => {
      const w = colW - gp(fmt, t.padX * 2)
      let total = (sz(fmt, t.head) * 1.3 * fmt.lineScale) / PT_PER_IN + gp(fmt, t.gap) + gp(fmt, t.gap) * Math.max(0, pairs - 1)
      for (let i = 0; i < pairs; i++) {
        const a = textH(left.bullets[i] ?? '', w, sz(fmt, t.size), t.lh * fmt.lineScale)
        const b = textH(right.bullets[i] ?? '', w, sz(fmt, t.size), t.lh * fmt.lineScale)
        total += gp(fmt, t.padY * 2) + Math.max(a, b)
      }
      return total
    }
    const tier = pickTier(ROW_TIERS, rowsH, colH)
    fmt = fitScale(fmt, (f) => { fmt = f; return rowsH(tier) }, colH)
    ctx = { ...ctx, fmt }
    const textW = colW - gp(fmt, tier.padX * 2)
    const headH = (sz(fmt, tier.head) * 1.3 * fmt.lineScale) / PT_PER_IN
    let y = top
    const heads = [left.heading, right.heading]
    for (let i = 0; i < heads.length; i++) {
      if (!heads[i]) continue
      putText(ctx, heads[i], { x: GRID.marginX + i * (colW + gap), y, w: colW, h: headH }, {
        size: sz(fmt, tier.head),
        lh: 1.3,
        role: i === 0 ? 'accent' : 'accent2',
        bold: true,
        valign: 'top',
      })
    }
    y += headH + gp(fmt, tier.gap)
    for (let i = 0; i < pairs; i++) {
      const a = textH(left.bullets[i] ?? '', textW, sz(fmt, tier.size), tier.lh * fmt.lineScale)
      const b = textH(right.bullets[i] ?? '', textW, sz(fmt, tier.size), tier.lh * fmt.lineScale)
      const rowH = gp(fmt, tier.padY * 2) + Math.max(a, b)
      const cells = [left.bullets[i], right.bullets[i]]
      for (let col = 0; col < cells.length; col++) {
        if (!cells[col]) continue
        const x = GRID.marginX + col * (colW + gap)
        panel(ctx, { x, y, w: colW, h: rowH })
        putText(ctx, cells[col], {
          x: x + gp(fmt, tier.padX),
          y: y + gp(fmt, tier.padY),
          w: textW,
          h: rowH - gp(fmt, tier.padY * 2),
        }, { size: sz(fmt, tier.size), lh: tier.lh, role: 'body', valign: 'top' })
      }
      y += rowH + gp(fmt, tier.gap)
    }
    if (opts.verdict) {
      putText(verdictCtx, opts.verdict, { x: GRID.marginX, y: top + colH + gp(verdictFmt, 18), w: contentW, h: verdictH }, {
        size: verdictSize,
        lh: 1.4,
        role: 'body',
        italic: true,
        align: 'center',
        valign: 'top',
      })
    }
    return
  }

  /*
   * Panelin iç bütçesi: iç boşluk + panel başlığı, listeye en az `MIN_LIST` yer
   * bırakacak kadar olmalı. Bırakmıyorsa panelin İÇ ölçüleri küçülür (dış kutu
   * sabit); eskiden liste için "en az şu kadar" uydurulup panel taşıyordu.
   */
  const MIN_LIST = inch(40)
  const innerW0 = colW - inch(28) * 2
  const headText = (left.heading?.length ?? 0) > (right.heading?.length ?? 0) ? left.heading : right.heading
  const panelFmt = fitScale(
    fmt,
    (f) => gp(f, 26) * 2 + (headText ? boxH(f, headText, innerW0, sz(f, 19), 1.3) + gp(f, 16) : 0) + MIN_LIST,
    colH,
  )
  const padX = gp(panelFmt, 28)
  const padY = gp(panelFmt, 26)
  const headSize = sz(panelFmt, 19)
  const innerW = colW - padX * 2
  const headH = Math.max(
    left.heading ? boxH(panelFmt, left.heading, innerW, headSize, 1.3) : 0,
    right.heading ? boxH(panelFmt, right.heading, innerW, headSize, 1.3) : 0,
  )
  // Başlık + 16 px alt boşluk (CSS `.sn-panel-head` margin-bottom).
  const listTop = headH > 0 ? padY + headH + gp(panelFmt, 16) : padY
  const listH = Math.max(inch(20), colH - listTop - padY)
  const groups = [left.bullets, right.bullets]
  const tier = pickBulletTier(fmt, groups, innerW, listH)
  // Panel başlığı kendi puntosunu korur; yalnızca liste küçülür (başlık kısa,
  // listeyi küçültmek okunurluğu daha az bozuyor).
  const listCtx: Ctx = { ...ctx, fmt: fitScale(fmt, (f) => bulletsHMax(f, groups, innerW, tier), listH) }

  const columns: { block: ColumnBlock; x: number; role: Role; fill?: string }[] = [
    {
      block: left,
      x: GRID.marginX,
      role: 'accent',
      fill: opts.accentLeft ? tint(ctx.theme, ctx.theme.accent, 0.9) : undefined,
    },
    { block: right, x: GRID.marginX + colW + gap, role: 'accent2' },
  ]

  for (let i = 0; i < columns.length; i++) {
    const col = columns[i]
    const box = { x: col.x, y: top, w: colW, h: colH }
    panel(ctx, box, col.fill)
    if (col.block.heading) {
      putText({ ...ctx, fmt: panelFmt }, col.block.heading, { x: box.x + padX, y: box.y + padY, w: innerW, h: headH }, {
        size: headSize,
        lh: 1.3,
        role: col.role,
        bold: true,
        valign: 'top',
      })
    }
    bulletBlock(listCtx, col.block.bullets, { x: box.x + padX, y: box.y + listTop, w: innerW, h: listH }, tier)
  }

  if (opts.verdict) {
    putText(verdictCtx, opts.verdict, { x: GRID.marginX, y: top + colH + gp(verdictFmt, 18), w: contentW, h: verdictH }, {
      size: verdictSize,
      lh: 1.4,
      role: 'body',
      italic: true,
      align: 'center',
      valign: 'top',
    })
  }
}

/** İstatistik kart kademeleri — StatisticsSlide → STAT_TIERS ile aynı px. */
const STAT_TIERS = [
  { padY: 26, padX: 22, gap: 10, value: 54, label: 17, cap: 14, grid: 20 },
  { padY: 18, padX: 18, gap: 8, value: 40, label: 15, cap: 13, grid: 14 },
  { padY: 13, padX: 14, gap: 6, value: 31, label: 14, cap: 12, grid: 10 },
]

/**
 * Dev sayının satır yüksekliği. Ekranda `line-height: 1`; PowerPoint'te bu değer
 * rakamların üstünü kırpma riski taşıdığı için kutuya 1.1 pay bırakılır.
 */
const STAT_VALUE_LH = 1.1

/** Kolon adedi (StatisticsSlide → columnsFor). */
function statColumns(template: string, count: number): number {
  if (count <= 1) return 1
  if (template === 'statistics-02') {
    if (count <= 2) return count
    if (count <= 4) return 2
    return count <= 6 ? 3 : 4
  }
  if (count <= 4) return count
  return count <= 6 ? 3 : 4
}

/** Uzun değerler ("1.284.000") ekranda %70 punto ile yazılır. */
function statValuePx(stat: StatItem, base: number): number {
  return stat.value.length > 6 ? base * 0.7 : base
}

function drawStatistics(ctx: Ctx, c: StatisticsContent): void {
  const top = header(ctx)
  const items = c.stats
  if (items.length === 0) return
  let fmt = ctx.fmt

  // Dipnot gövdenin İÇİNDE (ekranda `.sn-footnote`, 14 px + 16 px üst boşluk);
  // kartlara kalan alandan düşülmezse üstüne biner.
  const bodyH = bodyAvail(ctx, top)
  const footFmt = c.footnote ? fitExtra(fmt, c.footnote, contentW, 14, 1.4, bodyH) : fmt
  const footSize = sz(footFmt, 14)
  const footH = c.footnote ? boxH(footFmt, c.footnote, contentW, footSize, 1.4) + gp(footFmt, 16) : 0
  const avail = Math.max(inch(24), bodyH - footH)

  const cols = statColumns(ctx.s.template, items.length)
  const rows = Math.ceil(items.length / cols)

  const cardH = (tier: (typeof STAT_TIERS)[number], stat: StatItem, textW: number): number => {
    const valuePt = sz(fmt, statValuePx(stat, tier.value))
    let h = gp(fmt, tier.padY * 2) + (valuePt * STAT_VALUE_LH) / PT_PER_IN
    h += gp(fmt, tier.gap) + textH(stat.label, textW, sz(fmt, tier.label), 1.35 * fmt.lineScale)
    if (stat.caption) h += gp(fmt, tier.gap) + textH(stat.caption, textW, sz(fmt, tier.cap), 1.4 * fmt.lineScale)
    return h
  }
  const rowHeights = (tier: (typeof STAT_TIERS)[number]): number[] => {
    const cardW = (contentW - gp(fmt, tier.grid) * (cols - 1)) / cols
    const textW = Math.max(inch(90), cardW - gp(fmt, tier.padX * 2))
    const out: number[] = []
    for (let r = 0; r < rows; r++) {
      let tallest = 0
      for (let col = 0; col < cols; col++) {
        const stat = items[r * cols + col]
        if (!stat) continue
        const h = cardH(tier, stat, textW)
        if (h > tallest) tallest = h
      }
      out.push(tallest)
    }
    return out
  }
  const total = (tier: (typeof STAT_TIERS)[number]): number => {
    const hs = rowHeights(tier)
    let sum = gp(fmt, tier.grid) * Math.max(0, rows - 1)
    for (let i = 0; i < hs.length; i++) sum += hs[i]
    return sum
  }

  const tier = pickTier(STAT_TIERS, total, avail)
  fmt = fitScale(fmt, (f) => { fmt = f; return total(tier) }, avail)
  ctx = { ...ctx, fmt }
  const hs = rowHeights(tier)
  const cardW = (contentW - gp(fmt, tier.grid) * (cols - 1)) / cols
  const textW = cardW - gp(fmt, tier.padX * 2)
  let y = top + Math.max(0, (avail - total(tier)) / 2)

  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const i = r * cols + col
      if (i >= items.length) break
      const stat = items[i]
      const box = { x: GRID.marginX + col * (cardW + gp(fmt, tier.grid)), y, w: cardW, h: hs[r] }
      panel(ctx, box)
      const valuePt = sz(fmt, statValuePx(stat, tier.value))
      const valueH = (valuePt * STAT_VALUE_LH) / PT_PER_IN
      let inner = box.y + gp(fmt, tier.padY)
      putText(ctx, stat.value, { x: box.x + gp(fmt, tier.padX), y: inner, w: textW, h: valueH }, {
        size: valuePt,
        lh: STAT_VALUE_LH,
        role: 'accent',
        bold: true,
        align: 'center',
        valign: 'top',
        solo: true,
      })
      inner += valueH + gp(fmt, tier.gap)
      const labelH = textH(stat.label, textW, sz(fmt, tier.label), 1.35 * fmt.lineScale)
      putText(ctx, stat.label, { x: box.x + gp(fmt, tier.padX), y: inner, w: textW, h: labelH }, {
        size: sz(fmt, tier.label),
        lh: 1.35,
        role: 'body',
        bold: true,
        align: 'center',
        valign: 'top',
      })
      if (stat.caption) {
        inner += labelH + gp(fmt, tier.gap)
        putText(ctx, stat.caption, {
          x: box.x + gp(fmt, tier.padX),
          y: inner,
          w: textW,
          h: textH(stat.caption, textW, sz(fmt, tier.cap), 1.4 * fmt.lineScale),
        }, { size: sz(fmt, tier.cap), lh: 1.4, role: 'muted', align: 'center', valign: 'top' })
      }
    }
    y += hs[r] + gp(fmt, tier.grid)
  }

  if (c.footnote) {
    putText({ ...ctx, fmt: footFmt }, c.footnote, {
      x: GRID.marginX,
      y: ctx.bodyBottom - footH + gp(footFmt, 16),
      w: contentW,
      h: footH - gp(footFmt, 16),
    }, { size: footSize, lh: 1.4, role: 'muted', align: 'center', valign: 'top' })
  }
}

function drawChart(ctx: Ctx, c: ChartContent): void {
  const top = header(ctx)
  const { fmt, theme, pptx, slide } = ctx
  const series = seriesOf(theme)
  const labels = c.points.map((p) => p.label)
  const values = c.points.map((p) => p.value)
  const annotated = ctx.s.template === 'chart-02' || ctx.s.template === 'chart-03'
  const chartW = annotated ? contentW * 0.62 : contentW

  // Alt yazı ölçülür: sabit 0.38 inç ayırmak iki satırlık bir açıklamada
  // grafiğin üstüne binmesine yol açıyordu.
  const bodyH = bodyAvail(ctx, top)
  const capFmt = c.caption ? fitExtra(fmt, c.caption, contentW, 14, 1.4, bodyH) : fmt
  const capSize = sz(capFmt, 14)
  const capH = c.caption ? boxH(capFmt, c.caption, contentW, capSize, 1.4) + gp(capFmt, 8) : 0
  const chartH = Math.max(inch(60), bodyH - capH)

  const labelSize = sz(fmt, 18)
  const common = {
    x: GRID.marginX,
    y: top,
    w: chartW,
    h: chartH,
    chartColors: c.chartType === 'pie' || c.chartType === 'donut' ? series.map(pptxColor) : [pptxColor(theme.accent)],
    showLegend: c.chartType === 'pie' || c.chartType === 'donut',
    legendPos: 'r' as const,
    legendFontSize: labelSize,
    legendColor: pptxColor(ink(fmt, 'muted')),
    // Değer etiketleri her zaman açık: kimlik/büyüklük yalnızca renge bırakılmaz.
    showValue: true,
    dataLabelColor: pptxColor(c.chartType === 'pie' || c.chartType === 'donut' ? '#ffffff' : ink(fmt, 'body')),
    dataLabelFontSize: labelSize,
    dataLabelFontFace: fmt.fontFace,
    catAxisLabelColor: pptxColor(ink(fmt, 'muted')),
    valAxisLabelColor: pptxColor(ink(fmt, 'muted')),
    catAxisLabelFontSize: labelSize,
    valAxisLabelFontSize: labelSize,
    catAxisLabelFontFace: fmt.fontFace,
    valAxisLabelFontFace: fmt.fontFace,
    valGridLine: { color: pptxColor(theme.line), style: 'solid' as const, size: 0.5 },
    catGridLine: { style: 'none' as const },
    border: { pt: 0, color: pptxColor(theme.line) },
    fill: pptxColor(theme.bg),
  }

  const data = [{ name: c.unit || ctx.s.title || 'Seri', labels, values }]

  if (c.chartType === 'pie' || c.chartType === 'donut') {
    slide.addChart(c.chartType === 'donut' ? pptx.ChartType.doughnut : pptx.ChartType.pie, data, {
      ...common,
      holeSize: c.chartType === 'donut' ? 55 : undefined,
      dataLabelPosition: 'bestFit',
    })
  } else if (c.chartType === 'line') {
    slide.addChart(pptx.ChartType.line, data, { ...common, lineSize: 2.5, lineSmooth: false })
  } else {
    slide.addChart(pptx.ChartType.bar, data, { ...common, barDir: 'col', barGapWidthPct: 45 })
  }

  if (annotated) {
    // Sağ sütun: değerler metin olarak — grafik okunmasa bile veri kaybolmaz.
    const listX = GRID.marginX + chartW + inch(26)
    const listW = contentW - chartW - inch(26)
    const lines = c.points.map((p) => `${p.label}: ${formatMeasure(p.value, c.unit, ctx.lang)}`)
    bulletsInto(ctx, lines, { x: listX, y: top, w: listW, h: chartH }, 'muted')
  }

  if (c.caption) {
    putText({ ...ctx, fmt: capFmt }, c.caption, {
      x: GRID.marginX,
      y: top + chartH + gp(capFmt, 8),
      w: contentW,
      h: capH - gp(capFmt, 8),
    }, { size: capSize, lh: 1.4, role: 'muted', valign: 'top' })
  }
}

/** Zaman çizelgesi kademeleri — TimelineSlide → H_TIERS / V_TIERS ile aynı px. */
const TL_H_TIERS = [
  { label: 56, title: 18, tlh: 1.35, desc: 14, dlh: 1.4, descGap: 8 },
  { label: 44, title: 16, tlh: 1.3, desc: 13, dlh: 1.35, descGap: 6 },
  { label: 36, title: 14, tlh: 1.28, desc: 12, dlh: 1.3, descGap: 5 },
  { label: 30, title: 13, tlh: 1.25, desc: 11, dlh: 1.28, descGap: 4 },
]
const TL_V_TIERS = [
  { title: 18, tlh: 1.35, desc: 14, dlh: 1.4, descGap: 8, pad: 18 },
  { title: 16, tlh: 1.3, desc: 13, dlh: 1.35, descGap: 6, pad: 12 },
  { title: 14, tlh: 1.28, desc: 12, dlh: 1.3, descGap: 5, pad: 8 },
  { title: 13, tlh: 1.25, desc: 11, dlh: 1.28, descGap: 4, pad: 5 },
]

function drawTimeline(ctx: Ctx, c: TimelineContent): void {
  const top = header(ctx)
  const steps = c.steps
  if (steps.length === 0) return
  let fmt = ctx.fmt
  const avail = bodyAvail(ctx, top)

  if (ctx.s.template === 'timeline-02') {
    /*
     * Dikey ray: nokta + bağlantı çizgisi + satır metni.
     *
     * Son çare olarak İKİ KOLONA bölünür (ilk yarı solda, ikinci yarı sağda):
     * punto 5 pt tabanına dayandığı hâlde 8 dönem tek kolona sığmadığında tek
     * seçenek ya taşma ya bölme. Ekran bu durumda içeriği kırpıyor (overflow
     * hidden); dosyada kırpma olmadığı için bölmek hem içeriği korur hem
     * puntoyu okunur bırakır. Sığdığı sürece tek kolon kullanılır.
     */
    const railW = inch(54)
    const smallest = TL_V_TIERS[TL_V_TIERS.length - 1]
    const rowsFor = (cols: number): number => Math.ceil(steps.length / cols)
    const rowH = (tier: (typeof TL_V_TIERS)[number], i: number, colTextW: number): number => {
      const head = steps[i].label ? `${steps[i].label}  ${steps[i].title}` : steps[i].title
      let h = textH(head, colTextW, sz(fmt, tier.title), tier.tlh * fmt.lineScale)
      const desc = steps[i].description
      if (desc) h += gp(fmt, tier.descGap) + textH(desc, colTextW, sz(fmt, tier.desc), tier.dlh * fmt.lineScale)
      return h
    }
    const railH = (t: (typeof TL_V_TIERS)[number], cols: number, colTextW: number): number => {
      const perCol = rowsFor(cols)
      let tallest = 0
      for (let col = 0; col < cols; col++) {
        let sum = 0
        let count = 0
        for (let i = col * perCol; i < Math.min(steps.length, (col + 1) * perCol); i++) {
          sum += rowH(t, i, colTextW)
          count++
        }
        sum += gp(fmt, t.pad) * Math.max(0, count - 1)
        if (sum > tallest) tallest = sum
      }
      return tallest
    }
    const colGap = inch(26)
    const singleW = contentW - railW
    const splitColW = (contentW - colGap) / 2
    const splitTextW = splitColW - railW
    const cols =
      steps.length > 4 && railH(smallest, 1, singleW) > avail && railH(smallest, 2, splitTextW) < railH(smallest, 1, singleW)
        ? 2
        : 1
    const colW = cols === 2 ? splitColW : contentW
    const textW = cols === 2 ? splitTextW : singleW
    const perCol = rowsFor(cols)
    const tier = pickTier(TL_V_TIERS, (t) => railH(t, cols, textW), avail)
    fmt = fitScale(fmt, (f) => { fmt = f; return railH(tier, cols, textW) }, avail)
    ctx = { ...ctx, fmt }

    for (let col = 0; col < cols; col++) {
      const x0 = GRID.marginX + col * (colW + colGap)
      const last = Math.min(steps.length, (col + 1) * perCol) - 1
      let y = top
      for (let i = col * perCol; i <= last; i++) {
        const h = rowH(tier, i, textW)
        const titleSize = sz(fmt, tier.title)
        const head = steps[i].label ? `${steps[i].label}  ${steps[i].title}` : steps[i].title
        const titleH = textH(head, textW, titleSize, tier.tlh * fmt.lineScale)
        const titleLineH = (titleSize * tier.tlh * fmt.lineScale) / PT_PER_IN
        // Nokta ilk satırın ortasına hizalanır (ekranda da öyle).
        const dotY = y + titleLineH / 2 - inch(9)
        ctx.slide.addShape(ctx.pptx.ShapeType.ellipse, {
          x: x0 + inch(6),
          y: dotY,
          w: inch(18),
          h: inch(18),
          fill: { color: pptxColor(ctx.theme.accent) },
          line: { type: 'none' },
        })
        if (i < last) {
          const lineTop = dotY + inch(18)
          bar(ctx, { x: x0 + inch(14), y: lineTop, w: inch(2), h: Math.max(inch(4), y + h + gp(fmt, tier.pad) - lineTop) }, ctx.theme.line)
        }
        const runs: TextRuns = [
          ...(steps[i].label
            ? [{ text: `${steps[i].label}  `, options: { bold: true, color: pptxColor(ink(fmt, 'accent')) } }]
            : []),
          { text: steps[i].title, options: { bold: true, color: pptxColor(ink(fmt, 'body')) } },
        ]
        putText(ctx, runs, { x: x0 + railW, y, w: textW, h: titleH }, {
          size: titleSize,
          lh: tier.tlh,
          role: 'body',
          valign: 'top',
        })
        const desc = steps[i].description
        if (desc) {
          const descSize = sz(fmt, tier.desc)
          putText(ctx, desc, {
            x: x0 + railW,
            y: y + titleH + gp(fmt, tier.descGap),
            w: textW,
            h: textH(desc, textW, descSize, tier.dlh * fmt.lineScale),
          }, { size: descSize, lh: tier.dlh, role: 'muted', valign: 'top' })
        }
        y += h + gp(fmt, tier.pad)
      }
    }
    return
  }

  // Yatay: üstte dönem etiketi, ortada çizgi + nokta, altında adım metni.
  const colW = contentW / steps.length
  const textW = Math.max(inch(60), colW - inch(20))
  const dotArea = gp(fmt, 30)
  const colH = (tier: (typeof TL_H_TIERS)[number], i: number): number => {
    let h = textH(steps[i].title, textW, sz(fmt, tier.title), tier.tlh * fmt.lineScale)
    const desc = steps[i].description
    if (desc) h += gp(fmt, tier.descGap) + textH(desc, textW, sz(fmt, tier.desc), tier.dlh * fmt.lineScale)
    return h
  }
  const stripH = (t: (typeof TL_H_TIERS)[number]): number => {
    let tallest = 0
    for (let i = 0; i < steps.length; i++) tallest = Math.max(tallest, colH(t, i))
    return gp(fmt, t.label) + dotArea + tallest
  }
  const tier = pickTier(TL_H_TIERS, stripH, avail)
  fmt = fitScale(fmt, (f) => { fmt = f; return stripH(tier) }, avail)
  ctx = { ...ctx, fmt }
  const labelH = gp(fmt, tier.label)
  const lineY = top + labelH + dotArea / 2

  bar(ctx, { x: GRID.marginX, y: lineY, w: contentW, h: inch(2) }, ctx.theme.line)

  for (let i = 0; i < steps.length; i++) {
    const cx = GRID.marginX + colW * i + colW / 2
    ctx.slide.addShape(ctx.pptx.ShapeType.ellipse, {
      x: cx - inch(13),
      y: lineY - inch(12),
      w: inch(26),
      h: inch(26),
      fill: { color: pptxColor(ctx.theme.accent) },
      line: { color: pptxColor(ctx.theme.bg), width: 1.5 },
    })
    if (steps[i].label) {
      // Etiket, çizginin ÜSTÜNDE ve alta yaslı — kaç satır sürerse yukarı büyür.
      const size = sz(fmt, tier.title - 2)
      putText(ctx, steps[i].label, { x: cx - colW / 2, y: top, w: colW, h: labelH }, {
        size,
        lh: 1.25,
        role: 'accent',
        bold: true,
        align: 'center',
        valign: 'bottom',
      })
    }
    const titleSize = sz(fmt, tier.title)
    const titleH = textH(steps[i].title, textW, titleSize, tier.tlh * fmt.lineScale)
    const bodyY = lineY + dotArea / 2
    putText(ctx, steps[i].title, { x: cx - textW / 2, y: bodyY, w: textW, h: titleH }, {
      size: titleSize,
      lh: tier.tlh,
      role: 'body',
      bold: true,
      align: 'center',
      valign: 'top',
    })
    const desc = steps[i].description
    if (desc) {
      const descSize = sz(fmt, tier.desc)
      putText(ctx, desc, {
        x: cx - textW / 2,
        y: bodyY + titleH + gp(fmt, tier.descGap),
        w: textW,
        h: textH(desc, textW, descSize, tier.dlh * fmt.lineScale),
      }, { size: descSize, lh: tier.dlh, role: 'muted', align: 'center', valign: 'top' })
    }
  }
}

/** Süreç kademeleri — ProcessSlide → H_TIERS / V_TIERS ile aynı px. */
const PR_H_TIERS = [
  { padY: 24, padX: 20, gap: 12, num: 15, title: 19, tlh: 1.3, desc: 14, dlh: 1.4, arrow: 44 },
  { padY: 18, padX: 16, gap: 9, num: 14, title: 17, tlh: 1.28, desc: 13, dlh: 1.35, arrow: 34 },
  { padY: 13, padX: 13, gap: 7, num: 13, title: 15, tlh: 1.26, desc: 12, dlh: 1.3, arrow: 28 },
  { padY: 10, padX: 11, gap: 5, num: 12, title: 14, tlh: 1.24, desc: 11, dlh: 1.28, arrow: 24 },
]
const PR_V_TIERS = [
  { padY: 16, padX: 22, badge: 40, gap: 18, title: 18, tlh: 1.3, desc: 14, dlh: 1.4, row: 12 },
  { padY: 12, padX: 18, badge: 34, gap: 14, title: 16, tlh: 1.28, desc: 13, dlh: 1.35, row: 9 },
  { padY: 9, padX: 15, badge: 29, gap: 12, title: 15, tlh: 1.26, desc: 12, dlh: 1.3, row: 7 },
  { padY: 7, padX: 12, badge: 25, gap: 10, title: 13, tlh: 1.24, desc: 11, dlh: 1.28, row: 5 },
]

function drawProcess(ctx: Ctx, c: ProcessContent): void {
  const top = header(ctx)
  const steps = c.steps
  if (steps.length === 0) return
  let fmt = ctx.fmt
  const avail = bodyAvail(ctx, top)

  if (ctx.s.template !== 'process-01' || steps.length > 5) {
    /*
     * Numaralı dikey adımlar (ekranda 5 adımdan fazlası da buraya düşüyor).
     *
     * 6'dan fazla adım İKİ KOLONA bölünür — ekrandaki ProcessSlide ile aynı
     * karar ve aynı gerekçe: 8 adımı tek kolonda tutmak puntoyu okunmaz hâle
     * getiriyor ya da listeyi alttaki bandın üstüne taşırıyor.
     */
    const cols = steps.length > 6 ? 2 : 1
    const colGap = inch(20)
    const colW = (contentW - colGap * (cols - 1)) / cols
    const perCol = Math.ceil(steps.length / cols)
    const rowH = (tier: (typeof PR_V_TIERS)[number], i: number): number => {
      const textW = colW - gp(fmt, tier.padX * 2) - gp(fmt, tier.badge) - gp(fmt, tier.gap)
      let text = textH(steps[i].title, textW, sz(fmt, tier.title), tier.tlh * fmt.lineScale)
      const desc = steps[i].description
      if (desc) text += textH(desc, textW, sz(fmt, tier.desc), tier.dlh * fmt.lineScale)
      return gp(fmt, tier.padY * 2) + Math.max(gp(fmt, tier.badge), text)
    }
    // En uzun kolon belirleyici: kolonlar aynı Y'den başlar.
    const stackH = (t: (typeof PR_V_TIERS)[number]): number => {
      let tallest = 0
      for (let col = 0; col < cols; col++) {
        let sum = 0
        let count = 0
        for (let i = col * perCol; i < Math.min(steps.length, (col + 1) * perCol); i++) {
          sum += rowH(t, i)
          count++
        }
        sum += gp(fmt, t.row) * Math.max(0, count - 1)
        if (sum > tallest) tallest = sum
      }
      return tallest
    }
    const tier = pickTier(PR_V_TIERS, stackH, avail)
    fmt = fitScale(fmt, (f) => { fmt = f; return stackH(tier) }, avail)
    ctx = { ...ctx, fmt }
    const textW = colW - gp(fmt, tier.padX * 2) - gp(fmt, tier.badge) - gp(fmt, tier.gap)
    for (let col = 0; col < cols; col++) {
      const x0 = GRID.marginX + col * (colW + colGap)
      const textX = x0 + gp(fmt, tier.padX) + gp(fmt, tier.badge) + gp(fmt, tier.gap)
      let y = top
      for (let i = col * perCol; i < Math.min(steps.length, (col + 1) * perCol); i++) {
        const h = rowH(tier, i)
        panel(ctx, { x: x0, y, w: colW, h })
        const badge = gp(fmt, tier.badge)
        ctx.slide.addShape(ctx.pptx.ShapeType.roundRect, {
          x: x0 + gp(fmt, tier.padX),
          y: y + (h - badge) / 2,
          w: badge,
          h: badge,
          rectRadius: 0.06,
          fill: { color: pptxColor(ctx.theme.accent) },
          line: { type: 'none' },
        })
        putText(ctx, String(i + 1), {
          x: x0 + gp(fmt, tier.padX),
          y: y + (h - badge) / 2,
          w: badge,
          h: badge,
        }, { size: sz(fmt, tier.title), lh: 1.2, role: 'onAccent', bold: true, align: 'center', valign: 'middle', solo: true })

        const titleSize = sz(fmt, tier.title)
        const titleH = textH(steps[i].title, textW, titleSize, tier.tlh * fmt.lineScale)
        const desc = steps[i].description
        const descH = desc ? textH(desc, textW, sz(fmt, tier.desc), tier.dlh * fmt.lineScale) : 0
        let inner = y + (h - (titleH + descH)) / 2
        putText(ctx, steps[i].title, { x: textX, y: inner, w: textW, h: titleH }, {
          size: titleSize,
          lh: tier.tlh,
          role: 'body',
          bold: true,
          valign: 'top',
        })
        if (desc) {
          inner += titleH
          putText(ctx, desc, { x: textX, y: inner, w: textW, h: descH }, {
            size: sz(fmt, tier.desc),
            lh: tier.dlh,
            role: 'muted',
            valign: 'top',
          })
        }
        y += h + gp(fmt, tier.row)
      }
    }
    return
  }

  // Yatay zincir: kutular arası oklar.
  const n = steps.length
  const cardH = (tier: (typeof PR_H_TIERS)[number]): number => {
    const cardW = (contentW - gp(fmt, tier.arrow) * (n - 1)) / n
    const textW = Math.max(inch(60), cardW - gp(fmt, tier.padX * 2))
    let tallest = 0
    for (let i = 0; i < n; i++) {
      let h = gp(fmt, tier.padY * 2) + (sz(fmt, tier.num) * 1.2) / PT_PER_IN + gp(fmt, tier.gap)
      h += textH(steps[i].title, textW, sz(fmt, tier.title), tier.tlh * fmt.lineScale)
      const desc = steps[i].description
      if (desc) h += gp(fmt, tier.gap) + textH(desc, textW, sz(fmt, tier.desc), tier.dlh * fmt.lineScale)
      if (h > tallest) tallest = h
    }
    return tallest
  }
  const tier = pickTier(PR_H_TIERS, cardH, avail)
  fmt = fitScale(fmt, (f) => { fmt = f; return cardH(tier) }, avail)
  ctx = { ...ctx, fmt }
  const boxW = (contentW - gp(fmt, tier.arrow) * (n - 1)) / n
  const textW = boxW - gp(fmt, tier.padX * 2)
  const boxHeight = Math.min(cardH(tier), avail)
  const y = top + Math.max(0, (avail - boxHeight) / 2)
  const numH = (sz(fmt, tier.num) * 1.2) / PT_PER_IN

  for (let i = 0; i < n; i++) {
    const x = GRID.marginX + i * (boxW + gp(fmt, tier.arrow))
    panel(ctx, { x, y, w: boxW, h: boxHeight })
    putText(ctx, String(i + 1).padStart(2, '0'), {
      x: x + gp(fmt, tier.padX),
      y: y + gp(fmt, tier.padY),
      w: textW,
      h: numH,
    }, { size: sz(fmt, tier.num), lh: 1.2, role: 'accent', bold: true, align: 'center', valign: 'top', solo: true })

    const titleSize = sz(fmt, tier.title)
    const titleH = textH(steps[i].title, textW, titleSize, tier.tlh * fmt.lineScale)
    let inner = y + gp(fmt, tier.padY) + numH + gp(fmt, tier.gap)
    putText(ctx, steps[i].title, { x: x + gp(fmt, tier.padX), y: inner, w: textW, h: titleH }, {
      size: titleSize,
      lh: tier.tlh,
      role: 'body',
      bold: true,
      align: 'center',
      valign: 'top',
    })
    const desc = steps[i].description
    if (desc) {
      inner += titleH + gp(fmt, tier.gap)
      putText(ctx, desc, {
        x: x + gp(fmt, tier.padX),
        y: inner,
        w: textW,
        h: textH(desc, textW, sz(fmt, tier.desc), tier.dlh * fmt.lineScale),
      }, { size: sz(fmt, tier.desc), lh: tier.dlh, role: 'muted', align: 'center', valign: 'top' })
    }
    if (i < n - 1) {
      ctx.slide.addShape(ctx.pptx.ShapeType.rightArrow, {
        x: x + boxW + inch(6),
        y: y + boxHeight / 2 - inch(11),
        w: gp(fmt, tier.arrow) - inch(12),
        h: inch(22),
        fill: { color: pptxColor(ctx.theme.accent) },
        line: { type: 'none' },
      })
    }
  }
}

/** Mimari katman kademeleri — ArchitectureSlide → LAYER_TIERS ile aynı px. */
const LAYER_TIERS = [
  { padY: 16, padX: 20, name: 17, node: 15, nodePadY: 9, nodePadX: 14, nodeGap: 10, gap: 12, nameW: 210 },
  { padY: 12, padX: 16, name: 15, node: 13, nodePadY: 7, nodePadX: 11, nodeGap: 8, gap: 9, nameW: 180 },
  { padY: 9, padX: 13, name: 14, node: 12, nodePadY: 5, nodePadX: 9, nodeGap: 6, gap: 7, nameW: 160 },
  { padY: 7, padX: 11, name: 13, node: 11, nodePadY: 4, nodePadX: 8, nodeGap: 5, gap: 5, nameW: 140 },
]

function drawArchitecture(ctx: Ctx, c: ArchitectureContent): void {
  const top = header(ctx)
  const layers = c.layers
  if (layers.length === 0) return
  let fmt = ctx.fmt

  const bodyH = bodyAvail(ctx, top)
  const noteFmt = c.note ? fitExtra(fmt, c.note, contentW, 14, 1.4, bodyH) : fmt
  const noteSize = sz(noteFmt, 14)
  const noteH = c.note ? boxH(noteFmt, c.note, contentW, noteSize, 1.4) + gp(noteFmt, 12) : 0
  const avail = Math.max(inch(24), bodyH - noteH)

  const layerH = (tier: (typeof LAYER_TIERS)[number], i: number): number => {
    const nameW = inch(tier.nameW)
    const nameH = textH(layers[i].name, nameW, sz(fmt, tier.name), 1.3 * fmt.lineScale)
    const nodes = layers[i].nodes
    let nodeH = 0
    if (nodes.length > 0) {
      const areaW = contentW - gp(fmt, tier.padX * 2) - nameW - inch(18)
      const nodeW = (areaW - gp(fmt, tier.nodeGap) * (nodes.length - 1)) / nodes.length
      const chipTextW = Math.max(inch(24), nodeW - gp(fmt, tier.nodePadX * 2))
      let tallest = 0
      for (let j = 0; j < nodes.length; j++) {
        const h = gp(fmt, tier.nodePadY * 2) + textH(nodes[j], chipTextW, sz(fmt, tier.node), 1.25 * fmt.lineScale)
        if (h > tallest) tallest = h
      }
      nodeH = tallest
    }
    return gp(fmt, tier.padY * 2) + Math.max(nameH, nodeH)
  }
  const stackH = (t: (typeof LAYER_TIERS)[number]): number => {
    let sum = gp(fmt, t.gap) * Math.max(0, layers.length - 1)
    for (let i = 0; i < layers.length; i++) sum += layerH(t, i)
    return sum
  }
  const tier = pickTier(LAYER_TIERS, stackH, avail)
  fmt = fitScale(fmt, (f) => { fmt = f; return stackH(tier) }, avail)
  ctx = { ...ctx, fmt }

  /*
   * Ad sütununun GENİŞLİĞİ sığdırmayla daralmaz.
   *
   * Punto bir tabana (5 pt) kadar inebiliyor; sütunu da daraltmak o tabandan
   * sonra metni bir satır daha sardırıp katmanı UZATIYOR, yani sığdırmanın
   * tersine çalışıyordu. Yatay ölçüler yalnızca metne yer AÇTIĞI yönde ölçeklenir.
   */
  const nameW = inch(tier.nameW)
  let y = top
  for (let i = 0; i < layers.length; i++) {
    const h = layerH(tier, i)
    panel(ctx, { x: GRID.marginX, y, w: contentW, h })
    const nameH = textH(layers[i].name, nameW, sz(fmt, tier.name), 1.3 * fmt.lineScale)
    putText(ctx, layers[i].name, {
      x: GRID.marginX + gp(fmt, tier.padX),
      y: y + (h - nameH) / 2,
      w: nameW,
      h: nameH,
    }, { size: sz(fmt, tier.name), lh: 1.3, role: 'accent', bold: true, valign: 'top' })

    const nodes = layers[i].nodes
    if (nodes.length === 0) {
      y += h + gp(fmt, tier.gap)
      continue
    }
    const areaX = GRID.marginX + gp(fmt, tier.padX) + nameW + inch(18)
    const areaW = contentW - gp(fmt, tier.padX * 2) - nameW - inch(18)
    const nodeW = (areaW - gp(fmt, tier.nodeGap) * (nodes.length - 1)) / nodes.length
    const chipTextW = Math.max(inch(24), nodeW - gp(fmt, tier.nodePadX * 2))
    let chipH = 0
    for (let j = 0; j < nodes.length; j++) {
      chipH = Math.max(chipH, gp(fmt, tier.nodePadY * 2) + textH(nodes[j], chipTextW, sz(fmt, tier.node), 1.25 * fmt.lineScale))
    }
    for (let j = 0; j < nodes.length; j++) {
      const nx = areaX + j * (nodeW + gp(fmt, tier.nodeGap))
      const ny = y + (h - chipH) / 2
      ctx.slide.addShape(ctx.pptx.ShapeType.roundRect, {
        x: nx,
        y: ny,
        w: nodeW,
        h: chipH,
        rectRadius: 0.05,
        fill: { color: pptxColor(tint(ctx.theme, ctx.theme.accent, 0.82)) },
        line: { color: pptxColor(ctx.theme.accent), width: 0.75 },
      })
      putText(ctx, nodes[j], { x: nx + gp(fmt, tier.nodePadX), y: ny + gp(fmt, tier.nodePadY), w: chipTextW, h: chipH - gp(fmt, tier.nodePadY * 2) }, {
        size: sz(fmt, tier.node),
        lh: 1.25,
        role: 'body',
        align: 'center',
        valign: 'top',
      })
    }
    y += h + gp(fmt, tier.gap)
  }

  if (c.note) {
    putText({ ...ctx, fmt: noteFmt }, c.note, {
      x: GRID.marginX,
      y: ctx.bodyBottom - noteH + gp(noteFmt, 12),
      w: contentW,
      h: noteH - gp(noteFmt, 12),
    }, { size: noteSize, lh: 1.4, role: 'muted', valign: 'top' })
  }
}

function drawImage(ctx: Ctx, c: ImageContent): void {
  const top = header(ctx)
  const { fmt } = ctx
  const full = ctx.s.template === 'image-02' || c.bullets.length === 0
  const bodyH = bodyAvail(ctx, top)
  const capFmt = c.caption ? fitExtra(fmt, c.caption, contentW, 14, 1.4, bodyH) : fmt
  const capSize = sz(capFmt, 14)
  const capH = c.caption ? boxH(capFmt, c.caption, contentW, capSize, 1.4) + gp(capFmt, 8) : 0
  const areaH = Math.max(inch(60), bodyH - capH)
  const imgW = full ? contentW : contentW * 0.52
  const box = { x: GRID.marginX, y: top, w: imgW, h: areaH }

  if (c.src) {
    // Gömülü (data:) görsel — kullanıcının kendi yüklediği dosya.
    ctx.slide.addImage({ data: c.src, x: box.x, y: box.y, w: box.w, h: box.h, sizing: { type: 'contain', w: box.w, h: box.h } })
  } else {
    // Yer tutucu: vurgu tonlu panel + geometrik işaret (harici görsel üretimi yok).
    panel(ctx, box, tint(ctx.theme, ctx.theme.accent, 0.88))
    ctx.slide.addShape(ctx.pptx.ShapeType.ellipse, {
      x: box.x + box.w / 2 - 0.45,
      y: box.y + box.h / 2 - 0.45,
      w: 0.9,
      h: 0.9,
      fill: { color: pptxColor(tint(ctx.theme, ctx.theme.accent, 0.55)) },
      line: { color: pptxColor(ctx.theme.accent), width: 1 },
    })
  }

  if (!full) {
    const listX = GRID.marginX + imgW + inch(36)
    const listW = contentW - imgW - inch(36)
    bulletsInto(ctx, c.bullets, { x: listX, y: top, w: listW, h: areaH })
  }

  if (c.caption) {
    putText({ ...ctx, fmt: capFmt }, c.caption, {
      x: GRID.marginX,
      y: top + areaH + gp(capFmt, 8),
      w: contentW,
      h: capH - gp(capFmt, 8),
    }, { size: capSize, lh: 1.4, role: 'muted', align: full ? 'center' : 'left', valign: 'top' })
  }
}

/**
 * Alıntı. Punto kademeleri `.sn-quote-text` ile aynı (34 / 26 / 20 px, eşikler
 * 160 ve 320 karakter). Blok dikeyde ortalanır; eskiden y sabitti (1.55) ve
 * uzun alıntı kaynak satırının üstüne biniyordu.
 */
function drawQuote(ctx: Ctx, c: QuoteContent): void {
  const theme = ctx.theme
  if (ctx.s.template === 'quote-02') gradientBackground(ctx.pptx, ctx.slide, theme.heroFrom, theme.heroTo)

  const quoteW0 = contentW - inch(80)
  const quotePx0 = c.text.length > 320 ? 20 : c.text.length > 160 ? 26 : 34
  const quoteLh0 = c.text.length > 320 ? 1.38 : 1.32
  const by0 = [c.author, c.role].filter((v): v is string => !!v).join(' · ')
  const stack = (f: Fmt): number =>
    (sz(f, 96) * 0.62) / PT_PER_IN +
    inch(24) +
    boxH(f, c.text, quoteW0, sz(f, quotePx0), quoteLh0) +
    (by0 ? inch(24) + boxH(f, `— ${by0}`, quoteW0, sz(f, 17), 1.4) : 0)
  const usable = Math.max(inch(60), ctx.bodyBottom - GRID.top)
  const fmt = fitScale(ctx.fmt, stack, usable)
  ctx = { ...ctx, fmt }

  const markSize = sz(fmt, 96)
  // `.sn-quote-mark` ekranda 96 px punto ama yalnızca 52 px yüksekliğinde bir
  // kutuda durur (line-height 0.6); aynı oran korunur.
  const markH = (markSize * 0.62) / PT_PER_IN
  const quoteW = contentW - inch(80)
  const quotePx = c.text.length > 320 ? 20 : c.text.length > 160 ? 26 : 34
  const quoteLh = c.text.length > 320 ? 1.38 : 1.32
  const quoteSize = sz(fmt, quotePx)
  const quoteH = boxH(fmt, c.text, quoteW, quoteSize, quoteLh)

  const by = [c.author, c.role].filter((v): v is string => !!v).join(' · ')
  const bySize = sz(fmt, 17)
  const byH = by ? boxH(fmt, `— ${by}`, quoteW, bySize, 1.4) : 0

  // `.sn-quote`: gap 24 px, dikeyde ortalı.
  const stackH = markH + inch(24) + quoteH + (by ? inch(24) + byH : 0)
  let y = GRID.top + Math.max(0, (usable - stackH) / 2)

  putText(ctx, '“', { x: GRID.marginX, y, w: inch(160), h: markH }, {
    size: markSize,
    lh: 0.62,
    role: 'accent',
    bold: true,
    valign: 'top',
    solo: true,
  })
  y += markH + inch(24)
  putText(ctx, c.text, { x: GRID.marginX + inch(4), y, w: quoteW, h: quoteH }, {
    size: quoteSize,
    lh: quoteLh,
    role: 'body',
    italic: true,
    valign: 'top',
  })
  if (by) {
    y += quoteH + inch(24)
    putText(ctx, `— ${by}`, { x: GRID.marginX + inch(4), y, w: quoteW, h: byH }, {
      size: bySize,
      lh: 1.4,
      role: 'muted',
      valign: 'top',
    })
  }
}

function drawConclusion(ctx: Ctx, c: ConclusionContent): void {
  const fmt = ctx.fmt
  const s = ctx.s
  const theme = ctx.theme
  const hero = s.template !== 'conclusion-02'

  /*
   * `.sn-hero-cta`: 20 px punto, 28 px üst boşluk.
   *
   * Çağrı satırının bütçesi GÖVDEYE kalan yerden ölçülür (slaydın tamamından
   * değil): başlık bloğu büyükse gövde küçülüyor ve gövdenin üçte biri olarak
   * hesaplanan çağrı satırı maddelere yer bırakmıyordu.
   */
  const ctaFor = (room: number): { fmt: Fmt; size: number; gap: number; h: number } => {
    const f = c.cta ? fitExtra(fmt, c.cta, contentW, 20, 1.4, room) : fmt
    const size = sz(f, 20)
    const gap = gp(f, 28)
    return { fmt: f, size, gap, h: c.cta ? boxH(f, c.cta, contentW, size, 1.4) + gap : 0 }
  }

  if (hero) {
    gradientBackground(ctx.pptx, ctx.slide, theme.heroFrom, theme.heroTo)
    let y = GRID.top
    // Hero kapanış `header()` kullanmaz; başlık bütçesini elle uygular.
    const headFmt = fitScale(fmt, (f) => boxH(f, s.title, contentW, sz(f, titlePx(s.title)), 1.15) + gp(f, 20), ctx.headMax)
    const headCtx: Ctx = { ...ctx, fmt: headFmt }
    const titleSize = sz(headFmt, titlePx(s.title))
    const titleH = boxH(headFmt, s.title, contentW, titleSize, 1.15)
    putText(headCtx, s.title, { x: GRID.marginX, y, w: contentW, h: titleH }, {
      size: titleSize,
      lh: 1.15,
      role: 'body',
      bold: true,
      valign: 'top',
    })
    y += titleH
    bar(ctx, { x: GRID.marginX, y: y + gp(headFmt, 16), w: inch(72), h: inch(4) }, theme.accent)
    // ConclusionSlide: çizgiden sonra 30 px boşluk.
    y += gp(headFmt, 20) + gp(headFmt, 30)

    const cta = ctaFor(Math.max(inch(24), ctx.bodyBottom - y))
    const avail = Math.max(inch(24), ctx.bodyBottom - y - cta.h)
    const checklist = s.template === 'conclusion-03'
    if (checklist && c.bullets.length > 1) {
      const gap = inch(32)
      const colW = (contentW - gap) / 2
      const cut = Math.ceil(c.bullets.length / 2)
      const groups = [c.bullets.slice(0, cut), c.bullets.slice(cut)]
      const tier = pickBulletTier(fmt, groups, colW, avail)
      const listCtx: Ctx = { ...ctx, fmt: fitScale(fmt, (f) => bulletsHMax(f, groups, colW, tier), avail) }
      for (let g = 0; g < groups.length; g++) {
        bulletBlock(listCtx, groups[g], { x: GRID.marginX + g * (colW + gap), y, w: colW, h: avail }, tier, 'body')
      }
    } else {
      bulletsInto(ctx, c.bullets, { x: GRID.marginX, y, w: contentW, h: avail })
    }
    if (c.cta) {
      putText({ ...ctx, fmt: cta.fmt }, c.cta, { x: GRID.marginX, y: ctx.bodyBottom - cta.h + cta.gap, w: contentW, h: cta.h - cta.gap }, {
        size: cta.size,
        lh: 1.4,
        role: 'accent',
        bold: true,
        valign: 'top',
      })
    }
    return
  }

  const top = header(ctx)
  const room = bodyAvail(ctx, top)
  const cta = ctaFor(room)
  const avail = Math.max(inch(24), room - cta.h)
  bulletsInto(ctx, c.bullets, { x: GRID.marginX, y: top, w: contentW, h: avail })
  if (c.cta) {
    putText({ ...ctx, fmt: cta.fmt }, c.cta, { x: GRID.marginX, y: ctx.bodyBottom - cta.h + cta.gap, w: contentW, h: cta.h - cta.gap }, {
      size: cta.size,
      lh: 1.4,
      role: 'accent',
      bold: true,
      valign: 'top',
    })
  }
}

/**
 * Sayıyı birimiyle birlikte yazar. Yüzde işaretinin yeri dile göre değişir
 * (TR "%45", EN "45%") — React tarafındaki formatMeasure ile aynı kural.
 */
function formatMeasure(value: number, unit: string | undefined, lang: SunumLang): string {
  const n = Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100)
  if (!unit) return n
  if (unit === '%') return lang === 'en' ? `${n}%` : `%${n}`
  return `${n} ${unit}`
}

/* ============================== alt bantlar ve görsel ============================== */

/** Örnek bandının etiketi — sunum dilinde, ekrandaki bantla aynı sözcük. */
const EXAMPLE_LABEL: Record<SunumLang, string> = { tr: 'ÖRNEK', en: 'EXAMPLE' }

/**
 * Slaydın altında yer kaplayan üç blok: slayt görseli, örnek bandı, vurgu bandı.
 *
 * Ekranda bunlar gövdenin KARDEŞİ olarak basılır ve gövde yerlerini bilmezse
 * üstlerine biner — kullanıcının bildirdiği kaymaların en sık görülen hâli tam
 * olarak buydu. Ölçüler parts.tsx → `bandsHeight` / `mediaHeight` ile aynı.
 */
type Bottom = {
  /** Gövdenin alt sınırı (inç). */
  bodyBottom: number
  /** Başlık bloğuna ayrılan en büyük yükseklik. */
  headMax: number
  /** Bantların kendi punto ölçeği (bütçe aşılınca küçülür). */
  fmt: Fmt
  mediaY: number
  mediaH: number
  exampleY: number
  exampleH: number
  highlightY: number
  highlightH: number
}

/**
 * Gövdeye her hâlde bırakılan en küçük yer (150 px) — parts.tsx → `bodyHeight`
 * aynı tabanı kullanıyor. Baş + bantlar + görsel bu tabanı yiyecek kadar
 * büyükse üçü birlikte kısılır; ekranda o durumda içerik kırpılıyor, PPTX'te
 * kırpma olmadığı için küçültmek tek seçenek.
 */
const MIN_BODY = inch(150)

/** Örnek bandı iç boşluğu: 14 px dikey, 18 px yatay (CSS `.sn-example`). */
const EXAMPLE_PAD_Y = 14
const EXAMPLE_PAD_X = 18
/** Etiket sütunu + boşluk: ekranda metin sütunu 1136 − 36 − 52 − 14 = 1034 px. */
const EXAMPLE_LABEL_W = 52
const EXAMPLE_LABEL_GAP = 14

function measureBottom(fmt0: Fmt, s: Slide, banded: boolean): Bottom {
  const hasExample = banded && !!s.example
  const hasHighlight = banded && !!s.highlight
  const media = s.media

  // `background` içeriğin ARKASINDA durur, yer kaplamaz.
  // Şerit 212 px + 24 px üst boşluk = 236 px; köşe kutusu 184 + 24 = 208 px
  // (CSS `.sn-media-band` / `.sn-media-inset`, parts.tsx → MEDIA_BAND_H / INSET_H).
  const mediaFull = media
    ? media.placement === 'band'
      ? inch(236)
      : media.placement === 'inset'
        ? inch(208)
        : 0
    : 0

  const exTextW = contentW - inch(EXAMPLE_PAD_X * 2 + EXAMPLE_LABEL_W + EXAMPLE_LABEL_GAP)
  // Vurgu bandı: 26 px işaret + 12 px boşluk, metin 17 px / 1.4.
  const hlTextW = contentW - inch(38)
  const bandsH = (f: Fmt): number => {
    let h = 0
    if (hasExample) {
      h += inch(EXAMPLE_PAD_Y * 2) + textH(s.example as string, exTextW, sz(f, 17), 1.45 * f.lineScale)
    }
    if (hasHighlight) {
      // Örnek varsa vurgu bandı ona 14 px ile yapışır, yoksa 18 px üst boşluk alır.
      h += inch(hasExample ? 14 : 18) + textH(s.highlight as string, hlTextW, sz(f, 17), 1.4 * f.lineScale)
    }
    return h
  }

  /*
   * Dikey bütçe.
   *
   * Baş + bantlar + görsel birlikte slaydı doldurabiliyor (uzun başlık + uzun
   * örnek + görsel şeridi + büyük `textStyle.scale`). Ekranda gövde kırpılarak
   * kurtuluyor; PPTX'te kırpma olmadığı için üç blok da aynı oranda kısılır ve
   * gövdeye en az `MIN_BODY` kalır. Normal içerikte `squeeze === 1`, yani bu
   * hesap hiç devreye girmez.
   */
  const headFull = headHeight(fmt0, s)
  const need = headFull + bandsH(fmt0) + mediaFull
  const room = H - GRID.top - GRID.bottom - MIN_BODY
  const squeeze = need > room && need > 0 ? Math.max(0.5, room / need) : 1
  const fmt = squeeze < 1 ? fitScale(fmt0, bandsH, bandsH(fmt0) * squeeze) : fmt0
  const mediaH = mediaFull * squeeze

  const exampleH = hasExample
    ? inch(EXAMPLE_PAD_Y * 2) + textH(s.example as string, exTextW, sz(fmt, 17), 1.45 * fmt.lineScale)
    : 0
  const highlightH = hasHighlight
    ? textH(s.highlight as string, hlTextW, sz(fmt, 17), 1.4 * fmt.lineScale)
    : 0
  const hlGap = hasHighlight ? inch(hasExample ? 14 : 18) : 0

  const highlightY = H - GRID.bottom - highlightH
  const exampleY = (hasHighlight ? highlightY - hlGap : H - GRID.bottom) - exampleH
  const mediaTop = (hasExample ? exampleY : hasHighlight ? highlightY - hlGap : H - GRID.bottom) - mediaH

  return {
    bodyBottom: mediaTop,
    headMax: headFull * squeeze,
    fmt,
    // Görselin kendisi 24 px üst boşluktan sonra başlar.
    mediaY: mediaTop + inch(24) * squeeze,
    mediaH: mediaH > 0 ? mediaH - inch(24) * squeeze : 0,
    exampleY,
    exampleH,
    highlightY,
    highlightH,
  }
}

function drawBands(ctx: Ctx, bottom: Bottom, hasExample: boolean, hasHighlight: boolean): void {
  // Bantlar bütçeye göre kısılmış olabilir; ölçüm hangi punto ile yapıldıysa
  // çizim de onunla yapılmalı.
  const fmt = bottom.fmt
  ctx = { ...ctx, fmt }
  const s = ctx.s
  if (hasExample) {
    // Sol kenardaki vurgu çizgisi (CSS `border-left: 4px`).
    bar(ctx, { x: GRID.marginX, y: bottom.exampleY, w: inch(4), h: bottom.exampleH }, fmt.hero ? ctx.theme.onHero : ctx.theme.accent)
    const labelSize = sz(fmt, 12)
    const textSize = sz(fmt, 17)
    const textW = contentW - inch(EXAMPLE_PAD_X * 2 + EXAMPLE_LABEL_W + EXAMPLE_LABEL_GAP)
    putText(ctx, EXAMPLE_LABEL[ctx.lang], {
      x: GRID.marginX + inch(EXAMPLE_PAD_X),
      y: bottom.exampleY + inch(EXAMPLE_PAD_Y),
      w: inch(EXAMPLE_LABEL_W),
      h: (labelSize * 1.45) / PT_PER_IN,
    }, { size: labelSize, lh: 1.45, role: fmt.hero ? 'body' : 'accent', bold: true, valign: 'top', solo: true })
    putText(ctx, s.example as string, {
      x: GRID.marginX + inch(EXAMPLE_PAD_X + EXAMPLE_LABEL_W + EXAMPLE_LABEL_GAP),
      y: bottom.exampleY + inch(EXAMPLE_PAD_Y),
      w: textW,
      h: bottom.exampleH - inch(EXAMPLE_PAD_Y * 2),
    }, { size: textSize, lh: 1.45, role: fmt.hero ? 'body' : 'muted', valign: 'top' })
  }

  if (hasHighlight) {
    const size = sz(fmt, 17)
    // İşaret ilk satırın ortasına hizalanır.
    bar(ctx, {
      x: GRID.marginX,
      y: bottom.highlightY + (size * 1.4) / PT_PER_IN / 2 - inch(1.5),
      w: inch(26),
      h: inch(3),
    }, fmt.hero ? ctx.theme.onHero : ctx.theme.accent)
    putText(ctx, s.highlight as string, {
      x: GRID.marginX + inch(38),
      y: bottom.highlightY,
      w: contentW - inch(38),
      h: bottom.highlightH,
    }, { size, lh: 1.4, role: fmt.hero ? 'body' : 'accent', bold: true, valign: 'top' })
  }
}

/* ================================== derleyici ================================== */

/**
 * Slaytı PPTX'e çizer. `switch` ayrık birleşim üzerinde çalıştığı için yeni bir
 * slayt tipi eklendiğinde derleyici burayı da güncellemeye zorlar.
 */
function drawSlide(pptx: Pptx, theme: SunumTheme, s: Slide, lang: SunumLang): void {
  const slide = pptx.addSlide()
  slide.background = { color: pptxColor(theme.bg) }

  const fmt = fmtOf(theme, s)
  const banded = s.type !== 'title' && s.type !== 'quote'
  const hasExample = !!s.example && banded
  const hasHighlight = !!s.highlight && banded

  // Alt bloklar ÖLÇÜLÜR, sonra gövde onların üstünde kalan alanı kullanır.
  const bottom = measureBottom(fmt, s, banded)
  const ctx: Ctx = {
    pptx,
    slide,
    theme,
    fmt,
    s,
    bodyBottom: bottom.bodyBottom,
    headMax: bottom.headMax,
    lang,
  }

  const media = s.media
  if (media && media.placement === 'background') {
    // Tam sayfa görsel + üstüne tema zemininde yarı saydam perde: ekrandaki
    // `.sn-media-scrim`in karşılığı. PptxGenJS saydamlığı `transparency` ile verir.
    slide.addImage({ data: media.src, x: 0, y: 0, w: W, h: H, sizing: { type: 'cover', w: W, h: H } })
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: W,
      h: H,
      fill: { color: pptxColor(fmt.hero ? theme.heroFrom : theme.bg), transparency: 18 },
      line: { type: 'none' },
    })
  }

  switch (s.type) {
    case 'title':
      drawTitle(ctx, s.content)
      break
    case 'content':
      drawContent(ctx, s.content)
      break
    case 'two-column':
      drawColumns(ctx, s.content.left, s.content.right, { accentLeft: s.template === 'two-column-02' })
      break
    case 'comparison':
      drawColumns(ctx, s.content.left, s.content.right, {
        verdict: s.content.verdict,
        rows: s.template === 'comparison-02',
      })
      break
    case 'statistics':
      drawStatistics(ctx, s.content)
      break
    case 'chart':
      drawChart(ctx, s.content)
      break
    case 'timeline':
      drawTimeline(ctx, s.content)
      break
    case 'process':
      drawProcess(ctx, s.content)
      break
    case 'architecture':
      drawArchitecture(ctx, s.content)
      break
    case 'image':
      drawImage(ctx, s.content)
      break
    case 'quote':
      drawQuote(ctx, s.content)
      break
    case 'conclusion':
      drawConclusion(ctx, s.content)
      break
    default: {
      const exhaustive: never = s
      void exhaustive
    }
  }

  if (media && media.placement !== 'background' && bottom.mediaH > 0) {
    const inset = media.placement === 'inset'
    const w = inset ? contentW * 0.46 : contentW
    slide.addImage({
      data: media.src,
      x: inset ? GRID.marginX + (contentW - w) : GRID.marginX,
      y: bottom.mediaY,
      w,
      h: bottom.mediaH,
      sizing: { type: media.fit === 'contain' ? 'contain' : 'cover', w, h: bottom.mediaH },
    })
  }

  drawBands(ctx, bottom, hasExample, hasHighlight)

  if (s.notes) slide.addNotes(s.notes)
}

/** Sunumu PptxGenJS nesnesine derler. Çıktı biçimi çağırana bırakılır. */
export async function buildPptx(presentation: Presentation): Promise<Pptx> {
  // Dinamik import: pptxgenjs ~1 MB; yalnızca indirme anında yüklenir.
  const mod = await import('pptxgenjs')
  const PptxGenJS = (mod.default ?? mod) as unknown as new () => Pptx
  const pptx = new PptxGenJS()
  const theme = getTheme(presentation.theme)

  pptx.layout = 'LAYOUT_16x9'
  pptx.title = presentation.title
  pptx.subject = presentation.subtitle || presentation.title
  pptx.company = 'AI Sunum Stüdyosu'

  const slides = presentation.slides.slice().sort((a, b) => a.order - b.order)
  for (let i = 0; i < slides.length; i++) drawSlide(pptx, theme, slides[i], presentation.language)

  return pptx
}

/** Tarayıcı: indirilebilir Blob üretir. */
export async function pptxBlob(presentation: Presentation): Promise<Blob> {
  const pptx = await buildPptx(presentation)
  const out = await pptx.write({ outputType: 'blob' })
  return out as Blob
}

/** Sunucu: Node Buffer üretir (API rotası bunu gövde olarak döner). */
export async function pptxBuffer(presentation: Presentation): Promise<Uint8Array> {
  const pptx = await buildPptx(presentation)
  const out = await pptx.write({ outputType: 'nodebuffer' })
  return out as Uint8Array
}
