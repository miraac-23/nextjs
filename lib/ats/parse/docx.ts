// DOCX parser — ZIP'i tarayıcıda açar (lib/zip.ts), WordprocessingML'i DOMParser ile okur.
// Önek bağımsızlığı için öğeler `localName` ile eşlenir (w:, ns0: vb. fark etmez).
//
// Okuma sırası: w:body çocukları belge sırasıyla; tablolar satır satır, hücre hücre
// (çoğu ATS tabloyu böyle düzleştirir). Metin kutusu içerikleri bağlı oldukları
// paragraftan hemen sonra eklenir; ayrıca `textBoxes` sinyaliyle raporlanır.
// Header/footer metni gövdeye katılmaz (ATS'lerin çoğu okumaz), yalnızca kritik
// bilgi taşıyıp taşımadığı kontrol edilir.

import { readZip, ZipError, type ZipArchive } from '../../zip'
import type { AtsDocument, AtsLine, LayoutSignals } from '../types'
import {
  AtsParseError,
  countNonSpace,
  findCritical,
  hasLetter,
  hexLuminance,
  isAllCaps,
  normalizeFontFamily,
  round1,
  topKey,
  TWIP_TO_MM,
  weightedMode,
  wordCount,
} from './shared'

const VML_NS = 'urn:schemas-microsoft-com:vml'

/* ================================ DOM yardımcıları ================================ */

function kids(el: Element | Document | null, local?: string): Element[] {
  const out: Element[] = []
  if (!el) return out
  for (let n = el.firstChild; n; n = n.nextSibling) {
    if (n.nodeType === 1 && (!local || (n as Element).localName === local)) out.push(n as Element)
  }
  return out
}

function kid(el: Element | null, local: string): Element | null {
  if (!el) return null
  for (let n = el.firstChild; n; n = n.nextSibling) {
    if (n.nodeType === 1 && (n as Element).localName === local) return n as Element
  }
  return null
}

function all(root: Element | Document | null, local: string): Element[] {
  const out: Element[] = []
  if (!root) return out
  const list = root.getElementsByTagNameNS('*', local)
  for (let i = 0; i < list.length; i++) out.push(list[i])
  return out
}

/** Önek fark etmeksizin öznitelik değeri; `w:` önekli olan önceliklidir. */
function attr(el: Element | null, local: string): string | null {
  if (!el) return null
  const attrs = el.attributes
  let fallback: string | null = null
  for (let i = 0; i < attrs.length; i++) {
    const a = attrs[i]
    if (a.name === 'w:' + local || a.name === local) return a.value
    if (fallback === null && a.localName === local) fallback = a.value
  }
  return fallback
}

/** w:b, w:pageBreakBefore gibi aç/kapa öğeleri: öğe varsa ve val "0/false/off" değilse açık. */
function isOn(el: Element | null): boolean {
  if (!el) return false
  const v = attr(el, 'val')
  return v === null || !/^(0|false|off|none)$/i.test(v)
}

function hasAncestor(el: Element, local: string, stopAt?: Element): boolean {
  for (let n = el.parentNode; n && n !== stopAt; n = n.parentNode) {
    if (n.nodeType === 1 && (n as Element).localName === local) return true
  }
  return false
}

/** mc:AlternateContent içindeki mc:Fallback, mc:Choice'un kopyasıdır — sayımda atlanır. */
const inFallback = (el: Element) => hasAncestor(el, 'Fallback')

function parseXml(xml: string): Document {
  let doc: Document
  try {
    doc = new DOMParser().parseFromString(xml, 'application/xml')
  } catch {
    throw new AtsParseError('corrupt', 'xml')
  }
  if (!doc || !doc.documentElement || doc.getElementsByTagName('parsererror').length) throw new AtsParseError('corrupt', 'xml')
  return doc
}

function tryParseXml(xml: string | null): Document | null {
  if (!xml) return null
  try {
    return parseXml(xml)
  } catch {
    return null
  }
}

/* ================================ stiller ve fontlar ================================ */

type RunProps = { size?: number; bold?: boolean; font?: string }
type Theme = { major?: string; minor?: string }
type StyleDef = { basedOn?: string; rPr: RunProps; numbered?: boolean; outline?: boolean; breakBefore?: boolean }
type ResolvedStyle = { rPr: RunProps; numbered: boolean; outline: boolean; breakBefore: boolean }

