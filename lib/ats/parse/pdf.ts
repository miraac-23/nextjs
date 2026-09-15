// PDF parser — pdf.js (pdfjs-dist, legacy derleme) ile tamamen tarayıcıda çalışır.
// Kütüphane yalnızca bir PDF yüklendiğinde dinamik import edilir; worker
// public/pdfjs/pdf.worker.min.mjs'ten gelir (scripts/copy-pdf-worker.mjs kopyalar).
//
// SATIR SIRASI KARARI: `text` ve `lines`, içerik akışı (content stream) sırasıyla
// satırlara gruplanır — naif ATS metin çıkarıcıları PDF'i bu sırayla okur; iki
// sütunlu bir tasarımda sütunların birbirine karışması da ancak böyle görünür.
// Böylece lines[i] ↔ text.split('\n')[i] eşleşmesi korunur. Yerleşim sinyalleri
// (sütun, kenar boşluğu, header/footer) ise koordinata göre gruplanmış ayrı
// "geometrik segmentler" üzerinden hesaplanır.

import type { AtsDocument, AtsLine, LayoutSignals } from '../types'
import {
  AtsParseError,
  BOLD_NAME_RE,
  countNonSpace,
  findCritical,
  hasLetter,
  hexLuminance,
  isAllCaps,
  normalizeFontFamily,
  PT_TO_MM,
  round1,
  topKey,
  weightedMode,
  wordCount,
} from './shared'

type PdfJs = typeof import('pdfjs-dist/legacy/build/pdf.mjs')
type Matrix = number[]

export const PDF_WORKER_SRC = '/pdfjs/pdf.worker.min.mjs'

/** Analiz edilen en fazla sayfa (CV için fazlasıyla yeterli, büyük dosyada tarayıcıyı kilitlemez). */
const MAX_PAGES = 10
/** 1 mm = 2.8346 pt */
const MM = 1 / PT_TO_MM

let pdfjsPromise: Promise<PdfJs> | null = null

function loadPdfJs(): Promise<PdfJs> {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist/legacy/build/pdf.mjs').then((mod) => {
      if (typeof window !== 'undefined' && !mod.GlobalWorkerOptions.workerSrc) {
        mod.GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC
      }
      return mod
    })
    pdfjsPromise.catch(() => {
      pdfjsPromise = null
    })
  }
  return pdfjsPromise
}

type Item = { str: string; x: number; y: number; w: number; size: number; font?: string; bold: boolean; vertical: boolean; eol: boolean }
type Seg = { x0: number; x1: number; y: number; size: number; text: string }
type HLine = { x0: number; x1: number; y: number }
type VLine = { x: number; y0: number; y1: number }

const noop = () => undefined

function mapPdfError(err: unknown): AtsParseError {
  if (err instanceof AtsParseError) return err
  const name = String((err && (err as { name?: string }).name) || '')
  if (name === 'PasswordException') return new AtsParseError('encrypted')
  return new AtsParseError('corrupt', name || undefined)
}

export async function parsePdf(bytes: Uint8Array, fileName?: string): Promise<AtsDocument> {
  let pdfjs: PdfJs
  try {
    pdfjs = await loadPdfJs()
  } catch {
    throw new AtsParseError('unsupported', 'pdf engine failed to load')
  }

  const task = pdfjs.getDocument({
    // pdf.js veriyi worker'a devreder (buffer boşalır) — kopya gönderilir.
    data: bytes.slice(),
    disableFontFace: true,
    useSystemFonts: false,
    stopAtErrors: false,
    isOffscreenCanvasSupported: false,
    enableXfa: false,
    verbosity: 0,
  })

  try {
    let pdf
    try {
      pdf = await task.promise
    } catch (err) {
      throw mapPdfError(err)
    }
    return await extract(pdfjs, pdf, fileName)
  } catch (err) {
    throw mapPdfError(err)
  } finally {
    task.destroy().catch(noop)
  }
}

type PdfDoc = Awaited<ReturnType<PdfJs['getDocument']>['promise']>
type PdfPage = Awaited<ReturnType<PdfDoc['getPage']>>

