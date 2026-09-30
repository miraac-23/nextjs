/**
 * Slayt şablonlarının paylaştığı küçük parçalar + YERLEŞİM ÖLÇÜ MOTORU.
 *
 * Tema renkleri buradan satır içi CSS değişkeni olarak basılır; CSS dosyası
 * yalnızca yerleşimi ve tipografiyi bilir. Bu ayrım sayesinde yeni bir tema
 * eklemek için tek satır CSS yazmak gerekmez (bkz. lib/sunum/themes.ts).
 *
 * İkinci sorumluluk: "bu içerik 1280×720 kutuya sığıyor mu?" sorusunu
 * cevaplamak. Slayt SABİT ölçüde render edildiği için bu soru tarayıcıyı
 * beklemeden, saf aritmetikle yanıtlanabilir. Eski kod bunu yapmıyordu —
 * punto yalnızca "madde sayısı" gibi kaba bir sayaca bakıyordu ve başlığın
 * kaç satır sürdüğünü, alttaki örnek/vurgu bantlarının ne kadar yer kapladığını
 * hiç hesaba katmıyordu. Kaymaların asıl sebebi buydu.
 *
 * Üçüncü sorumluluk: kullanıcının metne uyguladığı biçimi (punto, satır aralığı,
 * kalın, hiza, renk rolü, yazı tipi) slayda taşımak. Biçim ölçüyü de değiştirdiği
 * için bu iki sorumluluk aynı dosyada durmak ZORUNDA: punto çarpanı ölçü motoruna
 * girmezse kullanıcı puntoyu büyüttüğünde metin kutudan taşıyor.
 */

import type { CSSProperties, ReactNode } from 'react'
import { fontVar, type SunumTheme } from '@/lib/sunum/themes'
import type { Slide, TextFont, TextStyle } from '@/lib/sunum/types'
import SunumGlyph from '../SunumGlyph'
import { EditableText } from './edit'

/**
 * Temayı (ve varsa kullanıcının metin biçimini) `.sn-slide` kökünde CSS
 * değişkenlerine çevirir.
 */
export function slideVars(theme: SunumTheme, style?: TextStyle): CSSProperties {
  // Özel CSS değişkenleri CSSProperties tipinde tanımlı değil; Record üzerinden geçilir.
  const vars: Record<string, string> = {
    '--sn-bg': theme.bg,
    '--sn-panel': theme.panel,
    '--sn-line': theme.line,
    '--sn-fg': theme.fg,
    '--sn-fg2': theme.fg2,
    '--sn-accent': theme.accent,
    '--sn-accent2': theme.accent2,
    '--sn-on-accent': theme.onAccent,
    '--sn-hero-from': theme.heroFrom,
    '--sn-hero-to': theme.heroTo,
    '--sn-on-hero': theme.onHero,
    '--sn-font': fontVar(theme.font),
  }
  const tx = textVars(style)
  for (let i = 0; i < TEXT_VAR_NAMES.length; i++) {
    const name = TEXT_VAR_NAMES[i]
    const value = tx[name]
    if (value !== undefined) vars[name] = value
  }
  return vars as CSSProperties
}

/* ============================== metin biçimi ==============================
   Kullanıcının seçtiği biçim slayda CSS DEĞİŞKENİ olarak geçer; tek bir yerde
   tanımlanır, miras yoluyla tüm metne iner. Alternatifi — her şablona biçim
   prop'u taşımak — 12 şablonu ve sonradan eklenecek her şablonu bu işi
   hatırlamaya mahkûm ederdi; değişken yaklaşımında unutulacak bir yer yok.

   Değişken adları `app/sunum/sunum.css` içindeki `var(--sn-tx-*)` yedekleriyle
   BİREBİR eşleşmeli.
   ============================================================================ */

const TEXT_VAR_NAMES = [
  '--sn-tx-scale',
  '--sn-tx-lh',
  '--sn-tx-weight',
  '--sn-tx-style',
  '--sn-tx-decoration',
  '--sn-tx-align',
  '--sn-tx-color',
  '--sn-tx-font',
] as const

/**
 * Yazı tipi seçenekleri. Liste KAPALI: kullanıcı serbest yazı tipi giremiyor,
 * yalnızca projenin yüklediği aileleri seçiyor. Böylece PPTX çıktısı ve ekran
 * aynı kalıyor, eksik font yüzünden yerleşim kaymıyor.
 */
