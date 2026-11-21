import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { dictionaries, type Key, type Lang } from './dict'

type Params = Record<string, string | number>

interface I18n {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: Key, params?: Params) => string
}

const STORAGE_KEY = 'basta:lang'
const I18nContext = createContext<I18n | null>(null)

function initialLang(): Lang {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === 'en' || saved === 'es' || saved === 'sp') return saved
  return navigator.language.toLowerCase().startsWith('es') ? 'es' : 'en'
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang)

  const setLang = useCallback((l: Lang) => {
    localStorage.setItem(STORAGE_KEY, l)
    document.documentElement.lang = l === 'en' ? 'en' : 'es'
    setLangState(l)
  }, [])

  const t = useCallback(
    (key: Key, params?: Params) => {
      const text = dictionaries[lang][key]
      if (!params) return text
      return text.replace(/\{(\w+)\}/g, (_, k: string) => String(params[k] ?? ''))
    },
    [lang],
  )

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider')
  return ctx
}