async function extract(pdfjs: PdfJs, pdf: PdfDoc, fileName?: string): Promise<AtsDocument> {
  const numPages = pdf.numPages
  const pages = Math.min(numPages, MAX_PAGES)
  const fontCache: Record<string, { family?: string; bold: boolean }> = {}

  const lines: AtsLine[] = []
  const fonts: string[] = []
  const sizeWeights: { value: number; weight: number }[] = []
  let nonSpace = 0
  let images = 0
  let graphics = 0
  let tables = 0
  let paths = 0
  let columns = 1
  let dark = false
  let pageWidthMm: number | undefined
  let marginsMm: LayoutSignals['marginsMm']
  let page1Height = 0
  /** Header/footer bölgesinde bulunan kritik metin → [sayfa, kenara mesafe mm]. */
  const zoneHits: Record<string, { page: number; edge: number }[]> = {}

  for (let p = 1; p <= pages; p++) {
    const page: PdfPage = await pdf.getPage(p)
    const vp = page.getViewport({ scale: 1 })
    const pw = vp.width
    const ph = vp.height
    const vt = vp.transform as Matrix

    // Önce operatör listesi: fontlar bununla commonObjs'e yüklenir (gerçek font adları için).
    const opList = await page.getOperatorList()
    const content = await page.getTextContent()
    const styles = (content.styles || {}) as Record<string, { fontFamily?: string }>

    const fontOf = (id: string) => {
      if (fontCache[id]) return fontCache[id]
      let raw = ''
      let bold = false
      try {
        if (page.commonObjs.has(id)) {
          const f = page.commonObjs.get(id) as { name?: string; bold?: boolean; black?: boolean } | null
          raw = (f && f.name) || ''
          bold = !!(f && (f.bold || f.black))
        }
      } catch {
        /* font henüz çözülmemiş olabilir */
      }
      if (!raw && styles[id]) raw = styles[id].fontFamily || ''
      const info = { family: normalizeFontFamily(raw), bold: bold || BOLD_NAME_RE.test(raw) }
      fontCache[id] = info
      return info
    }

    const items: Item[] = []
    content.items.forEach((it) => {
      if (!('str' in it)) return
      const m = pdfjs.Util.transform(vt, it.transform) as Matrix
      const size = Math.hypot(m[2], m[3]) || it.height || 0
      const f = fontOf(it.fontName)
      items.push({
        str: it.str,
        x: m[4],
        y: m[5],
        w: it.width,
        size,
        font: f.family,
        bold: f.bold,
        vertical: Math.abs(m[1]) > Math.abs(m[0]) + 0.01,
        eol: !!it.hasEOL,
      })
    })

    /* --- metin --- */
    streamLines(items, p, lines)
    items.forEach((it) => {
      const n = countNonSpace(it.str)
      if (!n) return
      nonSpace += n
      if (it.size > 0) sizeWeights.push({ value: it.size, weight: n })
      if (it.font && fonts.indexOf(it.font) < 0) fonts.push(it.font)
    })

    const segs = buildSegs(items)
    columns = Math.max(columns, detectColumns(segs, pw, ph))

    /* --- çizimler --- */
    const ops = analyzeOps(pdfjs, opList.fnArray, opList.argsArray, vt, pw, ph)
    images += ops.images
    paths += ops.paths
    graphics += (ops.bars >= 3 ? ops.bars : 0) + ops.large
    if (ops.dark) dark = true
    if (detectGrid(ops.hLines, ops.vLines, segs, ph)) tables++

    /* --- header / footer bölgesi --- */
    segs.forEach((s) => {
      const top = (s.y - 0.8 * s.size) * PT_TO_MM
      const bottom = (ph - (s.y + 0.25 * s.size)) * PT_TO_MM
      const edge = Math.min(top, bottom)
      if (edge >= 12) return
      findCritical(s.text).forEach((hit) => {
        ;(zoneHits[hit] = zoneHits[hit] || []).push({ page: p, edge })
      })
    })

    if (p === 1) {
      pageWidthMm = round1(pw * PT_TO_MM)
      page1Height = ph
      const geo = items.filter((i) => !i.vertical && i.str.trim())
      if (geo.length) {
        let left = Infinity
        let right = -Infinity
        let top = Infinity
        let bottom = -Infinity
        geo.forEach((i) => {
          left = Math.min(left, i.x)
          right = Math.max(right, i.x + i.w)
          top = Math.min(top, i.y - 0.8 * i.size)
          bottom = Math.max(bottom, i.y + 0.25 * i.size)
        })
        const mm = (v: number) => round1(Math.max(0, v) * PT_TO_MM)
        // Metin sağda satır sonuna kadar uzanmıyorsa (dar içerik, girintisiz kısa satırlar)
        // ölçülen değer yalnızca üst sınırdır; soldan ≥15 mm fazlaysa ölçülemedi say.
        const rightGap = pw - right
        marginsMm = {
          top: mm(top),
          left: mm(left),
          right: rightGap - left > 15 * MM ? undefined : mm(rightGap),
          // Tek sayfalık CV'de içerik sayfa ortasında bitebilir; alt boşluk ancak devam sayfası varsa anlamlı.
          bottom: numPages > 1 ? mm(ph - bottom) : undefined,
        }
      }
    }
    page.cleanup()
  }

  if (nonSpace < 40) {
    // Taranmış / görsel PDF ya da metni eğriye çevrilmiş tasarım: metin çıkarılamaz.
    if (images > 0 || paths > 50 || nonSpace > 0) {
      return {
        source: 'pdf',
        fileName,
        text: lines.map((l) => l.text).join('\n'),
        lines,
        pageCount: numPages,
        layout: { textBased: false, images, graphics, pageWidthMm },
      }
    }
    throw new AtsParseError('empty')
  }

  while (lines.length && lines[lines.length - 1].text === '') lines.pop()

  // Tek sayfada kenardan 10 mm; çok sayfada 8 mm ya da 12 mm içinde ≥2 sayfada tekrar.
  const headerFooterCritical = Object.keys(zoneHits).filter((hit) => {
    const hits = zoneHits[hit]
    if (numPages === 1) return hits.some((h) => h.edge < 10)
    const distinctPages = hits.map((h) => h.page).filter((v, i, a) => a.indexOf(v) === i).length
    return hits.some((h) => h.edge < 8) || distinctPages >= 2
  })

  const bodyFontSizePt = weightedMode(sizeWeights)
  const thirdMm = (page1Height / 3) * PT_TO_MM
  const topLines = lines.filter((l) => l.page === 1 && l.text && (l.y || 0) < thirdMm && l.fontSize)
  const nameFontSizePt = topLines.length ? round1(Math.max.apply(null, topLines.map((l) => l.fontSize || 0))) : undefined
  const candidates = lines.filter((l) => {
    if (!l.text || !l.fontSize || !hasLetter(l.text) || wordCount(l.text) > 5 || /^[•\-–*]\s/.test(l.text)) return false
    return !(nameFontSizePt && l.page === 1 && (l.y || 0) < thirdMm && l.fontSize >= nameFontSizePt - 0.05)
  })
  // Öncelik: gövdeden büyük ve kalın/BÜYÜK HARF → gövdeden büyük → kalın BÜYÜK HARF.
  const larger = candidates.filter((l) => bodyFontSizePt !== undefined && (l.fontSize || 0) > bodyFontSizePt + 0.4)
  const emphasized = larger.filter((l) => l.bold || isAllCaps(l.text))
  const capsBold = candidates.filter((l) => l.bold && isAllCaps(l.text))
  const headingPool = [emphasized, larger, capsBold].filter((x) => x.length)[0] || []
  const headingSizes = headingPool.map((l) => ({ value: l.fontSize || 0, weight: 1 }))

  const layout: LayoutSignals = {
    textBased: true,
    columns,
    tables,
    // PDF'te "metin kutusu" kavramı yoktur; ölçülemez.
    textBoxes: undefined,
    images,
    graphics,
    headerFooterCritical,
    fonts,
    bodyFontSizePt,
    headingFontSizePt: weightedMode(headingSizes),
    nameFontSizePt,
    marginsMm,
    darkBackground: dark,
    pageWidthMm,
  }

  return { source: 'pdf', fileName, text: lines.map((l) => l.text).join('\n'), lines, pageCount: numPages, layout }
}

