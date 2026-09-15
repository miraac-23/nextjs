// pdfjs-dist worker dosyasını public/pdfjs/ altına kopyalar (postinstall).
// Tarayıcı worker'ı '/pdfjs/pdf.worker.min.mjs' adresinden yükler; sürüm, kütüphaneyle
// birebir aynı olmalıdır — bu yüzden her kurulumdan sonra yeniden kopyalanır.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.min.mjs')
const destDir = join(root, 'public', 'pdfjs')

if (!existsSync(src)) {
  // Kurulum yarıda kaldıysa derlemeyi bozma; public/ altındaki mevcut kopya kullanılır.
  console.warn('[copy-pdf-worker] pdfjs-dist bulunamadı, kopyalama atlandı.')
} else {
  mkdirSync(destDir, { recursive: true })
  copyFileSync(src, join(destDir, 'pdf.worker.min.mjs'))
  console.log('[copy-pdf-worker] public/pdfjs/pdf.worker.min.mjs güncellendi.')
}
