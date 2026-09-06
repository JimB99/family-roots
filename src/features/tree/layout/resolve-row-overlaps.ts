/**
 * Row-level gap enforcement after branch packing and join-parent placement.
 * Legacy layout ran these passes; branch contract layout must too or large trees overlap.
 */
import { downwardSet } from './compact-subtrees'
import type { Branch } from './branch-tree'
import { branchAwareShiftSet } from './branch-shift'
import type { FamilyStructure } from './family-structure'
import type { PositionedNode } from './layout-model'
import { shareNatalFamily } from './legacy-pack-pedigree'
import { FAMILY_GAP, NODE_GAP, SIBLING_GAP } from './layout-spacing'

interface Interval {
  left: number
  right: number
}

function sameRow(a: PositionedNode, b: PositionedNode): boolean {
  return Math.abs(a.y - b.y) < 0.5
}

function clusterPersonOverlap(nodes: PositionedNode[], leftIds: string[], rightIds: string[]): boolean {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  for (const leftId of leftIds) {
    const left = byId.get(leftId)
    if (!left) continue
    for (const rightId of rightIds) {
      const right = byId.get(rightId)
      if (!right || !sameRow(left, right)) continue
      if (right.x < left.x + left.width - 0.5) return true
    }
  }
  return false
}

function translate(nodes: PositionedNode[], ids: Set<string>, dx: number) {
  if (Math.abs(dx) < 0.5) return
  for (const node of nodes) {
    if (ids.has(node.id)) node.x += dx
  }
}

function arePartners(a: string, b: string, structure: FamilyStructure): boolean {
  for (const [left, right] of structure.spouseLinks) {
    if ((left === a && right === b) || (left === b && right === a)) return true
  }
  for (const parents of structure.unionParents.values()) {
    if (parents.includes(a) && parents.includes(b)) return true
  }
  return false
}

function minAdjacentGap(leftId: string, rightId: string, structure: FamilyStructure): number {
  if (arePartners(leftId, rightId, structure)) return NODE_GAP
  if (shareNatalFamily([leftId], [rightId], structure)) return SIBLING_GAP
  return 0
}

class DisjointSet {
  private parent = new Map<string, string>()

  find(id: string): string {
    const current = this.parent.get(id)
    if (current === undefined) {
      this.parent.set(id, id)
      return id
    }
    if (current === id) return id
    const root = this.find(current)
    this.parent.set(id, root)
    return root
  }

  union(a: string, b: string) {
    const ra = this.find(a)
    const rb = this.find(b)
    if (ra !== rb) this.parent.set(ra, rb)
  }
}

function rowClusters(nodes: PositionedNode[], structure: FamilyStructure): Map<string, string[]> {
  const persons = nodes.filter((node) => node.kind === 'person')
  const byId = new Map(persons.map((node) => [node.id, node]))
  const dsu = new DisjointSet()
  for (const node of persons) dsu.find(node.id)
  for (const [a, b] of structure.spouseLinks) {
    const left = byId.get(a)
    const right = byId.get(b)
    if (!left || !right || !sameRow(left, right)) continue
    dsu.union(a, b)
  }
  for (const parents of structure.unionParents.values()) {
    const present = parents.map((id) => byId.get(id)).filter((node): node is PositionedNode => node != null)
    if (present.length < 2) continue
    if (!present.every((node) => sameRow(node, present[0]!))) continue
    for (let i = 1; i < present.length; i++) dsu.union(present[0]!.id, present[i]!.id)
  }
  const clusters = new Map<string, string[]>()
  for (const node of persons) {
    const root = dsu.find(node.id)
    const list = clusters.get(root) ?? []
    list.push(node.id)
    clusters.set(root, list)
  }
  return clusters
}

function clusterInterval(nodes: PositionedNode[], memberIds: string[]): Interval {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  let left = Infinity
  let right = -Infinity
  for (const id of memberIds) {
    const node = byId.get(id)
    if (!node) continue
    left = Math.min(left, node.x)
    right = Math.max(right, node.x + node.width)
  }
  if (!Number.isFinite(left)) return { left: 0, right: 0 }
  return { left, right }
}

function maxShiftToward(
  nodes: PositionedNode[],
  moving: Set<string>,
  direction: -1 | 1,
  structure: FamilyStructure,
): number {
  const persons = nodes.filter((node) => node.kind === 'person')
  let allowed = Infinity
  for (const node of persons) {
    if (!moving.has(node.id)) continue
    for (const other of persons) {
      if (moving.has(other.id) || !sameRow(node, other)) continue
      if (direction < 0) {
        if (other.x + other.width > node.x + 0.5) continue
        const gap = node.x - (other.x + other.width)
        const minGap = minAdjacentGap(other.id, node.id, structure)
        allowed = Math.min(allowed, Math.max(0, gap - minGap))
      } else {
        if (other.x < node.x + node.width - 0.5) continue
        const gap = other.x - (node.x + node.width)
        const minGap = minAdjacentGap(node.id, other.id, structure)
        allowed = Math.min(allowed, Math.max(0, gap - minGap))
      }
    }
  }
  return Number.isFinite(allowed) ? allowed : Infinity
}

