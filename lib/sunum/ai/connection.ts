'use client'

// Bağlantı ayarı ve OTOMATİK BAĞLANMA.
//
// Ürün kuralı: uygulama ilk açılışta bir modele BAĞLI gelir. Kullanıcıdan kurulum,
// kayıt ya da anahtar istenmez. Karar sırası:
//
//   1. Kayıtlı bir tercih varsa o kullanılır (kullanıcı her zaman kazanır).
//   2. Yoksa yerel Ollama hızlıca yoklanır — kuruluysa seçilir: ücretsiz,
//      sınırsız ve veri cihazdan çıkmaz.
//   3. Ollama yoksa anahtarsız barındırılan ücretsiz sağlayıcıya bağlanılır.
//
// Seçim kalıcı olarak kaydedilir; ikinci açılışta yeniden yoklama yapılmaz.
//
// API anahtarları YALNIZCA tarayıcıda saklanır ve yalnızca sağlayıcının kendi
// adresine gider — bu sitenin sunucusuna hiçbir koşulda gönderilmez.

import { pickModel } from './models'
import { DEFAULT_PROVIDER_ID, PREFERRED_LOCAL_ID, getProvider, isProviderId } from './providers'

const KEY = 'sunum-studio:ai:v2'
/** Otomatik seçimde yerel yoklamanın bekleyeceği en uzun süre. */
const LOCAL_PROBE_MS = 1200

export type AiConnection = {
  providerId: string
  model: string
  /** Yalnızca kendi anahtarını getiren sağlayıcılarda. Tarayıcıda kalır. */
  apiKey?: string
  /** Yalnızca 'custom' sağlayıcıda. */
  baseUrl?: string
}

export const FALLBACK_CONNECTION: AiConnection = {
  providerId: DEFAULT_PROVIDER_ID,
  model: getProvider(DEFAULT_PROVIDER_ID).models[0] || 'openai',
}

export function loadConnection(): AiConnection | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<AiConnection>
    if (!isProviderId(parsed.providerId) || typeof parsed.model !== 'string' || !parsed.model) return null
    return {
      providerId: parsed.providerId,
      model: parsed.model,
      apiKey: typeof parsed.apiKey === 'string' && parsed.apiKey ? parsed.apiKey : undefined,
      baseUrl: typeof parsed.baseUrl === 'string' && parsed.baseUrl ? parsed.baseUrl : undefined,
    }
  } catch {
    return null
  }
}

export function saveConnection(connection: AiConnection): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(connection))
  } catch {
    /* gizli mod — seçim oturum boyunca geçerli olur */
  }
}

/**
 * Yerel Ollama kurulu mu? Kısa süreli, sessiz bir yoklama: uygulamanın açılışını
 * bekletmemek için süre sınırlı ve başarısızlık normal karşılanır.
 */
async function probeLocal(): Promise<string[] | null> {
  const base = getProvider(PREFERRED_LOCAL_ID).baseUrl
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), LOCAL_PROBE_MS)
  try {
    const res = await fetch(`${base}/api/tags`, { signal: ctrl.signal, cache: 'no-store' })
    if (!res.ok) return null
    const data = (await res.json()) as { models?: { name?: string; model?: string }[] }
    const list = Array.isArray(data.models) ? data.models : []
    const names: string[] = []
    for (let i = 0; i < list.length; i++) {
      const name = list[i].name || list[i].model
      if (typeof name === 'string' && name) names.push(name)
    }
    return names.length > 0 ? names : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Kullanılacak bağlantıyı belirler ve kaydeder. Her zaman bir bağlantı döner —
 * "bağlantı yok" diye bir durum yoktur; en kötü ihtimalle anahtarsız sağlayıcı.
 */
export async function resolveConnection(): Promise<{ connection: AiConnection; autoSelected: boolean }> {
  const saved = loadConnection()
  if (saved) return { connection: saved, autoSelected: false }

  const installed = await probeLocal()
  if (installed) {
    const model = pickModel(installed) || installed[0]
    const connection: AiConnection = { providerId: PREFERRED_LOCAL_ID, model }
    saveConnection(connection)
    return { connection, autoSelected: true }
  }

  saveConnection(FALLBACK_CONNECTION)
  return { connection: FALLBACK_CONNECTION, autoSelected: true }
}

/** Bağlantıyı sıfırlar — kullanıcı "varsayılana dön" dediğinde. */
export function clearConnection(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* yok sayılır */
  }
}

/** Anahtar gerekiyor ama girilmemiş mi? Arayüz bunu uyarı olarak gösterir. */
export function needsKey(connection: AiConnection): boolean {
  const provider = getProvider(connection.providerId)
  return provider.needsKey && !connection.apiKey
}
