// md kural deposu — PROJEYE GÖMÜLÜ md dosyalarından (rules-md/*.md) tohumlanır,
// çalışma kopyası tarayıcıda (localStorage) tutulur. Ekranda: listele, kural ekle/düzenle/sil,
// yeni md oluştur, md içeriğini düzenle. Tarayıcı diske yazamadığı için kalıcılaştırmak =
// "İndir" ile dosyayı indirip projedeki rules-md/ altını güncelle.

import type { Rule, RuleDraft } from './types'
import { BUNDLED_RULES } from './bundledRules'

// Projeye gömülü başlangıç md dosyaları (build sırasında bundledRules.ts'e gömülür).
const BUNDLED: Record<string, string> = BUNDLED_RULES

const STORE_KEY = 'pcr-md-store'
const BASE_KEY = 'pcr-md-base'   // dosya adı → son tohumlanan gömülü sürümün damgası
const SECTION = '## Uygulama Kuralları (Portal Code Review)'
const RULE_RE = /<!--\s*pcr\s+(\{[\s\S]*?\})\s*-->/
const CHECK_RE = /^\s*[-*]\s*\[[ xX]\]\s+(.*)$/
const LINK_RE = /\[([^\]]+)\]\([^)]*\)/g
const PRIO_RE = /\[\s*[ÖO]ncelik\s*:\s*([A-Za-zÇĞİÖŞÜçğıöşü]+)\s*\]/
const REF_RE = /\([^)]*§[^)]*\)/g
// Numaralı standart başlığı: "## 3.1 Başlık" / "### A.1 Başlık" / "## 4. Controller"
const H_RE = /^#{2,3}\s+([A-Z]?\.?\d+[.\d]*\s+.*)$/

type FileMap = Record<string, string>

/** Yoldan yalnızca dosya adını alır (gömülü dosyalar dizin önekiyle gelebilir). */
function baseName(path: string): string {
  return path.split('/').pop() as string
}

/** Gömülü dosyaları {dosyaAdı: içerik} olarak döndürür. */
function bundledFiles(): FileMap {
  const out: FileMap = {}
  for (const [path, content] of Object.entries(BUNDLED)) out[baseName(path)] = content
  return out
}

/** Kısa, kararlı içerik damgası (FNV-1a 32-bit) — dosyanın değişip değişmediğini anlamak için. */
function hash(s: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) }
  return (h >>> 0).toString(36)
}

/** Her dosyanın en son TOHUMLANAN gömülü sürümünün damgası — kullanıcı düzenlemesini ayırt eder. */
function baseHashes(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(BASE_KEY) || '{}') } catch { return {} }
}

/**
 * Depoyu localStorage'dan okur; boşsa gömülü dosyalardan tohumlar.
 * Projedeki md dosyaları güncellendiğinde:
 *  - kullanıcıda hiç yoksa → eklenir,
 *  - kullanıcı DOKUNMAMIŞSA (damga tohumlanan sürümle aynı) → sessizce güncellenir,
 *  - kullanıcı DÜZENLEMİŞSE → dokunulmaz; `outdatedFiles()` ile UI'da güncelleme teklif edilir.
 */
function store(): FileMap {
  const raw = localStorage.getItem(STORE_KEY)
  if (raw) {
    try {
      const cur = JSON.parse(raw) as FileMap
      const bundled = bundledFiles()
      const base = baseHashes()
      let changed = false
      for (const [name, content] of Object.entries(bundled)) {
        if (cur[name] == null) {
          cur[name] = content; base[name] = hash(content); changed = true
        } else if (cur[name] !== content && base[name] != null && base[name] === hash(cur[name])) {
          cur[name] = content; base[name] = hash(content); changed = true // düzenlenmemiş → güncelle
        } else if (base[name] == null) {
          base[name] = hash(cur[name]); changed = true // eski kurulum: mevcut hali temel al
        }
      }
      if (changed) { localStorage.setItem(STORE_KEY, JSON.stringify(cur)); localStorage.setItem(BASE_KEY, JSON.stringify(base)) }
      return cur
    } catch { /* bozuksa yeniden tohumla */ }
  }
  const seed = bundledFiles()
  saveStore(seed)
  const base: Record<string, string> = {}
  for (const [n, c] of Object.entries(seed)) base[n] = hash(c)
  localStorage.setItem(BASE_KEY, JSON.stringify(base))
  return seed
}

/**
 * Projedeki gömülü sürümü, kullanıcıdaki kopyadan FARKLI olan dosyalar.
 * (Otomatik güncellenemeyenler: kullanıcı düzenlemiş ya da damgası bilinmeyen eski kurulum.)
 */
