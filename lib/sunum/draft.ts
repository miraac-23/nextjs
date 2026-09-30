'use client'

// Açılış ekranı ile sihirbaz arasındaki devir.
//
// Kullanıcı /sunum'daki büyük girdiye konusunu yazıp "Sunum Oluştur" dediğinde
// bu niyet sessionStorage'a bırakılır ve sihirbaz onu alıp ilk adımı doldurur.
// Neden URL değil: yüklenen dosyadan çıkan metin on binlerce karakter olabiliyor,
// adres çubuğuna sığmaz. sessionStorage seçildi çünkü sekme kapanınca silinmeli —
// yarım kalmış bir niyet kalıcı olarak taşınmamalı.

import { isSourceMode, type Audience, type SourceMode } from './types'

const KEY = 'sunum-studio:intent'

export type DraftIntent = {
  topic: string
  sourceText?: string
  fileName?: string
  audience?: Audience
  /**
   * Açılış ekranındaki davranıştan çıkan girdi modu: dosya yükleyen kullanıcıya
   * sihirbazda "dosya mı metin mi?" diye yeniden sormak, verdiği cevabı yok
   * saymak olurdu.
   */
  sourceMode?: SourceMode
  /** Sihirbaz hangi adımdan başlasın? Konu doluysa hedef kitleye atlanır. */
  startStep?: number
}

export function saveIntent(intent: DraftIntent): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(intent))
  } catch {
    /* gizli mod — sihirbaz boş başlar, akış yine çalışır */
  }
}

/** Niyeti okur ve SİLER: geri tuşuyla dönüldüğünde tekrar uygulanmasın. */
export function takeIntent(): DraftIntent | null {
  if (typeof sessionStorage === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    sessionStorage.removeItem(KEY)
    const parsed = JSON.parse(raw) as Partial<DraftIntent>
    if (typeof parsed.topic !== 'string') return null
    return {
      topic: parsed.topic,
      sourceText: typeof parsed.sourceText === 'string' ? parsed.sourceText : undefined,
      fileName: typeof parsed.fileName === 'string' ? parsed.fileName : undefined,
      audience: parsed.audience,
      // Depolamadaki değer elle değiştirilmiş olabilir; tanınmayan mod sessizce
      // düşürülür ki sihirbaz varsayılanına dönsün.
      sourceMode: isSourceMode(parsed.sourceMode) ? parsed.sourceMode : undefined,
      startStep: typeof parsed.startStep === 'number' ? parsed.startStep : undefined,
    }
  } catch {
    return null
  }
}
