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

/** Expand hidden set with in-laws, their spouses, and entire descendant subtrees. */
function expandHiddenBranch(
  graph: FamilyGraph,
  hidden: Set<PersonId>,
  keep: ReadonlySet<PersonId>,
): void {
  let changed = true
  while (changed) {
    changed = false
    for (const id of hidden) {
      for (const spouse of graph.spousesOf.get(id) ?? []) {
        if (keep.has(spouse) || hidden.has(spouse)) continue
        hidden.add(spouse)
        changed = true
      }
      for (const descendant of descendantIds(graph, id)) {
        if (hidden.has(descendant)) continue
        hidden.add(descendant)
        changed = true
      }
    }
  }
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
  const candidateKeep = new Set<PersonId>()
  for (const unionId of collapsedUnionIds) {
    for (const parent of parentIdsFromUnionId(unionId)) candidateKeep.add(parent)
  }

  for (const person of graph.peopleById.values()) {
    const isOffspring = [...collapsedUnionIds].some((unionId) =>
      isOffspringOfUnion(graph, person.id, unionId),
    )
    if (isOffspring) hidden.add(person.id)
  }

  expandHiddenBranch(graph, hidden, new Set())

  const keep = new Set<PersonId>()
  for (const parent of candidateKeep) {
    if (!hidden.has(parent)) keep.add(parent)
  }
  for (const id of keep) hidden.delete(id)
  return hidden
}

/** Collapsed unions that still have at least one visible parent (not superseded by an ancestor fold). */
export function effectiveCollapsedUnionIds(
  graph: FamilyGraph,
  collapsedUnionIds: ReadonlySet<string>,
): Set<string> {
  const hidden = hiddenPersonIds(graph, collapsedUnionIds)
  const effective = new Set<string>()
  for (const unionId of collapsedUnionIds) {
    const parents = parentIdsFromUnionId(unionId)
    if (parents.length === 0) continue
    if (parents.every((id) => hidden.has(id))) continue
    effective.add(unionId)
  }
  return effective
}

export function normalizeCollapsedUnionIds(
  graph: FamilyGraph,
  collapsedUnionIds: ReadonlySet<string>,
): Set<string> {
  return effectiveCollapsedUnionIds(graph, collapsedUnionIds)
}

export function toggleCollapsedUnion(
  graph: FamilyGraph,
  collapsedUnionIds: ReadonlySet<string>,
  unionId: string,
): Set<string> {
  const next = new Set(collapsedUnionIds)
  if (next.has(unionId)) next.delete(unionId)
  else next.add(unionId)
  return normalizeCollapsedUnionIds(graph, next)
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
