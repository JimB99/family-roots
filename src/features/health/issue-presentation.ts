import type { GraphIssue } from '../../domain/types'

export type IssueSeverity = 'error' | 'warning' | 'info'

interface IssuePresentation {
  title: string
  severity: IssueSeverity
  explanation: string
}

const PRESENTATION: Record<string, IssuePresentation> = {
  MISSING_PERSON: {
    title: 'Connection points at a missing person',
    severity: 'error',
    explanation: 'The link refers to someone who is no longer in this family. Remove the link.',
  },
  CROSS_FAMILY: {
    title: 'Connection crosses two families',
    severity: 'error',
    explanation: 'Both people in a connection must belong to the same family.',
  },
  SELF_RELATIONSHIP: {
    title: 'Person linked to themselves',
    severity: 'error',
    explanation: 'A person cannot be their own parent, child or partner.',
  },
  ANCESTRY_CYCLE: {
    title: 'Circular ancestry',
    severity: 'error',
    explanation: 'Someone ends up being their own ancestor. Check the parent links along this line.',
  },
  CONFLICTING_DIRECTION: {
    title: 'Parent and child are reversed somewhere',
    severity: 'error',
    explanation: 'The same pair is recorded as parent to child in both directions.',
  },
  BIOLOGICALLY_IMPLAUSIBLE_DATE: {
    title: 'Birth dates do not line up',
    severity: 'warning',
    explanation: 'A parent is recorded as born too close to, or after, their child.',
  },
  INVALID_DATE: {
    title: 'Date cannot be read',
    severity: 'warning',
    explanation: 'Use a year, year-month or full date, for example 1956-07-16.',
  },
  DUPLICATE_RELATIONSHIP: {
    title: 'Duplicate connection',
    severity: 'warning',
    explanation: 'The same connection is recorded more than once. Remove the extra one.',
  },
  GENERATION_CONFLICT: {
    title: 'Generations conflict',
    severity: 'warning',
    explanation: 'This person appears in two different generations at once.',
  },
  DISCONNECTED_PERSON: {
    title: 'Not connected to anyone',
    severity: 'warning',
    explanation: 'This person has no parents, children or partners yet, so they float on their own.',
  },
  UNKNOWN_GENDER: {
    title: 'Gender not recorded',
    severity: 'info',
    explanation: 'Optional, but recording it makes the tree easier to read at a glance.',
  },
}

const FALLBACK: IssuePresentation = {
  title: 'Needs a look',
  severity: 'warning',
  explanation: 'Something about this record does not add up.',
}

export function presentIssue(code: string): IssuePresentation {
  return PRESENTATION[code] ?? FALLBACK
}

export interface IssueGroup {
  code: string
  title: string
  severity: IssueSeverity
  explanation: string
  issues: GraphIssue[]
}

const SEVERITY_ORDER: Record<IssueSeverity, number> = { error: 0, warning: 1, info: 2 }

export function groupIssues(issues: GraphIssue[]): IssueGroup[] {
  const byCode = new Map<string, GraphIssue[]>()
  for (const issue of issues) {
    const list = byCode.get(issue.code)
    if (list) list.push(issue)
    else byCode.set(issue.code, [issue])
  }

  return [...byCode.entries()]
    .map(([code, list]) => {
      const presentation = presentIssue(code)
      return { code, ...presentation, issues: list }
    })
    .sort((a, b) => {
      const bySeverity = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
      if (bySeverity !== 0) return bySeverity
      return b.issues.length - a.issues.length
    })
}

/** Issues worth surfacing as a call to action, excluding purely optional ones. */
export function actionableIssueCount(issues: GraphIssue[]): number {
  return issues.filter((issue) => presentIssue(issue.code).severity !== 'info').length
}
