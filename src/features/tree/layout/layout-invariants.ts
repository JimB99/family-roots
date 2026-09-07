import type { Branch } from './branch-tree'
import { hasCousinColumnChildren } from './column-branch-layout'
import { branchSubtreeIds } from './branch-shift'
import type { PositionedLayout, PositionedNode } from './layout-model'
import { downwardSet } from './compact-subtrees'
import {
  coupleCenteringOffset,
  edgeToEdgeGap,
  hasRowOverlap,
  maxEmptyVerticalBand,
  personCenter,
  totalWidth,
} from './layout-metrics'
import { compareSiblingLayoutOrder, twoParentUnionIdOnRow } from './layout-order'
import { CENTER_TOL_LARGE, CENTER_TOL_UNIT, COUPLE_W, FAMILY_GAP, PERSON_W, ROW_GAP, SIBLING_GAP } from './layout-spacing'
import type { FamilyStructure } from './family-structure'

export type CenteringException = 'multiUnionPerson' | 'noParents' | 'collapsedUnion' | 'joinChildren'

export interface NatalGap {
  unionId: string
  leftIds: string[]
  rightIds: string[]
  gap: number
  widened: boolean
}

export interface CousinGap {
  leftIds: string[]
  rightIds: string[]
  gap: number
  tooTight: boolean
}

export interface CenteringError {
  unionId: string
  error: number
  exception: CenteringException | null
  parentIds: string[]
  childIds: string[]
}

