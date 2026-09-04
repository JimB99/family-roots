import { relationshipKey } from './relationship-key'
import type { CommandPlan, FamilyGraph, PersonId, RelationshipDraft } from './types'
import { validateRelationshipDraft } from './validate-relationship'
import { findRelationship } from './family-graph'
import {
  findConflictingRelationship,
  parentCapOverwrite,
  type OverwriteChoice,
  type OverwriteOffer,
} from './connection-overwrite'

export type { OverwriteChoice, OverwriteOffer } from './connection-overwrite'
export { MAX_PARENTS_PER_CHILD } from './connection-overwrite'

export type ConnectionKind = 'child' | 'parent' | 'spouse' | 'sibling'

export interface ConnectionOption {
  kind: ConnectionKind
  label: string
  available: boolean
  reason: string | null
  drafts: RelationshipDraft[]
  overwrite?: OverwriteOffer
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

function uniqueDrafts(drafts: RelationshipDraft[]): RelationshipDraft[] {
  const seen = new Set<string>()
  const unique: RelationshipDraft[] = []
  for (const draft of drafts) {
    const key = relationshipKey(draft.type, draft.personAId, draft.personBId)
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(draft)
  }
  return unique
}

function overwriteForValidationError(
  graph: FamilyGraph,
  draft: RelationshipDraft,
  code: string,
): OverwriteOffer | undefined {
  if (code !== 'CONFLICTING_DIRECTION') return undefined
  const reverse = findConflictingRelationship(graph, draft)
  if (!reverse) return undefined
  return {
    kind: 'remove_conflicting_link',
    relationshipId: reverse.id,
    description: 'The opposite parent-child direction already exists',
  }
}

function evaluateDrafts(
  graph: FamilyGraph,
  drafts: RelationshipDraft[],
): { reason: string; overwrite?: OverwriteOffer } | null {
  for (const draft of drafts) {
    const result = validateRelationshipDraft(graph, draft)
    if (!result.ok) {
      return {
        reason: result.error.message,
        overwrite: overwriteForValidationError(graph, draft, result.error.code),
      }
    }
  }

  const parentCap = parentCapOverwrite(graph, drafts)
  if (parentCap) {
    return {
      reason: 'This person already has two parents',
      overwrite: parentCap,
    }
  }

  return null
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
    const drafts = uniqueDrafts(draftsFor(kind, graph, sourceId, targetId, familyId))
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

    if (kind === 'sibling') {
      const missing: RelationshipDraft[] = []
      const skipRelationshipIds: string[] = []
      for (const draft of drafts) {
        const existing = findRelationship(graph, draft)
        if (existing) skipRelationshipIds.push(existing.id)
        else missing.push(draft)
      }

      if (missing.length === 0) {
        return {
          kind,
          label,
          available: false,
          reason: 'An equivalent relationship already exists',
          drafts,
        }
      }

      const blocked = evaluateDrafts(graph, missing)
      if (blocked) {
        return { kind, label, available: false, reason: blocked.reason, drafts: missing, overwrite: blocked.overwrite }
      }

      if (skipRelationshipIds.length > 0) {
        return {
          kind,
          label,
          available: false,
          reason: 'Some sibling parent links already exist',
          drafts: missing,
          overwrite: { kind: 'complete_partial_sibling', skipRelationshipIds },
        }
      }

      return { kind, label, available: true, reason: null, drafts: missing }
    }

    const blocked = evaluateDrafts(graph, drafts)
    if (blocked) {
      return { kind, label, available: false, reason: blocked.reason, drafts, overwrite: blocked.overwrite }
    }

    return { kind, label, available: true, reason: null, drafts }
  })
}

export function buildConnectionPlan(
  option: ConnectionOption,
  extras: { deleteRelationshipIds?: string[] } = {},
): CommandPlan {
  const plan: CommandPlan = { writes: [], deletes: [], warnings: [], errors: [] }

  if (!option.available) {
    plan.errors.push({
      code: 'INVALID_RELATIONSHIP_TYPE',
      message: option.reason ?? 'This connection is not allowed',
    })
    return plan
  }

  for (const id of extras.deleteRelationshipIds ?? []) {
    plan.deletes.push({ collection: 'relationships', id })
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

export function resolveOverwritePlan(
  _graph: FamilyGraph,
  option: ConnectionOption,
  choice: OverwriteChoice,
): CommandPlan {
  const offer = option.overwrite
  if (!offer || offer.kind !== choice.kind) {
    return {
      writes: [],
      deletes: [],
      warnings: [],
      errors: [{ code: 'INVALID_RELATIONSHIP_TYPE', message: 'This connection cannot be overwritten' }],
    }
  }

  if (choice.kind === 'replace_parent_link') {
    if (offer.kind !== 'replace_parent_link') {
      return {
        writes: [],
        deletes: [],
        warnings: [],
        errors: [{ code: 'INVALID_RELATIONSHIP_TYPE', message: 'This connection cannot be overwritten' }],
      }
    }
    const allowed = offer.candidates.some((c) => c.relationshipId === choice.relationshipIdToRemove)
    if (!allowed) {
      return {
        writes: [],
        deletes: [],
        warnings: [],
        errors: [{ code: 'INVALID_RELATIONSHIP_TYPE', message: 'Choose an existing parent link to replace' }],
      }
    }
    return buildConnectionPlan({ ...option, available: true }, {
      deleteRelationshipIds: [choice.relationshipIdToRemove],
    })
  }

  if (choice.kind === 'remove_conflicting_link') {
    if (offer.kind !== 'remove_conflicting_link') {
      return {
        writes: [],
        deletes: [],
        warnings: [],
        errors: [{ code: 'INVALID_RELATIONSHIP_TYPE', message: 'This connection cannot be overwritten' }],
      }
    }
    return buildConnectionPlan({ ...option, available: true }, {
      deleteRelationshipIds: [offer.relationshipId],
    })
  }

  return buildConnectionPlan({ ...option, available: true })
}

export function planDeleteRelationships(relationshipIds: string[]): CommandPlan {
  return {
    writes: [],
    deletes: relationshipIds.map((id) => ({ collection: 'relationships' as const, id })),
    warnings: [],
    errors: [],
  }
}