/* ============================== akış sırası satırlar ============================== */

type Acc = {
  parts: string[]
  x: number
  y: number
  end: number
  size: number
  chars: number
  boldChars: number
  sizes: Record<string, number>
  fonts: Record<string, number>
}

function streamLines(items: Item[], page: number, out: AtsLine[]): void {
  let acc: Acc | null = null
  let prevY: number | null = null
  let prevSize = 0

  const flush = (a: Acc | null) => {
    if (!a) return
    const text = a.parts.join('').replace(/\s+/g, ' ').trim()
    if (!text) return
    // Belirgin dikey boşluk → paragraf/bölüm arası boş satır.
    if (prevY !== null && a.y - prevY > 1.9 * Math.max(prevSize, a.size) && out.length && out[out.length - 1].text !== '') {
      out.push({ text: '', page })
    }
    const size = topKey(a.sizes)
    out.push({
      text,
      page,
      fontSize: size !== undefined ? round1(Number(size)) : undefined,
      bold: a.chars ? a.boldChars / a.chars > 0.5 : undefined,
      fontName: topKey(a.fonts),
      x: round1(a.x * PT_TO_MM),
      y: round1(a.y * PT_TO_MM),
    })
    prevY = a.y
    prevSize = a.size
  }

  for (let i = 0; i < items.length; i++) {
    const it = items[i]
    if (!it.str) {
      if (it.eol) {
        flush(acc)
        acc = null
      }
      continue
    }
    if (acc && (Math.abs(it.y - acc.y) > 0.35 * Math.max(it.size, acc.size) || it.x < acc.end - 2 * Math.max(it.size, 1))) {
      flush(acc)
      acc = null
    }
    if (!acc) {
      acc = { parts: [], x: it.x, y: it.y, end: it.x, size: it.size, chars: 0, boldChars: 0, sizes: {}, fonts: {} }
    } else {
      const last = acc.parts[acc.parts.length - 1] || ''
      if (it.x - acc.end > 0.15 * it.size && !/\s$/.test(last) && !/^\s/.test(it.str)) acc.parts.push(' ')
    }
    acc.parts.push(it.str)
    const n = countNonSpace(it.str)
    if (n) {
      acc.chars += n
      if (it.bold) acc.boldChars += n
      if (it.size > 0) {
        const k = String(Math.round(it.size * 2) / 2)
        acc.sizes[k] = (acc.sizes[k] || 0) + n
        acc.size = Math.max(acc.size, it.size)
      }
      if (it.font) acc.fonts[it.font] = (acc.fonts[it.font] || 0) + n
    }
    acc.end = it.x + it.w
    if (it.eol) {
      flush(acc)
      acc = null
    }
  }
  flush(acc)
}

