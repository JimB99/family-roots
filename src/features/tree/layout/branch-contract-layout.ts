import { type Branch, type BranchForest, buildBranchForest, parentRowMembersForScope } from './branch-tree'
import { branchSubtreeIds } from './branch-shift'
import { downwardSet } from './compact-subtrees'
import { assignGenerations, type FamilyStructure } from './family-structure'
import { applyJoinParentPlacement } from './join-parent-placement'
import type { PositionedNode } from './layout-model'
import { marriageChains } from './marriage-chains'
import { enforceRowMinimumGaps } from './resolve-row-overlaps'
import { shareNatalFamily } from './legacy-pack-pedigree'
import {
  groupDirectChildIdsByUnion,
  hasHalfSiblingChildrenOnHub,
  hasMultiUnionHubOnRow,
  hasMultipleTwoParentUnionsAmongChildren,
  shouldPackMultiUnionChildrenAsSiblings,
  sortSiblingChildIds,
  unionIdForChildOnRow,
} from './layout-order'
import { FAMILY_GAP, NODE_GAP, PERSON_H, PERSON_W, ROW_GAP, SIBLING_GAP } from './layout-spacing'

export const CONTRACT_PACK_STEPS = [
  'buildBranchForest',
  'packChildrenRow',
  'centerParentsRow',
  'placeChildlessBranchesRow',
  'enforceSiblingGapsRow',
  'centerParentGenerationRow',
  'enforceRowMinimumGaps',
  'repackHalfSiblingHubRows',
  'protectCoupleRowBands',
  'alignUnionChildGroups',
  'packCrossFamilyJoinRows',
] as const

export type ContractPackStep = (typeof CONTRACT_PACK_STEPS)[number]

interface Interval {
  left: number
  right: number
}

function rowY(generation: number, personHeight: number): number {
  return generation * (personHeight + ROW_GAP)
}

function interval(nodes: PositionedNode[], ids: string[]): Interval {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  let left = Infinity
  let right = -Infinity
  for (const id of ids) {
    const node = byId.get(id)
    if (!node) continue
    left = Math.min(left, node.x)
    right = Math.max(right, node.x + node.width)
  }
  if (!Number.isFinite(left)) return { left: 0, right: 0 }
  return { left, right }
}

function centerOf(span: Interval): number {
  return (span.left + span.right) / 2
}

function chainWidth(memberIds: string[], nodeById: Map<string, PositionedNode>): number {
  if (memberIds.length === 0) return 0
  let width = 0
  for (let i = 0; i < memberIds.length; i++) {
    if (i > 0) width += NODE_GAP
    width += nodeById.get(memberIds[i]!)?.width ?? PERSON_W
  }
  return width
}

function translateIds(nodes: PositionedNode[], ids: Set<string>, dx: number) {
  if (Math.abs(dx) < 0.5) return
  for (const node of nodes) {
    if (ids.has(node.id)) node.x += dx
  }
}

function shiftBranch(nodes: PositionedNode[], branch: Branch, structure: FamilyStructure, dx: number) {
  translateIds(nodes, branchSubtreeIds(branch, structure), dx)
}

function placeChain(
  memberIds: string[],
  left: number,
  y: number,
  nodeById: Map<string, PositionedNode>,
) {
  let cursor = left
  for (const id of memberIds) {
    const node = nodeById.get(id)
    if (!node) continue
    node.x = cursor
    node.y = y
    cursor += node.width + NODE_GAP
  }
}

function childBranchForDirectChild(branch: Branch, childId: string): Branch | undefined {
  return branch.childBranches.find(
    (child) => child.anchorId === childId || child.members.includes(childId),
  )
}

function childColumnIds(branch: Branch, structure: FamilyStructure): string[] {
  const ids: string[] = []
  for (const childId of branch.directChildIds) {
    const nested = childBranchForDirectChild(branch, childId)
    if (nested) {
      for (const id of branchSubtreeIds(nested, structure)) ids.push(id)
    } else {
      ids.push(childId)
    }
  }
  return ids
}

/** Horizontal span of direct children on the child row only (not deeper descendants). */
function childRowColumnIds(
  branch: Branch,
  nodes: PositionedNode[],
  personHeight: number,
): string[] {
  const childRow = branch.row + 1
  const y = rowY(childRow, personHeight)
  const ids: string[] = []
  for (const childId of branch.directChildIds) {
    const nested = childBranchForDirectChild(branch, childId)
    if (nested) {
      for (const memberId of nested.members) {
        const member = nodes.find((entry) => entry.id === memberId)
        if (member && Math.abs(member.y - y) < 0.5) ids.push(memberId)
      }
      const anchor = nodes.find((entry) => entry.id === nested.anchorId)
      if (anchor && Math.abs(anchor.y - y) < 0.5 && !ids.includes(nested.anchorId)) {
        ids.push(nested.anchorId)
      }
    } else {
      ids.push(childId)
    }
  }
  return ids
}

