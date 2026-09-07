import type { FamilyGraph, PersonId } from '../types'
import type { AncestorIndex } from './types'

export function buildAncestorIndex(graph: FamilyGraph, personId: PersonId): AncestorIndex {
  const distances = new Map<PersonId, number>()
  distances.set(personId, 0)
  const queue = [personId]

  while (queue.length > 0) {
    const current = queue.shift()!
    const currentDistance = distances.get(current)!
    for (const parentId of graph.parentsOf.get(current) ?? []) {
      if (distances.has(parentId)) continue
      distances.set(parentId, currentDistance + 1)
      queue.push(parentId)
    }
  }

  return { distances }
}

export function findLowestCommonAncestors(
  indexA: AncestorIndex,
  indexB: AncestorIndex,
): { ancestorId: PersonId; gA: number; gB: number }[] {
  const candidates: { ancestorId: PersonId; gA: number; gB: number; total: number }[] = []

  for (const [ancestorId, gA] of indexA.distances) {
    const gB = indexB.distances.get(ancestorId)
    if (gB === undefined) continue
    candidates.push({ ancestorId, gA, gB, total: gA + gB })
  }

  if (candidates.length === 0) return []

  const minTotal = Math.min(...candidates.map((c) => c.total))
  return candidates
    .filter((c) => c.total === minTotal)
    .map(({ ancestorId, gA, gB }) => ({ ancestorId, gA, gB }))
}
