'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'

type Language = 'id' | 'en'

interface LanguageContextType {
  language: Language
  setLanguage: (language: Language) => void
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('id')

  useEffect(() => {
    const stored = localStorage.getItem('app_language')
    if (stored === 'id' || stored === 'en') {
      setLanguageState(stored)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('app_language', language)
    document.documentElement.lang = language === 'id' ? 'id' : 'en'
  }, [language])

  const value = useMemo(
    () => ({
      language,
      setLanguage: setLanguageState,
    }),
    [language]
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
