/**
 * Synthetic three-generation pedigree for cousin-column slack visual inspection.
 *
 * GP/GM founders; three descendant generations. Gen 1 is one sibling row (4 married
 * children); gen 2 branches use asymmetric widths (3–7); gen 3 uses 3–5 children per couple.
 */
import type { Person, Relationship } from '../../types'
import { parentChild, person, spouse } from './family'

export const WIDE_FOUR_GEN_PEDIGREE_SCENARIO = {
  id: 'wideFourGenPedigree',
  code: 'W3G',
  title: 'Wide three-generation pedigree — GP/GM with 3–7 married children per generation',
} as const

const GEN1_SIBLING_COUNT = 4
const GEN2_CHILDREN = [3, 5, 7, 4] as const
const DESCENDANT_GENERATIONS = 3

function childCountForCouple(coupleIndex: number, generation: number): number {
  if (generation === 1) return GEN1_SIBLING_COUNT
  if (generation === 2) return GEN2_CHILDREN[coupleIndex % GEN2_CHILDREN.length]!
  return 3 + (coupleIndex % 3)
}

function buildWidePedigree(): { people: Person[]; relationships: Relationship[] } {
  const people: Person[] = []
  const relationships: Relationship[] = []
  let personSeq = 0

  const addPerson = (label: string, year: number, gender: 'male' | 'female' = 'male'): string => {
    const id = `p${personSeq++}`
    people.push(
      person(id, label, {
        gender,
        birth: { year, precision: 'year' },
      }),
    )
    return id
  }

  const gp = addPerson('GP', 1920, 'male')
  const gm = addPerson('GM', 1922, 'female')
  relationships.push(spouse(gp, gm))

  type Couple = { fatherId: string; motherId: string }
  let couples: Couple[] = [{ fatherId: gp, motherId: gm }]

  for (let generation = 1; generation <= DESCENDANT_GENERATIONS; generation++) {
    const birthYear = 1920 + generation * 28
    const nextCouples: Couple[] = []

    for (let coupleIndex = 0; coupleIndex < couples.length; coupleIndex++) {
      const { fatherId, motherId } = couples[coupleIndex]!
      const childCount = childCountForCouple(coupleIndex, generation)

      for (let childIndex = 0; childIndex < childCount; childIndex++) {
        const childId = addPerson(
          `G${generation}-${coupleIndex + 1}.${childIndex + 1}`,
          birthYear + childIndex,
          childIndex % 2 === 0 ? 'male' : 'female',
        )
        const spouseId = addPerson(
          `G${generation}-${coupleIndex + 1}.${childIndex + 1} Sp`,
          birthYear + childIndex + 1,
          childIndex % 2 === 0 ? 'female' : 'male',
        )

        relationships.push(parentChild(fatherId, childId))
        relationships.push(parentChild(motherId, childId))
        relationships.push(spouse(childId, spouseId))
        nextCouples.push({ fatherId: childId, motherId: spouseId })
      }
    }

    couples = nextCouples
  }

  return { people, relationships }
}

const built = buildWidePedigree()

export const WIDE_FOUR_GEN_PEDIGREE_PEOPLE = built.people
export const WIDE_FOUR_GEN_PEDIGREE_RELATIONSHIPS = built.relationships
