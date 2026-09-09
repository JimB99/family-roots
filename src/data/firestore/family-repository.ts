import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { generateToken, pendingInviteToFirestore } from '../../domain/family-access'
import { pickEditorFamilies } from '../../domain/family-editor-index'
import { db } from '../../lib/firebase'
import type { Family, InviteType } from '../../types'
import { familyFromDoc } from './codecs'

export async function listFamilies(): Promise<Family[]> {
  const snap = await getDocs(collection(db, 'families'))
  return snap.docs.map((d) => familyFromDoc(d.id, d.data())).sort((a, b) => a.name.localeCompare(b.name))
}

export async function syncUserFamilyIndex(uid: string, slug: string): Promise<void> {
  await setDoc(
    doc(db, 'userEdits', uid),
    {
      familySlugs: arrayUnion(slug),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}

async function removeUserFamilyIndex(uid: string, slug: string): Promise<void> {
  await setDoc(
    doc(db, 'userEdits', uid),
    {
      familySlugs: arrayRemove(slug),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}

async function readUserFamilySlugs(uid: string): Promise<string[]> {
  const indexSnap = await getDoc(doc(db, 'userEdits', uid))
  if (!indexSnap.exists()) return []
  const slugs = indexSnap.data().familySlugs
  if (!Array.isArray(slugs)) return []
  return [...new Set(slugs.filter((slug): slug is string => typeof slug === 'string'))]
}

async function backfillUserFamilyIndex(uid: string): Promise<string[]> {
  try {
    const snap = await getDocs(
      query(collection(db, 'families'), where('editorUids', 'array-contains', uid)),
    )
    const slugs = snap.docs.map((d) => d.id)
    await Promise.all(slugs.map((slug) => syncUserFamilyIndex(uid, slug)))
    return slugs
  } catch {
    return []
  }
}

export async function listFamiliesForEditor(uid: string): Promise<Family[]> {
  let slugs = await readUserFamilySlugs(uid)
  if (slugs.length === 0) {
    slugs = await backfillUserFamilyIndex(uid)
  }
  const families = await Promise.all(slugs.map((slug) => getFamilyBySlug(slug)))
  return pickEditorFamilies(families, uid)
}

export async function getFamilyBySlug(slug: string): Promise<Family | null> {
  const snap = await getDoc(doc(db, 'families', slug))
  if (!snap.exists()) return null
  const family = familyFromDoc(snap.id, snap.data())
  if (family.slug !== slug) return null
  return family
}

export async function createFamily(name: string, slug: string, ownerUid: string): Promise<Family> {
  const id = slug
  const viewKey = generateToken()
  await setDoc(doc(db, 'families', id), {
    name,
    slug,
    ownerUid,
    viewKey,
    editorUids: [ownerUid],
    pendingInvites: {},
    pendingInviteEmails: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  await syncUserFamilyIndex(ownerUid, slug)
  return {
    id,
    name,
    slug,
    viewKey,
    editorUids: [ownerUid],
    pendingInvites: {},
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

export async function createInvite(
  familyId: string,
  type: InviteType,
  email?: string,
): Promise<{ token: string; joinUrl: string }> {
  const family = await getFamilyById(familyId)
  if (!family) throw new Error('Family not found')
  const token = generateToken()
  const invite = pendingInviteToFirestore(type, email)
  await updateDoc(doc(db, 'families', familyId), {
    [`pendingInvites.${token}`]: invite,
    updatedAt: serverTimestamp(),
  })
  return { token, joinUrl: `/families/${family.slug}/join/${token}` }
}

export async function revokeInvite(familyId: string, token: string): Promise<void> {
  await updateDoc(doc(db, 'families', familyId), {
    [`pendingInvites.${token}`]: deleteField(),
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
  await syncUserFamilyIndex(uid, familyId)
}

export async function claimInviteToken(
  familyId: string,
  token: string,
  uid: string,
): Promise<void> {
  const family = await getFamilyById(familyId)
  if (!family) throw new Error('Family not found')
  const invite = family.pendingInvites[token]
  if (!invite) throw new Error('Invite not found')
  if (family.editorUids.includes(uid)) {
    return
  }

  const update: Record<string, unknown> = {
    editorUids: [...family.editorUids, uid],
    updatedAt: serverTimestamp(),
  }
  if (invite.type === 'email') {
    update[`pendingInvites.${token}`] = deleteField()
  }

  try {
    await updateDoc(doc(db, 'families', familyId), update)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    throw new Error(`Failed to add editor to family: ${message}`)
  }

  try {
    await syncUserFamilyIndex(uid, family.slug)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    throw new Error(`Failed to sync editor families index: ${message}`)
  }
}

export async function regenerateViewKey(familyId: string): Promise<string> {
  const viewKey = generateToken()
  await updateDoc(doc(db, 'families', familyId), {
    viewKey,
    updatedAt: serverTimestamp(),
  })
  return viewKey
}

export async function ensureViewKey(familyId: string): Promise<string> {
  const family = await getFamilyById(familyId)
  if (!family) throw new Error('Family not found')
  if (family.viewKey) return family.viewKey
  return regenerateViewKey(familyId)
}

export async function removeEditor(familyId: string, uid: string): Promise<void> {
  await updateDoc(doc(db, 'families', familyId), {
    editorUids: arrayRemove(uid),
    updatedAt: serverTimestamp(),
  })
  await removeUserFamilyIndex(uid, familyId)
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
