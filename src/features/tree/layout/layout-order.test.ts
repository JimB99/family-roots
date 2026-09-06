import { describe, expect, it } from 'vitest'
import { buildFamilyGraph } from '../../../domain/family-graph'
import { parentChild, person, spouse, TEST_FAMILY_ID } from '../../../test/fixtures/family'
import { buildStructure } from './family-structure'
import { compareSiblingLayoutOrder, groupDirectChildIdsByUnion, shouldPackMultiUnionChildrenAsSiblings, sortSiblingChildIds, unionOrderForChild } from './layout-order'
import { projectFamilyGraph } from './project-family-graph'

describe('compareSiblingLayoutOrder', () => {
  it('sorts undated siblings alphabetically by label', () => {
    const structure = buildStructure([], new Map())
    const alpha = { id: 'person:alpha', birthYear: null, givenNames: 'Alpha', personId: 'alpha' }
    const mid = { id: 'person:mid', birthYear: null, givenNames: 'Mid', personId: 'mid' }
    const zebra = { id: 'person:zebra', birthYear: null, givenNames: 'Zebra', personId: 'zebra' }
    const members: string[] = []
    expect(compareSiblingLayoutOrder(alpha, mid, structure, members)).toBeLessThan(0)
    expect(compareSiblingLayoutOrder(mid, zebra, structure, members)).toBeLessThan(0)
  })

  it('keeps dated siblings before undated ones', () => {
    const structure = buildStructure([], new Map())
    const dated = { id: 'person:dated', birthYear: 1980, givenNames: 'Dated', personId: 'dated' }
    const unknown = { id: 'person:unknown', birthYear: null, givenNames: 'Unknown', personId: 'unknown' }
    expect(compareSiblingLayoutOrder(dated, unknown, structure, [])).toBeLessThan(0)
  })

  it('groups undated children by parent couple before alphabetizing', () => {
    const people = [
      person('a', 'A'),
      person('b', 'B'),
      person('c', 'C'),
      person('ab1', 'Ab1'),
      person('ab2', 'Ab2'),
      person('bc1', 'Bc1'),
      person('bc2', 'Bc2'),
    ]
    const relationships = [
      spouse('a', 'b'),
      spouse('b', 'c'),
      parentChild('a', 'ab1'),
      parentChild('b', 'ab1'),
      parentChild('a', 'ab2'),
      parentChild('b', 'ab2'),
      parentChild('b', 'bc1'),
      parentChild('c', 'bc1'),
      parentChild('b', 'bc2'),
      parentChild('c', 'bc2'),
    ]
    const model = projectFamilyGraph(buildFamilyGraph(TEST_FAMILY_ID, people, relationships))
    const structure = buildStructure(
      model.edges,
      new Map(model.nodes.map((node) => [node.id, node.kind])),
    )
    const nodeById = new Map(model.nodes.map((node) => [node.id, node]))
    const parentRowMembers = ['person:a', 'person:b', 'person:c']

    expect(unionOrderForChild('person:ab1', structure, parentRowMembers)).toBe(0)
    expect(unionOrderForChild('person:bc1', structure, parentRowMembers)).toBe(1)

    const sorted = sortSiblingChildIds(
      ['person:bc1', 'person:ab2', 'person:bc2', 'person:ab1'],
      structure,
      nodeById,
      parentRowMembers,
    )
    expect(sorted.map((id) => id.replace('person:', ''))).toEqual(['ab1', 'ab2', 'bc1', 'bc2'])
  })

  it('groups dated cousins by union before birth year within each union', () => {
    const people = [
      person('a', 'A'),
      person('b', 'B'),
      person('c', 'C'),
      person('d', 'D'),
      person('ab1', 'Ab1', { birth: { year: 1990, precision: 'year' } }),
      person('ab2', 'Ab2', { birth: { year: 1995, precision: 'year' } }),
      person('ab3', 'Ab3', { birth: { year: 2000, precision: 'year' } }),
      person('cd1', 'Cd1', { birth: { year: 1992, precision: 'year' } }),
      person('cd2', 'Cd2', { birth: { year: 1998, precision: 'year' } }),
    ]
    const relationships = [
      spouse('a', 'b'),
      spouse('c', 'd'),
      parentChild('a', 'ab1'),
      parentChild('b', 'ab1'),
      parentChild('a', 'ab2'),
      parentChild('b', 'ab2'),
      parentChild('a', 'ab3'),
      parentChild('b', 'ab3'),
      parentChild('c', 'cd1'),
      parentChild('d', 'cd1'),
      parentChild('c', 'cd2'),
      parentChild('d', 'cd2'),
    ]
    const model = projectFamilyGraph(buildFamilyGraph(TEST_FAMILY_ID, people, relationships))
    const structure = buildStructure(
      model.edges,
      new Map(model.nodes.map((node) => [node.id, node.kind])),
    )
    const nodeById = new Map(model.nodes.map((node) => [node.id, node]))
    const parentRowMembers = ['person:a', 'person:b', 'person:c', 'person:d']

    const sorted = sortSiblingChildIds(
      ['person:cd1', 'person:ab2', 'person:ab3', 'person:ab1', 'person:cd2'],
      structure,
      nodeById,
      parentRowMembers,
    )
    expect(sorted.map((id) => id.replace('person:', ''))).toEqual(['ab1', 'ab2', 'ab3', 'cd1', 'cd2'])

    const groups = groupDirectChildIdsByUnion(
      sorted,
      parentRowMembers,
      structure,
    )
    expect(groups.map((group) => group.map((id) => id.replace('person:', '')))).toEqual([
      ['ab1', 'ab2', 'ab3'],
      ['cd1', 'cd2'],
    ])
  })

  it('keeps mixed-parentage siblings in birth order when unions differ', () => {
    const people = [
      person('a', 'A', { birth: { year: 1970, precision: 'year' } }),
      person('b', 'B', { birth: { year: 1971, precision: 'year' } }),
      person('ab1', 'Ab1', { birth: { year: 2000, precision: 'year' } }),
      person('ab2', 'Ab2', { birth: { year: 2001, precision: 'year' } }),
      person('b3', 'B3', { birth: { year: 2002, precision: 'year' } }),
      person('ab4', 'Ab4', { birth: { year: 2003, precision: 'year' } }),
      person('ab5', 'Ab5', { birth: { year: 2004, precision: 'year' } }),
    ]
    const relationships = [
      spouse('a', 'b'),
      parentChild('a', 'ab1'),
      parentChild('b', 'ab1'),
      parentChild('a', 'ab2'),
      parentChild('b', 'ab2'),
      parentChild('b', 'b3'),
      parentChild('a', 'ab4'),
      parentChild('b', 'ab4'),
      parentChild('a', 'ab5'),
      parentChild('b', 'ab5'),
    ]
    const model = projectFamilyGraph(buildFamilyGraph(TEST_FAMILY_ID, people, relationships))
    const structure = buildStructure(
      model.edges,
      new Map(model.nodes.map((node) => [node.id, node.kind])),
    )
    const nodeById = new Map(model.nodes.map((node) => [node.id, node]))
    const parentRowMembers = ['person:a', 'person:b']

    const sorted = sortSiblingChildIds(
      ['person:ab5', 'person:b3', 'person:ab2', 'person:ab4', 'person:ab1'],
      structure,
      nodeById,
      parentRowMembers,
    )
    expect(sorted.map((id) => id.replace('person:', ''))).toEqual(['ab1', 'ab2', 'b3', 'ab4', 'ab5'])
  })
})

