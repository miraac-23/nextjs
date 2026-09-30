// Akış hâlindeki JSON'dan tamamlanmış slaytları çıkarır.
//
// Neden gerekli: üretim ekranı sahte bir ilerleme çubuğu göstermemeli (§7).
// Ollama `stream: true` ile yanıtı parça parça yolluyor; bu ayrıştırıcı biriken
// metni her parçadan sonra tarayıp `slides` dizisinde KAPANMIŞ nesneleri
// yakalıyor. Böylece kullanıcı slaytlar yazıldıkça küçük önizlemelerini görüyor.
//
// Tasarım: ayrıştırıcı durum tutar ama metni kendisi biriktirmez — çağıran taraf
// biriken tam metni verir, ayrıştırıcı yalnızca "kaçıncı slayta kadar yayımladım"
// bilgisini saklar. Bu, kısmi/çift gelen parçalara karşı dayanıklı.

export type StreamMeta = { title?: string; subtitle?: string }

/** Metindeki `key` alanının tamamlanmış dize değerini döndürür (yoksa undefined). */
function readString(text: string, key: string): string | undefined {
  const needle = `"${key}"`
  const at = text.indexOf(needle)
  if (at < 0) return undefined
  let i = at + needle.length
  while (i < text.length && (text[i] === ' ' || text[i] === ':' || text[i] === '\n' || text[i] === '\r')) i++
  if (text[i] !== '"') return undefined
  i++
  let out = ''
  let escaped = false
  for (; i < text.length; i++) {
    const ch = text[i]
    if (escaped) {
      out += ch === 'n' ? '\n' : ch === 't' ? '\t' : ch
      escaped = false
      continue
    }
    if (ch === '\\') {
      escaped = true
      continue
    }
    // Kapanış tırnağı görülmediyse değer hâlâ yazılıyor demektir.
    if (ch === '"') return out
    out += ch
  }
  return undefined
}

export class SlideStreamParser {
  /** Şimdiye kadar yayımlanan slayt sayısı. */
  private emitted = 0
  private metaSent = false

  /** Başlık ve alt başlık tamamlandıysa bir kez döndürür. */
  readMeta(text: string): StreamMeta | null {
    if (this.metaSent) return null
    const title = readString(text, 'title')
    if (!title) return null
    // `slides` başladıysa üst düzey alanlar kesinlikle tamamlanmıştır.
    const started = text.indexOf('"slides"') >= 0
    if (!started) return null
    this.metaSent = true
    return { title, subtitle: readString(text, 'subtitle') }
  }

  /**
   * Biriken metindeki YENİ tamamlanmış slayt nesnelerini döndürür.
   * Aynı nesne iki kez döndürülmez.
   */
  readSlides(text: string): unknown[] {
    const arrayStart = this.slidesArrayStart(text)
    if (arrayStart < 0) return []

    const out: unknown[] = []
    let depth = 0
    let objectStart = -1
    let inString = false
    let escaped = false
    let seen = 0

    for (let i = arrayStart; i < text.length; i++) {
      const ch = text[i]

      if (inString) {
        if (escaped) escaped = false
        else if (ch === '\\') escaped = true
        else if (ch === '"') inString = false
        continue
      }

      if (ch === '"') {
        inString = true
        continue
      }
      if (ch === '{') {
        if (depth === 0) objectStart = i
        depth++
        continue
      }
      if (ch === '}') {
        depth--
        if (depth === 0 && objectStart >= 0) {
          seen++
          if (seen > this.emitted) {
            const parsed = tryParse(text.slice(objectStart, i + 1))
            if (parsed !== undefined) out.push(parsed)
            // Ayrıştırılamasa bile sayacı ilerlet: bozuk bir nesne akışı kilitlemesin.
            this.emitted = seen
          }
          objectStart = -1
        }
        continue
      }
      // Dizi kapandıysa tarama biter.
      if (ch === ']' && depth === 0) break
    }

    return out
  }

  /** `"slides"` alanının açılış köşeli parantezinden sonraki konum. */
  private slidesArrayStart(text: string): number {
    const at = text.indexOf('"slides"')
    if (at < 0) return -1
    const bracket = text.indexOf('[', at)
    return bracket < 0 ? -1 : bracket + 1
  }
}

