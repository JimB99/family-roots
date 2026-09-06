import type { LayoutNode } from './layout-model'
import { type FamilyStructure } from './family-structure'
import { comparePersons, compareSiblingLayoutOrder, sortSiblingChildIds } from './layout-order'
import { marriageChains, natalClusterKey } from './marriage-chains'

export interface Branch {
  /** Stable id for subtree offset tracking. */
  id: string
  /** Natal blood anchor at this branch's top row. */
  anchorId: string
  row: number
  /** Marriage chain on the anchor row. */
  members: string[]
  /** Direct children at row+1 from this branch's unions, birth-order sorted. */
  directChildIds: string[]
  /** Nested branches for direct children with descendants. */
  childBranches: Branch[]
}

export interface BranchForest {
  branches: Branch[]
  rootGen: number
  branchGen: number
  rootIds: string[]
  maxGen: number
}

function sortKey(node: LayoutNode) {
  return { birthYear: node.birthYear ?? Number.POSITIVE_INFINITY, id: node.id }
}

export function parentRowMembersForScope(
  parentScope: Set<string> | null,
  structure: FamilyStructure,
  nodeById: Map<string, LayoutNode>,
): string[] {
  if (parentScope == null || parentScope.size === 0) return []
  const chains = marriageChains([...parentScope], structure, nodeById, {
    excludeCrossFamilySpouseLinks: true,
  })
  if (chains.length === 0) return [...parentScope]

  const orderedChains = [...chains].sort((left, right) => {
    const leftNode = nodeById.get(left[0]!)
    const rightNode = nodeById.get(right[0]!)
    if (!leftNode || !rightNode) return 0
    return comparePersons(sortKey(leftNode), sortKey(rightNode))
  })

  const members: string[] = []
  const seen = new Set<string>()
  for (const chain of orderedChains) {
    for (const id of chain) {
      if (seen.has(id)) continue
      seen.add(id)
      members.push(id)
    }
  }
  for (const id of parentScope) {
    if (!seen.has(id)) members.push(id)
  }
  return members
}

function compareBranchesForParentRow(
  left: Branch,
  right: Branch,
  parentRowMembers: string[],
  structure: FamilyStructure,
  nodeById: Map<string, LayoutNode>,
): number {
  if (parentRowMembers.length > 0) {
    return compareSiblingLayoutOrder(
      nodeById.get(left.anchorId)!,
      nodeById.get(right.anchorId)!,
      structure,
      parentRowMembers,
    )
  }
  return comparePersons(sortKey(nodeById.get(left.anchorId)!), sortKey(nodeById.get(right.anchorId)!))
}

function pickHub(
  chain: string[],
  parentScope: Set<string> | null,
  structure: FamilyStructure,
): string {
  const withParents =
    parentScope == null
      ? chain.find((id) => (structure.parentsOfPerson.get(id) ?? []).length > 0)
      : chain.find((id) =>
          (structure.parentsOfPerson.get(id) ?? []).some((parent) => parentScope.has(parent)),
        )
  return (
    withParents ??
    chain.find((id) => (structure.childrenOfPerson.get(id) ?? []).length > 0) ??
    chain[0]!
  )
}

function orderChain(
  chain: string[],
  hubId: string,
  structure: FamilyStructure,
  nodeById: Map<string, LayoutNode>,
): string[] {
  if (chain.length <= 1) return chain
  if (chain.length === 2) {
    const other = chain.find((id) => id !== hubId)
    return other ? [hubId, other] : chain
  }
  return (
    marriageChains(chain, structure, nodeById, { excludeCrossFamilySpouseLinks: true }).find((members) =>
      members.includes(hubId),
    ) ?? chain
  )
}

function directChildrenAtRow(
  memberIds: string[],
  childRow: number,
  structure: FamilyStructure,
  generations: Map<string, number>,
  nodeById: Map<string, LayoutNode>,
): string[] {
  const memberSet = new Set(memberIds)
  const children = new Set<string>()
  for (const [unionId, parents] of structure.unionParents) {
    if (!parents.some((parent) => memberSet.has(parent))) continue
    for (const child of structure.unionChildren.get(unionId) ?? []) {
      if ((generations.get(child) ?? 0) === childRow) children.add(child)
    }
  }
  return sortSiblingChildIds([...children], structure, nodeById, memberIds)
}

function hasChildRowSpouse(
  personId: string,
  childRow: number,
  structure: FamilyStructure,
  generations: Map<string, number>,
): boolean {
  for (const [a, b] of structure.spouseLinks) {
    const partner = a === personId ? b : b === personId ? a : null
    if (partner != null && (generations.get(partner) ?? 0) === childRow) return true
  }
  return false
}

function hasDescendantsAtRow(
  personId: string,
  belowRow: number,
  structure: FamilyStructure,
  generations: Map<string, number>,
): boolean {
  const queue = [...(structure.childrenOfPerson.get(personId) ?? [])]
  const seen = new Set<string>()
  while (queue.length > 0) {
    const id = queue.pop()!
    if (seen.has(id)) continue
    seen.add(id)
    if ((generations.get(id) ?? 0) > belowRow) return true
    for (const child of structure.childrenOfPerson.get(id) ?? []) {
      if (!seen.has(child)) queue.push(child)
    }
  }
  return false
}

