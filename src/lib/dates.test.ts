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
    expect(formatPartialDate(date)).toBe('16-07-1956')
    expect(partialDateToInput(date)).toBe('16-07-1956')
    expect(parsePartialDateInput('16.07.1956')).toEqual(date)
  })

  it('parses year-only input', () => {
    expect(parsePartialDateInput('1956')).toEqual({ year: 1956, precision: 'year' })
  })

  it('formats life span for living and deceased', () => {
    const birth = { year: 1950, precision: 'year' as const }
    const death = { year: 2020, precision: 'year' as const }
    expect(formatLifeSpan(birth, null, true)).toBe('1950 – living')
    expect(formatLifeSpan(birth, death, false)).toBe('1950 – 2020')
  })
})
