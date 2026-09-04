import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../../lib/firebase'
import type { Person, PersonInput } from '../../types'
import { personFromDoc, personToFirestore } from './codecs'

export async function listPeopleForFamily(familyId: string): Promise<Person[]> {
  const snap = await getDocs(query(collection(db, 'people'), where('familyId', '==', familyId)))
  return snap.docs.map((d) => personFromDoc(d.id, d.data()))
}

export async function getPersonById(personId: string): Promise<Person | null> {
  const snap = await getDoc(doc(db, 'people', personId))
  if (!snap.exists()) return null
  return personFromDoc(snap.id, snap.data())
}

export async function createPerson(input: PersonInput, userId: string | null): Promise<string> {
  const ref = doc(collection(db, 'people'))
  await setDoc(ref, {
    ...personToFirestore(input),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: userId,
  })
  return ref.id
}

export async function updatePerson(personId: string, input: PersonInput): Promise<void> {
  await setDoc(
    doc(db, 'people', personId),
    { ...personToFirestore(input), updatedAt: serverTimestamp() },
    { merge: true },
  )
}

export async function deletePersonCascade(
  personId: string,
  relationshipIds: string[],
): Promise<void> {
  let batch = writeBatch(db)
  let ops = 0
  const flush = async () => {
    if (ops > 0) await batch.commit()
    batch = writeBatch(db)
    ops = 0
  }

  for (const relId of relationshipIds) {
    if (ops >= 450) await flush()
    batch.delete(doc(db, 'relationships', relId))
    ops++
  }
  if (ops >= 450) await flush()
  batch.delete(doc(db, 'people', personId))
  ops++
  await flush()
}