export function outdatedFiles(): string[] {
  const cur = store()
  const bundled = bundledFiles()
  return Object.keys(bundled).filter((n) => cur[n] !== bundled[n]).sort()
}

/** Verilen dosyaları projedeki gömülü sürümle değiştirir (yalnız o dosyalar; diğerleri korunur). */
export function refreshFromBundled(names: string[]): void {
  const cur = store()
  const bundled = bundledFiles()
  const base = baseHashes()
  for (const n of names) {
    if (bundled[n] == null) continue
    cur[n] = bundled[n]; base[n] = hash(bundled[n])
  }
  localStorage.setItem(STORE_KEY, JSON.stringify(cur))
  localStorage.setItem(BASE_KEY, JSON.stringify(base))
}

/** Çalışma kopyasını localStorage'a yazar. */
function saveStore(files: FileMap): void {
  localStorage.setItem(STORE_KEY, JSON.stringify(files))
}

/** Depoyu projedeki gömülü md dosyalarından baştan yükler (yapılan değişiklikleri siler). */
export function resetToBundled(): void {
  const bundled = bundledFiles()
  saveStore(bundled)
  const base: Record<string, string> = {}
  for (const [n, c] of Object.entries(bundled)) base[n] = hash(c)
  localStorage.setItem(BASE_KEY, JSON.stringify(base))
}

// --- Dosya yönetimi ---

/** Depodaki md dosya adları (alfabetik). */
export function listMdFiles(): string[] {
  return Object.keys(store()).sort()
}

/** Bir md dosyasının güncel içeriği (yoksa boş metin). */
export function getContent(name: string): string {
  return store()[name] ?? ''
}

/** Bir md dosyasının içeriğini değiştirir (yalnızca tarayıcı kopyası). */
export function setContent(name: string, content: string): void {
  const files = store()
  files[name] = content
  saveStore(files)
}

/**
 * Yeni bir md dosyası oluşturur; uzantı yoksa `.md` eklenir.
 * @throws Ad boşsa ya da aynı adda dosya varsa
 */
export function createFile(name: string): void {
  let file = name.trim()
  if (!file) throw new Error('Dosya adı gerekli.')
  if (!file.toLowerCase().endsWith('.md')) file += '.md'
  const files = store()
  if (files[file] != null) throw new Error('Bu isimde dosya zaten var.')
  files[file] = `# ${file.replace(/\.md$/, '')}\n\n${SECTION}\n<!-- Bu bölüm Portal Code Review tarafından yönetilir. -->\n`
  saveStore(files)
}

/** Bir md dosyasını tarayıcı kopyasından siler (projedeki dosya etkilenmez). */
export function deleteFile(name: string): void {
  const files = store()
  delete files[name]
  saveStore(files)
}

