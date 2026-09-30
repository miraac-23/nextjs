// AI sağlayıcı kataloğu.
//
// Ürünün kuralı: uygulama İLK AÇILIŞTA bir modele bağlı gelmeli. Kullanıcıdan
// kurulum, kayıt ya da anahtar istemeden. Bu yüzden katalogda üç sınıf var:
//
//   keyless → anahtarsız, kurulumsuz, ücretsiz. Varsayılan bağlantı budur.
//   local   → kullanıcının kendi makinesindeki Ollama. Ücretsiz ve en gizli;
//             kuruluysa keyless'a TERCİH EDİLİR (veri cihazdan çıkmaz).
//   byok    → kullanıcının kendi anahtarı ("bring your own key"). Ücretsiz katman
//             da olabilir, ücretli de. Anahtar TARAYICIDA kalır.
//
// Tel formatı olarak yalnızca iki istemci var: OpenAI uyumlu `chat/completions`
// ve Ollama'nın kendi `api/chat` ucu. OpenAI uyumluluğu neredeyse tüm sağlayıcıları
// (OpenRouter, Groq, Gemini, Mistral, DeepSeek, Together, Cerebras…) tek bir
// gerçekleştirimle kapsıyor; ayrı ayrı istemci yazmaya gerek kalmıyor.

export type ProviderKind = 'keyless' | 'local' | 'byok'
export type ProviderWire = 'openai' | 'ollama'

/** Yapısal çıktı desteği — istem ve ayrıştırma stratejisini belirler. */
export type StructuredSupport =
  /** JSON Schema ile gramer kısıtlı üretim (en güvenilir). */
  | 'schema'
  /** Yalnızca "JSON döndür" modu; şema zorlanmaz, çıktı onarılır. */
  | 'json'
  /** Hiçbiri; metinden JSON çıkarılır (normalize katmanı zaten buna hazır). */
  | 'none'

export type ProviderInfo = {
  id: string
  name: string
  kind: ProviderKind
  wire: ProviderWire
  /** OpenAI uyumlu taban adres (sonunda /v1 ya da eşdeğeri). */
  baseUrl: string
  needsKey: boolean
  structured: StructuredSupport
  /** Sunuma giren metin nereye gidiyor? Arayüz bunu açıkça yazar. */
  privacy: 'device' | 'hosted'
  /** Kullanıcının ücret ödemesi gerekiyor mu? */
  paid: boolean
  /** Önceden bilinen model kimlikleri. Boşsa çalışma anında listelenir. */
  models: string[]
  /** Anahtar alma sayfası (byok). */
  keyUrl?: string
  /** Model listesini canlı çeken uç (varsa). */
  modelsUrl?: string
  /**
   * Sağlayıcının izin verdiği en fazla çıktı token'ı. Ücretsiz katmanlar bunu
   * sıkı tutuyor; istem kısalığa göre ayarlanır ve kesilen yanıt kurtarılır.
   */
  maxOutput?: number
  /**
   * Düşünme (reasoning) modeli mi? Öyleyse `reasoning_effort: 'low'` gönderilir;
   * aksi hâlde model bütçenin tamamını iç sesine harcayıp içerik üretmiyor.
   */
  reasoning?: boolean
  note: { tr: string; en: string }
}

