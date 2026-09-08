import { describe, expect, it } from 'vitest'
import { filtersForMissingField } from '../../lib/people-filter-params'
import {
  addPresetFragment,
  presetFragmentIsActive,
  removePresetFragment,
  togglePresetFragment,
} from './health-preset-filters'

describe('health-preset-filters', () => {
  it('stacks multiple field presets with AND semantics', () => {
    const birth = filtersForMissingField('birth')
    const familyName = filtersForMissingField('familyName')

    let filters = addPresetFragment({}, birth)
    filters = addPresetFragment(filters, familyName)

    expect(presetFragmentIsActive(filters, birth)).toBe(true)
    expect(presetFragmentIsActive(filters, familyName)).toBe(true)
    expect(filters.fieldPresence).toHaveLength(2)
  })

  it('removes only the toggled preset', () => {
    const birth = filtersForMissingField('birth')
    const familyName = filtersForMissingField('familyName')

    let filters = addPresetFragment(addPresetFragment({}, birth), familyName)
    filters = removePresetFragment(filters, birth)

    expect(presetFragmentIsActive(filters, birth)).toBe(false)
    expect(presetFragmentIsActive(filters, familyName)).toBe(true)
  })

  it('toggles notes presets exclusively', () => {
    const hasNotes = { notesPresence: 'has' as const }
    const noNotes = { notesPresence: 'missing' as const }

    let filters = togglePresetFragment({}, hasNotes)
    expect(filters.notesPresence).toBe('has')

    filters = togglePresetFragment(filters, noNotes)
    expect(filters.notesPresence).toBe('missing')

    filters = togglePresetFragment(filters, noNotes)
    expect(filters.notesPresence).toBeUndefined()
  })
})
