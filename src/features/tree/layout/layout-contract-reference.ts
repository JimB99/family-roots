/**
 * Approved S14 three-generation layout reference builder.
 *
 * Ported from canvases/s14-layout-contract.canvas.tsx `buildIdealLayout()`.
 * This is the source of truth for placement rules and golden coordinates.
 */
import {
  CONTRACT_COUPLE_GAP,
  CONTRACT_COUSIN_GAP,
  CONTRACT_SIBLING_GAP,
  S14_BRANCH_ORDER,
  S14_GEN1_HUB_ORDER,
  type S14BranchId,
} from '../../../test/fixtures/three-gen-layout-contract'
import { PERSON_H, PERSON_W, ROW_GAP } from './layout-spacing'

export { CONTRACT_COUPLE_GAP, CONTRACT_COUSIN_GAP, CONTRACT_SIBLING_GAP }

const HALF_W = PERSON_W / 2
const HALF_H = PERSON_H / 2

const rowY = (gen: number) => gen * (PERSON_H + ROW_GAP)
const cyOf = (gen: number) => rowY(gen) + HALF_H

export interface ContractLayoutPerson {
  id: string
  gen: 0 | 1 | 2
  birth: number
  cx: number
  cy: number
  leftEdge: number
  rightEdge: number
  branch: S14BranchId
  role: string
  /** Top-left x matching engine layout coordinates */
  x: number
  /** Top-left y matching engine layout coordinates */
  y: number
  width: number
  height: number
}

type ChildSpec = { branch: S14BranchId; ids: string[]; births: number[]; roles: string[] }

const CHILD_SPECS: ChildSpec[] = [
  {
    branch: 'b2',
    ids: ['b2-c-a', 'b2-c-b', 'b2-c-c'],
    births: [2005, 2008, 2011],
    roles: ['child · hub+sp-a', 'child · hub+sp-b', 'child · hub+sp-a'],
  },
  { branch: 'b3', ids: ['b3-c'], births: [2010], roles: ['child · hub+sp'] },
  { branch: 'b4', ids: ['b4-c-a', 'b4-c-b'], births: [2012, 2015], roles: ['child · hub+sp', 'child · hub+sp'] },
  {
    branch: 'b5',
    ids: ['b5-c-a', 'b5-c-b', 'b5-c-c'],
    births: [2016, 2018, 2020],
    roles: ['child · hub+sp', 'child · hub+sp', 'child · hub+sp'],
  },
]

const BRANCHES_WITH_CHILDREN: S14BranchId[] = ['b2', 'b3', 'b4', 'b5']

function placeBox(left: number) {
  return { left, cx: left + HALF_W, right: left + PERSON_W }
}

function clusterSpan(count: number, gap: number): number {
  if (count === 0) return 0
  return count * PERSON_W + (count - 1) * gap
}

function coupleSpan(): number {
  return clusterSpan(2, CONTRACT_COUPLE_GAP)
}

function b2ChainSpan(): number {
  return clusterSpan(3, CONTRACT_COUPLE_GAP)
}

function toEngineCoords(entry: Omit<ContractLayoutPerson, 'x' | 'y' | 'width' | 'height'>): ContractLayoutPerson {
  return {
    ...entry,
    x: entry.leftEdge,
    y: entry.cy - HALF_H,
    width: PERSON_W,
    height: PERSON_H,
  }
}

