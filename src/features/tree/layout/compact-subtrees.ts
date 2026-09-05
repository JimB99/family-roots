import { marriageChains } from './elk-graph.ts'
import type { FamilyStructure } from './family-structure'
import type { PositionedNode } from './layout-model'
import { hasRowOverlap } from './layout-metrics.ts'
import { comparePersons } from './layout-order.ts'
import { FAMILY_GAP, NODE_GAP, SIBLING_GAP } from './layout-spacing'

interface Interval {
  left: number
  right: number
}

function mergeIntervals(intervals: Interval[]): Interval[] {
  if (intervals.length === 0) return []
  const sorted = [...intervals].sort((a, b) => a.left - b.left)
  const merged: Interval[] = [{ ...sorted[0] }]
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1]
    if (sorted[i].left <= last.right + 0.5) {
      last.right = Math.max(last.right, sorted[i].right)
    } else {
      merged.push({ ...sorted[i] })
    }
  }
  return merged
}

/** Close globally empty x-gaps, shifting every node to the right of each gap. */
export function compactEmptyVerticalGaps(nodes: PositionedNode[], keepGap = FAMILY_GAP): PositionedNode[] {
  const persons = nodes.filter((node) => node.kind === 'person')
  if (persons.length === 0) return nodes

  const merged = mergeIntervals(persons.map((node) => ({ left: node.x, right: node.x + node.width })))
  const shifts: Array<{ fromX: number; amount: number }> = []
  for (let i = merged.length - 1; i >= 1; i--) {
    const gap = merged[i].left - merged[i - 1].right
    const extra = gap - keepGap
    if (extra > 1) shifts.push({ fromX: merged[i].left, amount: extra })
  }
  if (shifts.length === 0) return nodes

  return nodes.map((node) => {
    let x = node.x
    for (const shift of shifts) {
      if (x >= shift.fromX - 0.5) x -= shift.amount
    }
    return { ...node, x }
  })
}

function translate(nodes: PositionedNode[], ids: Set<string>, dx: number) {
  if (Math.abs(dx) < 0.5) return
  for (const node of nodes) {
    if (ids.has(node.id)) node.x += dx
  }
}

function spousesOf(id: string, structure: FamilyStructure): string[] {
  const result: string[] = []
  for (const [a, b] of structure.spouseLinks) {
    if (a === id) result.push(b)
    else if (b === id) result.push(a)
  }
  for (const parents of structure.unionParents.values()) {
    if (!parents.includes(id)) continue
    for (const parent of parents) {
      if (parent !== id) result.push(parent)
    }
  }
  return result
}

/** Child persons, their spouses, and descendants — not the child's natal siblings. */
export function downwardSet(childIds: string[], structure: FamilyStructure): Set<string> {
  const seen = new Set<string>()
  const queue = [...childIds]
  while (queue.length > 0) {
    const id = queue.pop()!
    if (seen.has(id)) continue
    seen.add(id)
    for (const spouse of spousesOf(id, structure)) {
      if (!seen.has(spouse)) seen.add(spouse)
    }
    for (const child of structure.childrenOfPerson.get(id) ?? []) {
      if (!seen.has(child)) queue.push(child)
    }
  }
  return seen
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
    const rootA = this.find(a)
    const rootB = this.find(b)
    if (rootA === rootB) return
    if (rootA < rootB) this.parent.set(rootB, rootA)
    else this.parent.set(rootA, rootB)
  }
}

function sameRow(a: PositionedNode, b: PositionedNode): boolean {
  return Math.abs(a.y - b.y) < 0.5
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
    if (!present.every((node) => sameRow(node, present[0]))) continue
    for (let i = 1; i < present.length; i++) dsu.union(present[0].id, present[i].id)
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
  return { left, right }
}

export function shareNatalFamily(leftIds: string[], rightIds: string[], structure: FamilyStructure): boolean {
  const leftParents = new Set<string>()
  const leftUnions = new Set<string>()
  for (const id of leftIds) {
    for (const parent of structure.parentsOfPerson.get(id) ?? []) leftParents.add(parent)
    for (const [unionId, children] of structure.unionChildren) {
      if (children.includes(id)) leftUnions.add(unionId)
    }
  }
  for (const id of rightIds) {
    for (const parent of structure.parentsOfPerson.get(id) ?? []) {
      if (leftParents.has(parent)) return true
    }
    for (const [unionId, children] of structure.unionChildren) {
      if (children.includes(id) && leftUnions.has(unionId)) return true
    }
  }
  return false
}

