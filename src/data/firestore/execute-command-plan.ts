import type { CommandPlan } from '../../domain/types'
import type { PersonInput, Relationship } from '../../types'
import { getPersonById, createPerson, deletePersonCascade, updatePerson } from './person-repository'
import { listRelationshipsForFamily } from './relationship-repository'
import { createRelationship, deleteRelationshipById } from './relationship-repository'

export interface ExecuteResult {
  createdPersonIds: string[]
  createdRelationshipIds: string[]
}

function personInputFromData(data: Record<string, unknown>): PersonInput {
  return data as PersonInput
}

function relationshipPayload(
  data: Record<string, unknown>,
  newPersonId: string | null,
): Omit<Relationship, 'id' | 'createdAt' | 'updatedAt'> {
  const personAId = (data.personAId as string | null) ?? newPersonId
  const personBId = (data.personBId as string | null) ?? newPersonId
  if (!personAId || !personBId) {
    throw new Error('Relationship missing person ids')
  }
  return {
    familyId: String(data.familyId),
    type: data.type as Relationship['type'],
    personAId,
    personBId,
    marriage: (data.marriage as Relationship['marriage']) ?? null,
    marriagePlace: (data.marriagePlace as string | null) ?? null,
    endDate: (data.endDate as Relationship['endDate']) ?? null,
    endReason: (data.endReason as Relationship['endReason']) ?? null,
    confidence: (data.confidence as Relationship['confidence']) ?? 'manual',
    importMeta: (data.importMeta as Relationship['importMeta']) ?? null,
  }
}

export async function executeCommandPlan(
  plan: CommandPlan,
  userId: string | null,
): Promise<ExecuteResult> {
  if (plan.errors.length > 0) {
    throw new Error(plan.errors[0].message)
  }

  const result: ExecuteResult = { createdPersonIds: [], createdRelationshipIds: [] }

  for (const del of plan.deletes) {
    if (del.collection !== 'relationships') continue
    await deleteRelationshipById(del.id)
  }

  for (const del of plan.deletes) {
    if (del.collection !== 'people') continue
    const person = await getPersonById(del.id)
    if (!person) continue
    const rels = await listRelationshipsForFamily(person.familyId)
    const incident = rels
      .filter((r) => r.personAId === del.id || r.personBId === del.id)
      .map((r) => r.id)
    await deletePersonCascade(del.id, incident)
  }

  let newPersonId: string | null = null
  for (const write of plan.writes) {
    if (write.collection !== 'people') continue
    const input = personInputFromData(write.data)
    if (write.id) {
      await updatePerson(write.id, input)
    } else {
      const id = await createPerson(input, userId)
      newPersonId = id
      result.createdPersonIds.push(id)
    }
  }

  for (const write of plan.writes) {
    if (write.collection !== 'relationships') continue
    const payload = relationshipPayload(write.data, newPersonId)
    const id = await createRelationship(payload)
    result.createdRelationshipIds.push(id)
  }

  return result
}

export function planReconnectRelationship(rel: Relationship): CommandPlan {
  return {
    writes: [
      {
        collection: 'relationships',
        data: {
          familyId: rel.familyId,
          type: rel.type,
          personAId: rel.personAId,
          personBId: rel.personBId,
          marriage: rel.marriage,
          marriagePlace: rel.marriagePlace,
          endDate: rel.endDate,
          endReason: rel.endReason,
          confidence: rel.confidence,
          importMeta: rel.importMeta,
        },
      },
    ],
    deletes: [],
    warnings: [],
    errors: [],
  }
}

export function planUndoChangeRelationshipType(
  newRelationshipId: string,
  original: Relationship,
): CommandPlan {
  return {
    deletes: [{ collection: 'relationships', id: newRelationshipId }],
    writes: [
      {
        collection: 'relationships',
        data: {
          familyId: original.familyId,
          type: original.type,
          personAId: original.personAId,
          personBId: original.personBId,
          marriage: original.marriage,
          marriagePlace: original.marriagePlace,
          endDate: original.endDate,
          endReason: original.endReason,
          confidence: original.confidence,
          importMeta: original.importMeta,
        },
      },
    ],
    warnings: [],
    errors: [],
  }
}
