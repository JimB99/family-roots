import { describe, expect, it } from 'vitest'
import { buildFamilyGraph } from './family-graph'
import { parentChild, person, spouse, TEST_FAMILY_ID } from '../test/fixtures/family'
import { buildConnectionPlan, getConnectionOptions, type ConnectionKind } from './valid-connections'
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

const parent = person('parent', 'Parent', { birth: { year: 1950, precision: 'year' } })
const child = person('child', 'Child', { birth: { year: 1980, precision: 'year' } })
const other = person('other', 'Other', { birth: { year: 1982, precision: 'year' } })

describe('getConnectionOptions', () => {
  it('returns no options when dropping a person onto themselves', () => {
    const options = getConnectionOptions(graphOf([parent], []), 'parent', 'parent', 'Parent')

    expect(options).toEqual([])
  })

  it('offers all four connections when dates leave every option open', () => {
    const undated = person('undated', 'Undated')
    const people = [parent, child, undated]
    const relationships = [parentChild('parent', 'child')]
    const options = getConnectionOptions(graphOf(people, relationships), 'undated', 'child', 'Child')

    expect(options.filter((o) => o.available).map((o) => o.kind).sort()).toEqual([
      'child',
      'parent',
      'sibling',
      'spouse',
    ])
  })

  it('blocks both parent-child directions when the two are close in age', () => {
    const people = [parent, child, other]
    const relationships = [parentChild('parent', 'child')]
    const options = getConnectionOptions(graphOf(people, relationships), 'other', 'child', 'Child')

    expect(options.filter((o) => o.available).map((o) => o.kind).sort()).toEqual([
      'sibling',
      'spouse',
    ])
  })

  it('blocks a duplicate parent-child link', () => {
    const option = optionFor([parent, child], [parentChild('parent', 'child')], 'child', 'parent', 'child')

    expect(option.available).toBe(false)
    expect(option.reasonCode).toBe('DUPLICATE_RELATIONSHIP')
  })

  it('blocks reversing an existing parent-child direction', () => {
    const option = optionFor([parent, child], [parentChild('parent', 'child')], 'parent', 'child', 'child')

    expect(option.available).toBe(false)
    expect(option.reasonCode).toBe('CONFLICTING_DIRECTION')
  })

  it('blocks a link that would create an ancestry cycle', () => {
    const grandparent = person('gp', 'Grandparent', { birth: { year: 1920, precision: 'year' } })
    const people = [grandparent, parent, child]
    const relationships = [parentChild('gp', 'parent'), parentChild('parent', 'child')]

    const option = optionFor(people, relationships, 'gp', 'child', 'child')

    expect(option.available).toBe(false)
    expect(option.reasonCode).toBe('ANCESTRY_CYCLE')
  })

  it('blocks a biologically implausible parent-child link', () => {
    const younger = person('younger', 'Younger', { birth: { year: 2010, precision: 'year' } })
    const older = person('older', 'Older', { birth: { year: 2008, precision: 'year' } })

    const option = optionFor([younger, older], [], 'younger', 'older', 'parent')

    expect(option.available).toBe(false)
    expect(option.reasonCode).toBe('BIOLOGICALLY_IMPLAUSIBLE_DATE')
  })

  it('blocks sibling when the target has no recorded parents', () => {
    const option = optionFor([parent, other], [], 'other', 'parent', 'sibling')

    expect(option.available).toBe(false)
    expect(option.reasonCode).toBe('NO_PARENTS_FOR_SIBLING')
  })

  it('creates one parent link per parent of the target for siblings', () => {
    const mother = person('mother', 'Mother', { birth: { year: 1952, precision: 'year' } })
    const people = [parent, mother, child, other]
    const relationships = [
      spouse('parent', 'mother'),
      parentChild('parent', 'child'),
      parentChild('mother', 'child'),
    ]

    const option = optionFor(people, relationships, 'other', 'child', 'sibling')

    expect(option.available).toBe(true)
    expect(option.drafts).toHaveLength(2)
    expect(option.drafts.every((d) => d.personBId === 'other')).toBe(true)
  })

  it('blocks a duplicate marriage', () => {
    const option = optionFor([parent, other], [spouse('parent', 'other')], 'other', 'parent', 'spouse')

    expect(option.available).toBe(false)
  })
})

describe('buildConnectionPlan', () => {
  it('writes one relationship per draft', () => {
    const option = optionFor([parent, other], [], 'other', 'parent', 'spouse')
    const plan = buildConnectionPlan(option)

    expect(plan.errors).toHaveLength(0)
    expect(plan.writes).toHaveLength(1)
    expect(plan.writes[0].collection).toBe('relationships')
    expect(plan.writes[0].data.confidence).toBe('manual')
  })

  it('refuses to build a plan for a blocked option', () => {
    const option = optionFor([parent, other], [], 'other', 'parent', 'sibling')
    const plan = buildConnectionPlan(option)

    expect(plan.errors).toHaveLength(1)
    expect(plan.writes).toHaveLength(0)
  })
})
