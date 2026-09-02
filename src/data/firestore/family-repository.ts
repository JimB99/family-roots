import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from '../../lib/firebase'
import type { Family } from '../../types'
import { familyFromDoc } from './codecs'

export async function listFamilies(): Promise<Family[]> {
  const snap = await getDocs(collection(db, 'families'))
  return snap.docs.map((d) => familyFromDoc(d.id, d.data())).sort((a, b) => a.name.localeCompare(b.name))
}

export async function getFamilyBySlug(slug: string): Promise<Family | null> {
  const snap = await getDocs(query(collection(db, 'families'), where('slug', '==', slug)))
  if (snap.empty) return null
  return familyFromDoc(snap.docs[0].id, snap.docs[0].data())
}

export async function createFamily(name: string, slug: string, ownerUid: string): Promise<Family> {
  const id = slug
  await setDoc(doc(db, 'families', id), {
    name,
    slug,
    ownerUid,
    editorUids: [ownerUid],
    pendingInviteEmails: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return {
    id,
    name,
    slug,
    editorUids: [ownerUid],
    pendingInviteEmails: [],
    ownerUid,
  }
}

export async function renameFamily(familyId: string, name: string): Promise<void> {
  await updateDoc(doc(db, 'families', familyId), {
    name,
    updatedAt: serverTimestamp(),
  })
}

export async function addPendingInvite(familyId: string, email: string): Promise<void> {
  const normalized = email.trim().toLowerCase()
  await updateDoc(doc(db, 'families', familyId), {
    pendingInviteEmails: arrayUnion(normalized),
    updatedAt: serverTimestamp(),
  })
}

export async function revokePendingInvite(familyId: string, email: string): Promise<void> {
  const normalized = email.trim().toLowerCase()
  await updateDoc(doc(db, 'families', familyId), {
    pendingInviteEmails: arrayRemove(normalized),
    updatedAt: serverTimestamp(),
  })
}

export async function claimInvite(familyId: string, uid: string, email: string): Promise<void> {
  const normalized = email.toLowerCase()
  await updateDoc(doc(db, 'families', familyId), {
    editorUids: arrayUnion(uid),
    pendingInviteEmails: arrayRemove(normalized),
    updatedAt: serverTimestamp(),
  })
}

export async function removeEditor(familyId: string, uid: string): Promise<void> {
  await updateDoc(doc(db, 'families', familyId), {
    editorUids: arrayRemove(uid),
    updatedAt: serverTimestamp(),
  })
}

export async function transferOwnership(familyId: string, newOwnerUid: string): Promise<void> {
  await updateDoc(doc(db, 'families', familyId), {
    ownerUid: newOwnerUid,
    editorUids: arrayUnion(newOwnerUid),
    updatedAt: serverTimestamp(),
  })
}

export async function getFamilyById(familyId: string): Promise<Family | null> {
  const snap = await getDoc(doc(db, 'families', familyId))
  if (!snap.exists()) return null
  return familyFromDoc(snap.id, snap.data())
}
