import { describe, expect, it } from 'vitest'
import { buildFamilyGraph } from '../../../domain/family-graph'
import { parentChild, person, spouse, TEST_FAMILY_ID } from '../../../test/fixtures/family'
import { assignGenerations, structureFromModel } from './family-structure'
import { buildElkGraph, elkIdForMembers, personPartition } from './elk-graph'
import { NODE_GAP, PERSON_W } from './layout-spacing'
import { projectFamilyGraph } from './project-family-graph'

function build(people: ReturnType<typeof person>[], relationships: ReturnType<typeof spouse>[]) {
  const model = projectFamilyGraph(buildFamilyGraph(TEST_FAMILY_ID, people, relationships))
  const structure = structureFromModel(model)
  const persons = model.nodes.filter((node) => node.kind === 'person')
  const unions = model.nodes.filter((node) => node.kind === 'union')
  const generations = assignGenerations(persons.map((node) => node.id), structure)
  return { built: buildElkGraph(persons, unions, structure, generations), model }
}

describe('buildElkGraph', () => {
  it('assigns generation partitions to couple and child containers', () => {
    const { built } = build(
      [
        person('amy', 'Amy', { birth: { year: 1970, precision: 'year' } }),
        person('bob', 'Bob', { birth: { year: 1971, precision: 'year' } }),
        person('c1', 'C1', { birth: { year: 2000, precision: 'year' } }),
        person('c2', 'C2', { birth: { year: 2002, precision: 'year' } }),
      ],
      [
        spouse('amy', 'bob'),
        parentChild('amy', 'c1'),
        parentChild('bob', 'c1'),
        parentChild('amy', 'c2'),
        parentChild('bob', 'c2'),
      ],
    )
    const coupleId = elkIdForMembers(['person:amy', 'person:bob'])
    const couple = built.graph.children?.find((node) => node.id === coupleId)
    const child = built.graph.children?.find((node) => node.id === 'person:c1')
    expect(couple?.layoutOptions?.['elk.partitioning.partition']).toBe(String(personPartition(0)))
    expect(child?.layoutOptions?.['elk.partitioning.partition']).toBe(String(personPartition(1)))
    expect(couple?.width).toBe(2 * PERSON_W + NODE_GAP)
    expect(built.graph.children?.some((node) => node.id.startsWith('union:'))).toBe(false)
  })

  it('omits person-to-person spouse edges from the ELK DAG', () => {
    const { built } = build(
      [
        person('amy', 'Amy', { birth: { year: 1970, precision: 'year' } }),
        person('bob', 'Bob', { birth: { year: 1971, precision: 'year' } }),
        person('c1', 'C1', { birth: { year: 2000, precision: 'year' } }),
      ],
      [spouse('amy', 'bob'), parentChild('amy', 'c1'), parentChild('bob', 'c1')],
    )
    const mate = built.graph.edges?.some((edge) => {
      const source = edge.sources[0]
      const target = edge.targets[0]
      return source.startsWith('person:') && target.startsWith('person:')
    })
    expect(mate).toBe(false)
    const coupleId = elkIdForMembers(['person:amy', 'person:bob'])
    expect(
      built.graph.edges?.some((edge) => edge.sources[0] === coupleId && edge.targets[0] === 'person:c1'),
    ).toBe(true)
  })

  it('maps both partners onto one couple container', () => {
    const { built } = build(
      [
        person('amy', 'Amy', { birth: { year: 1970, precision: 'year' } }),
        person('bob', 'Bob', { birth: { year: 1971, precision: 'year' } }),
      ],
      [spouse('amy', 'bob')],
    )
    const coupleId = elkIdForMembers(['person:amy', 'person:bob'])
    expect(built.personToElkId.get('person:amy')).toBe(coupleId)
    expect(built.personToElkId.get('person:bob')).toBe(coupleId)
    expect(built.elkMembers.get(coupleId)).toEqual(['person:amy', 'person:bob'])
  })

  it('orders union-to-child edges by birth year', () => {
    const { built } = build(
      [
        person('amy', 'Amy', { birth: { year: 1970, precision: 'year' } }),
        person('c2', 'C2', { birth: { year: 2002, precision: 'year' } }),
        person('c1', 'C1', { birth: { year: 2000, precision: 'year' } }),
      ],
      [parentChild('amy', 'c2'), parentChild('amy', 'c1')],
    )
    const childEdges = built.graph.edges?.filter((edge) => edge.sources[0] === 'person:amy') ?? []
    expect(childEdges.map((edge) => edge.targets[0])).toEqual(['person:c1', 'person:c2'])
  })
})
