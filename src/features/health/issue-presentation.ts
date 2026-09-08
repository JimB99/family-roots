import type { TFunction } from 'i18next'
import type { GraphIssue } from '../../domain/types'

export type IssueSeverity = 'error' | 'warning' | 'info'

export interface IssuePresentation {
  title: string
  severity: IssueSeverity
  explanation: string
}

const SEVERITY_BY_CODE: Record<string, IssueSeverity> = {
  MISSING_PERSON: 'error',
  CROSS_FAMILY: 'error',
  SELF_RELATIONSHIP: 'error',
  ANCESTRY_CYCLE: 'error',
  CONFLICTING_DIRECTION: 'error',
  BIOLOGICALLY_IMPLAUSIBLE_DATE: 'warning',
  INVALID_DATE: 'warning',
  DUPLICATE_RELATIONSHIP: 'warning',
  GENERATION_CONFLICT: 'warning',
  DISCONNECTED_PERSON: 'warning',
  UNKNOWN_GENDER: 'info',
  MISSING_GIVEN_NAMES: 'warning',
  MISSING_FAMILY_NAME: 'warning',
  MISSING_MAIDEN_NAME: 'info',
  MISSING_BIRTH_DATE: 'warning',
  MISSING_DEATH_DATE: 'warning',
  MISSING_BIRTH_PLACE: 'info',
  MISSING_DEATH_PLACE: 'info',
  MISSING_LIVING_STATUS: 'info',
  MISSING_PHOTO: 'info',
  MISSING_NOTES: 'info',
}

export function presentIssue(code: string, t: TFunction): IssuePresentation {
  const title = t(`issues.${code}.title`, { ns: 'health', defaultValue: '' })
  const explanation = t(`issues.${code}.explanation`, { ns: 'health', defaultValue: '' })
  if (title && explanation) {
    return {
      title,
      explanation,
      severity: SEVERITY_BY_CODE[code] ?? 'warning',
    }
  }
  return {
    title: t('issues.fallback.title', { ns: 'health' }),
    explanation: t('issues.fallback.explanation', { ns: 'health' }),
    severity: 'warning',
  }
}

export interface IssueGroup {
  code: string
  title: string
  severity: IssueSeverity
  explanation: string
  issues: GraphIssue[]
}

const SEVERITY_ORDER: Record<IssueSeverity, number> = { error: 0, warning: 1, info: 2 }

export function groupIssues(issues: GraphIssue[], t: TFunction): IssueGroup[] {
  const byCode = new Map<string, GraphIssue[]>()
  for (const issue of issues) {
    const list = byCode.get(issue.code)
    if (list) list.push(issue)
    else byCode.set(issue.code, [issue])
  }

  return [...byCode.entries()]
    .map(([code, list]) => {
      const presentation = presentIssue(code, t)
      return { code, ...presentation, issues: list }
    })
    .sort((a, b) => {
      const bySeverity = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
      if (bySeverity !== 0) return bySeverity
      return b.issues.length - a.issues.length
    })
}

export function actionableIssueCount(issues: GraphIssue[], t: TFunction): number {
  return issues.filter((issue) => presentIssue(issue.code, t).severity !== 'info').length
}
