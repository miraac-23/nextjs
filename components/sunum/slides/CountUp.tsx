'use client'

/**
 * Büyük sayıları 0'dan hedefe sayar (§16).
 *
 * Yalnızca sunum modunda ve üretim önizlemesinde çalışır. Sayı dışındaki
 * karakterler (ön ek "%", son ek "dk", "+") olduğu gibi korunur: "45 dk" →
 * sayan kısım 45, geri kalanı sabit. Sayı bulunamazsa metin aynen basılır.
 *
 * `prefers-reduced-motion` açıkken hiç animasyon yapılmaz — hemen son değer.
 */

import { useEffect, useRef, useState } from 'react'

const DURATION_MS = 900

/** "%38,5 oran" → { prefix: '%', value: 38.5, decimals: 1, suffix: ' oran' } */
function split(text: string): { prefix: string; value: number; decimals: number; suffix: string } | null {
  const match = text.match(/-?\d+(?:[.,]\d+)?/)
  if (!match || match.index === undefined) return null
  const raw = match[0]
  const value = Number(raw.replace(',', '.'))
  if (!Number.isFinite(value)) return null
  const dot = raw.search(/[.,]/)
  return {
    prefix: text.slice(0, match.index),
    value,
    decimals: dot < 0 ? 0 : raw.length - dot - 1,
    suffix: text.slice(match.index + raw.length),
  }
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export default function CountUp({ text, active }: { text: string; active: boolean }) {
  const parts = split(text)
  const target = parts ? parts.value : 0
  const [value, setValue] = useState(target)
  const frameRef = useRef(0)

  useEffect(() => {
    if (!active || !parts || prefersReducedMotion()) {
      setValue(target)
      return
    }

    const start = performance.now()
    setValue(0)

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION_MS)
      // easeOutCubic: hızlı başlayıp yumuşak duran sayaç.
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(target * eased)
      if (t < 1) frameRef.current = requestAnimationFrame(tick)
    }

    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
    // `parts` her render'da yeniden üretiliyor; bağımlılık hedef değer ve durum.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, target, text])

  if (!parts) return <>{text}</>

  return (
    <>
      {parts.prefix}
      {value.toFixed(parts.decimals)}
      {parts.suffix}
    </>
  )
}
