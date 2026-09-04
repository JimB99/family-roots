import { describe, expect, it } from 'vitest'
import { person } from '../../../test/fixtures/family'
import {
  displayLabel,
  initialsFor,
  isDeceased,
  personNodeDisplayFromPerson,
  subtitleFor,
} from './person-node-display'

describe('personNodeDisplay', () => {
  it('builds label and initials from names', () => {
    const p = person('p1', 'María', { familyName: 'Aguilar' })
    expect(displayLabel(p)).toBe('María Aguilar')
    expect(initialsFor(p)).toBe('MA')
  })

  it('uses Unknown for empty given name in display fields', () => {
    const p = person('p1', ' ', { familyName: null })
    const display = personNodeDisplayFromPerson({ ...p, givenNames: '' })
    expect(display.label).toBe('Unknown')
    expect(display.givenNames).toBe('Unknown')
  })

  it('shows maiden name in subtitle when no dates', () => {
    const p = person('p1', 'Anna', { maidenName: 'López', birth: null, death: null, isLiving: null })
    expect(subtitleFor(p)).toBe('née López')
  })

  it('marks deceased from death date or isLiving flag', () => {
    expect(isDeceased(person('a', 'A', { isLiving: true }))).toBe(false)
    expect(isDeceased(person('b', 'B', { isLiving: false }))).toBe(true)
    expect(isDeceased(person('c', 'C', { death: { year: 2000, precision: 'year' } }))).toBe(true)
  })

  it('includes birth year in display fields for layout ordering', () => {
    const p = person('p1', 'A', { birth: { year: 1945, precision: 'year' } })
    expect(personNodeDisplayFromPerson(p).birthYear).toBe(1945)
  })
})
