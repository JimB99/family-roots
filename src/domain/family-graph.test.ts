import { describe, expect, it } from 'vitest'
import { buildFamilyGraph } from './family-graph'
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