function readTheme(doc: Document | null): Theme {
  const face = (local: string) => {
    const el = all(doc, local)[0]
    const latin = el ? kid(el, 'latin') : null
    return attr(latin, 'typeface') || undefined
  }
  return { major: face('majorFont'), minor: face('minorFont') }
}

function readRPr(rPr: Element | null, theme: Theme): RunProps {
  const out: RunProps = {}
  if (!rPr) return out
  const sz = kid(rPr, 'sz')
  if (sz) {
    const v = Number(attr(sz, 'val'))
    if (v > 0) out.size = v / 2
  }
  const b = kid(rPr, 'b')
  if (b) out.bold = isOn(b)
  const f = kid(rPr, 'rFonts')
  if (f) {
    // Tema fontu açık addan önceliklidir.
    const th = attr(f, 'asciiTheme') || attr(f, 'hAnsiTheme')
    const name = th ? (th.indexOf('major') === 0 ? theme.major : theme.minor) : attr(f, 'ascii') || attr(f, 'hAnsi')
    if (name) out.font = name
  }
  return out
}

const merge = (a: RunProps, b: RunProps): RunProps => ({
  size: b.size !== undefined ? b.size : a.size,
  bold: b.bold !== undefined ? b.bold : a.bold,
  font: b.font !== undefined ? b.font : a.font,
})

function numIdOn(numPr: Element | null): boolean | undefined {
  if (!numPr) return undefined
  const id = attr(kid(numPr, 'numId'), 'val')
  return id !== null && id !== '0'
}

class StyleSheet {
  defaults: RunProps = {}
  defaultParagraph?: string
  private defs: Record<string, StyleDef> = {}
  private cache: Record<string, ResolvedStyle> = {}

  constructor(doc: Document | null, theme: Theme) {
    if (!doc) return
    const rPrDefault = all(doc, 'rPrDefault')[0]
    this.defaults = readRPr(rPrDefault ? kid(rPrDefault, 'rPr') : null, theme)
    all(doc, 'style').forEach((s) => {
      const id = attr(s, 'styleId')
      if (!id) return
      const pPr = kid(s, 'pPr')
      const name = attr(kid(s, 'name'), 'val') || ''
      this.defs[id] = {
        basedOn: attr(kid(s, 'basedOn'), 'val') || undefined,
        rPr: readRPr(kid(s, 'rPr'), theme),
        numbered: numIdOn(kid(pPr, 'numPr')),
        outline: !!kid(pPr, 'outlineLvl') || /^heading \d/i.test(name) || undefined,
        breakBefore: kid(pPr, 'pageBreakBefore') ? isOn(kid(pPr, 'pageBreakBefore')) : undefined,
      }
      if (attr(s, 'type') === 'paragraph' && /^(1|true|on)$/i.test(attr(s, 'default') || '')) this.defaultParagraph = id
    })
  }

  resolve(id: string | null | undefined, depth = 0): ResolvedStyle {
    const empty: ResolvedStyle = { rPr: {}, numbered: false, outline: false, breakBefore: false }
    if (!id || depth > 12) return empty
    if (this.cache[id]) return this.cache[id]
    const def = this.defs[id]
    if (!def) return empty
    const base = def.basedOn && def.basedOn !== id ? this.resolve(def.basedOn, depth + 1) : empty
    const r: ResolvedStyle = {
      rPr: merge(base.rPr, def.rPr),
      numbered: def.numbered !== undefined ? def.numbered : base.numbered,
      outline: !!def.outline || base.outline,
      breakBefore: def.breakBefore !== undefined ? def.breakBefore : base.breakBefore,
    }
    this.cache[id] = r
    return r
  }
}

/* ================================ gövde okuma ================================ */

type Seg = { text: string; props: RunProps; pageBreak?: boolean }
type LineMeta = { numbered: boolean; outline: boolean; textBox: boolean; chars: { size?: number; font?: string; bold: boolean; n: number }[] }

type Ctx = {
  styles: StyleSheet
  theme: Theme
  /** Word'ün son yerleşimde yazdığı sayfa sonları varsa sayfa numarası onlardan izlenir. */
  rendered: boolean
  page: number
  lines: AtsLine[]
  meta: LineMeta[]
}

