import type { FamilyGraph, PersonId } from '../types'
import { findBloodKinshipBetween } from './blood-kinship'
import { invertKinshipDescriptor } from './invert-kinship-descriptor'
import type { KinshipDescriptor } from './types'

function isSpouse(graph: FamilyGraph, aId: PersonId, bId: PersonId): boolean {
  return (graph.spousesOf.get(aId) ?? new Set()).has(bId)
}

function isBloodSibling(descriptor: KinshipDescriptor): boolean {
  return descriptor.category === 'sibling'
}

export function findStepParent(
  graph: FamilyGraph,
  fromId: PersonId,
  toId: PersonId,
): KinshipDescriptor | null {
  for (const parentId of graph.parentsOf.get(fromId) ?? []) {
    for (const spouseId of graph.spousesOf.get(parentId) ?? []) {
      if (spouseId !== toId) continue
      if ((graph.parentsOf.get(fromId) ?? new Set()).has(toId)) continue
      return { category: 'step_parent' }
    }
  }
  return null
}

export function findStepChild(
  graph: FamilyGraph,
  fromId: PersonId,
  toId: PersonId,
): KinshipDescriptor | null {
  for (const spouseId of graph.spousesOf.get(fromId) ?? []) {
    for (const childId of graph.childrenOf.get(spouseId) ?? []) {
      if (childId !== toId) continue
      if ((graph.childrenOf.get(fromId) ?? new Set()).has(toId)) continue
      return { category: 'step_child' }
    }
  }
  return null
}

export function findStepSibling(
  graph: FamilyGraph,
  fromId: PersonId,
  toId: PersonId,
): KinshipDescriptor | null {
  const blood = findBloodKinshipBetween(graph, fromId, toId)
  if (blood && isBloodSibling(blood.fromTo)) return null

  for (const parentId of graph.parentsOf.get(fromId) ?? []) {
    for (const spouseId of graph.spousesOf.get(parentId) ?? []) {
      if ((graph.parentsOf.get(fromId) ?? new Set()).has(spouseId)) continue
      if ((graph.parentsOf.get(toId) ?? new Set()).has(spouseId)) {
        return { category: 'step_sibling' }
      }
    }
  }

  for (const spouseId of graph.spousesOf.get(fromId) ?? []) {
    for (const childId of graph.childrenOf.get(spouseId) ?? []) {
      if (childId === fromId) continue
      if (childId === toId) continue
      if ((graph.parentsOf.get(toId) ?? new Set()).has(spouseId)) continue
      const sharedParent = [...(graph.parentsOf.get(fromId) ?? [])].some((parentId) =>
        (graph.parentsOf.get(toId) ?? new Set()).has(parentId),
      )
      if (sharedParent) continue
      if ((graph.childrenOf.get(spouseId) ?? new Set()).has(toId)) {
        return { category: 'step_sibling' }
      }
    }
  }

  return null
}

export function findParentInLaw(
  graph: FamilyGraph,
  fromId: PersonId,
  toId: PersonId,
): KinshipDescriptor | null {
  for (const spouseId of graph.spousesOf.get(fromId) ?? []) {
    let current = spouseId
    let generationsUp = 0
    const visited = new Set<PersonId>([spouseId])

    while (true) {
      const parents = [...(graph.parentsOf.get(current) ?? [])]
      if (parents.length === 0) break
      generationsUp += 1
      if (parents.includes(toId)) {
        return { category: 'parent_in_law', generationsUp }
      }
      const next = parents[0]!
      if (visited.has(next)) break
      visited.add(next)
      current = next
    }
  }
  return null
}

export function findChildInLaw(
  graph: FamilyGraph,
  fromId: PersonId,
  toId: PersonId,
): KinshipDescriptor | null {
  for (const childId of graph.childrenOf.get(fromId) ?? []) {
    for (const spouseId of graph.spousesOf.get(childId) ?? []) {
      if (spouseId !== toId) continue
      return { category: 'child_in_law', generationsDown: 1 }
    }
  }
  return null
}

export function findInLawViaSpouseOfRelative(
  graph: FamilyGraph,
  fromId: PersonId,
  toId: PersonId,
): KinshipDescriptor | null {
  for (const relativeId of graph.peopleById.keys()) {
    if (relativeId === fromId || relativeId === toId) continue
    if (!isSpouse(graph, relativeId, toId)) continue

    const blood = findBloodKinshipBetween(graph, fromId, relativeId)
    if (!blood) continue
    if (blood.fromTo.category === 'self' || blood.fromTo.category === 'spouse') continue
    if (blood.fromTo.category === 'unrelated') continue

    return { category: 'in_law', via: blood.fromTo }
  }
  return null
}

export interface MarriageKinshipMatch {
  fromTo: KinshipDescriptor
  toFrom: KinshipDescriptor
}

export function findMarriageKinship(
  graph: FamilyGraph,
  fromId: PersonId,
  toId: PersonId,
): MarriageKinshipMatch | null {
  if (isSpouse(graph, fromId, toId)) {
    return {
      fromTo: { category: 'spouse' },
      toFrom: { category: 'spouse' },
    }
  }

  const checks: ((graph: FamilyGraph, fromId: PersonId, toId: PersonId) => KinshipDescriptor | null)[] =
    [
      findStepParent,
      findStepChild,
      findStepSibling,
      findParentInLaw,
      findChildInLaw,
      findInLawViaSpouseOfRelative,
    ]

  for (const check of checks) {
    const fromTo = check(graph, fromId, toId)
    if (!fromTo) continue
    const reverse = check(graph, toId, fromId)
    const toFrom = reverse ?? invertKinshipDescriptor(fromTo)
    return { fromTo, toFrom }
  }

  return null
}

export function areInSameComponent(graph: FamilyGraph, aId: PersonId, bId: PersonId): boolean {
  for (const component of graph.components) {
    if (component.memberIds.has(aId) && component.memberIds.has(bId)) return true
  }
  return false
}
