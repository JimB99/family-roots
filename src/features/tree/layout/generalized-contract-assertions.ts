import type { Branch } from './branch-tree'
import type { PositionedNode } from './layout-model'
import { CONTRACT_COUPLE_GAP, CONTRACT_COUSIN_GAP, CONTRACT_SIBLING_GAP } from './layout-spacing'
import {
  enginePlacements,
  normalizeEnginePlacements,
  placementById,
  type ContractViolation,
} from './layout-contract-assertions'

function clusterBounds(ids: string[], byId: ReturnType<typeof placementById>) {
  const nodes = ids.map((id) => byId.get(id)).filter((node) => node != null)
  if (nodes.length === 0) return null
  const left = Math.min(...nodes.map((p) => p.leftEdge))
  const right = Math.max(...nodes.map((p) => p.rightEdge))
  return { left, right, center: (left + right) / 2 }
}

export function generalizedContractViolations(
  nodes: PositionedNode[],
  branches: Branch[],
  options: { centerTolerance?: number } = {},
): ContractViolation[] {
  const centerTolerance = options.centerTolerance ?? 1
  const byId = placementById(normalizeEnginePlacements(enginePlacements(nodes)))
  const violations: ContractViolation[] = []

  const branchesWithChildren = branches.filter((branch) => branch.directChildIds.length > 0)

  for (const branch of branches) {
    const memberIds = branch.members.map((id) => id.slice('person:'.length))
    const ordered = memberIds
      .map((id) => byId.get(id))
      .filter((node) => node != null)
      .sort((a, b) => a!.cx - b!.cx)
    for (let i = 0; i < ordered.length - 1; i++) {
      const gap = ordered[i + 1]!.leftEdge - ordered[i]!.rightEdge
      if (Math.abs(gap - CONTRACT_COUPLE_GAP) > 0.5) {
        violations.push({
          rule: 'couple-gap',
          detail: `${ordered[i]!.id}↔${ordered[i + 1]!.id}: expected ${CONTRACT_COUPLE_GAP}px, got ${Math.round(gap * 10) / 10}px`,
        })
      }
    }
  }

  for (const branch of branchesWithChildren) {
    const childIds = branch.directChildIds.map((id) => id.slice('person:'.length))
    const sortedChildren = childIds
      .map((id) => byId.get(id))
      .filter((node) => node != null)
      .sort((a, b) => a!.cx - b!.cx)
    for (let i = 0; i < sortedChildren.length - 1; i++) {
      const gap = sortedChildren[i + 1]!.leftEdge - sortedChildren[i]!.rightEdge
      if (gap + 0.5 < CONTRACT_SIBLING_GAP) {
        violations.push({
          rule: 'child-sibling-gap',
          detail: `${branch.id}: min ${CONTRACT_SIBLING_GAP}px between children`,
        })
      }
    }
    const parentBox = clusterBounds(branch.members.map((id) => id.slice('person:'.length)), byId)
    const childBox = clusterBounds(childIds, byId)
    if (parentBox && childBox && Math.abs(parentBox.center - childBox.center) > centerTolerance) {
      violations.push({
        rule: 'parent-center',
        detail: `${branch.id}: parent/child center delta ${Math.round(Math.abs(parentBox.center - childBox.center) * 10) / 10}px`,
      })
    }
  }

  for (let i = 0; i < branchesWithChildren.length - 1; i++) {
    const left = branchesWithChildren[i]!
    const right = branchesWithChildren[i + 1]!
    const leftBox = clusterBounds(left.directChildIds.map((id) => id.slice('person:'.length)), byId)
    const rightBox = clusterBounds(right.directChildIds.map((id) => id.slice('person:'.length)), byId)
    if (leftBox && rightBox && rightBox.left - leftBox.right + 0.5 < CONTRACT_COUSIN_GAP) {
      violations.push({
        rule: 'cousin-gap',
        detail: `${left.id}→${right.id}: min ${CONTRACT_COUSIN_GAP}px`,
      })
    }
  }

  return violations
}