const TEXT_FONT_STACKS: Record<Exclude<TextFont, 'theme'>, string> = {
  sans: 'var(--font-sans), system-ui, sans-serif',
  serif: 'var(--font-serif), Georgia, serif',
  display: 'var(--font-display), system-ui, sans-serif',
  mono: 'var(--font-mono), ui-monospace, SFMono-Regular, Menlo, monospace',
}

/**
 * Biçimi CSS değişkenlerine çevirir. Seçilmeyen alan HİÇ basılmaz: CSS tarafında
 * her kural `var(--sn-tx-*, <özgün değer>)` yazdığı için, değişkenin yokluğu
 * "temanın kendi değeri" anlamına gelir. Bu yüzden `default` ton da (ve `theme`
 * yazı tipi de) hiçbir değişken üretmez — kapak/gradyan slaytlarda metin kendi
 * ters kontrastını korur.
 */
export function textVars(style: TextStyle | undefined): Record<string, string> {
  const vars: Record<string, string> = {}
  if (!style) return vars
  if (style.scale !== undefined) vars['--sn-tx-scale'] = String(style.scale)
  if (style.lineHeight !== undefined) vars['--sn-tx-lh'] = String(style.lineHeight)
  // Kalın = 700: Word'ün karşılığı bu. Zaten 700 olan başlıklar değişmez.
  if (style.bold) vars['--sn-tx-weight'] = '700'
  if (style.italic) vars['--sn-tx-style'] = 'italic'
  if (style.underline) vars['--sn-tx-decoration'] = 'underline'
  if (style.align) vars['--sn-tx-align'] = style.align
  // Renk doğrudan HEX değil ROL üzerinden geçer; rolün karşılığını CSS belirler
  // (gradyan zeminde ters kontrast). Kontrat böyle korunuyor.
  if (style.tone === 'accent') vars['--sn-tx-color'] = 'var(--sn-tx-accent)'
  if (style.tone === 'muted') vars['--sn-tx-color'] = 'var(--sn-tx-muted)'
  if (style.font && style.font !== 'theme') vars['--sn-tx-font'] = TEXT_FONT_STACKS[style.font]
  return vars
}

/**
 * Biçim değişkenlerini slaydın KÖKÜNE (`.sn-slide`) yazar.
 *
 * NEDEN kök: metin her şablonda başka bir elemanda duruyor (başlık, madde, kart,
 * adım, alıntı…). Değişkenler miras alındığı için kökte bir kez tanımlamak
 * hepsini aynı anda biçimliyor.
 *
 * NEDEN `ref` ile DOM'a yazılıyor: kökü basan bileşen `SlideRenderer` ve o dosya
 * bu görevin kapsamı dışında — oraya satır içi stil geçemiyoruz. Buradan
 * erişilebilen tek nokta en yakın `.sn-slide` atası. `ref` geri çağrısı her
 * render'da yeniden çalıştığı için biçim değiştiğinde değerler tazelenir;
 * seçilmeyen alanlar SİLİNİR ki eski biçimden kalıntı kalmasın.
 *
 * `slideVars(theme, style)` de aynı değişkenleri üretiyor: kök satır içi stille
 * beslendiği gün burası kendiliğinden gereksiz hâle gelir, çakışmaz (aynı
 * değerler yazılır).
 */
function applyTextVars(el: HTMLElement | null, style: TextStyle | undefined): void {
  if (!el) return
  const root = el.closest('.sn-slide')
  if (!(root instanceof HTMLElement)) return
  const vars = textVars(style)
  for (let i = 0; i < TEXT_VAR_NAMES.length; i++) {
    const name = TEXT_VAR_NAMES[i]
    const value = vars[name]
    if (value === undefined) root.style.removeProperty(name)
    else root.style.setProperty(name, value)
  }
}

/* ============================== ölçü sabitleri ==============================
   Aşağıdaki sayılar app/sunum/sunum.css içindeki `.sn-slide` kutusuyla BİREBİR
   aynı olmalı. Biri değişirse diğeri de değişmeli; bu yüzden ikisi de yorumlu.
   ============================================================================ */

/** Yan boşluklar düşüldükten sonra kalan genişlik: 1280 − 2 × 72. */
export const CONTENT_W = 1136
/** Üst/alt boşluklar düşüldükten sonra kalan yükseklik: 720 − 64 − 56. */
export const CONTENT_H = 600
/** `.sn-head` alt boşluğu. */
const HEAD_GAP = 24

