import type { PartialDate } from '../types'
import { parseDateInput } from '../domain/date-validation'

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

export function formatPartialDate(
  date: PartialDate | null | undefined,
  prefix = '',
): string {
  if (!date || date.precision === 'unknown') return ''

  const { year, month, day, precision } = date
  if (!year && precision === 'year') return ''

  if (precision === 'year' && year) return `${prefix}${year}`
  if (precision === 'month' && year && month) {
    return `${prefix}${MONTHS[month - 1]} ${year}`
  }
  if (precision === 'day' && year && month && day) {
    return `${prefix}${day} ${MONTHS[month - 1]} ${year}`
  }

  if (year) return `${prefix}${year}`
  return ''
}

export function formatLifeSpan(
  birth: PartialDate | null,
  death: PartialDate | null,
  isLiving: boolean | null,
): string {
  const birthText = formatPartialDate(birth, 'b. ')
  if (isLiving) return birthText ? `${birthText} – living` : 'living'
  const deathText = formatPartialDate(death, 'd. ')
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
  if (!date?.year) return ''
  if (date.precision === 'day' && date.month && date.day) {
    return `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`
  }
  if (date.precision === 'month' && date.month) {
    return `${date.year}-${String(date.month).padStart(2, '0')}`
  }
  return String(date.year)
}

export function excelSerialToPartialDate(serial: number): PartialDate | null {
  if (!serial || serial < 1) return null
  const utcDays = Math.floor(serial - 25569)
  const date = new Date(utcDays * 86400 * 1000)
  if (Number.isNaN(date.getTime())) return null
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    precision: 'day',
  }
}

export function parseGermanDateString(value: string): PartialDate | null {
  const trimmed = value.trim()
  if (!trimmed || trimmed.includes('_')) {
    const yearMatch = trimmed.match(/(\d{2,4})$/)
    if (yearMatch) {
      const raw = yearMatch[1]
      const year = raw.length === 2 ? 1900 + Number(raw) : Number(raw)
      if (year > 1800 && year < 2100) return { year, precision: 'year' }
    }
    return null
  }

  const match = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/)
  if (!match) return null

  const day = Number(match[1])
  const month = Number(match[2])
  let year = Number(match[3])
  if (year < 100) year += year >= 30 ? 1900 : 2000

  if (!day || !month) return { year, precision: 'year' }
  return { year, month, day, precision: 'day' }
}

export function parseDateCell(value: unknown): PartialDate | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return excelSerialToPartialDate(value)
  if (typeof value === 'string') {
    const marriageYear = value.match(/\+\s*(\d{4})/)
    if (marriageYear) return { year: Number(marriageYear[1]), precision: 'year' }
    return parseGermanDateString(value)
  }
  return null
}
