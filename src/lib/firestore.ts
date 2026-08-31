import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  deleteDoc,
  where,
  writeBatch,
  serverTimestamp,
  type DocumentData,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Family, Person, PersonInput, Relationship } from '../types'

function familyFromDoc(id: string, data: DocumentData): Family {
  return {
    id,
    name: data.name,
    slug: data.slug,
    editorUids: data.editorUids ?? [],
    pendingInviteEmails: data.pendingInviteEmails ?? [],
    createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? undefined,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() ?? undefined,
  }
}

function personFromDoc(id: string, data: DocumentData): Person {
  return {
    id,
    familyId: data.familyId,
    givenNames: data.givenNames ?? '',
    familyName: data.familyName ?? null,
    maidenName: data.maidenName ?? null,
    gender: data.gender ?? 'unknown',
    birth: data.birth ?? null,
    death: data.death ?? null,
    birthPlace: data.birthPlace ?? null,
    deathPlace: data.deathPlace ?? null,
    isLiving: data.isLiving ?? null,
    photoBase64: data.photoBase64 ?? null,
    notes: data.notes ?? null,
    importKey: data.importKey ?? null,
    treeOffsetX: data.treeOffsetX ?? null,
    treeOffsetY: data.treeOffsetY ?? null,
    createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? undefined,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() ?? undefined,
    createdBy: data.createdBy ?? null,
  }
}

function relationshipFromDoc(id: string, data: DocumentData): Relationship {
  return {
    id,
    familyId: data.familyId,
    type: data.type,
    personAId: data.personAId,
    personBId: data.personBId,
    marriage: data.marriage ?? null,
    marriagePlace: data.marriagePlace ?? null,
    endDate: data.endDate ?? null,
    endReason: data.endReason ?? null,
    confidence: data.confidence ?? 'manual',
    importMeta: data.importMeta ?? null,
    createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? undefined,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() ?? undefined,
  }
}

