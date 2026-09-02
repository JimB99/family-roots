import { describe, expect, it } from 'vitest'
import {
  compareDates,
  isBiologicallyPlausibleParentChild,
  parseDateInput,
  validatePartialDate,
} from './date-validation'

describe('date validation', () => {
  it('accepts valid partial dates', () => {
    expect(validatePartialDate({ year: 1990, precision: 'year' }).ok).toBe(true)
    expect(validatePartialDate({ year: 2000, month: 2, day: 29, precision: 'day' }).ok).toBe(true)
  })

  it('rejects impossible month and day values', () => {
    const badMonth = validatePartialDate({ year: 2000, month: 13, precision: 'month' })
    expect(badMonth.ok).toBe(false)
    if (!badMonth.ok) expect(badMonth.error.code).toBe('INVALID_DATE')

    const badDay = validatePartialDate({ year: 2001, month: 2, day: 29, precision: 'day' })
    expect(badDay.ok).toBe(false)
  })

  it('parses ISO date inputs and rejects invalid text', () => {
    expect(parseDateInput('1988-07-16').date?.precision).toBe('day')
    expect(parseDateInput('not-a-date').error?.code).toBe('INVALID_DATE')
  })

  it('compares dates with month and day granularity', () => {
    expect(
      compareDates({ year: 1990, month: 5, day: 1, precision: 'day' }, { year: 1991, precision: 'year' }),
    ).toBeLessThan(0)
  })

  it('detects biologically implausible parent-child ages', () => {
    expect(
      isBiologicallyPlausibleParentChild(
        { year: 2000, precision: 'year' },
        { year: 2010, precision: 'year' },
      ),
    ).toBe(false)
    expect(
      isBiologicallyPlausibleParentChild(
        { year: 1970, precision: 'year' },
        { year: 1995, precision: 'year' },
      ),
    ).toBe(true)
  })
})
