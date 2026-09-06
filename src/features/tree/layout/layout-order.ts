import type { FamilyStructure } from './family-structure'

export interface SortKey {
  birthYear: number
  id: string
}

export interface SiblingSortNode {
  id: string
  birthYear: number | null
  givenNames?: string
  personId?: string | null
}

const UNDATED_BIRTH = Number.POSITIVE_INFINITY

export function sortKeyFromNode(node: SiblingSortNode): SortKey {
  return { birthYear: node.birthYear ?? UNDATED_BIRTH, id: node.id }
}

export function comparePersons(a: SortKey, b: SortKey): number {
  if (a.birthYear !== b.birthYear) return a.birthYear - b.birthYear
  return a.id.localeCompare(b.id)
}

function alphaLabel(node: SiblingSortNode): string {
  const label = node.givenNames?.trim() || node.personId || node.id.replace(/^person:/, '')
  return label.toLowerCase()
}

/** Left-to-right rank of the union that produced this child on the parent marriage row. */
export function unionOrderForChild(
  childId: string,
  structure: FamilyStructure,
  parentRowMembers: string[],
): number {
  let order = parentRowMembers.length
  for (const [unionId, children] of structure.unionChildren) {
    if (!children.includes(childId)) continue
    const parents = structure.unionParents.get(unionId) ?? []
    const ranks = parents
      .filter((parent) => parentRowMembers.includes(parent))
      .map((parent) => parentRowMembers.indexOf(parent))
    if (ranks.length === 0) continue
    order = Math.min(order, Math.min(...ranks))
  }
  return order
}

/** True when the row has two or more distinct unions with both spouses on the row. */
export function hasMultiUnionHubOnRow(
  parentRowMembers: string[],
  structure: FamilyStructure,
): boolean {
  if (parentRowMembers.length < 3) return false
  const memberSet = new Set(parentRowMembers)
  let unionsOnRow = 0
  for (const [, parents] of structure.unionParents) {
    const onRow = parents.filter((parent) => memberSet.has(parent))
    if (onRow.length >= 2) unionsOnRow++
  }
  return unionsOnRow >= 2
}

/** Two-parent union that produced this child with every union parent on the row. */
export function twoParentUnionIdOnRow(
  childId: string,
  parentRowMembers: string[],
  structure: FamilyStructure,
): string | null {
  const unionId = unionIdForChildOnRow(childId, new Set(parentRowMembers), structure)
  if (!unionId) return null
  const parents = structure.unionParents.get(unionId) ?? []
  return parents.filter((parent) => parentRowMembers.includes(parent)).length >= 2 ? unionId : null
}

/**
 * Multi-spouse hub with only leaf direct children: pack all children as one sibling row
 * centered under the full parent chain (S14 b2, S7, S11d/e, S12, …).
 */
export function shouldPackMultiUnionChildrenAsSiblings(
  memberIds: string[],
  childIds: string[],
  structure: FamilyStructure,
  options: { hasNestedChildBranches?: boolean } = {},
): boolean {
  if (!hasMultiUnionHubOnRow(memberIds, structure)) return false
  if (options.hasNestedChildBranches) return false
  if (childIds.length <= 1) return false
  return hasMultipleTwoParentUnionsAmongChildren(childIds, memberIds, structure)
}

/** True when child ids resolve to more than one distinct two-parent union on the row. */
export function hasMultipleTwoParentUnionsAmongChildren(
  childIds: string[],
  parentRowMembers: string[],
  structure: FamilyStructure,
): boolean {
  const unions = new Set<string>()
  for (const childId of childIds) {
    const unionId = twoParentUnionIdOnRow(childId, parentRowMembers, structure)
    if (unionId) unions.add(unionId)
  }
  return unions.size > 1
}

/** True when some direct children share both hub parents and others share only one hub parent. */
export function hasHalfSiblingChildrenOnHub(
  childIds: string[],
  parentRowMembers: string[],
  structure: FamilyStructure,
): boolean {
  const memberSet = new Set(parentRowMembers)
  let hasTwoParentChild = false
  let hasSingleParentChild = false
  for (const childId of childIds) {
    const unionId = unionIdForChildOnRow(childId, memberSet, structure)
    if (!unionId) continue
    const parents = structure.unionParents.get(unionId) ?? []
    const onRow = parents.filter((parent) => memberSet.has(parent))
    if (onRow.length >= 2) hasTwoParentChild = true
    else if (onRow.length === 1) hasSingleParentChild = true
  }
  return hasTwoParentChild && hasSingleParentChild
}

export function compareSiblingLayoutOrder(
  a: SiblingSortNode,
  b: SiblingSortNode,
  structure: FamilyStructure,
  parentRowMembers: string[],
): number {
  if (parentRowMembers.length > 0) {
    const unionA = twoParentUnionIdOnRow(a.id, parentRowMembers, structure)
    const unionB = twoParentUnionIdOnRow(b.id, parentRowMembers, structure)
    if (unionA && unionB && unionA !== unionB) {
      const orderA = unionOrderForChild(a.id, structure, parentRowMembers)
      const orderB = unionOrderForChild(b.id, structure, parentRowMembers)
      if (orderA !== orderB) return orderA - orderB
    }
  }

  const aDated = a.birthYear != null
  const bDated = b.birthYear != null
  if (aDated && bDated) {
    return comparePersons(sortKeyFromNode(a), sortKeyFromNode(b))
  }
  if (aDated !== bDated) {
    return aDated ? -1 : 1
  }

  const byAlpha = alphaLabel(a).localeCompare(alphaLabel(b))
  if (byAlpha !== 0) return byAlpha
  return a.id.localeCompare(b.id)
}

/** Union on this marriage row that produced the child (all union parents on the row). */
export function unionIdForChildOnRow(
  childId: string,
  memberSet: Set<string>,
  structure: FamilyStructure,
): string | null {
  for (const [unionId, children] of structure.unionChildren) {
    if (!children.includes(childId)) continue
    const parents = structure.unionParents.get(unionId) ?? []
    if (parents.length === 0) continue
    if (!parents.every((parent) => memberSet.has(parent))) continue
    return unionId
  }
  return null
}

/** Contiguous union groups preserving directChildIds order (requires union-first sort). */
export function groupDirectChildIdsByUnion(
  childIds: string[],
  memberIds: string[],
  structure: FamilyStructure,
): string[][] {
  if (childIds.length === 0) return []
  const memberSet = new Set(memberIds)
  const groups: string[][] = []
  let current: string[] = []
  let currentUnion: string | null = null
  for (const childId of childIds) {
    const unionId = unionIdForChildOnRow(childId, memberSet, structure)
    if (current.length > 0 && unionId !== currentUnion) {
      groups.push(current)
      current = []
    }
    currentUnion = unionId
    current.push(childId)
  }
  if (current.length > 0) groups.push(current)
  return groups
}

export function sortSiblingChildIds(
  childIds: string[],
  structure: FamilyStructure,
  nodeById: Map<string, SiblingSortNode>,
  parentRowMembers: string[],
): string[] {
  return [...childIds].sort((leftId, rightId) => {
    const left = nodeById.get(leftId)
    const right = nodeById.get(rightId)
    if (!left || !right) return 0
    return compareSiblingLayoutOrder(left, right, structure, parentRowMembers)
  })
}

export function meanOrNull(values: number[]): number | null {
  if (values.length === 0) return null
  let sum = 0
  for (const value of values) sum += value
  return sum / values.length
}

export function sortByKey<T>(items: T[], keyOf: (item: T) => SortKey): T[] {
  return [...items].sort((a, b) => comparePersons(keyOf(a), keyOf(b)))
}
