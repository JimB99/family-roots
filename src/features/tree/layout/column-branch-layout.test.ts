import { describe, expect, it } from 'vitest'
import { buildFamilyGraph } from '../../../domain/family-graph'
import {
  S14_FAMILY_ID,
  S14_PEOPLE,
  S14_RELATIONSHIPS,
} from '../../../test/fixtures/three-gen-layout-contract'
import { THREE_GEN_CONTRACT_GOLDEN } from '../../../test/fixtures/three-gen-layout-contract.golden'
import { parentChild, person, TEST_FAMILY_ID } from '../../../test/fixtures/family'
import { applyBranchContractLayout } from './branch-contract-layout'
import { buildBranchForest } from './branch-tree'
import { assignGenerations, structureFromModel } from './family-structure'
import { generalizedContractViolations } from './generalized-contract-assertions'
import { goldenPlacementDiffs } from './layout-contract-assertions'
import { branchColumnViolations } from './layout-invariants'
import { PERSON_H, ROW_GAP } from './layout-spacing'
import { projectFamilyGraph } from './project-family-graph'
import { computeTreeLayout } from './compute-tree-layout'

describe('column branch layout', () => {
  it('keeps disjoint cousin columns on wide gen2 branches', () => {
    const gp = person('gp', 'GP', { birth: { year: 1940, precision: 'year' } })
    const branches = ['a', 'b', 'c'].map((id) => person(id, id.toUpperCase(), { birth: { year: 1970, precision: 'year' } }))
    const children = ['a', 'b', 'c'].flatMap((branch) =>
      [1, 2, 3].map((n) => person(`${branch}-c${n}`, `${branch}-c${n}`, { birth: { year: 2000 + n, precision: 'year' } })),
    )
    const relationships = [
      parentChild('gp', 'a'),
      parentChild('gp', 'b'),
      parentChild('gp', 'c'),
      ...children.flatMap((child) => {
        const branch = child.id.split('-')[0]!
        return [parentChild(branch, child.id)]
      }),
    ]
    const model = projectFamilyGraph(buildFamilyGraph(TEST_FAMILY_ID, [gp, ...branches, ...children], relationships))
    const persons = model.nodes.filter((node) => node.kind === 'person')
    const structure = structureFromModel(model)
    const generations = assignGenerations(persons.map((node) => node.id), structure)
    const nodeById = new Map(persons.map((node) => [node.id, node]))
    const forest = buildBranchForest(persons.map((node) => node.id), structure, generations, nodeById)
    const positioned = persons.map((node) => ({
      ...node,
      x: 0,
      y: (generations.get(node.id) ?? 0) * (PERSON_H + ROW_GAP),
    }))
    const laidOut = applyBranchContractLayout(positioned, structure, generations)
    const layout = { nodes: laidOut, edges: model.edges, components: [], bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } }
    expect(generalizedContractViolations(laidOut, forest.branches)).toEqual([])
    expect(branchColumnViolations(layout, forest.branches, structure)).toEqual([])
  })

  it('matches S14 golden coordinates via computeTreeLayout', async () => {
    const graph = buildFamilyGraph(S14_FAMILY_ID, S14_PEOPLE, S14_RELATIONSHIPS)
    const model = projectFamilyGraph(graph)
    const layout = await computeTreeLayout(model)
    expect(goldenPlacementDiffs(layout, THREE_GEN_CONTRACT_GOLDEN)).toEqual([])
  })
})
