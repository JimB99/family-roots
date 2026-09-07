import { type Branch, type BranchForest, parentRowMembersForBranch, parentRowMembersForScope, partitionBranchesByParentScope, partitionBranchesBySiblingRow } from './branch-tree'
import { branchSubtreeIds } from './branch-shift'
import { downwardSet } from './compact-subtrees'
import type { FamilyStructure } from './family-structure'
import type { PositionedNode } from './layout-model'
import { marriageChains } from './marriage-chains'
import {
  groupDirectChildIdsByUnion,
  hasHalfSiblingChildrenOnHub,
  hasMultiUnionHubOnRow,
  hasMultipleTwoParentUnionsAmongChildren,
  shouldPackMultiUnionChildrenAsSiblings,
  sortSiblingChildIds,
  unionIdForChildOnRow,
  comparePersons,
  compareSiblingLayoutOrder,
  sortKeyFromNode,
} from './layout-order'
import { FAMILY_GAP, NODE_GAP, PERSON_W, ROW_GAP, SIBLING_GAP } from './layout-spacing'

export interface ColumnInterval {
  left: number
  right: number
}

export interface ColumnLayoutContext {
  nodes: PositionedNode[]
  structure: FamilyStructure
  personHeight: number
  nodeById: Map<string, PositionedNode>
}

function rowY(generation: number, personHeight: number): number {
  return generation * (personHeight + ROW_GAP)
}