/**
 * Ortalama karakter genişliğinin punto'ya oranı.
 *
 * Sabit bir sayı kullanmak metni tek tek ölçmekten çok daha ucuz ve — slayt
 * sabit ölçüde olduğu için — yeterince doğru. Değer tarayıcıda kalibre edildi:
 * TR/EN karışık cümlelerde 13–40px aralığında satır başına düşen karakter
 * sayısı bu oranla ±%3 hata veriyor.
 */
const CHAR_RATIO = 0.485

/** Metnin verilen genişlikte kaç satır süreceğini kestirir. */
export function estimateLines(text: string, width: number, fontPx: number): number {
  if (!text) return 0
  const perLine = Math.max(6, Math.floor(width / (fontPx * CHAR_RATIO)))
  return Math.max(1, Math.ceil(text.length / perLine))
}

/** Metnin tek satırda kaplayacağı genişlik (px) — düğüm/etiket sarması için. */
export function textWidth(text: string, fontPx: number): number {
  return Math.ceil(text.length * fontPx * CHAR_RATIO)
}

/** Metnin kaplayacağı dikey alan (px). */
export function textHeight(text: string, width: number, fontPx: number, lineHeight: number): number {
  return estimateLines(text, width, fontPx) * Math.round(fontPx * lineHeight)
}

/* ------------------------------- başlık ölçüsü ------------------------------- */

/**
 * Başlık punto kademeleri. Üçüncü kademe yeni: 85 karakterden uzun başlıklar
 * 33px'te üç satıra taşıyor ve gövdeden 40px çalıyordu.
 */
function titleSize(title: string): number {
  if (title.length > 84) return 28
  if (title.length > 52) return 33
  return 40
}

/** `.sn-title` için punto sınıfı. */
export function titleClass(title: string): string {
  if (title.length > 84) return ' sn-title-xlong'
  if (title.length > 52) return ' sn-title-long'
  return ''
}

/** Uzun başlıklarda punto düşürmek için sınıf eki (kapak başlıkları kullanır). */
export function longClass(text: string, threshold = 52): string {
  return text.length > threshold ? ' sn-title-long' : ''
}

/* --------------------------- biçim çarpanları --------------------------- */

/**
 * Kullanıcının punto çarpanı. Biçim seçilmediyse 1 — yani hiçbir ölçü değişmez
 * ve motorun kalibrasyonu bozulmaz.
 */
function txScale(slide: Slide): number {
  const scale = slide.textStyle?.scale
  return scale === undefined ? 1 : scale
}

/** Kullanıcının satır aralığı çarpanı (1 = şablonun kendi değeri). */
function txLineHeight(slide: Slide): number {
  const lh = slide.textStyle?.lineHeight
  return lh === undefined ? 1 : lh
}

/**
 * Biçimin İÇERİK YÜKSEKLİĞİNE etkisi — kalan alanı bu sayıya bölüyoruz.
 *
 * NEDEN gerekli: şablonlar kendi kademe tablolarını SABİT px değerleriyle
 * hesaplıyor (CARD_TIERS, CHECK_TIERS, BULLET_TIERS…). Kullanıcı puntoyu
 * büyütünce o tablolar değişmiyor ama ekranda basılan metin büyüyor; telafi
 * edilmezse 8 maddelik bir slayt punto 1,35'te bantların üstüne biner.
 * Kademe tabloları başka dosyalarda olduğu için telafi TEK noktada yapılır:
 * "kullanılabilir alan" çarpana bölünür, böylece ölçeklenmemiş bir kademe
 * seçildiğinde gerçek yükseklik (kademe × çarpan) yine kutuya sığar.
 *
 * NEDEN punto KARESİ: sarmalayan metinde punto s katına çıkınca satıra sığan
 * karakter 1/s'e düşer, yani satır sayısı ~s katı olur; yükseklik satır × punto
 * olduğundan kapladığı alan s² büyür. Satır aralığı ise doğrusal çarpar.
 *
 * NEDEN 1'in altına inilmez: küçülterek taşma OLMAZ (kutuların iç boşlukları
 * küçülmediği için toplam yükseklik zaten düşer), ama 1'in altına bölmek
 * "daha çok yer var" diye yanlış yönde cesaret verirdi.
 */
