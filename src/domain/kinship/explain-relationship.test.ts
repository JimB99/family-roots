import { describe, expect, it } from 'vitest'
import { buildFamilyGraph } from '../family-graph'
import {
  DEEP_COUSIN_COLUMN_PEOPLE,
  DEEP_COUSIN_COLUMN_RELATIONSHIPS,
} from '../../test/fixtures/deep-cousin-column-scenario'
import {
  JOIN_HALF_SIBLING_HUB_PEOPLE,
  JOIN_HALF_SIBLING_HUB_RELATIONSHIPS,
} from '../../test/fixtures/join-half-sibling-hub-scenario'
import {
  KINSHIP_LINE_PEOPLE,
  KINSHIP_LINE_RELATIONSHIPS,
  KINSHIP_AUNT_SPOUSE_PEOPLE,
  KINSHIP_AUNT_SPOUSE_RELATIONSHIPS,
  KINSHIP_MARRIAGE_PEOPLE,
  KINSHIP_MARRIAGE_RELATIONSHIPS,
  KINSHIP_UNRELATED_PEOPLE,
  KINSHIP_UNRELATED_RELATIONSHIPS,
} from '../../test/fixtures/kinship-edge-cases'
import { parentChild, person, spouse, TEST_FAMILY_ID } from '../../test/fixtures/family'
import { explainRelationship } from './explain-relationship'
import { formatKinshipLabel } from './kinship-labels-en'
import { targetGender } from './explain-relationship'

function graph(people: typeof KINSHIP_LINE_PEOPLE, relationships: typeof KINSHIP_LINE_RELATIONSHIPS) {
  return buildFamilyGraph(TEST_FAMILY_ID, people, relationships)
}

