import type { PeopleFilters } from '../../domain/person-filters'
import type { PersonCompletenessField } from '../../domain/person-completeness'

function fieldEntryMatches(
  filters: PeopleFilters,
  field: PersonCompletenessField,
  state: 'missing' | 'present',
): boolean {
  return (
    filters.fieldPresence?.some((entry) => entry.field === field && entry.state === state) ?? false
  )
}

export function presetFragmentIsActive(filters: PeopleFilters, preset: PeopleFilters): boolean {
  if (preset.notesPresence) {
    return filters.notesPresence === preset.notesPresence
  }

  const entry = preset.fieldPresence?.[0]
  if (!entry) return false
  return fieldEntryMatches(filters, entry.field, entry.state)
}

export function addPresetFragment(filters: PeopleFilters, preset: PeopleFilters): PeopleFilters {
  if (preset.notesPresence) {
    return { ...filters, notesPresence: preset.notesPresence }
  }

  const entry = preset.fieldPresence?.[0]
  if (!entry) return filters
  if (fieldEntryMatches(filters, entry.field, entry.state)) return filters

  const withoutField =
    filters.fieldPresence?.filter((existing) => existing.field !== entry.field) ?? []
  return {
    ...filters,
    fieldPresence: [...withoutField, entry],
  }
}

export function removePresetFragment(filters: PeopleFilters, preset: PeopleFilters): PeopleFilters {
  if (preset.notesPresence) {
    if (filters.notesPresence !== preset.notesPresence) return filters
    const { notesPresence: _removed, ...rest } = filters
    return rest
  }

  const entry = preset.fieldPresence?.[0]
  if (!entry) return filters

  const fieldPresence = filters.fieldPresence?.filter(
    (existing) => !(existing.field === entry.field && existing.state === entry.state),
  )
  return {
    ...filters,
    fieldPresence: fieldPresence?.length ? fieldPresence : undefined,
  }
}

export function togglePresetFragment(filters: PeopleFilters, preset: PeopleFilters): PeopleFilters {
  if (presetFragmentIsActive(filters, preset)) {
    return removePresetFragment(filters, preset)
  }
  return addPresetFragment(filters, preset)
}