function directChildUnionGroups(branch: Branch, structure: FamilyStructure): string[][] {
  if (!shouldPackByUnionGroups(branch, structure)) return [branch.directChildIds]
  return groupDirectChildIdsByUnion(branch.directChildIds, branch.members, structure)
}

function shouldPackByUnionGroups(branch: Branch, structure: FamilyStructure): boolean {
  if (
    shouldPackMultiUnionChildrenAsSiblings(branch.members, branch.directChildIds, structure, {
      hasNestedChildBranches: branch.childBranches.length > 0,
    })
  ) {
    return false
  }
  if (hasHalfSiblingChildrenOnHub(branch.directChildIds, branch.members, structure)) {
    return false
  }
  return hasMultipleTwoParentUnionsAmongChildren(branch.directChildIds, branch.members, structure)
}

function branchSubtreeInterval(
  nodes: PositionedNode[],
  branch: Branch,
  structure: FamilyStructure,
): Interval {
  return interval(nodes, [...branchSubtreeIds(branch, structure)])
}

/** Horizontal span of a branch at its child row (cousin column), falling back to full subtree. */
function branchColumnInterval(
  nodes: PositionedNode[],
  branch: Branch,
  structure: FamilyStructure,
  personHeight: number,
): Interval {
  const childRow = branch.row + 1
  const y = rowY(childRow, personHeight)
  const columnIds = [...branchSubtreeIds(branch, structure)].filter((id) => {
    const node = nodes.find((entry) => entry.id === id)
    return node != null && Math.abs(node.y - y) < 0.5
  })
  if (columnIds.length > 0) return interval(nodes, columnIds)
  return branchSubtreeInterval(nodes, branch, structure)
}

function layoutNestedBranches(
  branches: Branch[],
  nodes: PositionedNode[],
  structure: FamilyStructure,
  personHeight: number,
  nodeById: Map<string, PositionedNode>,
) {
  for (const branch of branches) {
    for (const child of branch.childBranches) {
      layoutBranchSubtree(child, nodes, structure, personHeight, nodeById)
    }
    if (branch.directChildIds.length > 0) {
      packSiblingChildrenRow(branch, nodes, structure, personHeight, nodeById)
      if (branch.childBranches.length > 1) {
        enforceSiblingGapsRow(branch.childBranches, nodes, structure, true, personHeight)
      }
    }
  }
}

function layoutBranchSubtree(
  branch: Branch,
  nodes: PositionedNode[],
  structure: FamilyStructure,
  personHeight: number,
  nodeById: Map<string, PositionedNode>,
) {
  for (const child of branch.childBranches) {
    layoutBranchSubtree(child, nodes, structure, personHeight, nodeById)
  }

  if (branch.directChildIds.length === 0) {
    if (branch.members.length > 0) {
      const y = rowY(branch.row, personHeight)
      placeChain(branch.members, 0, y, nodeById)
    }
    return
  }
  packSiblingChildrenRow(branch, nodes, structure, personHeight, nodeById)
  if (branch.childBranches.length > 1) {
    enforceSiblingGapsRow(branch.childBranches, nodes, structure, true, personHeight)
  }
  centerParentsRow([branch], branch.row, nodes, structure, personHeight, nodeById, 'childRow')
}

function childColumnIdsForDirectChild(
  branch: Branch,
  childId: string,
  structure: FamilyStructure,
): string[] {
  const nested = childBranchForDirectChild(branch, childId)
  if (nested) return [...branchSubtreeIds(nested, structure)]
  return [childId]
}

function packDirectChildRun(
  branch: Branch,
  childIds: string[],
  startCursor: number,
  y: number,
  nodes: PositionedNode[],
  structure: FamilyStructure,
  nodeById: Map<string, PositionedNode>,
  personHeight: number,
) {
  const useChildRowColumns = hasHalfSiblingChildrenOnHub(
    branch.directChildIds,
    branch.members,
    structure,
  )
  let cursor = startCursor
  for (let i = 0; i < childIds.length; i++) {
    const childId = childIds[i]!
    const nested = childBranchForDirectChild(branch, childId)
    if (nested) {
      const span = useChildRowColumns
        ? branchColumnInterval(nodes, nested, structure, personHeight)
        : branchSubtreeInterval(nodes, nested, structure)
      const dx = cursor - span.left
      if (Math.abs(dx) > 0.5) shiftBranch(nodes, nested, structure, dx)
      for (const id of nested.members) {
        const member = nodeById.get(id)
        if (member) member.y = y
      }
      const placed = useChildRowColumns
        ? branchColumnInterval(nodes, nested, structure, personHeight)
        : branchSubtreeInterval(nodes, nested, structure)
      cursor = placed.right
    } else {
      const child = nodeById.get(childId)
      if (!child) continue
      child.x = cursor
      child.y = y
      cursor = child.x + child.width
    }
    if (i < childIds.length - 1) cursor += SIBLING_GAP
  }
  return cursor
}