/* ============================== geometrik segmentler ============================== */

/** Aynı taban çizgisindeki öğeleri x'e göre dizer; büyük yatay boşlukta segmenti böler. */
function buildSegs(items: Item[]): Seg[] {
  const list = items.filter((i) => !i.vertical && i.str.trim()).sort((a, b) => a.y - b.y || a.x - b.x)
  const segs: Seg[] = []
  let row: Item[] = []
  const flushRow = () => {
    if (!row.length) return
    row.sort((a, b) => a.x - b.x)
    let seg: Seg | null = null
    row.forEach((it) => {
      if (seg && it.x - seg.x1 <= 2 * Math.max(it.size, seg.size)) {
        seg.text += (it.x - seg.x1 > 0.15 * it.size ? ' ' : '') + it.str
        seg.x1 = Math.max(seg.x1, it.x + it.w)
        seg.size = Math.max(seg.size, it.size)
      } else {
        if (seg) segs.push(seg)
        seg = { x0: it.x, x1: it.x + it.w, y: it.y, size: it.size, text: it.str }
      }
    })
    if (seg) segs.push(seg)
    row = []
  }
  list.forEach((it) => {
    if (row.length && Math.abs(it.y - row[0].y) >= 0.35 * Math.max(it.size, row[0].size)) flushRow()
    row.push(it)
  })
  flushRow()
  segs.forEach((s) => (s.text = s.text.replace(/\s+/g, ' ').trim()))
  return segs.filter((s) => s.text)
}

/**
 * Sütun sezgisi: segmentlerin sol kenarları kümelenir. Sayfa genişliğinin ≥%20'sinden
 * (ve ana kümeden ≥25 mm sağdan) başlayan, ≥4 satırlık bir küme; ana kümeyle sayfa
 * yüksekliğinin ≥%25'i boyunca dikeyde örtüşüyorsa ayrı sütun sayılır. Sağa yaslı
 * kısa kuyruklar (tarih, konum) kümeye alınmaz.
 */
