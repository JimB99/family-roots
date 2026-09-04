import type { PositionedLayout, PositionedNode } from './layout-model'
import { COUPLE_W, FAMILY_GAP, SIBLING_GAP } from './layout-spacing'

export interface Interval {
  left: number
  right: number
}

export function personCenter(node: PositionedNode): number {
  return node.x + node.width / 2
}

export function edgeToEdgeGap(left: PositionedNode, right: PositionedNode): number {
  const first = left.x <= right.x ? left : right
  const second = left.x <= right.x ? right : left
  return second.x - (first.x + first.width)
}

export function coupleCenteringOffset(
  layout: PositionedLayout,
  parentIds: string[],
  childIds: string[],
): number | null {
  const parents = parentIds
    .map((id) => layout.nodes.find((n) => n.personId === id))
    .filter((n): n is PositionedNode => n != null)
  const children = childIds
    .map((id) => layout.nodes.find((n) => n.personId === id))
    .filter((n): n is PositionedNode => n != null)
  if (parents.length === 0 || children.length === 0) return null
  const parentMid = parents.reduce((s, n) => s + personCenter(n), 0) / parents.length
  const childMid = children.reduce((s, n) => s + personCenter(n), 0) / children.length
  return Math.abs(childMid - parentMid)
}

export function siblingGap(layout: PositionedLayout, leftId: string, rightId: string): number | null {
  const left = layout.nodes.find((n) => n.personId === leftId)
  const right = layout.nodes.find((n) => n.personId === rightId)
  if (!left || !right) return null
  return edgeToEdgeGap(left, right)
}

export function hasRowOverlap(nodes: PositionedNode[]): boolean {
  const sorted = [...nodes].sort((a, b) => a.x - b.x)
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].x < sorted[i - 1].x + sorted[i - 1].width - 0.5) return true
  }
  return false
}

export function totalWidth(layout: PositionedLayout): number {
  return layout.bounds.maxX - layout.bounds.minX
}

export function branchGap(intervalA: Interval, intervalB: Interval): number {
  return intervalB.left - intervalA.right
}

/** Positive when parent-row gap exceeds child-row gap. */
export function gapCompare(parentGap: number, childGap: number): number {
  return parentGap - childGap
}

export function blockInterval(nodes: PositionedNode[]): Interval {
  if (nodes.length === 0) return { left: 0, right: 0 }
  const left = Math.min(...nodes.map((n) => n.x))
  const right = Math.max(...nodes.map((n) => n.x + n.width))
  return { left, right }
}

export function maxEmptyVerticalBand(layout: PositionedLayout, sliceWidth = 50): number {
  const personNodes = layout.nodes.filter((n) => n.kind === 'person')
  if (personNodes.length === 0) return 0

  const minX = Math.min(...personNodes.map((n) => n.x))
  const maxX = Math.max(...personNodes.map((n) => n.x + n.width))
  const width = maxX - minX
  const slices = Math.ceil(width / sliceWidth)
  const occupancy = new Uint8Array(slices)

  for (const node of personNodes) {
    const start = Math.floor((node.x - minX) / sliceWidth)
    const end = Math.floor((node.x + node.width - minX) / sliceWidth)
    for (let i = start; i <= end && i < slices; i++) occupancy[i] = 1
  }

  let maxRun = 0
  let runStart: number | null = null
  for (let i = 0; i < slices; i++) {
    if (occupancy[i] === 0) {
      if (runStart == null) runStart = i
    } else if (runStart != null) {
      maxRun = Math.max(maxRun, (i - runStart) * sliceWidth)
      runStart = null
    }
  }
  if (runStart != null) maxRun = Math.max(maxRun, (slices - runStart) * sliceWidth)
  return maxRun
}

export function localityDelta(
  before: PositionedLayout,
  after: PositionedLayout,
  excludePersonIds: Set<string>,
): number {
  let max = 0
  for (const node of before.nodes) {
    if (node.kind !== 'person' || !node.personId || excludePersonIds.has(node.personId)) continue
    const other = after.nodes.find((n) => n.id === node.id)
    if (!other) continue
    max = Math.max(max, Math.abs(other.x - node.x), Math.abs(other.y - node.y))
  }
  return max
}

export function assertSiblingGap(gap: number | null, tolerance = 1): boolean {
  if (gap == null) return false
  return gap >= -tolerance && gap <= SIBLING_GAP + tolerance
}

export function assertCousinGap(gap: number | null, tolerance = 1): boolean {
  if (gap == null) return false
  return gap >= FAMILY_GAP - tolerance
}

export function assertGapCompare(
  parentGap: number,
  childGap: number,
  expected: 'greater' | 'less' | 'approx',
  tolerance = COUPLE_W,
): boolean {
  const diff = gapCompare(parentGap, childGap)
  if (expected === 'greater') return diff > 0
  if (expected === 'less') return diff < 0
  return Math.abs(diff) <= tolerance
}

export function unionCenteringErrors(
  layout: PositionedLayout,
  unionParents: Map<string, string[]>,
  unionChildren: Map<string, string[]>,
): Array<{ unionId: string; error: number }> {
  const errors: Array<{ unionId: string; error: number }> = []
  for (const [unionId, children] of unionChildren) {
    const parents = unionParents.get(unionId) ?? []
    if (parents.length === 0 || children.length === 0) continue
    const offset = coupleCenteringOffset(layout, parents, children)
    if (offset != null) errors.push({ unionId, error: offset })
  }
  errors.sort((a, b) => b.error - a.error)
  return errors
}

export function maxUnionCenteringError(
  layout: PositionedLayout,
  unionParents: Map<string, string[]>,
  unionChildren: Map<string, string[]>,
): number {
  const errors = unionCenteringErrors(layout, unionParents, unionChildren)
  return errors.length === 0 ? 0 : errors[0].error
}
