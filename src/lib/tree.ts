import type { Person, Relationship } from '../types'

export function displayName(person: Person): string {
  const parts = [person.givenNames, person.familyName].filter(Boolean)
  if (parts.length === 0) return 'Unknown'
  return parts.join(' ')
}

export function personGender(person: Person): 'M' | 'F' | 'U' {
  if (person.gender === 'female') return 'F'
  if (person.gender === 'male') return 'M'
  return 'U'
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

export interface ConnectedComponent {
  memberIds: Set<string>
  representativeId: string
  size: number
}

function pickComponentRepresentative(memberIds: string[], relationships: Relationship[]): string {
  let bestId = memberIds[0]
  let bestScore = -1
  for (const id of memberIds) {
    const score = personDegree(id, relationships)
    if (score > bestScore) {
      bestScore = score
      bestId = id
    }
  }
  return bestId
}

export function getConnectedComponents(
  people: Person[],
  relationships: Relationship[],
): ConnectedComponent[] {
  const ids = new Set(people.map((p) => p.id))
  const visited = new Set<string>()
  const adjacency = new Map<string, Set<string>>()

  for (const id of ids) adjacency.set(id, new Set())
  for (const rel of relationships) {
    if (!ids.has(rel.personAId) || !ids.has(rel.personBId)) continue
    adjacency.get(rel.personAId)!.add(rel.personBId)
    adjacency.get(rel.personBId)!.add(rel.personAId)
  }

  const components: ConnectedComponent[] = []

  for (const person of people) {
    if (visited.has(person.id)) continue

    const queue = [person.id]
    const members: string[] = []

    while (queue.length > 0) {
      const current = queue.shift()!
      if (visited.has(current)) continue
      visited.add(current)
      members.push(current)
      for (const neighbor of adjacency.get(current) ?? []) {
        if (!visited.has(neighbor)) queue.push(neighbor)
      }
    }

    components.push({
      memberIds: new Set(members),
      representativeId: pickComponentRepresentative(members, relationships),
      size: members.length,
    })
  }

  return components.sort((a, b) => b.size - a.size)
}

export function getBirthYear(person: Person): number | null {
  if (!person.birth?.year) return null
  return person.birth.year
}

export type PeopleSortKey = 'birth-year-asc' | 'birth-year-desc' | 'name-asc'

export function sortPeople(people: Person[], sortKey: PeopleSortKey): Person[] {
  const copy = [...people]

  if (sortKey === 'name-asc') {
    return copy.sort((a, b) => displayName(a).localeCompare(displayName(b)))
  }

  if (sortKey === 'birth-year-asc') {
    return copy.sort((a, b) => {
      const ay = getBirthYear(a) ?? Number.POSITIVE_INFINITY
      const by = getBirthYear(b) ?? Number.POSITIVE_INFINITY
      return ay - by
    })
  }

  return copy.sort((a, b) => {
    const ay = getBirthYear(a) ?? Number.NEGATIVE_INFINITY
    const by = getBirthYear(b) ?? Number.NEGATIVE_INFINITY
    return by - ay
  })
}

export function computeGenerations(
  rootId: string,
  people: Person[],
  relationships: Relationship[],
): Map<string, number> {
  const ids = new Set(people.map((p) => p.id))
  const generations = new Map<string, number>()
  if (!ids.has(rootId)) return generations

  const relsByPerson = buildRelsMap(people, relationships)
  generations.set(rootId, 0)
  const queue = [rootId]

  while (queue.length > 0) {
    const current = queue.shift()!
    const gen = generations.get(current)!
    const rels = relsByPerson.get(current)
    if (!rels) continue

    for (const parentId of rels.parents) {
      if (!generations.has(parentId)) {
        generations.set(parentId, gen - 1)
        queue.push(parentId)
      }
    }
    for (const childId of rels.children) {
      if (!generations.has(childId)) {
        generations.set(childId, gen + 1)
        queue.push(childId)
      }
    }
    for (const spouseId of rels.spouses) {
      if (!generations.has(spouseId)) {
        generations.set(spouseId, gen)
        queue.push(spouseId)
      }
    }
  }

  return generations
}

export function filterBranchData(
  rootId: string,
  people: Person[],
  relationships: Relationship[],
): { people: Person[]; relationships: Relationship[] } {
  const memberIds = getReachablePersonIds(rootId, people, relationships)
  return {
    people: people.filter((p) => memberIds.has(p.id)),
    relationships: relationships.filter(
      (r) => memberIds.has(r.personAId) && memberIds.has(r.personBId),
    ),
  }
}

export function pickDefaultProgenitor(people: Person[], relationships: Relationship[]): string | null {
  if (people.length === 0) return null

  const withChildren = people.filter((p) =>
    relationships.some((r) => r.type === 'parent_child' && r.personAId === p.id),
  )
  const candidates = withChildren.length > 0 ? withChildren : people

  let best: Person | null = null
  let bestYear = Number.POSITIVE_INFINITY

  for (const person of candidates) {
    const year = getBirthYear(person) ?? Number.POSITIVE_INFINITY
    if (year < bestYear) {
      bestYear = year
      best = person
    }
  }

  return best?.id ?? people[0].id
}

export function datumToPersonInput(
  datum: {
    data: Record<string, unknown>
  },
  familyId: string,
): Omit<Person, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'> {
  const genderRaw = datum.data.gender
  const gender =
    genderRaw === 'F' ? 'female' : genderRaw === 'M' ? 'male' : 'unknown'
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
