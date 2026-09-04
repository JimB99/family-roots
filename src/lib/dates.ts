import type { PartialDate } from '../types'
import { parseDateInput } from '../domain/date-validation'

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

export function formatPartialDate(
  date: PartialDate | null | undefined,
  prefix = '',
): string {
  if (!date || date.precision === 'unknown') return ''

  const { year, month, day, precision } = date
  if (!year && precision === 'year') return ''

  if (precision === 'day' && year && month && day) {
    return `${prefix}${pad2(day)}-${pad2(month)}-${year}`
  }
  if (precision === 'month' && year && month) {
    return `${prefix}${pad2(month)}-${year}`
  }
  if (precision === 'year' && year) return `${prefix}${year}`

  if (year) return `${prefix}${year}`
  return ''
}

export function formatLifeSpan(
  birth: PartialDate | null,
  death: PartialDate | null,
  isLiving: boolean | null,
): string {
  const birthText = formatPartialDate(birth)
  if (isLiving) return birthText ? `${birthText} – living` : 'living'
  const deathText = formatPartialDate(death)
  if (birthText && deathText) return `${birthText} – ${deathText}`
  return birthText || deathText || ''
}

export function parsePartialDateInput(value: string): PartialDate | null {
  const parsed = parseDateInput(value)
  if (parsed.error) return null
  return parsed.date
}

export function parsePartialDateInputResult(value: string) {
  return parseDateInput(value)
}

export function partialDateToInput(date: PartialDate | null): string {
  return formatPartialDate(date)
}
