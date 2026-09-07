import { describe, expect, it } from 'vitest'
import { buildFamilyGraph } from '../../../domain/family-graph'
import { TEST_FAMILY_ID } from '../../../test/fixtures/family'
import {
  WIDE_FOUR_GEN_PEDIGREE_PEOPLE,
  WIDE_FOUR_GEN_PEDIGREE_RELATIONSHIPS,
} from '../../../test/fixtures/wide-four-gen-pedigree-scenario'
import { buildBranchForest } from './branch-tree'
import { assignGenerations, structureFromModel } from './family-structure'
import {
  branchColumnViolations,
  cousinGroupOrderViolations,
  siblingOrderViolations,
  topLevelForestBranchRowOverlapViolations,
} from './layout-invariants'
import { computeTreeLayout } from './compute-tree-layout'
import { projectFamilyGraph } from './project-family-graph'

describe('wide three-generation pedigree (W3G)', () => {
  it('lays out without invariant violations', async () => {
    const model = projectFamilyGraph(
      buildFamilyGraph(TEST_FAMILY_ID, WIDE_FOUR_GEN_PEDIGREE_PEOPLE, WIDE_FOUR_GEN_PEDIGREE_RELATIONSHIPS),
    )
    const layout = await computeTreeLayout(model)
    const structure = structureFromModel(model)
    const persons = model.nodes.filter((node) => node.kind === 'person')
    const generations = assignGenerations(persons.map((node) => node.id), structure)
    const nodeById = new Map(persons.map((node) => [node.id, node]))
    const forest = buildBranchForest(persons.map((node) => node.id), structure, generations, nodeById)

    const personNodes = layout.nodes.filter((entry) => entry.kind === 'person')
    const maxX = Math.max(...personNodes.map((entry) => entry.x + entry.width))

    expect(WIDE_FOUR_GEN_PEDIGREE_PEOPLE.length).toBeGreaterThan(100)
    expect(personNodes).toHaveLength(WIDE_FOUR_GEN_PEDIGREE_PEOPLE.length)
    expect(maxX, `engine width ${maxX}px`).toBeGreaterThan(10_000)

    expect(topLevelForestBranchRowOverlapViolations(layout, forest.branches, structure)).toEqual([])
    expect(branchColumnViolations(layout, forest.branches, structure)).toEqual([])
    expect(cousinGroupOrderViolations(layout, structure)).toEqual([])
    expect(siblingOrderViolations(layout, structure)).toEqual([])
  })
})
