import { buildFamilyGraph } from '../../domain/family-graph'
import { validateRelationshipDraft } from '../../domain/validate-relationship'
import type { PersonInput, Relationship } from '../../types'
import { validatePersonInput } from '../../domain/commands'
import { createPerson, deletePersonCascade, getPersonById, updatePerson } from './person-repository'
import { createRelationship, deleteRelationshipById, listRelationshipsForFamily, replaceRelationshipAtomic } from './relationship-repository'

export async function createValidatedRelationship(
  familyId: string,
  people: import('../../types').Person[],
  relationships: Relationship[],
  draft: {
    type: Relationship['type']
    personAId: string
    personBId: string
  },
): Promise<string> {
  const graph = buildFamilyGraph(familyId, people, relationships)
  const result = validateRelationshipDraft(graph, {
    type: draft.type,
    personAId: draft.personAId,
    personBId: draft.personBId,
    familyId,
  })
  if (!result.ok) throw new Error(result.error.message)

  return createRelationship({
    familyId,
    type: draft.type,
    personAId: draft.personAId,
    personBId: draft.personBId,
    marriage: null,
    marriagePlace: null,
    endDate: null,
    endReason: null,
    confidence: 'manual',
    importMeta: null,
  })
}

export async function deletePersonWithRelationships(
  familyId: string,
  personId: string,
): Promise<void> {
  const person = await getPersonById(personId)
  if (!person || person.familyId !== familyId) {
    throw new Error('Person not found in family')
  }
  const relationships = await listRelationshipsForFamily(familyId)
  const incident = relationships.filter(
    (r) => r.personAId === personId || r.personBId === personId,
  )
  await deletePersonCascade(personId, incident.map((r) => r.id))
}

export async function saveValidatedPerson(
  personId: string | null,
  input: PersonInput,
  userId: string | null,
): Promise<string> {
  const plan = validatePersonInput(input)
  if (plan.errors.length > 0) throw new Error(plan.errors[0].message)
  if (personId) {
    await updatePerson(personId, input)
    return personId
  }
  return createPerson(input, userId)
}

export async function changeRelationshipType(
  familyId: string,
  people: import('../../types').Person[],
  relationships: Relationship[],
  relationshipId: string,
  newType: Relationship['type'],
): Promise<string> {
  const rel = relationships.find((r) => r.id === relationshipId)
  if (!rel) throw new Error('Relationship not found')
  const graph = buildFamilyGraph(familyId, people, relationships.filter((r) => r.id !== relationshipId))
  const result = validateRelationshipDraft(graph, {
    type: newType,
    personAId: rel.personAId,
    personBId: rel.personBId,
    familyId,
  })
  if (!result.ok) throw new Error(result.error.message)

  return replaceRelationshipAtomic(relationshipId, {
    familyId: rel.familyId,
    type: newType,
    personAId: rel.personAId,
    personBId: rel.personBId,
    marriage: rel.marriage,
    marriagePlace: rel.marriagePlace,
    endDate: rel.endDate,
    endReason: rel.endReason,
    confidence: rel.confidence,
    importMeta: rel.importMeta,
  })
}

export async function disconnectRelationship(relationshipId: string): Promise<void> {
  await deleteRelationshipById(relationshipId)
}
