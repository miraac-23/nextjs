// Sunucu tarafı AI sağlayıcısı.
//
// GÜVENLİK: istemci yalnızca bir ÖN AYAR KİMLİĞİ gönderebilir; taban adres ya da
// API anahtarı gönderemez. Sunucu bu kimliği katalogda doğrular ve yalnızca
// ANAHTARSIZ sağlayıcıları çalıştırır (bkz. providers.ts → isServerAllowed).
// Böylece istemciden gelen bir adresle keyfi bir hedefe istek atılamaz (SSRF).
//
// Kimlik verilmezse ortam değişkeniyle yapılandırılmış Ollama kullanılır: kendi
// sunucusunda Ollama çalıştıran kurulumlar bu yolla hizmet verir.
//
// Örnekler modül kapsamında önbelleğe alınır ki içlerindeki üretim önbelleği
// rota çağrıları arasında yaşasın (§11: aynı içerik ikinci kez üretilmez).

import { OllamaProvider } from './ollama'
import { OpenAiChatProvider } from './openai-chat'
import { getProvider, isServerAllowed } from './providers'
import type { AiProvider } from './provider'

const instances = new Map<string, AiProvider>()

function ollamaFromEnv(model?: string): AiProvider {
  const temp = Number(process.env.SUNUM_AI_TEMP)
  return new OllamaProvider({
    baseUrl: process.env.OLLAMA_BASE_URL,
    model: model || process.env.SUNUM_AI_MODEL,
    temperature: Number.isFinite(temp) ? temp : undefined,
  })
}

/**
 * İstemcinin istediği sağlayıcıyı kurar. İzinli değilse ya da belirtilmemişse
 * ortam yapılandırmasındaki Ollama'ya düşülür.
 */
export function getAiProvider(providerId?: string, model?: string): AiProvider {
  if (!providerId || !isServerAllowed(providerId)) return cached('env:' + (model || ''), () => ollamaFromEnv(model))

  const info = getProvider(providerId)
  const chosen = model && model.length <= 120 ? model : info.models[0] || ''

  /*
   * Yerel servis izinli ama OpenAI uyumlu istemciyle KURULMAZ: Ollama'nın kendi
   * `/api/chat` ucu ve yapısal çıktı biçimi farklı. Ortam yapılandırmasındaki
   * Ollama gerçekleştirimi kullanılır; adres istemciden değil `OLLAMA_BASE_URL`
   * değerinden gelir.
   */
  if (info.kind === 'local') return cached('env:' + (chosen || ''), () => ollamaFromEnv(chosen))

  // Vercel AI Gateway anahtarı ortam değişkeninde: Vercel entegrasyonu projeye
  // kendisi ekliyor. Anahtar yoksa gateway kullanılamaz, ortam Ollama'sına düşülür.
  const gatewayKey = process.env.AI_GATEWAY_API_KEY || ''
  if (info.id === 'vercel' && !gatewayKey) return cached('env:' + (model || ''), () => ollamaFromEnv(model))

  return cached(`${info.id}:${chosen}`, () => {
    const temp = Number(process.env.SUNUM_AI_TEMP)
    return new OpenAiChatProvider({
      provider: info,
      model: chosen,
      apiKey: info.id === 'vercel' ? gatewayKey : undefined,
      temperature: Number.isFinite(temp) ? temp : undefined,
    })
  })
}

function cached(key: string, build: () => AiProvider): AiProvider {
  const existing = instances.get(key)
  if (existing) return existing
  const created = build()
  // Sınırsız büyümesin: farklı model adlarıyla gelen istekler haritayı şişirmesin.
  if (instances.size > 12) instances.clear()
  instances.set(key, created)
  return created
}
