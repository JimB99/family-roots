import { describe, expect, it } from 'vitest'
import { person } from '../test/fixtures/family'
import {
  completenessIssuesForPerson,
  isFieldMissing,
  isFieldPresent,
  isPersonDeceasedForCompleteness,
  missingBirthDate,
  missingDeathDate,
  missingFamilyName,
} from './person-completeness'

describe('person-completeness', () => {
  it('detects missing string fields', () => {
    const p = person('p1', 'Ada', { familyName: null, maidenName: '   ', notes: null })
    expect(isFieldMissing(p, 'familyName')).toBe(true)
    expect(isFieldMissing(p, 'maidenName')).toBe(true)
    expect(isFieldMissing(p, 'notes')).toBe(true)
    expect(isFieldPresent(p, 'givenNames')).toBe(true)
  })

  it('detects missing birth date without year', () => {
    const noBirth = person('p1', 'Ada', { birth: null })
    const unknownBirth = person('p2', 'Bob', { birth: { precision: 'unknown' } })
    expect(missingBirthDate(noBirth)).toBe(true)
    expect(missingBirthDate(unknownBirth)).toBe(true)
    expect(missingBirthDate(person('p3', 'Cal', { birth: { year: 1920, precision: 'year' } }))).toBe(
      false,
    )
  })

  it('requires death date only when deceased', () => {
    const living = person('p1', 'Ada', { isLiving: true, death: null })
    expect(missingDeathDate(living)).toBe(false)

    const deceasedNoDeath = person('p2', 'Bob', { isLiving: false, death: null })
    expect(isPersonDeceasedForCompleteness(deceasedNoDeath)).toBe(true)
    expect(missingDeathDate(deceasedNoDeath)).toBe(true)

    const deceasedWithDeath = person('p3', 'Cal', {
      isLiving: false,
      death: { year: 1999, precision: 'year' },
    })
    expect(missingDeathDate(deceasedWithDeath)).toBe(false)
  })

  it('treats death year as deceased even when isLiving is unset', () => {
    const withDeathYear = person('p1', 'Ada', {
      isLiving: null,
      death: { year: 2001, precision: 'year' },
    })
    expect(isPersonDeceasedForCompleteness(withDeathYear)).toBe(true)
  })

  it('reports preset missing family name', () => {
    expect(missingFamilyName(person('p1', 'Ada', { familyName: null }))).toBe(true)
    expect(missingFamilyName(person('p2', 'Bob'))).toBe(false)
  })

  it('collects completeness issue codes per person', () => {
    const incomplete = person('p1', '', {
      familyName: null,
      birth: null,
      isLiving: false,
      death: null,
    })
    const codes = completenessIssuesForPerson(incomplete)
    expect(codes).toContain('MISSING_GIVEN_NAMES')
    expect(codes).toContain('MISSING_FAMILY_NAME')
    expect(codes).toContain('MISSING_BIRTH_DATE')
    expect(codes).toContain('MISSING_DEATH_DATE')
  })
})
