// Ücretsiz yerel model kataloğu ve otomatik seçim.
//
// Ürün kuralı: harici ücretli üretim API'si yok. Buradaki modellerin HEPSİ açık
// ağırlıklı ve ücretsiz; kullanıcının kendi makinesinde Ollama ile çalışır.
//
// Bu modül iki soruyu yanıtlar:
//   1) Kurulu modeller arasından hangisi bu iş için en iyisi? (otomatik bağlanma)
//   2) Kurulu değilse kullanıcı hangi komutla çeker? (model seçici)
//
// Sıralama ölçütü SOHBET KALİTESİ DEĞİL, yapısal çıktı başarımıdır: bu modül
// modelden JSON Schema'ya uyan bir sunum istiyor. Küçük ama şemaya sadık bir
// model, büyük ama serbest yazan bir modelden daha kullanışlı.

export type StructuredSkill = 'excellent' | 'good' | 'fair'
export type SpeedClass = 'fast' | 'medium' | 'slow'

export type ModelInfo = {
  /** Ollama etiketi — `ollama pull` ile aynı. */
  id: string
  name: string
  params: string
  /** Yaklaşık indirme boyutu (GB) — kullanıcı kararı için. */
  sizeGb: number
  structured: StructuredSkill
  speed: SpeedClass
  /** Düşünme modu olan modeller yavaştır; istem tarafında kapatılır. */
  thinking?: boolean
  note: { tr: string; en: string }
}

export const FREE_MODELS: ModelInfo[] = [
  {
    id: 'qwen3:8b',
    name: 'Qwen3 8B',
    params: '8B',
    sizeGb: 5.2,
    structured: 'excellent',
    speed: 'medium',
    thinking: true,
    note: {
      tr: 'Önerilen. Şemaya en sadık çıktıyı veriyor, Türkçesi iyi.',
      en: 'Recommended. Most schema-faithful output, strong Turkish.',
    },
  },
  {
    id: 'qwen3:14b',
    name: 'Qwen3 14B',
    params: '14B',
    sizeGb: 9.3,
    structured: 'excellent',
    speed: 'slow',
    thinking: true,
    note: {
      tr: 'Güçlü donanımda en zengin içerik. Şemaya çok sadık.',
      en: 'The richest content on strong hardware. Very schema-faithful.',
    },
  },
  {
    id: 'qwen3:4b',
    name: 'Qwen3 4B',
    params: '4B',
    sizeGb: 2.6,
    structured: 'excellent',
    speed: 'fast',
    thinking: true,
    note: {
      tr: 'Zayıf donanım için. 8B kadar zengin değil ama şemaya uyuyor.',
      en: 'For lighter hardware. Less rich than 8B but keeps to the schema.',
    },
  },
  {
    id: 'qwen2.5:7b',
    name: 'Qwen2.5 7B',
    params: '7B',
    sizeGb: 4.7,
    structured: 'good',
    speed: 'fast',
    note: { tr: 'Hızlı ve dengeli; düşünme modu yok.', en: 'Fast and balanced; no thinking mode.' },
  },
  {
    id: 'gemma3:12b',
    name: 'Gemma 3 12B',
    params: '12B',
    sizeGb: 8.1,
    structured: 'good',
    speed: 'medium',
    note: { tr: 'Zengin içerik üretir, biraz daha yavaş.', en: 'Richer content, a little slower.' },
  },
  {
    id: 'gemma3:4b',
    name: 'Gemma 3 4B',
    params: '4B',
    sizeGb: 3.3,
    structured: 'fair',
    speed: 'fast',
    note: { tr: 'Küçük ve hızlı; kısa sunumlar için yeterli.', en: 'Small and fast; fine for short decks.' },
  },
  {
    id: 'llama3.1:8b',
    name: 'Llama 3.1 8B',
    params: '8B',
    sizeGb: 4.7,
    structured: 'good',
    speed: 'medium',
    note: { tr: 'Yaygın ve kararlı; İngilizce çıktıda güçlü.', en: 'Common and stable; strong in English.' },
  },
  {
    id: 'mistral-nemo:12b',
    name: 'Mistral Nemo 12B',
    params: '12B',
    sizeGb: 7.1,
    structured: 'good',
    speed: 'medium',
    note: { tr: 'Uzun bağlamda iyi; doküman yüklerken işe yarar.', en: 'Good at long context; useful with uploads.' },
  },
  {
    id: 'phi4:14b',
    name: 'Phi-4 14B',
    params: '14B',
    sizeGb: 9.1,
    structured: 'good',
    speed: 'slow',
    note: { tr: 'Analitik içerikte güçlü, donanım ister.', en: 'Strong on analytical content, needs hardware.' },
  },
  {
    id: 'llama3.2:3b',
    name: 'Llama 3.2 3B',
    params: '3B',
    sizeGb: 2.0,
    structured: 'fair',
    speed: 'fast',
    note: { tr: 'En hafif seçenek; taslak çıkarmak için.', en: 'Lightest option; good for rough drafts.' },
  },
]

