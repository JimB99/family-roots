/**
 * Legacy bridge for pages still importing from lib/firestore.
 * New code should use src/data/firestore/* repositories directly.
 */
export {
  listFamilies,
  listFamiliesForEditor,
  getFamilyBySlug,
  getFamilyById,
  createFamily,
  renameFamily,
  addPendingInvite,
  revokePendingInvite,
  createInvite,
  revokeInvite,
  claimInvite,
  claimInviteToken,
  regenerateViewKey,
  ensureViewKey,
  removeEditor,
  transferOwnership,
  syncUserFamilyIndex,
} from '../data/firestore/family-repository'

export {
  listPeopleForFamily as getPeopleForFamily,
  getPersonById as getPerson,
  createPerson,
  updatePerson,
} from '../data/firestore/person-repository'

export {
  listRelationshipsForFamily as getRelationshipsForFamily,
  createRelationship,
  deleteRelationshipById as deleteRelationship,
  replaceRelationshipAtomic,
} from '../data/firestore/relationship-repository'

export {
  createValidatedRelationship,
  deletePersonWithRelationships,
  saveValidatedPerson,
  changeRelationshipType,
  disconnectRelationship,
} from '../data/firestore/family-mutations'

import { listPeopleForFamily } from '../data/firestore/person-repository'
import { listRelationshipsForFamily } from '../data/firestore/relationship-repository'

export async function getPeopleForFamilyResolved(familyId: string, slug: string) {
  const byId = await listPeopleForFamily(familyId)
  if (byId.length > 0) return byId
  if (slug !== familyId) return listPeopleForFamily(slug)
  return byId
}

export async function getRelationshipsForFamilyResolved(familyId: string, slug: string) {
  const byId = await listRelationshipsForFamily(familyId)
  if (byId.length > 0) return byId
  if (slug !== familyId) return listRelationshipsForFamily(slug)
  return byId
}

export async function savePerson(
  id: string | null,
  input: import('../types').PersonInput,
  userId: string | null,
) {
  const { saveValidatedPerson } = await import('../data/firestore/family-mutations')
  return saveValidatedPerson(id, input, userId)
}

export async function saveRelationship(
  id: string | null,
  data: Omit<import('../types').Relationship, 'id' | 'createdAt' | 'updatedAt'>,
) {
  const { createValidatedRelationship } = await import('../data/firestore/family-mutations')
  if (id) throw new Error('Use repository replace for relationship updates')
  const people = await listPeopleForFamily(data.familyId)
  const relationships = await listRelationshipsForFamily(data.familyId)
  return createValidatedRelationship(data.familyId, people, relationships, {
    type: data.type,
    personAId: data.personAId,
    personBId: data.personBId,
  })
}

export async function deletePerson(id: string) {
  const person = await import('../data/firestore/person-repository').then((m) => m.getPersonById(id))
  if (!person) return
  const { deletePersonWithRelationships } = await import('../data/firestore/family-mutations')
  await deletePersonWithRelationships(person.familyId, id)
}

export async function confirmRelationship(id: string) {
  const { updateDoc, doc, serverTimestamp } = await import('firebase/firestore')
  const { db } = await import('./firebase')
  await updateDoc(doc(db, 'relationships', id), {
    confidence: 'manual',
    updatedAt: serverTimestamp(),
  })
}

export async function confirmAllRelationships(familyId: string) {
  const relationships = await listRelationshipsForFamily(familyId)
  let count = 0
  for (const rel of relationships) {
    if (rel.confidence === 'imported' || rel.confidence === 'low') {
      await confirmRelationship(rel.id)
      count++
    }
  }
  return count
}

export async function listLowConfidenceRelationships(familyId: string) {
  const relationships = await listRelationshipsForFamily(familyId)
  return relationships.filter((r) => r.confidence === 'imported' || r.confidence === 'low')
}