/** Dosyayı tarayıcıdan indirir (projedeki rules-md/ altını elle güncellemek için). */
export function downloadFile(name: string): void {
  const blob = new Blob([getContent(name)], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = name; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// --- Kural okuma/yazma ---

/**
 * Tüm md dosyalarındaki kuralları okur: (1) uygulamanın yapılandırılmış kuralları (<!-- pcr -->),
 * (2) mevcut checklist maddeleri (- [ ] ...). Her kural kaynak dosya + satır indeksiyle izlenir.
 */
export function readAllRules(): Rule[] {
  const rules: Rule[] = []
  const files = store()
  for (const file of Object.keys(files).sort()) {
    const pattern = inferPattern(file)
    const lines = files[file].split('\n')
    const structured: Rule[] = []
    const checklist: Rule[] = []

    lines.forEach((line, index) => {
      // 1) Uygulamanın eklediği yapılandırılmış kural
      const s = RULE_RE.exec(line)
      if (s) {
        try {
          const d = JSON.parse(s[1])
          structured.push({
            id: `${file}#${index}`, sourceFile: file, raw: line,
            name: d.name ?? '(isimsiz)', description: d.description ?? '',
            type: d.type === 'REGEX' ? 'REGEX' : 'LLM',
            severity: d.severity ?? 'MAJOR', filePattern: d.filePattern ?? '**',
            body: d.body ?? '', enabled: d.enabled !== false,
          })
        } catch { /* atla */ }
        return
      }
      // 2) Mevcut checklist maddesi
      const c = CHECK_RE.exec(line)
      if (c) {
        const clean = cleanup(c[1])
        if (clean.length < 8) return
        checklist.push({
          id: `${file}#${index}`, sourceFile: file, raw: line,
          name: trimName(clean), description: `Kaynak: ${file}`,
          type: 'LLM', severity: severityFrom(c[1]), filePattern: pattern,
          body: clean, enabled: true,
        })
      }
    })

    rules.push(...structured)
    if (checklist.length > 0) {
      rules.push(...checklist)
    } else if (structured.length === 0) {
      // 3) Fallback: checklist yoksa numaralı standart BAŞLIKLARINI kural yap (spring/hibernate/golge dokümanları).
      lines.forEach((line, index) => {
        const h = H_RE.exec(line.trim())
        if (!h) return
        const title = cleanup(h[1])
        if (title.length < 6 || isMeta(title)) return
        rules.push({
          id: `${file}#${index}`, sourceFile: file, raw: line,
          name: trimName(title), description: `Kaynak: ${file}`,
          type: 'LLM', severity: 'MAJOR', filePattern: pattern,
          body: `${title} — bu standarda uyulmalı.`,
          enabled: true,
        })
      })
    }
  }
  return rules
}

/**
 * Türkçe aksanları ASCII'ye indirger — "İlgili"/"Ilgili"/"ilgili"/"ılgili" hepsi "ilgili" olur.
 * (Türkçe locale'de "I".toLocaleLowerCase('tr') → "ı" olduğu için düz karşılaştırma kaçırıyordu.)
 */
function foldTr(s: string): string {
  return s.toLocaleLowerCase('tr')
    .replace(/[ıİ]/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g')
    .replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c')
}

const META_TITLES = ['icindekiler', 'amac', 'arka plan', 'kapsam', 'hizli referans', 'ilgili dosya', 'capraz-link', 'modul haritasi']

/** İçindekiler/amaç/kapsam gibi kural olmayan başlıkları eler. */
function isMeta(title: string): boolean {
  const t = foldTr(title)
  return META_TITLES.some((m) => t.includes(m))
}

/**
 * Yeni kuralı hedef md dosyasının yönetilen bölümüne yapılandırılmış satır olarak ekler.
 * Bölüm yoksa dosyanın sonunda oluşturulur.
 */
export function addRule(fileName: string, draft: RuleDraft): void {
  let text = getContent(fileName)
  if (!text.includes(SECTION)) {
    text = text.replace(/\s*$/, '') + `\n\n${SECTION}\n<!-- Bu bölüm Portal Code Review tarafından yönetilir. -->\n`
  }
  setContent(fileName, text.replace(/\s*$/, '') + '\n' + ruleLine(draft) + '\n')
}

/**
 * Kuralın md'deki satırını yeni içerikle değiştirir.
 * Satır indeksi kaymışsa ham satır metniyle aranır.
 */
export function updateRule(rule: Rule, draft: RuleDraft): void {
  const lines = getContent(rule.sourceFile).split('\n')
  const idx = lineIndexOf(rule)
  if (idx >= 0 && idx < lines.length && lines[idx] === rule.raw) lines[idx] = ruleLine(draft)
  else { const j = lines.indexOf(rule.raw); if (j >= 0) lines[j] = ruleLine(draft) }
  setContent(rule.sourceFile, lines.join('\n'))
}

/** Kuralın md'deki satırını siler (indeks kaymışsa ham satır metniyle bulunur). */
export function deleteRule(rule: Rule): void {
  const lines = getContent(rule.sourceFile).split('\n')
  const idx = lineIndexOf(rule)
  if (idx >= 0 && idx < lines.length && lines[idx] === rule.raw) lines.splice(idx, 1)
  else { const j = lines.indexOf(rule.raw); if (j >= 0) lines.splice(j, 1) }
  setContent(rule.sourceFile, lines.join('\n'))
}

// --- yardımcılar ---

function ruleLine(d: RuleDraft): string {
  const payload = JSON.stringify({
    name: d.name, description: d.description ?? '', type: d.type,
    severity: d.severity, filePattern: d.filePattern || '**', body: d.body, enabled: d.enabled,
  })
  return `- [${d.enabled ? 'x' : ' '}] ${d.name} <!-- pcr ${payload} -->`
}

/**
 * Checklist metnini motorun kullanacağı sade metne indirger: markdown bağlantıları metne,
 * `[Öncelik: X]` ve `(… § …)` referansları silinir, `**`/backtick atılır, boşluklar teke iner.
 * DİKKAT: desen yazarken bu temizlik göz önünde bulundurulmalı (bkz. rules-md/README.md).
 */
function cleanup(text: string): string {
  return text.replace(LINK_RE, '$1').replace(PRIO_RE, '').replace(REF_RE, '')
    .replace(/\*\*/g, '').replace(/`/g, '').replace(/\s+/g, ' ').trim()
}

// --- ayrıştırma izi (UI'da "ham satır → işlenmiş kural" adımlarını göstermek için) ---

export interface ParseStep {
  label: string
  /** Bu adımda metinden çıkarılan parçalar (boşsa adım bir şey değiştirmemiştir). */
  removed: string[]
  /** Adım sonrası metnin hali. */
  result: string
}

export interface ParseTrace {
  kind: 'checklist' | 'structured' | 'heading'
  raw: string
  steps: ParseStep[]
  /** Temizlik sonrası, kuralın gövdesi olarak kullanılan metin. */
  cleaned: string
  /** Alanların hangi ipucundan türetildiği. */
  origins: { severity: string; filePattern: string; name: string }
}

/** Bir temizlik adımını uygular ve çıkarılan parçaları kaydeder. */
function step(label: string, text: string, re: RegExp, replacer: string): ParseStep {
  const removed: string[] = []
  const result = text.replace(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'), (m, ...g) => {
    const kept = replacer === '$1' ? String(g[0] ?? '') : ''
    if (m !== kept) removed.push(m.trim())
    return kept
  })
  return { label, removed, result }
}

/** md'deki ham satırın kurala nasıl dönüştüğünü adım adım açıklar. */
export function traceParse(rule: Rule): ParseTrace {
  const raw = rule.raw ?? ''

  // 1) Uygulamanın kendi yazdığı yapılandırılmış kural: JSON olarak okunur, temizlik yok.
  if (RULE_RE.test(raw)) {
    return {
      kind: 'structured', raw, steps: [{ label: 'JSON yapılandırması okundu', removed: [], result: rule.body }],
      cleaned: rule.body,
      origins: { severity: 'kuralda açıkça yazılı', filePattern: 'kuralda açıkça yazılı', name: 'kuralda açıkça yazılı' },
    }
  }

  const heading = H_RE.exec(raw.trim())
  const check = CHECK_RE.exec(raw)
  const source = check ? check[1] : heading ? heading[1] : raw

  const steps: ParseStep[] = []
  let t = source
  steps.push({ label: check ? 'Checklist işareti ayrıldı' : 'Başlık işareti ayrıldı', removed: [], result: t })

  const s1 = step('Markdown bağlantıları metne indirgendi', t, LINK_RE, '$1'); t = s1.result; steps.push(s1)
  const s2 = step('Öncelik etiketi çıkarıldı', t, PRIO_RE, ''); t = s2.result; steps.push(s2)
  const s3 = step('Bölüm referansları çıkarıldı', t, REF_RE, ''); t = s3.result; steps.push(s3)
  const s4 = step('Biçimlendirme işaretleri silindi (** ve `)', t, /\*\*|`/g, ''); t = s4.result; steps.push(s4)

  const collapsed = t.replace(/\s+/g, ' ').trim()
  steps.push({ label: 'Boşluklar sadeleştirildi', removed: [], result: collapsed })

  return {
    kind: heading && !check ? 'heading' : 'checklist',
    raw, steps, cleaned: collapsed,
    origins: {
      severity: PRIO_RE.test(source) ? 'satırdaki [Öncelik: …] etiketinden' : 'varsayılan (MAJOR)',
      filePattern: `kaynak dosya adından (${rule.sourceFile})`,
      name: collapsed.includes(' — ') ? 'ilk “ — ” ayracına kadar olan kısım' : 'temizlenmiş metnin tamamı (90 karakterde kısaltılır)',
    },
  }
}

/**
 * Kural adını üretir: ilk " — " ayracına kadar olan kısım, en fazla 90 karakter.
 * Ad yalnızca GÖSTERİM içindir; denetim her zaman tam gövde üzerinden yapılır.
 */
function trimName(clean: string): string {
  let n = clean
  const dash = n.indexOf(' — ')
  if (dash > 10) n = n.slice(0, dash)
  return n.length > 90 ? n.slice(0, 90).trim() + '…' : n
}

/**
 * Checklist satırındaki `[Öncelik: Blocker|Critical|Major|Minor]` etiketinden önem
 * derecesini çıkarır; etiket yoksa MAJOR varsayılır.
 */
function severityFrom(text: string): Rule['severity'] {
  const m = PRIO_RE.exec(text)
  if (m) {
    const p = m[1].toLocaleLowerCase('tr')
    if (p.startsWith('block')) return 'BLOCKER'
    if (p.startsWith('crit') || p.startsWith('krit')) return 'CRITICAL'
    if (p.startsWith('maj')) return 'MAJOR'
    if (p.startsWith('min')) return 'MINOR'
  }
  return 'MAJOR'
}

/**
 * md dosyasının adından hangi kaynak dosyalara uygulanacağını çıkarır (ör. react → *.tsx).
 * Alan eki ("frontend") teknoloji anahtar kelimesinden ÖNCE değerlendirilir.
 */
function inferPattern(fileName: string): string {
  const f = fileName.toLowerCase()
  // Alan eki her şeyden önce gelir: "04-golge-framework-frontend" gibi adlarda teknoloji
  // anahtar kelimesi ("golge" → java) yanlış tarafı seçerdi.
  if (f.includes('frontend')) return '*.tsx'
  // frontend framework'leri
  if (f.includes('react')) return '*.tsx'
  if (f.includes('vue')) return '*.vue'
  if (f.includes('angular')) return '*.ts'
  if (f.includes('svelte')) return '*.svelte'
  // backend dilleri/framework'leri (golge → java'dan önce ele alınır)
  if (f.includes('spring') || f.includes('hibernate') || f.includes('jpa') || f.includes('golge') || (f.includes('java') && !f.includes('javascript'))) return '*.java'
  if (f.includes('python') || f.includes('django') || f.includes('flask') || f.includes('fastapi')) return '*.py'
  if (f.includes('golang') || /(^|[-_ ])go([-_ .]|$)/.test(f)) return '*.go'
  if (f.includes('csharp') || f.includes('dotnet') || f.includes('.net')) return '*.cs'
  if (f.includes('php') || f.includes('laravel') || f.includes('symfony')) return '*.php'
  if (f.includes('node') || f.includes('express') || f.includes('nest')) return '*.ts'
  if (f.includes('kotlin')) return '*.kt'
  if (f.includes('ruby') || f.includes('rails')) return '*.rb'
  if (f.includes('rust')) return '*.rs'
  return '**'
}

/** md dosyasının görüntülenme grubu — ada göre alan (Frontend/Backend/Genel) + teknoloji. */
export interface FileGroup { area: 'Frontend' | 'Backend' | 'Genel'; tech: string; icon: string }
/** md dosyasının listelenirken kullanılacağı grup: alan (Frontend/Backend/Genel) + teknoloji + ikon. */
export function fileGroup(fileName: string): FileGroup {
  const f = fileName.toLowerCase()
  const has = (...k: string[]) => k.some((x) => f.includes(x))
  // frontend
  if (has('react')) return { area: 'Frontend', tech: 'React', icon: '⚛️' }
  if (has('vue')) return { area: 'Frontend', tech: 'Vue', icon: '🟢' }
  if (has('angular')) return { area: 'Frontend', tech: 'Angular', icon: '🅰️' }
  if (has('svelte')) return { area: 'Frontend', tech: 'Svelte', icon: '🧡' }
  if (has('frontend', 'checklist')) return { area: 'Frontend', tech: 'Genel', icon: '🎨' }
  // backend
  if (has('spring', 'hibernate', 'jpa', 'golge') || (has('java') && !has('javascript'))) return { area: 'Backend', tech: 'Java / Spring', icon: '☕' }
  if (has('python', 'django', 'flask', 'fastapi')) return { area: 'Backend', tech: 'Python', icon: '🐍' }
  if (has('golang') || /(^|[-_ ])go([-_ .]|$)/.test(f)) return { area: 'Backend', tech: 'Go', icon: '🐹' }
  if (has('csharp', 'dotnet', '.net')) return { area: 'Backend', tech: 'C# / .NET', icon: '🎯' }
  if (has('php', 'laravel', 'symfony')) return { area: 'Backend', tech: 'PHP', icon: '🐘' }
  if (has('node', 'express', 'nest')) return { area: 'Backend', tech: 'Node.js', icon: '🟩' }
  if (has('kotlin')) return { area: 'Backend', tech: 'Kotlin', icon: '🟪' }
  if (has('ruby', 'rails')) return { area: 'Backend', tech: 'Ruby', icon: '💎' }
  if (has('rust')) return { area: 'Backend', tech: 'Rust', icon: '🦀' }
  if (has('backend', 'api')) return { area: 'Backend', tech: 'Genel', icon: '⚙️' }
  return { area: 'Genel', tech: 'Genel', icon: '📄' }
}

/** Kuralın id'sindeki (`dosya#index`) satır indeksini çözer; çözülemezse -1. */
function lineIndexOf(rule: Rule): number {
  const i = rule.id.lastIndexOf('#')
  return i >= 0 ? parseInt(rule.id.slice(i + 1), 10) : -1
}