function buildBranchFromChain(
  chain: string[],
  row: number,
  parentScope: Set<string> | null,
  structure: FamilyStructure,
  generations: Map<string, number>,
  nodeById: Map<string, LayoutNode>,
  branchCounter: { next: number },
): Branch {
  const hubId = pickHub(chain, parentScope, structure)
  const members = orderChain(chain, hubId, structure, nodeById)
  const childRow = row + 1
  const directChildIds = directChildrenAtRow(members, childRow, structure, generations, nodeById)

  const childBranches: Branch[] = []
  for (const childId of directChildIds) {
    if (
      !hasDescendantsAtRow(childId, childRow, structure, generations) &&
      !hasChildRowSpouse(childId, childRow, structure, generations)
    ) {
      continue
    }
    const childRowPersons = [childId]
    for (const spouseId of structure.spouseLinks.flatMap(([a, b]) =>
      a === childId ? [b] : b === childId ? [a] : [],
    )) {
      if ((generations.get(spouseId) ?? 0) === childRow) childRowPersons.push(spouseId)
    }
    const childChains = marriageChains(childRowPersons, structure, nodeById, {
      excludeCrossFamilySpouseLinks: true,
    })
    const childChain = childChains.find((members) => members.includes(childId)) ?? [childId]
    childBranches.push(
      buildBranchFromChain(childChain, childRow, new Set(members), structure, generations, nodeById, branchCounter),
    )
  }

  const id = `branch:${branchCounter.next++}`
  return { id, anchorId: hubId, row, members, directChildIds, childBranches }
}

function attachJoinSpouses(members: string[], rowPersonIds: string[], structure: FamilyStructure): string[] {
  const rowSet = new Set(rowPersonIds)
  const expanded = new Set(members)
  for (const id of members) {
    for (const [a, b] of structure.spouseLinks) {
      const partner = a === id ? b : b === id ? a : null
      if (partner == null || !rowSet.has(partner)) continue
      const aKey = natalClusterKey(a, structure)
      const bKey = natalClusterKey(b, structure)
      if (aKey === bKey || aKey === '' || bKey === '') continue
      expanded.add(partner)
    }
  }
  return [...expanded]
}

function buildBranchesAtRow(
  row: number,
  rowPersonIds: string[],
  parentScope: Set<string> | null,
  structure: FamilyStructure,
  generations: Map<string, number>,
  nodeById: Map<string, LayoutNode>,
  branchCounter: { next: number },
): Branch[] {
  const chains = marriageChains(rowPersonIds, structure, nodeById, {
    excludeCrossFamilySpouseLinks: true,
  })
  const parentRowMembers = parentRowMembersForScope(parentScope, structure, nodeById)
  chains.sort((a, b) => {
    const leftNode = nodeById.get(a[0])!
    const rightNode = nodeById.get(b[0])!
    if (parentRowMembers.length > 0) {
      return compareSiblingLayoutOrder(leftNode, rightNode, structure, parentRowMembers)
    }
    return comparePersons(sortKey(leftNode), sortKey(rightNode))
  })
  return chains.map((chain) => {
    const withJoinSpouses = attachJoinSpouses(chain, rowPersonIds, structure)
    return buildBranchFromChain(
      withJoinSpouses,
      row,
      parentScope,
      structure,
      generations,
      nodeById,
      branchCounter,
    )
  })
}

export function buildBranchForest(
  personIds: string[],
  structure: FamilyStructure,
  generations: Map<string, number>,
  nodeById: Map<string, LayoutNode>,
): BranchForest {
  const rootGen = Math.min(...personIds.map((id) => generations.get(id) ?? 0))
  const maxGen = Math.max(...personIds.map((id) => generations.get(id) ?? 0))
  const rootIds = personIds.filter((id) => (generations.get(id) ?? 0) === rootGen)
  const branchRow = rootGen + 1
  const branchRowPersons = personIds.filter((id) => (generations.get(id) ?? 0) === branchRow)
  const branchCounter = { next: 0 }

  if (branchRowPersons.length > 0) {
    const parentScope = new Set(rootIds)
    const branches = buildBranchesAtRow(
      branchRow,
      branchRowPersons,
      parentScope,
      structure,
      generations,
      nodeById,
      branchCounter,
    )
    const parentRowMembers = parentRowMembersForScope(parentScope, structure, nodeById)
    branches.sort((a, b) => compareBranchesForParentRow(a, b, parentRowMembers, structure, nodeById))
    return { branches, rootGen, branchGen: branchRow, rootIds, maxGen }
  }

  const branches = buildBranchesAtRow(
    rootGen,
    rootIds,
    null,
    structure,
    generations,
    nodeById,
    branchCounter,
  )
  return { branches, rootGen, branchGen: rootGen, rootIds, maxGen }
}

/** Cross-family spouse pairs on a row (S4/S5 join marriages). */
export function crossFamilyCouplesAtRow(
  rowPersonIds: string[],
  structure: FamilyStructure,
): Array<[string, string]> {
  const rowSet = new Set(rowPersonIds)
  const couples: Array<[string, string]> = []
  for (const [a, b] of structure.spouseLinks) {
    if (!rowSet.has(a) || !rowSet.has(b)) continue
    const aKey = natalClusterKey(a, structure)
    const bKey = natalClusterKey(b, structure)
    if (aKey === bKey || aKey === '' || bKey === '') continue
    couples.push(a < b ? [a, b] : [b, a])
  }
  return couples
}
