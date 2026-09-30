'use client'

/**
 * Slayt görseli alanı: önizleme + AI ile üretim + dosyadan yükleme.
 *
 * Tek sorumluluğu `data:` URL üretmek — dışarıya yalnızca `onChange` ile
 * gömülü görsel verir. Harici URL hiçbir koşulda yukarı taşınmaz; şema onu
 * zaten reddederdi ve bu bilinçli bir güvenlik sınırı (slayt, dışarıya istek
 * atan bir kaynak taşıyamaz).
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  IMAGE_STYLES,
  ImageAbortedError,
  ImageProviderError,
  ImageTooLargeError,
  fileToDataUrl,
  generateImage,
  type ImageStyle,
} from '@/lib/sunum/ai/images'
import { sunumText, type SunumText } from '@/lib/sunum/ui-text'
import Icon from './Icon'
import { Area, GhostButton, Label, Select } from './ui'

type Props = {
  t: SunumText
  value?: string
  onChange: (dataUrl: string | undefined) => void
  /** Slaytın başlığı/içeriğinden türeyen varsayılan istem. */
  suggest: string
}

/** Şemanın kabul ettiği türler — üretim JPEG, yükleme bunlardan biri olur. */
const ACCEPT = 'image/png,image/jpeg,image/webp,image/gif'

export default function MediaField({ t, value, onChange, suggest }: Props) {
  const m = t.media
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const [prompt, setPrompt] = useState('')
  const [style, setStyle] = useState<ImageStyle>('illustration')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // `SunumText` dil bilgisi taşımıyor; nesne kimliği tek güvenilir ipucu
  // (`sunumText` her iki dil için de aynı sabit nesneyi döndürüyor).
  const lang: 'tr' | 'en' = t === sunumText('tr') ? 'tr' : 'en'

  // Bileşen sökülürse süren üretim boşuna devam etmesin.
  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  /** Hata tipini kullanıcıya gösterilecek hazır etikete çevirir. */
  const describe = useCallback(
    (err: unknown): string | null => {
      if (err instanceof ImageAbortedError) return null // iptal bir hata değil
      if (err instanceof ImageTooLargeError) return m.tooLarge
      // Kota geçici bir durumdur; "bozuk" demek kullanıcıyı yanlış yönlendirir.
      if (err instanceof ImageProviderError) return err.status === 429 || err.status === 402 ? m.quota : m.failed
      return m.failed
    },
    [m],
  )

  const generate = useCallback(async () => {
    const controller = new AbortController()
    abortRef.current = controller
    setError(null)
    setBusy(true)
    try {
      // İstem boşsa slaytın kendi metni kullanılır (bkz. m.promptHint).
      const subject = prompt.trim() || suggest
      const dataUrl = await generateImage({ subject, style, lang }, controller.signal)
      onChange(dataUrl)
    } catch (err) {
      setError(describe(err))
    } finally {
      if (abortRef.current === controller) abortRef.current = null
      setBusy(false)
    }
  }, [describe, lang, onChange, prompt, style, suggest])

  const upload = useCallback(
    async (file: File | null) => {
      if (!file) return
      setError(null)
      setBusy(true)
      try {
        onChange(await fileToDataUrl(file))
      } catch (err) {
        setError(describe(err))
      } finally {
        setBusy(false)
        // Aynı dosya tekrar seçilebilsin diye alan sıfırlanır.
        if (inputRef.current) inputRef.current.value = ''
      }
    },
    [describe, onChange],
  )

  return (
    <div className="rounded-2xl border border-line/12 bg-surface/[0.03] p-3.5">
      <Label>{m.title}</Label>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => void upload(e.target.files?.[0] ?? null)}
      />

      {/* --------------------------- önizleme --------------------------- */}
      {value ? (
        <div className="mb-3 flex flex-col gap-2.5 sm:flex-row sm:items-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- gömülü data: URL, next/image gereksiz */}
          <img
            src={value}
            alt=""
            className="h-24 w-full rounded-xl border border-line/12 object-cover sm:h-16 sm:w-28"
          />
          <div className="flex flex-wrap gap-2">
            <GhostButton icon="upload" disabled={busy} onClick={() => inputRef.current?.click()}>
              {m.replace}
            </GhostButton>
            <GhostButton icon="trash" disabled={busy} onClick={() => onChange(undefined)}>
              {m.remove}
            </GhostButton>
          </div>
        </div>
      ) : null}

      {/* ---------------------------- üretim ---------------------------- */}
      <Area
        label={m.prompt}
        value={prompt}
        onChange={setPrompt}
        placeholder={suggest}
        hint={m.promptHint}
        rows={2}
        disabled={busy}
        maxLength={300}
      />

      <div className="mt-3">
        <Select<ImageStyle>
          label={m.style}
          value={style}
          onChange={setStyle}
          disabled={busy}
          options={IMAGE_STYLES.map((value_) => ({ value: value_, label: m.styles[value_] }))}
        />
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        {busy ? (
          <>
            <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-fg2">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
              {m.generating}
            </span>
            <GhostButton icon="x" onClick={() => abortRef.current?.abort()}>
              {t.wizard.cancel}
            </GhostButton>
          </>
        ) : (
          <>
            <button type="button" className="btn-primary w-full px-5 py-2.5 text-[13px] sm:w-auto" onClick={() => void generate()}>
              <Icon name="spark" />
              {m.aiGenerate}
            </button>
            <GhostButton icon="upload" onClick={() => inputRef.current?.click()}>
              {m.upload}
            </GhostButton>
          </>
        )}
      </div>

      {error ? <small className="mt-2 block text-xs text-rose-400">{error}</small> : null}

      {/* ---------------------------- uyarılar --------------------------- */}
      <div className="mt-3 space-y-1.5 border-t border-line/12 pt-3">
        {/* İstem harici bir servise gidiyor — kullanıcı bunu görmeden üretmemeli. */}
        <p className="flex items-start gap-1.5 text-xs leading-relaxed text-fg3">
          <span className="mt-px shrink-0 text-fg4">
            <Icon name="info" />
          </span>
          {m.provider}
        </p>
        <p className="flex items-start gap-1.5 text-xs leading-relaxed text-fg3">
          <span className="mt-px shrink-0 text-fg4">
            <Icon name="warn" />
          </span>
          {m.animatedNote}
        </p>
        <p className="text-xs text-fg4">{m.uploadHint}</p>
      </div>
    </div>
  )
}
