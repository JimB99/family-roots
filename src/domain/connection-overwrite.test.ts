import { describe, expect, it } from 'vitest'
import { parentChild, person, spouse, TEST_FAMILY_ID } from '../test/fixtures/family'
import { buildFamilyGraph } from './family-graph'
import {
  buildConnectionPlan,
  getConnectionOptions,
  resolveOverwritePlan,
  type ConnectionKind,
} from './valid-connections'
import type { Person, Relationship } from '../types'

function graphOf(people: Person[], relationships: Relationship[]) {
  return buildFamilyGraph(TEST_FAMILY_ID, people, relationships)
}

function optionFor(
  people: Person[],
  relationships: Relationship[],
  sourceId: string,
  targetId: string,
  kind: ConnectionKind,
) {
  const options = getConnectionOptions(graphOf(people, relationships), sourceId, targetId, 'Target')
  const option = options.find((o) => o.kind === kind)
  if (!option) throw new Error(`Missing option ${kind}`)
  return option
}

const father = person('father', 'Father', { birth: { year: 1950, precision: 'year' } })
const mother = person('mother', 'Mother', { birth: { year: 1952, precision: 'year' } })
const child = person('child', 'Child', { birth: { year: 1980, precision: 'year' } })
const otherParent = person('otherParent', 'Other Parent', { birth: { year: 1955, precision: 'year' } })
const sibling = person('sibling', 'Sibling', { birth: { year: 1982, precision: 'year' } })

describe('overwrite offers', () => {
  it('offers to replace a parent when the child already has two', () => {
    const people = [father, mother, child, otherParent]
    const relationships = [
      parentChild('father', 'child', 'pc-father'),
      parentChild('mother', 'child', 'pc-mother'),
    ]

    const option = optionFor(people, relationships, 'otherParent', 'child', 'parent')

    expect(option.available).toBe(false)
    expect(option.overwrite).toEqual({
      kind: 'replace_parent_link',
      childId: 'child',
      candidates: expect.arrayContaining([
        { relationshipId: 'pc-father', parentId: 'father' },
        { relationshipId: 'pc-mother', parentId: 'mother' },
      ]),
    })
    expect(option.overwrite?.kind === 'replace_parent_link' && option.overwrite.candidates).toHaveLength(2)
  })

  it('offers to remove the reverse parent-child link', () => {
    const people = [father, child]
    const relationships = [parentChild('father', 'child', 'pc-father')]

    const option = optionFor(people, relationships, 'father', 'child', 'child')

    expect(option.available).toBe(false)
    expect(option.overwrite).toMatchObject({
      kind: 'remove_conflicting_link',
      relationshipId: 'pc-father',
    })
  })

  it('offers to complete a sibling link when one parent is already recorded', () => {
    const people = [father, mother, child, sibling]
    const relationships = [
      spouse('father', 'mother'),
      parentChild('father', 'child'),
      parentChild('mother', 'child'),
      parentChild('father', 'sibling', 'pc-father-sibling'),
    ]

    const option = optionFor(people, relationships, 'sibling', 'child', 'sibling')

    expect(option.available).toBe(false)
    expect(option.overwrite).toEqual({
      kind: 'complete_partial_sibling',
      skipRelationshipIds: ['pc-father-sibling'],
    })
    expect(option.drafts).toHaveLength(1)
    expect(option.drafts[0]).toMatchObject({ personAId: 'mother', personBId: 'sibling' })
  })

  it('does not offer overwrite for an exact duplicate parent-child link', () => {
    const option = optionFor(
      [father, child],
      [parentChild('father', 'child')],
      'child',
      'father',
      'child',
    )

    expect(option.available).toBe(false)
    expect(option.overwrite).toBeUndefined()
    expect(option.reason).toMatch(/already exists/i)
  })

  it('does not offer overwrite for an ancestry cycle', () => {
    const gp = person('gp', 'Grandparent', { birth: { year: 1920, precision: 'year' } })
    const people = [gp, father, child]
    const relationships = [parentChild('gp', 'father'), parentChild('father', 'child')]

    const option = optionFor(people, relationships, 'gp', 'child', 'child')

    expect(option.available).toBe(false)
    expect(option.overwrite).toBeUndefined()
    expect(option.reason).toMatch(/cycle/i)
  })

  it('does not offer overwrite for biologically implausible dates', () => {
    const younger = person('younger', 'Younger', { birth: { year: 2010, precision: 'year' } })
    const older = person('older', 'Older', { birth: { year: 2008, precision: 'year' } })

    const option = optionFor([younger, older], [], 'younger', 'older', 'parent')

    expect(option.available).toBe(false)
    expect(option.overwrite).toBeUndefined()
  })
})

describe('resolveOverwritePlan', () => {
  it('deletes the chosen parent link and writes the new one', () => {
    const people = [father, mother, child, otherParent]
    const relationships = [
      parentChild('father', 'child', 'pc-father'),
      parentChild('mother', 'child', 'pc-mother'),
    ]
    const graph = graphOf(people, relationships)
    const option = optionFor(people, relationships, 'otherParent', 'child', 'parent')

    const plan = resolveOverwritePlan(graph, option, {
      kind: 'replace_parent_link',
      relationshipIdToRemove: 'pc-father',
    })

    expect(plan.errors).toHaveLength(0)
    expect(plan.deletes).toEqual([{ collection: 'relationships', id: 'pc-father' }])
    expect(plan.writes).toHaveLength(1)
    expect(plan.writes[0].data).toMatchObject({
      type: 'parent_child',
      personAId: 'otherParent',
      personBId: 'child',
    })
  })

  it('deletes the conflicting reverse link then writes the intended one', () => {
    const people = [father, child]
    const relationships = [parentChild('father', 'child', 'pc-father')]
    const graph = graphOf(people, relationships)
    const option = optionFor(people, relationships, 'father', 'child', 'child')

    const plan = resolveOverwritePlan(graph, option, { kind: 'remove_conflicting_link' })

    expect(plan.errors).toHaveLength(0)
    expect(plan.deletes).toEqual([{ collection: 'relationships', id: 'pc-father' }])
    expect(plan.writes).toHaveLength(1)
    expect(plan.writes[0].data).toMatchObject({
      type: 'parent_child',
      personAId: 'child',
      personBId: 'father',
    })
  })

  it('writes only the missing sibling parent links', () => {
    const people = [father, mother, child, sibling]
    const relationships = [
      spouse('father', 'mother'),
      parentChild('father', 'child'),
      parentChild('mother', 'child'),
      parentChild('father', 'sibling', 'pc-father-sibling'),
    ]
    const graph = graphOf(people, relationships)
    const option = optionFor(people, relationships, 'sibling', 'child', 'sibling')

    const plan = resolveOverwritePlan(graph, option, { kind: 'complete_partial_sibling' })

    expect(plan.errors).toHaveLength(0)
    expect(plan.deletes).toHaveLength(0)
    expect(plan.writes).toHaveLength(1)
    expect(plan.writes[0].data).toMatchObject({
      personAId: 'mother',
      personBId: 'sibling',
    })
  })
})

describe('buildConnectionPlan with deletes', () => {
  it('includes relationship deletes before writes', () => {
    const option = optionFor([father, otherParent], [], 'otherParent', 'father', 'spouse')
    const plan = buildConnectionPlan(option, { deleteRelationshipIds: ['old-link'] })

    expect(plan.errors).toHaveLength(0)
    expect(plan.deletes).toEqual([{ collection: 'relationships', id: 'old-link' }])
    expect(plan.writes).toHaveLength(1)
  })
})
