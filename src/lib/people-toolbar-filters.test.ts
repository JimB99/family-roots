import { describe, expect, it } from 'vitest'
import { countActivePeopleToolbarFilters } from './people-toolbar-filters'

describe('countActivePeopleToolbarFilters', () => {
  it('returns zero when only defaults are set', () => {
    expect(
      countActivePeopleToolbarFilters({}, 'name-asc', 'all', 'all', 'ancestor-1', 'ancestor-1'),
    ).toBe(0)
  })

  it('counts search, sort, branch, generation, and advanced filters', () => {
    expect(
      countActivePeopleToolbarFilters(
        {
          text: 'maria',
          birthYear: { from: 1900 },
          fieldPresence: [{ field: 'birth', state: 'missing' }],
        },
        'birth-year-asc',
        'group-2',
        1,
        'ancestor-1',
        'ancestor-1',
      ),
    ).toBe(6)
  })
})
