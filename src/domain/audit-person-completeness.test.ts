import { describe, expect, it } from 'vitest'
import { person } from '../test/fixtures/family'
import { auditPersonCompleteness, completenessFieldForIssueCode } from './audit-person-completeness'

describe('auditPersonCompleteness', () => {
  it('reports missing family name and birth date', () => {
    const incomplete = person('p1', 'Ada', { familyName: null, birth: null })
    const issues = auditPersonCompleteness([incomplete])
    expect(issues.some((issue) => issue.code === 'MISSING_FAMILY_NAME')).toBe(true)
    expect(issues.some((issue) => issue.code === 'MISSING_BIRTH_DATE')).toBe(true)
  })

  it('reports missing death date for deceased people', () => {
    const deceased = person('p1', 'Ada', { isLiving: false, death: null })
    const issues = auditPersonCompleteness([deceased])
    expect(issues.some((issue) => issue.code === 'MISSING_DEATH_DATE')).toBe(true)
  })

  it('maps issue codes back to completeness fields', () => {
    expect(completenessFieldForIssueCode('MISSING_BIRTH_DATE')).toBe('birth')
    expect(completenessFieldForIssueCode('MISSING_FAMILY_NAME')).toBe('familyName')
  })
})
