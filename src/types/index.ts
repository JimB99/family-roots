export type DatePrecision = 'year' | 'month' | 'day' | 'unknown'

export interface PartialDate {
  year?: number
  month?: number
  day?: number
  precision: DatePrecision
}

export type Gender = 'male' | 'female' | 'inter' | 'unknown'
export type RelationshipType = 'spouse' | 'parent_child'
export type RelationshipConfidence = 'imported' | 'manual' | 'low'

export type InviteType = 'open' | 'email'

export interface PendingInvite {
  type: InviteType
  email?: string
  createdAt?: string
  expiresAt?: string
}

export interface Family {
  id: string
  name: string
  slug: string
  viewKey: string
  editorUids: string[]
  pendingInvites: Record<string, PendingInvite>
  pendingInviteEmails: string[]
  ownerUid?: string
  createdAt?: string
  updatedAt?: string
}

export interface Person {
  id: string
  familyId: string
  givenNames: string
  familyName: string | null
  maidenName: string | null
  gender: Gender
  birth: PartialDate | null
  death: PartialDate | null
  birthPlace: string | null
  deathPlace: string | null
  isLiving: boolean | null
  photoBase64: string | null
  notes: string | null
  importKey: string | null
  treeOffsetX?: number | null
  treeOffsetY?: number | null
  createdAt?: string
  updatedAt?: string
  createdBy?: string | null
}

export interface Relationship {
  id: string
  familyId: string
  type: RelationshipType
  personAId: string
  personBId: string
  marriage: PartialDate | null
  marriagePlace: string | null
  endDate: PartialDate | null
  endReason: 'divorce' | 'death' | null
  confidence: RelationshipConfidence
  importMeta?: {
    row?: number
    col?: number
    note?: string
  } | null
  createdAt?: string
  updatedAt?: string
}

export type PersonInput = Omit<Person, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>

export interface FamilyBundle {
  family: Family
  people: Person[]
  relationships: Relationship[]
}
