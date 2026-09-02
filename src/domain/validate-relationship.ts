import type { Person, Relationship } from '../types'
import { isBiologicallyPlausibleParentChild } from './date-validation'
import { buildFamilyGraph, wouldCreateAncestryCycle } from './family-graph'
import { relationshipKey } from './relationship-key'
import type { DomainError, FamilyGraph, RelationshipDraft, Result } from './types'
import { err, ok } from './types'

export function validateRelationshipDraft(
  graph: FamilyGraph,
  draft: RelationshipDraft,
  existingId?: string,
): Result<RelationshipDraft> {
  if (draft.personAId === draft.personBId) {
    return err('SELF_RELATIONSHIP', 'A person cannot relate to themselves')
  }

  const a = graph.peopleById.get(draft.personAId)
  const b = graph.peopleById.get(draft.personBId)
  if (!a || !b) {
    return err('MISSING_PERSON', 'Both relationship endpoints must exist')
  }

  if (a.familyId !== draft.familyId || b.familyId !== draft.familyId) {
    return err('CROSS_FAMILY', 'Relationship endpoints must belong to the same family')
  }

  const key = relationshipKey(draft.type, draft.personAId, draft.personBId)
  if (graph.relationshipKeys.has(key)) {
  const duplicate = [...graph.relationshipsById.values()].find(
    (r) => r.id !== existingId && relationshipKey(r.type, r.personAId, r.personBId) === key,
  )
    if (duplicate) {
      return err('DUPLICATE_RELATIONSHIP', 'An equivalent relationship already exists')
    }
  }

  if (draft.type === 'parent_child') {
    const reverseKey = relationshipKey('parent_child', draft.personBId, draft.personAId)
    if (graph.relationshipKeys.has(reverseKey)) {
      return err('CONFLICTING_DIRECTION', 'Opposite parent-child direction already exists')
    }
    if (wouldCreateAncestryCycle(graph, draft.personAId, draft.personBId)) {
      return err('ANCESTRY_CYCLE', 'This parent-child link would create an ancestry cycle')
    }
    if (!isBiologicallyPlausibleParentChild(a.birth, b.birth)) {
      return err('BIOLOGICALLY_IMPLAUSIBLE_DATE', 'Parent and child birth dates are implausible')
    }
  }

  return ok(draft)
}

export function validateRelationshipUpdate(
  graph: FamilyGraph,
  relationship: Relationship,
  updates: Partial<Pick<Relationship, 'personAId' | 'personBId' | 'type' | 'familyId'>>,
): Result<Relationship> {
  if (updates.familyId && updates.familyId !== relationship.familyId) {
    return err('CROSS_FAMILY', 'Cannot move relationship to another family')
  }

  const merged: Relationship = {
    ...relationship,
    ...updates,
    familyId: relationship.familyId,
  }

  const draft: RelationshipDraft = {
    type: merged.type,
    personAId: merged.personAId,
    personBId: merged.personBId,
    familyId: merged.familyId,
  }

  const result = validateRelationshipDraft(graph, draft, relationship.id)
  if (!result.ok) return result
  return ok(merged)
}

export function buildGraphFromPeople(
  familyId: string,
  people: Person[],
  relationships: Relationship[],
): FamilyGraph {
  return buildFamilyGraph(familyId, people, relationships)
}

export function collectRelationshipErrors(
  graph: FamilyGraph,
): DomainError[] {
  return graph.issues
    .filter((i) => i.code !== 'UNKNOWN_GENDER' && i.code !== 'DISCONNECTED_PERSON')
    .map((i) => ({ code: i.code as DomainError['code'], message: i.message }))
}
