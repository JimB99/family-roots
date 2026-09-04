import type { FamilyGraph, PersonId } from './types'
import { unionIdForChild } from './union-id'

export function directLinePersonIds(graph: FamilyGraph, personId: PersonId): Set<PersonId> {
  const line = new Set<PersonId>([personId])
  const up = [...(graph.parentsOf.get(personId) ?? [])]
  while (up.length > 0) {
    const id = up.pop()!
    if (line.has(id)) continue
    line.add(id)
    for (const parent of graph.parentsOf.get(id) ?? []) {
      if (!line.has(parent)) up.push(parent)
    }
  }

  const down = [...(graph.childrenOf.get(personId) ?? [])]
  while (down.length > 0) {
    const id = down.pop()!
    if (line.has(id)) continue
    line.add(id)
    for (const child of graph.childrenOf.get(id) ?? []) {
      if (!line.has(child)) down.push(child)
    }
  }

  return line
}

export function directLineUnionIds(graph: FamilyGraph, personIds: ReadonlySet<PersonId>): Set<string> {
  const unions = new Set<string>()
  for (const personId of personIds) {
    const unionId = unionIdForChild(graph, personId)
    if (unionId) unions.add(unionId)
  }
  return unions
}
