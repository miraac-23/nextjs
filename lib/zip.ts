// Bağımlılıksız, küçük ZIP okuyucu/yazıcı.
// readZip → yüklenen DOCX'i tarayıcıda açmak için (DecompressionStream 'deflate-raw').
// createZip → Word çıktısı için STORE (sıkıştırmasız) arşiv üretir; saf fonksiyondur, DOM gerektirmez.

export type ZipArchive = {
  /** Arşivdeki dosya adları (klasör girdileri hariç). */
  names: string[]
  has(name: string): boolean
  /** UTF-8 metin; dosya yoksa null. */
  text(name: string): Promise<string | null>
  bytes(name: string): Promise<Uint8Array | null>
}

export type ZipErrorCode = 'corrupt' | 'encrypted' | 'unsupported' | 'too-large'

export class ZipError extends Error {
  code: ZipErrorCode
  constructor(code: ZipErrorCode, message?: string) {
    super(message || code)
    this.code = code
    this.name = 'ZipError'
    Object.setPrototypeOf(this, ZipError.prototype)
  }
}

/** Zip bombasına karşı: tüm arşivden açılabilecek toplam veri. */
const MAX_TOTAL_INFLATED = 50 * 1024 * 1024
/** Tek bir girdinin sıkıştırma oranı sınırı (normal XML ≈ 5–20x). */
const MAX_RATIO = 200

type Entry = {
  name: string
  method: number
  flags: number
  compressedSize: number
  size: number
  localOffset: number
}

function toBytes(data: ArrayBuffer | Uint8Array): Uint8Array {
  return data instanceof Uint8Array ? data : new Uint8Array(data)
}

function decodeName(raw: Uint8Array, utf8: boolean): string {
  if (utf8 || typeof TextDecoder !== 'undefined') {
    try {
      return new TextDecoder('utf-8', { fatal: false }).decode(raw)
    } catch {
      /* aşağıdaki yedeğe düş */
    }
  }
  let s = ''
  for (let i = 0; i < raw.length; i++) s += String.fromCharCode(raw[i])
  return s
}

