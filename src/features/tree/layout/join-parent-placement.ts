/**
 * Join-parent placement rules (canvas scenarios 1–8).
 *
 * O(n) per affected row: one classification pass, one pack pass, one parent pass.
 * When this module handles a row, it supersedes generic centerParentGenerationRow gap-shifting
 * for that component's join rows.
 */
import { crossFamilyCouplesAtRow } from './branch-tree'
import { downwardSet } from './compact-subtrees'
import type { FamilyStructure } from './family-structure'
import type { PositionedNode } from './layout-model'
import { comparePersons } from './layout-order'
import { FAMILY_GAP, NODE_GAP, PERSON_H, ROW_GAP, SIBLING_GAP } from './layout-spacing'

export type JoinParentMode =
  | 'standard-two-runs'
  | 'single-natal-run'
  | 'symmetric-single'
  | 'symmetric-dual'
  | 'extended-symmetric'
  | 'bride-anchored'
  | 'extended-joint-young'
  | 'extended-joint-old'

interface Interval {
  left: number
  right: number
}

interface NatalRun {
  key: string
  ids: string[]
}

interface JoinRowAnalysis {
  row: number
  mode: JoinParentMode
  joinA: string
  joinB: string
  brideId: string
  groomId: string
  natalRuns: NatalRun[]
  leftRun: NatalRun | null
  rightRun: NatalRun | null
  singleRun: NatalRun | null
  sharedChildIds: string[]
  bSideSiblingIds: string[]
}