function separateCousinClusters(nodes: PositionedNode[], structure: FamilyStructure) {
  const clusters = [...rowClusters(nodes, structure).values()]
  const byRow = new Map<number, string[][]>()
  const byId = new Map(nodes.map((node) => [node.id, node]))
  for (const members of clusters) {
    const first = byId.get(members[0])
    if (!first) continue
    const list = byRow.get(first.y) ?? []
    list.push(members)
    byRow.set(first.y, list)
  }
  for (const row of byRow.values()) {
    const ordered = [...row].sort((a, b) => clusterInterval(nodes, a).left - clusterInterval(nodes, b).left)
    for (let i = 1; i < ordered.length; i++) {
      if (shareNatalFamily(ordered[i - 1], ordered[i], structure)) continue
      const left = clusterInterval(nodes, ordered[i - 1])
      const right = clusterInterval(nodes, ordered[i])
      const gap = right.left - left.right
      const extra = FAMILY_GAP - gap
      if (extra <= 1) continue
      const restIds = ordered.slice(i).flat()
      const moving = downwardSet(restIds, structure)
      const blocked = downwardSet(ordered[i - 1], structure)
      const joined = [...moving].some((id) => blocked.has(id))
      if (joined) continue
      const allowed = maxShiftToward(nodes, moving, 1, structure)
      const dx = Math.min(extra, allowed)
      if (dx > 1) {
        translate(nodes, moving, dx)
        continue
      }
      const rightMoving = downwardSet(ordered[i], structure)
      for (const member of ordered[i]) rightMoving.add(member)
      const fallbackAllowed = maxShiftToward(nodes, rightMoving, 1, structure)
      const fallbackDx = Math.min(extra, fallbackAllowed)
      if (fallbackDx > 1) {
        translate(nodes, rightMoving, fallbackDx)
      }
    }
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

function resolveOverlaps(nodes: PositionedNode[], structure: FamilyStructure) {
  const persons = nodes.filter((node) => node.kind === 'person').sort((a, b) => a.y - b.y || a.x - b.x)
  const rows = new Map<number, PositionedNode[]>()
  for (const node of persons) {
    const list = rows.get(node.y) ?? []
    list.push(node)
    rows.set(node.y, list)
  }
  for (const row of rows.values()) {
    const ordered = [...row].sort((a, b) => a.x - b.x)
    for (let i = 1; i < ordered.length; i++) {
      const prev = ordered[i - 1]
      const curr = ordered[i]
      const minGap = minAdjacentGap(prev.id, curr.id, structure)
      const need = prev.x + prev.width + minGap - curr.x
      if (need <= 1) continue
      const moving = downwardSet([curr.id], structure)
      moving.add(curr.id)
      const blocked = downwardSet([prev.id], structure)
      if ([...moving].some((id) => id !== curr.id && blocked.has(id))) continue
      translate(nodes, moving, need)
    }
  }
}

function clearanceGap(leftId: string, rightId: string, structure: FamilyStructure): number {
  if (arePartners(leftId, rightId, structure)) return NODE_GAP
  if (shareNatalFamily([leftId], [rightId], structure)) return SIBLING_GAP
  return FAMILY_GAP
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
        const minGap = clearanceGap(other.id, node.id, structure)
        allowed = Math.min(allowed, Math.max(0, gap - minGap))
      } else {
        if (other.x < node.x + node.width - 0.5) continue
        const gap = other.x - (node.x + node.width)
        const minGap = clearanceGap(node.id, other.id, structure)
        allowed = Math.min(allowed, Math.max(0, gap - minGap))
      }
    }
  }
  return Number.isFinite(allowed) ? allowed : Infinity
}

