// Deterministik kural dedektörleri — md dosyalarındaki düz-dil kuralları YAPAY ZEKA OLMADAN,
// tarayıcıda satır satır denetler. Bir kuralın adı/metni bir dedektörün anahtar kelimelerinden
// birini içeriyorsa o dedektör kurala bağlanır ve eklenen satırlarda ihlalleri bulur.
//
// Yeni bir kural türü eklemek için: DETECTORS listesine bir madde ekleyin (anahtar kelime + test).

/** Dosyanın ön/arka uç türü — dedektör kapsamı bununla eşleşir. */
export type FileKind = 'frontend' | 'backend' | 'other'

/** Dosya uzantısından ön uç / arka uç sınıfı çıkarır (dedektör kapsamı bununla eşleşir). */
export function fileKind(path: string): FileKind {
  const p = path.toLowerCase()
  if (/\.(java|kt|kts|scala|groovy|py|go|cs|php|rb|rs)$/.test(p)) return 'backend'
  if (/\.(tsx|jsx|vue|svelte|css|scss|less|html)$/.test(p)) return 'frontend'
  if (/\.(ts|js|mjs|cjs)$/.test(p)) return 'frontend' // JS/TS varsayılan ön uç (node kuralları dosya deseniyle sınırlıdır)
  return 'other'
}

export interface Detector {
  id: string
  label: string
  /** Kural metninde bunlardan biri geçerse dedektör kurala bağlanır (küçük harfle karşılaştırılır). */
  keywords: string[]
  /** Hangi dosyalarda çalışır: 'any' = hepsi. */
  scope: 'any' | 'frontend' | 'backend'
  message: string
  suggestion: string
  /** Eklenen bir satır kuralı ihlal ediyorsa true döner. */
  test: (line: string) => boolean
  /** Kuralı ihlal eden örnek satır (detay ekranında gösterilir; test() ile doğrulanır). */
  sample: string
}

// --- yardımcı test'ler ---

