import type { DocumentData } from 'firebase/firestore'
import type { Family, Person, Relationship } from '../../types'

export function familyFromDoc(id: string, data: DocumentData): Family {
  return {
    id,
    name: String(data.name ?? ''),
    slug: String(data.slug ?? id),
    editorUids: Array.isArray(data.editorUids) ? [...data.editorUids] : [],
    pendingInviteEmails: Array.isArray(data.pendingInviteEmails)
      ? [...data.pendingInviteEmails]
      : [],
    ownerUid: data.ownerUid ? String(data.ownerUid) : undefined,
    createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? undefined,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() ?? undefined,
  }
}

export function personFromDoc(id: string, data: DocumentData): Person {
  return {
    id,
    familyId: String(data.familyId ?? ''),
    givenNames: String(data.givenNames ?? ''),
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

export function relationshipFromDoc(id: string, data: DocumentData): Relationship {
  return {
    id,
    familyId: String(data.familyId ?? ''),
    type: data.type,
    personAId: String(data.personAId ?? ''),
    personBId: String(data.personBId ?? ''),
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

export function personToFirestore(input: Omit<Person, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) {
  return { ...input }
}

export function relationshipToFirestore(
  input: Omit<Relationship, 'id' | 'createdAt' | 'updatedAt'>,
) {
  return { ...input }
}