function detectColumns(segs: Seg[], pw: number, ph: number): number {
  const usable = segs.filter((s) => countNonSpace(s.text) >= 2)
  if (usable.length < 8) return 1
  let textRight = 0
  usable.forEach((s) => (textRight = Math.max(textRight, s.x1)))
  const starts = usable.filter((s) => !(s.x1 >= textRight - 3 * MM && wordCount(s.text) <= 6 && s.x0 > pw * 0.4))

  const sorted = starts.slice().sort((a, b) => a.x0 - b.x0)
  const clusters: { minX: number; members: Seg[] }[] = []
  sorted.forEach((s) => {
    const c = clusters[clusters.length - 1]
    if (c && s.x0 - c.members[c.members.length - 1].x0 <= 4 * MM) c.members.push(s)
    else clusters.push({ minX: s.x0, members: [s] })
  })
  const primary = clusters.filter((c) => c.members.length >= 3)[0]
  if (!primary) return 1

  const BIN = 2 * MM
  const bins = (list: Seg[]) => {
    const set: Record<number, true> = {}
    list.forEach((s) => {
      const from = Math.floor((s.y - 1.2 * s.size) / BIN)
      const to = Math.floor((s.y + 0.3 * s.size) / BIN)
      for (let b = from; b <= to; b++) set[b] = true
    })
    return set
  }

  let cols = 1
  let lastX = primary.minX
  clusters.forEach((c) => {
    if (c === primary || c.minX < lastX + 25 * MM || c.minX < pw * 0.2 || c.members.length < 4) return
    const right = bins(usable.filter((s) => s.x0 >= c.minX - 2 * MM))
    const left = bins(usable.filter((s) => s.x1 <= c.minX + 1 * MM && s.x0 < c.minX - 5 * MM))
    let overlap = 0
    Object.keys(right).forEach((k) => {
      if (left[Number(k)]) overlap++
    })
    // Yan sütunlar çoğu zaman kısadır (ad + iletişim; yetenekler sonraki sayfaya akar):
    // sabit sayfa yüksekliği eşiği onları kaçırır. Eşik sol sütunun kendi boyuna göre
    // ölçeklenir; tek sütunlu belgelerde ikinci bir sol kenar kümesi oluşmadığı için
    // bu gevşeme yanlış pozitif üretmez.
    const leftExtent = Object.keys(left).length * BIN
    const need = Math.max(ph * 0.12, Math.min(ph * 0.25, leftExtent * 0.6))
    if (overlap * BIN >= need) {
      cols++
      lastX = c.minX
    }
  })
  return Math.min(cols, 4)
}

/* ============================== operatör analizi ============================== */

type OpStats = { images: number; bars: number; large: number; dark: boolean; paths: number; hLines: HLine[]; vLines: VLine[] }

