import { describe, expect, it } from 'vitest'
import { buildFamilyGraph } from '../../../domain/family-graph'
import {
  S14_FAMILY_ID,
  S14_PEOPLE,
  S14_RELATIONSHIPS,
} from '../../../test/fixtures/three-gen-layout-contract'
import { parentChild, person, spouse, TEST_FAMILY_ID } from '../../../test/fixtures/family'
import { assignGenerations, buildStructure } from './family-structure'
import { buildBranchForest, crossFamilyCouplesAtRow } from './branch-tree'
import { projectFamilyGraph } from './project-family-graph'

function forestFromPeople(people: ReturnType<typeof person>[], relationships: ReturnType<typeof spouse>[]) {
  const graph = buildFamilyGraph(TEST_FAMILY_ID, people, relationships)
  const model = projectFamilyGraph(graph)
  const persons = model.nodes.filter((node) => node.kind === 'person')
  const kindById = new Map(model.nodes.map((node) => [node.id, node.kind]))
  const structure = buildStructure(model.edges, kindById)
  const personIds = persons.map((node) => node.id)
  const generations = assignGenerations(personIds, structure)
  const nodeById = new Map(persons.map((node) => [node.id, node]))
  return buildBranchForest(personIds, structure, generations, nodeById)
}

describe('buildBranchForest', () => {
  it('builds five gen1 branches for S14 with b1 childless', () => {
    const graph = buildFamilyGraph(S14_FAMILY_ID, S14_PEOPLE, S14_RELATIONSHIPS)
    const model = projectFamilyGraph(graph)
    const persons = model.nodes.filter((node) => node.kind === 'person')
    const kindById = new Map(model.nodes.map((node) => [node.id, node.kind]))
    const structure = buildStructure(model.edges, kindById)
    const personIds = persons.map((node) => node.id)
    const generations = assignGenerations(personIds, structure)
    const nodeById = new Map(persons.map((node) => [node.id, node]))
    const forest = buildBranchForest(personIds, structure, generations, nodeById)

    expect(forest.rootGen).toBe(0)
    expect(forest.branchGen).toBe(1)
    expect(forest.branches).toHaveLength(5)
    const childless = forest.branches.filter((branch) => branch.directChildIds.length === 0)
    expect(childless).toHaveLength(1)
    expect(childless[0]?.members).toEqual(['person:b1-solo'])
    const b2 = forest.branches.find((branch) => branch.anchorId === 'person:b2-hub')
    expect(b2?.directChildIds).toEqual(['person:b2-c-a', 'person:b2-c-c', 'person:b2-c-b'])
    expect(b2?.members).toEqual(['person:b2-sp-a', 'person:b2-hub', 'person:b2-sp-b'])
  })

  it('orders multi-spouse chain hub in the middle for S12-style hub', () => {
    const gp = person('gp', 'Grandparent', { birth: { year: 1940, precision: 'year' } })
    const hub = person('hub', 'Hub', { birth: { year: 1970, precision: 'year' } })
    const wifeA = person('wa', 'Wife A', { birth: { year: 1971, precision: 'year' } })
    const wifeB = person('wb', 'Wife B', { birth: { year: 1972, precision: 'year' } })
    const child = person('c1', 'Child', { birth: { year: 2000, precision: 'year' } })
    const forest = forestFromPeople(
      [gp, hub, wifeA, wifeB, child],
      [
        spouse('hub', 'wa'),
        spouse('hub', 'wb'),
        parentChild('gp', 'hub'),
        parentChild('hub', 'c1'),
        parentChild('wa', 'c1'),
        parentChild('wb', 'c1'),
      ],
    )
    const hubBranch = forest.branches.find((branch) => branch.anchorId === 'person:hub')
    expect(hubBranch?.members).toEqual(['person:wa', 'person:hub', 'person:wb'])
  })

  it('builds nested child branch for child-row spouse without descendants (S12c n1+n1sp)', () => {
    const gp = person('gp', 'GP', { birth: { year: 1900, precision: 'year' } })
    const narrow = person('narrow', 'Narrow', { birth: { year: 1932, precision: 'year' } })
    const narrowSp = person('narrow-sp', 'NarrowSp', { birth: { year: 1933, precision: 'year' } })
    const n1 = person('n1', 'N1', { birth: { year: 1965, precision: 'year' } })
    const n1sp = person('n1sp', 'N1Sp', { birth: { year: 1966, precision: 'year' } })
    const n2 = person('n2', 'N2', { birth: { year: 1967, precision: 'year' } })
    const forest = forestFromPeople(
      [gp, narrow, narrowSp, n1, n1sp, n2],
      [
        parentChild('gp', 'narrow'),
        spouse('narrow', 'narrow-sp'),
        spouse('n1', 'n1sp'),
        parentChild('narrow', 'n1'),
        parentChild('narrow-sp', 'n1'),
        parentChild('narrow', 'n2'),
        parentChild('narrow-sp', 'n2'),
      ],
    )
    const narrowBranch = forest.branches.find((branch) => branch.members.includes('person:narrow'))
    expect(narrowBranch?.directChildIds).toEqual(['person:n1', 'person:n2'])
    const n1Branch = narrowBranch?.childBranches.find((branch) => branch.anchorId === 'person:n1')
    expect(n1Branch?.members).toEqual(['person:n1', 'person:n1sp'])
    expect(n1Branch?.directChildIds).toEqual([])
  })

  it('detects cross-family couples on a row for S4', () => {
    const leftFather = person('lf', 'Left Father', { birth: { year: 1940, precision: 'year' } })
    const leftMother = person('lm', 'Left Mother', { birth: { year: 1942, precision: 'year' } })
    const rightFather = person('rf', 'Right Father', { birth: { year: 1941, precision: 'year' } })
    const rightMother = person('rm', 'Right Mother', { birth: { year: 1943, precision: 'year' } })
    const l1 = person('l1', 'Left One', { birth: { year: 1968, precision: 'year' } })
    const l2 = person('l2', 'Left Two', { birth: { year: 1970, precision: 'year' } })
    const l3 = person('l3', 'Left Three', { birth: { year: 1974, precision: 'year' } })
    const r1 = person('r1', 'Right One', { birth: { year: 1969, precision: 'year' } })
    const r2 = person('r2', 'Right Two', { birth: { year: 1971, precision: 'year' } })
    const r3 = person('r3', 'Right Three', { birth: { year: 1975, precision: 'year' } })
    const relationships = [
      spouse('lf', 'lm'),
      spouse('rf', 'rm'),
      spouse('l2', 'r2'),
      parentChild('lf', 'l1'),
      parentChild('lm', 'l1'),
      parentChild('lf', 'l2'),
      parentChild('lm', 'l2'),
      parentChild('lf', 'l3'),
      parentChild('lm', 'l3'),
      parentChild('rf', 'r1'),
      parentChild('rm', 'r1'),
      parentChild('rf', 'r2'),
      parentChild('rm', 'r2'),
      parentChild('rf', 'r3'),
      parentChild('rm', 'r3'),
    ]
    const graph = buildFamilyGraph(TEST_FAMILY_ID, [leftFather, leftMother, rightFather, rightMother, l1, l2, l3, r1, r2, r3], relationships)
    const model = projectFamilyGraph(graph)
    const persons = model.nodes.filter((node) => node.kind === 'person')
    const kindById = new Map(model.nodes.map((node) => [node.id, node.kind]))
    const structure = buildStructure(model.edges, kindById)
    const generations = assignGenerations(
      persons.map((node) => node.id),
      structure,
    )
    const gen1Ids = persons
      .filter((node) => (generations.get(node.id) ?? 0) === 1)
      .map((node) => node.id)
    const couples = crossFamilyCouplesAtRow(gen1Ids, structure)
    expect(couples).toEqual([['person:l2', 'person:r2']])
  })
})
