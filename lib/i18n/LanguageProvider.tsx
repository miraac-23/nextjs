'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { DEFAULT_LANG, LANG_STORAGE_KEY, isLang, type Lang } from './config'
import { dict, type Dict } from './dict'
import { getContent, type Content } from './content'

type LanguageContextValue = {
  lang: Lang
  setLang: (next: Lang) => void
  toggleLang: () => void
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: DEFAULT_LANG,
  setLang: () => {},
  toggleLang: () => {},
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Sunucu render'ı her zaman varsayılan dille yapılır; tercih hidrasyondan sonra uygulanır.
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LANG_STORAGE_KEY)
      if (isLang(stored) && stored !== lang) setLangState(stored)
    } catch {}
    // yalnızca ilk mount'ta
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.setAttribute('data-lang', lang)
  }, [lang])

  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    try {
      localStorage.setItem(LANG_STORAGE_KEY, next)
    } catch {}
  }, [])

  const toggleLang = useCallback(() => {
    setLangState((prev) => {
      const next: Lang = prev === 'tr' ? 'en' : 'tr'
      try {
        localStorage.setItem(LANG_STORAGE_KEY, next)
      } catch {}
      return next
    })
  }, [])

  const value = useMemo(() => ({ lang, setLang, toggleLang }), [lang, setLang, toggleLang])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext)
}

/** Arayüz metinleri. */
export function useT(): Dict {
  return dict[useContext(LanguageContext).lang]
}

/** Dile göre içerik verisi (profil, deneyim, projeler, yazılar, sunumlar). */
export function useContent(): Content {
  return getContent(useContext(LanguageContext).lang)
}
