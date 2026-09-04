import type { PartialDate } from '../types'
import type { DomainError, Result } from './types'
import { err, ok } from './types'

export interface ParsedDateInput {
  date: PartialDate | null
  error?: DomainError
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28
  if ([4, 6, 9, 11].includes(month)) return 30
  return 31
}

export function validatePartialDate(date: PartialDate | null): Result<PartialDate | null> {
  if (!date) return ok(null)
  if (date.precision === 'unknown') {
    return err('INVALID_DATE', 'Date precision unknown is not valid for storage')
  }

  const year = date.year
  if (!year || year < 1000 || year > 2200) {
    return err('INVALID_DATE', `Invalid year: ${year ?? 'missing'}`)
  }

  if (date.precision === 'year') return ok({ year, precision: 'year' })

  const month = date.month
  if (!month || month < 1 || month > 12) {
    return err('INVALID_DATE', `Invalid month: ${month ?? 'missing'}`)
  }

  if (date.precision === 'month') return ok({ year, month, precision: 'month' })

  const day = date.day
  if (!day || day < 1 || day > daysInMonth(year, month)) {
    return err('INVALID_DATE', `Invalid day: ${day ?? 'missing'} for ${year}-${month}`)
  }

  return ok({ year, month, day, precision: 'day' })
}

export function parseDateInput(value: string): ParsedDateInput {
  const trimmed = value.trim()
  if (!trimmed) return { date: null }

  const europeanDayDots = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (europeanDayDots) {
    const day = Number(europeanDayDots[1])
    const month = Number(europeanDayDots[2])
    const year = Number(europeanDayDots[3])
    const result = validatePartialDate({ year, month, day, precision: 'day' })
    if (!result.ok) return { date: null, error: result.error }
    return { date: result.value }
  }

  const europeanMonthDots = trimmed.match(/^(\d{1,2})\.(\d{4})$/)
  if (europeanMonthDots) {
    const month = Number(europeanMonthDots[1])
    const year = Number(europeanMonthDots[2])
    const result = validatePartialDate({ year, month, precision: 'month' })
    if (!result.ok) return { date: null, error: result.error }
    return { date: result.value }
  }

  const europeanDay = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
  if (europeanDay) {
    const day = Number(europeanDay[1])
    const month = Number(europeanDay[2])
    const year = Number(europeanDay[3])
    const result = validatePartialDate({ year, month, day, precision: 'day' })
    if (!result.ok) return { date: null, error: result.error }
    return { date: result.value }
  }

  const europeanMonth = trimmed.match(/^(\d{1,2})-(\d{4})$/)
  if (europeanMonth) {
    const month = Number(europeanMonth[1])
    const year = Number(europeanMonth[2])
    const result = validatePartialDate({ year, month, precision: 'month' })
    if (!result.ok) return { date: null, error: result.error }
    return { date: result.value }
  }

  const iso = trimmed.match(/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/)
  if (iso) {
    const year = Number(iso[1])
    const month = iso[2] ? Number(iso[2]) : undefined
    const day = iso[3] ? Number(iso[3]) : undefined
    const candidate: PartialDate =
      day && month
        ? { year, month, day, precision: 'day' }
        : month
          ? { year, month, precision: 'month' }
          : { year, precision: 'year' }
    const result = validatePartialDate(candidate)
    if (!result.ok) return { date: null, error: result.error }
    return { date: result.value }
  }

  const yearOnly = trimmed.match(/^(\d{4})$/)
  if (yearOnly) {
    const result = validatePartialDate({ year: Number(yearOnly[1]), precision: 'year' })
    if (!result.ok) return { date: null, error: result.error }
    return { date: result.value }
  }

  return {
    date: null,
    error: { code: 'INVALID_DATE', message: `Unrecognized date format: ${trimmed}` },
  }
}

export function compareDates(a: PartialDate | null, b: PartialDate | null): number | null {
  const ay = a?.year
  const by = b?.year
  if (!ay || !by) return null
  if (ay !== by) return ay - by
  const am = a?.month ?? 1
  const bm = b?.month ?? 1
  if (am !== bm) return am - bm
  const ad = a?.day ?? 1
  const bd = b?.day ?? 1
  return ad - bd
}

export function isBiologicallyPlausibleParentChild(
  parentBirth: PartialDate | null,
  childBirth: PartialDate | null,
): boolean {
  const py = parentBirth?.year
  const cy = childBirth?.year
  if (!py || !cy) return true
  const age = cy - py
  if (age >= 12 && age <= 70) return true
  if (py >= 2000 && cy < 2000) {
    const corrected = py - 100
    return cy - corrected >= 12 && cy - corrected <= 70
  }
  return false
}