function siblingRowStartCursor(
  branch: Branch,
  nodes: PositionedNode[],
  structure: FamilyStructure,
  personHeight: number,
): number {
  const childRow = branch.row + 1
  const y = rowY(childRow, personHeight)
  let left = Infinity
  for (const childId of branch.directChildIds) {
    const nested = childBranchForDirectChild(branch, childId)
    const ids = nested ? [...branchSubtreeIds(nested, structure)] : [childId]
    for (const id of ids) {
      const node = nodes.find((entry) => entry.id === id)
      if (node && Math.abs(node.y - y) < 0.5) left = Math.min(left, node.x)
    }
  }
  return Number.isFinite(left) ? left : 0
}

function repackHalfSiblingHubRow(
  branch: Branch,
  nodes: PositionedNode[],
  structure: FamilyStructure,
  personHeight: number,
  nodeById: Map<string, PositionedNode>,
) {
  if (!hasHalfSiblingChildrenOnHub(branch.directChildIds, branch.members, structure)) return
  const childRow = branch.row + 1
  const y = rowY(childRow, personHeight)
  const ordered = sortSiblingChildIds([...branch.directChildIds], structure, nodeById, branch.members)
  const startCursor = siblingRowStartCursor(branch, nodes, structure, personHeight)
  packDirectChildRun(branch, ordered, startCursor, y, nodes, structure, nodeById, personHeight)
  if (branch.childBranches.length > 1) {
    enforceSiblingGapsRow(branch.childBranches, nodes, structure, true, personHeight)
  }
  evictForeignNodesFromHalfSiblingHubBand(branch, nodes, structure, personHeight, nodeById)
  centerParentsRow([branch], branch.row, nodes, structure, personHeight, nodeById, 'childRow')
}

function halfSiblingHubReservedIds(branch: Branch, structure: FamilyStructure): Set<string> {
  const reserved = new Set<string>()
  for (const memberId of branch.members) reserved.add(memberId)
  for (const childId of branch.directChildIds) {
    const nested = childBranchForDirectChild(branch, childId)
    if (nested) {
      for (const id of branchSubtreeIds(nested, structure)) reserved.add(id)
    } else {
      reserved.add(childId)
    }
  }
  return reserved
}

/** Keep unrelated same-row cousins out of the hub sibling band after global gap passes. */
function evictForeignNodesFromHalfSiblingHubBand(
  branch: Branch,
  nodes: PositionedNode[],
  structure: FamilyStructure,
  personHeight: number,
  nodeById: Map<string, PositionedNode>,
) {
  const childRow = branch.row + 1
  const y = rowY(childRow, personHeight)
  const ordered = sortSiblingChildIds([...branch.directChildIds], structure, nodeById, branch.members)
  let bandLeft = Infinity
  let bandRight = -Infinity
  for (const childId of ordered) {
    const nested = childBranchForDirectChild(branch, childId)
    const column = nested
      ? branchColumnInterval(nodes, nested, structure, personHeight)
      : interval(nodes, [childId])
    bandLeft = Math.min(bandLeft, column.left)
    bandRight = Math.max(bandRight, column.right)
  }
  if (!Number.isFinite(bandLeft)) return

  const reserved = halfSiblingHubReservedIds(branch, structure)
  const intruders = nodes
    .filter(
      (node) =>
        node.kind === 'person' &&
        Math.abs(node.y - y) < 0.5 &&
        !reserved.has(node.id) &&
        node.x + node.width > bandLeft + 0.5 &&
        node.x < bandRight - 0.5,
    )
    .sort((a, b) => a.x - b.x)
  if (intruders.length === 0) return

  let cursor = bandRight + FAMILY_GAP
  for (const intruder of intruders) {
    const moving = downwardSet([intruder.id], structure)
    moving.add(intruder.id)
    const rowSpan = interval(
      nodes,
      [...moving].filter((id) => {
        const node = nodes.find((entry) => entry.id === id)
        return node != null && Math.abs(node.y - y) < 0.5
      }),
    )
    const dx = cursor - rowSpan.left
    if (dx > 0.5) translateIds(nodes, moving, dx)
    cursor = rowSpan.left + dx + (rowSpan.right - rowSpan.left) + FAMILY_GAP
  }
}

function areSpousesOnRow(
  a: string,
  b: string,
  rowById: Map<string, PositionedNode>,
  structure: FamilyStructure,
): boolean {
  const left = rowById.get(a)
  const right = rowById.get(b)
  if (!left || !right || Math.abs(left.y - right.y) > 0.5) return false
  for (const [x, y] of structure.spouseLinks) {
    if ((x === a && y === b) || (x === b && y === a)) return true
  }
  for (const parents of structure.unionParents.values()) {
    if (parents.includes(a) && parents.includes(b)) return true
  }
  return false
}

