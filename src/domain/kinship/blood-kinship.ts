import { parentIdsOfChild } from '../union-id'
import type { FamilyGraph, PersonId } from '../types'
import { buildAncestorIndex, findLowestCommonAncestors } from './ancestor-index'
import type { AncestorIndex, KinshipDescriptor, KinshipPath, SiblingKind } from './types'

function setsEqual(a: ReadonlySet<PersonId>, b: ReadonlySet<PersonId>): boolean {
  if (a.size !== b.size) return false
  for (const id of a) if (!b.has(id)) return false
  return true
}

function siblingKind(graph: FamilyGraph, personAId: PersonId, personBId: PersonId): SiblingKind {
  const parentsA = new Set(parentIdsOfChild(graph, personAId))
  const parentsB = new Set(parentIdsOfChild(graph, personBId))
  const shared = [...parentsA].filter((id) => parentsB.has(id))
  if (shared.length >= 2 || setsEqual(parentsA, parentsB)) return 'full'
  return 'half'
}

export function classifyBloodKinship(
  graph: FamilyGraph,
  fromId: PersonId,
  toId: PersonId,
  mrca: { ancestorId: PersonId; gA: number; gB: number },
): KinshipDescriptor {
  const { gA, gB } = mrca

  if (gB === 0 && gA > 0) {
    return { category: 'direct_ancestor', generationsUp: gA }
  }
  if (gA === 0 && gB > 0) {
    return { category: 'direct_descendant', generationsDown: gB }
  }
  if (gA === 1 && gB === 1) {
    return { category: 'sibling', kind: siblingKind(graph, fromId, toId) }
  }

  const min = Math.min(gA, gB)
  const max = Math.max(gA, gB)

  if (min === 1 && max >= 2) {
    if (gB === 1 && gA >= 2) {
      return { category: 'collateral_aunt_uncle', generationsUp: gA - 1 }
    }
    return { category: 'collateral_niece_nephew', generationsDown: gB - 1 }
  }

  if (gA >= 2 && gB >= 2) {
    return {
      category: 'cousin',
      degree: min - 1,
      removal: Math.abs(gA - gB),
    }
  }

  return { category: 'unrelated' }
}

export function invertBloodDescriptor(
  graph: FamilyGraph,
  fromId: PersonId,
  toId: PersonId,
  descriptor: KinshipDescriptor,
  mrca: { ancestorId: PersonId; gA: number; gB: number },
): KinshipDescriptor {
  const { gA, gB } = mrca

  switch (descriptor.category) {
    case 'direct_ancestor':
      return { category: 'direct_descendant', generationsDown: descriptor.generationsUp }
    case 'direct_descendant':
      return { category: 'direct_ancestor', generationsUp: descriptor.generationsDown }
    case 'sibling':
      return { category: 'sibling', kind: siblingKind(graph, toId, fromId) }
    case 'collateral_aunt_uncle':
      return { category: 'collateral_niece_nephew', generationsDown: gA - 1 }
    case 'collateral_niece_nephew':
      return { category: 'collateral_aunt_uncle', generationsUp: gB - 1 }
    case 'cousin':
      return { category: 'cousin', degree: descriptor.degree, removal: descriptor.removal }
    default:
      return descriptor
  }
}

function parentPath(
  graph: FamilyGraph,
  index: AncestorIndex,
  fromId: PersonId,
  ancestorId: PersonId,
): PersonId[] {
  const path: PersonId[] = [fromId]
  let current = fromId
  while (current !== ancestorId) {
    const currentDistance = index.distances.get(current)!
    const next = [...(graph.parentsOf.get(current) ?? [])].find(
      (parentId) => index.distances.get(parentId) === currentDistance - 1,
    )
    if (!next) break
    path.push(next)
    current = next
  }
  return path
}

function childPath(
  graph: FamilyGraph,
  index: AncestorIndex,
  fromId: PersonId,
  ancestorId: PersonId,
): PersonId[] {
  const path: PersonId[] = []
  let current = fromId
  while (current !== ancestorId) {
    path.unshift(current)
    const currentDistance = index.distances.get(current)!
    const next = [...(graph.parentsOf.get(current) ?? [])].find(
      (parentId) => index.distances.get(parentId) === currentDistance - 1,
    )
    if (!next) break
    current = next
  }
  path.unshift(ancestorId)
  return path
}

export function buildBloodPath(
  graph: FamilyGraph,
  fromId: PersonId,
  toId: PersonId,
  indexFrom: AncestorIndex,
  indexTo: AncestorIndex,
  mrca: { ancestorId: PersonId; gA: number; gB: number },
): KinshipPath {
  const upPath = parentPath(graph, indexFrom, fromId, mrca.ancestorId)
  const downPath = childPath(graph, indexTo, toId, mrca.ancestorId).slice(1)
  return {
    personIds: [...upPath, ...downPath],
    commonAncestorId: mrca.ancestorId,
  }
}

export interface BloodKinshipMatch {
  mrca: { ancestorId: PersonId; gA: number; gB: number }
  fromTo: KinshipDescriptor
  toFrom: KinshipDescriptor
  path: KinshipPath
  alternates: KinshipDescriptor[]
}

export function findBloodKinship(
  graph: FamilyGraph,
  fromId: PersonId,
  toId: PersonId,
): BloodKinshipMatch | null {
  const indexFrom = buildAncestorIndex(graph, fromId)
  const indexTo = buildAncestorIndex(graph, toId)
  const mrcas = findLowestCommonAncestors(indexFrom, indexTo)

  if (mrcas.length === 0) return null

  const primary = mrcas[0]!
  const fromTo = classifyBloodKinship(graph, fromId, toId, primary)
  if (fromTo.category === 'unrelated') return null

  const toFrom = invertBloodDescriptor(graph, fromId, toId, fromTo, primary)
  const path = buildBloodPath(graph, fromId, toId, indexFrom, indexTo, primary)

  const alternates =
    mrcas.length > 1
      ? mrcas.slice(1).map((mrca) => classifyBloodKinship(graph, fromId, toId, mrca))
      : []

  return { mrca: primary, fromTo, toFrom, path, alternates }
}

export function findBloodKinshipBetween(
  graph: FamilyGraph,
  fromId: PersonId,
  toId: PersonId,
): { fromTo: KinshipDescriptor; toFrom: KinshipDescriptor } | null {
  const match = findBloodKinship(graph, fromId, toId)
  if (!match) return null
  return { fromTo: match.fromTo, toFrom: match.toFrom }
}