function shiftSet(
  seedIds: string[],
  structure: FamilyStructure,
  branches: Branch[] | undefined,
): Set<string> {
  if (branches && branches.length > 0) {
    return branchAwareShiftSet(seedIds, branches, structure)
  }
  return downwardSet(seedIds, structure)
}

/** Push apart cousin/natal clusters on the same row until FAMILY_GAP is satisfied. */
export function separateCousinClusters(
  nodes: PositionedNode[],
  structure: FamilyStructure,
  branches?: Branch[],
): void {
  const clusters = [...rowClusters(nodes, structure).values()]
  const byRow = new Map<number, string[][]>()
  const byId = new Map(nodes.map((node) => [node.id, node]))
  for (const members of clusters) {
    const first = byId.get(members[0]!)
    if (!first) continue
    const list = byRow.get(first.y) ?? []
    list.push(members)
    byRow.set(first.y, list)
  }
  for (const row of byRow.values()) {
    const ordered = [...row].sort((a, b) => clusterInterval(nodes, a).left - clusterInterval(nodes, b).left)
    for (let i = 1; i < ordered.length; i++) {
      if (shareNatalFamily(ordered[i - 1]!, ordered[i]!, structure)) continue
      const left = clusterInterval(nodes, ordered[i - 1]!)
      const right = clusterInterval(nodes, ordered[i]!)
      const gap = right.left - left.right
      if (gap < 0 && !clusterPersonOverlap(nodes, ordered[i - 1]!, ordered[i]!)) continue
      const extra = FAMILY_GAP - gap
      if (extra <= 1) continue
      const restIds = ordered.slice(i).flat()
      const moving = shiftSet(restIds, structure, branches)
      const blocked = shiftSet(ordered[i - 1]!, structure, branches)
      if ([...moving].some((id) => blocked.has(id))) continue
      const allowed = maxShiftToward(nodes, moving, 1, structure)
      const dx = Math.min(extra, allowed)
      if (dx > 1) {
        translate(nodes, moving, dx)
        continue
      }
      const rightMoving = shiftSet(ordered[i]!, structure, branches)
      for (const member of ordered[i]!) rightMoving.add(member)
      const fallbackAllowed = maxShiftToward(nodes, rightMoving, 1, structure)
      const fallbackDx = Math.min(extra, fallbackAllowed)
      if (fallbackDx > 1) translate(nodes, rightMoving, fallbackDx)
    }
  }
}

/** Resolve geometric overlaps on each row using partner/sibling/cousin minimum gaps. */
export function resolveRowOverlaps(
  nodes: PositionedNode[],
  structure: FamilyStructure,
  branches?: Branch[],
): void {
  const persons = nodes.filter((node) => node.kind === 'person')
  const rows = new Map<number, PositionedNode[]>()
  for (const node of persons) {
    const list = rows.get(node.y) ?? []
    list.push(node)
    rows.set(node.y, list)
  }
  for (const row of rows.values()) {
    const ordered = [...row].sort((a, b) => a.x - b.x)
    for (let i = 0; i < ordered.length - 1; i++) {
      for (let j = i + 1; j < ordered.length; j++) {
        const prev = ordered[i]!
        const curr = ordered[j]!
        const minGap = minAdjacentGap(prev.id, curr.id, structure)
        const need = prev.x + prev.width + minGap - curr.x
        if (need <= 1) continue
        const sameNatal = shareNatalFamily([prev.id], [curr.id], structure)
        const moving = sameNatal
          ? downwardSet([curr.id], structure)
          : shiftSet([curr.id], structure, branches)
        moving.add(curr.id)
        const blocked = sameNatal
          ? downwardSet([prev.id], structure)
          : shiftSet([prev.id], structure, branches)
        if ([...moving].some((id) => id !== curr.id && blocked.has(id))) continue
        translate(nodes, moving, need)
      }
    }
  }
}

/** Run cousin separation and overlap resolution until stable (max 8 passes). */
export function enforceRowMinimumGaps(
  nodes: PositionedNode[],
  structure: FamilyStructure,
  branches?: Branch[],
): void {
  for (let pass = 0; pass < 8; pass++) {
    separateCousinClusters(nodes, structure, branches)
    resolveRowOverlaps(nodes, structure, branches)
  }
}
