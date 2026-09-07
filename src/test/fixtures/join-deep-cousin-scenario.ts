/**
 * Join-parent + deep cousin-column stress pedigree (JDC).
 *
 * - Roots: Pa|Pasp and Pb|Pbsp
 * - Gen1: a1–a6 (A) vs b1,b2,b4 (B); a3|b3 cross-family join (b3 plucked from B row)
 * - Gen2: asymmetric child counts (0–7 per couple, all with spouses)
 * - Gen3–4: fixed fan (0–3 per gen2 child) for overlap / column stress
 */
import type { Person, Relationship } from '../../types'
import { parentChild, person, spouse } from './family'

function p(id: string, label: string, year: number): Person {
  return person(id, label, { birth: { year, precision: 'year' } })
}

export const JOIN_DEEP_COUSIN_SCENARIO = {
  id: 'joinDeepCousin',
  code: 'JDC',
  title: 'Join cross-marriage + deep asymmetric cousin columns',
} as const

type ChildSpec = {
  id: string
  year: number
  /** Gen4 child count per gen3 child (length = number of gen3 children). */
  gen4Counts: number[]
}

function addChildFamilies(
  people: Person[],
  relationships: Relationship[],
  hubId: string,
  spouseId: string,
  children: ChildSpec[],
) {
  for (const child of children) {
    const spId = `${child.id}sp`
    people.push(p(child.id, child.id.toUpperCase(), child.year), p(spId, `${child.id.toUpperCase()} Sp`, child.year + 1))
    relationships.push(spouse(child.id, spId), parentChild(hubId, child.id), parentChild(spouseId, child.id))

    child.gen4Counts.forEach((gen4Count, gen3Index) => {
      const g3Id = `${child.id}g${gen3Index + 1}`
      const g3Year = child.year + 24 + gen3Index
      people.push(p(g3Id, g3Id.toUpperCase(), g3Year))
      relationships.push(parentChild(child.id, g3Id), parentChild(spId, g3Id))

      for (let gen4Index = 0; gen4Index < gen4Count; gen4Index++) {
        const g4Id = `${g3Id}h${gen4Index + 1}`
        people.push(p(g4Id, g4Id.toUpperCase(), g3Year + 24 + gen4Index))
        relationships.push(parentChild(g3Id, g4Id))
      }
    })
  }
}

const people: Person[] = []
const relationships: Relationship[] = []

people.push(
  p('pa', 'Pa', 1960),
  p('pasp', 'Pa Sp', 1961),
  p('pb', 'Pb', 1962),
  p('pbsp', 'Pb Sp', 1963),
)
relationships.push(spouse('pa', 'pasp'), spouse('pb', 'pbsp'))

const gen1 = [
  { id: 'a1', y: 1985 },
  { id: 'a2', y: 1987 },
  { id: 'a3', y: 1989 },
  { id: 'a4', y: 1991 },
  { id: 'a5', y: 1993 },
  { id: 'a6', y: 1995 },
  { id: 'b1', y: 1986 },
  { id: 'b2', y: 1988 },
  { id: 'b3', y: 1990 },
  { id: 'b4', y: 1992 },
] as const

for (const entry of gen1) {
  people.push(p(entry.id, entry.id.toUpperCase(), entry.y))
}

for (const id of ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'] as const) {
  relationships.push(parentChild('pa', id), parentChild('pasp', id))
}
for (const id of ['b1', 'b2', 'b3', 'b4'] as const) {
  relationships.push(parentChild('pb', id), parentChild('pbsp', id))
}

for (const id of ['a1', 'a2', 'a4', 'a5', 'a6'] as const) {
  const sp = `${id}sp`
  people.push(p(sp, `${id.toUpperCase()} Sp`, gen1.find((g) => g.id === id)!.y + 1))
  relationships.push(spouse(id, sp))
}

for (const id of ['b1', 'b2', 'b4'] as const) {
  const sp = `${id}sp`
  people.push(p(sp, `${id.toUpperCase()} Sp`, gen1.find((g) => g.id === id)!.y + 1))
  relationships.push(spouse(id, sp))
}

relationships.push(spouse('a3', 'b3'))

addChildFamilies(people, relationships, 'a1', 'a1sp', [
  { id: 'a1c1', year: 2012, gen4Counts: [2, 0, 1] },
  { id: 'a1c2', year: 2014, gen4Counts: [0, 1] },
  { id: 'a1c3', year: 2016, gen4Counts: [1] },
])

addChildFamilies(people, relationships, 'a3', 'b3', [
  { id: 'a3c1', year: 2011, gen4Counts: [3, 2, 0] },
  { id: 'a3c2', year: 2013, gen4Counts: [2, 1] },
  { id: 'a3c3', year: 2015, gen4Counts: [0] },
  { id: 'a3c4', year: 2017, gen4Counts: [1, 0] },
  { id: 'a3c5', year: 2019, gen4Counts: [2, 0, 1] },
  { id: 'a3c6', year: 2021, gen4Counts: [0] },
  { id: 'a3c7', year: 2023, gen4Counts: [1] },
])

addChildFamilies(people, relationships, 'a4', 'a4sp', [
  { id: 'a4c1', year: 2013, gen4Counts: [0, 2] },
  { id: 'a4c2', year: 2015, gen4Counts: [1, 0, 1] },
])

addChildFamilies(people, relationships, 'a6', 'a6sp', [
  { id: 'a6c1', year: 2012, gen4Counts: [1, 0] },
  { id: 'a6c2', year: 2014, gen4Counts: [3, 2, 0] },
  { id: 'a6c3', year: 2016, gen4Counts: [0] },
  { id: 'a6c4', year: 2018, gen4Counts: [2, 1] },
])

addChildFamilies(people, relationships, 'b1', 'b1sp', [
  { id: 'b1c1', year: 2013, gen4Counts: [2, 0, 1] },
])

addChildFamilies(people, relationships, 'b2', 'b2sp', [
  { id: 'b2c1', year: 2012, gen4Counts: [1] },
  { id: 'b2c2', year: 2014, gen4Counts: [0, 2] },
  { id: 'b2c3', year: 2016, gen4Counts: [3, 1, 0] },
])

addChildFamilies(people, relationships, 'b4', 'b4sp', [
  { id: 'b4c1', year: 2014, gen4Counts: [0, 1] },
  { id: 'b4c2', year: 2016, gen4Counts: [2, 0] },
])

export const JOIN_DEEP_COUSIN_PEOPLE: Person[] = people
export const JOIN_DEEP_COUSIN_RELATIONSHIPS: Relationship[] = relationships
