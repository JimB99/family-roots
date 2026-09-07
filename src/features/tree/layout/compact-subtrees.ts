import {
  applyBranchContractLayout,
  applyBranchContractLayoutWithTrace,
  type ContractPackStep,
} from './branch-contract-layout'
import { assignGenerations, type FamilyStructure } from './family-structure'
import type { PositionedNode } from './layout-model'
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