function minDescendantGap(
  leftIds: string[],
  rightIds: string[],
  nodes: PositionedNode[],
  structure: FamilyStructure,
): number {
  const leftDown = downwardSet(leftIds, structure)
  const rightDown = downwardSet(rightIds, structure)
  const persons = nodes.filter((node) => node.kind === 'person')
  const rows = new Map<number, PositionedNode[]>()
  for (const node of persons) {
    const list = rows.get(node.y) ?? []
    list.push(node)
    rows.set(node.y, list)
  }
  let minGap = Infinity
  const startY = Math.min(
    ...leftIds.map((id) => persons.find((node) => node.id === id)?.y ?? Infinity),
    ...rightIds.map((id) => persons.find((node) => node.id === id)?.y ?? Infinity),
  )
  for (const [y, row] of rows) {
    if (y <= startY + 0.5) continue
    const lefts = row.filter((node) => leftDown.has(node.id))
    const rights = row.filter((node) => rightDown.has(node.id))
    if (lefts.length === 0 || rights.length === 0) continue
    const leftRight = Math.max(...lefts.map((node) => node.x + node.width))
    const rightLeft = Math.min(...rights.map((node) => node.x))
    const leftLeft = Math.min(...lefts.map((node) => node.x))
    const rightRight = Math.max(...rights.map((node) => node.x + node.width))
    const gap = rightLeft >= leftRight ? rightLeft - leftRight : leftLeft - rightRight
    minGap = Math.min(minGap, gap)
  }
  return minGap
}

function tightenNatalGaps(nodes: PositionedNode[], structure: FamilyStructure) {
  const clusters = [...rowClusters(nodes, structure).values()]
  for (const [, children] of structure.unionChildren) {
    if (children.length < 2) continue
    const childClusters: string[][] = []
    const seen = new Set<string>()
    for (const childId of children) {
      const cluster = clusters.find((members) => members.includes(childId))
      if (!cluster) continue
      const key = [...cluster].sort().join('|')
      if (seen.has(key)) continue
      seen.add(key)
      childClusters.push(cluster)
    }
    const ordered = [...childClusters].sort(
      (a, b) => clusterInterval(nodes, a).left - clusterInterval(nodes, b).left,
    )
    for (let i = 1; i < ordered.length; i++) {
      const left = clusterInterval(nodes, ordered[i - 1])
      const right = clusterInterval(nodes, ordered[i])
      const gap = right.left - left.right
      const descendantGap = minDescendantGap(ordered[i - 1], ordered[i], nodes, structure)
      const slack = Number.isFinite(descendantGap) ? Math.max(0, descendantGap - FAMILY_GAP) : Infinity
      const extra = Math.min(gap - SIBLING_GAP, slack)
      if (extra <= 1) continue
      const moving = downwardSet(ordered[i], structure)
      const blocked = downwardSet(ordered[i - 1], structure)
      if ([...moving].some((id) => blocked.has(id))) continue
      const allowed = maxShiftToward(nodes, moving, -1, structure)
      const dx = -Math.min(extra, allowed)
      if (dx < -1) translate(nodes, moving, dx)
    }
  }
}

function natalSiblingsOnRow(
  personId: string,
  nodes: PositionedNode[],
  structure: FamilyStructure,
): PositionedNode[] {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const person = byId.get(personId)
  if (!person) return []
  const parents = new Set(structure.parentsOfPerson.get(personId) ?? [])
  if (parents.size === 0) return []
  const result: PositionedNode[] = []
  for (const node of nodes) {
    if (node.kind !== 'person' || node.id === personId || !sameRow(node, person)) continue
    if (arePartners(personId, node.id, structure)) continue
    const otherParents = structure.parentsOfPerson.get(node.id) ?? []
    if (otherParents.some((parent) => parents.has(parent))) result.push(node)
  }
  return result
}

/** Swap partners in a 2-person couple so the blood person faces their natal siblings. */
export function orientCouplesTowardNatalSiblings(nodes: PositionedNode[], structure: FamilyStructure): void {
  const persons = nodes.filter((node) => node.kind === 'person')
  const byId = new Map(persons.map((node) => [node.id, node]))
  const byRow = new Map<number, string[]>()
  for (const person of persons) {
    const list = byRow.get(person.y) ?? []
    list.push(person.id)
    byRow.set(person.y, list)
  }
  for (const ids of byRow.values()) {
    const chains = marriageChains(ids, structure, byId)
    for (const members of chains) {
      if (members.length !== 2) continue
      const first = byId.get(members[0])
      const second = byId.get(members[1])
      if (!first || !second || !sameRow(first, second)) continue
      const left = first.x <= second.x ? first : second
      const right = first.x <= second.x ? second : first
      const coupleLeft = left.x
      const coupleRight = right.x + right.width
      let shouldSwap = false
      for (const member of [left, right]) {
        const sibs = natalSiblingsOnRow(member.id, nodes, structure)
        if (sibs.length === 0) continue
        const sibsLeft = sibs.filter((sib) => sib.x + sib.width <= coupleLeft + 0.5)
        const sibsRight = sibs.filter((sib) => sib.x >= coupleRight - 0.5)
        if (sibsLeft.length > 0 && sibsRight.length === 0 && member === right) shouldSwap = true
        if (sibsRight.length > 0 && sibsLeft.length === 0 && member === left) shouldSwap = true
      }
      if (!shouldSwap) continue
      const tmp = left.x
      left.x = right.x
      right.x = tmp
    }
  }
}