describe('shouldPackMultiUnionChildrenAsSiblings', () => {
  it('returns true for multi-spouse hub with leaf children from several unions', () => {
    const people = [
      person('hub', 'Hub'),
      person('wa', 'Wife A'),
      person('wb', 'Wife B'),
      person('c1', 'C1'),
      person('c2', 'C2'),
    ]
    const relationships = [
      spouse('hub', 'wa'),
      spouse('hub', 'wb'),
      parentChild('hub', 'c1'),
      parentChild('wa', 'c1'),
      parentChild('hub', 'c2'),
      parentChild('wb', 'c2'),
    ]
    const model = projectFamilyGraph(buildFamilyGraph(TEST_FAMILY_ID, people, relationships))
    const structure = buildStructure(
      model.edges,
      new Map(model.nodes.map((node) => [node.id, node.kind])),
    )
    const members = ['person:wa', 'person:hub', 'person:wb']
    const childIds = ['person:c1', 'person:c2']
    expect(shouldPackMultiUnionChildrenAsSiblings(members, childIds, structure)).toBe(true)
  })

  it('returns false when a direct child has nested descendants', () => {
    const people = [
      person('gp', 'GP'),
      person('hub', 'Hub'),
      person('wa', 'Wife A'),
      person('wb', 'Wife B'),
      person('c1', 'C1'),
      person('gc', 'GC'),
    ]
    const relationships = [
      parentChild('gp', 'hub'),
      spouse('hub', 'wa'),
      spouse('hub', 'wb'),
      parentChild('hub', 'c1'),
      parentChild('wa', 'c1'),
      parentChild('c1', 'gc'),
    ]
    const model = projectFamilyGraph(buildFamilyGraph(TEST_FAMILY_ID, people, relationships))
    const structure = buildStructure(
      model.edges,
      new Map(model.nodes.map((node) => [node.id, node.kind])),
    )
    const members = ['person:wa', 'person:hub', 'person:wb']
    const childIds = ['person:c1']
    expect(
      shouldPackMultiUnionChildrenAsSiblings(members, childIds, structure, {
        hasNestedChildBranches: true,
      }),
    ).toBe(false)
  })
})
