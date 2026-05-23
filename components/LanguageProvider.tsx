'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Locale, translations, TranslationDict } from '@/lib/i18n'

type LangContextType = {
  locale: Locale
  t: TranslationDict
  setLocale: (l: Locale) => void
}

const LangContext = createContext<LangContextType>({
  locale: 'en',
  t: translations.en,
  setLocale: () => {},
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en')

  useEffect(() => {
    const saved = localStorage.getItem('svks_lang') as Locale | null
    if (saved && translations[saved]) setLocaleState(saved)
  }, [])

  const setLocale = (l: Locale) => {
    setLocaleState(l)
    localStorage.setItem('svks_lang', l)
  }

  return (
    <LangContext.Provider value={{ locale, t: translations[locale], setLocale }}>
      {children}
    </LangContext.Provider>
  )
}

export const useTranslation = () => useContext(LangContext)
