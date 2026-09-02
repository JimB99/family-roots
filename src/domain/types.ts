import type { Gender, PartialDate, Person, Relationship, RelationshipType } from '../types'

export type PersonId = string
export type RelationshipId = string
export type FamilyId = string

export type DomainErrorCode =
  | 'SELF_RELATIONSHIP'
  | 'DUPLICATE_RELATIONSHIP'
  | 'MISSING_PERSON'
  | 'CROSS_FAMILY'
  | 'ANCESTRY_CYCLE'
  | 'CONFLICTING_DIRECTION'
  | 'BIOLOGICALLY_IMPLAUSIBLE_DATE'
  | 'INVALID_DATE'
  | 'INVALID_RELATIONSHIP_TYPE'
  | 'FAMILY_ID_CHANGED'

export interface DomainError {
  code: DomainErrorCode
  message: string
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: DomainError }

export interface GraphIssue {
  code: DomainErrorCode | 'DISCONNECTED_PERSON' | 'UNKNOWN_GENDER' | 'GENERATION_CONFLICT'
  message: string
  personIds?: PersonId[]
  relationshipId?: RelationshipId
}

export interface ConnectedComponent {
  memberIds: Set<PersonId>
  representativeId: PersonId
  size: number
}

export interface FamilyGraph {
  familyId: FamilyId
  peopleById: ReadonlyMap<PersonId, Person>
  relationshipsById: ReadonlyMap<RelationshipId, Relationship>
  parentsOf: ReadonlyMap<PersonId, ReadonlySet<PersonId>>
  childrenOf: ReadonlyMap<PersonId, ReadonlySet<PersonId>>
  spousesOf: ReadonlyMap<PersonId, ReadonlySet<PersonId>>
  relationshipKeys: ReadonlySet<string>
  components: ConnectedComponent[]
  issues: GraphIssue[]
}

export interface RelationshipDraft {
  type: RelationshipType
  personAId: PersonId
  personBId: PersonId
  familyId: FamilyId
}

export interface CommandWrite {
  collection: 'people' | 'relationships'
  id?: string
  data: Record<string, unknown>
}

export interface CommandDelete {
  collection: 'people' | 'relationships'
  id: string
}

export interface CommandPlan {
  writes: CommandWrite[]
  deletes: CommandDelete[]
  warnings: GraphIssue[]
  errors: DomainError[]
}

export function ok<T>(value: T): Result<T> {
  return { ok: true, value }
}

export function err(code: DomainErrorCode, message: string): Result<never> {
  return { ok: false, error: { code, message } }
}

export function displayGender(gender: Gender): Gender {
  return gender
}

export function yearFromDate(date: PartialDate | null | undefined): number | null {
  return date?.year ?? null
}
