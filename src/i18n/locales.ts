export const LOCALE_STORAGE_KEY = 'roots-atlas-locale'

export const APP_LOCALES = ['en-GB', 'es-ES', 'de-AT'] as const
export type AppLocale = (typeof APP_LOCALES)[number]
export const DEFAULT_LOCALE: AppLocale = 'en-GB'

export interface LocaleOption {
  locale: AppLocale
  flag: string
  nativeName: string
}

export const LOCALE_OPTIONS: LocaleOption[] = [
  { locale: 'en-GB', flag: '🇬🇧', nativeName: 'English' },
  { locale: 'es-ES', flag: '🇪🇸', nativeName: 'Español' },
  { locale: 'de-AT', flag: '🇦🇹', nativeName: 'Deutsch' },
]

/** Map browser / detector tags to a supported app locale. */
export function resolveSupportedLocale(raw: string | undefined | null): AppLocale {
  if (!raw) return DEFAULT_LOCALE
  const normalized = raw.trim().toLowerCase().replace('_', '-')
  if (normalized.startsWith('en')) return 'en-GB'
  if (normalized.startsWith('es')) return 'es-ES'
  if (normalized.startsWith('de')) return 'de-AT'
  return DEFAULT_LOCALE
}

export function isAppLocale(value: string): value is AppLocale {
  return (APP_LOCALES as readonly string[]).includes(value)
}
