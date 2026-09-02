import type { FamilyGraph, PersonId } from './types'

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

/**
 * People hidden when the given persons' descendant branches are folded.
 * The folded person and their spouses stay visible.
 */
export function hiddenPersonIds(
  graph: FamilyGraph,
  collapsedIds: ReadonlySet<PersonId>,
): Set<PersonId> {
  const hidden = new Set<PersonId>()
  const collapsedSpouses = new Set<PersonId>()
  for (const id of collapsedIds) {
    for (const spouse of graph.spousesOf.get(id) ?? []) collapsedSpouses.add(spouse)
    collapsedSpouses.add(id)
  }

  for (const collapsed of collapsedIds) {
    for (const descendant of descendantIds(graph, collapsed)) {
      hidden.add(descendant)
      for (const spouse of graph.spousesOf.get(descendant) ?? []) {
        if (!collapsedSpouses.has(spouse)) hidden.add(spouse)
      }
    }
  }

  for (const id of collapsedSpouses) hidden.delete(id)
  return hidden
}

export function isBranchCollapsed(
  graph: FamilyGraph,
  hidden: ReadonlySet<PersonId>,
  personId: PersonId,
): boolean {
  const children = graph.childrenOf.get(personId)
  if (!children || children.size === 0) return false
  return [...children].every((child) => hidden.has(child))
}

export function toggleCollapsedPerson(
  graph: FamilyGraph,
  collapsedIds: ReadonlySet<PersonId>,
  personId: PersonId,
): Set<PersonId> {
  const next = new Set(collapsedIds)
  const hidden = hiddenPersonIds(graph, next)
  if (isBranchCollapsed(graph, hidden, personId)) {
    const children = graph.childrenOf.get(personId) ?? new Set()
    for (const id of [...next]) {
      const wouldHide = descendantIds(graph, id)
      if (id === personId || [...children].some((child) => wouldHide.has(child))) {
        next.delete(id)
      }
    }
    for (const spouse of graph.spousesOf.get(personId) ?? []) next.delete(spouse)
    return next
  }
  next.add(personId)
  return next
}
