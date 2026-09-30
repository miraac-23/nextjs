'use client'

/**
 * Slayt üzerinde DOĞRUDAN düzenleme.
 *
 * Kullanıcı sağ paneldeki alanlara gitmeden, slaydın kendi üzerinde başlığa ya
 * da bir maddeye tıklayıp yazabiliyor — PowerPoint'te beklenen davranış bu.
 *
 * Neden React context: düzenlenebilirlik 12 ayrı slayt bileşenine tek tek
 * eklenirse her yeni şablonda unutuluyor. Metinler zaten `parts.tsx` içindeki
 * ortak parçalardan (`SlideHead`, `Bullets`, bantlar) geçtiği için, bağlamı
 * oraya vermek tüm şablonları AYNI ANDA düzenlenebilir yapıyor.
 *
 * Metnin tek sahibi REACT'tir ve değişiklik yalnızca ODAK KAYBINDA yukarı
 * bildirilir. İkisi birlikte imleç sorununu çözüyor: kullanıcı yazarken `value`
 * prop'u değişmediği için her yeniden render aynı çocuğu üretir, React DOM'a
 * hiç dokunmaz, imleç yerinde kalır. Odak kaybında yeni değer yukarı gider ve
 * dönen render zaten DOM'daki metinle aynıdır.
 *
 * Denenip ELENEN yol: metni `useEffect` + `textContent` ile elle yazmak. O
 * zaman DOM'un iki sahibi oluyor ve düğüm bayatlıyor — ölçüldü, alanlar boş
 * kalıyordu.
 *
 * Kullanıcının uyguladığı metin biçimi (punto, kalın, hiza, renk rolü) buraya
 * HİÇ sızmaz: `.sn-editable` `font: inherit` + `color: inherit` kullandığı için
 * düzenlenen alan sarmalayıcısının biçimini olduğu gibi devralır, alt çizgi de
 * blok sarmalayıcıdan yayılır. Bu yüzden biçim değiştiğinde burada tek satır
 * değişmesi gerekmiyor — ve `font: inherit` KALDIRILAMAZ, kaldırılırsa alanlar
 * tarayıcı varsayılanına düşüp slaydın ortasında 16px Times görünüyor.
 */

import { createContext, useCallback, useContext, useEffect, useRef } from 'react'

/** Düzenlenebilir bir metnin slayt içindeki adresi. */
export type TextPath =
  | { field: 'title' }
  | { field: 'subtitle' }
  | { field: 'highlight' }
  | { field: 'example' }
  | { field: 'bullet'; index: number }

export type SlideEditApi = {
  /** Kullanıcı bir metni düzenleyip odaktan çıktı. Boş metin alanı siler. */
  onText: (path: TextPath, value: string) => void
}

const SlideEditContext = createContext<SlideEditApi | null>(null)

export function SlideEditProvider({ api, children }: { api: SlideEditApi; children: React.ReactNode }) {
  return <SlideEditContext.Provider value={api}>{children}</SlideEditContext.Provider>
}

export function useSlideEdit(): SlideEditApi | null {
  return useContext(SlideEditContext)
}

type Props = {
  value: string
  path: TextPath
  /** Sarmalayıcı etiket — başlıkta `h2`, maddede `li` olmalı ki CSS değişmesin. */
  as?: 'span' | 'div'
  className?: string
}

/**
 * Metni basar; düzenleme bağlamı varsa yerinde düzenlenebilir yapar.
 *
 * Bağlam yokken (sunum modu, yazdırma, küçük resim) hiçbir ek düğüm ya da
 * olay eklenmez — oralarda düzenlenebilirlik hem gereksiz hem zararlı.
 */
export function EditableText({ value, path, as = 'span', className }: Props) {
  const api = useSlideEdit()
  const ref = useRef<HTMLElement | null>(null)

  const commit = useCallback(() => {
    const el = ref.current
    if (!el || !api) return
    // Yapıştırmada gelen satır sonları tek satıra indirilir: slayt metinleri
    // tek paragraftır, çok satırlı girdi yerleşimi bozar.
    const next = (el.textContent ?? '').replace(/\s+/g, ' ').trim()
    if (next === value) return
    api.onText(path, next)
  }, [api, path, value])

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLElement>) => {
    // Ctrl/Cmd+B/I/U tarayıcıda `<b>/<i>/<u>` düğümü ÜRETİR; `commit()` yalnızca
    // `textContent` okuduğu için o biçim odak kaybında sessizce kayboluyordu.
    // Kullanıcıya olmayan bir yetenek göstermemek için tuş burada kesilir:
    // biçimin tek adresi sağ paneldeki "Metin biçimi" araç çubuğu (slayt geneli).
    if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'i' || e.key === 'u')) {
      e.preventDefault()
      e.stopPropagation()
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      ;(e.currentTarget as HTMLElement).blur()
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      ;(e.currentTarget as HTMLElement).blur()
    }
    // Düzenleme sırasında ok tuşları ve kısayollar editöre sızmamalı.
    e.stopPropagation()
  }, [])

  if (!api) return <>{value}</>

  const Tag = as
  return (
    <Tag
      ref={ref as React.Ref<HTMLDivElement>}
      className={`sn-editable${className ? ` ${className}` : ''}`}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      onBlur={commit}
      onKeyDown={onKeyDown}
      // Yapıştırmada biçim değil DÜZ METİN alınır; aksi hâlde slayda harici
      // yazı tipi ve renk sızıyor ve tasarım sistemi delinmiş oluyor.
      onPaste={(e) => {
        e.preventDefault()
        const text = e.clipboardData.getData('text/plain').replace(/\s+/g, ' ')
        document.execCommand('insertText', false, text)
      }}
    >
      {value}
    </Tag>
  )
}
