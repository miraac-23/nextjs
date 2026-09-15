'use client'

/**
 * Belgeyi kâğıt olarak sahneler: gerçek boyutunda (mm) render edilen `.cv-doc`
 * düğümünü kapsayıcıya sığacak şekilde CSS transform ile küçültür.
 *
 * Transform yerleşimi etkilemediği için dış kutunun yüksekliği elle hesaplanır;
 * aksi halde kaydırma alanı yanlış olur. Sayfa sınırları kesik çizgiyle
 * gösterilir, böylece kullanıcı PDF'in kaç sayfa olacağını yazdırmadan görür.
 *
 * TİTREME UYARISI — burada iki geri besleme döngüsü tuzağı vardır:
 *   1) Ölçek kapsayıcı genişliğinden, kutu yüksekliği ölçekten, dikey kaydırma
 *      çubuğunun varlığı yükseklikten, kapsayıcı genişliği de kaydırma
 *      çubuğundan türer. Çubuk gidip geldikçe sonsuz salınım olur. Çözüm CSS
 *      tarafındadır: `.cvs-scroll` için `scrollbar-gutter: stable` (destek
 *      yoksa `overflow-y: scroll`) genişliği çubuktan bağımsız kılar.
 *   2) `paperW * (avail / paperW)` kayan nokta yüzünden `avail`i bir tık
 *      aşabilir; bu da yatay çubuğu tetikleyip aynı salınımı başlatır. Bu
 *      yüzden hem ölçüm hem de kutu genişliği tam piksele aşağı yuvarlanır.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { MM, PAPER, type PaperId } from '@/lib/cv/browser'

type Props = {
  paper: PaperId
  /**
   * Belgenin sayfa kenar boşluğu (mm) — genelde `settings.margin`. Yalnızca ilk
   * ölçümden önce kullanılır; sonrasında gerçek iç boşluk DOM'dan okunur (yan
   * sütunlu görsel şablonlarda kâğıt boşluğu 0'dır, boşluk sütunlardadır).
   */
  marginMm?: number
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
 * İç boşluk (`.cv-doc`un ya da yan sütunlu şablonlarda sütunların) `box-decoration-break:
 * clone` ile her yazdırılan sayfada tekrarlanır; dolayısıyla bir sayfaya sığan içerik
 * `pageH - padTop - padBottom` kadardır. İlk sayfa `pageH - padBottom` konumunda kapanır
 * (üstte bant/başlık olsa bile), sonrakiler her `contentH` pikselde: `padTop + k*contentH`.
 * Kullanıcının zorunlu sayfa başı koyduğu noktalarda sayfa erken kapanır ve sayaç
 * oradan yeniden başlar. Böylece ekrandaki kesik çizgiler ve sayfa sayısı PDF'in
 * gerçek sayfa geçişleriyle örtüşür.
 */
function pageBoundaries(total: number, pageH: number, padTop: number, padBottom: number, forced: number[]): number[] {
  const out: number[] = []
  // Aşırı büyük boşlukta sıfıra/negatife düşüp sonsuz döngü kurmasın.
  const contentH = Math.max(1, pageH - padTop - padBottom)
  const contentEnd = total - padBottom
  let pageStart = padTop
  const marks = forced.concat(Infinity)

  for (const mark of marks) {
    // Bu zorunlu başlangıca (ya da içeriğin sonuna) kadar olan doğal kesmeler.
    const limit = Math.min(mark, contentEnd)
    while (pageStart + contentH < limit - 1) {
      pageStart += contentH
      out.push(pageStart)
    }
    if (mark === Infinity || mark >= contentEnd) break
    if (mark > pageStart) {
      out.push(mark)
      pageStart = mark
    }
  }
  return out
}

function sameNumbers(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i])
}