/** Approved 5-step placement algorithm from the S14 canvas contract. */
export function buildContractReferenceLayout(): ContractLayoutPerson[] {
  const people: ContractLayoutPerson[] = []

  const setPerson = (
    id: string,
    gen: 0 | 1 | 2,
    birth: number,
    left: number,
    branch: S14BranchId,
    role: string,
  ) => {
    const box = placeBox(left)
    const entry = toEngineCoords({
      id,
      gen,
      birth,
      cx: box.cx,
      cy: cyOf(gen),
      leftEdge: box.left,
      rightEdge: box.right,
      branch,
      role,
    })
    const existing = people.find((p) => p.id === id)
    if (existing) Object.assign(existing, entry)
    else people.push(entry)
  }

  const childBox = (branch: S14BranchId): { left: number; right: number; center: number } | null => {
    const children = people.filter((p) => p.branch === branch && p.gen === 2)
    if (children.length === 0) return null
    const left = Math.min(...children.map((p) => p.leftEdge))
    const right = Math.max(...children.map((p) => p.rightEdge))
    return { left, right, center: (left + right) / 2 }
  }

  // 1) Pack gen2 children: cousin gap between branches, sibling gap within branch.
  let cousinCursor = 0
  for (const spec of CHILD_SPECS) {
    let left = cousinCursor === 0 ? 0 : cousinCursor + CONTRACT_COUSIN_GAP
    for (let i = 0; i < spec.ids.length; i++) {
      setPerson(spec.ids[i]!, 2, spec.births[i]!, left, spec.branch, spec.roles[i]!)
      left += PERSON_W + (i < spec.ids.length - 1 ? CONTRACT_SIBLING_GAP : 0)
    }
    cousinCursor = childBox(spec.branch)!.right
  }

  // 2) Center gen1 exactly over each branch's gen2 child cluster.
  const gen1ClusterWidth = (branch: S14BranchId): number => {
    if (branch === 'b2') return b2ChainSpan()
    if (branch === 'b1') return PERSON_W
    return coupleSpan()
  }

  const placeGen1Branch = (branch: S14BranchId, left: number) => {
    if (branch === 'b2') {
      setPerson('b2-sp-a', 1, 1976, left, 'b2', 'spouse A')
      setPerson('b2-hub', 1, 1975, left + PERSON_W + CONTRACT_COUPLE_GAP, 'b2', 'hub · oldest · 2 spouses')
      setPerson('b2-sp-b', 1, 1977, left + 2 * (PERSON_W + CONTRACT_COUPLE_GAP), 'b2', 'spouse B')
      return
    }
    if (branch === 'b1') {
      setPerson('b1-solo', 1, 1990, left, 'b1', 'solo · youngest · 0 children')
      return
    }
    const hubBirth = branch === 'b3' ? 1978 : branch === 'b4' ? 1981 : 1984
    const spBirth = branch === 'b3' ? 1979 : branch === 'b4' ? 1982 : 1985
    setPerson(`${branch}-hub`, 1, hubBirth, left, branch, 'hub')
    setPerson(`${branch}-sp`, 1, spBirth, left + PERSON_W + CONTRACT_COUPLE_GAP, branch, 'spouse')
  }

  const gen1Box = (branch: S14BranchId) => {
    const nodes = people.filter((p) => p.gen === 1 && p.branch === branch)
    return {
      left: Math.min(...nodes.map((p) => p.leftEdge)),
      right: Math.max(...nodes.map((p) => p.rightEdge)),
    }
  }

  const shiftBranch = (branch: S14BranchId, delta: number) => {
    for (const p of people) {
      if (p.branch !== branch) continue
      p.leftEdge += delta
      p.rightEdge += delta
      p.cx += delta
      p.x += delta
    }
  }

  for (const branch of BRANCHES_WITH_CHILDREN) {
    const width = gen1ClusterWidth(branch)
    const center = childBox(branch)!.center
    placeGen1Branch(branch, center - width / 2)
  }

  // 3) Gaps are minimums: shift whole later branches right to keep gen1 sibling spacing
  //    while preserving parent↔child centering within each branch.
  for (let i = 0; i < BRANCHES_WITH_CHILDREN.length - 1; i++) {
    const leftBranch = BRANCHES_WITH_CHILDREN[i]!
    const rightBranch = BRANCHES_WITH_CHILDREN[i + 1]!
    const gap = gen1Box(rightBranch).left - gen1Box(leftBranch).right
    if (gap < CONTRACT_SIBLING_GAP) {
      const delta = CONTRACT_SIBLING_GAP - gap
      for (let j = i + 1; j < BRANCHES_WITH_CHILDREN.length; j++) {
        shiftBranch(BRANCHES_WITH_CHILDREN[j]!, delta)
      }
    }
  }

  // 4) b1 solo — youngest, at least SIBLING_GAP after b5 gen1 cluster.
  placeGen1Branch('b1', gen1Box('b5').right + CONTRACT_SIBLING_GAP)

  // 5) Grandparents centered over gen1 row.
  const gen1Nodes = people.filter((p) => p.gen === 1)
  const gen1Left = Math.min(...gen1Nodes.map((p) => p.leftEdge))
  const gen1Right = Math.max(...gen1Nodes.map((p) => p.rightEdge))
  const gpLeft = (gen1Left + gen1Right) / 2 - coupleSpan() / 2
  setPerson('g0-pa', 0, 1950, gpLeft, 'g0', 'grandparent')
  setPerson('g0-ma', 0, 1951, gpLeft + PERSON_W + CONTRACT_COUPLE_GAP, 'g0', 'grandparent')

  return people
}

export function contractPerson(id: string, layout = buildContractReferenceLayout()): ContractLayoutPerson {
  const found = layout.find((p) => p.id === id)
  if (!found) throw new Error(`missing contract person ${id}`)
  return found
}

export function gen1ClusterBounds(
  branch: S14BranchId,
  layout = buildContractReferenceLayout(),
): { left: number; right: number } | null {
  const nodes = layout.filter((p) => p.gen === 1 && p.branch === branch)
  if (nodes.length === 0) return null
  return {
    left: Math.min(...nodes.map((p) => p.leftEdge)),
    right: Math.max(...nodes.map((p) => p.rightEdge)),
  }
}

export function gen2ChildClusterBounds(
  branch: S14BranchId,
  layout = buildContractReferenceLayout(),
): { left: number; right: number } | null {
  const children = layout.filter((p) => p.gen === 2 && p.branch === branch)
  if (children.length === 0) return null
  return {
    left: Math.min(...children.map((p) => p.leftEdge)),
    right: Math.max(...children.map((p) => p.rightEdge)),
  }
}

export function normalizeContractLayout(layout: ContractLayoutPerson[]): ContractLayoutPerson[] {
  if (layout.length === 0) return layout
  const minX = Math.min(...layout.map((p) => p.x))
  const minY = Math.min(...layout.map((p) => p.y))
  const dx = minX
  const dy = minY
  return layout.map((p) => ({
    ...p,
    x: p.x - dx,
    y: p.y - dy,
    leftEdge: p.leftEdge - dx,
    rightEdge: p.rightEdge - dx,
    cx: p.cx - dx,
    cy: p.cy - dy,
  }))
}

export const CONTRACT_GEN1_HUB_ORDER = S14_GEN1_HUB_ORDER
export const CONTRACT_BRANCH_ORDER = S14_BRANCH_ORDER