function couplesOnRow(rowNodes: PositionedNode[], structure: FamilyStructure): Array<[PositionedNode, PositionedNode]> {
  const rowById = new Map(rowNodes.map((node) => [node.id, node]))
  const seen = new Set<string>()
  const couples: Array<[PositionedNode, PositionedNode]> = []
  const consider = (a: string, b: string) => {
    if (!areSpousesOnRow(a, b, rowById, structure)) return
    const key = [a, b].sort().join('|')
    if (seen.has(key)) return
    seen.add(key)
    const leftNode = rowById.get(a)!
    const rightNode = rowById.get(b)!
    const left = leftNode.x <= rightNode.x ? leftNode : rightNode
    const right = left === leftNode ? rightNode : leftNode
    couples.push([left, right])
  }
  for (const node of rowNodes) {
    for (const [a, b] of structure.spouseLinks) {
      if (a === node.id || b === node.id) consider(a, b)
    }
  }
  for (const parents of structure.unionParents.values()) {
    if (parents.length === 2) consider(parents[0]!, parents[1]!)
  }
  return couples.sort((a, b) => a[0].x - b[0].x)
}

function rowSpanForCluster(
  nodes: PositionedNode[],
  moving: Set<string>,
  y: number,
): Interval {
  const ids = [...moving].filter((id) => {
    const node = nodes.find((entry) => entry.id === id)
    return node != null && Math.abs(node.y - y) < 0.5
  })
  return interval(nodes, ids)
}

/** No natal-relative or foreign node may sit between spouses — basic couple-contiguity rule. */
function evictIntrudersFromCoupleBand(
  nodes: PositionedNode[],
  leftPartner: PositionedNode,
  rightPartner: PositionedNode,
  structure: FamilyStructure,
) {
  const y = leftPartner.y
  const bandLeft = leftPartner.x
  const bandRight = rightPartner.x + rightPartner.width
  const reserved = new Set([leftPartner.id, rightPartner.id])
  const intruders = nodes
    .filter(
      (node) =>
        node.kind === 'person' &&
        Math.abs(node.y - y) < 0.5 &&
        !reserved.has(node.id) &&
        node.x + node.width > bandLeft + 0.5 &&
        node.x < bandRight - 0.5,
    )
    .sort((a, b) => a.x - b.x)
  if (intruders.length === 0) return

  const leftNatal = (id: string) => shareNatalFamily([id], [leftPartner.id], structure)
  const rightNatal = (id: string) => shareNatalFamily([id], [rightPartner.id], structure)

  const leftIntruders: PositionedNode[] = []
  const rightIntruders: PositionedNode[] = []
  for (const intruder of intruders) {
    if (leftNatal(intruder.id) && !rightNatal(intruder.id)) leftIntruders.push(intruder)
    else rightIntruders.push(intruder)
  }

  let cursor = bandLeft - FAMILY_GAP
  for (let i = leftIntruders.length - 1; i >= 0; i--) {
    const intruder = leftIntruders[i]!
    const moving = downwardSet([intruder.id], structure)
    moving.add(intruder.id)
    const rowSpan = rowSpanForCluster(nodes, moving, y)
    const dx = cursor - rowSpan.right
    if (Math.abs(dx) > 0.5) translateIds(nodes, moving, dx)
    cursor = rowSpan.left + dx - FAMILY_GAP
  }

  cursor = bandRight + FAMILY_GAP
  for (const intruder of rightIntruders) {
    if (intruder.x + intruder.width <= bandLeft + 0.5 || intruder.x >= bandRight - 0.5) continue
    const moving = downwardSet([intruder.id], structure)
    moving.add(intruder.id)
    const rowSpan = rowSpanForCluster(nodes, moving, y)
    const dx = cursor - rowSpan.left
    if (dx > 0.5) translateIds(nodes, moving, dx)
    cursor = rowSpan.left + dx + (rowSpan.right - rowSpan.left) + FAMILY_GAP
  }
}

function protectAllCoupleRowBands(ctx: LayoutContext) {
  for (let pass = 0; pass < 4; pass++) {
    let changed = false
    const rows = new Map<number, PositionedNode[]>()
    for (const node of ctx.nodes) {
      if (node.kind !== 'person') continue
      const list = rows.get(node.y) ?? []
      list.push(node)
      rows.set(node.y, list)
    }
    for (const rowNodes of rows.values()) {
      for (const [left, right] of couplesOnRow(rowNodes, ctx.structure)) {
        const before = left.x
        evictIntrudersFromCoupleBand(ctx.nodes, left, right, ctx.structure)
        if (Math.abs(left.x - before) > 0.5) changed = true
      }
    }
    if (!changed) break
  }
}

function repackAllHalfSiblingHubRows(ctx: LayoutContext) {
  for (const branch of ctx.forest.branches) {
    walkBranches(branch, (entry) => {
      if (entry.directChildIds.length > 1) {
        repackHalfSiblingHubRow(
          entry,
          ctx.nodes,
          ctx.structure,
          ctx.personHeight,
          ctx.nodeById,
        )
      }
    })
  }
}

