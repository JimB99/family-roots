import { describe, expect, it } from 'vitest'
import {
  buildFamilyGraph,
  findRelationship,
  getChildLinks,
  getParentLinks,
  getSpouseLinks,
} from './family-graph'
import { person, parentChild, spouse, TEST_FAMILY_ID } from '../test/fixtures/family'

describe('family graph', () => {
  it('indexes parents, children, and spouses', () => {
    const people = [person('a', 'A'), person('b', 'B'), person('c', 'C')]
    const relationships = [parentChild('a', 'c'), spouse('a', 'b')]
    const graph = buildFamilyGraph(TEST_FAMILY_ID, people, relationships)

    expect(graph.parentsOf.get('c')?.has('a')).toBe(true)
    expect(graph.childrenOf.get('a')?.has('c')).toBe(true)
    expect(graph.spousesOf.get('a')?.has('b')).toBe(true)
    expect(graph.components.length).toBe(1)
    expect(graph.components[0].size).toBe(3)
  })

  it('flags disconnected people', () => {
    const people = [person('a', 'A'), person('b', 'B')]
    const graph = buildFamilyGraph(TEST_FAMILY_ID, people, [])
    expect(graph.issues.some((i) => i.code === 'DISCONNECTED_PERSON')).toBe(true)
    expect(graph.components.length).toBe(2)
  })

  it('flags unknown gender without coercing to male', () => {
    const people = [person('a', 'A', { gender: 'unknown' })]
    const graph = buildFamilyGraph(TEST_FAMILY_ID, people, [])
    expect(people[0].gender).toBe('unknown')
    expect(graph.issues.some((i) => i.code === 'UNKNOWN_GENDER')).toBe(true)
  })

  it('flags self relationships', () => {
    const people = [person('a', 'A')]
    const relationships = [parentChild('a', 'a')]
    const graph = buildFamilyGraph(TEST_FAMILY_ID, people, relationships)
    expect(graph.issues.some((i) => i.code === 'SELF_RELATIONSHIP')).toBe(true)
  })

  it('flags duplicate spouse relationships regardless of order', () => {
    const people = [person('a', 'A'), person('b', 'B')]
    const relationships = [spouse('a', 'b'), spouse('b', 'a', 'dup')]
    const graph = buildFamilyGraph(TEST_FAMILY_ID, people, relationships)
    expect(graph.issues.some((i) => i.code === 'DUPLICATE_RELATIONSHIP')).toBe(true)
  })
})

describe('relationship link helpers', () => {
  const father = person('father', 'Father')
  const mother = person('mother', 'Mother')
  const child = person('child', 'Child')
  const people = [father, mother, child]
  const relationships = [
    parentChild('father', 'child', 'pc-father'),
    parentChild('mother', 'child', 'pc-mother'),
    spouse('father', 'mother', 'sp-parents'),
  ]

  it('finds a relationship by draft endpoints and type', () => {
    const graph = buildFamilyGraph(TEST_FAMILY_ID, people, relationships)

    const found = findRelationship(graph, {
      type: 'parent_child',
      personAId: 'father',
      personBId: 'child',
      familyId: TEST_FAMILY_ID,
    })

    expect(found?.id).toBe('pc-father')
  })

  it('finds a spouse relationship regardless of person order', () => {
    const graph = buildFamilyGraph(TEST_FAMILY_ID, people, relationships)

    const found = findRelationship(graph, {
      type: 'spouse',
      personAId: 'mother',
      personBId: 'father',
      familyId: TEST_FAMILY_ID,
    })

    expect(found?.id).toBe('sp-parents')
  })

  it('returns parent links with the parent person and relationship row', () => {
    const graph = buildFamilyGraph(TEST_FAMILY_ID, people, relationships)
    const links = getParentLinks(graph, 'child')

    expect(links.map((link) => link.person.id).sort()).toEqual(['father', 'mother'])
    expect(links.map((link) => link.relationship.id).sort()).toEqual(['pc-father', 'pc-mother'])
  })

  it('returns child links from a parent', () => {
    const graph = buildFamilyGraph(TEST_FAMILY_ID, people, relationships)
    const links = getChildLinks(graph, 'father')

    expect(links).toHaveLength(1)
    expect(links[0].person.id).toBe('child')
    expect(links[0].relationship.id).toBe('pc-father')
  })

  it('returns spouse links', () => {
    const graph = buildFamilyGraph(TEST_FAMILY_ID, people, relationships)
    const links = getSpouseLinks(graph, 'father')

    expect(links).toHaveLength(1)
    expect(links[0].person.id).toBe('mother')
    expect(links[0].relationship.id).toBe('sp-parents')
  })
})
