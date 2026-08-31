import type { Datum } from 'family-chart'
import { formatLifeSpan, formatPartialDate } from './dates'
import type { Person, Relationship } from '../types'

export function displayName(person: Person): string {
  const parts = [person.givenNames, person.familyName].filter(Boolean)
  if (parts.length === 0) return 'Unknown'
  return parts.join(' ')
}

export function personGender(person: Person): 'M' | 'F' {
  if (person.gender === 'female') return 'F'
  if (person.gender === 'male') return 'M'
  return 'M'
}

export function toFamilyChartData(
  people: Person[],
  relationships: Relationship[],
): Datum[] {
  const relsByPerson = new Map<string, { parents: string[]; spouses: string[]; children: string[] }>()

  for (const person of people) {
    relsByPerson.set(person.id, { parents: [], spouses: [], children: [] })
  }

  for (const rel of relationships) {
    const a = relsByPerson.get(rel.personAId)
    const b = relsByPerson.get(rel.personBId)
    if (!a || !b) continue

    if (rel.type === 'spouse') {
      if (!a.spouses.includes(rel.personBId)) a.spouses.push(rel.personBId)
      if (!b.spouses.includes(rel.personAId)) b.spouses.push(rel.personAId)
    }

    if (rel.type === 'parent_child') {
      if (!b.parents.includes(rel.personAId)) b.parents.push(rel.personAId)
      if (!a.children.includes(rel.personBId)) a.children.push(rel.personBId)
    }
  }

  return people.map((person) => {
    const rels = relsByPerson.get(person.id) ?? { parents: [], spouses: [], children: [] }
    return {
      id: person.id,
      data: {
        gender: personGender(person),
        'first name': person.givenNames,
        'last name': person.familyName ?? '',
        maiden: person.maidenName ?? '',
        birthday: formatPartialDate(person.birth, ''),
        death: formatPartialDate(person.death, ''),
        lifespan: formatLifeSpan(person.birth, person.death, person.isLiving),
        avatar: person.photoBase64 ?? undefined,
        private: person.isLiving === true,
      },
      rels,
    }
  })
}

export function pickMainPersonId(people: Person[], relationships: Relationship[]): string | null {
  if (people.length === 0) return null

  const childIds = new Set(
    relationships
      .filter((r) => r.type === 'parent_child')
      .map((r) => r.personBId),
  )

  const roots = people.filter((p) => !childIds.has(p.id))
  if (roots.length > 0) return roots[0].id

  return people[0].id
}
