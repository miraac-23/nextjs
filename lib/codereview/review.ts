// Tarayıcı inceleme motoru.
//  - KURALLAR (md dosyaları) tamamen DETERMİNİSTİK çalışır — yapay zekaya HİÇ gitmez.
//    REGEX kuralları kendi regex'iyle; düz-dil kuralları ise metnine göre eşleşen yerleşik
//    dedektörlerle (detectors.ts) satır satır denetlenir. Her kuralın kendi bulgu/önerisi olur.
//  - YAPAY ZEKA yalnızca kendi serbest incelemesini yapar (optimizasyon/performans/mantık),
//    kurallardan bağımsız. Kurallar ile AI birbirine karışmaz.
//    AI_ONLY → sadece AI · RULES_ONLY → sadece kurallar · AI_WITH_RULES → ikisi birlikte (birleşik liste).

import type { ChangedFile, Finding, LlmConfig, Rule, ReviewMode } from './types'
import { complete } from './llm'
import {
  detectorsForText, fileKind, parseInlineChecks, hasInlineChecks, parseMaxLineLimit,
  provableLineCount, sampleForPattern, cleanSampleFor,
} from './detectors'

/** Basit glob eşleştirici: "**" hepsi, "*.java" uzantı, "src/**" önek, tam eşleşme. */
export function globMatch(pattern: string, path: string): boolean {
  if (!pattern || pattern === '**') return true
  if (!path) return false
  if (pattern.startsWith('*.')) return path.endsWith(pattern.slice(1))
  if (pattern.endsWith('/**')) return path.startsWith(pattern.slice(0, -3))
  return path === pattern
}

/** Seçilen mod yapay zeka incelemesini içeriyor mu? */
const modeUsesAi = (mode: ReviewMode) => mode === 'AI_ONLY' || mode === 'AI_WITH_RULES'
/** Seçilen mod md kurallarını çalıştırıyor mu? */
const modeUsesRules = (mode: ReviewMode) => mode === 'RULES_ONLY' || mode === 'AI_WITH_RULES'

/** Kuralın tüm metni (ad + açıklama + gövde) — dedektör/desen eşleştirmesi bunun üzerinden yapılır. */
const ruleText = (r: Rule) => `${r.name} ${r.description ?? ''} ${r.body}`

/**
 * Bulguda gösterilecek insan-okur mesaj: kuralın kendi metni.
 * md'den gelen kurallarda `description` yalnızca "Kaynak: dosya.md" olduğu için kullanılmaz;
 * gövdeden de "Yasak:/Zorunlu:" desen ekleri ayıklanır (bunlar kullanıcıya gösterilmez).
 */
