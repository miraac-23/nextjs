// API rotaları için ortak koruma katmanı (§14).
//
// Üç kontrol, her AI/export rotasında aynı sırayla uygulanır:
//   1) Aynı köken (same-origin) — başka bir site bu uçları tarayıcıdan çağıramaz.
//   2) İsteğe bağlı paylaşılan anahtar — SUNUM_API_TOKEN tanımlıysa zorunlu olur.
//      (Projede kullanıcı hesabı yok; kendi kurulumunda uçları kapatmak isteyen
//       kişi bu değişkeni tanımlar. Tanımsızken yerel geliştirme engellenmez.)
//   3) Hız sınırı — IP başına kayan pencere.
//
// Hız sınırı süreç içi bellektedir: tek örnek (single instance) ya da yerel
// çalıştırmada doğru davranır. Çok örnekli bir dağıtımda paylaşımlı bir sayaç
// (Redis vb.) gerekir; bu sınır bilinçli olarak kabul edilmiştir çünkü AI ucu
// zaten kullanıcının kendi makinesindeki Ollama'ya bağlanıyor.

export type GuardBucket = 'generate' | 'refine' | 'export'

const LIMITS: Record<GuardBucket, { max: number; windowMs: number }> = {
  generate: { max: 12, windowMs: 10 * 60 * 1000 },
  refine: { max: 60, windowMs: 10 * 60 * 1000 },
  export: { max: 40, windowMs: 10 * 60 * 1000 },
}

/** İstek gövdesi üst sınırı — şişirilmiş JSON ayrıştırılmadan reddedilir. */
export const MAX_BODY_BYTES = 1_500_000

type Hit = { count: number; resetAt: number }
const buckets = new Map<string, Hit>()

/** Pencere dolduğunda kayıtları temizler; harita sınırsız büyümesin. */
function sweep(now: number): void {
  if (buckets.size < 500) return
  const keys = Array.from(buckets.keys())
  for (let i = 0; i < keys.length; i++) {
    const hit = buckets.get(keys[i])
    if (hit && hit.resetAt <= now) buckets.delete(keys[i])
  }
}

function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return req.headers.get('x-real-ip') || 'local'
}

export type GuardFailure = { status: number; code: string; message: string }

/** Hız sınırı kontrolü. Sınır aşıldıysa hata nesnesi, aksi halde null döner. */
export function checkRateLimit(req: Request, bucket: GuardBucket): GuardFailure | null {
  const { max, windowMs } = LIMITS[bucket]
  const key = `${bucket}:${clientIp(req)}`
  const now = Date.now()
  sweep(now)

  const hit = buckets.get(key)
  if (!hit || hit.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return null
  }
  hit.count++
  if (hit.count > max) {
    const seconds = Math.ceil((hit.resetAt - now) / 1000)
    return {
      status: 429,
      code: 'rate-limited',
      message: `Çok fazla istek. ${seconds} saniye sonra tekrar deneyin.`,
    }
  }
  return null
}

/** İstek bu siteden mi geliyor? (Origin yoksa — sunucu-sunucu çağrısı — engellenmez.) */
function checkOrigin(req: Request): GuardFailure | null {
  const origin = req.headers.get('origin')
  if (!origin) return null
  const host = req.headers.get('host')
  try {
    if (host && new URL(origin).host === host) return null
  } catch {
    /* bozuk Origin başlığı → reddet */
  }
  return { status: 403, code: 'forbidden', message: 'İstek bu siteden gelmiyor.' }
}

/** SUNUM_API_TOKEN tanımlıysa Authorization: Bearer <token> zorunludur. */
function checkToken(req: Request): GuardFailure | null {
  const expected = process.env.SUNUM_API_TOKEN
  if (!expected) return null
  const header = req.headers.get('authorization') || ''
  const token = header.toLowerCase().indexOf('bearer ') === 0 ? header.slice(7).trim() : ''
  if (token && safeEqual(token, expected)) return null
  return { status: 401, code: 'unauthorized', message: 'Geçersiz ya da eksik API anahtarı.' }
}

/** Uzunluk sızdırmayan karşılaştırma (anahtar doğrulaması için). */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/** Üç kontrolü sırayla uygular. İlk başarısız olan döner. */
export function guard(req: Request, bucket: GuardBucket): GuardFailure | null {
  return checkOrigin(req) || checkToken(req) || checkRateLimit(req, bucket)
}

/** Gövdeyi boyut sınırıyla okur ve JSON'a çevirir. */
export async function readJsonBody(req: Request): Promise<{ ok: true; value: unknown } | { ok: false; failure: GuardFailure }> {
  const declared = req.headers.get('content-length')
  if (declared && Number(declared) > MAX_BODY_BYTES) {
    return { ok: false, failure: { status: 413, code: 'too-large', message: 'İstek gövdesi çok büyük.' } }
  }
  const text = await req.text().catch(() => '')
  if (text.length > MAX_BODY_BYTES) {
    return { ok: false, failure: { status: 413, code: 'too-large', message: 'İstek gövdesi çok büyük.' } }
  }
  try {
    return { ok: true, value: JSON.parse(text) as unknown }
  } catch {
    return { ok: false, failure: { status: 400, code: 'bad-request', message: 'Gövde geçerli JSON değil.' } }
  }
}

export function failureResponse(failure: GuardFailure): Response {
  return Response.json({ ok: false, code: failure.code, message: failure.message }, { status: failure.status })
}