function interval(nodes: PositionedNode[], ids: string[]): ColumnInterval {
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

function centerOf(span: ColumnInterval): number {
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

function shiftSubtreeFromY(
  nodes: PositionedNode[],
  branch: Branch,
  structure: FamilyStructure,
  minY: number,
  dx: number,
) {
  if (Math.abs(dx) < 0.5) return
  const byId = new Map(nodes.map((node) => [node.id, node]))
  for (const id of branchSubtreeIds(branch, structure)) {
    const node = byId.get(id)
    if (node && node.y >= minY - 0.5) node.x += dx
  }
}

function shiftPersonSubtreeFromY(
  nodes: PositionedNode[],
  personId: string,
  structure: FamilyStructure,
  minY: number,
  dx: number,
) {
  if (Math.abs(dx) < 0.5) return
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const ids = new Set([personId, ...downwardSet([personId], structure)])
  for (const id of ids) {
    const node = byId.get(id)
    if (node && node.y >= minY - 0.5) node.x += dx
  }
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

function childRowColumnIds(branch: Branch, nodes: PositionedNode[], personHeight: number): string[] {
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

function shouldPackByUnionGroups(branch: Branch, structure: FamilyStructure): boolean {
  if (
    shouldPackMultiUnionChildrenAsSiblings(branch.members, branch.directChildIds, structure, {
      hasNestedChildBranches: branch.childBranches.length > 0,
    })
  ) {
    return false
  }
  return hasMultipleTwoParentUnionsAmongChildren(branch.directChildIds, branch.members, structure)
}

function directChildUnionGroups(branch: Branch, structure: FamilyStructure): string[][] {
  if (!shouldPackByUnionGroups(branch, structure)) return [branch.directChildIds]
  return groupDirectChildIdsByUnion(branch.directChildIds, branch.members, structure)
}

function branchSubtreeInterval(
  nodes: PositionedNode[],
  branch: Branch,
  structure: FamilyStructure,
): ColumnInterval {
  return interval(nodes, [...branchSubtreeIds(branch, structure)])
}

function branchColumnInterval(
  nodes: PositionedNode[],
  branch: Branch,
  structure: FamilyStructure,
  personHeight: number,
): ColumnInterval {
  const childRow = branch.row + 1
  const y = rowY(childRow, personHeight)
  return columnIntervalOnRow(nodes, branch, structure, y)
}

function columnIntervalOnRow(
  nodes: PositionedNode[],
  branch: Branch,
  structure: FamilyStructure,
  y: number,
): ColumnInterval {
  const columnIds = [...branchSubtreeIds(branch, structure)].filter((id) => {
    const node = nodes.find((entry) => entry.id === id)
    return node != null && Math.abs(node.y - y) < 0.5
  })
  if (columnIds.length > 0) return interval(nodes, columnIds)
  return branchSubtreeInterval(nodes, branch, structure)
}

function columnIntervalOnRowStrict(
  nodes: PositionedNode[],
  branch: Branch,
  structure: FamilyStructure,
  y: number,
): ColumnInterval | null {
  const columnIds = [...branchSubtreeIds(branch, structure)].filter((id) => {
    const node = nodes.find((entry) => entry.id === id)
    return node != null && Math.abs(node.y - y) < 0.5
  })
  if (columnIds.length === 0) return null
  return interval(nodes, columnIds)
}

function cousinColumnChildBranches(branch: Branch): Branch[] {
  return branch.childBranches.filter((entry) => entry.directChildIds.length > 0)
}

function cousinColumnPackingExcluded(branch: Branch, structure: FamilyStructure): boolean {
  if (
    shouldPackMultiUnionChildrenAsSiblings(branch.members, branch.directChildIds, structure, {
      hasNestedChildBranches: branch.childBranches.length > 0,
    })
  ) {
    return true
  }
  if (shouldPackByUnionGroups(branch, structure)) return true
  return false
}

/** At least two direct children open descendant columns (cousin gaps apply between those columns). */
export function hasCousinColumnChildren(branch: Branch, structure: FamilyStructure): boolean {
  if (cousinColumnChildBranches(branch).length < 2) return false
  if (cousinColumnPackingExcluded(branch, structure)) return false
  return true
}

export function shouldPackCousinColumns(branch: Branch, structure: FamilyStructure): boolean {
  if (!hasCousinColumnChildren(branch, structure)) return false
  const columns = cousinColumnChildBranches(branch)
  if (columns.length !== branch.directChildIds.length) return false
  if (!columns.some((entry) => entry.childBranches.some((child) => child.directChildIds.length > 0))) {
    return false
  }
  return true
}

type ChildPackMode = 'sibling' | 'cousin'

function branchOpensDescendantColumn(branch?: Branch): boolean {
  return branch != null && branch.directChildIds.length > 0
}

function packDirectChildRun(
  branch: Branch,
  childIds: string[],
  startCursor: number,
  y: number,
  ctx: ColumnLayoutContext,
  packMode: ChildPackMode = 'sibling',
) {
  let cursor = startCursor
  for (let i = 0; i < childIds.length; i++) {
    const childId = childIds[i]!
    const nested = childBranchForDirectChild(branch, childId)
    const prevNested = i > 0 ? childBranchForDirectChild(branch, childIds[i - 1]!) : undefined
    const betweenGap =
      packMode === 'cousin' &&
      (branchOpensDescendantColumn(nested) || branchOpensDescendantColumn(prevNested))
        ? FAMILY_GAP
        : SIBLING_GAP
    const useColumnSpan = packMode === 'cousin' || nested != null
    if (nested) {
      const span = useColumnSpan
        ? columnIntervalOnRow(ctx.nodes, nested, ctx.structure, y)
        : branchSubtreeInterval(ctx.nodes, nested, ctx.structure)
      if (i > 0) cursor += betweenGap
      const dx = cursor - span.left
      if (Math.abs(dx) > 0.5) shiftBranch(ctx.nodes, nested, ctx.structure, dx)
      for (const id of nested.members) {
        const member = ctx.nodeById.get(id)
        if (member) member.y = y
      }
      const placed = useColumnSpan
        ? columnIntervalOnRow(ctx.nodes, nested, ctx.structure, y)
        : branchSubtreeInterval(ctx.nodes, nested, ctx.structure)
      cursor = placed.right
    } else {
      if (i > 0) cursor += betweenGap
      const child = ctx.nodeById.get(childId)
      if (!child) continue
      child.x = cursor
      child.y = y
      cursor = child.x + child.width
    }
  }
  return cursor
}

type CousinGapEnforceMode = 'minimumGap' | 'resolveOverlap'

interface CousinGapShiftOptions {
  descendantOnlyBelowY?: number
}

function requiredCousinGapAtRow(
  branch: Branch,
  packingRowY: number,
  ctx: ColumnLayoutContext,
  mode: CousinGapEnforceMode,
): number {
  const hubRowY = rowY(branch.row, ctx.personHeight)
  // Marriage-cluster overlap repair on a hub row (S14): sibling gap, not cousin gap.
  if (Math.abs(packingRowY - hubRowY) < 0.5 && mode === 'resolveOverlap') {
    return SIBLING_GAP
  }
  return FAMILY_GAP
}

function enforceCousinGapsRow(
  branches: Branch[],
  packingRowY: number,
  ctx: ColumnLayoutContext,
  mode: CousinGapEnforceMode = 'minimumGap',
  shiftOptions?: CousinGapShiftOptions,
) {
  const withChildren = branches.filter((branch) => branch.directChildIds.length > 0)
  const shiftBranchHorizontally = (branch: Branch, dx: number) => {
    if (shiftOptions?.descendantOnlyBelowY != null) {
      shiftSubtreeFromY(ctx.nodes, branch, ctx.structure, shiftOptions.descendantOnlyBelowY, dx)
    } else {
      shiftBranch(ctx.nodes, branch, ctx.structure, dx)
    }
  }
  for (let i = 0; i < withChildren.length - 1; i++) {
    const leftBranch = withChildren[i]!
    const rightBranch = withChildren[i + 1]!
    const leftBox =
      mode === 'resolveOverlap'
        ? columnIntervalOnRowStrict(ctx.nodes, leftBranch, ctx.structure, packingRowY)
        : columnIntervalOnRow(ctx.nodes, leftBranch, ctx.structure, packingRowY)
    const rightBox =
      mode === 'resolveOverlap'
        ? columnIntervalOnRowStrict(ctx.nodes, rightBranch, ctx.structure, packingRowY)
        : columnIntervalOnRow(ctx.nodes, rightBranch, ctx.structure, packingRowY)
    if (mode === 'resolveOverlap' && (leftBox == null || rightBox == null)) continue
    const gap = rightBox!.left - leftBox!.right
    const requiredGap = Math.max(
      requiredCousinGapAtRow(leftBranch, packingRowY, ctx, mode),
      requiredCousinGapAtRow(rightBranch, packingRowY, ctx, mode),
    )
    if (mode === 'resolveOverlap') {
      const overlap =
        Math.min(leftBox!.right, rightBox!.right) - Math.max(leftBox!.left, rightBox!.left)
      if (overlap <= 0.5) continue
    } else if (gap + 0.5 >= requiredGap) {
      continue
    }
    const delta = requiredGap - gap
    for (let j = i + 1; j < withChildren.length; j++) {
      shiftBranchHorizontally(withChildren[j]!, delta)
    }
  }
}

function directChildIntervalOnRow(
  parent: Branch,
  childId: string,
  packingRowY: number,
  ctx: ColumnLayoutContext,
  mode: CousinGapEnforceMode,
): ColumnInterval | null {
  const nested = childBranchForDirectChild(parent, childId)
  if (nested && nested.directChildIds.length > 0) {
    return mode === 'resolveOverlap'
      ? columnIntervalOnRowStrict(ctx.nodes, nested, ctx.structure, packingRowY)
      : columnIntervalOnRow(ctx.nodes, nested, ctx.structure, packingRowY)
  }
  const child = ctx.nodeById.get(childId)
  if (!child || Math.abs(child.y - packingRowY) >= 0.5) return null
  return { left: child.x, right: child.x + child.width }
}

function shiftDirectChildHorizontally(
  parent: Branch,
  childId: string,
  ctx: ColumnLayoutContext,
  dx: number,
  shiftOptions?: CousinGapShiftOptions,
) {
  const nested = childBranchForDirectChild(parent, childId)
  if (nested) {
    if (shiftOptions?.descendantOnlyBelowY != null) {
      shiftSubtreeFromY(ctx.nodes, nested, ctx.structure, shiftOptions.descendantOnlyBelowY, dx)
    } else {
      shiftBranch(ctx.nodes, nested, ctx.structure, dx)
    }
    return
  }
  if (shiftOptions?.descendantOnlyBelowY != null) {
    shiftPersonSubtreeFromY(ctx.nodes, childId, ctx.structure, shiftOptions.descendantOnlyBelowY, dx)
  } else {
    shiftNodeCluster(ctx.nodes, [childId], ctx.structure, dx)
  }
}

function enforceDirectChildrenRowGaps(
  parent: Branch,
  packingRowY: number,
  ctx: ColumnLayoutContext,
  mode: CousinGapEnforceMode = 'minimumGap',
  shiftOptions?: CousinGapShiftOptions,
) {
  const childIds = parent.directChildIds
  if (childIds.length < 2) return

  for (let i = 0; i < childIds.length - 1; i++) {
    const leftId = childIds[i]!
    const rightId = childIds[i + 1]!
    const leftBox = directChildIntervalOnRow(parent, leftId, packingRowY, ctx, mode)
    const rightBox = directChildIntervalOnRow(parent, rightId, packingRowY, ctx, mode)
    if (mode === 'resolveOverlap' && (leftBox == null || rightBox == null)) continue
    if (!leftBox || !rightBox) continue

    const leftNested = childBranchForDirectChild(parent, leftId)
    const rightNested = childBranchForDirectChild(parent, rightId)
    const requiredGap =
      branchOpensDescendantColumn(leftNested) && branchOpensDescendantColumn(rightNested)
        ? FAMILY_GAP
        : SIBLING_GAP
    const gap = rightBox.left - leftBox.right
    if (mode === 'resolveOverlap') {
      const overlap =
        Math.min(leftBox.right, rightBox.right) - Math.max(leftBox.left, rightBox.left)
      if (overlap <= 0.5) continue
    } else if (gap + 0.5 >= requiredGap) {
      continue
    }
    const delta = requiredGap - gap
    for (let j = i + 1; j < childIds.length; j++) {
      shiftDirectChildHorizontally(parent, childIds[j]!, ctx, delta, shiftOptions)
    }
  }
}

function enforceDirectChildrenGapsAtAllRows(
  parent: Branch,
  ctx: ColumnLayoutContext,
  options?: { skipRowYs?: Set<number>; descendantOnlyBelowY?: number; resolveOverlaps?: boolean },
) {
  if (parent.directChildIds.length < 2) return

  const rowYs = new Set<number>()
  for (const childId of parent.directChildIds) {
    const nested = childBranchForDirectChild(parent, childId)
    const ids = nested
      ? [...branchSubtreeIds(nested, ctx.structure)]
      : [childId, ...downwardSet([childId], ctx.structure)]
    for (const id of ids) {
      const node = ctx.nodes.find((entry) => entry.id === id)
      if (node) rowYs.add(node.y)
    }
  }

  const mode: CousinGapEnforceMode = options?.resolveOverlaps ? 'resolveOverlap' : 'minimumGap'
  for (const y of [...rowYs].sort((left, right) => right - left)) {
    if (options?.skipRowYs?.has(y)) continue
    enforceDirectChildrenRowGaps(parent, y, ctx, mode, {
      descendantOnlyBelowY: options?.descendantOnlyBelowY,
    })
  }
}

function enforceCousinColumnsAtAllRows(
  parent: Branch,
  ctx: ColumnLayoutContext,
  options?: { skipRowYs?: Set<number>; descendantOnlyBelowY?: number; resolveOverlaps?: boolean },
) {
  const nested = parent.childBranches.filter((branch) => branch.directChildIds.length > 0)
  if (nested.length <= 1) return

  const rowYs = new Set<number>()
  for (const child of nested) {
    for (const id of branchSubtreeIds(child, ctx.structure)) {
      const node = ctx.nodes.find((entry) => entry.id === id)
      if (node) rowYs.add(node.y)
    }
  }

  const mode: CousinGapEnforceMode = options?.resolveOverlaps ? 'resolveOverlap' : 'minimumGap'
  for (const y of [...rowYs].sort((left, right) => right - left)) {
    if (options?.skipRowYs?.has(y)) continue
    enforceCousinGapsRow(nested, y, ctx, mode, {
      descendantOnlyBelowY: options?.descendantOnlyBelowY,
    })
  }
}

function packAllCousinColumnRows(
  branch: Branch,
  ctx: ColumnLayoutContext,
  options?: { skipRowYs?: Set<number>; descendantOnlyBelowY?: number; resolveOverlaps?: boolean },
) {
  for (const child of branch.childBranches) {
    packAllCousinColumnRows(child, ctx, options)
  }
  if (!shouldPackCousinColumns(branch, ctx.structure) && !hasCousinColumnChildren(branch, ctx.structure)) {
    enforceDirectChildrenGapsAtAllRows(branch, ctx, options)
    return
  }
  enforceCousinColumnsAtAllRows(branch, ctx, options)
  enforceDirectChildrenGapsAtAllRows(branch, ctx, options)
}

function packSiblingChildrenRow(branch: Branch, ctx: ColumnLayoutContext) {
  const childRow = branch.row + 1
  const y = rowY(childRow, ctx.personHeight)
  const useUnionGroups = shouldPackByUnionGroups(branch, ctx.structure)
  const orderedChildIds = sortSiblingChildIds(
    [...branch.directChildIds],
    ctx.structure,
    ctx.nodeById,
    branch.members,
  )
  const groups = useUnionGroups ? directChildUnionGroups(branch, ctx.structure) : [orderedChildIds]
  let cursor = 0

  for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
    if (useUnionGroups && groupIndex > 0) cursor += FAMILY_GAP
    cursor = packDirectChildRun(branch, groups[groupIndex]!, cursor, y, ctx, 'sibling')
  }
}

function childColumnIdsForDirectChild(branch: Branch, childId: string, structure: FamilyStructure): string[] {
  const nested = childBranchForDirectChild(branch, childId)
  if (nested) return [...branchSubtreeIds(nested, structure)]
  return [childId]
}

function shiftNodeCluster(
  nodes: PositionedNode[],
  ids: string[],
  structure: FamilyStructure,
  dx: number,
) {
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
  ctx: ColumnLayoutContext,
) {
  if (!hasMultiUnionHubOnRow(rowMembers, ctx.structure) || groups.length <= 1) return

  const memberSet = new Set(rowMembers)
  const specs = groups
    .map((group) => {
      const unionId = unionIdForChildOnRow(group[0]!, memberSet, ctx.structure)
      if (!unionId) return null
      const parents = ctx.structure.unionParents.get(unionId) ?? []
      const onRow = rowMembers.filter((member) => parents.includes(member))
      if (onRow.length < 2) return null
      const unionCenter = centerOf(interval(ctx.nodes, onRow))
      const span = interval(ctx.nodes, group)
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
  const firstSpan = interval(ctx.nodes, specs[0]!.group)
  shiftNodeCluster(ctx.nodes, specs[0]!.group, ctx.structure, cursor - firstSpan.left)
  let prevRight = cursor + specs[0]!.width

  for (let i = 1; i < specs.length; i++) {
    const spec = specs[i]!
    const span = interval(ctx.nodes, spec.group)
    const targetLeft = Math.max(spec.unionCenter - spec.width / 2, prevRight + FAMILY_GAP)
    shiftNodeCluster(ctx.nodes, spec.group, ctx.structure, targetLeft - span.left)
    prevRight = targetLeft + spec.width
  }
}

function alignChildGroupsUnderUnions(branch: Branch, ctx: ColumnLayoutContext) {
  if (shouldPackCousinColumns(branch, ctx.structure)) return
  if (hasCousinColumnChildren(branch, ctx.structure)) return
  if (
    shouldPackMultiUnionChildrenAsSiblings(branch.members, branch.directChildIds, ctx.structure, {
      hasNestedChildBranches: branch.childBranches.length > 0,
    })
  ) {
    return
  }
  if (!hasMultiUnionHubOnRow(branch.members, ctx.structure)) return
  const groups = directChildUnionGroups(branch, ctx.structure)
  if (groups.length <= 1) return
  repackUnionGroupsOnRow(
    branch.members,
    groups.map((group) =>
      group.flatMap((childId) => childColumnIdsForDirectChild(branch, childId, ctx.structure)),
    ),
    ctx,
  )
}

function childRowSpanForCentering(branch: Branch, ctx: ColumnLayoutContext): ColumnInterval {
  const childRow = branch.row + 1
  const y = rowY(childRow, ctx.personHeight)
  let left = Number.POSITIVE_INFINITY
  let right = Number.NEGATIVE_INFINITY
  for (const childId of branch.directChildIds) {
    const nested = childBranchForDirectChild(branch, childId)
    const box = nested
      ? columnIntervalOnRow(ctx.nodes, nested, ctx.structure, y)
      : (() => {
          const child = ctx.nodeById.get(childId)
          if (!child || Math.abs(child.y - y) >= 0.5) return null
          return { left: child.x, right: child.x + child.width }
        })()
    if (!box) continue
    left = Math.min(left, box.left)
    right = Math.max(right, box.right)
  }
  if (!Number.isFinite(left)) {
    return interval(ctx.nodes, childRowColumnIds(branch, ctx.nodes, ctx.personHeight))
  }
  return { left, right }
}

function orderSiblingBranches(
  branches: Branch[],
  ctx: ColumnLayoutContext,
  parentRowMembers: string[] | null,
): Branch[] {
  if (parentRowMembers && parentRowMembers.length > 0) {
    return [...branches].sort((left, right) => {
      const leftNode = ctx.nodeById.get(left.anchorId)
      const rightNode = ctx.nodeById.get(right.anchorId)
      if (!leftNode || !rightNode) return 0
      return compareSiblingLayoutOrder(leftNode, rightNode, ctx.structure, parentRowMembers)
    })
  }
  return [...branches].sort(
    (left, right) => interval(ctx.nodes, left.members).left - interval(ctx.nodes, right.members).left,
  )
}

function centerSiblingRowHubs(
  branches: Branch[],
  row: number,
  ctx: ColumnLayoutContext,
  parentRowMembers: string[] | null,
  options?: { skipRowYs?: Set<number>; skipAnchorIds?: Set<string>; childlessBetweenNeighborsOnly?: boolean },
) {
  if (branches.length === 0) return
  const y = rowY(row, ctx.personHeight)
  const ordered = orderSiblingBranches(branches, ctx, parentRowMembers)
  const shouldSkip = (branch: Branch) => {
    const hubY = rowY(branch.row, ctx.personHeight)
    return (
      options?.skipRowYs?.has(hubY) &&
      (options?.skipAnchorIds?.has(branch.anchorId) ?? true)
    )
  }

  if (!options?.childlessBetweenNeighborsOnly) {
    for (const branch of ordered) {
      if (branch.directChildIds.length === 0) continue
      if (shouldSkip(branch)) continue
      const childSpan = childRowSpanForCentering(branch, ctx)
      const width = chainWidth(branch.members, ctx.nodeById)
      placeChain(branch.members, centerOf(childSpan) - width / 2, y, ctx.nodeById)
    }
  }

  const hasChildBearingHub = ordered.some((branch) => branch.directChildIds.length > 0)
  if (!hasChildBearingHub) return

  for (let i = 0; i < ordered.length; i++) {
    const branch = ordered[i]!
    if (branch.directChildIds.length > 0) continue
    if (shouldSkip(branch)) continue

    const leftNeighbor = i > 0 ? ordered[i - 1]! : null
    const rightNeighbor = i < ordered.length - 1 ? ordered[i + 1]! : null
    const width = chainWidth(branch.members, ctx.nodeById)

    let targetCenter: number | null = null
    if (leftNeighbor && rightNeighbor) {
      const leftHub = interval(ctx.nodes, leftNeighbor.members)
      const rightHub = interval(ctx.nodes, rightNeighbor.members)
      targetCenter = (centerOf(leftHub) + centerOf(rightHub)) / 2
    } else if (leftNeighbor) {
      const leftHub = interval(ctx.nodes, leftNeighbor.members)
      targetCenter = leftHub.right + SIBLING_GAP + width / 2
    } else if (rightNeighbor) {
      const rightHub = interval(ctx.nodes, rightNeighbor.members)
      targetCenter = rightHub.left - SIBLING_GAP - width / 2
    }
    if (targetCenter == null) continue
    placeChain(branch.members, targetCenter - width / 2, y, ctx.nodeById)
  }
}

function centerParentsRow(
  branches: Branch[],
  parentRow: number,
  ctx: ColumnLayoutContext,
) {
  const y = rowY(parentRow, ctx.personHeight)
  for (const branch of branches) {
    if (branch.directChildIds.length === 0) continue
    const childSpan = childRowSpanForCentering(branch, ctx)
    const width = chainWidth(branch.members, ctx.nodeById)
    const left = centerOf(childSpan) - width / 2
    placeChain(branch.members, left, y, ctx.nodeById)
  }
}

function descendantSubtreeInterval(
  branch: Branch,
  ctx: ColumnLayoutContext,
  minY: number,
): ColumnInterval | null {
  const ids = [...branchSubtreeIds(branch, ctx.structure)].filter((id) => {
    const node = ctx.nodeById.get(id)
    return node != null && node.y >= minY - 0.5
  })
  if (ids.length === 0) return null
  return interval(ctx.nodes, ids)
}

/** Pack top-level branches in join order using full descendant subtree width (gen2+ only shifts). */
function packJoinOrderTopLevelDescendants(
  forest: BranchForest,
  ctx: ColumnLayoutContext,
  firstDescendantRowY: number,
) {
  const sorted = topLevelBranchesInJoinOrder(forest, ctx)
  let cursor = 0
  let placed = 0
  for (const branch of sorted) {
    const box = descendantSubtreeInterval(branch, ctx, firstDescendantRowY)
    if (!box) continue
    if (placed > 0) cursor += FAMILY_GAP
    const dx = cursor - box.left
    if (Math.abs(dx) > 0.5) {
      shiftSubtreeFromY(ctx.nodes, branch, ctx.structure, firstDescendantRowY, dx)
    }
    const placedBox = descendantSubtreeInterval(branch, ctx, firstDescendantRowY)
    if (!placedBox) continue
    cursor = placedBox.right
    placed++
  }
}

/** Resolve cross-branch subtree overlaps between consecutive join-ordered top-level branches. */
function resolveJoinOrderTopLevelSubtreeOverlaps(
  forest: BranchForest,
  ctx: ColumnLayoutContext,
  firstDescendantRowY: number,
) {
  const sorted = topLevelBranchesInJoinOrder(forest, ctx)
  for (let i = 0; i < sorted.length - 1; i++) {
    const leftBox = descendantSubtreeInterval(sorted[i]!, ctx, firstDescendantRowY)
    const rightBox = descendantSubtreeInterval(sorted[i + 1]!, ctx, firstDescendantRowY)
    if (!leftBox || !rightBox) continue
    const gap = rightBox.left - leftBox.right
    if (gap + 0.5 >= FAMILY_GAP) continue
    const delta = FAMILY_GAP - gap
    for (let j = i + 1; j < sorted.length; j++) {
      const branch = sorted[j]!
      if (!descendantSubtreeInterval(branch, ctx, firstDescendantRowY)) continue
      shiftSubtreeFromY(ctx.nodes, branch, ctx.structure, firstDescendantRowY, delta)
    }
  }
}

/** Post-order: center nested sibling rows (children over columns; childless between neighbors). */
function recenterBranchSubtree(
  branches: Branch[],
  ctx: ColumnLayoutContext,
  parentRowMembers: string[],
  options?: { skipRowYs?: Set<number>; skipAnchorIds?: Set<string> },
) {
  for (const branch of branches) {
    if (branch.childBranches.length > 0) {
      recenterBranchSubtree(branch.childBranches, ctx, branch.members, options)
    }
  }
  if (branches.length === 0) return
  centerSiblingRowHubs(branches, branches[0]!.row, ctx, parentRowMembers, options)
}

function centerTopLevelBranchesByParentScope(forest: BranchForest, ctx: ColumnLayoutContext) {
  for (const group of partitionBranchesBySiblingRow(forest.branches, ctx.structure, ctx.nodeById)) {
    const parentRowMembers = parentRowMembersForBranch(group[0]!, ctx.structure, ctx.nodeById)
    centerSiblingRowHubs(group, forest.branchGen, ctx, parentRowMembers, {
      childlessBetweenNeighborsOnly: true,
    })
  }
}

function recenterParentsOverChildren(forest: BranchForest, ctx: ColumnLayoutContext) {
  for (const branch of forest.branches) {
    walkBranches(branch, (entry) => {
      if (entry.directChildIds.length === 0) return
      const childSpan = childRowSpanForCentering(entry, ctx)
      const hubCenter = centerOf(interval(ctx.nodes, entry.members))
      const childCenter = centerOf(childSpan)
      const misaligned = Math.abs(hubCenter - childCenter) > 1
      const multiChild =
        entry.directChildIds.length > 1 ||
        entry.childBranches.some((child) => child.directChildIds.length > 0)
      if (multiChild || misaligned) {
        centerParentsRow([entry], entry.row, ctx)
      }
    })
  }
}

/**
 * After hub centering over child columns: shift whole later cousin branches right when
 * gen-row marriage clusters are closer than SIBLING_GAP (S14 contract step 3).
 */
function enforceHubClusterSiblingGapsRow(branches: Branch[], ctx: ColumnLayoutContext) {
  for (let i = 0; i < branches.length - 1; i++) {
    const leftBranch = branches[i]!
    const rightBranch = branches[i + 1]!
    if (leftBranch.directChildIds.length === 0 || rightBranch.directChildIds.length === 0) continue
    const memberGap =
      interval(ctx.nodes, rightBranch.members).left - interval(ctx.nodes, leftBranch.members).right
    if (memberGap + 0.5 >= SIBLING_GAP) continue
    const delta = SIBLING_GAP - memberGap
    for (let j = i + 1; j < branches.length; j++) {
      shiftBranch(ctx.nodes, branches[j]!, ctx.structure, delta)
    }
  }
}

function enforceSiblingGapsRow(
  branches: Branch[],
  ctx: ColumnLayoutContext,
  useColumnGaps = false,
) {
  for (let i = 0; i < branches.length - 1; i++) {
    const leftBranch = branches[i]!
    const rightBranch = branches[i + 1]!
    const bothCousinColumns =
      leftBranch.directChildIds.length > 0 && rightBranch.directChildIds.length > 0

    if (bothCousinColumns) {
      const childRowY = rowY(leftBranch.row + 1, ctx.personHeight)
      const leftBox = columnIntervalOnRow(ctx.nodes, leftBranch, ctx.structure, childRowY)
      const rightBox = columnIntervalOnRow(ctx.nodes, rightBranch, ctx.structure, childRowY)
      const columnGap = rightBox.left - leftBox.right
      if (columnGap + 0.5 >= FAMILY_GAP) continue
      const delta = FAMILY_GAP - columnGap
      for (let j = i + 1; j < branches.length; j++) {
        shiftBranch(ctx.nodes, branches[j]!, ctx.structure, delta)
      }
      continue
    }

    const memberGap =
      interval(ctx.nodes, rightBranch.members).left - interval(ctx.nodes, leftBranch.members).right
    let gap = memberGap
    if (useColumnGaps) {
      const columnGap =
        branchColumnInterval(ctx.nodes, rightBranch, ctx.structure, ctx.personHeight).left -
        branchColumnInterval(ctx.nodes, leftBranch, ctx.structure, ctx.personHeight).right
      gap = Math.min(memberGap, columnGap)
    }
    if (gap + 0.5 >= SIBLING_GAP) continue
    const delta = SIBLING_GAP - gap
    for (let j = i + 1; j < branches.length; j++) {
      shiftBranch(ctx.nodes, branches[j]!, ctx.structure, delta)
    }
  }
}

/** Post-order: lay out nested branches and pack child rows (centering runs once at forest end). */
export function layoutBranchColumn(branch: Branch, ctx: ColumnLayoutContext): ColumnInterval {
  for (const child of branch.childBranches) {
    layoutBranchColumn(child, ctx)
  }

  if (branch.directChildIds.length === 0) {
    if (branch.members.length > 0) {
      const y = rowY(branch.row, ctx.personHeight)
      placeChain(branch.members, 0, y, ctx.nodeById)
    }
    return interval(ctx.nodes, branch.members)
  }

  packSiblingChildrenRow(branch, ctx)
  if (branch.childBranches.length > 1) {
    enforceSiblingGapsRow(branch.childBranches, ctx, true)
  }
  alignChildGroupsUnderUnions(branch, ctx)
  centerParentsRow([branch], branch.row, ctx)
  return interval(ctx.nodes, branch.members)
}

/** Pack cousin branch columns on a row with FAMILY_GAP between child-row intervals. */
export function packSiblingBranches(
  branches: Branch[],
  childRow: number,
  ctx: ColumnLayoutContext,
  startCursor = 0,
): number {
  const y = rowY(childRow, ctx.personHeight)
  let cousinCursor = startCursor

  for (const branch of branches) {
    if (branch.directChildIds.length === 0) {
      const hubY = rowY(childRow - 1, ctx.personHeight)
      if (cousinCursor > 0) cousinCursor += SIBLING_GAP
      const hubSpan = interval(ctx.nodes, branch.members)
      const dx = cousinCursor - hubSpan.left
      if (Math.abs(dx) > 0.5) shiftBranch(ctx.nodes, branch, ctx.structure, dx)
      for (const id of branch.members) {
        const member = ctx.nodeById.get(id)
        if (member) member.y = hubY
      }
      cousinCursor = interval(ctx.nodes, branch.members).right
      continue
    }

    if (branch.childBranches.length === 0) {
      const useUnionGroups = shouldPackByUnionGroups(branch, ctx.structure)
      const groups = useUnionGroups
        ? directChildUnionGroups(branch, ctx.structure)
        : [branch.directChildIds]
      let left = cousinCursor === 0 ? 0 : cousinCursor + FAMILY_GAP
      for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
        if (useUnionGroups && groupIndex > 0) left += FAMILY_GAP
        const group = groups[groupIndex]!
        for (let i = 0; i < group.length; i++) {
          const childId = group[i]!
          const child = ctx.nodeById.get(childId)
          if (!child) continue
          child.x = left
          child.y = y
          left += child.width + (i < group.length - 1 ? SIBLING_GAP : 0)
        }
      }
      cousinCursor = interval(ctx.nodes, branch.directChildIds).right
      centerParentsRow([branch], branch.row, ctx)
      continue
    }

    const useUnionGroups = shouldPackByUnionGroups(branch, ctx.structure)
    const groups = useUnionGroups
      ? directChildUnionGroups(branch, ctx.structure)
      : [branch.directChildIds]
    let siblingCursor = cousinCursor > 0 ? cousinCursor + FAMILY_GAP : 0
    for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
      if (useUnionGroups && groupIndex > 0) siblingCursor += FAMILY_GAP
      siblingCursor = packDirectChildRun(branch, groups[groupIndex]!, siblingCursor, y, ctx, 'sibling')
    }
    cousinCursor = Math.max(
      cousinCursor,
      ...branch.directChildIds.map((childId) => {
        const nested = childBranchForDirectChild(branch, childId)
        if (nested) {
          const columnBox = columnIntervalOnRow(ctx.nodes, nested, ctx.structure, y)
          return columnBox.right
        }
        const child = ctx.nodeById.get(childId)
        return child ? child.x + child.width : 0
      }),
    )
  }
  return cousinCursor
}

function unionGroupsAtRowY(
  rowPersonIds: string[],
  rowYValue: number,
  ctx: ColumnLayoutContext,
): string[][] {
  const memberSet = new Set(rowPersonIds)
  const rowNodes = ctx.nodes
    .filter((node) => node.kind === 'person' && Math.abs(node.y - rowYValue) < 0.5)
    .filter((node) =>
      (ctx.structure.parentsOfPerson.get(node.id) ?? []).some((parent) => memberSet.has(parent)),
    )
    .sort((a, b) => a.x - b.x)
  if (rowNodes.length === 0) return []

  const groups: string[][] = []
  let current: string[] = []
  let currentUnion: string | null = null
  for (const node of rowNodes) {
    const unionId = unionIdForChildOnRow(node.id, memberSet, ctx.structure)
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

function alignRootDescendantsUnderUnions(chain: string[], branchY: number, ctx: ColumnLayoutContext) {
  if (!hasMultiUnionHubOnRow(chain, ctx.structure)) return
  const groups = unionGroupsAtRowY(chain, branchY, ctx)
  if (groups.length <= 1) return
  const childIds = groups.flat()
  if (shouldPackMultiUnionChildrenAsSiblings(chain, childIds, ctx.structure)) return
  repackUnionGroupsOnRow(chain, groups, ctx)
}

function centerParentGenerationRow(forest: BranchForest, ctx: ColumnLayoutContext) {
  const { rootGen, branchGen, rootIds } = forest
  if (branchGen <= rootGen || rootIds.length === 0) return

  const branchY = rowY(branchGen, ctx.personHeight)
  const parentY = rowY(rootGen, ctx.personHeight)
  const rootChains = marriageChains(rootIds, ctx.structure, ctx.nodeById)

  if (rootChains.length === 1) {
    const chain = rootChains[0]!
    if (chain.length === 1) {
      const parentRowIds = forest.branches.flatMap((branch) => branch.members)
      if (parentRowIds.length === 0) return
      const parentSpan = interval(ctx.nodes, parentRowIds)
      const width = chainWidth(chain, ctx.nodeById)
      placeChain(chain, centerOf(parentSpan) - width / 2, parentY, ctx.nodeById)
    } else {
      const rowNodes = ctx.nodes.filter(
        (node) => node.kind === 'person' && Math.abs(node.y - branchY) < 0.5,
      )
      if (rowNodes.length === 0) return
      const genLeft = Math.min(...rowNodes.map((node) => node.x))
      const genRight = Math.max(...rowNodes.map((node) => node.x + node.width))
      const rowCenter = (genLeft + genRight) / 2
      const width = chainWidth(chain, ctx.nodeById)
      placeChain(chain, rowCenter - width / 2, parentY, ctx.nodeById)
    }
    return
  }

  const placedChains: string[][] = []
  for (const chain of rootChains) {
    const chainSet = new Set(chain)
    const descendantIds = ctx.nodes
      .filter(
        (node) =>
          node.kind === 'person' &&
          Math.abs(node.y - branchY) < 0.5 &&
          (ctx.structure.parentsOfPerson.get(node.id) ?? []).some((parent) => chainSet.has(parent)),
      )
      .map((node) => node.id)
    if (descendantIds.length === 0) continue
    const childSpan = interval(ctx.nodes, descendantIds)
    const width = chainWidth(chain, ctx.nodeById)
    const left = centerOf(childSpan) - width / 2
    placeChain(chain, left, parentY, ctx.nodeById)
    placedChains.push(chain)
  }

  for (let i = 0; i < placedChains.length - 1; i++) {
    const leftBox = interval(ctx.nodes, placedChains[i]!)
    const rightBox = interval(ctx.nodes, placedChains[i + 1]!)
    const gap = rightBox.left - leftBox.right
    if (gap + 0.5 >= SIBLING_GAP) continue
    const delta = SIBLING_GAP - gap
    const moving = new Set<string>()
    for (let j = i + 1; j < placedChains.length; j++) {
      for (const id of placedChains[j]!) {
        moving.add(id)
        for (const descendant of downwardSet([id], ctx.structure)) moving.add(descendant)
      }
    }
    translateIds(ctx.nodes, moving, delta)
  }
}

function walkBranches(branch: Branch, visit: (entry: Branch) => void) {
  visit(branch)
  for (const child of branch.childBranches) walkBranches(child, visit)
}

function sortBranchesByAnchorBirth(branches: Branch[], nodeById: Map<string, PositionedNode>): Branch[] {
  return [...branches].sort((left, right) => {
    const leftNode = nodeById.get(left.anchorId)
    const rightNode = nodeById.get(right.anchorId)
    if (!leftNode || !rightNode) return 0
    return comparePersons(sortKeyFromNode(leftNode), sortKeyFromNode(rightNode))
  })
}

/** Pack groups: sibling row when half-siblings share a parent row; else parent-union scope. */
function packingGroupsForForest(forest: BranchForest, ctx: ColumnLayoutContext): Branch[][] {
  const branches = forest.branches
  if (branches.length <= 1) return [branches]

  const parentIds = new Set<string>()
  for (const branch of branches) {
    for (const parent of ctx.structure.parentsOfPerson.get(branch.anchorId) ?? []) {
      parentIds.add(parent)
    }
  }
  const parentRowMembers = parentRowMembersForScope(parentIds, ctx.structure, ctx.nodeById)
  const childIds = branches.map((branch) => branch.anchorId)
  if (shouldPackMultiUnionChildrenAsSiblings(parentRowMembers, childIds, ctx.structure)) {
    return [orderSiblingBranches(branches, ctx, parentRowMembers)]
  }

  const groups: Branch[][] = []
  for (const siblingGroup of partitionBranchesBySiblingRow(branches, ctx.structure, ctx.nodeById)) {
    const rowMembers = parentRowMembersForBranch(siblingGroup[0]!, ctx.structure, ctx.nodeById)
    const siblingChildIds = siblingGroup.map((branch) => branch.anchorId)
    if (hasHalfSiblingChildrenOnHub(siblingChildIds, rowMembers, ctx.structure)) {
      groups.push(orderSiblingBranches(siblingGroup, ctx, rowMembers))
      continue
    }
    groups.push(...partitionBranchesByParentScope(siblingGroup, ctx.structure))
  }
  return groups
}

function topLevelBranchesInJoinOrder(forest: BranchForest, ctx: ColumnLayoutContext): Branch[] {
  return [...forest.branches].sort(
    (left, right) => interval(ctx.nodes, left.members).left - interval(ctx.nodes, right.members).left,
  )
}

function enforceForestTopLevelCousinGaps(
  forest: BranchForest,
  ctx: ColumnLayoutContext,
  options?: { skipRowYs?: Set<number>; descendantOnlyBelowY?: number },
) {
  for (const group of partitionBranchesByParentScope(forest.branches, ctx.structure)) {
    const topBranches = group
      .filter((branch) => branch.directChildIds.length > 0)
      .sort((left, right) => interval(ctx.nodes, left.members).left - interval(ctx.nodes, right.members).left)
    if (topBranches.length <= 1) continue

    const rowYs = new Set<number>()
    for (const branch of topBranches) {
      for (const id of branchSubtreeIds(branch, ctx.structure)) {
        const node = ctx.nodes.find((entry) => entry.id === id)
        if (node) rowYs.add(node.y)
      }
    }
    for (const y of [...rowYs].sort((left, right) => right - left)) {
      if (options?.skipRowYs?.has(y)) continue
      enforceCousinGapsRow(topBranches, y, ctx, 'resolveOverlap', {
        descendantOnlyBelowY: options?.descendantOnlyBelowY,
      })
    }
  }
}

function layoutBranchColumnsInternal(forest: BranchForest, ctx: ColumnLayoutContext) {
  for (const branch of forest.branches) {
    layoutBranchColumn(branch, ctx)
  }
  for (const branch of forest.branches) {
    packAllCousinColumnRows(branch, ctx)
  }
}

/** Spread cousin columns after join-parent without disturbing gen-row anchor order. */
export function spreadColumnsAfterJoin(forest: BranchForest, ctx: ColumnLayoutContext) {
  const joinRowY = rowY(forest.branchGen, ctx.personHeight)
  const firstDescendantRowY = rowY(forest.branchGen + 1, ctx.personHeight)
  const spreadOptions = {
    skipRowYs: new Set([joinRowY]),
    descendantOnlyBelowY: firstDescendantRowY,
    resolveOverlaps: true,
  }

  packJoinOrderTopLevelDescendants(forest, ctx, firstDescendantRowY)

  for (let pass = 0; pass < 2; pass++) {
    for (const branch of forest.branches) {
      packAllCousinColumnRows(branch, ctx, spreadOptions)
    }
    resolveJoinOrderTopLevelSubtreeOverlaps(forest, ctx, firstDescendantRowY)
  }

  centerSiblingRowHubs(
    topLevelBranchesInJoinOrder(forest, ctx),
    forest.branchGen,
    ctx,
    null,
  )
  for (const branch of forest.branches) {
    recenterBranchSubtree(branch.childBranches, ctx, branch.members)
  }
}

/** Horizontal cousin packing and centering after branch interiors (and optional join-parent). */
export function finalizeForestColumnLayout(
  forest: BranchForest,
  ctx: ColumnLayoutContext,
  options?: { preserveGenRowAnchors?: boolean },
) {
  const groups = packingGroupsForForest(forest, ctx).sort((left, right) => {
    const leftBirth = Math.min(
      ...left.map((branch) => ctx.nodeById.get(branch.anchorId)?.birthYear ?? Number.POSITIVE_INFINITY),
    )
    const rightBirth = Math.min(
      ...right.map((branch) => ctx.nodeById.get(branch.anchorId)?.birthYear ?? Number.POSITIVE_INFINITY),
    )
    return leftBirth - rightBirth
  })
  let cursor = 0
  for (let index = 0; index < groups.length; index++) {
    if (index > 0) cursor += FAMILY_GAP
    const parentIds = new Set<string>()
    for (const branch of groups[index]!) {
      for (const parent of ctx.structure.parentsOfPerson.get(branch.anchorId) ?? []) {
        parentIds.add(parent)
      }
    }
    const parentRowMembers = parentRowMembersForScope(parentIds, ctx.structure, ctx.nodeById)
    const sorted =
      parentRowMembers.length > 0
        ? orderSiblingBranches(groups[index]!, ctx, parentRowMembers)
        : sortBranchesByAnchorBirth(groups[index]!, ctx.nodeById)
    if (options?.preserveGenRowAnchors) {
      sorted.sort((left, right) => {
        const leftHub = interval(ctx.nodes, left.members).left
        const rightHub = interval(ctx.nodes, right.members).left
        return leftHub - rightHub
      })
    }
    cursor = packSiblingBranches(sorted, forest.branchGen + 1, ctx, cursor)
  }

  const personCount = ctx.nodes.filter((node) => node.kind === 'person').length
  const useColumnGaps = forest.maxGen > 2 || personCount > 30
  const rootGroups = partitionBranchesByParentScope(forest.branches, ctx.structure)
  for (const group of rootGroups) {
    if (group.length > 1) enforceSiblingGapsRow(group, ctx, useColumnGaps)
  }

  centerParentGenerationRow(forest, ctx)

  const branchY = rowY(forest.branchGen, ctx.personHeight)
  for (const branch of forest.branches) {
    walkBranches(branch, (entry) => {
      if (entry.directChildIds.length > 0) {
        alignChildGroupsUnderUnions(entry, ctx)
      }
    })
  }
  for (const chain of marriageChains(forest.rootIds, ctx.structure, ctx.nodeById)) {
    alignRootDescendantsUnderUnions(chain, branchY, ctx)
  }

  for (const branch of forest.branches) {
    packAllCousinColumnRows(branch, ctx)
  }

  enforceForestTopLevelCousinGaps(forest, ctx)

  if (!options?.preserveGenRowAnchors) {
    recenterParentsOverChildren(forest, ctx)
    centerTopLevelBranchesByParentScope(forest, ctx)
    for (const branch of forest.branches) {
      recenterBranchSubtree(branch.childBranches, ctx, branch.members)
    }
    repairSiblingRowGapsAfterRecenter(forest, ctx)
    for (const group of partitionBranchesByParentScope(forest.branches, ctx.structure)) {
      if (group.length > 1) enforceHubClusterSiblingGapsRow(group, ctx)
    }
    // Cousin-column shifts during recenter can leave a later top-level branch inside an
    // earlier branch's row span (DCC: d1 between c2 and c3). Re-resolve cross-branch overlaps.
    enforceForestTopLevelCousinGaps(forest, ctx)
    recenterParentsOverChildren(forest, ctx)
    repairSiblingRowGapsAfterRecenter(forest, ctx)
  }
  centerParentGenerationRow(forest, ctx)
  if (!options?.preserveGenRowAnchors) {
    repairSiblingRowGapsAfterRecenter(forest, ctx)
  }
}

function repairSiblingRowGapsAfterRecenter(forest: BranchForest, ctx: ColumnLayoutContext) {
  const personCount = ctx.nodes.filter((node) => node.kind === 'person').length
  const useColumnGaps = forest.maxGen > 2 || personCount > 30
  for (const group of partitionBranchesByParentScope(forest.branches, ctx.structure)) {
    if (group.length <= 1) continue
    const sorted = [...group].sort(
      (left, right) => interval(ctx.nodes, left.members).left - interval(ctx.nodes, right.members).left,
    )
    enforceSiblingGapsRow(sorted, ctx, useColumnGaps)
  }
}

/** Single-pass column layout: pack columns and gaps, then contract centering once. */
export function layoutColumnForest(
  forest: BranchForest,
  ctx: ColumnLayoutContext,
  options?: { deferHorizontalPack?: boolean },
) {
  layoutBranchColumnsInternal(forest, ctx)
  if (!options?.deferHorizontalPack) {
    finalizeForestColumnLayout(forest, ctx)
  }
}
