import { describe, expect, it } from 'vitest'
import { person } from '../test/fixtures/family'
import { filterPeopleByQuery, matchedPersonIdsForQuery } from './person-search'

const people = [
  person('1', 'María', { familyName: 'Aguilar', maidenName: 'López', birthPlace: 'Madrid' }),
  person('2', 'John', { familyName: 'Smith' }),
  person('3', 'José', { familyName: 'García', birthPlace: 'Barcelona' }),
]

describe('person-search', () => {
  it('returns null matched ids for empty query', () => {
    expect(matchedPersonIdsForQuery(people, '')).toBeNull()
    expect(matchedPersonIdsForQuery(people, '   ')).toBeNull()
  })

  it('matches case-insensitively across names and places', () => {
    const ids = matchedPersonIdsForQuery(people, 'maría')
    expect(ids?.has('1')).toBe(true)
    expect(ids?.has('2')).toBe(false)
  })

  it('matches maiden name and birth place', () => {
    expect(matchedPersonIdsForQuery(people, 'lópez')?.has('1')).toBe(true)
    expect(matchedPersonIdsForQuery(people, 'barcelona')?.has('3')).toBe(true)
  })

  it('matches notes text', () => {
    const withNotes = [
      ...people,
      person('4', 'Notes', { notes: 'Family reunion 1998' }),
    ]
    expect(matchedPersonIdsForQuery(withNotes, 'reunion')?.has('4')).toBe(true)
  })

  it('filterPeopleByQuery respects limit', () => {
    const all = filterPeopleByQuery(people, 'a', 10)
    expect(all.length).toBeGreaterThan(1)
    expect(filterPeopleByQuery(people, 'a', 1)).toHaveLength(1)
  })

  it('returns empty list for non-matching query', () => {
    expect(filterPeopleByQuery(people, 'zzznomatch')).toEqual([])
  })
})
