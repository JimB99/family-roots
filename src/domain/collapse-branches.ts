import type { FamilyGraph, PersonId } from './types'
import { parentIdsFromUnionId, parentIdsOfChild, unionIdForChild } from './union-id'

export function descendantIds(graph: FamilyGraph, personId: PersonId): Set<PersonId> {
  const found = new Set<PersonId>()
  const stack = [...(graph.childrenOf.get(personId) ?? [])]
  while (stack.length > 0) {
    const id = stack.pop()!
    if (found.has(id) || id === personId) continue
    found.add(id)
    for (const child of graph.childrenOf.get(id) ?? []) {
      if (!found.has(child)) stack.push(child)
    }
  }
  return found
}

function otherSpousesOfUnion(graph: FamilyGraph, unionParents: ReadonlySet<PersonId>): Set<PersonId> {
  const other = new Set<PersonId>()
  for (const parent of unionParents) {
    for (const spouse of graph.spousesOf.get(parent) ?? []) {
      if (!unionParents.has(spouse)) other.add(spouse)
    }
  }
  return other
}

/** True when this person is offspring of the folded couple, not of another marriage. */
export function isOffspringOfUnion(graph: FamilyGraph, personId: PersonId, unionId: string): boolean {
  const unionParents = new Set(parentIdsFromUnionId(unionId))
  if (unionParents.size === 0) return unionIdForChild(graph, personId) === unionId

  const parents = parentIdsOfChild(graph, personId)
  if (parents.length === 0) return false
  if (!parents.some((parent) => unionParents.has(parent))) return false

  const otherSpouses = otherSpousesOfUnion(graph, unionParents)
  return !parents.some((parent) => otherSpouses.has(parent))
}

/**
 * People hidden when the given unions' child branches are folded.
 * The union's parents stay visible.
 */
export function hiddenPersonIds(
  graph: FamilyGraph,
  collapsedUnionIds: ReadonlySet<string>,
): Set<PersonId> {
  const hidden = new Set<PersonId>()
  const keep = new Set<PersonId>()
  for (const unionId of collapsedUnionIds) {
    for (const parent of parentIdsFromUnionId(unionId)) keep.add(parent)
  }

  for (const person of graph.peopleById.values()) {
    const isOffspring = [...collapsedUnionIds].some((unionId) =>
      isOffspringOfUnion(graph, person.id, unionId),
    )
    if (!isOffspring) continue
    hidden.add(person.id)
    for (const descendant of descendantIds(graph, person.id)) hidden.add(descendant)
  }

  for (const id of [...hidden]) {
    for (const spouse of graph.spousesOf.get(id) ?? []) {
      if (!keep.has(spouse)) hidden.add(spouse)
    }
  }

  for (const id of keep) hidden.delete(id)
  return hidden
}

export function toggleCollapsedUnion(
  _graph: FamilyGraph,
  collapsedUnionIds: ReadonlySet<string>,
  unionId: string,
): Set<string> {
  const next = new Set(collapsedUnionIds)
  if (next.has(unionId)) next.delete(unionId)
  else next.add(unionId)
  return next
}

export function unionsHidingPerson(
  graph: FamilyGraph,
  collapsedUnionIds: ReadonlySet<string>,
  personId: PersonId,
): string[] {
  return [...collapsedUnionIds].filter((unionId) =>
    hiddenPersonIds(graph, new Set([unionId])).has(personId),
  )
}

export function childIdsOfUnion(graph: FamilyGraph, unionId: string): PersonId[] {
  const children: PersonId[] = []
  for (const person of graph.peopleById.values()) {
    if (isOffspringOfUnion(graph, person.id, unionId)) children.push(person.id)
  }
  return children
}
