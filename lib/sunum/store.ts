// Sunum kalıcılığı.
//
// Bu projede veritabanı yok; CV Stüdyosu ve ATS analizi gibi AI Sunum Stüdyosu da
// tamamen kullanıcının cihazında çalışır ("veriler cihazınızdan çıkmaz"). Bu yüzden
// depo localStorage üzerinedir. Ancak erişim `PresentationRepository` arayüzünden
// geçer: ileride bir API/veritabanı eklenirse UI'da tek satır değişir.
//
// Yerleşim:
//   sunum-studio:v1:index          → [{ id, title, updatedAt, ... }]  (liste ekranı için)
//   sunum-studio:v1:p:<id>         → tam sunum JSON'u
// Liste ayrı tutulur: 20 sunumu listelemek için 20 tam JSON'u ayrıştırmak gerekmez.

import { presentationSchema } from './schema'
import type { Audience, Presentation, SunumLang } from './types'
import type { ThemeId } from './themes'

const PREFIX = 'sunum-studio:v1'
const INDEX_KEY = `${PREFIX}:index`
const DOC_KEY = (id: string) => `${PREFIX}:p:${id}`

/** Cihazda tutulacak en fazla sunum — kota dolmasın diye en eskiler düşer. */
const MAX_STORED = 12

export type PresentationSummary = {
  id: string
  title: string
  slideCount: number
  audience: Audience
  durationMinutes: number
  theme: ThemeId
  language: SunumLang
  source: 'ai' | 'outline'
  updatedAt: string
}

export interface PresentationRepository {
  list(): PresentationSummary[]
  get(id: string): Presentation | null
  save(presentation: Presentation): SaveResult
  remove(id: string): void
}

export type SaveResult = { ok: true } | { ok: false; reason: 'quota' | 'unavailable' }

function summarize(p: Presentation): PresentationSummary {
  return {
    id: p.id,
    title: p.title,
    slideCount: p.slides.length,
    audience: p.audience,
    durationMinutes: p.durationMinutes,
    theme: p.theme,
    language: p.language,
    source: p.source,
    updatedAt: p.updatedAt,
  }
}

function readIndex(): PresentationSummary[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    // Liste yalnızca gösterim içindir; eksik alanlı kayıt listeden atılır.
    return parsed.filter((item): item is PresentationSummary => {
      const r = item as PresentationSummary | null
      return !!r && typeof r.id === 'string' && typeof r.title === 'string' && typeof r.updatedAt === 'string'
    })
  } catch {
    return []
  }
}

function writeIndex(list: PresentationSummary[]): void {
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(list))
  } catch {
    /* kota/gizli mod — liste güncellenemezse sunum yine kendi anahtarında durur */
  }
}

/** localStorage tabanlı depo. Sunucuda çağrılırsa boş liste/null döner, hata fırlatmaz. */
export const presentationStore: PresentationRepository = {
  list(): PresentationSummary[] {
    if (typeof localStorage === 'undefined') return []
    return readIndex().sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
  },

  get(id: string): Presentation | null {
    if (typeof localStorage === 'undefined' || !id) return null
    try {
      const raw = localStorage.getItem(DOC_KEY(id))
      if (!raw) return null
      // Eski sürüm ya da elle bozulmuş kayıt uygulamayı kırmasın: şemadan geçmeyen atılır.
      const parsed = presentationSchema.safeParse(JSON.parse(raw))
      if (!parsed.success) return null
      return parsed.data as Presentation
    } catch {
      return null
    }
  },

  save(presentation: Presentation): SaveResult {
    if (typeof localStorage === 'undefined') return { ok: false, reason: 'unavailable' }
    const doc: Presentation = { ...presentation, updatedAt: new Date().toISOString() }
    const payload = JSON.stringify(doc)

    const put = (): boolean => {
      try {
        localStorage.setItem(DOC_KEY(doc.id), payload)
        return true
      } catch {
        return false
      }
    }

    let stored = put()
    if (!stored) {
      // Kota doldu: en eski sunumları silip bir kez daha dene.
      const list = presentationStore.list()
      for (let i = list.length - 1; i >= 0 && !stored; i--) {
        if (list[i].id === doc.id) continue
        presentationStore.remove(list[i].id)
        stored = put()
      }
      if (!stored) return { ok: false, reason: 'quota' }
    }

    const next = readIndex().filter((s) => s.id !== doc.id)
    next.unshift(summarize(doc))
    // Sınırı aşan en eski kayıtların belgeleri de silinir (yörüngesiz veri kalmasın).
    const overflow = next.slice(MAX_STORED)
    for (let i = 0; i < overflow.length; i++) {
      try {
        localStorage.removeItem(DOC_KEY(overflow[i].id))
      } catch {
        /* yok sayılır */
      }
    }
    writeIndex(next.slice(0, MAX_STORED))
    return { ok: true }
  },

  remove(id: string): void {
    if (typeof localStorage === 'undefined' || !id) return
    try {
      localStorage.removeItem(DOC_KEY(id))
    } catch {
      /* yok sayılır */
    }
    writeIndex(readIndex().filter((s) => s.id !== id))
  },
}

/** Sunumu JSON olarak dışa aktarmak için (yedek). */
export function toBackupJson(p: Presentation): string {
  return JSON.stringify(p, null, 2)
}

/** Yedek JSON'u içe alır; geçersizse null döner. */
export function fromBackupJson(text: string): Presentation | null {
  try {
    const parsed = presentationSchema.safeParse(JSON.parse(text))
    return parsed.success ? (parsed.data as Presentation) : null
  } catch {
    return null
  }
}
