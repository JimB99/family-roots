import { type Branch } from './branch-tree'
import { downwardSet } from './compact-subtrees'
import type { FamilyStructure } from './family-structure'

/** All person ids in a branch subtree (couple, children, nested branches). */
export function branchSubtreeIds(branch: Branch, structure: FamilyStructure): Set<string> {
  const moving = downwardSet([branch.anchorId], structure)
  for (const id of branch.members) moving.add(id)
  for (const id of branch.directChildIds) moving.add(id)
  for (const child of branch.childBranches) {
    for (const id of branchSubtreeIds(child, structure)) moving.add(id)
  }
  return moving
}

function walkBranchesForSeeds(
  branch: Branch,
  seeds: Set<string>,
  structure: FamilyStructure,
  out: Set<string>,
): void {
  const subtree = branchSubtreeIds(branch, structure)
  if ([...subtree].some((id) => seeds.has(id))) {
    for (const id of subtree) out.add(id)
  }
  for (const child of branch.childBranches) {
    walkBranchesForSeeds(child, seeds, structure, out)
  }
}

/**
 * Expand seed ids to whole branch subtrees so horizontal shifts keep parent couples
 * aligned with their children (shiftBranch semantics).
 */
export function branchAwareShiftSet(
  seedIds: string[],
  branches: Branch[],
  structure: FamilyStructure,
): Set<string> {
  const seeds = new Set(seedIds)
  const moving = new Set<string>()
  for (const branch of branches) {
    walkBranchesForSeeds(branch, seeds, structure, moving)
  }
  if (moving.size === 0) {
    return downwardSet(seedIds, structure)
  }
  return moving
}
