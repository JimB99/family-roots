/**
 * Shared row-packing helpers for branch contract layout and join-parent placement.
 */
import type { PositionedNode } from './layout-model'
import { FAMILY_GAP, NODE_GAP, PERSON_W } from './layout-spacing'

export interface XInterval {
  left: number
  right: number
}

export function rowInterval(nodes: PositionedNode[], ids: string[]): XInterval {
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

export function intervalCenter(span: XInterval): number {
  return (span.left + span.right) / 2
}

export function placePersonChain(
  memberIds: string[],
  left: number,
  y: number,
  nodeById: Map<string, PositionedNode>,
): void {
  let cursor = left
  for (let i = 0; i < memberIds.length; i++) {
    const node = nodeById.get(memberIds[i]!)
    if (!node) continue
    node.x = cursor
    node.y = y
    cursor += node.width + (i < memberIds.length - 1 ? NODE_GAP : 0)
  }
}

export function halfSepForStrangerCouples(): number {
  return (2 * PERSON_W + NODE_GAP) / 2 + FAMILY_GAP / 2
}

export function halfSepSingleParent(): number {
  return PERSON_W / 2 + FAMILY_GAP / 2
}

export function translateNodeIds(nodes: PositionedNode[], ids: Set<string>, dx: number): void {
  if (Math.abs(dx) < 0.5) return
  for (const node of nodes) {
    if (ids.has(node.id)) node.x += dx
  }
}
