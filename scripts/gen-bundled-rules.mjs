// rules-md/*.md  →  lib/codereview/bundledRules.ts
// Kural md dosyalarının TEK KAYNAĞI rules-md/ dizinidir; bu script onları tarayıcıya
// gömülecek TypeScript sabitine çevirir. md düzenledikten sonra çalıştırın:
//   node scripts/gen-bundled-rules.mjs
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const SRC = 'rules-md'
const OUT = 'lib/codereview/bundledRules.ts'

// README.md biçim dokümanıdır, kural dosyası değil — gömülmez (içindeki örnek
// checklist satırları yoksa kural sanılırdı).
const files = readdirSync(SRC).filter((f) => f.endsWith('.md') && f !== 'README.md').sort()
const entries = files
  .map((f) => `  ${JSON.stringify(f)}: ${JSON.stringify(readFileSync(join(SRC, f), 'utf8'))},`)
  .join('\n')

writeFileSync(
  OUT,
  '// OTOMATİK ÜRETİLDİ — kaynak: rules-md/*.md. ELLE DÜZENLEMEYİN.\n' +
  '// Yeniden üretmek için: node scripts/gen-bundled-rules.mjs\n' +
  '// Kod incelemenin başlangıç kural dosyaları; tarayıcıda localStorage\'a tohumlanır.\n\n' +
  'export const BUNDLED_RULES: Record<string, string> = {\n' + entries + '\n}\n',
)
console.log(`${files.length} md dosyası → ${OUT}`)