export const PROVIDERS: ProviderInfo[] = [
  {
    id: 'pollinations',
    name: 'Pollinations · GPT-OSS 20B',
    kind: 'keyless',
    wire: 'openai',
    baseUrl: 'https://text.pollinations.ai/openai',
    needsKey: false,
    // `response_format` kabul ediliyor ama şemaya tam uyum garanti değil;
    // bu yüzden 'json' sayılıyor ve çıktı normalize katmanında onarılıyor.
    structured: 'json',
    privacy: 'hosted',
    paid: false,
    models: ['openai-fast'],
    // Anonim katman çıktıyı ~1500 token'da kesiyor ve model düşünme modunda.
    maxOutput: 1500,
    reasoning: true,
    note: {
      tr: 'Kurulum ve anahtar gerektirmez. Açık ağırlıklı GPT-OSS 20B modeli. Slayt metni bu servise gider.',
      en: 'No install, no key. Open-weight GPT-OSS 20B. Slide text is sent to this service.',
    },
  },
  {
    id: 'ollama',
    name: 'Ollama (yerel)',
    kind: 'local',
    wire: 'ollama',
    baseUrl: 'http://localhost:11434',
    needsKey: false,
    structured: 'schema',
    privacy: 'device',
    paid: false,
    models: [],
    note: {
      tr: 'Kendi makinende çalışır. En gizli ve sınırsız seçenek; kurulu olduğunda otomatik tercih edilir.',
      en: 'Runs on your own machine. The most private, unlimited option; preferred automatically when installed.',
    },
  },
  {
    id: 'vercel',
    name: 'Vercel AI Gateway',
    kind: 'byok',
    wire: 'openai',
    baseUrl: 'https://ai-gateway.vercel.sh/v1',
    needsKey: true,
    structured: 'schema',
    privacy: 'hosted',
    paid: false,
    models: [],
    modelsUrl: 'https://ai-gateway.vercel.sh/v1/models',
    keyUrl: 'https://vercel.com/dashboard/ai-gateway',
    note: {
      tr: 'Tek anahtarla 390+ model (Qwen 3, GPT, Claude, Gemini…). Güçlü model = daha çok grafik ve diyagram. Jev karar modeli de aynı anahtarla çalışır.',
      en: 'One key for 390+ models (Qwen 3, GPT, Claude, Gemini…). A stronger model means more charts and diagrams. The Jev decision model uses the same key.',
    },
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    kind: 'byok',
    wire: 'openai',
    baseUrl: 'https://openrouter.ai/api/v1',
    needsKey: true,
    structured: 'schema',
    privacy: 'hosted',
    paid: false,
    models: [],
    modelsUrl: 'https://openrouter.ai/api/v1/models',
    keyUrl: 'https://openrouter.ai/keys',
    note: {
      tr: '":free" etiketli modeller ücretsiz. Ücretli modellere de aynı anahtarla erişilir.',
      en: 'Models tagged ":free" cost nothing. Paid models use the same key.',
    },
  },
  {
    id: 'groq',
    name: 'Groq',
    kind: 'byok',
    wire: 'openai',
    baseUrl: 'https://api.groq.com/openai/v1',
    needsKey: true,
    structured: 'json',
    privacy: 'hosted',
    paid: false,
    models: [],
    modelsUrl: 'https://api.groq.com/openai/v1/models',
    keyUrl: 'https://console.groq.com/keys',
    note: {
      tr: 'Çok hızlı çıkarım, cömert ücretsiz kota. Anahtar ücretsiz alınır.',
      en: 'Very fast inference, generous free quota. The key is free to obtain.',
    },
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    kind: 'byok',
    wire: 'openai',
    // Google'ın OpenAI uyumlu ucu; ayrı bir istemci gerektirmez.
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    needsKey: true,
    structured: 'schema',
    privacy: 'hosted',
    paid: false,
    models: ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-pro'],
    keyUrl: 'https://aistudio.google.com/apikey',
    note: {
      tr: 'Ücretsiz katman mevcut. Anahtar Google AI Studio’dan alınır.',
      en: 'Free tier available. Get the key from Google AI Studio.',
    },
  },
  {
    id: 'cerebras',
    name: 'Cerebras',
    kind: 'byok',
    wire: 'openai',
    baseUrl: 'https://api.cerebras.ai/v1',
    needsKey: true,
    structured: 'schema',
    privacy: 'hosted',
    paid: false,
    models: ['qwen-3-32b', 'llama-3.3-70b', 'gpt-oss-120b'],
    modelsUrl: 'https://api.cerebras.ai/v1/models',
    keyUrl: 'https://cloud.cerebras.ai',
    note: {
      tr: 'Qwen 3 ve Llama 3.3 ücretsiz katmanda. Çok hızlı çıkarım.',
      en: 'Qwen 3 and Llama 3.3 on the free tier. Very fast inference.',
    },
  },
  {
    id: 'mistral',
    name: 'Mistral',
    kind: 'byok',
    wire: 'openai',
    baseUrl: 'https://api.mistral.ai/v1',
    needsKey: true,
    structured: 'schema',
    privacy: 'hosted',
    paid: false,
    models: ['mistral-small-latest', 'open-mistral-nemo'],
    modelsUrl: 'https://api.mistral.ai/v1/models',
    keyUrl: 'https://console.mistral.ai/api-keys',
    note: {
      tr: 'Ücretsiz deneme katmanı var; açık ağırlıklı Mistral modelleri.',
      en: 'Has a free experiment tier; open-weight Mistral models.',
    },
  },
  {
    id: 'together',
    name: 'Together AI',
    kind: 'byok',
    wire: 'openai',
    baseUrl: 'https://api.together.xyz/v1',
    needsKey: true,
    structured: 'schema',
    privacy: 'hosted',
    paid: false,
    models: [],
    modelsUrl: 'https://api.together.xyz/v1/models',
    keyUrl: 'https://api.together.ai/settings/api-keys',
    note: {
      tr: 'Açık ağırlıklı modeller (Qwen, Llama, DeepSeek). Ücretsiz kotayla başlar.',
      en: 'Open-weight models (Qwen, Llama, DeepSeek). Starts with a free quota.',
    },
  },
  {
    id: 'nvidia',
    name: 'NVIDIA NIM',
    kind: 'byok',
    wire: 'openai',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    needsKey: true,
    structured: 'json',
    privacy: 'hosted',
    paid: false,
    models: [],
    modelsUrl: 'https://integrate.api.nvidia.com/v1/models',
    keyUrl: 'https://build.nvidia.com',
    note: {
      tr: 'En geniş açık ağırlıklı model kataloğu; kredi kartı istemez.',
      en: 'The widest open-weight catalogue; no credit card required.',
    },
  },
  {
    id: 'huggingface',
    name: 'Hugging Face',
    kind: 'byok',
    wire: 'openai',
    baseUrl: 'https://router.huggingface.co/v1',
    needsKey: true,
    structured: 'json',
    privacy: 'hosted',
    paid: false,
    models: [],
    modelsUrl: 'https://router.huggingface.co/v1/models',
    keyUrl: 'https://huggingface.co/settings/tokens',
    note: {
      tr: '130+ açık ağırlıklı model (Qwen, DeepSeek, Llama, Gemma). Ücretsiz katman mevcut.',
      en: '130+ open-weight models (Qwen, DeepSeek, Llama, Gemma). Free tier available.',
    },
  },
  {
    id: 'chutes',
    name: 'Chutes',
    kind: 'byok',
    wire: 'openai',
    baseUrl: 'https://llm.chutes.ai/v1',
    needsKey: true,
    structured: 'json',
    privacy: 'hosted',
    paid: false,
    models: [],
    modelsUrl: 'https://llm.chutes.ai/v1/models',
    keyUrl: 'https://chutes.ai',
    note: {
      tr: 'Qwen 3, DeepSeek, GLM ve Kimi modelleri. Ücretsiz katmanla başlar.',
      en: 'Qwen 3, DeepSeek, GLM and Kimi models. Starts with a free tier.',
    },
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    kind: 'byok',
    wire: 'openai',
    baseUrl: 'https://api.deepseek.com/v1',
    needsKey: true,
    structured: 'json',
    privacy: 'hosted',
    paid: true,
    models: ['deepseek-chat', 'deepseek-reasoner'],
    keyUrl: 'https://platform.deepseek.com/api_keys',
    note: {
      tr: 'Çok ucuz, ücretli. Uzun dokümanlarda güçlü.',
      en: 'Very cheap, paid. Strong on long documents.',
    },
  },
  {
    id: 'openai',
    name: 'OpenAI',
    kind: 'byok',
    wire: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    needsKey: true,
    structured: 'schema',
    privacy: 'hosted',
    paid: true,
    models: ['gpt-5-mini', 'gpt-5', 'gpt-4.1-mini'],
    modelsUrl: 'https://api.openai.com/v1/models',
    keyUrl: 'https://platform.openai.com/api-keys',
    note: {
      tr: 'Ücretli. Kendi anahtarınla kullanılır; anahtar tarayıcından çıkmaz.',
      en: 'Paid. Used with your own key; the key never leaves your browser.',
    },
  },
  {
    id: 'custom',
    name: 'Özel (OpenAI uyumlu)',
    kind: 'byok',
    wire: 'openai',
    baseUrl: '',
    needsKey: false,
    structured: 'json',
    privacy: 'hosted',
    paid: false,
    models: [],
    note: {
      tr: 'Kendi adresini ve modelini gir. OpenAI uyumlu her uç nokta çalışır (Mistral, DeepSeek, Together, LM Studio…).',
      en: 'Enter your own base URL and model. Any OpenAI-compatible endpoint works (Mistral, DeepSeek, Together, LM Studio…).',
    },
  },
]

