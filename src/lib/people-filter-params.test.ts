import { describe, expect, it } from 'vitest'
import {
  filtersForMissingField,
  filtersToSearchParams,
  peopleListHref,
  searchParamsToFilters,
} from './people-filter-params'

describe('people-filter-params', () => {
  it('round-trips full filter state', () => {
    const filters = {
      text: 'immigration',
      notesPresence: 'has' as const,
      birthYear: { from: 1900, to: 1950, includeUnknown: true },
      deathYear: { from: 1980, to: 2000 },
      fieldPresence: [
        { field: 'familyName' as const, state: 'missing' as const },
        { field: 'birth' as const, state: 'present' as const },
      ],
    }

    const params = filtersToSearchParams(filters)
    expect(params.get('q')).toBe('immigration')
    expect(params.get('notes')).toBe('has')
    expect(params.get('birthFrom')).toBe('1900')
    expect(params.get('birthUnknown')).toBe('1')
    expect(params.get('missing')).toBe('familyName')
    expect(params.get('present')).toBe('birth')

    expect(searchParamsToFilters(params)).toEqual(filters)
  })

  it('builds people list href with encoded params', () => {
    const href = peopleListHref('miller', filtersForMissingField('birth'))
    expect(href).toBe('/families/miller/people?missing=birth')
  })

  it('ignores invalid field keys when decoding', () => {
    const params = new URLSearchParams('missing=familyName,invalidField,birth')
    expect(searchParamsToFilters(params).fieldPresence).toEqual([
      { field: 'familyName', state: 'missing' },
      { field: 'birth', state: 'missing' },
    ])
  })
})