function analyzeOps(pdfjs: PdfJs, fnArray: number[], argsArray: unknown[], vt: Matrix, pw: number, ph: number): OpStats {
  const OPS = pdfjs.OPS
  const out: OpStats = { images: 0, bars: 0, large: 0, dark: false, paths: 0, hLines: [], vLines: [] }
  const FILL = [OPS.fill, OPS.eoFill, OPS.fillStroke, OPS.eoFillStroke, OPS.closeFillStroke, OPS.closeEOFillStroke]
  const STROKE = [OPS.stroke, OPS.closeStroke, OPS.fillStroke, OPS.eoFillStroke, OPS.closeFillStroke, OPS.closeEOFillStroke]
  const IMAGE = [
    OPS.paintImageXObject,
    OPS.paintInlineImageXObject,
    OPS.paintImageMaskXObject,
    OPS.paintImageXObjectRepeat,
    OPS.paintInlineImageXObjectGroup,
    OPS.paintImageMaskXObjectGroup,
    OPS.paintImageMaskXObjectRepeat,
  ]
  const mul = (a: Matrix, b: Matrix) => pdfjs.Util.transform(a, b) as Matrix
  const pageArea = pw * ph

  let ctm: Matrix = [1, 0, 0, 1, 0, 0]
  let fill: string | null = '#000000'
  let lineWidth = 1
  /** Sayfayı kaplayan son dolgunun parlaklığı — sonraki boyama öncekini örter. */
  let pageBg: number | undefined
  const stack: { ctm: Matrix; fill: string | null; lineWidth: number }[] = []
  const push = () => stack.push({ ctm, fill, lineWidth })
  const pop = () => {
    const s = stack.pop()
    if (s) {
      ctm = s.ctm
      fill = s.fill
      lineWidth = s.lineWidth
    }
  }

  const addRect = (x0: number, y0: number, x1: number, y1: number, filled: boolean, stroked: boolean) => {
    const w = x1 - x0
    const h = y1 - y0
    if (filled) {
      const lum = hexLuminance(fill)
      if (h <= 0.8 * MM && w >= 15 * MM) out.hLines.push({ x0, x1, y: (y0 + y1) / 2 })
      else if (w <= 0.8 * MM && h >= 5 * MM) out.vLines.push({ x: (x0 + x1) / 2, y0, y1 })
      else if (w >= 5 * MM && w <= 80 * MM && h > 0.8 * MM && h <= 5 * MM && (lum === undefined || lum < 0.97)) out.bars++
      // Sayfa zemini dekoratif şekil değildir; tarayıcılar önce kanvası (koyu temada
      // #121212) sonra beyaz kâğıdı boyar. Karar döngü sonunda son zemine göre verilir.
      else if (w * h >= pageArea * 0.9) {
        if (lum !== undefined) pageBg = lum
      } else if (w * h >= pageArea * 0.1 && (lum === undefined || lum < 0.95)) {
        out.large++
        if (w * h >= pageArea * 0.6 && lum !== undefined && lum < 0.4) out.dark = true
      }
    }
    if (stroked) {
      if (w >= 15 * MM) {
        out.hLines.push({ x0, x1, y: y0 })
        out.hLines.push({ x0, x1, y: y1 })
      }
      if (h >= 5 * MM) {
        out.vLines.push({ x: x0, y0, y1 })
        out.vLines.push({ x: x1, y0, y1 })
      }
    }
  }

  const addLine = (ax: number, ay: number, bx: number, by: number) => {
    const lw = lineWidth * Math.hypot(ctm[0], ctm[1])
    const x0 = Math.min(ax, bx)
    const x1 = Math.max(ax, bx)
    const y0 = Math.min(ay, by)
    const y1 = Math.max(ay, by)
    if (y1 - y0 < 1 && x1 - x0 >= 5 * MM) {
      // Kalın kısa yatay çizgi = çubuk (skill bar).
      if (lw > 0.8 * MM && lw <= 5 * MM && x1 - x0 <= 80 * MM) out.bars++
      else if (x1 - x0 >= 15 * MM) out.hLines.push({ x0, x1, y: y0 })
    } else if (x1 - x0 < 1 && y1 - y0 >= 5 * MM) {
      out.vLines.push({ x: x0, y0, y1 })
    }
  }

  for (let i = 0; i < fnArray.length; i++) {
    const fn = fnArray[i]
    const args = argsArray[i] as any
    switch (fn) {
      case OPS.save:
        push()
        break
      case OPS.restore:
        pop()
        break
      case OPS.transform:
        if (args && args.length === 6) ctm = mul(ctm, args as Matrix)
        break
      case OPS.paintFormXObjectBegin:
        push()
        if (args && args[0] && args[0].length === 6) ctm = mul(ctm, Array.prototype.slice.call(args[0]) as Matrix)
        break
      case OPS.paintFormXObjectEnd:
        pop()
        break
      case OPS.setFillRGBColor:
        fill = args && typeof args[0] === 'string' ? args[0] : null
        break
      case OPS.setFillColorN:
      case OPS.shadingFill:
        fill = null
        break
      case OPS.setLineWidth:
        if (args && typeof args[0] === 'number') lineWidth = args[0]
        break
      case OPS.setGState:
        if (args && Array.isArray(args[0])) {
          args[0].forEach((pair: unknown) => {
            if (Array.isArray(pair) && pair[0] === 'LW' && typeof pair[1] === 'number') lineWidth = pair[1]
          })
        }
        break
      case OPS.constructPath: {
        if (!args) break
        const op = args[0] as number
        const data = args[1] && args[1][0]
        const filled = FILL.indexOf(op) >= 0
        const stroked = STROKE.indexOf(op) >= 0
        if (!data || typeof data.length !== 'number' || (!filled && !stroked)) break
        out.paths++
        const full = mul(vt, ctm)
        eachSubpath(data, (pts, curved) => {
          if (curved || pts.length < 2) return
          const tp: number[][] = pts.map((pt) => [full[0] * pt[0] + full[2] * pt[1] + full[4], full[1] * pt[0] + full[3] * pt[1] + full[5]])
          let x0 = Infinity
          let x1 = -Infinity
          let y0 = Infinity
          let y1 = -Infinity
          tp.forEach((pt) => {
            x0 = Math.min(x0, pt[0])
            x1 = Math.max(x1, pt[0])
            y0 = Math.min(y0, pt[1])
            y1 = Math.max(y1, pt[1])
          })
          if (tp.length === 2 || (tp.length === 3 && Math.abs(tp[0][0] - tp[2][0]) < 0.5 && Math.abs(tp[0][1] - tp[2][1]) < 0.5)) {
            if (stroked) addLine(tp[0][0], tp[0][1], tp[1][0], tp[1][1])
            return
          }
          const axis = tp.every((pt) => (Math.abs(pt[0] - x0) < 0.6 || Math.abs(pt[0] - x1) < 0.6) && (Math.abs(pt[1] - y0) < 0.6 || Math.abs(pt[1] - y1) < 0.6))
          if (axis && tp.length <= 5) addRect(x0, y0, x1, y1, filled, stroked)
        })
        break
      }
      default:
        if (IMAGE.indexOf(fn) >= 0) {
          // Görsel birim kareye çizilir; boyutu CTM'den gelir. 5 mm'den küçükler (ikon kırıntısı, maske) sayılmaz.
          const w = Math.hypot(ctm[0], ctm[1])
          const h = Math.hypot(ctm[2], ctm[3])
          if (Math.min(w, h) >= 5 * MM) out.images++
        }
    }
  }
  if (pageBg !== undefined && pageBg < 0.4) out.dark = true
  return out
}