function walkBlock(container: Element, ctx: Ctx, textBox: boolean): void {
  kids(container).forEach((el) => {
    switch (el.localName) {
      case 'p':
        emitParagraph(el, ctx, textBox)
        break
      case 'tbl':
        // Satır → hücre → hücre içeriği (iç içe tablolar dahil).
        rowsOf(el).forEach((tr) => cellsOf(tr).forEach((tc) => walkBlock(tc, ctx, textBox)))
        break
      case 'sdt': {
        const content = kid(el, 'sdtContent')
        if (content) walkBlock(content, ctx, textBox)
        break
      }
      case 'customXml':
        walkBlock(el, ctx, textBox)
        break
      case 'AlternateContent': {
        const choice = kid(el, 'Choice') || kid(el, 'Fallback')
        if (choice) walkBlock(choice, ctx, textBox)
        break
      }
    }
  })
}

function unwrap(el: Element, local: string): Element[] {
  const out: Element[] = []
  kids(el).forEach((c) => {
    if (c.localName === local) out.push(c)
    else if (c.localName === 'sdt' || c.localName === 'customXml') {
      const inner = kid(c, 'sdtContent') || c
      unwrap(inner, local).forEach((x) => out.push(x))
    }
  })
  return out
}
const rowsOf = (tbl: Element) => unwrap(tbl, 'tr')
const cellsOf = (tr: Element) => unwrap(tr, 'tc')

function collectInline(el: Element, base: RunProps, ctx: Ctx, segs: Seg[], boxes: Element[]): void {
  kids(el).forEach((c) => {
    switch (c.localName) {
      case 'r':
        runSegs(c, base, ctx, segs, boxes)
        break
      case 'hyperlink':
      case 'smartTag':
      case 'ins':
      case 'moveTo':
      case 'customXml':
      case 'fldSimple':
      case 'dir':
      case 'bdo':
        collectInline(c, base, ctx, segs, boxes)
        break
      case 'sdt': {
        const content = kid(c, 'sdtContent')
        if (content) collectInline(content, base, ctx, segs, boxes)
        break
      }
      case 'AlternateContent': {
        const choice = kid(c, 'Choice') || kid(c, 'Fallback')
        if (choice) collectInline(choice, base, ctx, segs, boxes)
        break
      }
      case 'oMath':
      case 'oMathPara':
        segs.push({ text: all(c, 't').map((t) => t.textContent || '').join(''), props: base })
        break
    }
  })
}

function runSegs(r: Element, base: RunProps, ctx: Ctx, segs: Seg[], boxes: Element[]): void {
  const rPr = kid(r, 'rPr')
  let props = base
  const rStyle = attr(kid(rPr, 'rStyle'), 'val')
  if (rStyle) props = merge(props, ctx.styles.resolve(rStyle).rPr)
  props = merge(props, readRPr(rPr, ctx.theme))

  kids(r).forEach((c) => {
    switch (c.localName) {
      case 't':
        segs.push({ text: c.textContent || '', props })
        break
      case 'tab':
      case 'ptab':
        segs.push({ text: ' ', props })
        break
      case 'br':
        segs.push({ text: '\n', props })
        if (attr(c, 'type') === 'page' && !ctx.rendered) segs.push({ text: '', props, pageBreak: true })
        break
      case 'cr':
        segs.push({ text: '\n', props })
        break
      case 'lastRenderedPageBreak':
        if (ctx.rendered) segs.push({ text: '', props, pageBreak: true })
        break
      case 'noBreakHyphen':
        segs.push({ text: '-', props })
        break
      case 'drawing':
      case 'pict':
      case 'object':
        boxes.push(c)
        break
      case 'AlternateContent': {
        const choice = kid(c, 'Choice') || kid(c, 'Fallback')
        if (choice) boxes.push(choice)
        break
      }
    }
  })
}

