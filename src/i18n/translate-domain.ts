import type { TFunction } from 'i18next'
import type { GraphIssue } from '../domain/types'
import type { DomainError, DomainErrorCode } from '../domain/types'

export type ConnectionBlockReason =
  | 'NO_PARENTS_FOR_SIBLING'
  | 'NOT_POSSIBLE'
  | 'DUPLICATE_EXISTS'
  | 'TWO_PARENTS'
  | 'PARTIAL_SIBLING'
  | DomainErrorCode

export function translateDomainError(error: DomainError, t: TFunction): string {
  const key = `domain.${error.code}`
  const translated = t(key, { ns: 'errors', defaultValue: '' })
  if (translated) return translated
  return error.message
}

export function translateDomainErrorCode(
  code: DomainErrorCode | ConnectionBlockReason,
  t: TFunction,
  params?: Record<string, string | number>,
): string {
  const key = `connection.${code}`
  const connection = t(key, { ns: 'errors', defaultValue: '' })
  if (connection) return connection
  return t(`domain.${code}`, { ns: 'errors', defaultValue: String(code), ...params })
}

export function translateGraphIssueMessage(issue: GraphIssue, t: TFunction): string {
  const completenessKey = `completenessMessages.${issue.code}`
  const completeness = t(completenessKey, { ns: 'health', defaultValue: '' })
  if (completeness && issue.personIds?.length) {
    const personName = issue.message.split(':')[0]?.trim() ?? t('unknown', { ns: 'common' })
    return t('issueLine', { ns: 'health', person: personName, message: completeness })
  }

  switch (issue.code) {
    case 'UNKNOWN_GENDER':
      return t('graphIssue.unknownGender', {
        ns: 'health',
        name: issue.message.replace(/ has unknown gender$/, ''),
      })
    case 'DISCONNECTED_PERSON':
      return t('graphIssue.disconnected', {
        ns: 'health',
        name: issue.message.replace(/ has no relationships$/, ''),
      })
    case 'MISSING_PERSON':
      return t('graphIssue.missingPerson', {
        ns: 'health',
        id: issue.relationshipId ?? '',
      })
    case 'CROSS_FAMILY':
      return t('graphIssue.crossFamily', { ns: 'health', id: issue.relationshipId ?? '' })
    case 'SELF_RELATIONSHIP':
      return t('graphIssue.selfRelationship', { ns: 'health', id: issue.relationshipId ?? '' })
    case 'DUPLICATE_RELATIONSHIP':
      return t('graphIssue.duplicateRelationship', {
        ns: 'health',
        id: issue.relationshipId ?? '',
      })
    default:
      break
  }

  const presentation = t(`issues.${issue.code}.title`, { ns: 'health', defaultValue: '' })
  if (presentation) return issue.message.includes(':') ? issue.message : presentation
  return issue.message
}

export function translateFirebaseAuthError(message: string, t: TFunction): string {
  const code = message.match(/\((auth\/[^)]+)\)/)?.[1]
  if (!code) return t('authFailed', { ns: 'errors' })
  const key = code.replace('auth/', '')
  const translated = t(`auth.${key}`, { ns: 'errors', defaultValue: '' })
  return translated || message
}

export function translateBackupError(error: string, t: TFunction): string {
  const map: Record<string, string> = {
    'Backup is not an object': 'NOT_OBJECT',
    'Unsupported backup schema version': 'UNSUPPORTED_VERSION',
    'Backup missing required sections': 'MISSING_SECTIONS',
    'Backup contains cross-family people': 'CROSS_FAMILY_PEOPLE',
    'Backup contains cross-family relationships': 'CROSS_FAMILY_RELATIONSHIPS',
  }
  const code = map[error]
  if (code) return t(`backup.${code}`, { ns: 'errors' })
  return error
}

export function translateConnectionLabel(
  labelKey: string,
  params: { name: string },
  t: TFunction,
): string {
  return t(labelKey, { ns: 'tree', ...params })
}

export function translateConnectionReason(
  reasonCode: ConnectionBlockReason | null,
  t: TFunction,
): string | null {
  if (!reasonCode) return null
  return translateDomainErrorCode(reasonCode, t)
}

export function translateDuplicateReason(
  percent: number,
  birthClose: boolean,
  t: TFunction,
): string {
  return t('duplicate.reason', {
    ns: 'errors',
    percent: Math.round(percent),
    birthSuffix: birthClose ? t('duplicate.birthClose', { ns: 'errors' }) : '',
  })
}