function packSiblingChildrenRow(
  branch: Branch,
  nodes: PositionedNode[],
  structure: FamilyStructure,
  personHeight: number,
  nodeById: Map<string, PositionedNode>,
) {
  const childRow = branch.row + 1
  const y = rowY(childRow, personHeight)
  const useUnionGroups = shouldPackByUnionGroups(branch, structure)
  const orderedChildIds = sortSiblingChildIds(
    [...branch.directChildIds],
    structure,
    nodeById,
    branch.members,
  )
  const groups = useUnionGroups
    ? directChildUnionGroups(branch, structure)
    : [orderedChildIds]
  let cursor = 0

  for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
    if (useUnionGroups && groupIndex > 0) cursor += FAMILY_GAP
    cursor = packDirectChildRun(
      branch,
      groups[groupIndex]!,
      cursor,
      y,
      nodes,
      structure,
      nodeById,
      personHeight,
    )
  }
}

function packChildrenRow(
  branches: Branch[],
  childRow: number,
  nodes: PositionedNode[],
  structure: FamilyStructure,
  personHeight: number,
  nodeById: Map<string, PositionedNode>,
) {
  const y = rowY(childRow, personHeight)
  let cousinCursor = 0

  for (const branch of branches) {
    if (branch.directChildIds.length === 0) continue

    if (branch.childBranches.length === 0) {
      const useUnionGroups = shouldPackByUnionGroups(branch, structure)
      const groups = useUnionGroups
        ? directChildUnionGroups(branch, structure)
        : [branch.directChildIds]
      let left = cousinCursor === 0 ? 0 : cousinCursor + FAMILY_GAP
      for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
        if (useUnionGroups && groupIndex > 0) left += FAMILY_GAP
        const group = groups[groupIndex]!
        for (let i = 0; i < group.length; i++) {
          const childId = group[i]!
          const child = nodeById.get(childId)
          if (!child) continue
          child.x = left
          child.y = y
          left += child.width + (i < group.length - 1 ? SIBLING_GAP : 0)
        }
      }
      cousinCursor = interval(nodes, branch.directChildIds).right
      continue
    }

    const useUnionGroups = shouldPackByUnionGroups(branch, structure)
    const groups = useUnionGroups
      ? directChildUnionGroups(branch, structure)
      : [branch.directChildIds]
    let siblingCursor = cousinCursor > 0 ? cousinCursor + FAMILY_GAP : 0
    for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
      if (useUnionGroups && groupIndex > 0) siblingCursor += FAMILY_GAP
      siblingCursor = packDirectChildRun(
        branch,
        groups[groupIndex]!,
        siblingCursor,
        y,
        nodes,
        structure,
        nodeById,
        personHeight,
      )
    }
    cousinCursor = Math.max(
      cousinCursor,
      ...branch.directChildIds.map((childId) => {
        const nested = childBranchForDirectChild(branch, childId)
        if (nested) return branchSubtreeInterval(nodes, nested, structure).right
        const child = nodeById.get(childId)
        return child ? child.x + child.width : 0
      }),
    )
  }
}

function unionGroupsAtRowY(
  rowPersonIds: string[],
  rowYValue: number,
  nodes: PositionedNode[],
  structure: FamilyStructure,
): string[][] {
  const memberSet = new Set(rowPersonIds)
  const rowNodes = nodes
    .filter((node) => node.kind === 'person' && Math.abs(node.y - rowYValue) < 0.5)
    .filter((node) =>
      (structure.parentsOfPerson.get(node.id) ?? []).some((parent) => memberSet.has(parent)),
    )
    .sort((a, b) => a.x - b.x)
  if (rowNodes.length === 0) return []

  const groups: string[][] = []
  let current: string[] = []
  let currentUnion: string | null = null
  for (const node of rowNodes) {
    const unionId = unionIdForChildOnRow(node.id, memberSet, structure)
    if (current.length > 0 && unionId !== currentUnion) {
      groups.push(current)
      current = []
    }
    currentUnion = unionId
    current.push(node.id)
  }
  if (current.length > 0) groups.push(current)
  return groups
}

function shiftNodeCluster(nodes: PositionedNode[], ids: string[], structure: FamilyStructure, dx: number) {
  if (Math.abs(dx) < 0.5) return
  const moving = new Set<string>()
  for (const id of ids) {
    moving.add(id)
    for (const descendant of downwardSet([id], structure)) moving.add(descendant)
  }
  translateIds(nodes, moving, dx)
}

