import type { FamilyGraph, PersonId } from './types'

export function parentIdsOfChild(graph: FamilyGraph, childId: PersonId): PersonId[] {
  const parents = [...(graph.parentsOf.get(childId) ?? [])]
  if (parents.length === 0) return []
  const parentSet = new Set(parents)
  for (const parent of parents) {
    for (const spouse of graph.spousesOf.get(parent) ?? []) {
      if (graph.parentsOf.get(childId)?.has(spouse)) parentSet.add(spouse)
    }
  }
  return [...parentSet].sort()
}

export function unionIdFromParentIds(parentIds: PersonId[]): string | null {
  if (parentIds.length === 0) return null
  if (parentIds.length >= 2) return `union:${parentIds.join('|')}`
  return `union:single:${parentIds[0]}`
}

export function unionIdForChild(graph: FamilyGraph, childId: PersonId): string | null {
  return unionIdFromParentIds(parentIdsOfChild(graph, childId))
}

export function parentIdsFromUnionId(unionId: string): PersonId[] {
  if (unionId.startsWith('union:single:')) return [unionId.slice('union:single:'.length)]
  if (unionId.startsWith('union:')) return unionId.slice('union:'.length).split('|')
  return []
}