export function textFactor(slide: Slide): number {
  const s = txScale(slide)
  return Math.max(1, s * s * txLineHeight(slide))
}

/** Başlık bloğunun (rozet + başlık + çizgi + alt başlık + boşluk) toplam yüksekliği. */
export function headHeight(slide: Slide): number {
  if (!slide.title && !slide.subtitle) return 0
  // Başlık ve alt başlık kestirimi TAM yapılabiliyor: metinleri burada elimizde,
  // punto da bilindiği için çarpanı doğrudan punto'ya uygulamak yeterli.
  const s = txScale(slide)
  const lh = txLineHeight(slide)
  let h = 0
  if (slide.title) {
    const size = titleSize(slide.title) * s
    // Rozet 54px + 18px boşluk kadar yatay yer kapar; başlık dar sütuna sarar.
    const width = CONTENT_W - (slide.icon ? 72 : 0)
    const lines = estimateLines(slide.title, width, size)
    h += Math.max(slide.icon ? 54 : 0, lines * Math.round(size * 1.15 * lh))
    h += 20 // .sn-rule: 16px üst boşluk + 4px kalınlık
  }
  if (slide.subtitle) h += 14 + textHeight(slide.subtitle, 533, 18 * s, 1.5 * lh)
  return h + HEAD_GAP
}

/* -------------------------------- bant ölçüsü -------------------------------- */

/**
 * Alttaki örnek + vurgu bantlarının toplam yüksekliği.
 *
 * Bantlar `SlideRenderer` tarafından gövdenin KARDEŞİ olarak basılır; gövde
 * onların yerini bilmezse üstlerine biner. Kullanıcının bildirdiği kaymaların
 * en sık görülen hâli tam olarak buydu.
 */
export function bandsHeight(slide: Slide): number {
  // Kapak ve alıntı slaytlarında bantlar basılmaz (bkz. SlideRenderer → banded).
  if (slide.type === 'title' || slide.type === 'quote') return 0
  // Bantlarda da metin elimizde; punto çarpanı doğrudan uygulanır. "Örnek"
  // etiketinin puntosu CSS'te bilinçli olarak ÖLÇEKLENMİYOR, bu yüzden metin
  // sütunu 1034px sabitiyle hesaplanmaya devam ediyor.
  const s = txScale(slide)
  const lh = txLineHeight(slide)
  let h = 0
  if (slide.example) {
    // 14px × 2 iç boşluk; metin sütunu etiket ve boşluk düşülünce ~1034px.
    h += 28 + textHeight(slide.example, 1034, 17 * s, 1.45 * lh)
  }
  if (slide.highlight) {
    h += (slide.example ? 14 : 18) + textHeight(slide.highlight, 1098, 17 * s, 1.4 * lh)
  }
  return h
}

/**
 * Kutuların 1px kenarlığı — kart/panel/satır yüksekliklerine eklenir.
 * Tek başına küçük ama 8 satırlık bir listede 16px eder ve taşmayı o fark yaratır.
 */
export const BOX_BORDER = 2

/* -------------------------------- görsel ölçüsü -------------------------------- */

/** Şerit yerleşiminin sabit yüksekliği (görsel + altındaki boşluk). */
export const MEDIA_BAND_H = 236
/** Köşe kutusunun kapladığı dikey alan — gövdenin altından düşülür. */
export const MEDIA_INSET_H = 208

/**
 * Görselin gövdeden ALDIĞI dikey alan.
 *
 * `background` içeriğin arkasında durduğu için 0 döner. Diğer ikisi gerçek yer
 * kaplar ve bu, gövde yüksekliğine yansımazsa metin görselin üstüne biner —
 * bantlarda yaşanan hatanın aynısı.
 */
export function mediaHeight(slide: Slide): number {
  if (!slide.media) return 0
  if (slide.media.placement === 'band') return MEDIA_BAND_H
  if (slide.media.placement === 'inset') return MEDIA_INSET_H
  return 0
}

/**
 * Gövdeye (`.sn-body`) gerçekte kalan dikey alan.
 *
 * 4px güvenlik payı bırakılır: kestirim ±%3 hata payıyla çalışıyor ve sınır
 * durumda bir kademe küçük seçmek, bir satırın kırpılmasından iyidir.
 *
 * Dönen değer ÖLÇEKSİZ alandır: şablonlar sabit px'li kademe tablolarıyla
 * karşılaştırdığı için, kullanıcının punto/satır aralığı tercihi `textFactor`
 * ile bölünerek buraya gömülür (bkz. `textFactor` gerekçesi). Yan etkisi
 * bilinçli: punto büyütüldüğünde grafik alanı ve görsel çerçevesi de küçülür,
 * yani yer metne devredilir.
 */