function repackUnionGroupsOnRow(
  rowMembers: string[],
  groups: string[][],
  nodes: PositionedNode[],
  structure: FamilyStructure,
) {
  if (!hasMultiUnionHubOnRow(rowMembers, structure) || groups.length <= 1) return

  const memberSet = new Set(rowMembers)
  const specs = groups
    .map((group) => {
      const unionId = unionIdForChildOnRow(group[0]!, memberSet, structure)
      if (!unionId) return null
      const parents = structure.unionParents.get(unionId) ?? []
      const onRow = rowMembers.filter((member) => parents.includes(member))
      if (onRow.length < 2) return null
      const unionCenter = centerOf(interval(nodes, onRow))
      const span = interval(nodes, group)
      return {
        group,
        unionCenter,
        width: span.right - span.left,
        currentLeft: span.left,
      }
    })
    .filter((spec): spec is NonNullable<typeof spec> => spec != null)
    .sort((a, b) => a.currentLeft - b.currentLeft)

  if (specs.length <= 1) return

  let cursor = specs[0]!.unionCenter - specs[0]!.width / 2
  shiftNodeCluster(nodes, specs[0]!.group, structure, cursor - specs[0]!.currentLeft)
  let prevRight = cursor + specs[0]!.width

  for (let i = 1; i < specs.length; i++) {
    const spec = specs[i]!
    const span = interval(nodes, spec.group)
    const targetLeft = Math.max(spec.unionCenter - spec.width / 2, prevRight + FAMILY_GAP)
    shiftNodeCluster(nodes, spec.group, structure, targetLeft - span.left)
    prevRight = targetLeft + spec.width
  }
}

function alignChildGroupsUnderUnions(
  branch: Branch,
  nodes: PositionedNode[],
  structure: FamilyStructure,
  _nodeById: Map<string, PositionedNode>,
) {
  if (
    shouldPackMultiUnionChildrenAsSiblings(branch.members, branch.directChildIds, structure, {
      hasNestedChildBranches: branch.childBranches.length > 0,
    })
  ) {
    return
  }
  if (hasHalfSiblingChildrenOnHub(branch.directChildIds, branch.members, structure)) {
    return
  }
  if (!hasMultiUnionHubOnRow(branch.members, structure)) return
  const groups = directChildUnionGroups(branch, structure)
  if (groups.length <= 1) return
  repackUnionGroupsOnRow(
    branch.members,
    groups.map((group) =>
      group.flatMap((childId) => childColumnIdsForDirectChild(branch, childId, structure)),
    ),
    nodes,
    structure,
  )
}

function alignRootDescendantsUnderUnions(
  chain: string[],
  branchY: number,
  nodes: PositionedNode[],
  structure: FamilyStructure,
  _personHeight: number,
) {
  if (!hasMultiUnionHubOnRow(chain, structure)) return
  const groups = unionGroupsAtRowY(chain, branchY, nodes, structure)
  if (groups.length <= 1) return
  const childIds = groups.flat()
  if (shouldPackMultiUnionChildrenAsSiblings(chain, childIds, structure)) return
  repackUnionGroupsOnRow(chain, groups, nodes, structure)
}

function centerParentsRow(
  branches: Branch[],
  parentRow: number,
  nodes: PositionedNode[],
  _structure: FamilyStructure,
  personHeight: number,
  nodeById: Map<string, PositionedNode>,
  span: 'subtree' | 'childRow' = 'subtree',
) {
  const y = rowY(parentRow, personHeight)
  for (const branch of branches) {
    if (branch.directChildIds.length === 0) continue

    const childIds =
      span === 'childRow'
        ? childRowColumnIds(branch, nodes, personHeight)
        : childColumnIds(branch, _structure)
    const childSpan = interval(nodes, childIds)
    const width = chainWidth(branch.members, nodeById)
    const left = centerOf(childSpan) - width / 2
    placeChain(branch.members, left, y, nodeById)
  }
}

function placeChildlessBranchesRow(
  branches: Branch[],
  row: number,
  nodes: PositionedNode[],
  structure: FamilyStructure,
  personHeight: number,
  nodeById: Map<string, PositionedNode>,
) {
  const withChildren = branches.filter((branch) => branch.directChildIds.length > 0)
  const withoutChildren = branches.filter((branch) => branch.directChildIds.length === 0)
  if (withoutChildren.length === 0) return

  const parentIds = new Set<string>()
  for (const branch of withoutChildren) {
    for (const parent of structure.parentsOfPerson.get(branch.anchorId) ?? []) {
      parentIds.add(parent)
    }
  }
  const parentRowMembers = parentRowMembersForScope(parentIds, structure, nodeById)

  let cursor = 0
  if (withChildren.length > 0) {
    const rightmost = Math.max(
      ...withChildren.map((branch) => interval(nodes, branch.members).right),
    )
    cursor = rightmost + SIBLING_GAP
  }

  const y = rowY(row, personHeight)
  const memberSet = new Set(parentRowMembers)
  const childIds = withoutChildren.map((branch) => branch.anchorId)
  const packAsSiblings = shouldPackMultiUnionChildrenAsSiblings(parentRowMembers, childIds, structure)
  const useUnionGroups =
    !packAsSiblings && hasMultipleTwoParentUnionsAmongChildren(childIds, parentRowMembers, structure)
  const groups: Branch[][] = []
  if (useUnionGroups) {
    let current: Branch[] = []
    let currentUnion: string | null = null
    for (const branch of withoutChildren) {
      const unionId = unionIdForChildOnRow(branch.anchorId, memberSet, structure)
      if (current.length > 0 && unionId !== currentUnion) {
        groups.push(current)
        current = []
      }
      currentUnion = unionId
      current.push(branch)
    }
    if (current.length > 0) groups.push(current)
  } else {
    groups.push(withoutChildren)
  }

  for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
    if (useUnionGroups && groupIndex > 0) cursor += FAMILY_GAP
    for (const branch of groups[groupIndex]!) {
      placeChain(branch.members, cursor, y, nodeById)
      cursor = interval(nodes, branch.members).right + SIBLING_GAP
    }
    if (groups[groupIndex]!.length > 0) cursor -= SIBLING_GAP
  }
}

