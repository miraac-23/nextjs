'use client'

// PDF / DOCX → düz metin (§8, §14).
//
// Neden tarayıcıda: projede bu iş için zaten sınanmış ayrıştırıcılar var
// (lib/ats/parse — pdf.js tabanlı PDF okuyucu ve bağımlılıksız DOCX okuyucu).
// Yeniden kullanmak hem yeni paket eklemeyi hem de dosyanın sunucuya
// yüklenmesini gereksiz kılıyor: dosya cihazdan çıkmaz, AI'ya yalnızca
// ÇIKARILAN METİN gider. Bu aynı zamanda ürünün gizlilik vaadini korur.
//
// Güvenlik: tür tespiti uzantıya güvenmez — sihirli baytlar + MIME birlikte
// kontrol edilir (bkz. lib/ats/parse/index.ts). Boyut sınırı 10 MB. Çıkarılan
// metin hiçbir yerde HTML olarak render edilmez; yalnızca metin alanına yazılır.

import { parseFile } from '@/lib/ats/parse'
import { cleanExtractedText } from './chunk'
import { LIMITS } from './schema'

export type ExtractErrorCode = 'too-large' | 'type' | 'empty' | 'failed'

export class ExtractError extends Error {
  code: ExtractErrorCode
  constructor(code: ExtractErrorCode) {
    super(code)
    this.name = 'ExtractError'
    this.code = code
    // es5 hedefinde `instanceof` ancak prototip elle bağlanırsa çalışır.
    Object.setPrototypeOf(this, ExtractError.prototype)
  }
}

export type ExtractedDocument = {
  fileName: string
  text: string
  pageCount: number
  /** Kırpma öncesi karakter sayısı — kullanıcıya "ne kadarı okundu" demek için. */
  chars: number
  /** Metin `LIMITS.sourceText` sınırına takılıp kırpıldı mı? */
  truncated: boolean
}

/**
 * Kabul edilen uzantılar.
 *
 * Düz metin (.txt/.md) de kabul edilir: ayrıştırıcı zaten destekliyordu ama bu
 * katman reddediyordu — kullanıcı bir not dosyasını yükleyip "tür desteklenmiyor"
 * hatası alıyordu. Metin dosyası aynı zamanda en güvenli durum: ayrıştırma yok,
 * yalnızca UTF-8 okuma.
 */
const ALLOWED_EXT = ['pdf', 'docx', 'txt', 'md', 'markdown', 'text']
const ALLOWED_MIME = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
]

function extensionOf(name: string): string {
  const i = name.lastIndexOf('.')
  return i < 0 ? '' : name.slice(i + 1).toLowerCase()
}

/**
 * Ayrıştırmaya girmeden yakalanabilen hatalar — kullanıcı boşuna beklemesin.
 * MIME boş gelebilir (bazı tarayıcılar/işletim sistemleri doldurmaz); o durumda
 * uzantı yeterli sayılır, gerçek doğrulama sihirli baytlarda yapılır.
 */
function precheck(file: File): ExtractErrorCode | null {
  if (!file) return 'failed'
  if (file.size === 0) return 'empty'
  if (file.size > LIMITS.uploadBytes) return 'too-large'
  const ext = extensionOf(file.name || '')
  const mime = (file.type || '').toLowerCase()
  if (ALLOWED_EXT.indexOf(ext) < 0) return 'type'
  if (mime && ALLOWED_MIME.indexOf(mime) < 0) return 'type'
  return null
}

/** Dosyadan metni çıkarır. Hata durumunda `ExtractError` fırlatır. */
export async function extractDocument(file: File): Promise<ExtractedDocument> {
  const failure = precheck(file)
  if (failure) throw new ExtractError(failure)

  let text: string
  let pageCount = 1
  try {
    const doc = await parseFile(file)
    if (doc.source !== 'pdf' && doc.source !== 'docx' && doc.source !== 'txt') throw new ExtractError('type')
    text = cleanExtractedText(doc.text)
    pageCount = doc.pageCount || 1
  } catch (e) {
    if (e instanceof ExtractError) throw e
    const code = e && typeof e === 'object' && 'code' in e ? String((e as { code: unknown }).code) : ''
    if (code === 'too-large') throw new ExtractError('too-large')
    if (code === 'unsupported' || code === 'encrypted') throw new ExtractError('type')
    if (code === 'empty') throw new ExtractError('empty')
    throw new ExtractError('failed')
  }

  // Taranmış (görsel) PDF'lerde metin katmanı yoktur: kullanıcıya net söylenir.
  // Eşik düz metinde daha düşük: kısa bir not dosyası da geçerli bir kaynaktır.
  const minChars = pageCount > 1 ? 120 : 40
  if (text.replace(/\s/g, '').length < minChars) throw new ExtractError('empty')

  const chars = text.length
  const truncated = chars > LIMITS.sourceText
  return {
    fileName: file.name || 'document',
    text: truncated ? text.slice(0, LIMITS.sourceText) : text,
    pageCount,
    chars,
    truncated,
  }
}