/** Satır bir yorum mu (satır yorumu, blok yorumu, JSX/HTML yorumu)? http:// yanlış-pozitifini eler. */
export function isCommentLine(line: string): boolean {
  const t = line.trim()
  if (!t) return false
  if (/^(\/\/|\/\*|\*\/|\*|<!--)/.test(t)) return true // yorumla başlayan satır (JSDoc `*` dahil)
  if (/\/\*[\s\S]*?\*\//.test(line) || /\/\*/.test(line)) return true // /* ... */
  if (/\{\s*\/\*/.test(line)) return true // JSX {/* ... */}
  if (/(^|[^:])\/\//.test(line)) return true // satır içi //  (http:// hariç — öncesi ':' olur)
  return false
}

// --- yerleşik dedektörler ---

export const DETECTORS: Detector[] = [
  {
    id: 'no-comments',
    label: 'Yorum satırı yasak',
    keywords: ['yorum', 'comment', 'açıklama satır'],
    scope: 'any',
    message: 'Yorum satırı bulundu; bu kural koda yorum yazılmasını yasaklıyor.',
    suggestion: 'Yorumu kaldırın; kodu kendini açıklayacak şekilde adlandırın veya açıklamayı commit mesajına taşıyın.',
    test: isCommentLine,
    sample: '// kullanıcıyı getir',
  },
  {
    id: 'no-console',
    label: 'console.* yasak',
    keywords: ['console', 'konsol'],
    scope: 'frontend',
    message: 'console.* çağrısı bulundu (log/debug/info/warn/error).',
    suggestion: 'console çıktısını kaldırın veya uygun bir logger/log seviyesi kullanın.',
    test: (l) => /\bconsole\.(log|debug|info|warn|error|trace)\s*\(/.test(l),
    sample: 'console.log("user", user)',
  },
  {
    id: 'no-sysout',
    label: 'System.out / printStackTrace yasak',
    keywords: ['system.out', 'system.err', 'sysout', 'println', 'printstacktrace', 'stack trace', 'e.printstacktrace'],
    scope: 'backend',
    message: 'System.out/err ya da printStackTrace kullanımı bulundu.',
    suggestion: 'Uygun bir logger (SLF4J/Logback) ile loglayın; konsola doğrudan yazmayın.',
    test: (l) => /\bSystem\.(out|err)\b/.test(l) || /\.printStackTrace\s*\(/.test(l),
    sample: 'System.out.println("user: " + user);',
  },
  {
    id: 'no-todo',
    label: 'TODO / FIXME yasak',
    keywords: ['todo', 'fixme', 'yapılacak', 'yapilacak'],
    scope: 'any',
    message: 'TODO/FIXME/XXX işareti bulundu.',
    suggestion: 'İşi tamamlayın veya bir issue açıp referans verin; koda bırakmayın.',
    test: (l) => /\b(TODO|FIXME|XXX|HACK)\b/.test(l),
    sample: '// TODO: burayı sonra düzelt',
  },
  {
    id: 'no-any',
    label: 'any tipi yasak',
    keywords: ['any tip', ': any', 'any type', 'any kullan'],
    scope: 'frontend',
    message: "TypeScript 'any' tipi kullanılmış.",
    suggestion: "Somut bir tip, 'unknown' veya jenerik kullanın; 'any' tip güvenliğini bozar.",
    test: (l) => /:\s*any\b/.test(l) || /\bas\s+any\b/.test(l),
    sample: 'const payload: any = response.data',
  },
  {
    id: 'no-var',
    label: 'var yasak',
    keywords: ['var kullan', 'var tan', 'no var', 'var yerine'],
    scope: 'frontend',
    message: "'var' ile değişken tanımlanmış.",
    suggestion: "'const' (veya gerekiyorsa 'let') kullanın.",
    test: (l) => /(^|[^.\w])var\s+[A-Za-z_$]/.test(l),
    sample: 'var total = 0',
  },
  {
    id: 'no-debugger',
    label: 'debugger yasak',
    keywords: ['debugger'],
    scope: 'frontend',
    message: "'debugger' ifadesi bulundu.",
    suggestion: "'debugger' satırını kaldırın.",
    test: (l) => /\bdebugger\b/.test(l),
    sample: 'debugger',
  },
  {
    id: 'no-alert',
    label: 'alert/confirm/prompt yasak',
    keywords: ['alert(', 'window.alert', 'confirm(', 'prompt('],
    scope: 'frontend',
    message: 'alert/confirm/prompt kullanımı bulundu.',
    suggestion: 'Tarayıcı diyalogları yerine uygulama içi bileşen (modal/toast) kullanın.',
    test: (l) => /\b(alert|confirm|prompt)\s*\(/.test(l),
    sample: 'alert("Kayıt başarılı")',
  },
  {
    id: 'no-hardcoded-secret',
    label: 'Gömülü parola/anahtar yasak',
    keywords: ['parola', 'şifre', 'sifre', 'password', 'secret', 'gizli anahtar', 'api key', 'apikey', 'token gömül', 'hardcode'],
    scope: 'any',
    message: 'Kaynak koda gömülü parola/anahtar/token değeri bulundu.',
    suggestion: 'Gizli değerleri ortam değişkeni / güvenli yapılandırmaya taşıyın; koda yazmayın.',
    test: (l) => /\b(password|passwd|pwd|secret|api[_-]?key|apikey|access[_-]?token|private[_-]?key)\s*[:=]\s*["'][^"']{3,}["']/i.test(l),
    sample: 'const apiKey = "sk-live-9f2b7c41"',
  },
  {
    id: 'no-empty-catch',
    label: 'Boş catch yasak',
    keywords: ['boş catch', 'bos catch', 'empty catch', 'yutulan', 'istisna yut', 'catch bloğu boş'],
    scope: 'any',
    message: 'Boş catch bloğu bulundu (istisna yutuluyor).',
    suggestion: 'İstisnayı loglayın veya anlamlı şekilde ele alın; sessizce yutmayın.',
    test: (l) => /catch\s*\([^)]*\)\s*\{\s*\}/.test(l),
    sample: 'try { save() } catch (e) {}',
  },
  {
    id: 'no-eqeq',
    label: '== yerine === kullan',
    keywords: ['=== kullan', 'eşitlik', 'esitlik', 'strict equal', 'çift eşittir', '== yasak'],
    scope: 'frontend',
    message: "Gevşek eşitlik ('==' / '!=') kullanılmış.",
    suggestion: "Katı eşitlik ('===' / '!==') kullanın.",
    test: (l) => /[^=!<>]==[^=]/.test(l) || /!=[^=]/.test(l),
    sample: 'if (status == "active") {',
  },
  // --- dile özgü çıktı/hata ayıklama izleri (kuralın dosya deseni dili sınırlar) ---
  {
    id: 'py-print',
    label: 'Python print() yasak',
    keywords: ['print(', 'print ifadesi', 'print yasak', 'print kullan'],
    scope: 'any',
    message: 'print() ile çıktı bulundu.',
    suggestion: 'logging modülünü kullanın; print() üretim kodunda kalmamalı.',
    test: (l) => /(^|[^.\w])print\s*\(/.test(l),
    sample: 'print(user)',
  },
  {
    id: 'go-fmt-print',
    label: 'Go fmt.Print yasak',
    keywords: ['fmt.print', 'fmt.println', 'go print'],
    scope: 'any',
    message: 'fmt.Print/Println/Printf ile çıktı bulundu.',
    suggestion: 'Yapılandırılmış logger (log/slog) kullanın; fmt.Print’i üretimde bırakmayın.',
    test: (l) => /\bfmt\.(Print|Println|Printf)\s*\(/.test(l),
    sample: 'fmt.Println("user:", user)',
  },
  {
    id: 'cs-console',
    label: 'C# Console.Write yasak',
    keywords: ['console.write', 'console.writeline'],
    scope: 'any',
    message: 'Console.Write/WriteLine ile çıktı bulundu.',
    suggestion: 'ILogger kullanın; Console’a doğrudan yazmayın.',
    test: (l) => /\bConsole\.(Write|WriteLine)\s*\(/.test(l),
    sample: 'Console.WriteLine($"user: {user}");',
  },
  {
    id: 'php-debug',
    label: 'PHP var_dump/dd/print_r yasak',
    keywords: ['var_dump', 'print_r', 'dd(', 'dump(', 'php debug'],
    scope: 'any',
    message: 'var_dump/print_r/dd hata ayıklama çağrısı bulundu.',
    suggestion: 'Hata ayıklama çıktısını kaldırın; logger (Monolog) kullanın.',
    test: (l) => /\b(var_dump|print_r|dd|dump)\s*\(/.test(l),
    sample: 'var_dump($user);',
  },
  {
    id: 'no-panic-throw',
    label: 'Genel çıktı/hata ayıklama izi',
    keywords: ['die(', 'exit(', 'panic(', 'traceback', 'dbg!'],
    scope: 'any',
    message: 'Ani sonlandırma / hata ayıklama çağrısı bulundu (die/exit/panic).',
    suggestion: 'Düzgün hata yönetimi kullanın; süreci ani sonlandırmayın.',
    test: (l) => /\b(die|exit|panic)\s*\(/.test(l) || /\bdbg!\s*\(/.test(l),
    sample: 'exit(1)',
  },
  {
    id: 'rust-macro-print',
    label: 'Rust println!/dbg! yasak',
    keywords: ['println!', 'print!', 'eprintln!', 'dbg!'],
    scope: 'any',
    message: 'println!/eprintln!/dbg! ile çıktı bulundu.',
    suggestion: 'log/tracing kullanın; makro çıktısını üretimde bırakmayın.',
    test: (l) => /\b(println|print|eprintln|eprint)!\s*\(/.test(l) || /\bdbg!\s*\(/.test(l),
    sample: 'println!("user: {}", user);',
  },
  {
    id: 'println-puts',
    label: 'println()/puts yasak',
    keywords: ['println(', 'puts', 'kotlin println'],
    scope: 'any',
    message: 'println()/puts ile çıktı bulundu.',
    suggestion: 'Uygun bir logger kullanın; konsola doğrudan yazmayın.',
    test: (l) => /\bprintln\s*\(/.test(l) || /(^|[^.\w])puts\b/.test(l),
    sample: 'println("user: $user")',
  },
]

/** Kural metnine (ad + gövde) bakarak eşleşen dedektörleri döndürür. */
export function detectorsForText(text: string): Detector[] {
  const t = (text || '').toLocaleLowerCase('tr')
  return DETECTORS.filter((d) => d.keywords.some((k) => t.includes(k)))
}

/* ============================ Kural metnine gömülü desenler ============================
   Serbest metin bir kuralı, TİPİNİ DEĞİŞTİRMEDEN deterministik hale getirmenin yolu:
   kural metninin sonuna açık bir desen yazmak. Tahmin yok — yalnızca yazılan desen çalışır.

     - [x] Bileşende inline style kullanılmaz. Yasak: /style=\{\{/
     - [x] Her test dosyası describe ile başlar. Zorunlu: /describe\s*\(/

   "Yasak"  → eşleşen her EKLENEN satır ihlaldir.
   "Zorunlu" → dosyanın eklenen satırlarında HİÇ eşleşme yoksa ihlaldir (dosya düzeyinde bulgu). */

export interface InlineChecks {
  forbidden: { re: RegExp; src: string }[]
  required: { re: RegExp; src: string }[]
}

// Desen gövdesi: kaçışlı karakterler dahil, ama satır sonu yok ve makul uzunlukta.
// Uzunluk sınırı, metin bozulduğunda (bkz. parseInlineChecks) iki ayrı desenin
// birleşip "sessizce geçerli ama saçma" tek bir regex'e dönüşmesini engeller.
const INLINE_RE = /\b(Yasak|Zorunlu)\s*:\s*\/((?:[^/\\\n]|\\.){1,200})\/([gimsuy]*)/gi

/**
 * Kural metnindeki "Yasak: /…/" ve "Zorunlu: /…/" desenlerini ayrıştırır.
 * DİKKAT: yalnızca kuralın `body` alanı verilmelidir. `name` alanı body'nin 90 karaktere
 * kısaltılmış bir kopyasıdır; ikisi birleştirilirse desen yarıda kesilmiş halde tekrar eder
 * ve ayrıştırma iki kopya arasına taşabilir.
 */
export function parseInlineChecks(text: string): InlineChecks {
  const out: InlineChecks = { forbidden: [], required: [] }
  if (!text) return out
  INLINE_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = INLINE_RE.exec(text))) {
    // 'g' bayrağı test() çağrılarında lastIndex taşıdığı için hep temizlenir.
    const flags = (m[3] || '').replace(/[gy]/g, '')
    let re: RegExp
    try { re = new RegExp(m[2], flags) } catch { continue } // bozuk desen → sessizce atla
    const kind = m[1].toLocaleLowerCase('tr')
    ;(kind === 'yasak' ? out.forbidden : out.required).push({ re, src: m[2] })
  }
  return out
}

/** Kural metninde en az bir "Yasak:"/"Zorunlu:" deseni ayrıştırıldı mı? */
export const hasInlineChecks = (c: InlineChecks) => c.forbidden.length > 0 || c.required.length > 0

/* ============================ Desenden örnek satır üretimi ============================
   Bir "Yasak:/Zorunlu:" deseninin ne yakaladığını göstermek için desenden okunabilir bir
   örnek satır türetilir. Üretim SEZGİSELDİR; bu yüzden sonuç her zaman gerçek regex ile
   DOĞRULANIR (uymuyorsa null döner) — yani gösterilen örnek kesinlikle eşleşen bir satırdır. */

/** Bir grubun kapanış parantezini bulur (kaçışlar ve iç içe gruplar dahil). */
function closingParen(src: string, open: number): number {
  let depth = 0
  for (let i = open; i < src.length; i++) {
    const c = src[i]
    if (c === '\\') { i++; continue }
    if (c === '[') { while (i < src.length && src[i] !== ']') { if (src[i] === '\\') i++; i++ } continue }
    if (c === '(') depth++
    else if (c === ')') { depth--; if (depth === 0) return i }
  }
  return -1
}

/** En üst seviyedeki "|" ayraçlarına göre böler. */
function topLevelAlternatives(src: string): string[] {
  const out: string[] = []
  let depth = 0, start = 0
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (c === '\\') { i++; continue }
    if (c === '[') { while (i < src.length && src[i] !== ']') { if (src[i] === '\\') i++; i++ } continue }
    if (c === '(') depth++
    else if (c === ')') depth--
    else if (c === '|' && depth === 0) { out.push(src.slice(start, i)); start = i + 1 }
  }
  out.push(src.slice(start))
  return out
}

/** Karakter sınıfından temsilî bir karakter seçer. */
function classChar(body: string): string {
  if (body.startsWith('^')) return 'x' // olumsuzlanmış sınıf
  const m = /^\\?(.)(?:-(.))?/.exec(body)
  if (!m) return 'x'
  if (body.startsWith('\\')) {
    const e = body[1]
    if (e === 'd') return '1'
    if (e === 'w') return 'x'
    if (e === 's') return ' '
    return e
  }
  const a = m[1], b = m[2]
  if (b) {
    if (a === 'A') return 'A'
    if (a === 'a') return 'a'
    if (a === '0') return '1'
    return a
  }
  return a
}

/** Kaçış dizisinden temsilî metin. */
function escapeChar(e: string): string {
  if (e === 'd') return '1'
  if (e === 'w') return 'x'
  if (e === 's') return ' '
  if (e === 'b' || e === 'B') return ''
  if (e === 'n' || e === 'r' || e === 't') return ' '
  return e
}

/** Deseni okunabilir bir örnek metne çevirir (doğrulanmadan). */
function synthesize(src: string, depth = 0): string | null {
  if (depth > 8) return null
  let out = ''
  let i = 0
  while (i < src.length) {
    const c = src[i]

    if (c === '^' || c === '$') { i++; continue }

    if (c === '\\') {
      const piece = escapeChar(src[i + 1] ?? '')
      i += 2
      const q = src[i]
      if (q === '*' || q === '?') { i++; if (src[i] === '?') i++; continue }      // isteğe bağlı → atla
      if (q === '+') { i++; if (src[i] === '?') i++ }
      else if (q === '{') { const e = src.indexOf('}', i); if (e > 0) i = e + 1 }
      out += piece
      continue
    }

    if (c === '(') {
      const end = closingParen(src, i)
      if (end < 0) return null
      let inner = src.slice(i + 1, end)
      let skip = false
      if (/^\?[:]/.test(inner)) inner = inner.slice(2)
      else if (/^\?[!=<]/.test(inner)) skip = true                                 // ileri/geri bakış → örnekte yok
      i = end + 1
      const q = src[i]
      let optional = false
      if (q === '*' || q === '?') { optional = true; i++; if (src[i] === '?') i++ }
      else if (q === '+') { i++; if (src[i] === '?') i++ }
      else if (q === '{') { const e = src.indexOf('}', i); if (e > 0) i = e + 1 }
      if (skip || optional) continue
      const piece = synthesize(topLevelAlternatives(inner)[0], depth + 1)
      if (piece == null) return null
      out += piece
      continue
    }

    if (c === '[') {
      let j = i + 1
      while (j < src.length && src[j] !== ']') { if (src[j] === '\\') j++; j++ }
      const body = src.slice(i + 1, j)
      i = j + 1
      const q = src[i]
      let optional = false
      let repeat = 1
      if (q === '*' || q === '?') { optional = true; i++; if (src[i] === '?') i++ }
      else if (q === '+') { i++; if (src[i] === '?') i++ }
      else if (q === '{') {
        const e = src.indexOf('}', i)
        if (e > 0) { repeat = Math.max(1, parseInt(src.slice(i + 1, e), 10) || 1); i = e + 1 }
      }
      if (optional) continue
      out += classChar(body).repeat(Math.min(repeat, 8))
      continue
    }

    // düz karakter (ya da '.')
    const lit = c === '.' ? 'x' : c
    i++
    const q = src[i]
    if (q === '*' || q === '?') { i++; if (src[i] === '?') i++; continue }
    if (q === '+') { i++; if (src[i] === '?') i++ }
    else if (q === '{') { const e = src.indexOf('}', i); if (e > 0) i = e + 1 }
    out += lit
    continue
  }
  return out
}

/**
 * Desene UYAN örnek bir satır üretir; üretilemez ya da doğrulanamazsa null döner.
 * Doğrulama gerçek regex ile yapıldığı için dönen değer kesinlikle eşleşir.
 */
export function sampleForPattern(src: string): string | null {
  let re: RegExp
  try { re = new RegExp(src) } catch { return null }
  const candidate = synthesize(src)
  if (candidate == null) return null
  const trimmed = candidate.replace(/\s+/g, ' ').trim()
  for (const c of [candidate, trimmed]) {
    if (c && c.length <= 160 && re.test(c)) return c
  }
  return null
}

/** Hiçbir kurala takılmayan nötr örnek satırlar (temiz örnek seçmek için). */
export const NEUTRAL_LINES = [
  'const total = items.length',
  'return buildResponse(result)',
  'if (isReady) { start() }',
  'export default UserList',
  'public String getName() { return name; }',
  'let index = 0',
]

/** Verilen desene UYMAYAN nötr bir satır döndürür (yoksa null). */
export function cleanSampleFor(test: (line: string) => boolean): string | null {
  return NEUTRAL_LINES.find((l) => !test(l)) ?? null
}

/* ============================ Dosya düzeyi dedektörler ============================
   Tek satıra değil, dosyanın tamamına bakan deterministik denetimler. */

/**
 * Diff'ten dosyanın KANITLANABİLİR en küçük satır sayısını çıkarır.
 * Hunk başlıkları (@@ -a,b +c,d @@) yeni dosyadaki son satırı verir; diff dosyanın sonunu
 * kapsamıyorsa gerçek uzunluk daha büyük olabilir — bu yüzden sonuç bir ALT SINIRDIR.
 * Alt sınır limiti aşıyorsa ihlal kesindir (yanlış pozitif üretmez).
 */
export function provableLineCount(rawDiff: string, maxAddedLine: number): number {
  let max = maxAddedLine
  const re = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/gm
  let m: RegExpExecArray | null
  while ((m = re.exec(rawDiff || ''))) {
    const start = parseInt(m[1], 10)
    const count = m[2] == null ? 1 : parseInt(m[2], 10)
    const end = start + count - 1
    if (end > max) max = end
  }
  return max
}

/**
 * Kural metninden "en fazla N satır" eşiğini çıkarır (yoksa null).
 * Yalnızca ÜST SINIR ifade eden metinlerde çalışır ("<", "en fazla", "aşmamalı"…).
 * Aralık verilmişse ("250-300 satır") en büyük değer alınır — en hoşgörülü yorum.
 */
export function parseMaxLineLimit(text: string): number | null {
  const t = (text || '').toLocaleLowerCase('tr')
  if (!/satır|satir|line/.test(t)) return null
  const isUpperBound = /<|en fazla|en çok|en cok|azami|aşma|asma|geçme|gecme|altında|altinda|küçük|kucuk|max/.test(t)
  if (!isUpperBound) return null
  const nums = (t.match(/\d{2,5}/g) ?? []).map(Number).filter((n) => n >= 20 && n <= 20000)
  if (nums.length === 0) return null
  return Math.max(...nums)
}
