// Saf-tarayıcı sürümünün ortak veri tipleri (backend yok; her şey tarayıcıda çalışır).

/** Kural değerlendirme tipi: REGEX = desen eşleşmesi (deterministik), LLM = düz dil (AI değerlendirir). */
export type RuleType = 'REGEX' | 'LLM'

/** Bulgu önem derecesi (artan ciddiyet). */
export type Severity = 'INFO' | 'MINOR' | 'MAJOR' | 'CRITICAL' | 'BLOCKER'

/** İnceleme modu: yalnız kurallar / yalnız AI / ikisi birlikte. */
export type ReviewMode = 'RULES_ONLY' | 'AI_ONLY' | 'AI_WITH_RULES'

/**
 * Bir inceleme kuralı. Kaynağı bir .md dosyasıdır (`sourceFile`); dosyadaki tam satırı
 * (`raw`) düzenleme/silme sırasında bulup değiştirmek için saklanır.
 */
export interface Rule {
  id: string           // kararlı kimlik: `${sourceFile}#${index}`
  sourceFile: string   // hangi md dosyasında tanımlı
  raw: string          // md'deki tam satır (find-replace için)
  name: string
  description?: string
  type: RuleType
  severity: Severity
  filePattern: string  // "*.java", "**" gibi
  body: string         // REGEX deseni veya LLM talimatı
  enabled: boolean
}

/** Kuralın md'ye serileştirilecek/serileştirilmiş alanları (raw/id/sourceFile hariç). */
export type RuleDraft = Omit<Rule, 'id' | 'sourceFile' | 'raw'>

/** Diff'te eklenen tek satır ve yeni dosyadaki numarası. */
export interface AddedLine {
  newLineNumber: number
  content: string
}

/** İncelenecek tek dosya: ham diff + eklenen satırlar. */
export interface ChangedFile {
  path: string
  rawDiff: string
  addedLines: AddedLine[]
}

/** Bulgunun kaynağı: RULE = deterministik kural motoru, LLM = yapay zeka incelemesi. */
export type FindingSource = 'RULE' | 'LLM'

/** İnceleme sonucu tek bulgu. */
export interface Finding {
  id: number
  filePath: string
  line: number | null
  severity: Severity
  message: string
  suggestion?: string
  source: FindingSource
  ruleName: string
}

/** Tarayıcı LLM bağlantı durumu (localStorage'da saklanır). */
export interface LlmConfig {
  provider: 'ollama' | 'gemini' | 'openai' | 'anthropic'
  baseUrl: string      // OpenAI-uyumlu/Ollama için taban; Gemini için boş
  model: string
  apiKey: string
}
