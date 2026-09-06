import {
  CONTRACT_COUPLE_GAP,
  CONTRACT_COUSIN_GAP,
  CONTRACT_SIBLING_GAP,
  S14_BRANCH_ORDER,
  S14_GEN1_HUB_ORDER,
  type S14BranchId,
} from '../../../test/fixtures/three-gen-layout-contract'
import type { PositionedLayout, PositionedNode } from './layout-model'
import { PERSON_H, ROW_GAP } from './layout-spacing'
import type { GoldenPersonPlacement } from '../../../test/fixtures/three-gen-layout-contract.golden'

export interface ContractViolation {
  rule: string
  detail: string
}

const GEN1_BRANCHES_WITH_CHILDREN: S14BranchId[] = ['b2', 'b3', 'b4', 'b5']
const GEN2_BRANCHES: S14BranchId[] = ['b2', 'b3', 'b4', 'b5']

const GEN1_BRANCH_PERSON_IDS: Record<S14BranchId, string[]> = {
  g0: ['g0-pa', 'g0-ma'],
  b1: ['b1-solo'],
  b2: ['b2-sp-a', 'b2-hub', 'b2-sp-b'],
  b3: ['b3-hub', 'b3-sp'],
  b4: ['b4-hub', 'b4-sp'],
  b5: ['b5-hub', 'b5-sp'],
}

const GEN2_BRANCH_PERSON_IDS: Record<S14BranchId, string[]> = {
  g0: [],
  b1: [],
  b2: ['b2-c-a', 'b2-c-b', 'b2-c-c'],
  b3: ['b3-c'],
  b4: ['b4-c-a', 'b4-c-b'],
  b5: ['b5-c-a', 'b5-c-b', 'b5-c-c'],
}

const COUPLE_PAIRS: Array<[string, string]> = [
  ['g0-pa', 'g0-ma'],
  ['b2-sp-a', 'b2-hub'],
  ['b2-hub', 'b2-sp-b'],
  ['b3-hub', 'b3-sp'],
  ['b4-hub', 'b4-sp'],
  ['b5-hub', 'b5-sp'],
]

export interface EnginePersonPlacement {
  id: string
  x: number
  y: number
  cx: number
  cy: number
  leftEdge: number
  rightEdge: number
}

function personNodes(layout: PositionedLayout | PositionedNode[]): PositionedNode[] {
  const nodes = Array.isArray(layout) ? layout : layout.nodes
  return nodes.filter((node) => node.kind === 'person' && node.personId)
}

export function enginePlacements(layout: PositionedLayout | PositionedNode[]): EnginePersonPlacement[] {
  return personNodes(layout).map((node) => ({
    id: node.personId!,
    x: node.x,
    y: node.y,
    cx: node.x + node.width / 2,
    cy: node.y + node.height / 2,
    leftEdge: node.x,
    rightEdge: node.x + node.width,
  }))
}

export function normalizeEnginePlacements(placements: EnginePersonPlacement[]): EnginePersonPlacement[] {
  if (placements.length === 0) return placements
  const minX = Math.min(...placements.map((p) => p.x))
  const minY = Math.min(...placements.map((p) => p.y))
  return placements.map((p) => ({
    ...p,
    x: p.x - minX,
    y: p.y - minY,
    leftEdge: p.leftEdge - minX,
    rightEdge: p.rightEdge - minX,
    cx: p.cx - minX,
    cy: p.cy - minY,
  }))
}

export function placementById(placements: EnginePersonPlacement[]): Map<string, EnginePersonPlacement> {
  return new Map(placements.map((p) => [p.id, p]))
}

function clusterBounds(ids: string[], byId: Map<string, EnginePersonPlacement>): { left: number; right: number; center: number } | null {
  const nodes = ids.map((id) => byId.get(id)).filter((node): node is EnginePersonPlacement => node != null)
  if (nodes.length === 0) return null
  const left = Math.min(...nodes.map((p) => p.leftEdge))
  const right = Math.max(...nodes.map((p) => p.rightEdge))
  return { left, right, center: (left + right) / 2 }
}

function expectedRowY(gen: number): number {
  return gen * (PERSON_H + ROW_GAP)
}

