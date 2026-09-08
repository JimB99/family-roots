import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import {
  APP_LOCALES,
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  resolveSupportedLocale,
} from './locales'

type LocaleModule = { default: Record<string, unknown> }

const modules = import.meta.glob<LocaleModule>('../locales/**/*.json', { eager: true })

const resources: Record<string, Record<string, Record<string, unknown>>> = {}

for (const path in modules) {
  const match = path.match(/\.\.\/locales\/([^/]+)\/([^/]+)\.json$/)
  if (!match) continue
  const [, locale, namespace] = match
  if (!resources[locale]) resources[locale] = {}
  resources[locale][namespace] = modules[path].default
}

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: [...APP_LOCALES],
    nonExplicitSupportedLngs: false,
    ns: ['common', 'app', 'person', 'tree', 'people', 'health', 'admin', 'access', 'errors', 'kinship'],
    defaultNS: 'common',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: LOCALE_STORAGE_KEY,
      caches: ['localStorage'],
      convertDetectedLanguage: (lng) => resolveSupportedLocale(lng),
    },
    react: { useSuspense: false },
  })

export default i18n
