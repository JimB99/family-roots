import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

const localeModules = import.meta.glob('../locales/*/*.json', { eager: true }) as Record<
  string,
  { default: Record<string, unknown> }
>

function buildResources(locale: string): Record<string, Record<string, unknown>> {
  const resources: Record<string, Record<string, unknown>> = {}
  for (const [path, mod] of Object.entries(localeModules)) {
    const match = path.match(/locales\/([^/]+)\/([^/]+)\.json$/)
    if (!match || match[1] !== locale) continue
    resources[match[2]] = mod.default
  }
  return resources
}

let initialized = false

export async function initTestI18n(locale = 'en-GB'): Promise<typeof i18n> {
  if (initialized) {
    await i18n.changeLanguage(locale)
    return i18n
  }

  await i18n.use(initReactI18next).init({
    lng: locale,
    fallbackLng: 'en-GB',
    supportedLngs: ['en-GB', 'es-ES', 'de-AT'],
    ns: Object.keys(buildResources('en-GB')),
    defaultNS: 'common',
    resources: {
      'en-GB': buildResources('en-GB'),
      'es-ES': buildResources('es-ES'),
      'de-AT': buildResources('de-AT'),
    },
    interpolation: { escapeValue: false },
  })

  initialized = true
  return i18n
}