function isJoinPerson(nodes: PositionedNode[], structure: FamilyStructure, personId: string): boolean {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const node = byId.get(personId)
  if (!node) return false
  const ownParents = new Set(structure.parentsOfPerson.get(personId) ?? [])
  for (const spouseId of spousesOf(personId, structure)) {
    const spouse = byId.get(spouseId)
    if (!spouse || !sameRow(node, spouse)) continue
    for (const sib of natalSiblingsOnRow(spouseId, nodes, structure)) {
      const sibParents = structure.parentsOfPerson.get(sib.id) ?? []
      if (!sibParents.some((parent) => ownParents.has(parent))) return true
    }
  }
  return false
}

/**
 * Center parents on natal-contiguous children, ignoring join-in-law kids parked
 * with another family. Does not move descendants.
 */
export function nudgeParentsToCoreChildren(nodes: PositionedNode[], structure: FamilyStructure): void {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  for (const [unionId, children] of structure.unionChildren) {
    const parents = structure.unionParents.get(unionId) ?? []
    if (parents.length === 0 || children.length === 0) continue
    const core = children.filter((id) => !isJoinPerson(nodes, structure, id))
    if (core.length === 0) continue
    if (
      parents.some((id) =>
        natalSiblingsOnRow(id, nodes, structure).some((sib) => {
          const parent = byId.get(id)
          if (!parent) return false
          const gap = sib.x >= parent.x ? sib.x - (parent.x + parent.width) : parent.x - (sib.x + sib.width)
          return gap <= SIBLING_GAP + 1
        }),
      )
    ) {
      continue
    }
    const parentMid = meanCenter(nodes, parents)
    const coreMid = meanCenter(nodes, core)
    if (parentMid == null || coreMid == null) continue
    const dx = coreMid - parentMid
    if (Math.abs(dx) <= 80) continue
    const moving = new Set(parents)
    for (const parent of parents) {
      for (const spouse of spousesOf(parent, structure)) {
        const node = byId.get(spouse)
        const parentNode = byId.get(parent)
        if (node && parentNode && sameRow(node, parentNode)) moving.add(spouse)
      }
    }
    const direction: -1 | 1 = dx > 0 ? 1 : -1
    const allowed = maxShiftToward(nodes, moving, direction, structure)
    const shift = direction * Math.min(Math.abs(dx), allowed)
    if (Math.abs(shift) > 1) translate(nodes, moving, shift)
  }
}

function childBearingUnionCount(personId: string, structure: FamilyStructure): number {
  let count = 0
  for (const [unionId, parents] of structure.unionParents) {
    if (!parents.includes(personId)) continue
    if ((structure.unionChildren.get(unionId) ?? []).length > 0) count += 1
  }
  return count
}

export function centerUnionsOnCoreChildren(nodes: PositionedNode[], structure: FamilyStructure): void {
  const unions = [...structure.unionChildren.entries()].sort((a, b) => {
    const ay = Math.max(0, ...a[1].map((id) => nodes.find((node) => node.id === id)?.y ?? 0))
    const by = Math.max(0, ...b[1].map((id) => nodes.find((node) => node.id === id)?.y ?? 0))
    return by - ay
  })
  for (const [unionId, children] of unions) {
    const parents = structure.unionParents.get(unionId) ?? []
    if (parents.length === 0 || children.length === 0) continue
    const core = children.filter((id) => !isJoinPerson(nodes, structure, id))
    const measured = core.length > 0 ? core : children
    const parentMid = meanCenter(nodes, parents)
    const childMid = meanCenter(nodes, measured)
    if (parentMid == null || childMid == null) continue
    const dx = parentMid - childMid
    if (Math.abs(dx) <= 80) continue
    const moving = downwardSet(measured, structure)
    for (const parent of parents) moving.delete(parent)
    if (moving.size === 0) continue
    const direction: -1 | 1 = dx > 0 ? 1 : -1
    const allowed = maxShiftToward(nodes, moving, direction, structure)
    const shift = direction * Math.min(Math.abs(dx), allowed)
    if (Math.abs(shift) > 1) translate(nodes, moving, shift)
  }
}