describe('explainRelationship', () => {
  it('returns self for the same person', () => {
    const g = graph(KINSHIP_LINE_PEOPLE, KINSHIP_LINE_RELATIONSHIPS)
    const result = explainRelationship(g, 'child', 'child')
    expect(result.fromTo).toEqual({ category: 'self' })
  })

  it('identifies parent and grandparent', () => {
    const g = graph(KINSHIP_LINE_PEOPLE, KINSHIP_LINE_RELATIONSHIPS)
    expect(explainRelationship(g, 'child', 'parent').fromTo).toEqual({
      category: 'direct_ancestor',
      generationsUp: 1,
    })
    expect(explainRelationship(g, 'child', 'gp').fromTo).toEqual({
      category: 'direct_ancestor',
      generationsUp: 2,
    })
    expect(explainRelationship(g, 'parent', 'child').fromTo).toEqual({
      category: 'direct_descendant',
      generationsDown: 1,
    })
  })

  it('identifies grand-aunt collateral relationship', () => {
    const g = graph(KINSHIP_LINE_PEOPLE, KINSHIP_LINE_RELATIONSHIPS)
    const result = explainRelationship(g, 'child', 'gpa')
    expect(result.fromTo).toEqual({ category: 'collateral_aunt_uncle', generationsUp: 2 })
    expect(formatKinshipLabel(result.fromTo, targetGender(g, 'gpa'))).toBe('grandaunt')
  })

  it('identifies full and half siblings from fixtures', () => {
    const g = buildFamilyGraph(
      TEST_FAMILY_ID,
      JOIN_HALF_SIBLING_HUB_PEOPLE,
      JOIN_HALF_SIBLING_HUB_RELATIONSHIPS,
    )
    expect(explainRelationship(g, 'a1', 'a2').fromTo).toEqual({
      category: 'sibling',
      kind: 'full',
    })
    expect(explainRelationship(g, 'nadja', 'viktoria').fromTo.category).toBe('sibling')
    expect(explainRelationship(g, 'nadja', 'viktoria').fromTo).toMatchObject({ kind: 'half' })
  })

  it('identifies first cousins in deep cousin scenario', () => {
    const g = buildFamilyGraph(
      TEST_FAMILY_ID,
      DEEP_COUSIN_COLUMN_PEOPLE,
      DEEP_COUSIN_COLUMN_RELATIONSHIPS,
    )
    expect(explainRelationship(g, 'c1', 'd1').fromTo).toEqual({
      category: 'cousin',
      degree: 1,
      removal: 0,
    })
  })

  it('identifies spouse', () => {
    const g = buildFamilyGraph(
      TEST_FAMILY_ID,
      KINSHIP_MARRIAGE_PEOPLE,
      KINSHIP_MARRIAGE_RELATIONSHIPS,
    )
    expect(explainRelationship(g, 'carol', 'eve').fromTo).toEqual({ category: 'spouse' })
  })

  it('identifies in-law via sibling spouse', () => {
    const g = buildFamilyGraph(
      TEST_FAMILY_ID,
      KINSHIP_MARRIAGE_PEOPLE,
      KINSHIP_MARRIAGE_RELATIONSHIPS,
    )
    const result = explainRelationship(g, 'carol', 'helen')
    expect(result.fromTo).toEqual({
      category: 'in_law',
      via: { category: 'sibling', kind: 'full' },
    })
    expect(result.toFrom).toEqual({
      category: 'in_law',
      via: { category: 'sibling', kind: 'full' },
    })
    expect(formatKinshipLabel(result.fromTo, targetGender(g, 'helen'))).toBe('sister-in-law')
    expect(formatKinshipLabel(result.toFrom, targetGender(g, 'carol'))).toBe('sister-in-law')
  })

  it('uses reciprocal in-law descriptors for aunt spouse', () => {
    const g = buildFamilyGraph(
      TEST_FAMILY_ID,
      KINSHIP_AUNT_SPOUSE_PEOPLE,
      KINSHIP_AUNT_SPOUSE_RELATIONSHIPS,
    )
    const result = explainRelationship(g, 'jim', 'peter')
    expect(result.fromTo).toEqual({
      category: 'in_law',
      via: { category: 'collateral_aunt_uncle', generationsUp: 1 },
    })
    expect(result.toFrom).toEqual({
      category: 'in_law',
      via: { category: 'collateral_niece_nephew', generationsDown: 1 },
    })
    expect(formatKinshipLabel(result.fromTo, targetGender(g, 'peter'))).toBe('uncle-in-law')
    expect(formatKinshipLabel(result.toFrom, targetGender(g, 'jim'))).toBe('nephew-in-law')
    expect(formatKinshipLabel(result.fromTo, targetGender(g, 'peter'))).not.toBe(
      formatKinshipLabel(result.toFrom, targetGender(g, 'jim')),
    )
  })

  it('uses reciprocal parent and child in-law labels', () => {
    const g = buildFamilyGraph(
      TEST_FAMILY_ID,
      KINSHIP_MARRIAGE_PEOPLE,
      KINSHIP_MARRIAGE_RELATIONSHIPS,
    )
    const forward = explainRelationship(g, 'dan', 'ivan')
    const reverse = explainRelationship(g, 'ivan', 'dan')
    expect(formatKinshipLabel(forward.fromTo, targetGender(g, 'ivan'))).toBe('father-in-law')
    expect(formatKinshipLabel(reverse.fromTo, targetGender(g, 'dan'))).toBe('son-in-law')
  })

  it('identifies parent-in-law of spouse', () => {
    const g = buildFamilyGraph(
      TEST_FAMILY_ID,
      KINSHIP_MARRIAGE_PEOPLE,
      KINSHIP_MARRIAGE_RELATIONSHIPS,
    )
    expect(explainRelationship(g, 'carol', 'frank').fromTo).toEqual({
      category: 'parent_in_law',
      generationsUp: 1,
    })
  })

  it('identifies step-parent and step-sibling', () => {
    const g = buildFamilyGraph(
      TEST_FAMILY_ID,
      KINSHIP_MARRIAGE_PEOPLE,
      KINSHIP_MARRIAGE_RELATIONSHIPS,
    )
    expect(explainRelationship(g, 'leo', 'judy').fromTo).toEqual({ category: 'step_parent' })
    expect(explainRelationship(g, 'leo', 'mia').fromTo).toEqual({ category: 'step_sibling' })
  })

  it('identifies parent-in-law', () => {
    const g = buildFamilyGraph(
      TEST_FAMILY_ID,
      KINSHIP_MARRIAGE_PEOPLE,
      KINSHIP_MARRIAGE_RELATIONSHIPS,
    )
    expect(explainRelationship(g, 'dan', 'ivan').fromTo).toEqual({
      category: 'parent_in_law',
      generationsUp: 1,
    })
  })

  it('identifies child-in-law', () => {
    const g = buildFamilyGraph(
      TEST_FAMILY_ID,
      KINSHIP_MARRIAGE_PEOPLE,
      KINSHIP_MARRIAGE_RELATIONSHIPS,
    )
    expect(explainRelationship(g, 'dan', 'mary').fromTo).toEqual({
      category: 'child_in_law',
      generationsDown: 1,
    })
  })

  it('returns unrelated for disconnected components', () => {
    const people = [...KINSHIP_LINE_PEOPLE, ...KINSHIP_UNRELATED_PEOPLE]
    const g = buildFamilyGraph(TEST_FAMILY_ID, people, [
      ...KINSHIP_LINE_RELATIONSHIPS,
      ...KINSHIP_UNRELATED_RELATIONSHIPS,
    ])
    expect(explainRelationship(g, 'child', 'solo1').fromTo).toEqual({ category: 'unrelated' })
  })

  it('uses neutral labels for unknown gender', () => {
    const people = [
      person('u1', 'Unknown One', { gender: 'unknown' }),
      person('u2', 'Unknown Two', { gender: 'unknown' }),
    ]
    const relationships = [parentChild('u1', 'u2')]
    const g = buildFamilyGraph(TEST_FAMILY_ID, people, relationships)
    const result = explainRelationship(g, 'u2', 'u1')
    expect(formatKinshipLabel(result.fromTo, 'unknown')).toBe('parent')
  })

  it('prefers spouse over blood when both apply', () => {
    const people = [
      person('x', 'X', { gender: 'male' }),
      person('y', 'Y', { gender: 'female' }),
      person('gp', 'GP', { gender: 'male' }),
    ]
    const relationships = [
      parentChild('gp', 'x'),
      parentChild('gp', 'y'),
      spouse('x', 'y'),
    ]
    const g = buildFamilyGraph(TEST_FAMILY_ID, people, relationships)
    expect(explainRelationship(g, 'x', 'y').fromTo).toEqual({ category: 'spouse' })
  })
})
