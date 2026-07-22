// Tarayıcı LLM istemcisi — sağlayıcıya doğrudan (backend olmadan) çağrı yapar.
// Anahtar/model/base localStorage'da tutulur. Determinizm için temperature 0 + sabit seed.
// CORS notu: Gemini tarayıcıdan çalışır; Ollama için `OLLAMA_ORIGINS=*` gerekir; kurumsal
// GitLab/gateway CORS'a takılabilir — hatalar kullanıcıya aynen gösterilir.

import type { LlmConfig } from './types'

const KEY = 'pcr-llm-config'
const SEEDED = 'pcr-llm-seeded'
const MAX_TOKENS = 4096

/** Varsayılan bağlantı: yerel Ollama (anahtarsız, OpenAI-uyumlu uç nokta). */
export const DEFAULT_CONFIG: LlmConfig = {
  provider: 'openai',
  baseUrl: 'http://localhost:11434/v1',
  model: 'qwen2.5-coder:7b',
  apiKey: '',
}

/**
 * Kayıtlı bağlantıyı okur; hiç yoksa (yalnızca İLK açılışta) Ollama'yı varsayılan olarak bağlar.
 * Kullanıcı bağlantıyı kestiyse tekrar tohumlanmaz — `SEEDED` bayrağı bunu engeller.
 * Not: bağlantı burada doğrulanmaz; Ollama ayakta değilse hata inceleme sırasında görünür.
 */
export function loadOrSeedConfig(): LlmConfig | null {
  const current = loadConfig()
  if (current) return current
  try {
    if (localStorage.getItem(SEEDED)) return null
    localStorage.setItem(SEEDED, '1')
  } catch {
    return DEFAULT_CONFIG // localStorage yoksa yine de varsayılanla çalış
  }
  saveConfig(DEFAULT_CONFIG)
  return DEFAULT_CONFIG
}

/** Kayıtlı AI bağlantısını okur; yoksa ya da bozuksa null döner. */
export function loadConfig(): LlmConfig | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as LlmConfig) : null
  } catch {
    return null
  }
}

/** AI bağlantısını bu tarayıcıya kaydeder (anahtar dahil; sunucuya gitmez). */
export function saveConfig(cfg: LlmConfig): void {
  localStorage.setItem(KEY, JSON.stringify(cfg))
}

/** Kayıtlı AI bağlantısını siler ("Bağlantıyı Kes"). */
export function clearConfig(): void {
  localStorage.removeItem(KEY)
}

/** Küçük bir istekle bağlantıyı doğrular. Hata varsa mesajı döner (yoksa null). */
export async function testConfig(cfg: LlmConfig): Promise<string | null> {
  const res = await complete('Bağlantı testi.', "Sadece 'OK' yaz.", cfg)
  if (res.error) return res.error
  return res.text.trim() ? null : 'Model boş yanıt döndü (model adı/kota hatalı olabilir).'
}

/** system + user promptunu modele gönderir. { text, error } döner. */
export async function complete(
  system: string,
  user: string,
  cfg: LlmConfig,
): Promise<{ text: string; error: string | null }> {
  try {
    if (cfg.provider === 'gemini') return await callGemini(system, user, cfg)
    if (cfg.provider === 'anthropic') return await callAnthropic(system, user, cfg)
    return await callOpenAiCompatible(system, user, cfg)
  } catch (e) {
    // Ağ/CORS hatası fetch'i fırlatır (TypeError). Kullanıcıya net mesaj.
    return { text: '', error: (e instanceof Error ? e.message : String(e)) + ' (CORS/erişim engeli olabilir)' }
  }
}

/** Google Gemini `generateContent` çağrısı (anahtar `x-goog-api-key` başlığında). */
async function callGemini(system: string, user: string, cfg: LlmConfig) {
  const base = trimSlash(cfg.baseUrl) || 'https://generativelanguage.googleapis.com'
  const url = `${base}/v1beta/models/${cfg.model}:generateContent`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': cfg.apiKey },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: { maxOutputTokens: MAX_TOKENS, temperature: 0, topP: 1 },
    }),
  })
  if (!res.ok) return { text: '', error: await errText(res) }
  const data = await res.json()
  const parts = data?.candidates?.[0]?.content?.parts ?? []
  return { text: parts.map((p: any) => p.text ?? '').join(''), error: null }
}

/**
 * OpenAI-uyumlu `chat/completions` çağrısı — Ollama, Groq, OpenRouter, Cerebras, Mistral
 * ve özel gateway'ler bu yolu kullanır. Ollama anahtarsız çalışır.
 */
async function callOpenAiCompatible(system: string, user: string, cfg: LlmConfig) {
  const base = trimSlash(cfg.baseUrl) || 'https://api.openai.com'
  const url = base.endsWith('/v1') ? `${base}/chat/completions` : `${base}/v1/chat/completions`
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (cfg.apiKey) headers['Authorization'] = `Bearer ${cfg.apiKey}` // Ollama anahtarsız
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: cfg.model,
      max_tokens: MAX_TOKENS,
      temperature: 0,
      top_p: 1,
      seed: 42,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  })
  if (!res.ok) return { text: '', error: await errText(res) }
  const data = await res.json()
  return { text: data?.choices?.[0]?.message?.content ?? '', error: null }
}

/** Anthropic Messages API çağrısı (tarayıcıdan doğrudan erişim başlığıyla). */
async function callAnthropic(system: string, user: string, cfg: LlmConfig) {
  // Claude (Anthropic Messages API). Tarayıcıdan doğrudan çağrı için
  // 'anthropic-dangerous-direct-browser-access' başlığı CORS'u açar.
  const base = trimSlash(cfg.baseUrl) || 'https://api.anthropic.com'
  const res = await fetch(`${base}/v1/messages`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': cfg.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: cfg.model,
      max_tokens: MAX_TOKENS,
      temperature: 0,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  })
  if (!res.ok) return { text: '', error: await errText(res) }
  const data = await res.json()
  const blocks: any[] = data?.content ?? []
  return { text: blocks.filter((b) => b.type === 'text').map((b) => b.text ?? '').join(''), error: null }
}

/** Sondaki `/` karakterini atar (taban adresleri birleştirirken çift slash olmasın). */
function trimSlash(u: string): string {
  return u && u.endsWith('/') ? u.slice(0, -1) : u
}

/** Başarısız yanıtı kullanıcıya gösterilecek kısa bir hata metnine çevirir. */
async function errText(res: Response): Promise<string> {
  const body = await res.text().catch(() => '')
  return `${res.status} ${res.statusText} ${body}`.slice(0, 300)
}
