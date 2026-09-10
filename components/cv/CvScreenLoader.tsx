'use client'

/**
 * Açılış ekranı. Uygulama tarayıcıda ilk kez kurulurken (localStorage okuma,
 * yazı tipi yerleşimi, şablon ölçekleme) gösterilir; kurumsal bir araca girmiş
 * hissi vermek için belge işaretini çizerek ilerler.
 *
 * İlerleme çubuğu gerçek bir yükleme yüzdesini değil, hazırlık adımlarını
 * temsil eder; `onDone` yalnızca animasyon bittiğinde çağrılır, veri okuma
 * bundan bağımsız olarak zaten tamamlanmıştır.
 */

import { useEffect, useRef, useState } from 'react'

type Props = {
  brand: string
  lines: string[]
  ready: string
  onDone: () => void
}

export default function CvScreenLoader({ brand, lines, ready, onDone }: Props) {
  const [pct, setPct] = useState(6)
  const [leaving, setLeaving] = useState(false)
  const done = useRef(false)

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const total = reduce ? 500 : 1900
    const started = performance.now()

    // İlerleme zamandan hesaplanır ve zamanlayıcıyla sürülür — requestAnimationFrame
    // arka plan sekmesinde HİÇ çalışmaz; onunla sürülseydi sekmeyi yeni sekmede açan
    // kullanıcı donmuş bir yükleme ekranıyla karşılaşırdı.
    const tick = () => {
      const elapsed = performance.now() - started
      // Hızlı başlayıp sona doğru yavaşlayan eğri — "iş yapılıyor" hissi verir.
      const p = Math.min(1, elapsed / total)
      setPct(Math.round(6 + 94 * (1 - Math.pow(1 - p, 2.2))))
      if (p < 1 || done.current) return
      done.current = true
      window.clearInterval(timer)
      setLeaving(true)
      window.setTimeout(onDone, reduce ? 60 : 520)
    }

    const timer = window.setInterval(tick, 50)
    tick()
    return () => window.clearInterval(timer)
  }, [onDone])

  const step = Math.min(lines.length - 1, Math.floor((pct / 100) * lines.length))
  const label = pct >= 99 ? ready : lines[step]

  return (
    <div className="cvs-loader" data-leaving={leaving} role="status" aria-live="polite">
      <div className="cvs-loader-bg" aria-hidden="true" />

      <div className="cvs-loader-inner">
        <div className="cvs-mark" aria-hidden="true">
          <span className="halo" />
          <svg viewBox="0 0 64 64">
            {/* köşesi kıvrık bir belge — tek geçişte çizilir */}
            <path className="sheet" d="M14 6h24l12 12v40H14z" />
            <path className="rule" d="M22 28h20" />
            <path className="rule" d="M22 36h20" />
            <path className="rule" d="M22 44h13" />
            <path className="rule" d="M38 6v12h12" />
          </svg>
        </div>

        <div className="cvs-loader-brand">{brand}</div>

        <div className="cvs-loader-track">
          <div className="cvs-loader-fill" style={{ width: `${pct}%` }} />
        </div>

        <div className="cvs-loader-status">
          <span key={label}>{label}</span>
          <b>{pct}%</b>
        </div>
      </div>
    </div>
  )
}
