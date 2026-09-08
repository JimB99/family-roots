import { describe, expect, it } from 'vitest'
import {
  formatLifeSpan,
  formatPartialDate,
  parsePartialDateInput,
  partialDateToInput,
} from './dates'

describe('dates', () => {
  it('formats and round-trips partial dates', () => {
    const date = { year: 1956, month: 7, day: 16, precision: 'day' as const }
    expect(formatPartialDate(date)).toBe('16.07.1956')
    expect(formatPartialDate(date, 'de-AT')).toBe('16.07.1956')
    expect(formatPartialDate(date, 'es-ES')).toBe('16/07/1956')
    expect(formatPartialDate(date, 'de-AT', '† ')).toBe('† 16.07.1956')
    expect(partialDateToInput(date)).toBe('16.07.1956')
    expect(parsePartialDateInput('16.07.1956')).toEqual(date)
  })

  it('parses year-only input', () => {
    expect(parsePartialDateInput('1956')).toEqual({ year: 1956, precision: 'year' })
  })

  it('formats life span with birth and death markers when only one date is known', () => {
    const birthDay = { year: 1956, month: 7, day: 16, precision: 'day' as const }
    const deathDay = { year: 2014, month: 3, day: 2, precision: 'day' as const }
    const birthYear = { year: 1950, precision: 'year' as const }
    const deathYear = { year: 2020, precision: 'year' as const }

    expect(formatLifeSpan(birthDay, null, null)).toBe('16.07.1956')
    expect(formatLifeSpan(null, deathDay, false)).toBe('† 02.03.2014')
    expect(formatLifeSpan(birthYear, null, true)).toBe('1950')
    expect(formatLifeSpan(birthYear, deathYear, false)).toBe('1950 – 2020')
  })
})