export async function listFamilies(): Promise<Family[]> {
  const snap = await getDocs(collection(db, 'families'))
  return snap.docs
    .map((d) => familyFromDoc(d.id, d.data()))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function getFamilyBySlug(slug: string): Promise<Family | null> {
  const q = query(collection(db, 'families'), where('slug', '==', slug))
  const snap = await getDocs(q)
  if (snap.empty) return null
  const docSnap = snap.docs[0]
  return familyFromDoc(docSnap.id, docSnap.data())
}

export async function getFamilyById(id: string): Promise<Family | null> {
  const snap = await getDoc(doc(db, 'families', id))
  if (!snap.exists()) return null
  return familyFromDoc(snap.id, snap.data())
}

export async function createFamily(
  name: string,
  slug: string,
  ownerUid: string,
): Promise<Family> {
  const id = slug
  const payload = {
    name,
    slug,
    editorUids: [ownerUid],
    pendingInviteEmails: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
  await setDoc(doc(db, 'families', id), payload)
  return {
    id,
    name,
    slug,
    editorUids: [ownerUid],
    pendingInviteEmails: [],
  }
}

export async function claimInvite(family: Family, uid: string, email: string): Promise<void> {
  const normalized = email.toLowerCase()
  if (!family.pendingInviteEmails.map((e) => e.toLowerCase()).includes(normalized)) return

  await updateDoc(doc(db, 'families', family.id), {
    editorUids: [...family.editorUids, uid],
    pendingInviteEmails: family.pendingInviteEmails.filter(
      (e) => e.toLowerCase() !== normalized,
    ),
    updatedAt: serverTimestamp(),
  })
}

export async function addPendingInvite(familyId: string, email: string, current: Family): Promise<void> {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return
  if (current.pendingInviteEmails.map((e) => e.toLowerCase()).includes(normalized)) return

  await updateDoc(doc(db, 'families', familyId), {
    pendingInviteEmails: [...current.pendingInviteEmails, normalized],
    updatedAt: serverTimestamp(),
  })
}

export async function getPeopleForFamily(familyId: string): Promise<Person[]> {
  const q = query(collection(db, 'people'), where('familyId', '==', familyId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => personFromDoc(d.id, d.data()))
}

/** Load people by family doc id or slug (handles legacy import mismatches). */
export async function getPeopleForFamilyResolved(
  familyId: string,
  slug: string,
): Promise<Person[]> {
  const byId = await getPeopleForFamily(familyId)
  if (byId.length > 0) return byId
  if (slug !== familyId) {
    const bySlug = await getPeopleForFamily(slug)
    if (bySlug.length > 0) return bySlug
  }
  return byId
}

export async function getRelationshipsForFamilyResolved(
  familyId: string,
  slug: string,
): Promise<Relationship[]> {
  const byId = await getRelationshipsForFamily(familyId)
  if (byId.length > 0) return byId
  if (slug !== familyId) {
    const bySlug = await getRelationshipsForFamily(slug)
    if (bySlug.length > 0) return bySlug
  }
  return byId
}

export async function fixFamilyIdMismatch(familyId: string, slug: string): Promise<number> {
  const wrong = await getPeopleForFamily(slug)
  if (slug === familyId || wrong.length === 0) return 0

  let batch = writeBatch(db)
  let ops = 0
  let fixed = 0

  for (const person of wrong) {
    if (person.familyId === familyId) continue
    if (ops >= 450) {
      await batch.commit()
      batch = writeBatch(db)
      ops = 0
    }
    batch.update(doc(db, 'people', person.id), { familyId, updatedAt: serverTimestamp() })
    ops++
    fixed++
  }

  const wrongRels = await getRelationshipsForFamily(slug)
  for (const rel of wrongRels) {
    if (rel.familyId === familyId) continue
    if (ops >= 450) {
      await batch.commit()
      batch = writeBatch(db)
      ops = 0
    }
    batch.update(doc(db, 'relationships', rel.id), { familyId, updatedAt: serverTimestamp() })
    ops++
  }

  if (ops > 0) await batch.commit()
  return fixed
}

export async function getRelationshipsForFamily(familyId: string): Promise<Relationship[]> {
  const q = query(collection(db, 'relationships'), where('familyId', '==', familyId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => relationshipFromDoc(d.id, d.data()))
}

export async function getPerson(id: string): Promise<Person | null> {
  const snap = await getDoc(doc(db, 'people', id))
  if (!snap.exists()) return null
  return personFromDoc(snap.id, snap.data())
}

export async function savePerson(
  id: string | null,
  input: PersonInput,
  userId: string | null,
): Promise<string> {
  const ref = id ? doc(db, 'people', id) : doc(collection(db, 'people'))
  const payload = {
    ...input,
    updatedAt: serverTimestamp(),
    ...(id ? {} : { createdAt: serverTimestamp(), createdBy: userId }),
  }
  await setDoc(ref, payload, { merge: true })
  return ref.id
}

export async function deletePerson(id: string): Promise<void> {
  await deleteDoc(doc(db, 'people', id))
}

export async function saveRelationship(
  id: string | null,
  data: Omit<Relationship, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const ref = id ? doc(db, 'relationships', id) : doc(collection(db, 'relationships'))
  const payload = {
    ...data,
    updatedAt: serverTimestamp(),
    ...(id ? {} : { createdAt: serverTimestamp() }),
  }
  await setDoc(ref, payload, { merge: true })
  return ref.id
}

export async function deleteRelationship(id: string): Promise<void> {
  await deleteDoc(doc(db, 'relationships', id))
}

export async function confirmRelationship(id: string): Promise<void> {
  await updateDoc(doc(db, 'relationships', id), {
    confidence: 'manual',
    updatedAt: serverTimestamp(),
  })
}

export async function confirmAllRelationships(familyId: string): Promise<number> {
  const snap = await getDocs(
    query(
      collection(db, 'relationships'),
      where('familyId', '==', familyId),
      where('confidence', 'in', ['imported', 'low']),
    ),
  )
  if (snap.empty) return 0

  let batch = writeBatch(db)
  let ops = 0
  let count = 0

  for (const d of snap.docs) {
    if (ops >= 450) {
      await batch.commit()
      batch = writeBatch(db)
      ops = 0
    }
    batch.update(d.ref, { confidence: 'manual', updatedAt: serverTimestamp() })
    ops++
    count++
  }

  if (ops > 0) await batch.commit()
  return count
}

export async function listLowConfidenceRelationships(familyId: string): Promise<Relationship[]> {
  const q = query(
    collection(db, 'relationships'),
    where('familyId', '==', familyId),
    where('confidence', 'in', ['imported', 'low']),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => relationshipFromDoc(d.id, d.data()))
}
