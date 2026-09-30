'use client'

/**
 * Slayt görselinin tarayıcıdan düzenlenmesi.
 *
 * `MediaField` yalnızca `data:` URL üretir (AI ya da dosya); bu bileşen onun
 * üstüne görselin SLAYTTAKİ davranışını koyar: yerleşim, çerçeveye oturma,
 * odak noktası ve yakınlaştırma.
 *
 * Odak ve yakınlaştırma doğrudan MANİPÜLASYONLA ayarlanır — kullanıcı görseli
 * sürükler. Sayı kutusuna "%42" yazmak kimsenin istediği şey değil; kırpmayı
 * gözle görerek ayarlamak PowerPoint'te de böyle çalışıyor.
 */

import { useCallback, useRef, useState } from 'react'
import {
  DEFAULT_MEDIA_PLACEMENT,
  MEDIA_FITS,
  MEDIA_PLACEMENTS,
  type MediaFit,
  type MediaPlacement,
  type SlideMedia,
} from '@/lib/sunum/types'
import type { SunumText } from '@/lib/sunum/ui-text'
import Icon from './Icon'
import MediaField from './MediaField'
import { Field, Label } from './ui'

type Props = {
  t: SunumText
  value?: SlideMedia
  onChange: (media: SlideMedia | undefined) => void
  /** Slaytın başlığı/içeriğinden türeyen varsayılan istem. */
  suggest: string
}

const ZOOM_MIN = 1
const ZOOM_MAX = 4
const ZOOM_STEP = 0.1