function enforceSiblingGapsRow(
  branches: Branch[],
  nodes: PositionedNode[],
  structure: FamilyStructure,
  useSubtree = false,
  personHeight = PERSON_H,
) {
  for (let i = 0; i < branches.length - 1; i++) {
    const leftBranch = branches[i]!
    const rightBranch = branches[i + 1]!
    const memberGap =
      interval(nodes, rightBranch.members).left - interval(nodes, leftBranch.members).right
    let gap = memberGap
    if (useSubtree) {
      const columnGap =
        branchColumnInterval(nodes, rightBranch, structure, personHeight).left -
        branchColumnInterval(nodes, leftBranch, structure, personHeight).right
      gap = Math.min(memberGap, columnGap)
    }
    if (gap + 0.5 >= SIBLING_GAP) continue
    const delta = SIBLING_GAP - gap
    for (let j = i + 1; j < branches.length; j++) {
      shiftBranch(nodes, branches[j]!, structure, delta)
    }
  }
}

export function centerParentGenerationRow(
  nodes: PositionedNode[],
  structure: FamilyStructure,
  forest: BranchForest,
  personHeight: number,
  nodeById: Map<string, PositionedNode>,
) {
  const { rootGen, branchGen, rootIds } = forest
  if (branchGen <= rootGen || rootIds.length === 0) return

  const branchY = rowY(branchGen, personHeight)
  const parentY = rowY(rootGen, personHeight)
  const rootChains = marriageChains(rootIds, structure, nodeById)

  if (rootChains.length === 1) {
    const chain = rootChains[0]!
    if (chain.length === 1) {
      const parentRowIds = forest.branches.flatMap((branch) => branch.members)
      if (parentRowIds.length === 0) return
      const parentSpan = interval(nodes, parentRowIds)
      const width = chainWidth(chain, nodeById)
      placeChain(chain, centerOf(parentSpan) - width / 2, parentY, nodeById)
    } else {
      const rowNodes = nodes.filter((node) => node.kind === 'person' && Math.abs(node.y - branchY) < 0.5)
      if (rowNodes.length === 0) return
      const genLeft = Math.min(...rowNodes.map((node) => node.x))
      const genRight = Math.max(...rowNodes.map((node) => node.x + node.width))
      const rowCenter = (genLeft + genRight) / 2
      const width = chainWidth(chain, nodeById)
      placeChain(chain, rowCenter - width / 2, parentY, nodeById)
    }
    return
  }

  const placedChains: string[][] = []
  for (const chain of rootChains) {
    const chainSet = new Set(chain)
    const descendantIds = nodes
      .filter(
        (node) =>
          node.kind === 'person' &&
          Math.abs(node.y - branchY) < 0.5 &&
          (structure.parentsOfPerson.get(node.id) ?? []).some((parent) => chainSet.has(parent)),
      )
      .map((node) => node.id)
    if (descendantIds.length === 0) continue
    const childSpan = interval(nodes, descendantIds)
    const width = chainWidth(chain, nodeById)
    const left = centerOf(childSpan) - width / 2
    placeChain(chain, left, parentY, nodeById)
    placedChains.push(chain)
  }

  for (let i = 0; i < placedChains.length - 1; i++) {
    const leftBox = interval(nodes, placedChains[i]!)
    const rightBox = interval(nodes, placedChains[i + 1]!)
    const gap = rightBox.left - leftBox.right
    if (gap + 0.5 >= SIBLING_GAP) continue
    const delta = SIBLING_GAP - gap
    const moving = new Set<string>()
    for (let j = i + 1; j < placedChains.length; j++) {
      for (const id of placedChains[j]!) {
        moving.add(id)
        for (const descendant of downwardSet([id], structure)) moving.add(descendant)
      }
    }
    translateIds(nodes, moving, delta)
  }
}

function walkBranches(branch: Branch, visit: (entry: Branch) => void) {
  visit(branch)
  for (const child of branch.childBranches) walkBranches(child, visit)
}

