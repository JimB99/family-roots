import type { DocumentData } from 'firebase/firestore'
import type { Family, PendingInvite, Person, PersonInput, Relationship } from '../../types'

function pendingInvitesFromDoc(data: DocumentData): Record<string, PendingInvite> {
  const raw = data.pendingInvites
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const invites: Record<string, PendingInvite> = {}
  for (const [token, value] of Object.entries(raw)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue
    const invite = value as Record<string, unknown>
    const type = invite.type === 'email' ? 'email' : invite.type === 'open' ? 'open' : null
    if (!type) continue
    invites[token] = {
      type,
      email: typeof invite.email === 'string' ? invite.email : undefined,
      createdAt:
        invite.createdAt != null &&
        typeof invite.createdAt === 'object' &&
        'toDate' in invite.createdAt &&
        typeof invite.createdAt.toDate === 'function'
          ? invite.createdAt.toDate().toISOString()
          : undefined,
      expiresAt:
        invite.expiresAt != null &&
        typeof invite.expiresAt === 'object' &&
        'toDate' in invite.expiresAt &&
        typeof invite.expiresAt.toDate === 'function'
          ? invite.expiresAt.toDate().toISOString()
          : undefined,
    }
  }
  return invites
}

export function familyFromDoc(id: string, data: DocumentData): Family {
  return {
    id,
    name: String(data.name ?? ''),
    slug: String(data.slug ?? id),
    viewKey: typeof data.viewKey === 'string' ? data.viewKey : '',
    editorUids: Array.isArray(data.editorUids) ? [...data.editorUids] : [],
    pendingInvites: pendingInvitesFromDoc(data),
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

export function personToFirestore(input: PersonInput): Record<string, unknown> {
  const data: Record<string, unknown> = {
    familyId: input.familyId,
    givenNames: input.givenNames,
    familyName: input.familyName,
    maidenName: input.maidenName,
    gender: input.gender,
    birth: input.birth,
    death: input.death,
    birthPlace: input.birthPlace,
    deathPlace: input.deathPlace,
    isLiving: input.isLiving,
    photoBase64: input.photoBase64,
    notes: input.notes,
    importKey: input.importKey,
  }
  if (input.treeOffsetX != null) data.treeOffsetX = input.treeOffsetX
  if (input.treeOffsetY != null) data.treeOffsetY = input.treeOffsetY
  return data
}

/** Strip Firestore metadata so edits do not write undefined timestamps back. */
export function personInputFromPerson(person: Person): PersonInput {
  const {
    id: _id,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    createdBy: _createdBy,
    isLiving,
    death,
    ...input
  } = person
  const deceased =
    isLiving === false || (isLiving !== true && death != null)
  return {
    ...input,
    death,
    isLiving: deceased ? false : null,
  }
}

export function relationshipToFirestore(
  input: Omit<Relationship, 'id' | 'createdAt' | 'updatedAt'>,
) {
  return { ...input }
}
