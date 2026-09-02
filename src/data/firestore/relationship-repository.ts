import {
  collection,
  doc,
  deleteDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../../lib/firebase'
import type { Relationship } from '../../types'
import { relationshipFromDoc } from './codecs'

export async function listRelationshipsForFamily(familyId: string): Promise<Relationship[]> {
  const snap = await getDocs(
    query(collection(db, 'relationships'), where('familyId', '==', familyId)),
  )
  return snap.docs.map((d) => relationshipFromDoc(d.id, d.data()))
}

export async function createRelationship(
  data: Omit<Relationship, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const ref = doc(collection(db, 'relationships'))
  await setDoc(ref, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function deleteRelationshipById(id: string): Promise<void> {
  await deleteDoc(doc(db, 'relationships', id))
}

export async function replaceRelationshipAtomic(
  oldId: string,
  replacement: Omit<Relationship, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const batch = writeBatch(db)
  const newRef = doc(collection(db, 'relationships'))
  batch.delete(doc(db, 'relationships', oldId))
  batch.set(newRef, {
    ...replacement,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  await batch.commit()
  return newRef.id
}