export function bodyHeight(slide: Slide): number {
  const raw = CONTENT_H - headHeight(slide) - bandsHeight(slide) - mediaHeight(slide) - 4
  return Math.floor(Math.max(150, raw) / textFactor(slide))
}

/* ------------------------------ kademe seçimi ------------------------------ */

/**
 * Sıkıştırma kademesi sınıfları. Yerleşimler (kart, adım, katman, istatistik…)
 * aynı üç kademeyi paylaşır; hangi kademenin seçileceğine her şablon kendi
 * yükseklik kestirimiyle karar verir.
 */
export const COMPACT_CLASSES = ['', ' sn-compact', ' sn-compact-2', ' sn-compact-3']

/**
 * `heights[i]` = i. kademenin kaplayacağı yükseklik. İlk sığan kademeyi seçer,
 * hiçbiri sığmazsa en sıkısını döndürür (o hâlde CSS `overflow: hidden` son
 * güvenlik ağıdır — içerik bantların üstüne binmez).
 */
export function pickTier(heights: number[], available: number): number {
  for (let i = 0; i < heights.length; i++) if (heights[i] <= available) return i
  return Math.max(0, heights.length - 1)
}

/** `pickTier` sonucunu doğrudan sınıf ekine çevirir. */
export function compactClass(heights: number[], available: number): string {
  return COMPACT_CLASSES[Math.min(pickTier(heights, available), COMPACT_CLASSES.length - 1)]
}

/* -------------------------------- madde ölçüsü -------------------------------- */

type BulletTier = { cls: string; size: number; lh: number; gap: number }

/** Madde listesinin punto kademeleri — CSS'teki `.sn-bullets` değerleriyle aynı. */
const BULLET_TIERS: BulletTier[] = [
  { cls: '', size: 22, lh: 1.45, gap: 18 },
  { cls: ' sn-dense', size: 19, lh: 1.42, gap: 13 },
  { cls: ' sn-tight', size: 17, lh: 1.38, gap: 10 },
  { cls: ' sn-tighter', size: 15, lh: 1.35, gap: 8 },
  { cls: ' sn-micro', size: 13, lh: 1.32, gap: 6 },
]

/** Madde işareti için ayrılan sol boşluk (`.sn-bullets li` padding-left). */
const BULLET_INDENT = 30

function bulletsHeight(items: string[], width: number, tier: BulletTier): number {
  let h = tier.gap * Math.max(0, items.length - 1)
  const textW = Math.max(80, width - BULLET_INDENT)
  for (let i = 0; i < items.length; i++) h += textHeight(items[i], textW, tier.size, tier.lh)
  return h
}

/**
 * Madde listesini verilen kutuya sığdıran punto sınıfını seçer.
 * `width` listenin gerçek sütun genişliği, `available` kalan dikey alan.
 */
export function bulletClass(items: string[], width: number, available: number): string {
  return bulletClassMulti([items], width, available)
}

/**
 * Birden çok sütuna bölünmüş listeler için ORTAK kademe.
 *
 * Her sütun kendi puntosunu seçerse yan yana iki farklı boyutta liste çıkıyor
 * ve slayt bozuk görünüyor; bu yüzden tüm grupların sığdığı ilk kademe seçilir.
 */
export function bulletClassMulti(groups: string[][], width: number, available: number): string {
  for (let i = 0; i < BULLET_TIERS.length; i++) {
    let fits = true
    for (let g = 0; g < groups.length; g++) {
      if (bulletsHeight(groups[g], width, BULLET_TIERS[i]) > available) {
        fits = false
        break
      }
    }
    if (fits) return BULLET_TIERS[i].cls
  }
  return BULLET_TIERS[BULLET_TIERS.length - 1].cls
}

/* ================================ bileşenler ================================ */

/**
 * Slayt başlığı ve konu simgesi.
 *
 * Simge dekoratif değil ANLAMSALDIR: modelin (ya da başlıktan türetilen) konu
 * etiketini taşır, böylece deste sayfa sayfa aynı görünmüyor. Rozetin rengini ve
 * biçimini tema belirler — model yalnızca hangi kavram olduğunu söyler.
 */