function sortKey(node: PositionedNode) {
  return { birthYear: node.birthYear ?? Number.POSITIVE_INFINITY, id: node.id }
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

function translateIds(nodes: PositionedNode[], ids: Set<string>, dx: number) {
  if (Math.abs(dx) < 0.5) return
  for (const node of nodes) {
    if (ids.has(node.id)) node.x += dx
  }
}

function parentKey(id: string, structure: FamilyStructure): string {
  return [...(structure.parentsOfPerson.get(id) ?? [])].sort().join('|')
}

function natalSiblings(id: string, rowIds: Set<string>, structure: FamilyStructure): string[] {
  const key = parentKey(id, structure)
  if (key === '') return []
  return [...rowIds].filter((rowId) => rowId !== id && parentKey(rowId, structure) === key)
}

function isMiddleChild(
  id: string,
  rowIds: Set<string>,
  structure: FamilyStructure,
  nodeById: Map<string, PositionedNode>,
): boolean {
  const birth = nodeById.get(id)?.birthYear ?? Number.POSITIVE_INFINITY
  const siblings = natalSiblings(id, rowIds, structure)
  if (siblings.length === 0) return false
  const hasOlder = siblings.some((sib) => (nodeById.get(sib)?.birthYear ?? Infinity) < birth)
  const hasYounger = siblings.some((sib) => (nodeById.get(sib)?.birthYear ?? -Infinity) > birth)
  return hasOlder && hasYounger
}

function coupleChainWidth(idA: string, idB: string, nodeById: Map<string, PositionedNode>): number {
  const nodeA = nodeById.get(idA)
  const nodeB = nodeById.get(idB)
  if (!nodeA || !nodeB) return 0
  return nodeA.width + NODE_GAP + nodeB.width
}

function placeStrangerCouplesBlockCentered(
  coupleA: [string, string],
  coupleB: [string, string],
  center: number,
  y: number,
  nodeById: Map<string, PositionedNode>,
) {
  const widthA = coupleChainWidth(coupleA[0], coupleA[1], nodeById)
  const widthB = coupleChainWidth(coupleB[0], coupleB[1], nodeById)
  if (widthA === 0 || widthB === 0) return
  const blockLeft = center - (widthA + FAMILY_GAP + widthB) / 2
  placeChain(coupleA, blockLeft, y, nodeById)
  placeChain(coupleB, blockLeft + widthA + FAMILY_GAP, y, nodeById)
}

function placeSingleParentsBlockCentered(
  apId: string,
  bpId: string,
  center: number,
  y: number,
  nodeById: Map<string, PositionedNode>,
) {
  const ap = nodeById.get(apId)
  const bp = nodeById.get(bpId)
  if (!ap || !bp) return
  const blockLeft = center - (ap.width + FAMILY_GAP + bp.width) / 2
  ap.x = blockLeft
  ap.y = y
  bp.x = blockLeft + ap.width + FAMILY_GAP
  bp.y = y
}

function placeChain(memberIds: string[], left: number, y: number, nodeById: Map<string, PositionedNode>) {
  let cursor = left
  for (let i = 0; i < memberIds.length; i++) {
    const node = nodeById.get(memberIds[i]!)
    if (!node) continue
    node.x = cursor
    node.y = y
    cursor += node.width + (i < memberIds.length - 1 ? NODE_GAP : 0)
  }
}

function shiftJoinCouple(
  nodes: PositionedNode[],
  idA: string,
  idB: string,
  targetLeft: number,
  y: number,
  structure: FamilyStructure,
) {
  const moving = new Set<string>()
  for (const id of [idA, idB]) {
    moving.add(id)
    for (const descendant of downwardSet([id], structure)) moving.add(descendant)
  }
  const cluster = interval(nodes, [idA, idB])
  const dx = targetLeft - cluster.left
  if (Math.abs(dx) >= 0.5) translateIds(nodes, moving, dx)
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  placeChain([idA, idB], targetLeft, y, nodeById)
}

function shiftCluster(
  nodes: PositionedNode[],
  ids: string[],
  targetLeft: number,
  y: number,
  structure: FamilyStructure,
  nodeById: Map<string, PositionedNode>,
) {
  const cluster = interval(nodes, ids)
  const dx = targetLeft - cluster.left
  if (Math.abs(dx) < 0.5) {
    for (const id of ids) {
      const node = nodeById.get(id)
      if (node) node.y = y
    }
    return
  }
  const moving = new Set<string>()
  for (const id of ids) {
    moving.add(id)
    for (const descendant of downwardSet([id], structure)) moving.add(descendant)
  }
  translateIds(nodes, moving, dx)
  for (const id of ids) {
    const node = nodeById.get(id)
    if (node) node.y = y
  }
}

function sharedChildrenOfCouple(
  a: string,
  b: string,
  structure: FamilyStructure,
  generations: Map<string, number>,
  joinRow: number,
): string[] {
  const aChildren = new Set(structure.childrenOfPerson.get(a) ?? [])
  const bChildren = new Set(structure.childrenOfPerson.get(b) ?? [])
  return [...aChildren].filter(
    (child) => bChildren.has(child) && (generations.get(child) ?? 0) === joinRow + 1,
  )
}

function analyzeJoinRow(
  row: number,
  rowPersonIds: string[],
  structure: FamilyStructure,
  generations: Map<string, number>,
  nodeById: Map<string, PositionedNode>,
): JoinRowAnalysis | null {
  const couples = crossFamilyCouplesAtRow(rowPersonIds, structure)
  if (couples.length === 0) return null

  const rowSet = new Set(rowPersonIds)
  const joinPartnerIds = new Set(couples.flat())
  const natalMap = new Map<string, string[]>()
  for (const id of rowPersonIds) {
    const key = parentKey(id, structure)
    if (key === '') continue
    const list = natalMap.get(key) ?? []
    list.push(id)
    natalMap.set(key, list)
  }

  const natalRuns: NatalRun[] = [...natalMap.entries()]
    .map(([key, ids]) => ({
      key,
      ids: ids
        .filter((id) => !joinPartnerIds.has(id))
        .sort((a, b) => comparePersons(sortKey(nodeById.get(a)!), sortKey(nodeById.get(b)!))),
    }))
    .filter((run) => run.ids.length > 0)
    .sort((a, b) => {
      const aBirth = Math.min(...a.ids.map((id) => nodeById.get(id)?.birthYear ?? Infinity))
      const bBirth = Math.min(...b.ids.map((id) => nodeById.get(id)?.birthYear ?? Infinity))
      if (aBirth !== bBirth) return aBirth - bBirth
      return a.key < b.key ? -1 : 1
    })

  const [joinA, joinB] = couples.sort((left, right) =>
    comparePersons(sortKey(nodeById.get(left[0])!), sortKey(nodeById.get(right[0])!)),
  )[0]!
  const brideId = parentKey(joinA, structure) <= parentKey(joinB, structure) ? joinA : joinB
  const groomId = brideId === joinA ? joinB : joinA

  const onlyJoinOnRow = rowPersonIds.every((id) => joinPartnerIds.has(id))
  const joinAParents = structure.parentsOfPerson.get(joinA) ?? []
  const joinBParents = structure.parentsOfPerson.get(joinB) ?? []
  const sharedChildIds = sharedChildrenOfCouple(joinA, joinB, structure, generations, row)

  let mode: JoinParentMode

  if (onlyJoinOnRow) {
    if (joinAParents.length === 2 && joinBParents.length === 2) {
      mode = 'symmetric-dual'
    } else if (joinAParents.length <= 1 && joinBParents.length <= 1) {
      mode = 'symmetric-single'
    } else {
      return null
    }
  } else if (
    natalRuns.length >= 2 &&
    natalRuns.every((run) => run.ids.length >= 1) &&
    isMiddleChild(brideId, rowSet, structure, nodeById) &&
    !isMiddleChild(groomId, rowSet, structure, nodeById)
  ) {
    mode = 'bride-anchored'
  } else if (sharedChildIds.length > 0 && natalRuns.length >= 2) {
    const groomBirth = nodeById.get(groomId)?.birthYear ?? Infinity
    const bRun = natalRuns.find((run) => run.key === parentKey(groomId, structure))
    const groomOlderThanAllBroSibs = (bRun?.ids ?? []).every(
      (id) => groomBirth < (nodeById.get(id)?.birthYear ?? Infinity),
    )
    mode = groomOlderThanAllBroSibs ? 'extended-joint-old' : 'extended-joint-young'
  } else if (natalRuns.length === 1) {
    mode = 'single-natal-run'
  } else if (natalRuns.length >= 2) {
    mode = natalRuns.every((run) => run.ids.length === 1) ? 'extended-symmetric' : 'standard-two-runs'
  } else {
    return null
  }

  const bSideSiblingIds =
    natalRuns.find((run) => run.key === parentKey(groomId, structure))?.ids.filter((id) => id !== groomId) ?? []

  return {
    row,
    mode,
    joinA,
    joinB,
    brideId,
    groomId,
    natalRuns,
    leftRun: natalRuns.length >= 2 ? natalRuns[0]! : null,
    rightRun: natalRuns.length >= 2 ? natalRuns[natalRuns.length - 1]! : null,
    singleRun: natalRuns.length === 1 ? natalRuns[0]! : null,
    sharedChildIds,
    bSideSiblingIds,
  }
}

function parkJoinCoupleCoupleOnly(
  idA: string,
  idB: string,
  y: number,
  nodeById: Map<string, PositionedNode>,
) {
  placeChain([idA, idB], -50_000, y, nodeById)
}

function repositionJoinCoupleFromAnchor(
  nodes: PositionedNode[],
  idA: string,
  idB: string,
  anchorLeft: number,
  targetLeft: number,
  y: number,
  structure: FamilyStructure,
) {
  const moving = new Set<string>()
  for (const id of [idA, idB]) {
    moving.add(id)
    for (const descendant of downwardSet([id], structure)) moving.add(descendant)
  }
  const dx = targetLeft - anchorLeft
  if (Math.abs(dx) >= 0.5) translateIds(nodes, moving, dx)
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  placeChain([idA, idB], targetLeft, y, nodeById)
}

function isolateJoinCouple(
  analysis: JoinRowAnalysis,
  nodes: PositionedNode[],
  y: number,
  nodeById: Map<string, PositionedNode>,
): number {
  const anchorLeft = interval(nodes, [analysis.joinA, analysis.joinB]).left
  parkJoinCoupleCoupleOnly(analysis.joinA, analysis.joinB, y, nodeById)
  return anchorLeft
}

function packStandardTwoRuns(
  analysis: JoinRowAnalysis,
  nodes: PositionedNode[],
  y: number,
  structure: FamilyStructure,
  nodeById: Map<string, PositionedNode>,
) {
  const coupleAnchor = isolateJoinCouple(analysis, nodes, y, nodeById)
  const leftRun = analysis.leftRun!
  const rightRun = analysis.rightRun!
  let cursor = 0
  for (let i = 0; i < leftRun.ids.length; i++) {
    if (i > 0) cursor = interval(nodes, [leftRun.ids[i - 1]!]).right + SIBLING_GAP
    shiftCluster(nodes, [leftRun.ids[i]!], cursor, y, structure, nodeById)
    cursor = interval(nodes, [leftRun.ids[i]!]).right
  }
  cursor = interval(nodes, leftRun.ids).right + SIBLING_GAP
  repositionJoinCoupleFromAnchor(nodes, analysis.joinA, analysis.joinB, coupleAnchor, cursor, y, structure)
  cursor = interval(nodes, [analysis.joinA, analysis.joinB]).right + SIBLING_GAP
  for (let i = 0; i < rightRun.ids.length; i++) {
    if (i > 0) cursor = interval(nodes, [rightRun.ids[i - 1]!]).right + SIBLING_GAP
    shiftCluster(nodes, [rightRun.ids[i]!], cursor, y, structure, nodeById)
    cursor = interval(nodes, [rightRun.ids[i]!]).right
  }
}

function packSingleNatalRun(
  analysis: JoinRowAnalysis,
  nodes: PositionedNode[],
  y: number,
  structure: FamilyStructure,
  nodeById: Map<string, PositionedNode>,
) {
  shiftJoinCouple(nodes, analysis.joinA, analysis.joinB, 0, y, structure)
  const run = analysis.singleRun!
  let cursor = interval(nodes, [analysis.joinA, analysis.joinB]).right + SIBLING_GAP
  for (let i = 0; i < run.ids.length; i++) {
    if (i > 0) cursor = interval(nodes, [run.ids[i - 1]!]).right + SIBLING_GAP
    shiftCluster(nodes, [run.ids[i]!], cursor, y, structure, nodeById)
    cursor = interval(nodes, [run.ids[i]!]).right
  }
}

function packBrideAnchoredRow(
  analysis: JoinRowAnalysis,
  nodes: PositionedNode[],
  y: number,
  structure: FamilyStructure,
  nodeById: Map<string, PositionedNode>,
) {
  const coupleAnchor = isolateJoinCouple(analysis, nodes, y, nodeById)
  const brideKey = parentKey(analysis.brideId, structure)
  const groomKey = parentKey(analysis.groomId, structure)

  const brideSorted = nodes
    .filter(
      (node) =>
        node.kind === 'person' &&
        Math.abs(node.y - y) < 0.5 &&
        parentKey(node.id, structure) === brideKey,
    )
    .map((node) => node.id)
    .sort((a, b) => comparePersons(sortKey(nodeById.get(a)!), sortKey(nodeById.get(b)!)))

  const beforeA = brideSorted.filter(
    (id) =>
      id !== analysis.brideId &&
      (nodeById.get(id)?.birthYear ?? Infinity) < (nodeById.get(analysis.brideId)?.birthYear ?? Infinity),
  )
  const afterA = brideSorted.filter(
    (id) =>
      id !== analysis.brideId &&
      (nodeById.get(id)?.birthYear ?? -Infinity) >= (nodeById.get(analysis.brideId)?.birthYear ?? Infinity),
  )

  let cursor = 0
  for (const id of beforeA) {
    shiftCluster(nodes, [id], cursor, y, structure, nodeById)
    cursor = interval(nodes, [id]).right + SIBLING_GAP
  }
  repositionJoinCoupleFromAnchor(nodes, analysis.brideId, analysis.groomId, coupleAnchor, cursor, y, structure)
  cursor = interval(nodes, [analysis.brideId, analysis.groomId]).right + SIBLING_GAP
  for (const id of afterA) {
    shiftCluster(nodes, [id], cursor, y, structure, nodeById)
    cursor = interval(nodes, [id]).right + SIBLING_GAP
  }

  const manSiblings = nodes
    .filter(
      (node) =>
        node.kind === 'person' &&
        Math.abs(node.y - y) < 0.5 &&
        parentKey(node.id, structure) === groomKey &&
        node.id !== analysis.groomId,
    )
    .map((node) => node.id)
    .sort((a, b) => comparePersons(sortKey(nodeById.get(a)!), sortKey(nodeById.get(b)!)))

  if (manSiblings.length > 0) {
    cursor = cursor - SIBLING_GAP + FAMILY_GAP
    for (let i = 0; i < manSiblings.length; i++) {
      if (i > 0) cursor = interval(nodes, [manSiblings[i - 1]!]).right + SIBLING_GAP
      shiftCluster(nodes, [manSiblings[i]!], cursor, y, structure, nodeById)
      cursor = interval(nodes, [manSiblings[i]!]).right
    }
  }
}

function packJoinRow(
  analysis: JoinRowAnalysis,
  nodes: PositionedNode[],
  personHeight: number,
  structure: FamilyStructure,
  nodeById: Map<string, PositionedNode>,
) {
  const y = rowY(analysis.row, personHeight)
  switch (analysis.mode) {
    case 'standard-two-runs':
    case 'extended-symmetric':
    case 'extended-joint-young':
    case 'extended-joint-old':
      if (analysis.leftRun && analysis.rightRun) packStandardTwoRuns(analysis, nodes, y, structure, nodeById)
      break
    case 'single-natal-run':
      packSingleNatalRun(analysis, nodes, y, structure, nodeById)
      break
    case 'bride-anchored':
      packBrideAnchoredRow(analysis, nodes, y, structure, nodeById)
      break
    case 'symmetric-single':
    case 'symmetric-dual': {
      placeChain([analysis.joinA, analysis.joinB], 0, y, nodeById)
      break
    }
  }
}

function parentChainIds(parentKeyStr: string, structure: FamilyStructure): string[] {
  const entry = [...structure.parentsOfPerson.entries()].find(
    ([, parents]) => [...parents].sort().join('|') === parentKeyStr,
  )
  return entry ? [...entry[1]].sort() : []
}

function placeParentsOverSpan(
  parentIds: string[],
  childIds: string[],
  parentRow: number,
  nodes: PositionedNode[],
  personHeight: number,
  nodeById: Map<string, PositionedNode>,
) {
  if (parentIds.length === 0 || childIds.length === 0) return
  const childSpan = interval(nodes, childIds)
  const width = parentIds.reduce((sum, id, index) => {
    const node = nodeById.get(id)
    if (!node) return sum
    return sum + node.width + (index < parentIds.length - 1 ? NODE_GAP : 0)
  }, 0)
  placeChain(parentIds, centerOf(childSpan) - width / 2, rowY(parentRow, personHeight), nodeById)
}

function applyJointChildShift(
  analysis: JoinRowAnalysis,
  nodes: PositionedNode[],
  structure: FamilyStructure,
  generations: Map<string, number>,
) {
  if (analysis.sharedChildIds.length === 0) return
  const childRow = analysis.row + 1
  const bBroId = analysis.bSideSiblingIds[0]
  if (!bBroId) return

  const brideParentKey = parentKey(analysis.brideId, structure)
  const leftBlockIds = [
    ...nodes
      .filter(
        (node) =>
          node.kind === 'person' &&
          (generations.get(node.id) ?? 0) === childRow &&
          parentKey(node.id, structure) === brideParentKey &&
          !analysis.sharedChildIds.includes(node.id),
      )
      .map((node) => node.id),
    ...analysis.sharedChildIds,
  ]

  const bBroChildren = (structure.childrenOfPerson.get(bBroId) ?? []).filter(
    (id) => (generations.get(id) ?? 0) === childRow,
  )
  if (bBroChildren.length === 0) return

  const shift = interval(nodes, leftBlockIds).right + FAMILY_GAP - interval(nodes, bBroChildren).left
  if (shift <= 0) return

  const moving = downwardSet([bBroId], structure)
  moving.add(bBroId)
  translateIds(nodes, moving, shift)
}

function placeJoinParents(
  analysis: JoinRowAnalysis,
  nodes: PositionedNode[],
  structure: FamilyStructure,
  generations: Map<string, number>,
  personHeight: number,
  nodeById: Map<string, PositionedNode>,
) {
  const parentRow = analysis.row - 1
  if (parentRow < 0) return

  const abCenter = centerOf(interval(nodes, [analysis.joinA, analysis.joinB]))
  const parentY = rowY(parentRow, personHeight)

  switch (analysis.mode) {
    case 'symmetric-single': {
      const ap = parentChainIds(parentKey(analysis.joinA, structure), structure)[0]
      const bp = parentChainIds(parentKey(analysis.joinB, structure), structure)[0]
      if (ap && bp) placeSingleParentsBlockCentered(ap, bp, abCenter, parentY, nodeById)
      break
    }
    case 'symmetric-dual': {
      const aParents = parentChainIds(parentKey(analysis.joinA, structure), structure)
      const bParents = parentChainIds(parentKey(analysis.joinB, structure), structure)
      if (aParents.length === 2 && bParents.length === 2) {
        placeStrangerCouplesBlockCentered(
          [aParents[0]!, aParents[1]!],
          [bParents[0]!, bParents[1]!],
          abCenter,
          parentY,
          nodeById,
        )
      }
      break
    }
    case 'extended-symmetric': {
      for (const run of analysis.natalRuns) {
        const parents = parentChainIds(run.key, structure)
        const joinOnSide = run.key === parentKey(analysis.joinA, structure) ? analysis.joinA : analysis.joinB
        placeParentsOverSpan(parents, [...run.ids, joinOnSide], parentRow, nodes, personHeight, nodeById)
      }
      break
    }
    case 'extended-joint-young': {
      const brideParentKey = parentKey(analysis.brideId, structure)
      const groomParentKey = parentKey(analysis.groomId, structure)
      const aParents = parentChainIds(brideParentKey, structure)
      const brideSpanIds = nodes
        .filter(
          (node) =>
            node.kind === 'person' &&
            (generations.get(node.id) ?? 0) === analysis.row &&
            parentKey(node.id, structure) === brideParentKey &&
            node.id !== analysis.groomId,
        )
        .map((node) => node.id)
      placeParentsOverSpan(aParents, brideSpanIds, parentRow, nodes, personHeight, nodeById)

      const bParents = parentChainIds(groomParentKey, structure)
      const bBroId = analysis.bSideSiblingIds[0]
      placeParentsOverSpan(bParents, bBroId ? [bBroId] : [], parentRow, nodes, personHeight, nodeById)
      break
    }
    case 'extended-joint-old': {
      const brideParentKey = parentKey(analysis.brideId, structure)
      const groomParentKey = parentKey(analysis.groomId, structure)
      const aParents = parentChainIds(brideParentKey, structure)
      const brideSpanIds = nodes
        .filter(
          (node) =>
            node.kind === 'person' &&
            (generations.get(node.id) ?? 0) === analysis.row &&
            parentKey(node.id, structure) === brideParentKey &&
            node.id !== analysis.groomId,
        )
        .map((node) => node.id)
      placeParentsOverSpan(aParents, brideSpanIds, parentRow, nodes, personHeight, nodeById)

      const bParents = parentChainIds(groomParentKey, structure)
      placeParentsOverSpan(
        bParents,
        [analysis.groomId, ...analysis.bSideSiblingIds],
        parentRow,
        nodes,
        personHeight,
        nodeById,
      )
      break
    }
    case 'bride-anchored': {
      const brideParentKey = parentKey(analysis.brideId, structure)
      const groomParentKey = parentKey(analysis.groomId, structure)
      const brideRowIds = nodes
        .filter(
          (node) =>
            node.kind === 'person' &&
            (generations.get(node.id) ?? 0) === analysis.row &&
            parentKey(node.id, structure) === brideParentKey,
        )
        .map((node) => node.id)
      const groomRowIds = nodes
        .filter(
          (node) =>
            node.kind === 'person' &&
            (generations.get(node.id) ?? 0) === analysis.row &&
            parentKey(node.id, structure) === groomParentKey &&
            node.id !== analysis.groomId,
        )
        .map((node) => node.id)
      placeParentsOverSpan(parentChainIds(brideParentKey, structure), brideRowIds, parentRow, nodes, personHeight, nodeById)
      placeParentsOverSpan(parentChainIds(groomParentKey, structure), groomRowIds, parentRow, nodes, personHeight, nodeById)
      break
    }
    case 'single-natal-run': {
      const aKey = parentKey(analysis.joinA, structure)
      const bKey = parentKey(analysis.joinB, structure)
      placeParentsOverSpan(parentChainIds(aKey, structure), [analysis.joinA], parentRow, nodes, personHeight, nodeById)
      const bChildren = nodes
        .filter(
          (node) =>
            node.kind === 'person' &&
            (generations.get(node.id) ?? 0) === analysis.row &&
            parentKey(node.id, structure) === bKey,
        )
        .map((node) => node.id)
      placeParentsOverSpan(parentChainIds(bKey, structure), bChildren, parentRow, nodes, personHeight, nodeById)
      break
    }
    case 'standard-two-runs': {
      for (const run of analysis.natalRuns) {
        const parents = parentChainIds(run.key, structure)
        const joinOnSide = run.key === parentKey(analysis.joinA, structure) ? analysis.joinA : analysis.joinB
        placeParentsOverSpan(parents, [...run.ids, joinOnSide], parentRow, nodes, personHeight, nodeById)
      }
      break
    }
  }
}

/** Returns true when any join-parent rules were applied on this component. */
export function applyJoinParentPlacement(
  nodes: PositionedNode[],
  structure: FamilyStructure,
  generations: Map<string, number>,
): boolean {
  const personIds = nodes.filter((node) => node.kind === 'person').map((node) => node.id)
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const personHeight = nodes.find((node) => node.kind === 'person')?.height ?? PERSON_H
  const rows = [...new Set(personIds.map((id) => generations.get(id) ?? 0))].sort((a, b) => a - b)

  let applied = false
  const analyses: JoinRowAnalysis[] = []

  for (const row of rows) {
    const rowPersonIds = personIds.filter((id) => (generations.get(id) ?? 0) === row)
    // Join-parent canvas rules target small rows; large pedigree rows stay branch-packed.
    if (rowPersonIds.length > 16) continue
    const analysis = analyzeJoinRow(row, rowPersonIds, structure, generations, nodeById)
    if (!analysis) continue
    applied = true
    analyses.push(analysis)
    packJoinRow(analysis, nodes, personHeight, structure, nodeById)
  }

  for (const analysis of analyses) {
    if (analysis.mode === 'extended-joint-young' || analysis.mode === 'extended-joint-old') {
      applyJointChildShift(analysis, nodes, structure, generations)
    }
  }

  for (const analysis of analyses) {
    placeJoinParents(analysis, nodes, structure, generations, personHeight, nodeById)
  }

  return applied
}
