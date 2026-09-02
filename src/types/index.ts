export type DatePrecision = 'year' | 'month' | 'day' | 'unknown'

export interface PartialDate {
  year?: number
  month?: number
  day?: number
  precision: DatePrecision
}

export type Gender = 'male' | 'female' | 'unknown'
export type RelationshipType = 'spouse' | 'parent_child'
export type RelationshipConfidence = 'imported' | 'manual' | 'low'

export interface Family {
  id: string
  name: string
  slug: string
  editorUids: string[]
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