const STRUCTURED_WEIGHT: Record<StructuredSkill, number> = { excellent: 100, good: 60, fair: 25 }
const SPEED_WEIGHT: Record<SpeedClass, number> = { fast: 12, medium: 8, slow: 2 }

/** Katalogdaki bilgiyi etiketten bulur. "qwen3:8b-q4_K_M" de "qwen3:8b" ile eşleşir. */
export function findModel(tag: string): ModelInfo | null {
  const wanted = tag.toLowerCase()
  for (let i = 0; i < FREE_MODELS.length; i++) {
    const id = FREE_MODELS[i].id.toLowerCase()
    if (wanted === id || wanted.indexOf(id) === 0) return FREE_MODELS[i]
  }
  // Etiketsiz kullanım: "qwen3" → ailenin ilk üyesi.
  const bare = wanted.split(':')[0]
  for (let i = 0; i < FREE_MODELS.length; i++) {
    if (FREE_MODELS[i].id.split(':')[0] === bare) return FREE_MODELS[i]
  }
  return null
}

/**
 * Modelin bu iş için uygunluk puanı. Katalogda olmayan (kullanıcının kendi
 * çektiği) modeller 0 alır — yine de listelenir, sadece otomatik seçilmez.
 */
export function scoreModel(tag: string): number {
  const info = findModel(tag)
  if (!info) return 0
  return STRUCTURED_WEIGHT[info.structured] + SPEED_WEIGHT[info.speed]
}

/** Kurulu modelleri uygunluğa göre sıralar (en iyi başta). */
export function rankInstalled(installed: string[]): string[] {
  return installed
    .slice()
    .sort((a, b) => {
      const diff = scoreModel(b) - scoreModel(a)
      // Eşitlikte alfabetik: sıralama her açılışta aynı olsun, rastgele değişmesin.
      return diff !== 0 ? diff : a.localeCompare(b)
    })
}

/**
 * Otomatik bağlanma kararı.
 *
 * `preferred` kuruluysa ona dokunulmaz — kullanıcının seçimi her zaman kazanır.
 * Değilse katalogdaki en uygun kurulu model seçilir. Kurulu model katalogda
 * yoksa (kullanıcı kendi modelini çekmişse) yine de bağlanılır: çalışan bir
 * model, hiç model olmamasından iyidir.
 */
export function pickModel(installed: string[], preferred?: string): string | null {
  if (installed.length === 0) return null
  if (preferred && installed.some((tag) => tag === preferred || tag.indexOf(preferred) === 0)) return preferred
  const ranked = rankInstalled(installed)
  return ranked[0] ?? null
}

/** Kurulu olmayan ama önerilen modeller — seçicide "indir" olarak gösterilir. */
export function missingRecommended(installed: string[], limit = 3): ModelInfo[] {
  const lower = installed.map((t) => t.toLowerCase())
  const isInstalled = (id: string) => lower.some((t) => t === id || t.indexOf(id) === 0)
  return FREE_MODELS.filter((m) => !isInstalled(m.id.toLowerCase()))
    .sort((a, b) => STRUCTURED_WEIGHT[b.structured] - STRUCTURED_WEIGHT[a.structured])
    .slice(0, limit)
}
