import type { PartialDate, Person } from '../types'
import { yearFromDate, type CompletenessIssueCode } from './types'

export type { CompletenessIssueCode }
export type PersonCompletenessField =
  | 'givenNames'
  | 'familyName'
  | 'maidenName'
  | 'gender'
  | 'birth'
  | 'death'
  | 'birthPlace'
  | 'deathPlace'
  | 'isLiving'
  | 'photo'
  | 'notes'

export const PERSON_COMPLETENESS_FIELDS: readonly PersonCompletenessField[] = [
  'givenNames',
  'familyName',
  'maidenName',
  'gender',
  'birth',
  'death',
  'birthPlace',
  'deathPlace',
  'isLiving',
  'photo',
  'notes',
] as const

export const PERSON_COMPLETENESS_FIELD_LABELS: Record<PersonCompletenessField, string> = {
  givenNames: 'Given names',
  familyName: 'Family name',
  maidenName: 'Maiden name',
  gender: 'Gender',
  birth: 'Birth date',
  death: 'Death date',
  birthPlace: 'Birth place',
  deathPlace: 'Death place',
  isLiving: 'Living status',
  photo: 'Photo',
  notes: 'Notes',
}

function isBlankString(value: string | null | undefined): boolean {
  return value == null || value.trim() === ''
}

function isDateMissing(date: PartialDate | null | undefined): boolean {
  if (!date || date.precision === 'unknown') return true
  return yearFromDate(date) == null
}

export function isPersonDeceasedForCompleteness(person: Person): boolean {
  if (person.isLiving === false) return true
  return yearFromDate(person.death) != null
}

export function isFieldMissing(person: Person, field: PersonCompletenessField): boolean {
  switch (field) {
    case 'givenNames':
      return isBlankString(person.givenNames)
    case 'familyName':
      return isBlankString(person.familyName)
    case 'maidenName':
      return isBlankString(person.maidenName)
    case 'gender':
      return person.gender === 'unknown'
    case 'birth':
      return isDateMissing(person.birth)
    case 'death':
      if (!isPersonDeceasedForCompleteness(person)) return false
      return isDateMissing(person.death)
    case 'birthPlace':
      return isBlankString(person.birthPlace)
    case 'deathPlace':
      return isBlankString(person.deathPlace)
    case 'isLiving':
      return person.isLiving == null
    case 'photo':
      return isBlankString(person.photoBase64)
    case 'notes':
      return isBlankString(person.notes)
  }
}

export function isFieldPresent(person: Person, field: PersonCompletenessField): boolean {
  return !isFieldMissing(person, field)
}

export function missingFamilyName(person: Person): boolean {
  return isFieldMissing(person, 'familyName')
}

export function missingBirthDate(person: Person): boolean {
  return isFieldMissing(person, 'birth')
}

export function missingDeathDate(person: Person): boolean {
  return isFieldMissing(person, 'death')
}

export function missingGivenNames(person: Person): boolean {
  return isFieldMissing(person, 'givenNames')
}

export function missingNotes(person: Person): boolean {
  return isFieldMissing(person, 'notes')
}

export function missingGender(person: Person): boolean {
  return isFieldMissing(person, 'gender')
}

export const COMPLETENESS_FIELD_TO_ISSUE_CODE: Partial<  Record<PersonCompletenessField, CompletenessIssueCode>
> = {
  givenNames: 'MISSING_GIVEN_NAMES',
  familyName: 'MISSING_FAMILY_NAME',
  maidenName: 'MISSING_MAIDEN_NAME',
  birth: 'MISSING_BIRTH_DATE',
  death: 'MISSING_DEATH_DATE',
  birthPlace: 'MISSING_BIRTH_PLACE',
  deathPlace: 'MISSING_DEATH_PLACE',
  isLiving: 'MISSING_LIVING_STATUS',
  photo: 'MISSING_PHOTO',
  notes: 'MISSING_NOTES',
}

export const COMPLETENESS_ISSUE_CODE_TO_FIELD: Partial<
  Record<CompletenessIssueCode, PersonCompletenessField>
> = Object.fromEntries(
  Object.entries(COMPLETENESS_FIELD_TO_ISSUE_CODE).map(([field, code]) => [code, field]),
) as Partial<Record<CompletenessIssueCode, PersonCompletenessField>>

export function completenessIssuesForPerson(person: Person): CompletenessIssueCode[] {
  const codes: CompletenessIssueCode[] = []
  for (const field of PERSON_COMPLETENESS_FIELDS) {
    const code = COMPLETENESS_FIELD_TO_ISSUE_CODE[field]
    if (!code) continue
    if (isFieldMissing(person, field)) codes.push(code)
  }
  return codes
}
