import type { PeopleFilters } from '../domain/person-filters'
import {
  PERSON_COMPLETENESS_FIELDS,
  type PersonCompletenessField,
} from '../domain/person-completeness'

const FIELD_PARAM_KEYS: Record<PersonCompletenessField, string> = {
  givenNames: 'givenNames',
  familyName: 'familyName',
  maidenName: 'maidenName',
  gender: 'gender',
  birth: 'birth',
  death: 'death',
  birthPlace: 'birthPlace',
  deathPlace: 'deathPlace',
  isLiving: 'isLiving',
  photo: 'photo',
  notes: 'notes',
}

const PARAM_KEY_TO_FIELD: Record<string, PersonCompletenessField> = Object.fromEntries(
  Object.entries(FIELD_PARAM_KEYS).map(([field, key]) => [key, field as PersonCompletenessField]),
)

function parseYear(value: string | null): number | undefined {
  if (!value) return undefined
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : undefined
}

function parseFieldList(value: string | null): PersonCompletenessField[] {
  if (!value?.trim()) return []
  return value
    .split(',')
    .map((part) => part.trim())
    .filter((part): part is PersonCompletenessField =>
      PERSON_COMPLETENESS_FIELDS.includes(part as PersonCompletenessField),
    )
}

function fieldListToParam(fields: PersonCompletenessField[]): string {
  return fields.map((field) => FIELD_PARAM_KEYS[field]).join(',')
}

export function filtersToSearchParams(filters: PeopleFilters): URLSearchParams {
  const params = new URLSearchParams()

  const text = filters.text?.trim()
  if (text) params.set('q', text)

  if (filters.notesPresence && filters.notesPresence !== 'any') {
    params.set('notes', filters.notesPresence)
  }

  if (filters.birthYear?.from != null) params.set('birthFrom', String(filters.birthYear.from))
  if (filters.birthYear?.to != null) params.set('birthTo', String(filters.birthYear.to))
  if (filters.birthYear?.includeUnknown) params.set('birthUnknown', '1')

  if (filters.deathYear?.from != null) params.set('deathFrom', String(filters.deathYear.from))
  if (filters.deathYear?.to != null) params.set('deathTo', String(filters.deathYear.to))
  if (filters.deathYear?.includeUnknown) params.set('deathUnknown', '1')

  const missing = filters.fieldPresence
    ?.filter((entry) => entry.state === 'missing')
    .map((entry) => entry.field)
  const present = filters.fieldPresence
    ?.filter((entry) => entry.state === 'present')
    .map((entry) => entry.field)

  if (missing?.length) params.set('missing', fieldListToParam(missing))
  if (present?.length) params.set('present', fieldListToParam(present))

  return params
}

export function searchParamsToFilters(params: URLSearchParams): PeopleFilters {
  const filters: PeopleFilters = {}

  const text = params.get('q')?.trim()
  if (text) filters.text = text

  const notes = params.get('notes')
  if (notes === 'has' || notes === 'missing') filters.notesPresence = notes

  const birthFrom = parseYear(params.get('birthFrom'))
  const birthTo = parseYear(params.get('birthTo'))
  const birthUnknown = params.get('birthUnknown') === '1'
  if (birthFrom != null || birthTo != null || birthUnknown) {
    filters.birthYear = { from: birthFrom, to: birthTo, includeUnknown: birthUnknown || undefined }
  }

  const deathFrom = parseYear(params.get('deathFrom'))
  const deathTo = parseYear(params.get('deathTo'))
  const deathUnknown = params.get('deathUnknown') === '1'
  if (deathFrom != null || deathTo != null || deathUnknown) {
    filters.deathYear = { from: deathFrom, to: deathTo, includeUnknown: deathUnknown || undefined }
  }

  const missing = parseFieldList(params.get('missing'))
  const present = parseFieldList(params.get('present'))
  const fieldPresence = [
    ...missing.map((field) => ({ field, state: 'missing' as const })),
    ...present.map((field) => ({ field, state: 'present' as const })),
  ]
  if (fieldPresence.length) filters.fieldPresence = fieldPresence

  return filters
}

export function filtersForMissingField(field: PersonCompletenessField): PeopleFilters {
  return { fieldPresence: [{ field, state: 'missing' }] }
}

export function peopleListHref(slug: string, filters: PeopleFilters): string {
  const params = filtersToSearchParams(filters)
  const query = params.toString()
  return query ? `/families/${slug}/people?${query}` : `/families/${slug}/people`
}

export function parseFieldParamKey(key: string): PersonCompletenessField | undefined {
  return PARAM_KEY_TO_FIELD[key]
}
