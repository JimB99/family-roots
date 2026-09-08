import type { Person } from '../types'
import type { GraphIssue } from './types'
import {
  COMPLETENESS_FIELD_TO_ISSUE_CODE,
  completenessIssuesForPerson,
  type CompletenessIssueCode,
  type PersonCompletenessField,
} from './person-completeness'

function personLabel(person: Person): string {
  const parts = [person.givenNames, person.familyName].filter(Boolean)
  return parts.length ? parts.join(' ') : 'Unknown'
}
const ISSUE_MESSAGES: Record<CompletenessIssueCode, string> = {
  MISSING_GIVEN_NAMES: 'Given names are missing',
  MISSING_FAMILY_NAME: 'Family name is missing',
  MISSING_MAIDEN_NAME: 'Maiden name is missing',
  MISSING_BIRTH_DATE: 'Birth date is missing',
  MISSING_DEATH_DATE: 'Death date is missing',
  MISSING_BIRTH_PLACE: 'Birth place is missing',
  MISSING_DEATH_PLACE: 'Death place is missing',
  MISSING_LIVING_STATUS: 'Living status is missing',
  MISSING_PHOTO: 'Photo is missing',
  MISSING_NOTES: 'Notes are missing',
}

export function auditPersonCompleteness(people: Person[]): GraphIssue[] {
  const issues: GraphIssue[] = []

  for (const person of people) {
    for (const code of completenessIssuesForPerson(person)) {
      issues.push({
        code,
        message: `${personLabel(person)}: ${ISSUE_MESSAGES[code]}`,
        personIds: [person.id],
      })
    }
  }

  return issues
}

export function completenessFieldForIssueCode(
  code: CompletenessIssueCode,
): PersonCompletenessField | undefined {
  for (const [field, issueCode] of Object.entries(COMPLETENESS_FIELD_TO_ISSUE_CODE)) {
    if (issueCode === code) return field as PersonCompletenessField
  }
  return undefined
}

export function isCompletenessIssueCode(code: string): code is CompletenessIssueCode {
  return code in ISSUE_MESSAGES
}
