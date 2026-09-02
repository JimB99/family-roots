import type { Person, Relationship } from '../types'
import { relationshipKey } from './relationship-key'
import type { ConnectedComponent, FamilyGraph, GraphIssue, PersonId } from './types'

function addToSetMap(map: Map<PersonId, Set<PersonId>>, key: PersonId, value: PersonId) {
  const set = map.get(key) ?? new Set<PersonId>()
  set.add(value)
  map.set(key, set)
}

function pickRepresentative(memberIds: PersonId[], relCount: Map<PersonId, number>): PersonId {
  let best = memberIds[0]
  let bestScore = -1
  for (const id of memberIds) {
    const score = relCount.get(id) ?? 0
    if (score > bestScore) {
      bestScore = score
      best = id
    }
  }
  return best
}

export function buildFamilyGraph(familyId: string, people: Person[], relationships: Relationship[]): FamilyGraph {
  const peopleById = new Map<PersonId, Person>()
  const relationshipsById = new Map<string, Relationship>()
  const parentsOf = new Map<PersonId, Set<PersonId>>()
  const childrenOf = new Map<PersonId, Set<PersonId>>()
  const spousesOf = new Map<PersonId, Set<PersonId>>()
  const relationshipKeys = new Set<string>()
  const relCount = new Map<PersonId, number>()
  const issues: GraphIssue[] = []

  for (const person of people) {
    peopleById.set(person.id, person)
    parentsOf.set(person.id, new Set())
    childrenOf.set(person.id, new Set())
    spousesOf.set(person.id, new Set())
    relCount.set(person.id, 0)
    if (person.gender === 'unknown') {
      issues.push({
        code: 'UNKNOWN_GENDER',
        message: `${person.givenNames} has unknown gender`,
        personIds: [person.id],
      })
    }
  }

  for (const rel of relationships) {
    relationshipsById.set(rel.id, rel)
    const a = peopleById.get(rel.personAId)
    const b = peopleById.get(rel.personBId)

    if (!a || !b) {
      issues.push({
        code: 'MISSING_PERSON',
        message: `Relationship ${rel.id} references missing person`,
        relationshipId: rel.id,
        personIds: [rel.personAId, rel.personBId],
      })
      continue
    }

    if (a.familyId !== familyId || b.familyId !== familyId || rel.familyId !== familyId) {
      issues.push({
        code: 'CROSS_FAMILY',
        message: `Relationship ${rel.id} crosses families`,
        relationshipId: rel.id,
        personIds: [rel.personAId, rel.personBId],
      })
      continue
    }

    if (rel.personAId === rel.personBId) {
      issues.push({
        code: 'SELF_RELATIONSHIP',
        message: `Self relationship ${rel.id}`,
        relationshipId: rel.id,
        personIds: [rel.personAId],
      })
      continue
    }

    const key = relationshipKey(rel.type, rel.personAId, rel.personBId)
    if (relationshipKeys.has(key)) {
      issues.push({
        code: 'DUPLICATE_RELATIONSHIP',
        message: `Duplicate relationship ${rel.id}`,
        relationshipId: rel.id,
        personIds: [rel.personAId, rel.personBId],
      })
      continue
    }
    relationshipKeys.add(key)

    relCount.set(rel.personAId, (relCount.get(rel.personAId) ?? 0) + 1)
    relCount.set(rel.personBId, (relCount.get(rel.personBId) ?? 0) + 1)

    if (rel.type === 'spouse') {
      addToSetMap(spousesOf, rel.personAId, rel.personBId)
      addToSetMap(spousesOf, rel.personBId, rel.personAId)
    } else {
      addToSetMap(parentsOf, rel.personBId, rel.personAId)
      addToSetMap(childrenOf, rel.personAId, rel.personBId)
    }
  }

  const components = computeComponents(peopleById, spousesOf, parentsOf, childrenOf, relCount)

  for (const person of people) {
    const degree =
      (parentsOf.get(person.id)?.size ?? 0) +
      (childrenOf.get(person.id)?.size ?? 0) +
      (spousesOf.get(person.id)?.size ?? 0)
    if (degree === 0) {
      issues.push({
        code: 'DISCONNECTED_PERSON',
        message: `${person.givenNames} has no relationships`,
        personIds: [person.id],
      })
    }
  }

  return {
    familyId,
    peopleById,
    relationshipsById,
    parentsOf,
    childrenOf,
    spousesOf,
    relationshipKeys,
    components,
    issues,
  }
}

function computeComponents(
  peopleById: Map<PersonId, Person>,
  spousesOf: Map<PersonId, Set<PersonId>>,
  parentsOf: Map<PersonId, Set<PersonId>>,
  childrenOf: Map<PersonId, Set<PersonId>>,
  relCount: Map<PersonId, number>,
): ConnectedComponent[] {
  const visited = new Set<PersonId>()
  const components: ConnectedComponent[] = []

  const neighbors = (id: PersonId): PersonId[] => {
    const ids = new Set<PersonId>()
    for (const n of spousesOf.get(id) ?? []) ids.add(n)
    for (const n of parentsOf.get(id) ?? []) ids.add(n)
    for (const n of childrenOf.get(id) ?? []) ids.add(n)
    return [...ids]
  }

  for (const person of peopleById.values()) {
    if (visited.has(person.id)) continue
    const queue = [person.id]
    const members: PersonId[] = []
    while (queue.length > 0) {
      const current = queue.shift()!
      if (visited.has(current)) continue
      visited.add(current)
      members.push(current)
      for (const n of neighbors(current)) {
        if (!visited.has(n)) queue.push(n)
      }
    }
    components.push({
      memberIds: new Set(members),
      representativeId: pickRepresentative(members, relCount),
      size: members.length,
    })
  }

  return components.sort((a, b) => b.size - a.size)
}

export function getPerson(graph: FamilyGraph, id: PersonId): Person | undefined {
  return graph.peopleById.get(id)
}

export function getParents(graph: FamilyGraph, personId: PersonId): Person[] {
  return [...(graph.parentsOf.get(personId) ?? [])].map((id) => graph.peopleById.get(id)!).filter(Boolean)
}

export function getChildren(graph: FamilyGraph, personId: PersonId): Person[] {
  return [...(graph.childrenOf.get(personId) ?? [])].map((id) => graph.peopleById.get(id)!).filter(Boolean)
}

export function getSpouses(graph: FamilyGraph, personId: PersonId): Person[] {
  return [...(graph.spousesOf.get(personId) ?? [])].map((id) => graph.peopleById.get(id)!).filter(Boolean)
}

export function wouldCreateAncestryCycle(
  graph: FamilyGraph,
  parentId: PersonId,
  childId: PersonId,
): boolean {
  const visited = new Set<PersonId>()
  const queue = [parentId]
  while (queue.length > 0) {
    const current = queue.shift()!
    if (current === childId) return true
    if (visited.has(current)) continue
    visited.add(current)
    for (const ancestor of graph.parentsOf.get(current) ?? []) {
      if (!visited.has(ancestor)) queue.push(ancestor)
    }
  }
  return false
}