function emitParagraph(p: Element, ctx: Ctx, textBox: boolean): void {
  const pPr = kid(p, 'pPr')
  const styleId = attr(kid(pPr, 'pStyle'), 'val') || ctx.styles.defaultParagraph
  const style = ctx.styles.resolve(styleId)
  const directNum = numIdOn(kid(pPr, 'numPr'))
  const numbered = directNum !== undefined ? directNum : style.numbered
  const outline = style.outline || !!kid(pPr, 'outlineLvl')
  const breakBefore = kid(pPr, 'pageBreakBefore') ? isOn(kid(pPr, 'pageBreakBefore')) : style.breakBefore
  const base = merge(ctx.styles.defaults, style.rPr)

  const segs: Seg[] = []
  const boxes: Element[] = []
  collectInline(p, base, ctx, segs, boxes)

  if (breakBefore && !ctx.rendered && ctx.lines.some((l) => !!l.text)) ctx.page++

  let raw = ''
  let chars: LineMeta['chars'] = []
  let first = true
  /** Satırın ilk karakterinin düştüğü sayfa. */
  let linePage = 0
  const flush = () => {
    let text = raw.replace(/[ \t ]+/g, ' ').trim()
    if (text && numbered && first && !/^[•\-–*]\s/.test(text)) text = '• ' + text
    if (text) {
      ctx.lines.push({ ...lineProps(chars), text, page: linePage || ctx.page })
      ctx.meta.push({ numbered, outline, textBox, chars })
      first = false
    } else if (ctx.lines.length && ctx.lines[ctx.lines.length - 1].text !== '') {
      // Boş paragraf → tek boş satır (art arda boşluklar birleşir).
      ctx.lines.push({ text: '', page: ctx.page })
      ctx.meta.push({ numbered: false, outline: false, textBox, chars: [] })
    }
    raw = ''
    chars = []
    linePage = 0
  }

  let emitted = false
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i]
    if (s.pageBreak) {
      ctx.page++
      continue
    }
    const parts = s.text.split('\n')
    for (let j = 0; j < parts.length; j++) {
      if (j > 0) {
        flush()
        emitted = true
      }
      const part = parts[j]
      if (!part) continue
      raw += part
      const n = countNonSpace(part)
      if (n && !linePage) linePage = ctx.page
      if (n) chars.push({ size: s.props.size, font: s.props.font, bold: !!s.props.bold, n })
    }
  }
  if (raw || !emitted) flush()

  // Metin kutuları: bağlı olduğu paragraftan sonra.
  boxes.forEach((box) => {
    const contents = all(box, 'txbxContent')
    const preferred = contents.filter((t) => !inFallback(t))
    ;(preferred.length ? preferred : contents)
      .filter((t) => !hasAncestor(t, 'txbxContent', box))
      .forEach((t) => walkBlock(t, ctx, true))
  })
}

function lineProps(chars: LineMeta['chars']): Pick<AtsLine, 'fontSize' | 'bold' | 'fontName'> {
  const sizes: Record<string, number> = {}
  const fonts: Record<string, number> = {}
  let bold = 0
  let total = 0
  chars.forEach((c) => {
    total += c.n
    if (c.bold) bold += c.n
    if (c.size) sizes[String(c.size)] = (sizes[String(c.size)] || 0) + c.n
    const fam = normalizeFontFamily(c.font)
    if (fam) fonts[fam] = (fonts[fam] || 0) + c.n
  })
  const size = topKey(sizes)
  return {
    fontSize: size !== undefined ? Number(size) : undefined,
    bold: total ? bold / total > 0.5 : undefined,
    fontName: topKey(fonts),
  }
}

/* ================================ sinyaller ================================ */

function countImages(doc: Document | null): number {
  if (!doc) return 0
  let n = 0
  all(doc, 'drawing').forEach((d) => {
    if (!inFallback(d) && all(d, 'blip').length) n++
  })
  all(doc, 'imagedata').forEach((img) => {
    if (!inFallback(img) && !hasAncestor(img, 'drawing')) n++
  })
  return n
}

function countGraphics(doc: Document): number {
  let n = 0
  all(doc, 'wsp').forEach((shape) => {
    if (inFallback(shape) || all(shape, 'txbx').length || all(shape, 'txbxContent').length) return
    const geom = attr(all(shape, 'prstGeom')[0] || null, 'prst')
    // Düz çizgiler (ayırıcı) grafik sayılmaz.
    if (geom && /^(line|straightConnector\d*)$/.test(geom)) return
    if (all(shape, 'blip').length) return // görsel olarak zaten sayıldı
    n++
  })
  ;['shape', 'rect', 'roundrect', 'oval', 'polyline'].forEach((local) => {
    const list = doc.getElementsByTagNameNS(VML_NS, local)
    for (let i = 0; i < list.length; i++) {
      const el = list[i]
      if (inFallback(el) || hasAncestor(el, 'object')) continue
      if (all(el, 'imagedata').length || all(el, 'textbox').length) continue
      // Word'ün yatay çizgisi (o:hr) ve filigran metni grafik değildir.
      if (attr(el, 'hr') === 't' || all(el, 'textpath').length) continue
      n++
    }
  })
  // Grafik (chart) ve SmartArt nesneleri.
  n += all(doc, 'chart').filter((c) => !inFallback(c)).length
  n += all(doc, 'relIds').filter((c) => !inFallback(c)).length
  return n
}