function tryParse(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

/**
 * Ollama'nın NDJSON akışını satır satır okur ve her parçanın `message.content`
 * alanını verir. Akış sonunda `done: true` gelir.
 */
export async function* readOllamaStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<{ chunk: string; done: boolean }> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      let newline = buffer.indexOf('\n')
      while (newline >= 0) {
        const line = buffer.slice(0, newline).trim()
        buffer = buffer.slice(newline + 1)
        newline = buffer.indexOf('\n')
        if (!line) continue
        try {
          const parsed = JSON.parse(line) as { message?: { content?: unknown }; done?: unknown }
          const content = parsed?.message?.content
          yield { chunk: typeof content === 'string' ? content : '', done: parsed?.done === true }
        } catch {
          // Yarım satır: bir sonraki turda tamamlanacak.
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

/**
 * Kesilmiş (truncated) yanıttan taslak kurtarır.
 *
 * Bazı ücretsiz sağlayıcılar çıktıyı sabit bir token bütçesinde kesiyor; JSON
 * yarıda kalıyor ve `JSON.parse` başarısız oluyor. Bu durumda yanıtı çöpe atmak
 * yerine TAMAMLANMIŞ slayt nesnelerini toplayıp yarım kalan kuyruğu atıyoruz —
 * kullanıcı 6 slayt yerine 4 slayt alır ama boş ekranla kalmaz.
 *
 * En az iki slayt kurtarılamazsa `null` döner; o zaman çağıran taraf normal
 * hata yoluna (ve gerekirse yerel taslağa) düşer.
 */
export function salvageDraft(text: string): { title?: string; subtitle?: string; slides: unknown[] } | null {
  const parser = new SlideStreamParser()
  const slides = parser.readSlides(text)
  if (slides.length < 2) return null
  return {
    title: readString(text, 'title'),
    subtitle: readString(text, 'subtitle'),
    slides,
  }
}

/**
 * Kesilmiş TEK bir JSON nesnesini onarır.
 *
 * `salvageDraft` bir slayt DİZİSİNDEN tamamlanmış öğeleri toplar; bu ise tek bir
 * nesne kesildiğinde işe yarar (konudan slayt üretimi böyle).
 *
 * Yöntem: küçük bir durum makinesiyle metni tarar ve "buraya kadar TAM bir DEĞER
 * bitti" noktalarını işaretler. Anahtar ile değer ayırt edilir — aksi hâlde
 * `{"label":"2024"` gibi yarım bir nesne tam sayılıp değeri eksik bir öğe
 * üretiliyordu. Sonra yarım kuyruk atılır ve o noktadaki açık parantezler kapatılır.
 *
 * Örnek: `{"chart":{"points":[{"label":"2023","value":12},{"label":"2024","`
 *     → `{"chart":{"points":[{"label":"2023","value":12}]}}`
 *
 * Onarılamazsa `null` döner.
 */
export function repairTruncatedJson(text: string): unknown {
  const start = text.indexOf('{')
  if (start < 0) return null

  /** Açık kapsayıcılar. Nesnelerde sıradaki dizenin anahtar mı değer mi olduğu tutulur. */
  type Frame = { close: '}' | ']'; expectKey: boolean }
  const stack: Frame[] = []

  let inString = false
  let escaped = false
  /** Sayı/true/false/null okunuyor mu? Bitişi ayırıcıda anlaşılır. */
  let inScalar = false

  let safeIndex = -1
  let safeStack: Frame[] = []

  /** Tam bir DEĞER bitti: buradan kesip kapatmak geçerli JSON verir. */
  const markValueEnd = (index: number) => {
    safeIndex = index
    safeStack = stack.map((f) => ({ ...f }))
  }

  const top = (): Frame | undefined => stack[stack.length - 1]

  for (let i = start; i < text.length; i++) {
    const ch = text[i]

    if (inString) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === '"') {
        inString = false
        const frame = top()
        // Nesne içinde anahtar bekleniyorduysa bu bir ANAHTAR: güvenli nokta değil.
        const wasKey = !!frame && frame.close === '}' && frame.expectKey
        if (frame && frame.close === '}') frame.expectKey = false
        if (!wasKey) markValueEnd(i + 1)
      }
      continue
    }

    if (inScalar) {
      // Sayı/sabit ancak bir ayırıcıyla biter.
      if (ch === ',' || ch === '}' || ch === ']' || ch === ' ' || ch === '\n' || ch === '\r' || ch === '\t') {
        inScalar = false
        markValueEnd(i)
      } else {
        continue
      }
    }

    if (ch === '"') {
      inString = true
      continue
    }
    if (ch === '{' || ch === ']' || ch === '[' || ch === '}') {
      if (ch === '{') {
        stack.push({ close: '}', expectKey: true })
      } else if (ch === '[') {
        stack.push({ close: ']', expectKey: false })
      } else {
        stack.pop()
        markValueEnd(i + 1)
        if (stack.length === 0) {
          // Nesne zaten tam.
          try {
            return JSON.parse(text.slice(start, i + 1))
          } catch {
            return null
          }
        }
      }
      continue
    }
    if (ch === ':') {
      const frame = top()
      if (frame && frame.close === '}') frame.expectKey = false
      continue
    }
    if (ch === ',') {
      const frame = top()
      if (frame && frame.close === '}') frame.expectKey = true
      continue
    }
    // Sayı ya da true/false/null başlangıcı.
    if (ch !== ' ' && ch !== '\n' && ch !== '\r' && ch !== '\t') inScalar = true
  }

  if (safeIndex <= start) return null

  // `markValueEnd` yalnızca TAM bir değerin bittiği yeri işaretler; oradan kesip
  // açık parantezleri kapatmak her zaman geçerli JSON verir. Ek bir metin
  // temizliği yapılmaz — regexle kuyruk kırpmak geçerli bir değeri de siliyordu.
  let body = text.slice(start, safeIndex).replace(/[\s,]+$/, '')
  for (let i = safeStack.length - 1; i >= 0; i--) body += safeStack[i].close

  try {
    return JSON.parse(body)
  } catch {
    return null
  }
}

/* ============================ sunucu-gönderimli olaylar ============================ */

export type SseEvent = { event: string; data: string }

/** `text/event-stream` gövdesini olay olay okur. */
export async function* readSse(body: ReadableStream<Uint8Array>): AsyncGenerator<SseEvent> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      // Olaylar boş satırla ayrılır.
      let split = buffer.indexOf('\n\n')
      while (split >= 0) {
        const raw = buffer.slice(0, split)
        buffer = buffer.slice(split + 2)
        split = buffer.indexOf('\n\n')

        let event = 'message'
        const dataLines: string[] = []
        const lines = raw.split('\n')
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]
          if (line.indexOf('event:') === 0) event = line.slice(6).trim()
          else if (line.indexOf('data:') === 0) dataLines.push(line.slice(5).trim())
        }
        if (dataLines.length > 0) yield { event, data: dataLines.join('\n') }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

/** Tek bir SSE olayını tel biçimine çevirir. */
export function sseFrame(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}