/** Yeni bir görsel eklendiğinde kullanılan tarafsız başlangıç değerleri. */
function withDefaults(src: string, previous?: SlideMedia): SlideMedia {
  return {
    src,
    placement: previous?.placement ?? DEFAULT_MEDIA_PLACEMENT,
    fit: previous?.fit ?? 'cover',
    focusX: previous?.focusX ?? 50,
    focusY: previous?.focusY ?? 50,
    zoom: previous?.zoom ?? 1,
    alt: previous?.alt,
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export default function SlideMediaEditor({ t, value, onChange, suggest }: Props) {
  const m = t.media
  const frameRef = useRef<HTMLDivElement>(null)
  /** Sürükleme başlangıcı: fare konumu ve o andaki odak. */
  const dragRef = useRef<{ x: number; y: number; fx: number; fy: number } | null>(null)
  const [dragging, setDragging] = useState(false)

  const patch = useCallback(
    (next: Partial<SlideMedia>) => {
      if (!value) return
      onChange({ ...value, ...next })
    },
    [value, onChange],
  )

  const onSrc = useCallback(
    (src: string | undefined) => {
      if (!src) {
        onChange(undefined)
        return
      }
      onChange(withDefaults(src, value))
    },
    [value, onChange],
  )

  /*
   * Sürükleme: 1 px fare hareketi, görselin çerçeveye göre fazlalığı kadar odak
   * değiştirir. Yakınlaştırma arttıkça aynı hareket daha az oynatır — böylece
   * hassas ayar mümkün oluyor.
   */
  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!value) return
      e.currentTarget.setPointerCapture(e.pointerId)
      dragRef.current = { x: e.clientX, y: e.clientY, fx: value.focusX, fy: value.focusY }
      setDragging(true)
    },
    [value],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const start = dragRef.current
      const box = frameRef.current
      if (!start || !box || !value) return
      const rect = box.getBoundingClientRect()
      // Yüzdelik odak: kutunun genişliği %100'e karşılık gelir.
      const dx = ((e.clientX - start.x) / Math.max(1, rect.width)) * 100
      const dy = ((e.clientY - start.y) / Math.max(1, rect.height)) * 100
      patch({
        focusX: Math.round(clamp(start.fx - dx, 0, 100)),
        focusY: Math.round(clamp(start.fy - dy, 0, 100)),
      })
    },
    [value, patch],
  )

  const endDrag = useCallback(() => {
    dragRef.current = null
    setDragging(false)
  }, [])

  const onWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      if (!value) return
      // Sayfanın kaymasını engelle: tekerlek burada yakınlaştırma demek.
      e.preventDefault()
      patch({ zoom: Number(clamp(value.zoom + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP), ZOOM_MIN, ZOOM_MAX).toFixed(2)) })
    },
    [value, patch],
  )

  return (
    <div className="space-y-3">
      <MediaField t={t} value={value?.src} onChange={onSrc} suggest={suggest} />

      {value ? (
        <div className="space-y-3 rounded-2xl border border-line/12 bg-surface/[0.03] p-3">
          {/* ------------------------------ yerleşim ------------------------------ */}
          <div>
            <Label hint={m.placementHints[value.placement]}>{m.placement}</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {MEDIA_PLACEMENTS.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={value.placement === option}
                  onClick={() => patch({ placement: option as MediaPlacement })}
                  className={`rounded-lg border px-2 py-1.5 text-[11.5px] font-semibold transition-colors ${
                    value.placement === option
                      ? 'border-accent/60 bg-accent/10 text-accent-soft'
                      : 'border-line/12 text-fg3 hover:border-accent/40'
                  }`}
                >
                  {m.placements[option]}
                </button>
              ))}
            </div>
          </div>

          {/* -------------------------- çerçeveye oturma -------------------------- */}
          <div>
            <Label>{m.fit}</Label>
            <div className="flex gap-1 rounded-xl border border-line/10 bg-surface/5 p-1">
              {MEDIA_FITS.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={value.fit === option}
                  onClick={() => patch({ fit: option as MediaFit })}
                  className={`flex-1 rounded-lg px-2 py-1.5 text-[11.5px] font-semibold transition-colors ${
                    value.fit === option ? 'bg-accent/15 text-accent-soft' : 'text-fg3 hover:text-fg2'
                  }`}
                >
                  {m.fits[option]}
                </button>
              ))}
            </div>
          </div>

          {/* ----------------------- doğrudan konumlandırma ----------------------- */}
          <div>
            <Label hint={m.frameHint}>{m.frame}</Label>
            <div
              ref={frameRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onWheel={onWheel}
              role="application"
              aria-label={m.frame}
              className={`relative h-28 overflow-hidden rounded-xl border border-line/12 ${
                dragging ? 'cursor-grabbing' : 'cursor-grab'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- data: URL */}
              <img
                src={value.src}
                alt=""
                draggable={false}
                className="pointer-events-none h-full w-full select-none"
                style={{
                  objectFit: value.fit,
                  objectPosition: `${value.focusX}% ${value.focusY}%`,
                  transform: value.zoom > 1 ? `scale(${value.zoom})` : undefined,
                }}
              />
            </div>

            <div className="mt-2 flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-fg4">{m.zoom}</span>
              <input
                type="range"
                min={ZOOM_MIN}
                max={ZOOM_MAX}
                step={ZOOM_STEP}
                value={value.zoom}
                aria-label={m.zoom}
                onChange={(e) => patch({ zoom: Number(e.target.value) })}
                className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-line/20 accent-accent"
              />
              <span className="w-10 text-right text-[11px] tabular-nums text-fg3">{value.zoom.toFixed(1)}×</span>
              <button
                type="button"
                onClick={() => patch({ focusX: 50, focusY: 50, zoom: 1 })}
                title={m.reset}
                aria-label={m.reset}
                className="grid h-7 w-7 place-items-center rounded-lg border border-line/12 text-fg3 transition-colors hover:border-accent/50 hover:text-accent-soft"
              >
                <Icon name="refresh" className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <Field
            label={m.altLabel}
            value={value.alt ?? ''}
            onChange={(alt) => patch({ alt: alt || undefined })}
            hint={m.altHint}
          />
        </div>
      ) : null}
    </div>
  )
}
