import { describe, expect, it } from 'vitest'
import { buildFamilyGraph } from './family-graph'
import { buildGraphFromPeople, validateRelationshipDraft } from './validate-relationship'
import { person, parentChild, TEST_FAMILY_ID } from '../test/fixtures/family'

describe('relationship validation', () => {
  const basePeople = [person('a', 'A', { birth: { year: 1970, precision: 'year' } }), person('b', 'B', { birth: { year: 1995, precision: 'year' } })]
  const baseGraph = () => buildGraphFromPeople(TEST_FAMILY_ID, basePeople, [])

  it('rejects self relationships', () => {
    const result = validateRelationshipDraft(baseGraph(), {
      type: 'parent_child',
      personAId: 'a',
      personBId: 'a',
      familyId: TEST_FAMILY_ID,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('SELF_RELATIONSHIP')
  })

  it('rejects duplicate parent links', () => {
    const graph = buildGraphFromPeople(TEST_FAMILY_ID, basePeople, [parentChild('a', 'b')])
    const result = validateRelationshipDraft(graph, {
      type: 'parent_child',
      personAId: 'a',
      personBId: 'b',
      familyId: TEST_FAMILY_ID,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('DUPLICATE_RELATIONSHIP')
  })

  it('rejects conflicting parent direction', () => {
    const graph = buildGraphFromPeople(TEST_FAMILY_ID, basePeople, [parentChild('a', 'b')])
    const result = validateRelationshipDraft(graph, {
      type: 'parent_child',
      personAId: 'b',
      personBId: 'a',
      familyId: TEST_FAMILY_ID,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('CONFLICTING_DIRECTION')
  })

  it('rejects ancestry cycles', () => {
    const people = [
      person('g1', 'G1', { birth: { year: 1940, precision: 'year' } }),
      person('g2', 'G2', { birth: { year: 1965, precision: 'year' } }),
      person('g3', 'G3', { birth: { year: 1990, precision: 'year' } }),
    ]
    const rels = [parentChild('g1', 'g2'), parentChild('g2', 'g3')]
    const graph = buildGraphFromPeople(TEST_FAMILY_ID, people, rels)
    const result = validateRelationshipDraft(graph, {
      type: 'parent_child',
      personAId: 'g3',
      personBId: 'g1',
      familyId: TEST_FAMILY_ID,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('ANCESTRY_CYCLE')
  })

  it('rejects cross-family endpoints', () => {
    const other = person('x', 'X', { familyId: 'other-family' })
    const graph = buildFamilyGraph(TEST_FAMILY_ID, [basePeople[0], other], [])
    const result = validateRelationshipDraft(graph, {
      type: 'spouse',
      personAId: 'a',
      personBId: 'x',
      familyId: TEST_FAMILY_ID,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('CROSS_FAMILY')
  })

  it('accepts valid spouse link', () => {
    const result = validateRelationshipDraft(baseGraph(), {
      type: 'spouse',
      personAId: 'a',
      personBId: 'b',
      familyId: TEST_FAMILY_ID,
    })
    expect(result.ok).toBe(true)
  })
})
