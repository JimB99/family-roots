import { buildFamilyGraph } from '../domain/family-graph'
import type { FamilyGraph, GraphIssue } from '../domain/types'

export interface DataHealthReport {
  issues: GraphIssue[]
  disconnectedCount: number
  duplicateCount: number
  cycleCount: number
  uncertainLinkCount: number
}

export function auditFamilyGraph(graph: FamilyGraph): DataHealthReport {
  const issues = [...graph.issues]
  const uncertainLinkCount = [...graph.relationshipsById.values()].filter(
    (r) => r.confidence === 'imported' || r.confidence === 'low',
  ).length

  return {
    issues,
    disconnectedCount: issues.filter((i) => i.code === 'DISCONNECTED_PERSON').length,
    duplicateCount: issues.filter((i) => i.code === 'DUPLICATE_RELATIONSHIP').length,
    cycleCount: issues.filter((i) => i.code === 'ANCESTRY_CYCLE').length,
    uncertainLinkCount,
  }
}

export function auditFamily(
  familyId: string,
  people: import('../types').Person[],
  relationships: import('../types').Relationship[],
): DataHealthReport {
  const graph = buildFamilyGraph(familyId, people, relationships)
  return auditFamilyGraph(graph)
}