export async function readZip(data: ArrayBuffer | Uint8Array): Promise<ZipArchive> {
  const buf = toBytes(data)
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  const len = buf.length
  if (len < 22) throw new ZipError('corrupt', 'too small')

  // End Of Central Directory: sondan geriye (en fazla 64KB yorum) ara.
  let eocd = -1
  const stop = Math.max(0, len - 22 - 0xffff)
  for (let i = len - 22; i >= stop; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd < 0) throw new ZipError('corrupt', 'no EOCD')

  let count = view.getUint16(eocd + 10, true)
  let cdSize = view.getUint32(eocd + 12, true)
  let cdOffset = view.getUint32(eocd + 16, true)

  // ZIP64 (DOCX'te nadir; yine de destekle).
  if (count === 0xffff || cdOffset === 0xffffffff || cdSize === 0xffffffff) {
    const locator = eocd - 20
    if (locator >= 0 && view.getUint32(locator, true) === 0x07064b50) {
      const z64 = Number(readUint64(view, locator + 8))
      if (z64 >= 0 && z64 + 56 <= len && view.getUint32(z64, true) === 0x06064b50) {
        count = Number(readUint64(view, z64 + 32))
        cdSize = Number(readUint64(view, z64 + 40))
        cdOffset = Number(readUint64(view, z64 + 48))
      }
    }
  }
  if (cdOffset + cdSize > len) throw new ZipError('corrupt', 'central directory out of range')

  const entries: Record<string, Entry> = {}
  const names: string[] = []
  let p = cdOffset
  for (let i = 0; i < count; i++) {
    if (p + 46 > len || view.getUint32(p, true) !== 0x02014b50) throw new ZipError('corrupt', 'bad central header')
    const flags = view.getUint16(p + 8, true)
    const method = view.getUint16(p + 10, true)
    let compressedSize = view.getUint32(p + 20, true)
    let size = view.getUint32(p + 24, true)
    const nameLen = view.getUint16(p + 28, true)
    const extraLen = view.getUint16(p + 30, true)
    const commentLen = view.getUint16(p + 32, true)
    let localOffset = view.getUint32(p + 42, true)
    if (p + 46 + nameLen > len) throw new ZipError('corrupt', 'bad name')
    const name = decodeName(buf.subarray(p + 46, p + 46 + nameLen), (flags & 0x800) !== 0)

    // ZIP64 ek alanı: 0xFFFFFFFF olan değerler sırayla burada durur.
    if (size === 0xffffffff || compressedSize === 0xffffffff || localOffset === 0xffffffff) {
      let e = p + 46 + nameLen
      const end = e + extraLen
      while (e + 4 <= end) {
        const id = view.getUint16(e, true)
        const sz = view.getUint16(e + 2, true)
        if (id === 0x0001) {
          let q = e + 4
          if (size === 0xffffffff) (size = Number(readUint64(view, q))), (q += 8)
          if (compressedSize === 0xffffffff) (compressedSize = Number(readUint64(view, q))), (q += 8)
          if (localOffset === 0xffffffff) localOffset = Number(readUint64(view, q))
          break
        }
        e += 4 + sz
      }
    }

    p += 46 + nameLen + extraLen + commentLen
    if (name.endsWith('/')) continue
    // Bazı arşivleyiciler Windows ayırıcısı yazar; tek biçime getir.
    const key = name.replace(/\\/g, '/')
    if (!entries[key]) names.push(key)
    entries[key] = { name: key, method, flags, compressedSize, size, localOffset }
  }

  let inflatedTotal = 0

  async function bytes(name: string): Promise<Uint8Array | null> {
    const entry = entries[name.replace(/^\//, '')]
    if (!entry) return null
    if (entry.flags & 0x1) throw new ZipError('encrypted', name)
    const lo = entry.localOffset
    if (lo + 30 > len || view.getUint32(lo, true) !== 0x04034b50) throw new ZipError('corrupt', 'bad local header')
    const start = lo + 30 + view.getUint16(lo + 26, true) + view.getUint16(lo + 28, true)
    const end = start + entry.compressedSize
    if (end > len) throw new ZipError('corrupt', 'entry out of range')
    const raw = buf.subarray(start, end)

    if (entry.method === 0) {
      inflatedTotal += raw.length
      if (inflatedTotal > MAX_TOTAL_INFLATED) throw new ZipError('too-large', 'archive too large')
      return raw.slice()
    }
    if (entry.method !== 8) throw new ZipError('unsupported', `method ${entry.method}`)

    // Beyan edilen boyut da sınırlanır; ama beyana güvenmeden akış sırasında da sayılır.
    if (entry.size > MAX_TOTAL_INFLATED || (entry.compressedSize > 0 && entry.size / entry.compressedSize > MAX_RATIO && entry.size > 1024 * 1024)) {
      throw new ZipError('too-large', 'suspicious compression ratio')
    }
    return inflateRaw(raw, (n) => {
      inflatedTotal += n
      if (inflatedTotal > MAX_TOTAL_INFLATED) throw new ZipError('too-large', 'archive too large')
    })
  }

  async function text(name: string): Promise<string | null> {
    const b = await bytes(name)
    if (!b) return null
    return new TextDecoder('utf-8').decode(b)
  }

  return {
    names,
    has: (name) => !!entries[name.replace(/^\//, '')],
    text,
    bytes,
  }
}

function readUint64(view: DataView, offset: number): number {
  return view.getUint32(offset, true) + view.getUint32(offset + 4, true) * 0x100000000
}

async function inflateRaw(raw: Uint8Array, onChunk: (n: number) => void): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') throw new ZipError('unsupported', 'DecompressionStream missing')
  const ds = new DecompressionStream('deflate-raw')
  const writer = ds.writable.getWriter()
  const reader = ds.readable.getReader()
  // Yazma hataları okuma tarafında da görünür; yakalanmamış promise bırakma.
  writer.write(raw as unknown as BufferSource).catch(() => undefined)
  writer.close().catch(() => undefined)

  const chunks: Uint8Array[] = []
  let total = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      if (!value) continue
      onChunk(value.length)
      chunks.push(value)
      total += value.length
    }
  } catch (err) {
    reader.cancel().catch(() => undefined)
    if (err instanceof ZipError) throw err
    throw new ZipError('corrupt', 'inflate failed')
  }
  const out = new Uint8Array(total)
  let o = 0
  for (let i = 0; i < chunks.length; i++) {
    out.set(chunks[i], o)
    o += chunks[i].length
  }
  return out
}

/* ================================== yazıcı ================================== */

let CRC_TABLE: Uint32Array | null = null

function crcTable(): Uint32Array {
  if (CRC_TABLE) return CRC_TABLE
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  CRC_TABLE = t
  return t
}

export function crc32(data: Uint8Array): number {
  const t = crcTable()
  let c = 0xffffffff
  for (let i = 0; i < data.length; i++) c = t[(c ^ data[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function utf8(s: string): Uint8Array {
  return new TextEncoder().encode(s)
}

/** Yerel saati DOS tarih/saat alanlarına çevirir (2 saniye çözünürlük, 1980 tabanı). */
function dosDateTime(d: Date): { time: number; date: number } {
  const year = Math.max(1980, d.getFullYear())
  return {
    time: ((d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2)) & 0xffff,
    date: (((year - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xffff,
  }
}

/**
 * STORE yöntemiyle ZIP üretir. DOCX için yeterlidir: Word/LibreOffice/Pages
 * sıkıştırmasız paketleri sorunsuz açar; ilk girdi [Content_Types].xml olmalıdır.
 */
export function createZip(files: { name: string; data: Uint8Array | string }[], date: Date = new Date()): Uint8Array {
  const { time, date: dosDate } = dosDateTime(date)
  const locals: Uint8Array[] = []
  const centrals: Uint8Array[] = []
  let offset = 0

  for (let i = 0; i < files.length; i++) {
    const f = files[i]
    const name = utf8(f.name)
    const data = typeof f.data === 'string' ? utf8(f.data) : f.data
    const crc = crc32(data)

    const local = new Uint8Array(30 + name.length + data.length)
    const lv = new DataView(local.buffer)
    lv.setUint32(0, 0x04034b50, true)
    lv.setUint16(4, 20, true) // gereken sürüm 2.0
    lv.setUint16(6, 0x0800, true) // bit 11: UTF-8 dosya adı
    lv.setUint16(8, 0, true) // STORE
    lv.setUint16(10, time, true)
    lv.setUint16(12, dosDate, true)
    lv.setUint32(14, crc, true)
    lv.setUint32(18, data.length, true)
    lv.setUint32(22, data.length, true)
    lv.setUint16(26, name.length, true)
    lv.setUint16(28, 0, true)
    local.set(name, 30)
    local.set(data, 30 + name.length)
    locals.push(local)

    const central = new Uint8Array(46 + name.length)
    const cv = new DataView(central.buffer)
    cv.setUint32(0, 0x02014b50, true)
    cv.setUint16(4, 20, true) // oluşturan sürüm
    cv.setUint16(6, 20, true)
    cv.setUint16(8, 0x0800, true)
    cv.setUint16(10, 0, true)
    cv.setUint16(12, time, true)
    cv.setUint16(14, dosDate, true)
    cv.setUint32(16, crc, true)
    cv.setUint32(20, data.length, true)
    cv.setUint32(24, data.length, true)
    cv.setUint16(28, name.length, true)
    cv.setUint16(30, 0, true) // extra
    cv.setUint16(32, 0, true) // yorum
    cv.setUint16(34, 0, true) // disk
    cv.setUint16(36, 0, true) // iç öznitelik
    cv.setUint32(38, 0, true) // dış öznitelik
    cv.setUint32(42, offset, true)
    central.set(name, 46)
    centrals.push(central)

    offset += local.length
  }

  let cdSize = 0
  for (let i = 0; i < centrals.length; i++) cdSize += centrals[i].length

  const eocd = new Uint8Array(22)
  const ev = new DataView(eocd.buffer)
  ev.setUint32(0, 0x06054b50, true)
  ev.setUint16(8, files.length, true)
  ev.setUint16(10, files.length, true)
  ev.setUint32(12, cdSize, true)
  ev.setUint32(16, offset, true)

  const out = new Uint8Array(offset + cdSize + 22)
  let o = 0
  for (let i = 0; i < locals.length; i++) {
    out.set(locals[i], o)
    o += locals[i].length
  }
  for (let i = 0; i < centrals.length; i++) {
    out.set(centrals[i], o)
    o += centrals[i].length
  }
  out.set(eocd, o)
  return out
}