export function SlideHead({ slide }: { slide: Slide }) {
  // Biçim değişkenlerinin köke yazılması buradan tetiklenir: başlık bloğu
  // neredeyse her şablonun İLK çocuğu, yani biçimin en güvenilir tutamağı.
  const bindVars = (el: HTMLElement | null) => {
    applyTextVars(el, slide.textStyle)
  }
  if (!slide.title && !slide.subtitle) {
    // Başlıksız slaytta da gövde metni biçimlenmeli; görünmez bir çapa bırakılır
    // (display:none olduğu için yerleşime tek piksel eklemez).
    return <span hidden aria-hidden="true" ref={bindVars} />
  }
  return (
    <header className="sn-head" ref={bindVars}>
      {slide.title ? (
        <>
          <div className="sn-head-row">
            {slide.icon ? (
              <span className="sn-head-icon" aria-hidden="true">
                <SunumGlyph name={slide.icon} />
              </span>
            ) : null}
            <h2 className={`sn-title${titleClass(slide.title)}`}>
              <EditableText value={slide.title} path={{ field: 'title' }} />
            </h2>
          </div>
          <div className="sn-rule" />
        </>
      ) : null}
      {slide.subtitle ? (
        <p className="sn-subtitle">
          <EditableText value={slide.subtitle} path={{ field: 'subtitle' }} />
        </p>
      ) : null}
    </header>
  )
}

/**
 * Somut örnek bandı.
 *
 * Konudan üretilen sunumlarda en çok eksilen şey buydu: doğru ama soyut maddeler.
 * Örnek, içerikten görsel olarak AYRI durur ki dinleyici "bu gerçekte nasıl
 * görünüyor" sorusunun cevabını tek bakışta bulsun.
 */
export const EXAMPLE_LABEL = { tr: 'Örnek', en: 'Example' } as const

export function ExampleBand({ text, lang }: { text: string; lang: 'tr' | 'en' }) {
  return (
    <aside className="sn-example">
      <span className="sn-example-label">{EXAMPLE_LABEL[lang]}</span>
      <p className="sn-example-text">
        <EditableText value={text} path={{ field: 'example' }} />
      </p>
    </aside>
  )
}

export function Bullets({
  items,
  width = CONTENT_W,
  available,
}: {
  items: string[]
  /** Listenin gerçek sütun genişliği — panel içinde daha dar olur. */
  width?: number
  /** Listeye kalan dikey alan (bkz. `bodyHeight`). */
  available: number
}) {
  if (items.length === 0) return null
  return (
    <ul className={`sn-bullets${bulletClass(items, width, available)}`}>
      {items.map((text, i) => (
        <li key={i}>
          <EditableText value={text} path={{ field: 'bullet', index: i }} />
        </li>
      ))}
    </ul>
  )
}

export function Panel({
  heading,
  accent,
  plain,
  children,
}: {
  heading?: string
  accent?: boolean
  /** Zeminsiz panel (yalnızca başlık + içerik) — ayraçlı sütun yerleşimi kullanır. */
  plain?: boolean
  children: ReactNode
}) {
  const cls = `sn-panel${accent ? ' sn-panel-accent' : ''}${plain ? ' sn-panel-plain' : ''}`
  return (
    <section className={cls}>
      {heading ? <h3 className="sn-panel-head">{heading}</h3> : null}
      {children}
    </section>
  )
}

/**
 * Sayıyı birimiyle birlikte, sunum diline uygun yazar.
 * Yüzde işaretinin yeri dile göre değişir: TR'de "%45", EN'de "45%".
 */
export function formatMeasure(value: number, unit: string | undefined, lang: 'tr' | 'en'): string {
  const n = formatNumber(value, lang)
  if (!unit) return n
  if (unit === '%') return lang === 'en' ? `${n}%` : `%${n}`
  return `${n} ${unit}`
}

/** Sayıyı sunum diline göre biçimler (binlik ayracı). */
export function formatNumber(value: number, lang: 'tr' | 'en'): string {
  const rounded = Math.abs(value) < 1000 ? Math.round(value * 100) / 100 : Math.round(value)
  try {
    return rounded.toLocaleString(lang === 'en' ? 'en-US' : 'tr-TR')
  } catch {
    return String(rounded)
  }
}
