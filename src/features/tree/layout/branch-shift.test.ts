import { describe, expect, it } from 'vitest'
import { buildFamilyGraph } from '../../../domain/family-graph'
import { parentChild, person, spouse, TEST_FAMILY_ID } from '../../../test/fixtures/family'
import { branchAwareShiftSet, branchSubtreeIds } from './branch-shift'
import { buildBranchForest } from './branch-tree'
import { assignGenerations, structureFromModel } from './family-structure'
import { projectFamilyGraph } from './project-family-graph'

describe('branchAwareShiftSet', () => {
  it('includes parent couple when seed is a direct child', () => {
    const gp = person('gp', 'GP', { birth: { year: 1900, precision: 'year' } })
    const wide = person('wide', 'Wide', { birth: { year: 1930, precision: 'year' } })
    const wideSp = person('wide-sp', 'WideSp', { birth: { year: 1931, precision: 'year' } })
    const k1 = person('k1', 'K1', { birth: { year: 1960, precision: 'year' } })
    const graph = buildFamilyGraph(TEST_FAMILY_ID, [gp, wide, wideSp, k1], [
      parentChild('gp', 'wide'),
      spouse('wide', 'wide-sp'),
      parentChild('wide', 'k1'),
      parentChild('wide-sp', 'k1'),
    ])
    const model = projectFamilyGraph(graph)
    const structure = structureFromModel(model)
    const personIds = model.nodes.filter((n) => n.kind === 'person').map((n) => n.id)
    const nodeById = new Map(model.nodes.map((n) => [n.id, n]))
    const gens = assignGenerations(personIds, structure)
    const forest = buildBranchForest(personIds, structure, gens, nodeById)
    const wideBranch = forest.branches.find((b) => b.anchorId === 'person:wide')
    expect(wideBranch).toBeDefined()

    const moving = branchAwareShiftSet(['person:k1'], forest.branches, structure)
    expect(moving.has('person:wide')).toBe(true)
    expect(moving.has('person:wide-sp')).toBe(true)
    expect(moving.has('person:k1')).toBe(true)

    const subtree = branchSubtreeIds(wideBranch!, structure)
    expect(moving).toEqual(subtree)
  })
})
