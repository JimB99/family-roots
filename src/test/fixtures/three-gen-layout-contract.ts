import { parentChild, person, spouse } from './family'
import type { Person, Relationship } from '../../types'

export const S14_FAMILY_ID = 's14-layout-contract'

/** Approved contract gap minimums (edge-to-edge px). See layout-contract-reference.ts */
export const CONTRACT_COUPLE_GAP = 32
export const CONTRACT_SIBLING_GAP = 56
export const CONTRACT_COUSIN_GAP = 100

export const S14_GEN1_HUB_ORDER = ['b2-hub', 'b3-hub', 'b4-hub', 'b5-hub', 'b1-solo'] as const

export const S14_BRANCH_ORDER = ['b2', 'b3', 'b4', 'b5', 'b1'] as const

export type S14BranchId = 'g0' | 'b1' | 'b2' | 'b3' | 'b4' | 'b5'

function s14Rel(relationship: Relationship): Relationship {
  return { ...relationship, familyId: S14_FAMILY_ID }
}

export const S14_PEOPLE: Person[] = [
  person('g0-pa', 'G0 Pa', { familyId: S14_FAMILY_ID, birth: { year: 1950, precision: 'year' } }),
  person('g0-ma', 'G0 Ma', { familyId: S14_FAMILY_ID, birth: { year: 1951, precision: 'year' } }),
  person('b2-hub', 'B2 Hub', { familyId: S14_FAMILY_ID, birth: { year: 1975, precision: 'year' } }),
  person('b2-sp-a', 'B2 Sp A', { familyId: S14_FAMILY_ID, birth: { year: 1976, precision: 'year' } }),
  person('b2-sp-b', 'B2 Sp B', { familyId: S14_FAMILY_ID, birth: { year: 1977, precision: 'year' } }),
  person('b3-hub', 'B3 Hub', { familyId: S14_FAMILY_ID, birth: { year: 1978, precision: 'year' } }),
  person('b3-sp', 'B3 Sp', { familyId: S14_FAMILY_ID, birth: { year: 1979, precision: 'year' } }),
  person('b4-hub', 'B4 Hub', { familyId: S14_FAMILY_ID, birth: { year: 1981, precision: 'year' } }),
  person('b4-sp', 'B4 Sp', { familyId: S14_FAMILY_ID, birth: { year: 1982, precision: 'year' } }),
  person('b5-hub', 'B5 Hub', { familyId: S14_FAMILY_ID, birth: { year: 1984, precision: 'year' } }),
  person('b5-sp', 'B5 Sp', { familyId: S14_FAMILY_ID, birth: { year: 1985, precision: 'year' } }),
  person('b1-solo', 'B1 Solo', { familyId: S14_FAMILY_ID, birth: { year: 1990, precision: 'year' } }),
  person('b2-c-a', 'B2 Ca', { familyId: S14_FAMILY_ID, birth: { year: 2005, precision: 'year' } }),
  person('b2-c-b', 'B2 Cb', { familyId: S14_FAMILY_ID, birth: { year: 2008, precision: 'year' } }),
  person('b2-c-c', 'B2 Cc', { familyId: S14_FAMILY_ID, birth: { year: 2011, precision: 'year' } }),
  person('b3-c', 'B3 C', { familyId: S14_FAMILY_ID, birth: { year: 2010, precision: 'year' } }),
  person('b4-c-a', 'B4 Ca', { familyId: S14_FAMILY_ID, birth: { year: 2012, precision: 'year' } }),
  person('b4-c-b', 'B4 Cb', { familyId: S14_FAMILY_ID, birth: { year: 2015, precision: 'year' } }),
  person('b5-c-a', 'B5 Ca', { familyId: S14_FAMILY_ID, birth: { year: 2016, precision: 'year' } }),
  person('b5-c-b', 'B5 Cb', { familyId: S14_FAMILY_ID, birth: { year: 2018, precision: 'year' } }),
  person('b5-c-c', 'B5 Cc', { familyId: S14_FAMILY_ID, birth: { year: 2020, precision: 'year' } }),
]

export const S14_RELATIONSHIPS: Relationship[] = [
  s14Rel(spouse('g0-pa', 'g0-ma')),
  s14Rel(parentChild('g0-pa', 'b2-hub')),
  s14Rel(parentChild('g0-ma', 'b2-hub')),
  s14Rel(parentChild('g0-pa', 'b3-hub')),
  s14Rel(parentChild('g0-ma', 'b3-hub')),
  s14Rel(parentChild('g0-pa', 'b4-hub')),
  s14Rel(parentChild('g0-ma', 'b4-hub')),
  s14Rel(parentChild('g0-pa', 'b5-hub')),
  s14Rel(parentChild('g0-ma', 'b5-hub')),
  s14Rel(parentChild('g0-pa', 'b1-solo')),
  s14Rel(parentChild('g0-ma', 'b1-solo')),
  s14Rel(spouse('b2-hub', 'b2-sp-a')),
  s14Rel(spouse('b2-hub', 'b2-sp-b')),
  s14Rel(spouse('b3-hub', 'b3-sp')),
  s14Rel(spouse('b4-hub', 'b4-sp')),
  s14Rel(spouse('b5-hub', 'b5-sp')),
  s14Rel(parentChild('b2-hub', 'b2-c-a')),
  s14Rel(parentChild('b2-sp-a', 'b2-c-a')),
  s14Rel(parentChild('b2-hub', 'b2-c-b')),
  s14Rel(parentChild('b2-sp-b', 'b2-c-b')),
  s14Rel(parentChild('b2-hub', 'b2-c-c')),
  s14Rel(parentChild('b2-sp-a', 'b2-c-c')),
  s14Rel(parentChild('b3-hub', 'b3-c')),
  s14Rel(parentChild('b3-sp', 'b3-c')),
  s14Rel(parentChild('b4-hub', 'b4-c-a')),
  s14Rel(parentChild('b4-sp', 'b4-c-a')),
  s14Rel(parentChild('b4-hub', 'b4-c-b')),
  s14Rel(parentChild('b4-sp', 'b4-c-b')),
  s14Rel(parentChild('b5-hub', 'b5-c-a')),
  s14Rel(parentChild('b5-sp', 'b5-c-a')),
  s14Rel(parentChild('b5-hub', 'b5-c-b')),
  s14Rel(parentChild('b5-sp', 'b5-c-b')),
  s14Rel(parentChild('b5-hub', 'b5-c-c')),
  s14Rel(parentChild('b5-sp', 'b5-c-c')),
]
