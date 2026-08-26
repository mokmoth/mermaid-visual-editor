import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react'
import { en, TranslationKeys } from './locales/en'
import { zh } from './locales/zh'

// Supported languages
export type Language = 'en' | 'zh'

// Language labels
export const languageLabels: Record<Language, string> = {
  en: 'English',
  zh: '中文',
}

// Translations map
const translations: Record<Language, TranslationKeys> = {
  en,
  zh,
}

// Storage key
const LANGUAGE_STORAGE_KEY = 'rls-mermaid-tool-language'

// Get nested value from object by path
function getNestedValue(obj: unknown, path: string): string {
  const keys = path.split('.')
  let current: unknown = obj

  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return path // Return path if not found
    }
    current = (current as Record<string, unknown>)[key]
  }

  if (typeof current === 'string') {
    return current
  }

  return path
}

// Context type
interface I18nContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

// Create context
const I18nContext = createContext<I18nContextType | null>(null)

// Provider component
export function I18nProvider({ children }: { children: ReactNode }) {
  // Initialize language from storage or browser preference
  const [language, setLanguageState] = useState<Language>(() => {
    // Check localStorage first
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY)
    if (stored === 'en' || stored === 'zh') {
      return stored
    }

    // Check browser language
    const browserLang = navigator.language.toLowerCase()
    if (browserLang.startsWith('zh')) {
      return 'zh'
    }

    // Product copy is Chinese-first; default to zh unless the user picked a language.
    return 'zh'
  })

  // Set language and persist to storage
  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang)
  }, [])

  // Translation function
  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    let value = getNestedValue(translations[language], key)

    // Replace parameters like {count}
    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        value = value.replace(`{${paramKey}}`, String(paramValue))
      })
    }

    return value
  }, [language])

  // Update document language attribute
  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  )
}

// Hook to use i18n
export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
}

// Hook for just translation function (convenience)
export function useTranslation() {
  const { t } = useI18n()
  return t
}
