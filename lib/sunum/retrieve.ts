// Kaynak dokümandan SLAYT BAŞINA ilgili parçayı seçer.
//
// Neden gerekli: derin üretimde her slayt kendi çağrısını yapıyor. Tüm dokümanı
// her çağrıya koymak hem çıktı bütçesini yiyor hem modelin odağını dağıtıyor —
// "İstanbul metro doluluk oranı" slaytına 2030 yatırım tablosunu vermek, modeli
// slaytın konusundan uzaklaştırıyor.
//
// Yöntem DETERMİNİSTİK: gömme (embedding) yok, ek model çağrısı yok. Basit
// sözcük örtüşmesi + nadirlik ağırlığı, slayt başlığı/görev tanımı ile doküman
// blokları arasında yeterince iyi eşleşme veriyor ve tamamen cihazda çalışıyor.

import { chunkText, cleanExtractedText } from './chunk'

/** Türkçe ve İngilizce'de sık geçen, ayırt ediciliği olmayan sözcükler. */
const STOP = new Set(
  (
    've ile veya ama için gibi daha çok az olan olarak bu şu her bir iki bin milyon ' +
    'the and for with from that this are was were has have had its their they which ' +
    'olan olup ancak ayrıca yani ise de da ki mi mu ne den dan nın nin için üzere'
  ).split(' '),
)

/** Metni karşılaştırmaya uygun sözcüklere ayırır. */
function tokenize(text: string): string[] {
  return text
    .toLocaleLowerCase('tr')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .split(' ')
    .filter((w) => w.length >= 3 && !STOP.has(w))
}

type Block = { index: number; text: string; tokens: Set<string> }

/** Kaynağı bloklara böler. Paragraf ayrımı yoksa (tek blok PDF) chunk'lanır. */
function split(source: string): Block[] {
  const text = cleanExtractedText(source)
  if (!text) return []
  const paras = text
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter((b) => b.length > 40)
  const units = paras.length > 2 ? paras : chunkText(text, 900, 0)
  return units.map((t, index) => ({ index, text: t, tokens: new Set(tokenize(t)) }))
}

/**
 * Bir sözcüğün ayırt ediciliği: her blokta geçen sözcük hiçbir şey ayırmaz,
 * tek blokta geçen sözcük o bloğu işaret eder. (Sadeleştirilmiş IDF.)
 */
function rarity(blocks: Block[]): Map<string, number> {
  const df = new Map<string, number>()
  for (let i = 0; i < blocks.length; i++) {
    blocks[i].tokens.forEach((w) => df.set(w, (df.get(w) ?? 0) + 1))
  }
  const out = new Map<string, number>()
  df.forEach((count, word) => out.set(word, Math.log(1 + blocks.length / count)))
  return out
}

/**
 * Kaynağı bir kez ayrıştırıp saklar; aynı deste için slayt sayısı kadar
 * yeniden bölmeye gerek kalmaz.
 */
export class SourceIndex {
  private readonly blocks: Block[]
  private readonly weight: Map<string, number>

  constructor(source: string) {
    this.blocks = split(source)
    this.weight = rarity(this.blocks)
  }

  get empty(): boolean {
    return this.blocks.length === 0
  }

  /**
   * Sorguyla en ilgili blokları, kaynaktaki SIRAYI koruyarak birleştirir.
   * Sıra korunur çünkü ardışık paragraflar birbirini açıklıyor; puana göre
   * sıralamak metni anlamsız bir kolaj hâline getiriyor.
   */
  select(query: string, budget: number): string {
    if (this.blocks.length === 0) return ''
    const q = tokenize(query)
    if (q.length === 0) return this.blocks.slice(0, 2).map((b) => b.text).join('\n\n').slice(0, budget)

    const scored = this.blocks.map((b) => {
      let score = 0
      for (let i = 0; i < q.length; i++) {
        if (b.tokens.has(q[i])) score += this.weight.get(q[i]) ?? 0
      }
      // Çok kısa blokların puanı şişmesin diye uzunluğa göre hafif normalize.
      return { block: b, score: score / Math.sqrt(Math.max(1, b.tokens.size)) }
    })

    const ranked = scored.slice().sort((a, b) => b.score - a.score)
    const keep = new Set<number>()
    let used = 0
    for (let i = 0; i < ranked.length && used < budget; i++) {
      const { block, score } = ranked[i]
      if (score <= 0 && keep.size > 0) break
      if (used + block.text.length > budget && keep.size > 0) continue
      keep.add(block.index)
      used += block.text.length
    }
    if (keep.size === 0) keep.add(0)

    const ordered = Array.from(keep).sort((a, b) => a - b)
    const parts: string[] = []
    for (let i = 0; i < ordered.length; i++) {
      if (i > 0 && ordered[i] !== ordered[i - 1] + 1) parts.push('[…]')
      parts.push(this.blocks[ordered[i]].text)
    }
    return parts.join('\n\n').slice(0, budget)
  }
}
