'use client'

import { useEffect, useRef } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageProvider'

/**
 * Sunum uygulamasını taşıyan iframe.
 * Sunum aynı origin'de olduğu için dili localStorage'dan zaten okur; burada
 * ek olarak ?lang= ile açılış dili verilir ve site dili değiştiğinde
 * postMessage ile iframe içindeki sunum anında çevrilir (sayfa yenilenmeden).
 */
export default function DeckFrame({ src, title }: { src: string; title: string }) {
  const { lang } = useLanguage()
  const ref = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    ref.current?.contentWindow?.postMessage({ type: 'deck-lang', lang }, window.location.origin)
  }, [lang])

  return (
    <iframe
      ref={ref}
      src={`${src}?lang=${lang}`}
      title={title}
      className="min-h-0 w-full flex-1 border-0"
      allow="fullscreen"
      allowFullScreen
    />
  )
}
