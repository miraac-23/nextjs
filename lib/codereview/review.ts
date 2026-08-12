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
import { e, detText } from './i18n'

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

  const t = e()

  const addPair = (code: string | null, test: (l: string) => boolean, hitNote: string) => {
    if (code) out.push({ code, fires: true, label: t.exFires, note: hitNote })
    const clean = cleanSampleFor(test)
    if (clean) out.push({ code: clean, fires: false, label: t.exClean, note: t.exNoMatch })
  }

  if (coverage === 'REGEX') {
    let re: RegExp | null = null
    try { re = new RegExp(rule.body) } catch { return out }
    addPair(sampleForPattern(rule.body), (l) => re!.test(l), t.exRegexHit)
    return out
  }

  if (coverage === 'PATTERN') {
    const inline = parseInlineChecks(rule.body)
    for (const f of inline.forbidden) {
      addPair(sampleForPattern(f.src), (l) => f.re.test(l), t.exForbiddenHit)
    }
    for (const r of inline.required) {
      const ok = sampleForPattern(r.src)
      if (ok) out.push({ code: ok, fires: false, label: t.exClean, note: t.exRequiredOk })
      const missing = cleanSampleFor((l) => r.re.test(l))
      if (missing) out.push({ code: missing, fires: true, label: t.exNotEnough, note: t.exRequiredMissing })
    }
    return out
  }

  if (coverage === 'DETECTOR') {
    for (const d of detectorsForText(ruleText(rule))) {
      const dt = detText(d)
      if (d.test(d.sample)) {
        out.push({ code: d.sample, fires: true, label: t.exFires, note: t.exDetectorHit(dt.label, dt.message) })
      }
      const clean = cleanSampleFor(d.test)
      if (clean) out.push({ code: clean, fires: false, label: t.exClean, note: t.exDetectorClean })
    }
    return out.slice(0, 6)
  }

  if (coverage === 'LIMIT') {
    const limit = parseMaxLineLimit(ruleText(rule))
    out.push({
      code: t.exLimitOverCode(limit! + 40), fires: true, label: t.exFires,
      note: t.exLimitOverNote(limit!),
    })
    out.push({
      code: t.exLimitUnderCode(Math.max(limit! - 40, 10)), fires: false, label: t.exClean,
      note: t.exLimitUnderNote,
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
  const t = e()
  if (!line.trim()) return { applicable: true, fires: false, detail: t.probeEmpty }

  if (coverage === 'REGEX') {
    let re: RegExp | null = null
    try { re = new RegExp(rule.body) } catch { /* geçersiz */ }
    if (!re) return { applicable: false, fires: false, detail: t.probeInvalidRegex }
    return re.test(line)
      ? { applicable: true, fires: true, detail: t.probeRegexHit(rule.body) }
      : { applicable: true, fires: false, detail: t.probeRegexMiss }
  }

  if (coverage === 'PATTERN') {
    const inline = parseInlineChecks(rule.body)
    for (const f of inline.forbidden) {
      if (f.re.test(line)) return { applicable: true, fires: true, detail: t.probeForbiddenHit(f.src) }
    }
    const req = inline.required
    if (req.length > 0) {
      const hit = req.find((r) => r.re.test(line))
      return hit
        ? { applicable: true, fires: false, detail: t.probeRequiredHit(hit.src) }
        : { applicable: true, fires: false, detail: t.probeRequiredMiss }
    }
    return { applicable: true, fires: false, detail: t.probeNoForbidden }
  }

  if (coverage === 'DETECTOR') {
    const dets = detectorsForText(ruleText(rule))
    const hit = dets.find((d) => d.test(line))
    return hit
      ? { applicable: true, fires: true, detail: t.probeDetectorHit(detText(hit).label) }
      : { applicable: true, fires: false, detail: t.probeDetectorMiss }
  }

  if (coverage === 'LIMIT') {
    return { applicable: false, fires: false, detail: t.probeLimit }
  }
  return { applicable: false, fires: false, detail: t.probeManual }
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
  const t = e()

  if (coverage === 'REGEX') {
    return {
      coverage, message,
      headline: t.exRegexHeadline,
      why: t.exRegexWhy,
      checks: [{
        kind: 'regex', label: t.exRegexCheckLabel, code: rule.body,
        meaning: t.exRegexCheckMeaning,
      }],
    }
  }

  if (coverage === 'PATTERN') {
    const inline = parseInlineChecks(rule.body)
    return {
      coverage, message,
      headline: t.exPatternHeadline,
      why: t.exPatternWhy,
      checks: [
        ...inline.forbidden.map((f): RuleCheck => ({
          kind: 'forbidden', label: t.exForbiddenLabel, code: f.src,
          meaning: t.exForbiddenMeaning,
        })),
        ...inline.required.map((f): RuleCheck => ({
          kind: 'required', label: t.exRequiredLabel, code: f.src,
          meaning: t.exRequiredMeaning,
        })),
      ],
    }
  }

  if (coverage === 'DETECTOR') {
    const dets = detectorsForText(text)
    return {
      coverage, message,
      headline: t.exDetectorHeadline,
      why: t.exDetectorWhy(dets.map((d) => d.keywords[0]).join(', ')),
      checks: dets.map((d): RuleCheck => {
        const dt = detText(d)
        const scope = d.scope === 'any'
          ? ''
          : ` · ${d.scope === 'frontend' ? t.exScopeFrontend : t.exScopeBackend}`
        return {
          kind: 'detector',
          label: dt.label + scope,
          meaning: dt.message + ' → ' + dt.suggestion,
        }
      }),
    }
  }

  if (coverage === 'LIMIT') {
    const limit = parseMaxLineLimit(text)
    return {
      coverage, message,
      headline: t.exLimitHeadline,
      why: t.exLimitWhy(limit),
      checks: [{
        kind: 'limit', label: t.exLimitCheckLabel(limit),
        meaning: t.exLimitCheckMeaning,
      }],
    }
  }

  return {
    coverage, message,
    headline: t.exManualHeadline,
    why: t.exManualWhy,
    checks: [],
    fix: t.exManualFix,
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
  const t = e()
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
    report(t.progRules(enabledRules.length))
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
              violate(file.path, added.newLineNumber, ruleMessage(rule), t.violateRegex(rule.name))
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
                violate(file.path, added.newLineNumber, ruleMessage(rule), t.violateForbidden(src))
              }
            }
          }
          for (const { re, src } of inline.required) {
            if (file.addedLines.length === 0) continue
            if (file.addedLines.some((a) => re.test(a.content))) continue
            violate(file.path, file.addedLines[0].newLineNumber, ruleMessage(rule), t.violateRequired(src))
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
            const dt = detText(det)
            for (const added of file.addedLines) {
              if (det.test(added.content)) violate(file.path, added.newLineNumber, dt.message, dt.suggestion)
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
            violate(file.path, null, t.violateLimit(lines, limit), t.violateLimitFix)
          }
        }
        continue
      }

      // (e) Geriye kalan: soyut kural — makine ile denetlenemez
      manualRules.push(rule)
    }

    if (manualRules.length > 0) {
      notices.push(
        t.noticeManual(enabledRules.length - manualRules.length, enabledRules.length, manualRules.length),
      )
    }
  }

  // ---------------------------------------------------------------------------
  // 2) YAPAY ZEKA — yalnızca kendi serbest incelemesi (kurallardan bağımsız)
  // ---------------------------------------------------------------------------
  if (modeUsesAi(mode)) {
    if (!cfg) {
      notices.push(t.noticeNoAi)
    } else {
      const aiFiles = files.filter((f) => f.addedLines.length > 0)
      let doneFiles = 0
      for (const file of aiFiles) {
        report(t.progAi(file.path.split('/').pop() ?? file.path), doneFiles, aiFiles.length)
        const { text, error } = await complete(buildAiPrompt(), buildUserPrompt(file), cfg)
        doneFiles++
        if (error) { notices.push(t.noticeAiFail(error)); continue }
        const addedNums = file.addedLines.map((a) => a.newLineNumber).sort((a, b) => a - b)
        for (const f of parseFindings(text, file.path)) {
          const snapped = snapToAdded(f.line, addedNums)
          if (snapped == null) continue
          pushFinding({ ...f, line: snapped })
        }
      }
      report(t.progCompile, aiFiles.length, aiFiles.length)
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
  return e().aiUserPrompt(file.path, lines)
}

/**
 * Serbest AI incelemesi promptu — kurallardan bağımsız; kod kalitesine odaklanır.
 * Bulguların dili arayüz diliyle aynıdır (prompt içinde açıkça belirtilir).
 */
function buildAiPrompt(): string {
  return e().aiSystemPrompt
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