/** pdf.js ≥5 yol verisi: [DrawOPS kodu, koordinatlar...]; moveTo=0 lineTo=1 curveTo=2 quadraticCurveTo=3 closePath=4. */
function eachSubpath(data: ArrayLike<number>, cb: (pts: number[][], curved: boolean) => void): void {
  let pts: number[][] = []
  let curved = false
  const end = () => {
    if (pts.length) cb(pts, curved)
    pts = []
    curved = false
  }
  let k = 0
  while (k < data.length) {
    const code = data[k++]
    if (code === 0) {
      end()
      pts.push([data[k], data[k + 1]])
      k += 2
    } else if (code === 1) {
      pts.push([data[k], data[k + 1]])
      k += 2
    } else if (code === 2) {
      curved = true
      pts.push([data[k + 4], data[k + 5]])
      k += 6
    } else if (code === 3) {
      curved = true
      pts.push([data[k + 2], data[k + 3]])
      k += 4
    } else if (code === 4) {
      // Kapalı yol: sonraki çizim yeni alt yol başlatır.
      if (pts.length) pts.push(pts[0])
      end()
    } else {
      break
    }
  }
  end()
}

/**
 * Tablo ızgarası: sayfa boyu olmayan ≥2 dikey çizgi ve bunları kesen ≥3 yatay çizgi;
 * ızgara alanında en az 2 metin segmenti varsa sayfa başına 1 tablo.
 */
function detectGrid(h: HLine[], v: VLine[], segs: Seg[], ph: number): boolean {
  const tol = 1 * MM
  const shortV = v.filter((l) => l.y1 - l.y0 < ph * 0.7)
  const crosses = (hl: HLine, vl: VLine) => vl.x >= hl.x0 - tol && vl.x <= hl.x1 + tol && hl.y >= vl.y0 - tol && hl.y <= vl.y1 + tol
  const gridV = shortV.filter((vl) => h.filter((hl) => crosses(hl, vl)).length >= 2)
  if (gridV.length < 2) return false
  const gridH = h.filter((hl) => gridV.some((vl) => crosses(hl, vl)))
  const ys: number[] = []
  gridH.forEach((hl) => {
    if (!ys.some((y) => Math.abs(y - hl.y) < tol)) ys.push(hl.y)
  })
  if (ys.length < 3) return false
  let x0 = Infinity
  let x1 = -Infinity
  let y0 = Infinity
  let y1 = -Infinity
  gridH.forEach((hl) => {
    x0 = Math.min(x0, hl.x0)
    x1 = Math.max(x1, hl.x1)
    y0 = Math.min(y0, hl.y)
    y1 = Math.max(y1, hl.y)
  })
  return segs.filter((s) => s.x0 >= x0 - tol && s.x0 <= x1 && s.y >= y0 && s.y <= y1 + tol).length >= 2
}
