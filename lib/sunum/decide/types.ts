// Karar katmanı — tip modeli.
//
// Bu katman ÜRETİM yapmaz, KARAR verir. Jev (TypeSafe AI) "System One" modeli
// tam olarak bunu yapıyor: düz metin üretmiyor, tipli karar döndürüyor
// (choice / score / noul), tek çağrıda onlarca soruyu paralel yanıtlıyor.
//
// Bizim tiplerimiz Jev'in tel formatıyla birebir eşleşir; bu sayede JevProvider
// ince bir eşleyiciden ibaret kalır ve yerel kural motoru da AYNI sözleşmeyi
// uygular — anahtar olmadan da ürün çalışır.

/** Seçenekler arasından biri (Jev: `choice`). `criteria` seçenek → açıklama eşlemesi. */
export type ChoiceQuestion = {
  type: 'choice'
  instructions: string
  criteria: Record<string, string>
}

/** Sıralı seviyeler arasında konum (Jev: `score`). 2–10 seviye. */
export type ScoreQuestion = {
  type: 'score'
  instructions: string
  criteria: string[]
}

/** Evet/hayır olasılığı (Jev: `noul`). */
export type NoulQuestion = {
  type: 'noul'
  instructions: string
  criteria?: { true: string; false: string }
}

export type Question = ChoiceQuestion | ScoreQuestion | NoulQuestion

export type ChoiceAnswer = {
  type: 'choice'
  choice: string
  probabilities?: Record<string, number>
  confidence?: number
}

export type ScoreAnswer = {
  type: 'score'
  /** Seviyeler arası ondalıklı konum: 1.05 → "1. seviyeye çok yakın". */
  score: number
  confidence?: number
}

export type NoulAnswer = {
  type: 'noul'
  /** 0–1 arası olasılık. */
  noul: number
}

export type Answer = ChoiceAnswer | ScoreAnswer | NoulAnswer

export type DecisionRequest = {
  /** Değerlendirilecek içerik. Düz metin ya da yapılandırılmış veri. */
  state: string
  /** Anahtar → soru. Yanıtlar aynı anahtarlarla döner. */
  questions: Record<string, Question>
}

/**
 * Kararı kim verdi?
 *   local   → deterministik sezgi, ağ çağrısı yok (varsayılan)
 *   jev     → TypeSafe AI'ın System One modeli, kendi tel formatıyla
 *   gateway → Vercel AI Gateway üzerinden bir sohbet modeli (JSON şemasıyla)
 * Arayüz bunu her zaman gösterir; "Jev" etiketi yalnızca gerçekten Jev'e aittir.
 */
export type DecisionSource = 'jev' | 'gateway' | 'local'

export type DecisionResult = {
  answers: Record<string, Answer>
  source: DecisionSource
  /** Uzak motorlarda kullanılan model kimliği. */
  model?: string
}

export interface DecisionProvider {
  readonly id: DecisionSource
  decide(req: DecisionRequest, signal?: AbortSignal): Promise<DecisionResult>
}

/* ================================ yardımcılar ================================ */

export function isChoice(answer: Answer | undefined): answer is ChoiceAnswer {
  return !!answer && answer.type === 'choice'
}

export function isScore(answer: Answer | undefined): answer is ScoreAnswer {
  return !!answer && answer.type === 'score'
}

export function isNoul(answer: Answer | undefined): answer is NoulAnswer {
  return !!answer && answer.type === 'noul'
}

/**
 * Evet/hayır kararını eşikle okur. Varsayılan 0.6: kararsız bölgede (0.4–0.6)
 * kullanıcıyı uyarmıyoruz — yanlış pozitif, sessiz kalmaktan daha rahatsız edici.
 */
export function yes(answer: Answer | undefined, threshold = 0.6): boolean {
  return isNoul(answer) ? answer.noul >= threshold : false
}

/** Seçim yanıtını okur; yanıt yoksa ya da beklenen seçeneklerden değilse `fallback`. */
export function choiceOf<T extends string>(answer: Answer | undefined, allowed: readonly T[], fallback: T): T {
  if (!isChoice(answer)) return fallback
  return (allowed as readonly string[]).indexOf(answer.choice) >= 0 ? (answer.choice as T) : fallback
}

/** Puanı 0–1 aralığına normalize eder (seviye sayısına bölerek). */
export function scoreRatio(answer: Answer | undefined, levels: number): number {
  if (!isScore(answer) || levels < 2) return 0
  return Math.min(1, Math.max(0, answer.score / (levels - 1)))
}