export function contractRuleViolations(
  layout: PositionedLayout | PositionedNode[],
  options: { centerTolerance?: number } = {},
): ContractViolation[] {
  const centerTolerance = options.centerTolerance ?? 1
  const normalized = normalizeEnginePlacements(enginePlacements(layout))
  const byId = placementById(normalized)
  const violations: ContractViolation[] = []

  for (const id of [...S14_GEN1_HUB_ORDER, 'g0-pa', 'g0-ma', ...GEN2_BRANCHES.flatMap((b) => GEN2_BRANCH_PERSON_IDS[b])]) {
    if (!byId.has(id)) violations.push({ rule: 'missing-person', detail: `missing ${id}` })
  }

  for (const [aId, bId] of COUPLE_PAIRS) {
    const a = byId.get(aId)
    const b = byId.get(bId)
    if (!a || !b) continue
    const gap = b.leftEdge - a.rightEdge
    if (Math.abs(gap - CONTRACT_COUPLE_GAP) > 0.5) {
      violations.push({
        rule: 'couple-gap',
        detail: `${aId}↔${bId}: expected ${CONTRACT_COUPLE_GAP}px, got ${Math.round(gap * 10) / 10}px`,
      })
    }
  }

  for (const branch of GEN2_BRANCHES) {
    const ids = GEN2_BRANCH_PERSON_IDS[branch]
    const nodes = ids.map((id) => byId.get(id)).filter((node): node is EnginePersonPlacement => node != null)
    nodes.sort((a, b) => a.cx - b.cx)
    for (let i = 0; i < nodes.length - 1; i++) {
      const gap = nodes[i + 1]!.leftEdge - nodes[i]!.rightEdge
      if (gap + 0.5 < CONTRACT_SIBLING_GAP) {
        violations.push({
          rule: 'gen2-sibling-gap',
          detail: `${branch} ${nodes[i]!.id}→${nodes[i + 1]!.id}: min ${CONTRACT_SIBLING_GAP}px, got ${Math.round(gap * 10) / 10}px`,
        })
      }
    }
  }

  for (let i = 0; i < GEN2_BRANCHES.length - 1; i++) {
    const leftBranch = GEN2_BRANCHES[i]!
    const rightBranch = GEN2_BRANCHES[i + 1]!
    const leftBox = clusterBounds(GEN2_BRANCH_PERSON_IDS[leftBranch], byId)
    const rightBox = clusterBounds(GEN2_BRANCH_PERSON_IDS[rightBranch], byId)
    if (!leftBox || !rightBox) continue
    const gap = rightBox.left - leftBox.right
    if (gap + 0.5 < CONTRACT_COUSIN_GAP - 4) {
      violations.push({
        rule: 'gen2-cousin-gap',
        detail: `${leftBranch}→${rightBranch}: min ${CONTRACT_COUSIN_GAP}px, got ${Math.round(gap * 10) / 10}px`,
      })
    }
  }

  for (let i = 0; i < GEN1_BRANCHES_WITH_CHILDREN.length - 1; i++) {
    const leftBranch = GEN1_BRANCHES_WITH_CHILDREN[i]!
    const rightBranch = GEN1_BRANCHES_WITH_CHILDREN[i + 1]!
    const leftBox = clusterBounds(GEN1_BRANCH_PERSON_IDS[leftBranch], byId)
    const rightBox = clusterBounds(GEN1_BRANCH_PERSON_IDS[rightBranch], byId)
    if (!leftBox || !rightBox) continue
    const gap = rightBox.left - leftBox.right
    if (gap + 0.5 < CONTRACT_SIBLING_GAP) {
      violations.push({
        rule: 'gen1-sibling-gap',
        detail: `${leftBranch}→${rightBranch}: min ${CONTRACT_SIBLING_GAP}px, got ${Math.round(gap * 10) / 10}px`,
      })
    }
  }

  const b5Box = clusterBounds(GEN1_BRANCH_PERSON_IDS.b5, byId)
  const b1 = byId.get('b1-solo')
  if (b5Box && b1) {
    const gap = b1.leftEdge - b5Box.right
    if (gap + 0.5 < CONTRACT_SIBLING_GAP) {
      violations.push({
        rule: 'gen1-solo-gap',
        detail: `b5→b1-solo: min ${CONTRACT_SIBLING_GAP}px, got ${Math.round(gap * 10) / 10}px`,
      })
    }
  }

  for (const branch of GEN1_BRANCHES_WITH_CHILDREN) {
    const gen1Box = clusterBounds(GEN1_BRANCH_PERSON_IDS[branch], byId)
    const gen2Box = clusterBounds(GEN2_BRANCH_PERSON_IDS[branch], byId)
    if (!gen1Box || !gen2Box) continue
    const offset = Math.abs(gen1Box.center - gen2Box.center)
    if (offset > centerTolerance) {
      violations.push({
        rule: 'parent-center',
        detail: `${branch}: gen1 center ${Math.round(gen1Box.center * 10) / 10} vs gen2 center ${Math.round(gen2Box.center * 10) / 10} (Δ${Math.round(offset * 10) / 10}px)`,
      })
    }
  }

  const hubOrder = S14_GEN1_HUB_ORDER.map((id) => byId.get(id)).filter((node): node is EnginePersonPlacement => node != null)
  hubOrder.sort((a, b) => a.cx - b.cx)
  const actualHubOrder = hubOrder.map((p) => p.id)
  if (actualHubOrder.join(',') !== S14_GEN1_HUB_ORDER.join(',')) {
    violations.push({
      rule: 'gen1-hub-order',
      detail: `expected ${S14_GEN1_HUB_ORDER.join(' → ')}, got ${actualHubOrder.join(' → ')}`,
    })
  }

  const gen1Nodes = S14_BRANCH_ORDER.flatMap((branch) =>
    GEN1_BRANCH_PERSON_IDS[branch].map((id) => byId.get(id)).filter((node): node is EnginePersonPlacement => node != null),
  )
  const gen1Left = Math.min(...gen1Nodes.map((p) => p.leftEdge))
  const gen1Right = Math.max(...gen1Nodes.map((p) => p.rightEdge))
  const gen1Center = (gen1Left + gen1Right) / 2
  const g0Box = clusterBounds(GEN1_BRANCH_PERSON_IDS.g0, byId)
  if (g0Box && Math.abs(g0Box.center - gen1Center) > centerTolerance) {
    violations.push({
      rule: 'grandparent-center',
      detail: `g0 center ${Math.round(g0Box.center * 10) / 10} vs gen1 row center ${Math.round(gen1Center * 10) / 10}`,
    })
  }

  for (const placement of normalized) {
    let gen: 0 | 1 | 2
    if (placement.id.startsWith('g0-')) gen = 0
    else if (placement.id.includes('-c')) gen = 2
    else gen = 1
    const expectedY = expectedRowY(gen)
    if (Math.abs(placement.y - expectedY) > 0.5) {
      violations.push({
        rule: 'row-y',
        detail: `${placement.id}: expected y=${expectedY}, got y=${placement.y}`,
      })
    }
  }

  return violations
}