function paragraphTexts(doc: Document | null): string[] {
  return all(doc, 'p').map((p) =>
    all(p, '*')
      .map((el) => (el.localName === 't' ? el.textContent || '' : el.localName === 'tab' ? ' ' : ''))
      .join('')
  )
}

/* ================================ giriş noktası ================================ */

function zipToParseError(err: unknown): AtsParseError {
  if (err instanceof AtsParseError) return err
  if (err instanceof ZipError) {
    if (err.code === 'encrypted') return new AtsParseError('encrypted')
    if (err.code === 'too-large') return new AtsParseError('too-large')
    if (err.code === 'unsupported' && /DecompressionStream/.test(err.message)) return new AtsParseError('unsupported', err.message)
  }
  return new AtsParseError('corrupt')
}

async function mainPartPath(zip: ZipArchive): Promise<string | null> {
  const rels = await zip.text('_rels/.rels')
  if (rels) {
    const tags = rels.match(/<Relationship\b[^>]*>/g) || []
    for (let i = 0; i < tags.length; i++) {
      const type = (tags[i].match(/\bType="([^"]*)"/) || [])[1] || ''
      const target = (tags[i].match(/\bTarget="([^"]*)"/) || [])[1] || ''
      if (/\/officeDocument$/.test(type) && target) {
        const path = target.replace(/^\//, '')
        if (zip.has(path)) return path
      }
    }
  }
  return zip.has('word/document.xml') ? 'word/document.xml' : null
}

export async function parseDocx(bytes: Uint8Array, fileName?: string): Promise<AtsDocument> {
  let zip: ZipArchive
  try {
    zip = await readZip(bytes)
  } catch (err) {
    throw zipToParseError(err)
  }
  const read = async (name: string) => {
    try {
      return await zip.text(name)
    } catch (err) {
      throw zipToParseError(err)
    }
  }

  const mainPath = await mainPartPath(zip)
  if (!mainPath || !/\.xml$/i.test(mainPath)) {
    // ODT, XLSX, PPTX, Pages gibi başka ZIP tabanlı biçimler.
    if (zip.has('content.xml') || zip.has('xl/workbook.xml') || zip.has('ppt/presentation.xml') || zip.has('Index/Document.iwa')) {
      throw new AtsParseError('unsupported')
    }
    throw new AtsParseError('corrupt', 'no main document')
  }
  const dir = mainPath.replace(/[^/]*$/, '')
  const doc = parseXml((await read(mainPath)) || '')
  const theme = readTheme(tryParseXml(await read(dir + 'theme/theme1.xml')))
  const styles = new StyleSheet(tryParseXml(await read(dir + 'styles.xml')), theme)

  const body = all(doc, 'body')[0]
  if (!body) throw new AtsParseError('corrupt', 'no body')

  const ctx: Ctx = { styles, theme, rendered: all(body, 'lastRenderedPageBreak').length > 0, page: 1, lines: [], meta: [] }
  walkBlock(body, ctx, false)
  while (ctx.lines.length && ctx.lines[ctx.lines.length - 1].text === '') {
    ctx.lines.pop()
    ctx.meta.pop()
  }

  const text = ctx.lines.map((l) => l.text).join('\n')
  const nonSpace = countNonSpace(text)
  const images = countImages(doc)

  /* --- header / footer --- */
  const headerFooterCritical: string[] = []
  let hfImages = 0
  const hfNames = zip.names.filter((n) => n.indexOf(dir) === 0 && /^(header|footer)\d*\.xml$/i.test(n.slice(dir.length)))
  for (let i = 0; i < hfNames.length; i++) {
    const hf = tryParseXml(await read(hfNames[i]))
    if (!hf) continue
    hfImages += countImages(hf)
    findCritical(paragraphTexts(hf).join('\n')).forEach((m) => {
      if (headerFooterCritical.indexOf(m) < 0) headerFooterCritical.push(m)
    })
  }

  if (!nonSpace) {
    // Yalnızca görsel içeren belge (ör. taranmış sayfa yapıştırılmış) — rapor açıklasın.
    if (images + hfImages > 0) {
      return { source: 'docx', fileName, text: '', lines: [], pageCount: 1, layout: { textBased: false, images: images + hfImages } }
    }
    throw new AtsParseError('empty')
  }

  /* --- sayfa yapısı --- */
  const sectPrs = all(doc, 'sectPr')
  let columns = 1
  sectPrs.forEach((s) => {
    const cols = kid(s, 'cols')
    if (!cols) return
    const num = Number(attr(cols, 'num')) || 1
    columns = Math.max(columns, num, kids(cols, 'col').length || 1)
  })
  const lastSect = kid(body, 'sectPr') || sectPrs[sectPrs.length - 1] || null
  const pgMar = kid(lastSect, 'pgMar')
  const twip = (el: Element | null, name: string) => {
    const v = Number(attr(el, name))
    return Number.isFinite(v) && attr(el, name) !== null ? round1(Math.abs(v) * TWIP_TO_MM) : undefined
  }
  const marginsMm = pgMar
    ? { top: twip(pgMar, 'top'), right: twip(pgMar, 'right'), bottom: twip(pgMar, 'bottom'), left: twip(pgMar, 'left') }
    : undefined
  const pageWidthMm = twip(kid(lastSect, 'pgSz'), 'w')

  const bg = attr(kid(doc.documentElement, 'background'), 'color')
  const bgLum = bg && bg !== 'auto' ? hexLuminance(bg) : undefined
  const darkBackground = bgLum !== undefined ? bgLum < 0.4 : false

  /* --- tipografi --- */
  const fontSet: string[] = []
  const sizeWeights: { value: number; weight: number }[] = []
  ctx.meta.forEach((m) =>
    m.chars.forEach((c) => {
      const fam = normalizeFontFamily(c.font)
      if (fam && fontSet.indexOf(fam) < 0) fontSet.push(fam)
      if (c.size) sizeWeights.push({ value: c.size, weight: c.n })
    })
  )
  // Hiçbir çalıştırmada font çözülemediyse belge varsayılanı kullanılıyordur.
  const defaultFamily = normalizeFontFamily(styles.defaults.font)
  if (!fontSet.length && defaultFamily) fontSet.push(defaultFamily)
  const bodyFontSizePt = weightedMode(sizeWeights)

  const nonEmpty: number[] = []
  ctx.lines.forEach((l, i) => {
    if (l.text) nonEmpty.push(i)
  })
  const head = nonEmpty.slice(0, 3).map((i) => ctx.lines[i].fontSize || 0)
  const nameFontSizePt = head.length && Math.max.apply(null, head) > 0 ? Math.max.apply(null, head) : undefined

  const candidates = nonEmpty.slice(1).filter((i) => {
    const l = ctx.lines[i]
    const m = ctx.meta[i]
    return !!l.fontSize && !m.numbered && hasLetter(l.text) && wordCount(l.text) <= 5
  })
  const bySize = (idx: number[]) => weightedMode(idx.map((i) => ({ value: ctx.lines[i].fontSize || 0, weight: 1 })))
  // Öncelik: gerçek başlık stilleri → gövdeden büyük ve kalın/BÜYÜK HARF → gövdeden büyük → kalın BÜYÜK HARF.
  const outlined = candidates.filter((i) => ctx.meta[i].outline)
  const larger = bodyFontSizePt ? candidates.filter((i) => (ctx.lines[i].fontSize || 0) > bodyFontSizePt + 0.4) : []
  const emphasized = larger.filter((i) => ctx.lines[i].bold || isAllCaps(ctx.lines[i].text))
  const capsBold = candidates.filter((i) => ctx.lines[i].bold && isAllCaps(ctx.lines[i].text))
  const headingPool = [outlined, emphasized, larger, capsBold].filter((x) => x.length)[0]
  const headingFontSizePt = headingPool ? bySize(headingPool) : undefined

  /* --- sayfa sayısı --- */
  const app = await read('docProps/app.xml')
  const pagesFromApp = Number(((app || '').match(/<(?:\w+:)?Pages>\s*(\d+)\s*</) || [])[1])
  const words = wordCount(text)
  const pageCount =
    pagesFromApp >= 1 ? pagesFromApp : ctx.rendered ? Math.max(1, ctx.page) : Math.max(1, ctx.page, Math.ceil(words / 500))

  const layout: LayoutSignals = {
    textBased: true,
    columns,
    tables: all(doc, 'tbl').filter((t) => !inFallback(t)).length,
    textBoxes: all(doc, 'txbxContent').filter((t) => !inFallback(t)).length,
    images: images + hfImages,
    graphics: countGraphics(doc),
    headerFooterCritical,
    fonts: fontSet,
    bodyFontSizePt,
    headingFontSizePt,
    nameFontSizePt,
    marginsMm,
    darkBackground,
    pageWidthMm,
  }

  return { source: 'docx', fileName, text, lines: ctx.lines, pageCount, layout }
}
