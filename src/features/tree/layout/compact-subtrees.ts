import {
  applyBranchContractLayout,
  applyBranchContractLayoutWithTrace,
  type ContractPackStep,
} from './branch-contract-layout'
import { assignGenerations, type FamilyStructure } from './family-structure'
import type { PositionedNode } from './layout-model'
import { FAMILY_GAP } from './layout-spacing'

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

export function packPedigreeRows(
  nodes: PositionedNode[],
  structure: FamilyStructure,
  generations?: Map<string, number>,
): PositionedNode[] {
  const personIds = nodes.filter((node) => node.kind === 'person').map((node) => node.id)
  const gens = generations ?? assignGenerations(personIds, structure)
  return applyBranchContractLayout(nodes, structure, gens)
}

export {
  CONTRACT_PACK_STEPS as PACK_PEDIGREE_STEPS,
  type ContractPackStep as PackPedigreeStep,
} from './branch-contract-layout'

export function packPedigreeRowsWithTrace(
  nodes: PositionedNode[],
  structure: FamilyStructure,
  generations?: Map<string, number>,
): Array<{ step: ContractPackStep; nodes: PositionedNode[] }> {
  const personIds = nodes.filter((node) => node.kind === 'person').map((node) => node.id)
  const gens = generations ?? assignGenerations(personIds, structure)
  return applyBranchContractLayoutWithTrace(nodes, structure, gens)
}