function meanCenter(nodes: PositionedNode[], ids: string[]): number | null {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const values: number[] = []
  for (const id of ids) {
    const node = byId.get(id)
    if (node) values.push(node.x + node.width / 2)
  }
  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

/**
 * ELK aligns a parent to a couple-container, which offsets blood-child
 * midpoints by ~122–126px. Shift isolated parents (no natal siblings on the
 * row, single child-bearing union) onto their children. Never moves descendants.
 */
export function nudgeIsolatedParents(nodes: PositionedNode[], structure: FamilyStructure): void {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  for (const [unionId, children] of structure.unionChildren) {
    const parents = structure.unionParents.get(unionId) ?? []
    if (parents.length === 0 || children.length === 0) continue
    if (parents.some((id) => childBearingUnionCount(id, structure) > 1)) continue
    if (parents.some((id) => natalSiblingsOnRow(id, nodes, structure).length > 0)) continue
    const parentMid = meanCenter(nodes, parents)
    const childMid = meanCenter(nodes, children)
    if (parentMid == null || childMid == null) continue
    const error = Math.abs(childMid - parentMid)
    if (error <= 80 || error > 140) continue
    const dx = childMid - parentMid
    const moving = new Set(parents)
    for (const parent of parents) {
      for (const spouse of spousesOf(parent, structure)) {
        const node = byId.get(spouse)
        const parentNode = byId.get(parent)
        if (node && parentNode && sameRow(node, parentNode)) moving.add(spouse)
      }
    }
    translate(nodes, moving, dx)
  }
}

function sortKeyForNode(node: PositionedNode) {
  return { birthYear: node.birthYear ?? Number.POSITIVE_INFINITY, id: node.id }
}

function swapClusterPositions(
  nodes: PositionedNode[],
  structure: FamilyStructure,
  left: { childId: string; members: string[] },
  right: { childId: string; members: string[] },
) {
  const leftInt = clusterInterval(nodes, left.members)
  const rightInt = clusterInterval(nodes, right.members)
  shiftCluster(nodes, structure, left, rightInt.left - leftInt.left)
  shiftCluster(nodes, structure, right, leftInt.left - rightInt.left)
}

function shiftCluster(
  nodes: PositionedNode[],
  structure: FamilyStructure,
  cluster: { childId: string; members: string[] },
  dx: number,
) {
  if (Math.abs(dx) <= 0.5) return
  const moving = downwardSet([cluster.childId], structure)
  for (const member of cluster.members) moving.add(member)
  translate(nodes, moving, dx)
}

function hasCrossFamilySpouse(childId: string, children: string[], structure: FamilyStructure): boolean {
  const childParents = new Set(structure.parentsOfPerson.get(childId) ?? [])
  for (const spouseId of spousesOf(childId, structure)) {
    if (children.includes(spouseId)) continue
    const spouseParents = structure.parentsOfPerson.get(spouseId) ?? []
    if (spouseParents.length === 0) continue
    if (!spouseParents.some((parent) => childParents.has(parent))) return true
  }
  return false
}

/** Reorder natal sibling clusters oldest→youngest left→right after other post-process passes. */
export function enforceSiblingBirthOrder(nodes: PositionedNode[], structure: FamilyStructure): void {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const clusters = [...rowClusters(nodes, structure).values()]

  for (const [, children] of structure.unionChildren) {
    if (children.length < 2) continue

    const childClusters: Array<{ childId: string; members: string[] }> = []
    const seen = new Set<string>()
    for (const childId of children) {
      const cluster = clusters.find((members) => members.includes(childId))
      if (!cluster) continue
      const key = [...cluster].sort().join('|')
      if (seen.has(key)) continue
      seen.add(key)
      childClusters.push({ childId, members: cluster })
    }
    if (childClusters.length < 2) continue

    childClusters.sort((a, b) => {
      const left = byId.get(a.childId)
      const right = byId.get(b.childId)
      if (!left || !right) return 0
      return comparePersons(sortKeyForNode(left), sortKeyForNode(right))
    })

    const spatialOrder = [...childClusters].sort(
      (a, b) => clusterInterval(nodes, a.members).left - clusterInterval(nodes, b.members).left,
    )
    const orderOk = spatialOrder.every((entry, index) => entry.childId === childClusters[index].childId)
    if (orderOk) continue
    if (children.some((childId) => (structure.childrenOfPerson.get(childId) ?? []).length > 0)) continue
    if (childClusters.some(({ childId }) => hasCrossFamilySpouse(childId, children, structure))) continue
    if (childClusters.length > 3) continue

    if (childClusters.length === 3) {
      const priorX = new Map(nodes.map((node) => [node.id, node.x]))
      const slots = spatialOrder.map((entry) => clusterInterval(nodes, entry.members).left)
      for (let i = 0; i < childClusters.length; i++) {
        shiftCluster(
          nodes,
          structure,
          childClusters[i],
          slots[i] - clusterInterval(nodes, childClusters[i].members).left,
        )
      }
      const rowY = byId.get(childClusters[0].childId)?.y ?? 0
      const rowPersons = nodes.filter(
        (node) => node.kind === 'person' && Math.abs(node.y - rowY) < 0.5,
      )
      if (hasRowOverlap(rowPersons)) {
        for (const node of nodes) {
          const x = priorX.get(node.id)
          if (x != null) node.x = x
        }
      }
      continue
    }

    for (let pass = 0; pass < childClusters.length; pass++) {
      let changed = false
      for (let i = 0; i < childClusters.length - 1; i++) {
        const older = childClusters[i]
        const younger = childClusters[i + 1]
        const olderInt = clusterInterval(nodes, older.members)
        const youngerInt = clusterInterval(nodes, younger.members)
        if (youngerInt.left >= olderInt.right + SIBLING_GAP - 0.5) continue

        const olderWidth = olderInt.right - olderInt.left
        const youngerWidth = youngerInt.right - youngerInt.left
        if (Math.abs(olderWidth - youngerWidth) < 0.5 && olderInt.left > youngerInt.left + 0.5) {
          swapClusterPositions(nodes, structure, older, younger)
          changed = true
          continue
        }

        const needYoungerRight = olderInt.right + SIBLING_GAP - youngerInt.left
        const targetOlderLeft = youngerInt.left - SIBLING_GAP - olderWidth
        const needOlderLeft = olderInt.left - targetOlderLeft

        const youngerMoving = downwardSet([younger.childId], structure)
        for (const member of younger.members) youngerMoving.add(member)
        const olderMoving = downwardSet([older.childId], structure)
        for (const member of older.members) olderMoving.add(member)

        const allowedYoungerRight = maxShiftToward(nodes, youngerMoving, 1, structure)
        const allowedOlderLeft = maxShiftToward(nodes, olderMoving, -1, structure)

        if (needOlderLeft > 0.5 && allowedOlderLeft >= needOlderLeft - 0.5) {
          shiftCluster(nodes, structure, older, -Math.min(needOlderLeft, allowedOlderLeft))
          changed = true
        } else if (needYoungerRight > 0.5 && allowedYoungerRight >= needYoungerRight - 0.5) {
          shiftCluster(nodes, structure, younger, Math.min(needYoungerRight, allowedYoungerRight))
          changed = true
        }
      }
      if (!changed) break
    }
  }
}

export function packPedigreeRows(nodes: PositionedNode[], structure: FamilyStructure): PositionedNode[] {
  const mutable = nodes.map((node) => ({ ...node }))
  orientCouplesTowardNatalSiblings(mutable, structure)
  nudgeIsolatedParents(mutable, structure)
  nudgeParentsToCoreChildren(mutable, structure)
  centerUnionsOnCoreChildren(mutable, structure)
  tightenNatalGaps(mutable, structure)
  separateCousinClusters(mutable, structure)
  resolveOverlaps(mutable, structure)
  compactEmptyVerticalGaps(mutable)
  enforceSiblingBirthOrder(mutable, structure)
  resolveOverlaps(mutable, structure)
  return compactEmptyVerticalGaps(mutable)
}
