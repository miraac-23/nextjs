'use client'

/**
 * Slaytı kapsayıcıya sığdırır.
 *
 * Slayt her zaman 1280 × 720 px olarak render edilir (bkz. app/sunum/sunum.css →
 * `.sn-slide`); burada yalnızca CSS transform ile ölçeklenir. Böylece tek bir
 * yerleşim hem 208 px'lik küçük resimde hem tam ekran sunum modunda birebir
 * aynı oranlarla görünür — ayrı "mobil şablon" gerekmez.
 *
 * Titreme uyarısı: ölçek kapsayıcı genişliğinden türer, kapsayıcı yüksekliği ise
 * `aspect-ratio` ile CSS tarafında sabitlenir. Yükseklik JS'ten yazılsaydı
 * ölçüm → yükseklik → kaydırma çubuğu → genişlik döngüsü salınıma girerdi.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react'

export const SLIDE_W = 1280
export const SLIDE_H = 720

type Props = {
  children: ReactNode
  /** Kâğıt gölgesi (küçük resimlerde kapalı). */
  shadow?: boolean
  className?: string
  /** Erişilebilirlik etiketi — küçük resimlerde buton sarmalayıcı verir. */
  label?: string
}

export default function SlideCanvas({ children, shadow = false, className, label }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const el = hostRef.current
    if (!el) return
    // Tam piksele yuvarla: yarım piksellik ölçüm gürültüsü yeni render tetiklemesin.
    const read = (w: number) => {
      const next = Math.floor(w)
      // 0 ise kapsayıcı o an gizlidir (sekme değişimi); son geçerli genişlik korunur.
      if (next > 0) setWidth((prev) => (prev === next ? prev : next))
    }
    const ro = new ResizeObserver((entries) => read(entries[0].contentRect.width))
    ro.observe(el)
    read(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  const scale = width > 0 ? width / SLIDE_W : 0

  return (
    <div
      ref={hostRef}
      className={`sn-fit${shadow ? ' sn-shadow' : ''}${className ? ' ' + className : ''}`}
      aria-label={label}
      role={label ? 'img' : undefined}
    >
      {scale > 0 && (
        <div
          className="sn-fit-scale"
          style={{ transform: `scale(${scale})`, width: SLIDE_W, height: SLIDE_H }}
        >
          {children}
        </div>
      )}
    </div>
  )
}