export default function CvPaper({ paper, marginMm, zoom = 'fit', guides = true, shadow = true, children, onPages, pageLabel }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const docRef = useRef<HTMLDivElement>(null)
  const [avail, setAvail] = useState(0)
  const [docH, setDocH] = useState(0)
  /** Belgeden okunan, her sayfada tekrarlanan üst/alt iç boşluk (px); ölçülene dek `null`. */
  const [measuredPad, setMeasuredPad] = useState<{ top: number; bottom: number } | null>(null)
  /** Kullanıcının "yeni sayfada başlat" dediği bölümlerin belge içindeki konumu (px). */
  const [forced, setForced] = useState<number[]>([])

  const size = PAPER[paper] ?? PAPER.a4
  const paperW = size.w * MM
  const pageH = size.h * MM
  const fallbackPad = typeof marginMm === 'number' && Number.isFinite(marginMm) ? marginMm * MM : 0
  const padTop = measuredPad ? measuredPad.top : fallbackPad
  const padBottom = measuredPad ? measuredPad.bottom : fallbackPad

  // Kapsayıcı genişliği — pencere boyutu ve panel düzeni değiştikçe güncellenir.
  useEffect(() => {
    const el = hostRef.current
    if (!el) return
    // Tam piksele yuvarla: yarım piksellik ölçüm gürültüsü yeni bir render
    // tetiklemesin. Sıfır ise kapsayıcı o an gizli demektir (sekme değişimi,
    // `display: none`); son geçerli genişliği koru ki belge kaybolmasın.
    const read = (w: number) => {
      const next = Math.floor(w)
      if (next <= 0) return
      setAvail((prev) => (prev === next ? prev : next))
    }
    const ro = new ResizeObserver((entries) => read(entries[0].contentRect.width))
    ro.observe(el)
    read(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  // Belgenin gerçek (ölçeklenmemiş) yüksekliği. ResizeObserver yerleşim boyutunu
  // raporlar; transform bu ölçümü etkilemez.
  const measure = useCallback(() => {
    const el = docRef.current
    if (!el) return
    const h = el.offsetHeight
    if (h > 0) setDocH((prev) => (prev === h ? prev : h))
    const doc = el.querySelector<HTMLElement>('.cv-doc')
    if (doc) {
      // Yan sütunlu görsel şablonlarda kâğıt boşluğu 0'dır; her sayfada tekrarlanan
      // boşluk ana sütundadır (yan sütunla aynı dikey değerler).
      const read = (n: Element) => {
        const cs = window.getComputedStyle(n)
        return { top: parseFloat(cs.paddingTop) || 0, bottom: parseFloat(cs.paddingBottom) || 0 }
      }
      let p = read(doc)
      const col = doc.querySelector('.cv-col-main')
      if (p.top === 0 && p.bottom === 0 && col) p = read(col)
      // Tam piksele yuvarla: alt piksel farkları yeniden render tetiklemesin.
      const next = { top: Math.round(p.top), bottom: Math.round(p.bottom) }
      setMeasuredPad((prev) => (prev && prev.top === next.top && prev.bottom === next.bottom ? prev : next))
    }
    // `.cv-doc` position: relative olduğu için bölümlerin offsetParent'ı odur;
    // offsetTop dönüşümden etkilenmez, ölçek uygulanmamış gerçek konumu verir.
    const marks = Array.from(el.querySelectorAll<HTMLElement>('.cv-sec[data-break="page"]'))
      .map((n) => n.offsetTop)
      .filter((v) => v > 0)
      .sort((a, b) => a - b)
    setForced((prev) => (sameNumbers(prev, marks) ? prev : marks))
  }, [])

  // Gözlemci bir kez kurulur. Daha önce burada `children` bağımlılığı vardı;
  // üst bileşen her render'da yeni bir element ürettiği için gözlemci sürekli
  // sökülüp takılıyor ve her seferinde yeni bir zamanlayıcı kuruluyordu.
  useEffect(() => {
    const el = docRef.current
    if (!el) return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    measure()
    return () => ro.disconnect()
  }, [measure])

  // İçerik (yazı tipi yüklenmesi) sonradan yerleşebilir — bir kez daha bak.
  useEffect(() => {
    const t = window.setTimeout(measure, 350)
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts
    fonts?.ready.then(measure).catch(() => {})
    return () => window.clearTimeout(t)
  }, [measure])

  // Sayfa başı işaretleri belgenin boyu değişmeden de kayabilir (bölüm sırası,
  // görünürlük); ResizeObserver bunu görmez, bu yüzden içerik değişince ölçülür.
  useEffect(() => {
    measure()
  }, [measure, children])

  const scale = zoom === 'fit' ? Math.min(1, avail > 0 ? avail / paperW : 1) : zoom
  // Aşağı yuvarlama, kutunun kapsayıcıyı yarım piksel aşıp yatay kaydırma
  // çubuğu doğurmasını (ve oradan salınımı) engeller.
  const boxW = Math.floor(paperW * scale)
  const height = Math.round((docH > 0 ? docH : pageH) * scale)
  const boundaries = pageBoundaries(docH || pageH, pageH, padTop, padBottom, forced)
  const pages = boundaries.length + 1

  // `onPages` çoğu zaman satır içi bir okla geçilir; kimliği her render'da
  // değişir. Ref'te tutulursa efekt yalnızca sayfa sayısı değişince çalışır.
  // (Atama render sırasında değil efekt içinde yapılır: render saf kalmalı.)
  const onPagesRef = useRef(onPages)
  useEffect(() => {
    onPagesRef.current = onPages
  }, [onPages])
  useEffect(() => {
    onPagesRef.current?.(pages)
  }, [pages])

  return (
    <div ref={hostRef} style={{ width: '100%' }}>
      <div className="cvs-paper-fit" style={{ width: boxW, height }}>
        <div
          ref={docRef}
          className={`cvs-paper-scale${shadow ? ' cvs-paper-shadow' : ''}`}
          style={{ transform: `scale(${scale})`, width: paperW }}
        >
          {children}
        </div>

        {guides &&
          boundaries.map((offset, i) => (
            <div key={i} className="cvs-pagebreak" style={{ top: Math.round(offset * scale) }}>
              <span>{pageLabel ? pageLabel(i + 2) : i + 2}</span>
            </div>
          ))}
      </div>
    </div>
  )
}
