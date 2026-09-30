'use client'

// Kalite kontrolünün tarayıcı tarafı.
//
// Varsayılan YEREL motordur: hiçbir ağ çağrısı yapılmaz, slayt metni cihazdan
// çıkmaz, sonuç anında gelir. Kullanıcı "derin analiz"i açıkça açarsa Jev
// devreye girer — o zaman slayt metni /api/decide üzerinden TypeSafe AI'ya
// gider. Bu tercih kullanıcıda ve kalıcıdır.

import type { Presentation } from '../types'
import { localAnswers } from './local'
import { assessDeck, type DeckAssessment } from './quality'
import { buildBatches } from './questions'
import type { Answer } from './types'

const PREF_KEY = 'sunum-studio:deep-check'

export type JevStatus = {
  /** Sunucuda bir karar motoru anahtarı tanımlı mı? */
  available: boolean
  /** Hangi motor: doğrulanmış Jev mi, gateway üzerinden bir sohbet modeli mi? */
  source: 'jev' | 'gateway' | null
  model: string
}

/** Kullanıcı derin analizi açtı mı? Varsayılan kapalı (gizlilik). */
export function deepCheckEnabled(): boolean {
  if (typeof localStorage === 'undefined') return false
  try {
    return localStorage.getItem(PREF_KEY) === '1'
  } catch {
    return false
  }
}

export function setDeepCheck(enabled: boolean): void {
  try {
    localStorage.setItem(PREF_KEY, enabled ? '1' : '0')
  } catch {
    /* gizli mod — tercih kaydedilemezse oturum boyunca geçerli olur */
  }
}

/** Jev bu kurulumda var mı? Anahtar sunucuda olduğu için tarayıcı soramaz, sorar. */
export async function probeJev(signal?: AbortSignal): Promise<JevStatus> {
  try {
    const res = await fetch('/api/decide', { signal, cache: 'no-store' })
    if (!res.ok) return { available: false, source: null, model: '' }
    const data = (await res.json()) as Partial<JevStatus>
    return {
      available: data.available === true,
      source: data.source === 'jev' || data.source === 'gateway' ? data.source : null,
      model: typeof data.model === 'string' ? data.model : '',
    }
  } catch {
    return { available: false, source: null, model: '' }
  }
}

/**
 * Desteyi değerlendirir.
 *
 * `deep` true ise Jev denenir; herhangi bir aksilikte (anahtar yok, hız sınırı,
 * ağ) SESSİZCE yerel motora düşer — kalite kontrolü kullanıcının akışını
 * kesmemeli. Raporda hangi motorun kullanıldığı her zaman yazar.
 */
export async function assess(
  presentation: Presentation,
  options: { deep?: boolean; signal?: AbortSignal } = {},
): Promise<DeckAssessment> {
  if (options.deep) {
    const result = await askRemote(presentation, options.signal)
    if (result) return assessDeck(presentation, result.answers, result.source)
  }
  return assessDeck(presentation, localAnswers(presentation), 'local')
}

async function askRemote(
  presentation: Presentation,
  signal?: AbortSignal,
): Promise<{ answers: Record<string, Answer>; source: 'jev' | 'gateway' } | null> {
  try {
    const batches = buildBatches(presentation).map(({ state, questions }) => ({ state, questions }))
    if (batches.length === 0) return null
    const res = await fetch('/api/decide', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ batches }),
      signal,
    })
    if (!res.ok) return null
    const data = (await res.json()) as {
      ok?: boolean
      answers?: Record<string, Answer>
      source?: string
    }
    if (!data.ok || !data.answers || Object.keys(data.answers).length === 0) return null
    return { answers: data.answers, source: data.source === 'gateway' ? 'gateway' : 'jev' }
  } catch {
    return null
  }
}