function ruleMessage(rule: Rule): string {
  const stripped = rule.body
    .replace(/\s*[—-]?\s*\b(Yasak|Zorunlu)\s*:\s*\/(?:[^/\\\n]|\\.){1,200}\/[gimsuy]*/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (stripped.length >= 8) return stripped
  const desc = (rule.description ?? '').trim()
  return desc && !/^Kaynak:/i.test(desc) ? desc : rule.name
}

/**
 * Bir kural NASIL denetlenir? (hepsi deterministik — kural tarafında yapay zeka KULLANILMAZ)
 *  - 'REGEX'    → REGEX kuralı, kendi deseniyle.
 *  - 'PATTERN'  → serbest metin ama içinde açık "Yasak: /…/" veya "Zorunlu: /…/" deseni var.
 *  - 'DETECTOR' → serbest metin, yerleşik bir dedektörün anahtar kelimesine bağlanıyor.
 *  - 'LIMIT'    → "en fazla N satır" gibi ölçülebilir bir üst sınır belirtiyor.
 *  - 'MANUAL'   → soyut/serbest; makine ile denetlenemez, insan incelemesi gerekir.
 * UI'daki "Denetim" rozetini de bu belirler.
 */
export type RuleCoverage = 'REGEX' | 'PATTERN' | 'DETECTOR' | 'LIMIT' | 'MANUAL'

/**
 * Kuralın hangi denetim yoluna düştüğünü belirler. Sıra önemlidir: önce kuralın kendi
 * regex'i, sonra metne gömülü açık desen, sonra yerleşik dedektör, en son ölçülebilir sınır.
 * @param rule Değerlendirilecek kural
 * @returns Denetim türü; hiçbiri uymuyorsa 'MANUAL'
 */
export function ruleCoverage(rule: Rule): RuleCoverage {
  if (rule.type === 'REGEX') {
    try { new RegExp(rule.body); return 'REGEX' } catch { return 'MANUAL' }
  }
  const text = ruleText(rule)
  if (hasInlineChecks(parseInlineChecks(rule.body))) return 'PATTERN'
  if (detectorsForText(text).length > 0) return 'DETECTOR'
  if (parseMaxLineLimit(text) != null) return 'LIMIT'
  return 'MANUAL'
}

/** Kural makine ile (deterministik) denetlenebiliyor mu? */
export function isAutoCheckable(rule: Rule): boolean {
  return ruleCoverage(rule) !== 'MANUAL'
}

/** Kuralın detay ekranında gösterilen tek bir denetim adımı. */
export interface RuleCheck {
  kind: 'forbidden' | 'required' | 'regex' | 'detector' | 'limit'
  label: string
  /** Çalıştırılan desen ya da ölçüt (monospace gösterilir). */
  code?: string
  /** Bu adım tetiklendiğinde ne anlama gelir. */
  meaning: string
}

/** Kuralın neden o denetim durumunda olduğunu ve tam olarak neyin çalıştığını anlatır. */
export interface RuleExplain {
  coverage: RuleCoverage
  headline: string
  why: string
  checks: RuleCheck[]
  /** Yalnızca MANUAL için: kullanıcının ne yapması gerektiği. */
  fix?: string
  /** Kuralın okunabilir metni (desen ekleri ayıklanmış). */
  message: string
}

/** Detay ekranında gösterilen örnek satır: kural bunu nasıl değerlendirir? */
export interface RuleExample {
  code: string
  /** Bu satır tek başına bulgu üretir mi? */
  fires: boolean
  label: string
  note: string
}

/**
 * Kuralın nasıl bulguya girdiğini gösteren örnekler.
 * Desen/regex kuralları için örnek DESENDEN türetilir ve gerçek regex ile doğrulanır;
 * doğrulanamayan örnek gösterilmez. Yerleşik dedektörlerin elle yazılmış örneği vardır.
 */
export function ruleExamples(rule: Rule): RuleExample[] {
  const coverage = ruleCoverage(rule)
  const out: RuleExample[] = []

  const addPair = (code: string | null, test: (l: string) => boolean, hitNote: string) => {
    if (code) out.push({ code, fires: true, label: 'Bulguya girer', note: hitNote })
    const clean = cleanSampleFor(test)
    if (clean) out.push({ code: clean, fires: false, label: 'Bulguya girmez', note: 'Desene uymuyor; bu satır için bulgu üretilmez.' })
  }

  if (coverage === 'REGEX') {
    let re: RegExp | null = null
    try { re = new RegExp(rule.body) } catch { return out }
    addPair(sampleForPattern(rule.body), (l) => re!.test(l), 'Satır kuralın desenine uyuyor → bu satır için bulgu açılır.')
    return out
  }

  if (coverage === 'PATTERN') {
    const inline = parseInlineChecks(rule.body)
    for (const f of inline.forbidden) {
      addPair(sampleForPattern(f.src), (l) => f.re.test(l), 'Yasak desene uyuyor → bu satır için bulgu açılır.')
    }
    for (const r of inline.required) {
      const ok = sampleForPattern(r.src)
      if (ok) out.push({ code: ok, fires: false, label: 'Bulguya girmez', note: 'Zorunlu desen bu satırda görüldü → dosya kuraldan geçer.' })
      const missing = cleanSampleFor((l) => r.re.test(l))
      if (missing) out.push({ code: missing, fires: true, label: 'Tek başına yeterli değil', note: 'Zorunlu desen bu satırda yok. Dosyanın HİÇBİR eklenen satırında yoksa dosya için bulgu açılır.' })
    }
    return out
  }

  if (coverage === 'DETECTOR') {
    for (const d of detectorsForText(ruleText(rule))) {
      if (d.test(d.sample)) {
        out.push({ code: d.sample, fires: true, label: 'Bulguya girer', note: `“${d.label}” dedektörü tetiklenir → ${d.message}` })
      }
      const clean = cleanSampleFor(d.test)
      if (clean) out.push({ code: clean, fires: false, label: 'Bulguya girmez', note: 'Dedektör tetiklenmez; bu satır için bulgu üretilmez.' })
    }
    return out.slice(0, 6)
  }

  if (coverage === 'LIMIT') {
    const limit = parseMaxLineLimit(ruleText(rule))
    out.push({
      code: `// ${limit! + 40}. satırı olan bir dosya`, fires: true, label: 'Bulguya girer',
      note: `Dosyanın ${limit} satırı aştığı diff’ten kanıtlanırsa dosya için tek bir bulgu açılır (satır numarası verilmez).`,
    })
    out.push({
      code: `// ${Math.max(limit! - 40, 10)} satırlık bir dosya`, fires: false, label: 'Bulguya girmez',
      note: 'Sınır aşılmadığı sürece bulgu üretilmez.',
    })
    return out
  }

  return out
}

/** Tek bir kod satırının kuralı tetikleyip tetiklemediği (detay ekranındaki canlı deneme). */
export interface RuleProbe {
  /** Kural satır bazlı denetlenebiliyor mu? (LIMIT ve MANUAL için hayır) */
  applicable: boolean
  fires: boolean
  detail: string
}

/**
 * Verilen kod satırını kuralın gerçek denetim mantığından geçirir.
 * İnceleme motoruyla AYNI kodu kullanmaz ama aynı desenleri/dedektörleri çalıştırır.
 */
export function probeRule(rule: Rule, line: string): RuleProbe {
  const coverage = ruleCoverage(rule)
  if (!line.trim()) return { applicable: true, fires: false, detail: 'Denemek için bir kod satırı yazın.' }

  if (coverage === 'REGEX') {
    let re: RegExp | null = null
    try { re = new RegExp(rule.body) } catch { /* geçersiz */ }
    if (!re) return { applicable: false, fires: false, detail: 'Kuralın deseni geçersiz.' }
    return re.test(line)
      ? { applicable: true, fires: true, detail: `Satır /${rule.body}/ desenine uyuyor → bulgu üretilir.` }
      : { applicable: true, fires: false, detail: 'Satır desene uymuyor → bulgu üretilmez.' }
  }

  if (coverage === 'PATTERN') {
    const inline = parseInlineChecks(rule.body)
    for (const f of inline.forbidden) {
      if (f.re.test(line)) return { applicable: true, fires: true, detail: `Yasak desene uyuyor (/${f.src}/) → bulgu üretilir.` }
    }
    const req = inline.required
    if (req.length > 0) {
      const hit = req.find((r) => r.re.test(line))
      return hit
        ? { applicable: true, fires: false, detail: `Zorunlu desen (/${hit.src}/) bu satırda görüldü → dosya bu kuraldan geçer.` }
        : { applicable: true, fires: false, detail: 'Zorunlu desen bu satırda yok. Dosyanın HİÇBİR eklenen satırında yoksa bulgu üretilir — tek satırdan kesin sonuç çıkmaz.' }
    }
    return { applicable: true, fires: false, detail: 'Hiçbir yasak desene uymuyor → bulgu üretilmez.' }
  }

  if (coverage === 'DETECTOR') {
    const dets = detectorsForText(ruleText(rule))
    const hit = dets.find((d) => d.test(line))
    return hit
      ? { applicable: true, fires: true, detail: `“${hit.label}” dedektörü tetiklendi → bulgu üretilir.` }
      : { applicable: true, fires: false, detail: 'Hiçbir dedektör tetiklenmedi → bulgu üretilmez.' }
  }

  if (coverage === 'LIMIT') {
    return { applicable: false, fires: false, detail: 'Bu kural dosya uzunluğunu ölçer; tek bir satırla denenemez.' }
  }
  return { applicable: false, fires: false, detail: 'Bu kural makine ile denetlenmiyor; denenebilir bir deseni yok.' }
}

/**
 * Kuralın neden o denetim durumunda olduğunu ve tam olarak hangi desenin/dedektörün
 * çalıştığını, detay ekranında gösterilecek biçimde açıklar.
 * @param rule Açıklanacak kural
 * @returns Başlık, gerekçe, çalışan denetim adımları ve (MANUAL ise) çözüm önerisi
 */
export function explainRule(rule: Rule): RuleExplain {
  const coverage = ruleCoverage(rule)
  const message = ruleMessage(rule)
  const text = ruleText(rule)

  if (coverage === 'REGEX') {
    return {
      coverage, message,
      headline: 'Kuralın kendi düzenli ifadesiyle denetleniyor',
      why: 'Bu bir REGEX kuralı: gövdesindeki desen doğrudan çalıştırılır.',
      checks: [{
        kind: 'regex', label: 'Eşleşen satır ihlaldir', code: rule.body,
        meaning: 'Diff’te eklenen satırlardan biri bu desene uyarsa bulgu üretilir.',
      }],
    }
  }

  if (coverage === 'PATTERN') {
    const inline = parseInlineChecks(rule.body)
    return {
      coverage, message,
      headline: 'Kural metnine yazılmış açık desenle denetleniyor',
      why: 'Kuralın metni serbest yazılmış, ama sonuna açık bir desen eklenmiş. Tahmin yapılmaz; yalnızca yazılan desen çalışır.',
      checks: [
        ...inline.forbidden.map((f): RuleCheck => ({
          kind: 'forbidden', label: 'Yasak desen', code: f.src,
          meaning: 'Eklenen satırlardan biri bu desene uyarsa bulgu üretilir.',
        })),
        ...inline.required.map((f): RuleCheck => ({
          kind: 'required', label: 'Zorunlu desen', code: f.src,
          meaning: 'Dosyanın eklenen satırlarının hiçbiri bu desene uymuyorsa bulgu üretilir.',
        })),
      ],
    }
  }

  if (coverage === 'DETECTOR') {
    const dets = detectorsForText(text)
    return {
      coverage, message,
      headline: 'Yerleşik dedektörle denetleniyor',
      why: `Kural metni yerleşik bir dedektörün anahtar kelimesini içeriyor (${dets.map((d) => d.keywords[0]).join(', ')}), bu yüzden o dedektöre bağlandı.`,
      checks: dets.map((d): RuleCheck => ({
        kind: 'detector',
        label: d.label + (d.scope === 'any' ? '' : ` · yalnız ${d.scope === 'frontend' ? 'ön uç' : 'arka uç'} dosyaları`),
        meaning: d.message + ' → ' + d.suggestion,
      })),
    }
  }

  if (coverage === 'LIMIT') {
    const limit = parseMaxLineLimit(text)
    return {
      coverage, message,
      headline: 'Ölçülebilir üst sınır olarak denetleniyor',
      why: `Kural metninde bir üst sınır ifadesi ve sayı geçiyor; en yüksek değer (${limit}) eşik olarak alındı.`,
      checks: [{
        kind: 'limit', label: `En fazla ${limit} satır`,
        meaning: 'Dosya uzunluğu diff’teki hunk başlıklarından ölçülür. Bu bir ALT SINIR olduğu için yalnızca sınırın aşıldığı kanıtlanabildiğinde bulgu üretilir — yanlış pozitif vermez.',
      }],
    }
  }

  return {
    coverage, message,
    headline: 'Makine ile denetlenemiyor — insan incelemesi gerekir',
    why: 'Kural soyut: doğruluğu tek bir eklenen satıra bakarak anlaşılamıyor (dosya konumu, katmanlar arası tutarlılık, kod tekrarı, çalışma anı davranışı gibi). Ne açık bir desen yazılmış, ne de yerleşik bir dedektörün anahtar kelimesi geçiyor.',
    checks: [],
    fix: 'Denetlenebilir yapmak için kural metninin sonuna açık bir desen ekleyin: "Yasak: /desen/" (eşleşen satır ihlaldir) ya da "Zorunlu: /desen/" (dosyada hiç eşleşme yoksa ihlaldir). Kuralı somut bir kod izine indirgeyemiyorsanız elle kalması doğrudur — uydurma desen yanlış pozitif üretir.',
  }
}

/** İnceleme sırasında yükleme ekranına bildirilen ilerleme. */
export interface ReviewProgress {
  label: string
  /** Tamamlanan adım sayısı (belirsizse 0). */
  done: number
  /** Toplam adım sayısı; 0 ise ilerleme belirsizdir (süresi bilinmiyor). */
  total: number
}

/**
 * İncelemeyi çalıştırır. Sonuç: { findings, notice }.
 *  - notice: AI seçildi ama bağlı değil, ya da bazı kurallar otomatik denetlenemedi gibi bilgiler.
 *  - onProgress: yükleme ekranını beslemek için isteğe bağlı ilerleme bildirimi.
 */
export async function runReview(
  files: ChangedFile[],
  rules: Rule[],
  mode: ReviewMode,
  cfg: LlmConfig | null,
  onProgress?: (p: ReviewProgress) => void,
): Promise<{ findings: Finding[]; notice: string | null }> {
  const report = (label: string, done = 0, total = 0) => onProgress?.({ label, done, total })
  const findings: Finding[] = []
  let nextId = 1
  const notices: string[] = []
  const seen = new Set<string>()

  const pushFinding = (f: Omit<Finding, 'id'>) => {
    const key = `${f.filePath}|${f.line}|${f.ruleName}|${f.message}`
    if (seen.has(key)) return
    seen.add(key)
    findings.push({ ...f, id: nextId++ })
  }

  // ---------------------------------------------------------------------------
  // 1) KURALLAR — tamamen deterministik (yapay zeka yok)
  // ---------------------------------------------------------------------------
  const enabledRules = rules.filter((r) => r.enabled)
  /** İnceleme sırasında kuralların hangi denetim yoluna düştüğünün sayacı (bilgilendirme için). */
  const manualRules: Rule[] = []

  if (modeUsesRules(mode)) {
    report(`${enabledRules.length} kural uygulanıyor…`)
    for (const rule of enabledRules) {
      const text = ruleText(rule)
      const violate = (filePath: string, line: number | null, message: string, suggestion: string) =>
        pushFinding({ filePath, line, severity: rule.severity, message, suggestion, source: 'RULE', ruleName: rule.name })
      const matching = files.filter((f) => globMatch(rule.filePattern, f.path))

      // (a) REGEX kuralı — kendi deseniyle, satır satır
      if (rule.type === 'REGEX') {
        let re: RegExp | null = null
        try { re = new RegExp(rule.body) } catch { re = null }
        if (!re) { manualRules.push(rule); continue }
        for (const file of matching) {
          for (const added of file.addedLines) {
            if (re.test(added.content)) {
              violate(file.path, added.newLineNumber, ruleMessage(rule),
                `'${rule.name}' kuralını ihlal ediyor; düzeltin veya kaldırın.`)
            }
          }
        }
        continue
      }

      // (b) Serbest metin — kuralın kendi içine yazılmış açık desenler ("Yasak:" / "Zorunlu:")
      const inline = parseInlineChecks(rule.body)
      if (hasInlineChecks(inline)) {
        for (const file of matching) {
          for (const { re, src } of inline.forbidden) {
            for (const added of file.addedLines) {
              if (re.test(added.content)) {
                violate(file.path, added.newLineNumber, ruleMessage(rule),
                  `Bu satır kuralın yasak desenine uyuyor (/${src}/); kurala göre düzeltin.`)
              }
            }
          }
          for (const { re, src } of inline.required) {
            if (file.addedLines.length === 0) continue
            if (file.addedLines.some((a) => re.test(a.content))) continue
            violate(file.path, file.addedLines[0].newLineNumber, ruleMessage(rule),
              `Kuralın zorunlu kıldığı desen (/${src}/) bu dosyanın eklenen satırlarında hiç görülmedi.`)
          }
        }
        continue
      }

      // (c) Serbest metin — yerleşik dedektörlere bağlanıyorsa satır satır
      const dets = detectorsForText(text)
      if (dets.length > 0) {
        for (const file of matching) {
          const kind = fileKind(file.path)
          for (const det of dets) {
            if (det.scope !== 'any' && det.scope !== kind) continue
            for (const added of file.addedLines) {
              if (det.test(added.content)) violate(file.path, added.newLineNumber, det.message, det.suggestion)
            }
          }
        }
        continue
      }

      // (d) Ölçülebilir üst sınır — "en fazla N satır" / "<300 satır"
      const limit = parseMaxLineLimit(text)
      if (limit != null) {
        for (const file of matching) {
          const maxAdded = file.addedLines.reduce((m, a) => Math.max(m, a.newLineNumber), 0)
          const lines = provableLineCount(file.rawDiff, maxAdded)
          if (lines > limit) {
            violate(file.path, null, `Dosya en az ${lines} satır; kuraldaki ${limit} satır üst sınırı aşılmış.`,
              'Dosyayı daha küçük parçalara/bileşenlere bölün.')
          }
        }
        continue
      }

      // (e) Geriye kalan: soyut kural — makine ile denetlenemez
      manualRules.push(rule)
    }

    if (manualRules.length > 0) {
      notices.push(
        `${enabledRules.length - manualRules.length}/${enabledRules.length} kural makine ile denetlendi. ` +
        `Kalan ${manualRules.length} kural soyut olduğu için (dosya konumu, katmanlar arası tutarlılık, ` +
        `kod tekrarı gibi) tek satırdan denetlenemez; insan incelemesi gerekir. ` +
        `Listelerini "Kurallar" sekmesindeki "Denetim: ✋ Elle" filtresinden görebilirsiniz.`,
      )
    }
  }

  // ---------------------------------------------------------------------------
  // 2) YAPAY ZEKA — yalnızca kendi serbest incelemesi (kurallardan bağımsız)
  // ---------------------------------------------------------------------------
  if (modeUsesAi(mode)) {
    if (!cfg) {
      notices.push('Yapay zeka seçildi ancak AI bağlı değil. Üstteki "AI Bağlantısı"ndan bir sağlayıcı bağlayın.')
    } else {
      const aiFiles = files.filter((f) => f.addedLines.length > 0)
      let doneFiles = 0
      for (const file of aiFiles) {
        report(`Yapay zeka inceliyor: ${file.path.split('/').pop()}`, doneFiles, aiFiles.length)
        const { text, error } = await complete(buildAiPrompt(), buildUserPrompt(file), cfg)
        doneFiles++
        if (error) { notices.push('AI çağrısı başarısız: ' + error); continue }
        const addedNums = file.addedLines.map((a) => a.newLineNumber).sort((a, b) => a - b)
        for (const f of parseFindings(text, file.path)) {
          const snapped = snapToAdded(f.line, addedNums)
          if (snapped == null) continue
          pushFinding({ ...f, line: snapped })
        }
      }
      report('Bulgular derleniyor…', aiFiles.length, aiFiles.length)
    }
  }

  return { findings, notice: notices.length ? notices.join('\n') : null }
}

/**
 * AI'ya gönderilen kullanıcı mesajı: dosya yolu + yalnızca EKLENEN satırlar,
 * `<satırNo>: <kod>` biçiminde (model satır numarasını bu listeden alır).
 */
function buildUserPrompt(file: ChangedFile): string {
  const lines = file.addedLines.map((a) => `${a.newLineNumber}: ${a.content}`).join('\n')
  return `Dosya: ${file.path}\n\nİncelenecek EKLENEN satırlar (yalnızca bunlar; biçim <satırNo>: <kod>):\n${lines}`
}

/** Serbest AI incelemesi promptu — kurallardan bağımsız; kod kalitesine odaklanır. */
function buildAiPrompt(): string {
  return (
    "Sen kıdemli bir code reviewer'sın. Sana YALNIZCA bir dosyanın yeni EKLENEN satırları verilecek " +
    '(biçim: <satırNo>: <kod>). Bu satırlarda DERİNLEMESİNE code review yap. Özellikle şunlara odaklan ' +
    've her biri için somut çözüm/öneri ver:\n' +
    '- MANTIK HATALARI: yanlış koşul, off-by-one, null/undefined erişimi, yanlış operatör, kaçırılan durumlar.\n' +
    '- PERFORMANS: gereksiz döngü/kopyalama, N+1 sorgu, ağır/tekrar eden işlem, gereksiz yeniden hesaplama/render.\n' +
    '- OPTİMİZASYON: daha sade ve verimli yazım, erken dönüş, uygun veri yapısı/algoritma, tekrarların giderilmesi.\n' +
    '- GÜVENLİK: gömülü parola/anahtar/token, SQL/komut enjeksiyonu, doğrulanmamış girdi.\n' +
    '- KÖTÜ PRATİK: boş catch, yutulan istisna, ölü kod, sihirli sabit.\n' +
    "Yalnızca verilen eklenen satırları değerlendir; 'line' alanında verilen satır numarasını kullan; " +
    "her bulgu için somut bir 'suggestion' yaz; sorun yoksa boş dizi [] döndür.\n" +
    'Yanıtı SADECE şu JSON dizisi biçiminde ver (markdown ekleme):\n' +
    '[{"ruleName":"...","line":<no>,"severity":"MINOR|MAJOR|CRITICAL","message":"...","suggestion":"..."}]'
  )
}

/**
 * Modelin serbest yanıtından bulgu dizisini ayıklar. Markdown çiti ve önsöz toleranslıdır;
 * JSON ayrıştırılamazsa sessizce boş dizi döner (inceleme bozulmasın diye).
 * @param raw Modelin ham yanıtı
 * @param path Bulgulara yazılacak dosya yolu
 */
function parseFindings(raw: string, path: string): Finding[] {
  const out: Finding[] = []
  if (!raw) return out
  let json = raw.trim()
  if (json.startsWith('```')) {
    json = json.replace(/^```[a-zA-Z]*\n?/, '').replace(/```$/, '').trim()
  }
  const start = json.indexOf('[')
  const end = json.lastIndexOf(']')
  if (start >= 0 && end > start) json = json.slice(start, end + 1)
  try {
    const arr = JSON.parse(json)
    if (!Array.isArray(arr)) return out
    for (const node of arr) {
      out.push({
        id: 0,
        filePath: path,
        line: typeof node.line === 'number' ? node.line : null,
        severity: normalizeSeverity(node.severity),
        message: String(node.message ?? ''),
        suggestion: node.suggestion ? String(node.suggestion) : undefined,
        source: 'LLM',
        ruleName: node.ruleName ? String(node.ruleName) : 'AI',
      })
    }
  } catch {
    /* JSON değilse yok say */
  }
  return out
}

/** Modelin verdiği önem derecesini geçerli bir değere sabitler (tanınmayan → MAJOR). */
function normalizeSeverity(s: any): Finding['severity'] {
  const v = String(s ?? '').toUpperCase()
  return (['INFO', 'MINOR', 'MAJOR', 'CRITICAL', 'BLOCKER'] as const).includes(v as Finding['severity'])
    ? (v as Finding['severity'])
    : 'MAJOR'
}

/**
 * Modelin verdiği satır numarasını, diff'te GERÇEKTEN eklenmiş en yakın satıra çeker.
 * Böylece bulgu hiçbir zaman değişmemiş bir satıra düşmez.
 * @returns Eşlenen satır numarası; eklenen satır yoksa null
 */
function snapToAdded(line: number | null, addedNums: number[]): number | null {
  if (addedNums.length === 0) return null
  if (line == null) return addedNums[0]
  if (addedNums.includes(line)) return line
  let best = addedNums[0]
  let bestD = Infinity
  for (const n of addedNums) {
    const d = Math.abs(n - line)
    if (d < bestD) { bestD = d; best = n }
  }
  return best
}
