import type { Person, Relationship } from '../../types'
import { parentChild, person, spouse, TEST_FAMILY_ID } from './family'

/** Marriage / in-law / step relationships for kinship tests. */
export const KINSHIP_MARRIAGE_PEOPLE: Person[] = [
  person('alice', 'Alice', { gender: 'female' }),
  person('bob', 'Bob', { gender: 'male' }),
  person('carol', 'Carol', { gender: 'female' }),
  person('dan', 'Dan', { gender: 'male' }),
  person('eve', 'Eve', { gender: 'female' }),
  person('frank', 'Frank', { gender: 'male' }),
  person('grace', 'Grace', { gender: 'female' }),
  person('helen', 'Helen', { gender: 'female' }),
  person('ivan', 'Ivan', { gender: 'male' }),
  person('judy', 'Judy', { gender: 'female' }),
  person('kate', 'Kate', { gender: 'female' }),
  person('leo', 'Leo', { gender: 'male' }),
  person('mia', 'Mia', { gender: 'female' }),
  person('mary', 'Mary', { gender: 'female' }),
  person('nora', 'Nora', { gender: 'female' }),
  person('otto', 'Otto', { gender: 'male' }),
]

export const KINSHIP_MARRIAGE_RELATIONSHIPS: Relationship[] = [
  parentChild('alice', 'carol'),
  parentChild('bob', 'carol'),
  parentChild('alice', 'dan'),
  parentChild('bob', 'dan'),
  spouse('carol', 'eve'),
  parentChild('frank', 'eve'),
  parentChild('grace', 'eve'),
  spouse('dan', 'helen'),
  parentChild('ivan', 'helen'),
  spouse('helen', 'judy'),
  parentChild('dan', 'kate'),
  parentChild('helen', 'leo'),
  parentChild('judy', 'mia'),
  spouse('kate', 'mary'),
  parentChild('nora', 'mary'),
  parentChild('otto', 'mary'),
]

/** Disconnected second component for unrelated tests. */
export const KINSHIP_UNRELATED_PEOPLE: Person[] = [
  person('solo1', 'Solo One', { familyId: TEST_FAMILY_ID }),
  person('solo2', 'Solo Two', { familyId: TEST_FAMILY_ID }),
]

export const KINSHIP_UNRELATED_RELATIONSHIPS: Relationship[] = []

/** Three-generation line for aunt/uncle and direct-line tests. */
export const KINSHIP_LINE_PEOPLE: Person[] = [
  person('ggc', 'Great Grand', { gender: 'male', birth: { year: 1900, precision: 'year' } }),
  person('gp', 'Grandpa', { gender: 'male', birth: { year: 1920, precision: 'year' } }),
  person('gpa', 'Grand Aunt', { gender: 'female', birth: { year: 1922, precision: 'year' } }),
  person('parent', 'Parent', { gender: 'female', birth: { year: 1950, precision: 'year' } }),
  person('child', 'Child', { gender: 'male', birth: { year: 1980, precision: 'year' } }),
]

export const KINSHIP_LINE_RELATIONSHIPS: Relationship[] = [
  parentChild('ggc', 'gp'),
  parentChild('ggc', 'gpa'),
  parentChild('gp', 'parent'),
  parentChild('parent', 'child'),
]

/** Aunt's spouse — reciprocal in-law labels (uncle-in-law / nephew-in-law). */
export const KINSHIP_AUNT_SPOUSE_PEOPLE: Person[] = [
  person('gp', 'Grandpa', { gender: 'male' }),
  person('parent', 'Parent', { gender: 'female' }),
  person('aunt', 'Aunt', { gender: 'female' }),
  person('jim', 'Jim', { gender: 'male' }),
  person('peter', 'Peter', { gender: 'male' }),
]

export const KINSHIP_AUNT_SPOUSE_RELATIONSHIPS: Relationship[] = [
  parentChild('gp', 'parent'),
  parentChild('gp', 'aunt'),
  parentChild('parent', 'jim'),
  spouse('aunt', 'peter'),
]
