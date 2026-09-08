import type { FamilyGraph, RelationshipDraft } from './types'
import { findRelationship, getParentLinks } from './family-graph'

export const MAX_PARENTS_PER_CHILD = 2

export type OverwriteOffer =
  | {
      kind: 'replace_parent_link'
      childId: string
      candidates: { relationshipId: string; parentId: string }[]
    }
  | { kind: 'remove_conflicting_link'; relationshipId: string; descriptionCode: string }
  | { kind: 'complete_partial_sibling'; skipRelationshipIds: string[] }

export type OverwriteChoice =
  | { kind: 'replace_parent_link'; relationshipIdToRemove: string }
  | { kind: 'remove_conflicting_link' }
  | { kind: 'complete_partial_sibling' }

export function findConflictingRelationship(graph: FamilyGraph, draft: RelationshipDraft) {
  if (draft.type !== 'parent_child') return undefined
  return findRelationship(graph, {
    type: 'parent_child',
    personAId: draft.personBId,
    personBId: draft.personAId,
    familyId: draft.familyId,
  })
}

export function parentCapOverwrite(
  graph: FamilyGraph,
  drafts: RelationshipDraft[],
): OverwriteOffer | null {
  for (const draft of drafts) {
    if (draft.type !== 'parent_child') continue
    const childId = draft.personBId
    const parents = graph.parentsOf.get(childId) ?? new Set()
    if (parents.has(draft.personAId)) continue
    if (parents.size < MAX_PARENTS_PER_CHILD) continue
    const links = getParentLinks(graph, childId)
    return {
      kind: 'replace_parent_link',
      childId,
      candidates: links.map((link) => ({
        relationshipId: link.relationship.id,
        parentId: link.person.id,
      })),
    }
  }
  return null
}
