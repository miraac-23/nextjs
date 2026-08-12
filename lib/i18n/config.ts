export type Lang = 'tr' | 'en'

export const LANGS: Lang[] = ['tr', 'en']
export const DEFAULT_LANG: Lang = 'tr'
export const LANG_STORAGE_KEY = 'lang'

export function isLang(value: unknown): value is Lang {
  return value === 'tr' || value === 'en'
}

/**
 * Hidrasyondan önce <html lang> / data-lang niteliklerini ayarlayan satır içi script.
 * Tema scriptiyle aynı mantık — app/layout.tsx içinde <head> altında çalışır.
 */
export const LANG_INIT_SCRIPT = `(function(){try{var l=localStorage.getItem('${LANG_STORAGE_KEY}');if(l!=='en'&&l!=='tr'){l='${DEFAULT_LANG}';}document.documentElement.lang=l;document.documentElement.setAttribute('data-lang',l);}catch(e){document.documentElement.setAttribute('data-lang','${DEFAULT_LANG}');}})();`
