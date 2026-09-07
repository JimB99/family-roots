/**
 * Bride-anchored cross-marriage (JDC-style) with a Markus/Viktoria half-sibling hub below a gen-1 sibling.
 * Exercises the deferred join horizontal pack path + half-sibling child row.
 */
import type { Person, Relationship } from '../../types'
import { parentChild, person, spouse } from './family'

function p(id: string, label: string, year: number): Person {
  return person(id, label, { birth: { year, precision: 'year' } })
}

export const JOIN_HALF_SIBLING_HUB_SCENARIO = {
  id: 'joinHalfSiblingHub',
  code: 'JHS',
  title: 'Join cross-marriage + half-sibling child row',
} as const

const people: Person[] = []
const relationships: Relationship[] = []

people.push(
  p('pa', 'Pa', 1940),
  p('pasp', 'Pa Sp', 1941),
  p('pb', 'Pb', 1942),
  p('pbsp', 'Pb Sp', 1943),
)

const gen1 = [
  { id: 'a1', y: 1965 },
  { id: 'a2', y: 1967 },
  { id: 'a3', y: 1969 },
  { id: 'a4', y: 1971 },
  { id: 'b1', y: 1966 },
  { id: 'b2', y: 1968 },
  { id: 'b3', y: 1970 },
] as const

for (const entry of gen1) {
  people.push(p(entry.id, entry.id.toUpperCase(), entry.y))
}

relationships.push(spouse('pa', 'pasp'), spouse('pb', 'pbsp'))

for (const id of ['a1', 'a2', 'a3', 'a4'] as const) {
  relationships.push(parentChild('pa', id), parentChild('pasp', id))
}
for (const id of ['b1', 'b2', 'b3'] as const) {
  relationships.push(parentChild('pb', id), parentChild('pbsp', id))
}

for (const id of ['a1', 'a2', 'a4', 'b1', 'b2'] as const) {
  const sp = `${id}sp`
  people.push(p(sp, `${id.toUpperCase()} Sp`, gen1.find((g) => g.id === id)!.y + 1))
  relationships.push(spouse(id, sp))
}

relationships.push(spouse('a3', 'b3'))

people.push(
  p('a2sp', 'A2 Sp', 1968),
  p('carmen', 'Carmen', 1995),
  p('markus', 'Markus', 1962),
  p('nadja', 'Nadja', 1990),
  p('steven', 'Steven', 1991),
  p('viktoria', 'Viktoria', 1991),
  p('christian', 'Christian', 1988),
  p('benjamin', 'Benjamin', 1995),
  p('sarah', 'Sarah', 1996),
)

relationships.push(
  spouse('a2', 'a2sp'),
  parentChild('a2', 'carmen'),
  parentChild('a2sp', 'carmen'),
  spouse('carmen', 'markus'),
  spouse('nadja', 'steven'),
  spouse('viktoria', 'christian'),
  spouse('benjamin', 'sarah'),
  parentChild('carmen', 'nadja'),
  parentChild('markus', 'nadja'),
  parentChild('markus', 'viktoria'),
  parentChild('carmen', 'benjamin'),
  parentChild('markus', 'benjamin'),
)

export const JOIN_HALF_SIBLING_HUB_PEOPLE: Person[] = people
export const JOIN_HALF_SIBLING_HUB_RELATIONSHIPS: Relationship[] = relationships