function alignAllUnionGroups(ctx: LayoutContext) {
  const branchY = rowY(ctx.forest.branchGen, ctx.personHeight)
  for (const branch of ctx.forest.branches) {
    walkBranches(branch, (entry) => {
      if (entry.directChildIds.length > 0) {
        alignChildGroupsUnderUnions(entry, ctx.nodes, ctx.structure, ctx.nodeById)
      }
    })
  }
  for (const chain of marriageChains(ctx.forest.rootIds, ctx.structure, ctx.nodeById)) {
    alignRootDescendantsUnderUnions(chain, branchY, ctx.nodes, ctx.structure, ctx.personHeight)
  }
}

interface LayoutContext {
  nodes: PositionedNode[]
  structure: FamilyStructure
  generations: Map<string, number>
  forest: BranchForest
  personHeight: number
  nodeById: Map<string, PositionedNode>
}

function applyStep(step: ContractPackStep, ctx: LayoutContext) {
  switch (step) {
    case 'buildBranchForest':
      break
    case 'packChildrenRow':
      layoutNestedBranches(
        ctx.forest.branches,
        ctx.nodes,
        ctx.structure,
        ctx.personHeight,
        ctx.nodeById,
      )
      packChildrenRow(
        ctx.forest.branches,
        ctx.forest.branchGen + 1,
        ctx.nodes,
        ctx.structure,
        ctx.personHeight,
        ctx.nodeById,
      )
      break
    case 'centerParentsRow':
      centerParentsRow(
        ctx.forest.branches.filter((branch) => branch.directChildIds.length > 0),
        ctx.forest.branchGen,
        ctx.nodes,
        ctx.structure,
        ctx.personHeight,
        ctx.nodeById,
        'childRow',
      )
      break
    case 'placeChildlessBranchesRow':
      placeChildlessBranchesRow(
        ctx.forest.branches,
        ctx.forest.branchGen,
        ctx.nodes,
        ctx.structure,
        ctx.personHeight,
        ctx.nodeById,
      )
      break
    case 'enforceSiblingGapsRow': {
      const personCount = ctx.nodes.filter((node) => node.kind === 'person').length
      const useColumnGaps = ctx.forest.maxGen > 2 || personCount > 30
      enforceSiblingGapsRow(ctx.forest.branches, ctx.nodes, ctx.structure, useColumnGaps, ctx.personHeight)
      break
    }
    case 'centerParentGenerationRow':
      centerParentGenerationRow(ctx.nodes, ctx.structure, ctx.forest, ctx.personHeight, ctx.nodeById)
      break
    case 'packCrossFamilyJoinRows':
      applyJoinParentPlacement(ctx.nodes, ctx.structure, ctx.generations)
      break
    case 'enforceRowMinimumGaps':
      enforceRowMinimumGaps(ctx.nodes, ctx.structure, ctx.forest.branches)
      centerParentGenerationRow(ctx.nodes, ctx.structure, ctx.forest, ctx.personHeight, ctx.nodeById)
      break
    case 'repackHalfSiblingHubRows':
      repackAllHalfSiblingHubRows(ctx)
      break
    case 'protectCoupleRowBands':
      protectAllCoupleRowBands(ctx)
      break
    case 'alignUnionChildGroups':
      alignAllUnionGroups(ctx)
      break
  }
}

export function applyBranchContractLayoutWithTrace(
  nodes: PositionedNode[],
  structure: FamilyStructure,
  generations: Map<string, number>,
): Array<{ step: ContractPackStep; nodes: PositionedNode[] }> {
  const mutable = nodes.map((node) => ({ ...node }))
  const personIds = mutable.filter((node) => node.kind === 'person').map((node) => node.id)
  const nodeById = new Map(mutable.map((node) => [node.id, node]))
  const forest = buildBranchForest(personIds, structure, generations, nodeById)
  const personHeight = mutable.find((node) => node.kind === 'person')?.height ?? PERSON_H

  const ctx: LayoutContext = {
    nodes: mutable,
    structure,
    generations,
    forest,
    personHeight,
    nodeById,
  }

  const traces: Array<{ step: ContractPackStep; nodes: PositionedNode[] }> = []
  for (const step of CONTRACT_PACK_STEPS) {
    applyStep(step, ctx)
    traces.push({ step, nodes: mutable.map((node) => ({ ...node })) })
  }
  return traces
}

export function applyBranchContractLayout(
  nodes: PositionedNode[],
  structure: FamilyStructure,
  generations?: Map<string, number>,
): PositionedNode[] {
  const mutable = nodes.map((node) => ({ ...node }))
  const personIds = mutable.filter((node) => node.kind === 'person').map((node) => node.id)
  const gens = generations ?? assignGenerations(personIds, structure)
  const nodeById = new Map(mutable.map((node) => [node.id, node]))
  const forest = buildBranchForest(personIds, structure, gens, nodeById)
  const personHeight = mutable.find((node) => node.kind === 'person')?.height ?? PERSON_H
  const ctx: LayoutContext = {
    nodes: mutable,
    structure,
    generations: gens,
    forest,
    personHeight,
    nodeById,
  }
  for (const step of CONTRACT_PACK_STEPS) {
    applyStep(step, ctx)
  }
  return mutable
}
