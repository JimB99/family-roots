import type { PartialDate } from '../types'
import { parseDateInput } from '../domain/date-validation'
import { resolveSupportedLocale } from '../i18n/locales'

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function dateSeparator(locale: string): string {
  const resolved = resolveSupportedLocale(locale)
  return resolved === 'es-ES' ? '/' : '.'
}

export function formatPartialDate(
  date: PartialDate | null | undefined,
  locale = 'en-GB',
  prefix = '',
): string {
  if (!date || date.precision === 'unknown') return ''

  const sep = dateSeparator(locale)
  const { year, month, day, precision } = date
  if (!year && precision === 'year') return ''

  if (precision === 'day' && year && month && day) {
    return `${prefix}${pad2(day)}${sep}${pad2(month)}${sep}${year}`
  }
  if (precision === 'month' && year && month) {
    return `${prefix}${pad2(month)}${sep}${year}`
  }
  if (precision === 'year' && year) return `${prefix}${year}`

  if (year) return `${prefix}${year}`
  return ''
}

const DEATH_PREFIX = '† '

export function formatLifeSpan(
  birth: PartialDate | null,
  death: PartialDate | null,
  isLiving: boolean | null,
  locale = 'en-GB',
): string {
  const birthText = formatPartialDate(birth, locale)
  if (isLiving) return birthText
  const deathText = formatPartialDate(death, locale)
  if (birthText && deathText) return `${birthText} – ${deathText}`
  if (deathText) return formatPartialDate(death, locale, DEATH_PREFIX)
  return birthText
}

export function parsePartialDateInput(value: string): PartialDate | null {
  const parsed = parseDateInput(value)
  if (parsed.error) return null
  return parsed.date
}

export function parsePartialDateInputResult(value: string) {
  return parseDateInput(value)
}

export function partialDateToInput(date: PartialDate | null, locale = 'en-GB'): string {
  return formatPartialDate(date, locale)
}
