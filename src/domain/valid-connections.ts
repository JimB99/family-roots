import { relationshipKey } from './relationship-key'
import type { CommandPlan, FamilyGraph, PersonId, RelationshipDraft } from './types'
import { validateRelationshipDraft } from './validate-relationship'

export type ConnectionKind = 'child' | 'parent' | 'spouse' | 'sibling'

export interface ConnectionOption {
  kind: ConnectionKind
  label: string
  available: boolean
  reason: string | null
  drafts: RelationshipDraft[]
}

const KIND_ORDER: ConnectionKind[] = ['child', 'parent', 'spouse', 'sibling']

function draftsFor(
  kind: ConnectionKind,
  graph: FamilyGraph,
  sourceId: PersonId,
  targetId: PersonId,
  familyId: string,
): RelationshipDraft[] {
  switch (kind) {
    case 'child':
      return [{ type: 'parent_child', personAId: targetId, personBId: sourceId, familyId }]
    case 'parent':
      return [{ type: 'parent_child', personAId: sourceId, personBId: targetId, familyId }]
    case 'spouse':
      return [{ type: 'spouse', personAId: sourceId, personBId: targetId, familyId }]
    case 'sibling': {
      const parents = [...(graph.parentsOf.get(targetId) ?? [])].sort()
      return parents.map((parentId) => ({
        type: 'parent_child' as const,
        personAId: parentId,
        personBId: sourceId,
        familyId,
      }))
    }
  }
}

function labelFor(kind: ConnectionKind, targetName: string): string {
  switch (kind) {
    case 'child':
      return `Child of ${targetName}`
    case 'parent':
      return `Parent of ${targetName}`
    case 'spouse':
      return `Married to ${targetName}`
    case 'sibling':
      return `Sibling of ${targetName}`
  }
}

/**
 * Builds every relationship a dragged person could form with a drop target and
 * marks each one available or blocked using the same validation the write path
 * uses, so the drop menu can never offer an option the write would reject.
 */
export function getConnectionOptions(
  graph: FamilyGraph,
  sourceId: PersonId,
  targetId: PersonId,
  targetName: string,
): ConnectionOption[] {
  const familyId = graph.familyId

  if (sourceId === targetId) return []

  return KIND_ORDER.map((kind) => {
    const drafts = draftsFor(kind, graph, sourceId, targetId, familyId)
    const label = labelFor(kind, targetName)

    if (drafts.length === 0) {
      return {
        kind,
        label,
        available: false,
        reason:
          kind === 'sibling'
            ? 'No parents recorded for this person yet'
            : 'Not possible for this pair',
        drafts,
      }
    }

    const seen = new Set<string>()
    for (const draft of drafts) {
      const key = relationshipKey(draft.type, draft.personAId, draft.personBId)
      if (seen.has(key)) continue
      seen.add(key)
      const result = validateRelationshipDraft(graph, draft)
      if (!result.ok) {
        return { kind, label, available: false, reason: result.error.message, drafts }
      }
    }

    return { kind, label, available: true, reason: null, drafts }
  })
}

export function buildConnectionPlan(option: ConnectionOption): CommandPlan {
  const plan: CommandPlan = { writes: [], deletes: [], warnings: [], errors: [] }

  if (!option.available) {
    plan.errors.push({
      code: 'INVALID_RELATIONSHIP_TYPE',
      message: option.reason ?? 'This connection is not allowed',
    })
    return plan
  }

  for (const draft of option.drafts) {
    plan.writes.push({
      collection: 'relationships',
      data: {
        type: draft.type,
        personAId: draft.personAId,
        personBId: draft.personBId,
        familyId: draft.familyId,
        confidence: 'manual',
      },
    })
  }

  return plan
}

export function planDeleteRelationships(relationshipIds: string[]): CommandPlan {
  return {
    writes: [],
    deletes: relationshipIds.map((id) => ({ collection: 'relationships' as const, id })),
    warnings: [],
    errors: [],
  }
}