export interface LayoutReport {
  overlapRows: number[]
  spouseRowMismatches: string[]
  childAboveParent: Array<{ childId: string; parentId: string }>
  unionPlacementIssues: string[]
  natalGaps: NatalGap[]
  cousinGaps: CousinGap[]
  centering: CenteringError[]
  maxEmptyVerticalBand: number
  width: number
  personCount: number
  unionCount: number
  widestGenerationCount: number
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

function personNodes(layout: PositionedLayout): PositionedNode[] {
  return layout.nodes.filter((node) => node.kind === 'person')
}

function nodeById(layout: PositionedLayout): Map<string, PositionedNode> {
  return new Map(layout.nodes.map((node) => [node.id, node]))
}

export function toPersonId(layout: PositionedLayout, nodeId: string): string | undefined {
  const node = layout.nodes.find((entry) => entry.id === nodeId)
  if (node?.personId) return node.personId
  if (nodeId.startsWith('person:')) return nodeId.slice('person:'.length)
  return undefined
}

function sameRow(a: PositionedNode, b: PositionedNode): boolean {
  return Math.abs(a.y - b.y) < 0.5
}

function rowClusters(layout: PositionedLayout, structure: FamilyStructure): Map<string, string[]> {
  const persons = personNodes(layout)
  const byId = nodeById(layout)
  const dsu = new DisjointSet()
  for (const node of persons) dsu.find(node.id)

  for (const [a, b] of structure.spouseLinks) {
    const left = byId.get(a)
    const right = byId.get(b)
    if (!left || !right || left.kind !== 'person' || right.kind !== 'person') continue
    if (!sameRow(left, right)) continue
    dsu.union(a, b)
  }

  for (const parents of structure.unionParents.values()) {
    const present = parents.map((id) => byId.get(id)).filter((node): node is PositionedNode => node != null)
    if (present.length < 2) continue
    const y = present[0].y
    if (!present.every((node) => Math.abs(node.y - y) < 0.5)) continue
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

function clusterInterval(layout: PositionedLayout, memberIds: string[]): { left: number; right: number } {
  let left = Infinity
  let right = -Infinity
  for (const id of memberIds) {
    const node = layout.nodes.find((entry) => entry.id === id)
    if (!node) continue
    left = Math.min(left, node.x)
    right = Math.max(right, node.x + node.width)
  }
  return { left, right }
}

function descendantColumnCenter(
  layout: PositionedLayout,
  childIds: string[],
  structure: FamilyStructure,
): number | null {
  const byId = nodeById(layout)
  const column = new Set<string>()
  for (const id of childIds) {
    column.add(id)
    for (const desc of downwardSet([id], structure)) column.add(desc)
  }
  let left = Infinity
  let right = -Infinity
  for (const id of column) {
    const node = byId.get(id)
    if (!node) continue
    left = Math.min(left, node.x)
    right = Math.max(right, node.x + node.width)
  }
  if (!Number.isFinite(left)) return null
  return (left + right) / 2
}

function unionCenteringError(
  layout: PositionedLayout,
  parentPersonIds: string[],
  childPersonIds: string[],
  structure: FamilyStructure,
): number {
  const byId = nodeById(layout)
  const parents = parentPersonIds
    .map((id) => byId.get(id))
    .filter((node): node is PositionedNode => node != null)
  if (parents.length === 0 || childPersonIds.length === 0) return 0

  const parentMid = parents.reduce((sum, node) => sum + personCenter(node), 0) / parents.length
  const hasDescendants = childPersonIds.some((id) =>
    [...downwardSet([id], structure)].some((desc) => desc !== id && byId.has(desc)),
  )
  if (hasDescendants) {
    const columnCenter = descendantColumnCenter(layout, childPersonIds, structure)
    if (columnCenter != null) return Math.abs(parentMid - columnCenter)
  }
  return coupleCenteringOffset(layout, parentPersonIds, childPersonIds) ?? 0
}

function parentUnionsOfCluster(
  memberIds: string[],
  structure: FamilyStructure,
): Set<string> {
  const unions = new Set<string>()
  for (const id of memberIds) {
    for (const [unionId, children] of structure.unionChildren) {
      if (children.includes(id)) unions.add(unionId)
    }
  }
  return unions
}

function shareParentPerson(leftIds: string[], rightIds: string[], structure: FamilyStructure): boolean {
  const leftParents = new Set<string>()
  for (const id of leftIds) {
    for (const parent of structure.parentsOfPerson.get(id) ?? []) leftParents.add(parent)
  }
  for (const id of rightIds) {
    for (const parent of structure.parentsOfPerson.get(id) ?? []) {
      if (leftParents.has(parent)) return true
    }
  }
  return false
}

function childBearingUnionCount(personId: string, structure: FamilyStructure): number {
  let count = 0
  for (const [unionId, parents] of structure.unionParents) {
    if (!parents.includes(personId)) continue
    if ((structure.unionChildren.get(unionId) ?? []).length > 0) count += 1
  }
  return count
}

function isJoinPerson(layout: PositionedLayout, structure: FamilyStructure, personId: string): boolean {
  const byId = nodeById(layout)
  const node = byId.get(personId)
  if (!node) return false
  const ownParents = new Set(structure.parentsOfPerson.get(personId) ?? [])
  const spouses: string[] = []
  for (const [a, b] of structure.spouseLinks) {
    if (a === personId) spouses.push(b)
    else if (b === personId) spouses.push(a)
  }
  for (const parents of structure.unionParents.values()) {
    if (!parents.includes(personId)) continue
    for (const parent of parents) {
      if (parent !== personId) spouses.push(parent)
    }
  }
  for (const spouseId of spouses) {
    const spouse = byId.get(spouseId)
    if (!spouse || !sameRow(node, spouse)) continue
    for (const [otherId, otherParents] of structure.parentsOfPerson) {
      if (otherId === spouseId || otherId === personId) continue
      if (!otherParents.some((parent) => (structure.parentsOfPerson.get(spouseId) ?? []).includes(parent))) {
        continue
      }
      const other = byId.get(otherId)
      if (!other || !sameRow(spouse, other)) continue
      const sharesBlood = otherParents.some((parent) => ownParents.has(parent))
      if (!sharesBlood) return true
    }
  }
  return false
}

export function analyzeLayout(layout: PositionedLayout, structure: FamilyStructure): LayoutReport {
  const persons = personNodes(layout)
  const byId = nodeById(layout)
  const byY = new Map<number, PositionedNode[]>()
  for (const node of persons) {
    const list = byY.get(node.y) ?? []
    list.push(node)
    byY.set(node.y, list)
  }

  const overlapRows: number[] = []
  let widestGenerationCount = 0
  for (const [y, row] of byY) {
    widestGenerationCount = Math.max(widestGenerationCount, row.length)
    if (hasRowOverlap(row)) overlapRows.push(y)
  }

  const spouseRowMismatches: string[] = []
  for (const [unionId, parents] of structure.unionParents) {
    const nodes = parents.map((id) => byId.get(id)).filter((node): node is PositionedNode => node != null)
    if (nodes.length < 2) continue
    const y = nodes[0].y
    if (!nodes.every((node) => Math.abs(node.y - y) < 0.5)) spouseRowMismatches.push(unionId)
  }

  const childAboveParent: Array<{ childId: string; parentId: string }> = []
  for (const [childId, parents] of structure.parentsOfPerson) {
    const child = byId.get(childId)
    if (!child) continue
    for (const parentId of parents) {
      const parent = byId.get(parentId)
      if (!parent) continue
      if (child.y <= parent.y + 0.5) childAboveParent.push({ childId, parentId })
    }
  }

  const unionPlacementIssues: string[] = []
  for (const node of layout.nodes) {
    if (node.kind !== 'union') continue
    const parents = (structure.unionParents.get(node.id) ?? [])
      .map((id) => byId.get(id))
      .filter((entry): entry is PositionedNode => entry != null)
    const children = (structure.unionChildren.get(node.id) ?? [])
      .map((id) => byId.get(id))
      .filter((entry): entry is PositionedNode => entry != null)
    if (parents.length === 0 && children.length === 0) continue
    if (parents.length > 0 && node.y + node.height <= parents[0].y + 0.5) {
      unionPlacementIssues.push(node.id)
    }
    if (children.length > 0 && node.y >= children[0].y - 0.5) {
      unionPlacementIssues.push(node.id)
    }
  }

  const clusters = rowClusters(layout, structure)
  const clustersByRow = new Map<number, string[][]>()
  for (const members of clusters.values()) {
    const first = byId.get(members[0])
    if (!first) continue
    const list = clustersByRow.get(first.y) ?? []
    list.push(members)
    clustersByRow.set(first.y, list)
  }

  const natalGaps: NatalGap[] = []
  for (const [unionId, children] of structure.unionChildren) {
    if (children.length < 2) continue
    const childClusters = new Map<string, string[]>()
    for (const childId of children) {
      const node = byId.get(childId)
      if (!node) continue
      let cluster: string[] | undefined
      for (const members of clusters.values()) {
        if (members.includes(childId)) {
          cluster = members
          break
        }
      }
      if (!cluster) continue
      const key = [...cluster].sort().join('|')
      childClusters.set(key, cluster)
    }
    const ordered = [...childClusters.values()].sort((a, b) => {
      const ia = clusterInterval(layout, a)
      const ib = clusterInterval(layout, b)
      return ia.left - ib.left
    })
    for (let i = 1; i < ordered.length; i++) {
      const left = clusterInterval(layout, ordered[i - 1])
      const right = clusterInterval(layout, ordered[i])
      const gap = right.left - left.right
      natalGaps.push({
        unionId,
        leftIds: ordered[i - 1],
        rightIds: ordered[i],
        gap,
        widened: gap > SIBLING_GAP + 1,
      })
    }
  }

  const cousinGaps: CousinGap[] = []
  for (const row of clustersByRow.values()) {
    const ordered = [...row].sort((a, b) => clusterInterval(layout, a).left - clusterInterval(layout, b).left)
    for (let i = 1; i < ordered.length; i++) {
      const leftUnions = parentUnionsOfCluster(ordered[i - 1], structure)
      const rightUnions = parentUnionsOfCluster(ordered[i], structure)
      const sharedUnion = [...leftUnions].some((unionId) => rightUnions.has(unionId))
      if (sharedUnion || shareParentPerson(ordered[i - 1], ordered[i], structure)) continue
      if (leftUnions.size === 0 && rightUnions.size === 0) continue
      const left = clusterInterval(layout, ordered[i - 1])
      const right = clusterInterval(layout, ordered[i])
      const gap = right.left - left.right
      const joined = [...downwardSet(ordered[i - 1], structure)].some((id) =>
        downwardSet(ordered[i], structure).has(id),
      )
      cousinGaps.push({
        leftIds: ordered[i - 1],
        rightIds: ordered[i],
        gap,
        tooTight: !joined && gap >= 0 && gap < FAMILY_GAP - 1,
      })
    }
  }

  const centering: CenteringError[] = []
  for (const [unionId, children] of structure.unionChildren) {
    const parents = structure.unionParents.get(unionId) ?? []
    const parentPersonIds = parents.map((id) => toPersonId(layout, id)).filter((id): id is string => id != null)
    const childPersonIds = children.map((id) => toPersonId(layout, id)).filter((id): id is string => id != null)
    if (childPersonIds.length === 0) {
      centering.push({
        unionId,
        error: 0,
        exception: 'collapsedUnion',
        parentIds: parentPersonIds,
        childIds: childPersonIds,
      })
      continue
    }
    if (parents.length === 0) {
      centering.push({
        unionId,
        error: 0,
        exception: 'noParents',
        parentIds: parentPersonIds,
        childIds: childPersonIds,
      })
      continue
    }
    const coreChildIds = children.filter((id) => !isJoinPerson(layout, structure, id))
    const measured = coreChildIds.length > 0 ? coreChildIds : children
    const measuredPersonIds = measured.map((id) => toPersonId(layout, id)).filter((id): id is string => id != null)
    const error = unionCenteringError(layout, parentPersonIds, measuredPersonIds, structure)
    const multi = parents.some((parentId) => childBearingUnionCount(parentId, structure) > 1)
    const joins = coreChildIds.length > 0 && coreChildIds.length < children.length
    centering.push({
      unionId,
      error,
      exception: multi ? 'multiUnionPerson' : joins ? 'joinChildren' : null,
      parentIds: parentPersonIds,
      childIds: measuredPersonIds,
    })
  }
  centering.sort((a, b) => b.error - a.error)

  return {
    overlapRows,
    spouseRowMismatches,
    childAboveParent,
    unionPlacementIssues: [...new Set(unionPlacementIssues)],
    natalGaps,
    cousinGaps,
    centering,
    maxEmptyVerticalBand: maxEmptyVerticalBand(layout),
    width: totalWidth(layout),
    personCount: persons.length,
    unionCount: [...structure.unionParents.keys()].length,
    widestGenerationCount,
  }
}

export function widthBudget(report: LayoutReport): number {
  const formula = Math.max(
    report.widestGenerationCount * (PERSON_W + SIBLING_GAP) + FAMILY_GAP * Math.max(1, report.unionCount),
    report.personCount * 80,
    400,
  )
  return formula
}

export function formatReport(report: LayoutReport): string {
  const worst = report.centering.slice(0, 10).map((entry) => {
    const tag = entry.exception ? ` [${entry.exception}]` : ''
    return `${entry.unionId}: ${Math.round(entry.error)}px${tag}`
  })
  const widened = report.natalGaps.filter((gap) => gap.widened)
  const tight = report.cousinGaps.filter((gap) => gap.tooTight)
  return [
    `width=${Math.round(report.width)} emptyBand=${Math.round(report.maxEmptyVerticalBand)}`,
    `overlaps=${report.overlapRows.length} spouseRow=${report.spouseRowMismatches.length}`,
    `childAboveParent=${report.childAboveParent.length} unionY=${report.unionPlacementIssues.length}`,
    `widenedNatal=${widened.length} tightCousins=${tight.length}`,
    worst.length > 0 ? `worstCentering: ${worst.join('; ')}` : 'worstCentering: none',
  ].join('\n')
}

export interface InvariantOptions {
  centerTol?: number
  maxWidth?: number
  maxEmptyBand?: number
  allowWidenedNatal?: boolean
  minCousinGap?: number
}

export function invariantFailures(report: LayoutReport, options: InvariantOptions = {}): string[] {
  const centerTol = options.centerTol ?? CENTER_TOL_UNIT
  const maxWidth = options.maxWidth ?? Math.max(widthBudget(report), 40_000)
  const maxEmptyBand = options.maxEmptyBand ?? 3 * PERSON_W
  const failures: string[] = []

  if (report.overlapRows.length > 0) failures.push(`row overlaps at y=${report.overlapRows.join(',')}`)
  if (report.spouseRowMismatches.length > 0) {
    failures.push(`spouses not on same row: ${report.spouseRowMismatches.join(',')}`)
  }
  if (report.childAboveParent.length > 0) {
    failures.push(`child not below parent: ${report.childAboveParent[0].childId}`)
  }
  if (report.unionPlacementIssues.length > 0) {
    failures.push(`union not between generations: ${report.unionPlacementIssues.join(',')}`)
  }
  if (!options.allowWidenedNatal) {
    const widened = report.natalGaps.filter((gap) => gap.widened)
    if (widened.length > 0) {
      failures.push(
        `natal siblings ${widened[0].gap.toFixed(0)}px apart (union ${widened[0].unionId})`,
      )
    }
  }
  const minCousinGap = options.minCousinGap ?? FAMILY_GAP - 1
  const tight = report.cousinGaps.filter((gap) => gap.tooTight && gap.gap < minCousinGap)
  if (tight.length > 0) {
    failures.push(`cousin gap ${tight[0].gap.toFixed(0)}px < FAMILY_GAP`)
  }
  for (const entry of report.centering) {
    if (entry.exception === 'collapsedUnion' || entry.exception === 'noParents' || entry.exception === 'joinChildren') continue
    const limit = entry.exception === 'multiUnionPerson' ? Math.max(COUPLE_W, centerTol) : centerTol
    if (entry.error > limit) {
      failures.push(`${entry.unionId} centering ${Math.round(entry.error)}px > ${limit}`)
    }
  }
  if (report.maxEmptyVerticalBand > maxEmptyBand) {
    failures.push(`empty vertical band ${Math.round(report.maxEmptyVerticalBand)}px > ${maxEmptyBand}`)
  }
  if (report.width > maxWidth) {
    failures.push(`width ${Math.round(report.width)}px > ${maxWidth}`)
  }
  return failures
}

export function siblingOrderViolations(layout: PositionedLayout, structure: FamilyStructure): string[] {
  const byId = nodeById(layout)
  const clusters = [...rowClusters(layout, structure).values()]
  const violations: string[] = []

  for (const [unionId, children] of structure.unionChildren) {
    const present = children.filter((id) => byId.get(id)?.kind === 'person')
    if (present.length < 2) continue

    const parentIds = structure.unionParents.get(unionId) ?? []
    const parentRowMembers = parentIds
      .map((id) => byId.get(id))
      .filter((node): node is PositionedNode => node != null)
      .sort((a, b) => a.x - b.x)
      .map((node) => node.id)
    const fallbackMembers = parentIds.length > 0 ? parentIds : parentRowMembers

    const expected = [...present].sort((a, b) => {
      const left = byId.get(a)!
      const right = byId.get(b)!
      return compareSiblingLayoutOrder(left, right, structure, parentRowMembers.length > 0 ? parentRowMembers : fallbackMembers)
    })

    const clusterLeft = (childId: string): number => {
      const cluster = clusters.find((members) => members.includes(childId))
      if (cluster) return clusterInterval(layout, cluster).left
      return byId.get(childId)?.x ?? 0
    }
    const actual = [...present].sort((a, b) => clusterLeft(a) - clusterLeft(b) || a.localeCompare(b))
    if (actual.some((id, index) => id !== expected[index])) {
      violations.push(`${unionId}: ${actual.join(',')} vs ${expected.join(',')}`)
    }
  }
  return violations
}

/** Children from different two-parent unions must not interleave on the same row. */
export function cousinGroupOrderViolations(layout: PositionedLayout, structure: FamilyStructure): string[] {
  const byId = nodeById(layout)
  const rows = new Map<number, PositionedNode[]>()
  for (const node of personNodes(layout)) {
    const row = Math.round(node.y)
    const list = rows.get(row) ?? []
    list.push(node)
    rows.set(row, list)
  }

  const violations: string[] = []
  for (const rowNodes of rows.values()) {
    const parentIds = new Set<string>()
    for (const node of rowNodes) {
      for (const parent of structure.parentsOfPerson.get(node.id) ?? []) parentIds.add(parent)
    }
    if (parentIds.size === 0) continue

    const parentRowMembers = [...parentIds]
      .map((id) => byId.get(id))
      .filter((node): node is PositionedNode => node != null)
      .sort((a, b) => a.x - b.x)
      .map((node) => node.id)
    if (parentRowMembers.length === 0) continue

    const grouped = new Map<string, string[]>()
    for (const node of rowNodes) {
      const unionId = twoParentUnionIdOnRow(node.id, parentRowMembers, structure)
      if (!unionId) continue
      const list = grouped.get(unionId) ?? []
      list.push(node.id)
      grouped.set(unionId, list)
    }
    if (grouped.size <= 1) continue

    const unionOrder = [...grouped.keys()].sort((left, right) => {
      const leftChild = grouped.get(left)![0]!
      const rightChild = grouped.get(right)![0]!
      return (
        compareSiblingLayoutOrder(byId.get(leftChild)!, byId.get(rightChild)!, structure, parentRowMembers) ||
        left.localeCompare(right)
      )
    })

    const expected: string[] = []
    for (const unionId of unionOrder) {
      const children = grouped.get(unionId)!
      const sorted = [...children].sort((a, b) =>
        compareSiblingLayoutOrder(byId.get(a)!, byId.get(b)!, structure, parentRowMembers),
      )
      expected.push(...sorted)
    }

    const actual = [...rowNodes]
      .filter((node) => twoParentUnionIdOnRow(node.id, parentRowMembers, structure))
      .sort((a, b) => a.x - b.x)
      .map((node) => node.id)
    if (actual.some((id, index) => id !== expected[index])) {
      violations.push(`row y=${rowNodes[0]?.y}: ${actual.join(',')} vs ${expected.join(',')}`)
    }
  }
  return violations
}

export function coupleCenteringError(
  layout: PositionedLayout,
  _structure: FamilyStructure,
  parentPersonIds: string[],
  childPersonIds: string[],
): number {
  const find = (personId: string) => layout.nodes.find((entry) => entry.personId === personId)
  const parents = parentPersonIds.map(find).filter((entry): entry is PositionedNode => entry != null)
  const children = childPersonIds.map(find).filter((entry): entry is PositionedNode => entry != null)
  if (parents.length === 0 || children.length === 0) return 0
  const parentMid = parents.reduce((sum, entry) => sum + personCenter(entry), 0) / parents.length
  const childMid = children.reduce((sum, entry) => sum + personCenter(entry), 0) / children.length
  return Math.abs(parentMid - childMid)
}

export function spouseGap(layout: PositionedLayout, leftPersonId: string, rightPersonId: string): number | null {
  const left = layout.nodes.find((node) => node.personId === leftPersonId)
  const right = layout.nodes.find((node) => node.personId === rightPersonId)
  if (!left || !right) return null
  return edgeToEdgeGap(left, right)
}

export function unitCenterTol(): number {
  return CENTER_TOL_UNIT
}

export function largeCenterTol(): number {
  return CENTER_TOL_LARGE
}

export function personMid(layout: PositionedLayout, personId: string): number {
  const node = layout.nodes.find((entry) => entry.personId === personId)
  if (!node) throw new Error(`missing person ${personId}`)
  return personCenter(node)
}

function branchColumnIntervalAtRow(
  layout: PositionedLayout,
  branch: Branch,
  structure: FamilyStructure,
  childRowY: number,
): { left: number; right: number } | null {
  const onRow = [...branchSubtreeIds(branch, structure)]
    .map((id) => layout.nodes.find((node) => node.id === id))
    .filter((node): node is PositionedNode => node != null && Math.abs(node.y - childRowY) < 0.5)
  if (onRow.length === 0) return null
  return {
    left: Math.min(...onRow.map((node) => node.x)),
    right: Math.max(...onRow.map((node) => node.x + node.width)),
  }
}

function walkBranches(branch: Branch, visit: (entry: Branch) => void) {
  visit(branch)
  for (const child of branch.childBranches) walkBranches(child, visit)
}

function childRowY(branch: Branch, layout: PositionedLayout): number {
  const personHeight = layout.nodes.find((node) => node.kind === 'person')?.height ?? 92
  return (branch.row + 1) * (personHeight + ROW_GAP)
}

/** Adjacent cousin branch columns must not overlap and must respect FAMILY_GAP. */
export function branchColumnViolations(
  layout: PositionedLayout,
  branches: Branch[],
  structure: FamilyStructure,
): string[] {
  const violations: string[] = []

  function checkAdjacentColumns(siblings: Branch[], parent: Branch | 'forest') {
    if (parent !== 'forest' && hasCousinColumnChildren(parent, structure)) {
      const withChildren = siblings.filter((branch) => branch.directChildIds.length > 0)
      for (let i = 0; i < withChildren.length - 1; i++) {
        const left = withChildren[i]!
        const right = withChildren[i + 1]!
        const rowY = childRowY(left, layout)
        const leftNodes = left.directChildIds
          .map((id) => layout.nodes.find((node) => node.id === id))
          .filter((node): node is PositionedNode => node != null && Math.abs(node.y - rowY) < 0.5)
        const rightNodes = right.directChildIds
          .map((id) => layout.nodes.find((node) => node.id === id))
          .filter((node): node is PositionedNode => node != null && Math.abs(node.y - rowY) < 0.5)
        if (leftNodes.length === 0 || rightNodes.length === 0) continue
        const leftBox = {
          left: Math.min(...leftNodes.map((node) => node.x)),
          right: Math.max(...leftNodes.map((node) => node.x + node.width)),
        }
        const rightBox = {
          left: Math.min(...rightNodes.map((node) => node.x)),
          right: Math.max(...rightNodes.map((node) => node.x + node.width)),
        }
        const gap = rightBox.left - leftBox.right
        if (gap + 0.5 < FAMILY_GAP) {
          violations.push(
            `${parent.id}: ${left.id}→${right.id} column gap ${Math.round(gap)}px < ${FAMILY_GAP}px`,
          )
        }
      }
    }
    for (const branch of siblings) {
      if (branch.childBranches.length > 1) {
        checkAdjacentColumns(branch.childBranches, branch)
      }
    }
  }

  checkAdjacentColumns(branches, 'forest')

  for (const branch of branches) {
    walkBranches(branch, (entry) => {
      if (entry.childBranches.length < 2) return
      const rowY = childRowY(entry, layout)
      const columns = entry.childBranches
        .filter((b) => b.directChildIds.length > 0)
        .map((b) => ({ branch: b, box: branchColumnIntervalAtRow(layout, b, structure, rowY) }))
        .filter((entry): entry is { branch: Branch; box: { left: number; right: number } } => entry.box != null)
      const reserved = new Set<string>()
      for (const child of entry.childBranches) {
        for (const id of branchSubtreeIds(child, structure)) reserved.add(id)
      }
      const directChildren = new Set(entry.directChildIds)
      for (let i = 0; i < columns.length - 1; i++) {
        const leftBox = columns[i]!.box
        const rightBox = columns[i + 1]!.box
        for (const node of personNodes(layout)) {
          if (Math.abs(node.y - rowY) > 0.5) continue
          if (reserved.has(node.id)) continue
          if (directChildren.has(node.id)) continue
          if (node.x + node.width > leftBox.right + 0.5 && node.x < rightBox.left - 0.5) {
            violations.push(
              `${entry.id}: foreign node ${node.personId ?? node.id} between ${columns[i]!.branch.id} and ${columns[i + 1]!.branch.id}`,
            )
          }
        }
      }
    })
  }

  return violations
}

/** Top-level cousin branch subtrees must not overlap on any shared row. */
export function topLevelForestBranchRowOverlapViolations(
  layout: PositionedLayout,
  branches: Branch[],
  structure: FamilyStructure,
): string[] {
  const top = branches.filter((branch) => branch.directChildIds.length > 0)
  if (top.length < 2) return []

  const rowYs = new Set(personNodes(layout).map((node) => node.y))
  const violations: string[] = []

  for (const y of rowYs) {
    for (let i = 0; i < top.length - 1; i++) {
      for (let j = i + 1; j < top.length; j++) {
        const left = top[i]!
        const right = top[j]!
        const leftBox = branchColumnIntervalAtRow(layout, left, structure, y)
        const rightBox = branchColumnIntervalAtRow(layout, right, structure, y)
        if (!leftBox || !rightBox) continue
        const overlap = Math.min(leftBox.right, rightBox.right) - Math.max(leftBox.left, rightBox.left)
        if (overlap > 0.5) {
          violations.push(
            `y=${y}: ${left.id} (${Math.round(leftBox.left)}–${Math.round(leftBox.right)}) overlaps ${right.id} (${Math.round(rightBox.left)}–${Math.round(rightBox.right)}) by ${Math.round(overlap)}px`,
          )
        }
      }
    }
  }

  return violations
}
