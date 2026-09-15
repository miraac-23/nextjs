// Yüklenen CV dosyasını `AtsDocument`e çevirir. Tamamen tarayıcıda çalışır; dosya cihazdan çıkmaz.
//
// Tür tespiti: uzantı + MIME + sihirli baytlar (%PDF-, PK\x03\x04, OLE, RTF, görseller).
// Sözleşme: `lines[i]` ↔ `text.split('\n')[i]`; ölçülemeyen yerleşim sinyali undefined kalır.

import type { AtsDocument } from '../types'
import { AtsParseError, MAX_FILE_BYTES } from './shared'

export { AtsParseError } from './shared'

type Kind = 'pdf' | 'docx' | 'txt'

const startsWith = (buf: Uint8Array, sig: number[], offset = 0) => {
  if (buf.length < offset + sig.length) return false
  for (let i = 0; i < sig.length; i++) if (buf[offset + i] !== sig[i]) return false
  return true
}

function hasPdfHeader(buf: Uint8Array): boolean {
  // Bazı üreticiler başlıktan önce birkaç çöp bayt yazar; ilk 1 KB'ta ara.
  const limit = Math.min(buf.length - 5, 1024)
  for (let i = 0; i <= limit; i++) {
    if (buf[i] === 0x25 && buf[i + 1] === 0x50 && buf[i + 2] === 0x44 && buf[i + 3] === 0x46 && buf[i + 4] === 0x2d) return true
  }
  return false
}

function isImage(buf: Uint8Array): boolean {
  return (
    startsWith(buf, [0x89, 0x50, 0x4e, 0x47]) || // PNG
    startsWith(buf, [0xff, 0xd8, 0xff]) || // JPEG
    startsWith(buf, [0x47, 0x49, 0x46, 0x38]) || // GIF
    (startsWith(buf, [0x52, 0x49, 0x46, 0x46]) && startsWith(buf, [0x57, 0x45, 0x42, 0x50], 8)) || // WEBP
    startsWith(buf, [0x66, 0x74, 0x79, 0x70], 4) || // HEIC/AVIF (ftyp)
    startsWith(buf, [0x49, 0x49, 0x2a, 0x00]) ||
    startsWith(buf, [0x4d, 0x4d, 0x00, 0x2a]) || // TIFF
    startsWith(buf, [0x42, 0x4d]) // BMP
  )
}

function detectKind(buf: Uint8Array, ext: string, mime: string): Kind {
  if (hasPdfHeader(buf)) return 'pdf'
  if (startsWith(buf, [0x50, 0x4b, 0x03, 0x04])) {
    if (/^(odt|ods|odp|pages|xlsx|pptx|epub|zip)$/.test(ext)) throw new AtsParseError('unsupported')
    return 'docx'
  }
  if (startsWith(buf, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) {
    // OLE kapsayıcı: ya eski .doc ya da parola ile şifrelenmiş OOXML.
    if (ext === 'docx' || /wordprocessingml/.test(mime)) throw new AtsParseError('encrypted')
    throw new AtsParseError('unsupported')
  }
  if (startsWith(buf, [0x7b, 0x5c, 0x72, 0x74, 0x66])) throw new AtsParseError('unsupported') // {\rtf
  if (isImage(buf) || /^image\//.test(mime)) throw new AtsParseError('unsupported')

  if (ext === 'pdf' || mime === 'application/pdf') throw new AtsParseError('corrupt', 'missing PDF header')
  if (ext === 'docx' || /wordprocessingml/.test(mime)) throw new AtsParseError('corrupt', 'not a zip')
  if (/^(txt|text|md|markdown)$/.test(ext) || mime === 'text/plain' || mime === 'text/markdown') return 'txt'
  throw new AtsParseError('unsupported')
}

export async function parseFile(file: File): Promise<AtsDocument> {
  if (!file) throw new AtsParseError('unsupported')
  if (file.size > MAX_FILE_BYTES) throw new AtsParseError('too-large')
  if (file.size === 0) throw new AtsParseError('empty')

  const name = file.name || ''
  const ext = ((name.match(/\.([a-z0-9]+)$/i) || [])[1] || '').toLowerCase()
  const mime = (file.type || '').toLowerCase()

  let buf: Uint8Array
  try {
    buf = new Uint8Array(await file.arrayBuffer())
  } catch {
    throw new AtsParseError('corrupt', 'read failed')
  }

  try {
    const kind = detectKind(buf, ext, mime)
    if (kind === 'pdf') {
      const { parsePdf } = await import('./pdf')
      return await parsePdf(buf, name || undefined)
    }
    if (kind === 'docx') {
      const { parseDocx } = await import('./docx')
      return await parseDocx(buf, name || undefined)
    }
    const { parseTxt } = await import('./txt')
    return parseTxt(buf, name || undefined)
  } catch (err) {
    if (err instanceof AtsParseError) throw err
    throw new AtsParseError('corrupt', err instanceof Error ? err.message : undefined)
  }
}
