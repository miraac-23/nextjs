// GET /api/ai/health — Ollama ayakta mı, model kurulu mu?
//
// Tarayıcı bu ucu "sunucu yolu çalışıyor mu" sorusunu yanıtlamak için kullanır;
// yanıt olumsuzsa doğrudan bağlantıya geçer (bkz. lib/sunum/ai/client.ts).
// Sağlık kontrolü ucuz olduğu için hız sınırı uygulanmaz, ama aynı köken şartı vardır.

import { getAiProvider } from '@/lib/sunum/ai/server'
import { failureResponse, guard } from '@/lib/sunum/api-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request): Promise<Response> {
  const failure = guard(req, 'refine')
  if (failure) return failureResponse(failure)

  // İstemci yalnızca ön ayar KİMLİĞİ gönderebilir; adres ve anahtar sunucuda kalır.
  const params = new URL(req.url).searchParams
  const health = await getAiProvider(params.get('provider') || undefined, params.get('model') || undefined).health()
  return Response.json(health, {
    status: 200,
    headers: { 'cache-control': 'no-store' },
  })
}
