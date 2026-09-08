import type { AppLocale } from './locales'

const MAIDEN_NAME_LABELS: Record<AppLocale, string> = {
  'en-GB': 'née {{name}}',
  'es-ES': 'de soltera {{name}}',
  'de-AT': 'geb. {{name}}',
}

export function formatMaidenNameLabel(name: string, locale = 'en-GB'): string {
  const template = MAIDEN_NAME_LABELS[locale as AppLocale] ?? MAIDEN_NAME_LABELS['en-GB']
  return template.replace('{{name}}', name)
}
