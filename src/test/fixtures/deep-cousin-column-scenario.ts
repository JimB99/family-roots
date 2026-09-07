/**
 * Compact 5-generation pedigree for reproducing deep cousin-column overlap.
 *
 * Shape:
 * - G0: founders
 * - G1: two sibling couples (cousin branch roots)
 * - G2: wide branch (3 children) vs narrow branch (1 child)
 * - G3: half-sibling hub — Mark (spouse only on c1 line) + Mark Sp (child of c1)
 * - G4–G5: asymmetric descendant fans (c3: 5 children, d1: 4 children)
 */
import type { Person, Relationship } from '../../types'
import { parentChild, person, spouse } from './family'

function p(id: string, label: string, year: number): Person {
  return person(id, label, { birth: { year, precision: 'year' } })
}

export const DEEP_COUSIN_COLUMN_SCENARIO = {
  id: 'deepCousinColumn',
  code: 'DCC',
  title: 'Five-gen cousin columns — wide vs narrow branch with half-sibling hub',
} as const

export const DEEP_COUSIN_COLUMN_PEOPLE: Person[] = [
  p('g0', 'G0', 1920),
  p('g0sp', 'G0 Sp', 1922),

  p('ana', 'Ana', 1950),
  p('anasp', 'Ana Sp', 1951),
  p('bob', 'Bob', 1952),
  p('bobsp', 'Bob Sp', 1953),

  p('c1', 'C1', 1975),
  p('c2', 'C2', 1978),
  p('c3', 'C3', 1981),
  p('d1', 'D1', 1976),

  p('mark', 'Mark', 2000),
  p('marksp', 'Mark Sp', 2001),
  p('e1', 'E1', 2025),
  p('e1sp', 'E1 Sp', 2026),
  p('vik', 'Vik', 2027),
  p('viksp', 'Vik Sp', 2028),
  p('ben', 'Ben', 2030),
  p('f2', 'F2', 2024),
  p('f3a', 'F3a', 2026),
  p('f3b', 'F3b', 2029),
  p('f3c', 'F3c', 2030),
  p('f3d', 'F3d', 2031),
  p('f3e', 'F3e', 2032),
  p('g1', 'G1', 2025),
  p('g2', 'G2', 2027),
  p('g3', 'G3', 2028),
  p('g4', 'G4', 2029),

  p('e1c', 'E1c', 2050),
  p('vikc', 'Vikc', 2051),
  p('benc', 'Benc', 2052),
  p('f2c', 'F2c', 2053),
  p('f3ac', 'F3ac', 2054),
  p('f3bc', 'F3bc', 2055),
  p('f3cc', 'F3cc', 2056),
  p('g1c', 'G1c', 2057),
  p('g2c', 'G2c', 2058),

  p('e1gc', 'E1gc', 2075),
  p('vikgc', 'Vikgc', 2076),
  p('g1gc', 'G1gc', 2077),
]

export const DEEP_COUSIN_COLUMN_RELATIONSHIPS: Relationship[] = [
  spouse('g0', 'g0sp'),
  parentChild('g0', 'ana'),
  parentChild('g0sp', 'ana'),
  parentChild('g0', 'bob'),
  parentChild('g0sp', 'bob'),
  spouse('ana', 'anasp'),
  spouse('bob', 'bobsp'),

  parentChild('ana', 'c1'),
  parentChild('anasp', 'c1'),
  parentChild('ana', 'c2'),
  parentChild('anasp', 'c2'),
  parentChild('ana', 'c3'),
  parentChild('anasp', 'c3'),
  parentChild('bob', 'd1'),
  parentChild('bobsp', 'd1'),

  spouse('mark', 'marksp'),
  spouse('e1', 'e1sp'),
  spouse('vik', 'viksp'),
  parentChild('c1', 'marksp'),
  parentChild('mark', 'e1'),
  parentChild('marksp', 'e1'),
  parentChild('mark', 'vik'),
  parentChild('mark', 'ben'),
  parentChild('marksp', 'ben'),
  parentChild('vik', 'vikc'),
  parentChild('viksp', 'vikc'),
  parentChild('e1', 'e1c'),
  parentChild('e1sp', 'e1c'),
  parentChild('ben', 'benc'),

  parentChild('c2', 'f2'),
  parentChild('c3', 'f3a'),
  parentChild('c3', 'f3b'),
  parentChild('c3', 'f3c'),
  parentChild('c3', 'f3d'),
  parentChild('c3', 'f3e'),
  parentChild('d1', 'g1'),
  parentChild('d1', 'g2'),
  parentChild('d1', 'g3'),
  parentChild('d1', 'g4'),

  parentChild('e1c', 'e1gc'),
  parentChild('vikc', 'vikgc'),
  parentChild('f2', 'f2c'),
  parentChild('f3a', 'f3ac'),
  parentChild('f3b', 'f3bc'),
  parentChild('f3c', 'f3cc'),
  parentChild('g1', 'g1c'),
  parentChild('g2', 'g2c'),
  parentChild('g1c', 'g1gc'),
]
