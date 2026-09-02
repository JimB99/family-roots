import type { PersonInput } from '../types'
import { validatePartialDate } from './date-validation'
import { relationshipKey } from './relationship-key'
import type { FamilyGraph, RelationshipDraft, CommandPlan } from './types'
import { validateRelationshipDraft } from './validate-relationship'

export type RelativeKind = 'child' | 'parent' | 'spouse' | 'sibling'

export interface AddRelativeInput {
  anchorPersonId: string
  kind: RelativeKind
  familyId: string
  newPerson?: PersonInput
  existingPersonId?: string
}

export function planAddRelative(graph: FamilyGraph, input: AddRelativeInput): CommandPlan {
  const plan: CommandPlan = { writes: [], deletes: [], warnings: [], errors: [] }
  const anchor = graph.peopleById.get(input.anchorPersonId)
  if (!anchor) {
    plan.errors.push({ code: 'MISSING_PERSON', message: 'Anchor person not found' })
    return plan
  }

  if (input.newPerson) {
    plan.writes.push({
      collection: 'people',
      data: { ...input.newPerson, familyId: input.familyId },
    })
  }

  const targetId = input.existingPersonId ?? '__new_person__'

  const drafts: RelationshipDraft[] = []

  switch (input.kind) {
    case 'child':
      drafts.push({
        type: 'parent_child',
        personAId: input.anchorPersonId,
        personBId: targetId,
        familyId: input.familyId,
      })
      break
    case 'parent':
      drafts.push({
        type: 'parent_child',
        personAId: targetId,
        personBId: input.anchorPersonId,
        familyId: input.familyId,
      })
      break
    case 'spouse':
      drafts.push({
        type: 'spouse',
        personAId: input.anchorPersonId,
        personBId: targetId,
        familyId: input.familyId,
      })
      break
    case 'sibling':
      const parents = graph.parentsOf.get(input.anchorPersonId) ?? new Set()
      if (parents.size === 0) {
        plan.errors.push({
          code: 'MISSING_PERSON',
          message: 'Cannot add sibling without known parents',
        })
        return plan
      }
      for (const parentId of parents) {
        drafts.push({
          type: 'parent_child',
          personAId: parentId,
          personBId: targetId,
          familyId: input.familyId,
        })
      }
      break
  }

  for (const draft of drafts) {
    if (draft.personBId === '__new_person__' || draft.personAId === '__new_person__') continue
    const result = validateRelationshipDraft(graph, draft)
    if (!result.ok) plan.errors.push(result.error)
  }

  if (plan.errors.length === 0) {
    for (const draft of drafts) {
      plan.writes.push({
        collection: 'relationships',
        data: {
          type: draft.type,
          personAId: draft.personAId === '__new_person__' ? null : draft.personAId,
          personBId: draft.personBId === '__new_person__' ? null : draft.personBId,
          familyId: draft.familyId,
          confidence: 'manual',
        },
      })
    }
  }

  return plan
}

export function planConnectPeople(
  graph: FamilyGraph,
  draft: RelationshipDraft,
): CommandPlan {
  const plan: CommandPlan = { writes: [], deletes: [], warnings: [], errors: [] }
  const result = validateRelationshipDraft(graph, draft)
  if (!result.ok) {
    plan.errors.push(result.error)
    return plan
  }
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
  return plan
}

export function planChangeRelationshipType(
  graph: FamilyGraph,
  relationshipId: string,
  newType: 'spouse' | 'parent_child',
): CommandPlan {
  const plan: CommandPlan = { writes: [], deletes: [], warnings: [], errors: [] }
  const rel = graph.relationshipsById.get(relationshipId)
  if (!rel) {
    plan.errors.push({ code: 'MISSING_PERSON', message: 'Relationship not found' })
    return plan
  }

  const draft: RelationshipDraft = {
    type: newType,
    personAId: rel.personAId,
    personBId: rel.personBId,
    familyId: rel.familyId,
  }

  plan.deletes.push({ collection: 'relationships', id: relationshipId })
  const result = validateRelationshipDraft(graph, draft)
  if (!result.ok) {
    plan.errors.push(result.error)
    return plan
  }

  plan.writes.push({
    collection: 'relationships',
    data: {
      type: newType,
      personAId: rel.personAId,
      personBId: rel.personBId,
      familyId: rel.familyId,
      confidence: 'manual',
    },
  })
  return plan
}

export function planDisconnectRelationship(relationshipId: string): CommandPlan {
  return {
    writes: [],
    deletes: [{ collection: 'relationships', id: relationshipId }],
    warnings: [],
    errors: [],
  }
}

export function validatePersonInput(input: PersonInput): CommandPlan {
  const plan: CommandPlan = { writes: [], deletes: [], warnings: [], errors: [] }
  const birth = validatePartialDate(input.birth)
  if (!birth.ok) plan.errors.push(birth.error)
  const death = validatePartialDate(input.death)
  if (!death.ok) plan.errors.push(death.error)
  return plan
}

export function planMergePeople(
  graph: FamilyGraph,
  sourceId: string,
  targetId: string,
  fieldChoices: Partial<PersonInput>,
): CommandPlan {
  const plan: CommandPlan = { writes: [], deletes: [], warnings: [], errors: [] }
  const source = graph.peopleById.get(sourceId)
  const target = graph.peopleById.get(targetId)
  if (!source || !target) {
    plan.errors.push({ code: 'MISSING_PERSON', message: 'Merge targets must exist' })
    return plan
  }

  plan.writes.push({
    collection: 'people',
    id: targetId,
    data: { ...fieldChoices, familyId: target.familyId },
  })

  for (const rel of graph.relationshipsById.values()) {
    if (rel.personAId !== sourceId && rel.personBId !== sourceId) continue
    const newA = rel.personAId === sourceId ? targetId : rel.personAId
    const newB = rel.personBId === sourceId ? targetId : rel.personBId
    if (newA === newB) {
      plan.deletes.push({ collection: 'relationships', id: rel.id })
      continue
    }
    const key = relationshipKey(rel.type, newA, newB)
    const duplicate = [...graph.relationshipsById.values()].some(
      (other) =>
        other.id !== rel.id && relationshipKey(other.type, other.personAId, other.personBId) === key,
    )
    plan.deletes.push({ collection: 'relationships', id: rel.id })
    if (!duplicate) {
      plan.writes.push({
        collection: 'relationships',
        data: {
          type: rel.type,
          personAId: newA,
          personBId: newB,
          familyId: rel.familyId,
          confidence: rel.confidence,
        },
      })
    }
  }

  plan.deletes.push({ collection: 'people', id: sourceId })
  return plan
}