export function goldenPlacementDiffs(
  layout: PositionedLayout | PositionedNode[],
  golden: GoldenPersonPlacement[],
  tolerance = 0.5,
): string[] {
  const normalized = normalizeEnginePlacements(enginePlacements(layout))
  const byId = placementById(normalized)
  const diffs: string[] = []

  for (const expected of golden) {
    const actual = byId.get(expected.id)
    if (!actual) {
      diffs.push(`${expected.id}: missing`)
      continue
    }
    if (Math.abs(actual.x - expected.x) > tolerance) {
      diffs.push(`${expected.id}.x: expected ${expected.x}, got ${Math.round(actual.x * 10) / 10}`)
    }
    if (Math.abs(actual.y - expected.y) > tolerance) {
      diffs.push(`${expected.id}.y: expected ${expected.y}, got ${Math.round(actual.y * 10) / 10}`)
    }
    if (Math.abs(actual.cx - expected.cx) > tolerance) {
      diffs.push(`${expected.id}.cx: expected ${expected.cx}, got ${Math.round(actual.cx * 10) / 10}`)
    }
  }

  return diffs
}

export function formatViolations(violations: ContractViolation[]): string {
  if (violations.length === 0) return 'no contract violations'
  return violations.map((v) => `[${v.rule}] ${v.detail}`).join('\n')
}
