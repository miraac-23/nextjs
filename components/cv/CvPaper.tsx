'use client'

/**
 * Belgeyi kâğıt olarak sahneler: gerçek boyutunda (mm) render edilen `.cv-doc`
 * düğümünü kapsayıcıya sığacak şekilde CSS transform ile küçültür.
 *
 * Transform yerleşimi etkilemediği için dış kutunun yüksekliği elle hesaplanır;
 * aksi halde kaydırma alanı yanlış olur. Sayfa sınırları kesik çizgiyle
 * gösterilir, böylece kullanıcı PDF'in kaç sayfa olacağını yazdırmadan görür.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { MM, PAPER, type PaperId } from '@/lib/cv/browser'

type Props = {
  paper: PaperId
  /** 'fit' → kapsayıcıya sığdır (en fazla 1×); sayı → sabit ölçek. */
  zoom?: 'fit' | number
  guides?: boolean
  shadow?: boolean
  children: React.ReactNode
  /** Sayfa sayısı değiştiğinde haber verir (indirme adımındaki rozet için). */
  onPages?: (pages: number) => void
  pageLabel?: (n: number) => string
}

/**
 * Sayfa sınırlarının belge içindeki konumları (px).
 *
 * Doğal akış her `pageH` piksellik dilimde kesilir; kullanıcının zorunlu sayfa
 * başı koyduğu noktalarda ise sayfa erken kapanır ve sayaç oradan yeniden başlar.
 * Böylece ekrandaki kesik çizgiler PDF'in gerçek sayfa geçişleriyle örtüşür.
 */
function pageBoundaries(total: number, pageH: number, forced: number[]): number[] {
  const out: number[] = []
  let pageStart = 0
  const marks = forced.concat(Infinity)

  for (const mark of marks) {
    // Bu zorunlu başlangıca (ya da belgenin sonuna) kadar olan doğal kesmeler.
    const limit = Math.min(mark, total)
    while (pageStart + pageH < limit - 1) {
      pageStart += pageH
      out.push(pageStart)
    }
    if (mark === Infinity || mark >= total) break
    if (mark > pageStart) {
      out.push(mark)
      pageStart = mark
    }
  }
  return out
}

export default function CvPaper({ paper, zoom = 'fit', guides = true, shadow = true, children, onPages, pageLabel }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const docRef = useRef<HTMLDivElement>(null)
  const [avail, setAvail] = useState(0)
  const [docH, setDocH] = useState(0)
  /** Kullanıcının "yeni sayfada başlat" dediği bölümlerin belge içindeki konumu (px). */
  const [forced, setForced] = useState<number[]>([])

  const size = PAPER[paper] ?? PAPER.a4
  const paperW = size.w * MM
  const pageH = size.h * MM

  // Kapsayıcı genişliği — pencere boyutu ve panel düzeni değiştikçe güncellenir.
  useEffect(() => {
    const el = hostRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => setAvail(entries[0].contentRect.width))
    ro.observe(el)
    setAvail(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  // Belgenin gerçek (ölçeklenmemiş) yüksekliği. ResizeObserver yerleşim boyutunu
  // raporlar; transform bu ölçümü etkilemez.
  const measure = useCallback(() => {
    const el = docRef.current
    if (!el) return
    setDocH(el.offsetHeight)
    // `.cv-doc` position: relative olduğu için bölümlerin offsetParent'ı odur;
    // offsetTop dönüşümden etkilenmez, ölçek uygulanmamış gerçek konumu verir.
    const marks = Array.from(el.querySelectorAll<HTMLElement>('.cv-sec[data-break="page"]'))
      .map((n) => n.offsetTop)
      .filter((v) => v > 0)
      .sort((a, b) => a - b)
    setForced((prev) => (prev.length === marks.length && prev.every((v, i) => v === marks[i]) ? prev : marks))
  }, [])

  useEffect(() => {
    const el = docRef.current
    if (!el) return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    // İçerik (yazı tipi yüklenmesi, görsel) sonradan değişebilir.
    const t = window.setTimeout(measure, 350)
    measure()
    return () => {
      ro.disconnect()
      window.clearTimeout(t)
    }
  }, [measure, children])

  const scale = zoom === 'fit' ? Math.min(1, avail > 0 ? avail / paperW : 1) : zoom
  const height = docH > 0 ? docH * scale : pageH * scale
  const boundaries = pageBoundaries(docH || pageH, pageH, forced)
  const pages = boundaries.length + 1

  useEffect(() => {
    onPages?.(pages)
  }, [pages, onPages])

  return (
    <div ref={hostRef} style={{ width: '100%' }}>
      <div
        className="cvs-paper-fit"
        style={{ width: paperW * scale, height }}
      >
        <div
          ref={docRef}
          className={`cvs-paper-scale${shadow ? ' cvs-paper-shadow' : ''}`}
          style={{ transform: `scale(${scale})`, width: paperW }}
        >
          {children}
        </div>

        {guides &&
          boundaries.map((offset, i) => (
            <div key={i} className="cvs-pagebreak" style={{ top: offset * scale }}>
              <span>{pageLabel ? pageLabel(i + 2) : i + 2}</span>
            </div>
          ))}
      </div>
    </div>
  )
}
