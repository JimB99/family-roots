import { describe, expect, it } from 'vitest'
import { person } from '../test/fixtures/family'
import { filterPeople, isFiltersEmpty, personMatchesFilters } from './person-filters'

describe('person-filters', () => {
  const people = [
    person('1', 'Alice', {
      familyName: 'Smith',
      birth: { year: 1920, precision: 'year' },
      death: { year: 1990, precision: 'year' },
      isLiving: false,
      notes: 'Immigrated in 1945',
      birthPlace: 'London',
    }),
    person('2', 'Bob', {
      familyName: null,
      birth: { year: 1950, precision: 'year' },
      isLiving: true,
      notes: null,
    }),
    person('3', 'Carol', {
      familyName: 'Jones',
      birth: null,
      death: null,
      isLiving: null,
      notes: '   ',
    }),
  ]

  it('passes through when filters are empty', () => {
    expect(filterPeople(people, {})).toHaveLength(3)
    expect(isFiltersEmpty({})).toBe(true)
  })

  it('filters by text across names, places, and notes', () => {
    expect(filterPeople(people, { text: 'immigr' })).toEqual([people[0]])
    expect(filterPeople(people, { text: 'london' })).toEqual([people[0]])
    expect(filterPeople(people, { text: 'smith' })).toEqual([people[0]])
  })

  it('filters by notes presence', () => {
    expect(filterPeople(people, { notesPresence: 'has' })).toEqual([people[0]])
    expect(filterPeople(people, { notesPresence: 'missing' })).toEqual([people[1], people[2]])
  })

  it('filters birth year ranges inclusively', () => {
    expect(filterPeople(people, { birthYear: { from: 1940, to: 1960 } })).toEqual([people[1]])
    expect(filterPeople(people, { birthYear: { from: 1900, to: 1930 } })).toEqual([people[0]])
  })

  it('excludes unknown birth years unless includeUnknown is set', () => {
    expect(filterPeople(people, { birthYear: { from: 1900, to: 2000 } })).toEqual([people[0], people[1]])
    expect(
      filterPeople(people, { birthYear: { from: 1900, to: 2000, includeUnknown: true } }),
    ).toHaveLength(3)
  })

  it('filters death year ranges', () => {
    expect(filterPeople(people, { deathYear: { from: 1980, to: 2000 } })).toEqual([people[0]])
  })

  it('stacks field presence filters with AND logic', () => {
    const result = filterPeople(people, {
      fieldPresence: [
        { field: 'familyName', state: 'missing' },
        { field: 'birth', state: 'present' },
      ],
    })
    expect(result).toEqual([people[1]])
  })

  it('combines multiple filter types', () => {
    expect(
      personMatchesFilters(people[0], {
        text: 'alice',
        birthYear: { from: 1910, to: 1930 },
        notesPresence: 'has',
      }),
    ).toBe(true)
    expect(
      personMatchesFilters(people[0], {
        text: 'alice',
        notesPresence: 'missing',
      }),
    ).toBe(false)
  })
})
