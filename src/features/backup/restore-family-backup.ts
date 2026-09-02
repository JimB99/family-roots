import {
  collection,
  doc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../../lib/firebase'
import type { FamilyBackup } from './family-backup-schema'
import { listPeopleForFamily } from '../../data/firestore/person-repository'
import { listRelationshipsForFamily } from '../../data/firestore/relationship-repository'

export type RestoreMode = 'replace' | 'merge'

export async function restoreFamilyBackup(
  backup: FamilyBackup,
  mode: RestoreMode,
  userId: string | null,
): Promise<{ people: number; relationships: number }> {
  const familyId = backup.family.id
  const existingPeople = await listPeopleForFamily(familyId)
  const existingRels = await listRelationshipsForFamily(familyId)

  let batch = writeBatch(db)
  let ops = 0
  const flush = async () => {
    if (ops > 0) await batch.commit()
    batch = writeBatch(db)
    ops = 0
  }

  if (mode === 'replace') {
    for (const rel of existingRels) {
      if (ops >= 450) await flush()
      batch.delete(doc(db, 'relationships', rel.id))
      ops++
    }
    for (const person of existingPeople) {
      if (ops >= 450) await flush()
      batch.delete(doc(db, 'people', person.id))
      ops++
    }
    await flush()
  }

  const personIdMap = new Map<string, string>()
  for (const person of backup.people) {
    const existing = mode === 'merge' ? existingPeople.find((p) => p.id === person.id) : null
    const ref = existing ? doc(db, 'people', existing.id) : doc(collection(db, 'people'))
    personIdMap.set(person.id, ref.id)
    if (ops >= 450) await flush()
    batch.set(ref, {
      familyId,
      givenNames: person.givenNames,
      familyName: person.familyName,
      maidenName: person.maidenName,
      gender: person.gender,
      birth: person.birth,
      death: person.death,
      birthPlace: person.birthPlace,
      deathPlace: person.deathPlace,
      isLiving: person.isLiving,
      photoBase64: person.photoBase64,
      notes: person.notes,
      importKey: person.importKey,
      treeOffsetX: person.treeOffsetX,
      treeOffsetY: person.treeOffsetY,
      updatedAt: serverTimestamp(),
      ...(existing ? {} : { createdAt: serverTimestamp(), createdBy: userId }),
    })
    ops++
  }

  for (const rel of backup.relationships) {
    const personAId = personIdMap.get(rel.personAId) ?? rel.personAId
    const personBId = personIdMap.get(rel.personBId) ?? rel.personBId
    const ref = doc(collection(db, 'relationships'))
    if (ops >= 450) await flush()
    batch.set(ref, {
      familyId,
      type: rel.type,
      personAId,
      personBId,
      marriage: rel.marriage,
      marriagePlace: rel.marriagePlace,
      endDate: rel.endDate,
      endReason: rel.endReason,
      confidence: rel.confidence,
      importMeta: rel.importMeta,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    ops++
  }

  await flush()
  return { people: backup.people.length, relationships: backup.relationships.length }
}
