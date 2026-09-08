import type { Person } from '../types'
import { yearFromDate } from './types'
import { isFieldMissing, isFieldPresent, type PersonCompletenessField } from './person-completeness'

export interface YearRange {
  from?: number
  to?: number
  includeUnknown?: boolean
}

export interface FieldPresenceFilter {
  field: PersonCompletenessField
  state: 'missing' | 'present'
}

export interface PeopleFilters {
  text?: string
  notesPresence?: 'any' | 'has' | 'missing'
  birthYear?: YearRange
  deathYear?: YearRange
  fieldPresence?: FieldPresenceFilter[]
}

function normalizeText(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? ''
}

function textHaystack(person: Person): string {
  return [person.givenNames, person.familyName, person.maidenName, person.birthPlace, person.notes]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function matchesYearRange(year: number | null, range: YearRange | undefined): boolean {
  if (!range) return true
  const hasBounds = range.from != null || range.to != null
  if (year == null) return Boolean(range.includeUnknown) || !hasBounds
  if (range.from != null && year < range.from) return false
  if (range.to != null && year > range.to) return false
  return true
}

function matchesText(person: Person, text: string | undefined): boolean {
  const normalized = normalizeText(text)
  if (!normalized) return true
  return textHaystack(person).includes(normalized)
}

function matchesNotesPresence(person: Person, notesPresence: PeopleFilters['notesPresence']): boolean {
  if (!notesPresence || notesPresence === 'any') return true
  const hasNotes = Boolean(person.notes?.trim())
  return notesPresence === 'has' ? hasNotes : !hasNotes
}

function matchesFieldPresence(person: Person, filters: FieldPresenceFilter[] | undefined): boolean {
  if (!filters?.length) return true
  return filters.every((filter) =>
    filter.state === 'missing'
      ? isFieldMissing(person, filter.field)
      : isFieldPresent(person, filter.field),
  )
}

export function personMatchesFilters(person: Person, filters: PeopleFilters): boolean {
  if (!matchesText(person, filters.text)) return false
  if (!matchesNotesPresence(person, filters.notesPresence)) return false
  if (!matchesYearRange(yearFromDate(person.birth), filters.birthYear)) return false
  if (!matchesYearRange(yearFromDate(person.death), filters.deathYear)) return false
  if (!matchesFieldPresence(person, filters.fieldPresence)) return false
  return true
}

export function filterPeople(people: Person[], filters: PeopleFilters): Person[] {
  return people.filter((person) => personMatchesFilters(person, filters))
}

export function countMatchingPeople(people: Person[], filters: PeopleFilters): number {
  let count = 0
  for (const person of people) {
    if (personMatchesFilters(person, filters)) count++
  }
  return count
}

export function isFiltersEmpty(filters: PeopleFilters): boolean {
  const hasText = Boolean(normalizeText(filters.text))
  const hasNotesPresence = filters.notesPresence != null && filters.notesPresence !== 'any'
  const hasBirthRange =
    filters.birthYear?.from != null ||
    filters.birthYear?.to != null ||
    filters.birthYear?.includeUnknown
  const hasDeathRange =
    filters.deathYear?.from != null ||
    filters.deathYear?.to != null ||
    filters.deathYear?.includeUnknown
  const hasFieldPresence = Boolean(filters.fieldPresence?.length)
  return !hasText && !hasNotesPresence && !hasBirthRange && !hasDeathRange && !hasFieldPresence
}
