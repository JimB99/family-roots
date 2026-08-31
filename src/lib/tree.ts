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

function buildRelsMap(people: Person[], relationships: Relationship[]) {
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
  return relsByPerson
}

export function toFamilyChartData(people: Person[], relationships: Relationship[]): Datum[] {
  const relsByPerson = buildRelsMap(people, relationships)
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

export function personDegree(personId: string, relationships: Relationship[]): number {
  return relationships.filter((r) => r.personAId === personId || r.personBId === personId).length
}

export function pickMainPersonId(people: Person[], relationships: Relationship[]): string | null {
  if (people.length === 0) return null

  let bestId = people[0].id
  let bestScore = -1

  for (const person of people) {
    const degree = personDegree(person.id, relationships)
    const childLinks = relationships.filter(
      (r) => r.type === 'parent_child' && (r.personAId === person.id || r.personBId === person.id),
    ).length
    const spouseLinks = relationships.filter(
      (r) => r.type === 'spouse' && (r.personAId === person.id || r.personBId === person.id),
    ).length
    const score = degree * 10 + childLinks * 3 + spouseLinks * 2
    if (score > bestScore) {
      bestScore = score
      bestId = person.id
    }
  }

  return bestId
}

export function getReachablePersonIds(
  mainId: string,
  people: Person[],
  relationships: Relationship[],
): Set<string> {
  const ids = new Set(people.map((p) => p.id))
  const visited = new Set<string>()
  const queue = [mainId]

  while (queue.length > 0) {
    const current = queue.shift()!
    if (visited.has(current) || !ids.has(current)) continue
    visited.add(current)

    for (const rel of relationships) {
      if (rel.personAId === current && ids.has(rel.personBId)) queue.push(rel.personBId)
      if (rel.personBId === current && ids.has(rel.personAId)) queue.push(rel.personAId)
    }
  }

  return visited
}

export function getTreeStats(people: Person[], relationships: Relationship[]) {
  const mainId = pickMainPersonId(people, relationships)
  if (!mainId) {
    return { mainId: null, reachableCount: 0, orphanCount: people.length }
  }
  const reachable = getReachablePersonIds(mainId, people, relationships)
  return {
    mainId,
    reachableCount: reachable.size,
    orphanCount: people.length - reachable.size,
  }
}

export function datumToPersonInput(
  datum: Datum,
  familyId: string,
): Omit<Person, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'> {
  const gender =
    datum.data.gender === 'F' ? 'female' : datum.data.gender === 'M' ? 'male' : 'unknown'
  return {
    familyId,
    givenNames: String(datum.data['first name'] ?? ''),
    familyName: datum.data['last name'] ? String(datum.data['last name']) : null,
    maidenName: datum.data.maiden ? String(datum.data.maiden) : null,
    gender,
    birth: null,
    death: null,
    birthPlace: null,
    deathPlace: null,
    isLiving: null,
    photoBase64: typeof datum.data.avatar === 'string' ? datum.data.avatar : null,
    notes: null,
    importKey: null,
  }
}
