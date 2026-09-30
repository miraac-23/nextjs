'use client'

// Sağlayıcıdan canlı model listesi çeker.
//
// Katalogda sabit model listesi tutmak hızla eskiyor; sağlayıcılar model
// ekleyip çıkarıyor. Bu yüzden liste mümkün olduğunda çalışma anında alınır ve
// alınamazsa katalogdaki sabit listeye düşülür — açılır menü hiçbir zaman boş kalmaz.
//
// OpenRouter'ın model listesi anahtarsız okunabildiği için kullanıcı anahtarını
// girmeden de ücretsiz modelleri görebilir.

import { getProvider } from './providers'
import { rankInstalled } from './models'

export type ModelOption = {
  id: string
  /** Sağlayıcı bu modeli ücretsiz sunuyor mu? (OpenRouter ":free" eki) */
  free: boolean
}

const TIMEOUT_MS = 8_000

function tagNames(data: { models?: { name?: string; model?: string }[] }): string[] {
  const list = Array.isArray(data.models) ? data.models : []
  const names: string[] = []
  for (let i = 0; i < list.length; i++) {
    const name = list[i].name || list[i].model
    if (typeof name === 'string' && name) names.push(name)
  }
  return names
}

/**
 * Kurulu Ollama modelleri — uygunluk sırasına göre.
 *
 * Doğrudan tarayıcıdan yapılan istek Ollama'nın CORS kısıtına takılıyor ve ancak
 * `OLLAMA_ORIGINS` ayarlıysa çalışıyor. Başarısız olursa bu sitenin sunucusu
 * denenir (sunucuda CORS yoktur). Ölçülen hata tam olarak buydu: model kurulumu
 * bittikten sonra liste boş dönüyor, panel servisi "kapalı" sanıyor ve kurulum
 * sihirbazı otomatik kolundan terminal koluna geri düşüyordu.
 */
async function ollamaModels(baseUrl: string, signal?: AbortSignal): Promise<ModelOption[]> {
  try {
    const res = await fetch(`${baseUrl}/api/tags`, { signal, cache: 'no-store' })
    if (res.ok) {
      const names = tagNames((await res.json()) as { models?: { name?: string }[] })
      if (names.length > 0) return rankInstalled(names).map((id) => ({ id, free: true }))
    }
  } catch {
    /* CORS ya da servis kapalı — aşağıda sunucu yolu denenir. */
  }

  try {
    const res = await fetch('/api/ai/local', { signal, cache: 'no-store' })
    if (!res.ok) return []
    const data = (await res.json()) as { ok?: boolean; models?: unknown }
    if (!data.ok || !Array.isArray(data.models)) return []
    const names = data.models.filter((m): m is string => typeof m === 'string')
    return rankInstalled(names).map((id) => ({ id, free: true }))
  } catch {
    return []
  }
}

/** OpenAI uyumlu `/models` yanıtı. */
async function openAiModels(url: string, apiKey: string | undefined, signal?: AbortSignal): Promise<ModelOption[]> {
  const headers: Record<string, string> = {}
  if (apiKey) headers.authorization = `Bearer ${apiKey}`
  const res = await fetch(url, { headers, signal, cache: 'no-store' })
  if (!res.ok) return []
  const data = (await res.json()) as { data?: { id?: unknown; pricing?: { prompt?: unknown } }[] }
  const list = Array.isArray(data.data) ? data.data : []
  const out: ModelOption[] = []
  for (let i = 0; i < list.length; i++) {
    const id = list[i]?.id
    if (typeof id !== 'string' || !id) continue
    // OpenRouter ücretsiz modelleri ":free" ekiyle işaretliyor; diğerlerinde
    // fiyat bilgisi varsa sıfır olup olmadığına bakılır.
    const pricing = list[i]?.pricing?.prompt
    const free = id.endsWith(':free') || pricing === '0' || pricing === 0
    out.push({ id, free })
  }
  // Ücretsizler başa: kullanıcı ücretsiz seçenekleri önce görsün.
  return out.sort((a, b) => (a.free === b.free ? a.id.localeCompare(b.id) : a.free ? -1 : 1))
}

/**
 * Sağlayıcının kullanılabilir modellerini verir. Ağ hatası, yetki hatası ya da
 * desteklenmeyen uç durumunda katalogdaki sabit listeye düşer.
 */
export async function fetchModels(
  providerId: string,
  options: { apiKey?: string; baseUrl?: string; signal?: AbortSignal } = {},
): Promise<{ models: ModelOption[]; live: boolean }> {
  const info = getProvider(providerId)
  const fallback = { models: info.models.map((id) => ({ id, free: !info.paid })), live: false }

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  const signal = options.signal
  const onAbort = () => ctrl.abort()
  if (signal) {
    if (signal.aborted) ctrl.abort()
    else signal.addEventListener('abort', onAbort)
  }

  try {
    const base = options.baseUrl || info.baseUrl
    if (!base) return fallback

    const models =
      info.wire === 'ollama'
        ? await ollamaModels(base, ctrl.signal)
        : await openAiModels(info.modelsUrl || `${base.replace(/\/$/, '')}/models`, options.apiKey, ctrl.signal)

    return models.length > 0 ? { models, live: true } : fallback
  } catch {
    return fallback
  } finally {
    clearTimeout(timer)
    if (signal) signal.removeEventListener('abort', onAbort)
  }
}