/** İlk açılışta bağlanılacak sağlayıcı: anahtarsız, kurulumsuz. */
export const DEFAULT_PROVIDER_ID = 'pollinations'

/** Ollama kuruluysa keyless yerine bu tercih edilir (ücretsiz + gizli + sınırsız). */
export const PREFERRED_LOCAL_ID = 'ollama'

const BY_ID: Record<string, ProviderInfo> = PROVIDERS.reduce<Record<string, ProviderInfo>>((acc, p) => {
  acc[p.id] = p
  return acc
}, {})

export function getProvider(id: string | undefined | null): ProviderInfo {
  return (id && BY_ID[id]) || BY_ID[DEFAULT_PROVIDER_ID]
}

export function isProviderId(value: unknown): value is string {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(BY_ID, value)
}

/**
 * Sunucunun kabul ettiği sağlayıcılar.
 *
 * GÜVENLİK: istemciden gelen keyfi bir taban adresi asla kullanılmaz (SSRF).
 * Sunucu yalnızca anahtarsız ön ayarları çalıştırır; kullanıcının kendi anahtarı
 * olan sağlayıcılar tarayıcıdan doğrudan çağrılır, anahtar sunucuya hiç gelmez.
 */
export function isServerAllowed(id: string): boolean {
  const provider = BY_ID[id]
  if (!provider) return false
  // Anahtarsız sağlayıcılar her zaman sunucudan çalışabilir.
  if (provider.kind === 'keyless') return true
  /*
   * Yerel servis de sunucudan çalışabilir ve bu bilinçli: tarayıcıdan Ollama'ya
   * erişim CORS'a takılıyor, sunucudan takılmıyor. Hedef adres istemciden
   * GELMEZ — sunucu kendi `OLLAMA_BASE_URL` değerini kullanır (bkz. ai/server.ts),
   * yani bu istisna keyfi bir hedefe istek atmaya izin vermiyor.
   */
  if (provider.kind === 'local') return true
  // Vercel AI Gateway istisnadır: anahtarı Vercel entegrasyonu ORTAM DEĞİŞKENİ
  // olarak ekliyor, yani sunucuda zaten var — kullanıcının bir şey yapıştırması
  // gerekmiyor. Anahtar yoksa sunucu bunu kendisi reddeder (bkz. ai/server.ts).
  return provider.id === 'vercel'
}

/**
 * Bağlantının hangi yoldan kurulacağı.
 *
 *   keyless                  → sunucu (istem sunucuda kalır, CORS sürprizi olmaz)
 *   vercel + kullanıcı anahtarı YOK → sunucu (anahtar ortam değişkeninde olabilir)
 *   diğer hepsi              → doğrudan: sunucu kullanıcının localhost'unu göremez
 *                              ve kullanıcının anahtarı sunucuya GÖNDERİLMEZ.
 */
export function transportFor(provider: ProviderInfo, hasUserKey = false): 'server' | 'direct' {
  if (provider.kind === 'keyless') return 'server'
  if (provider.id === 'vercel' && !hasUserKey) return 'server'
  return 'direct'
}
