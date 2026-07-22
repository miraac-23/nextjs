// Unified diff ayrıştırıcı — eklenen (+) satırları yeni dosyadaki gerçek satır numaralarıyla çıkarır.
import type { AddedLine } from './types'

const HUNK = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/

/**
 * Unified diff'ten yalnızca EKLENEN (+) satırları, yeni dosyadaki gerçek satır
 * numaralarıyla çıkarır. Hunk başlıkları (@@) sayacı yeniden konumlandırır;
 * silinen satırlar yeni dosyada numara ilerletmez.
 * @param rawDiff Tek dosyaya ait unified diff metni
 */
export function extractAddedLines(rawDiff: string): AddedLine[] {
  const result: AddedLine[] = []
  if (!rawDiff) return result

  let newLine = 0
  for (const line of rawDiff.split('\n')) {
    const hunk = HUNK.exec(line)
    if (hunk) {
      newLine = parseInt(hunk[1], 10)
      continue
    }
    if (line.startsWith('+++') || line.startsWith('---')) continue // dosya başlıkları
    if (line.startsWith('+')) {
      result.push({ newLineNumber: newLine, content: line.slice(1) })
      newLine++
    } else if (line.startsWith('-')) {
      // silinen satır: yeni dosyada numara ilerlemez
    } else {
      newLine++ // bağlam satırı
    }
  }
  return result
}
