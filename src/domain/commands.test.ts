import { describe, expect, it } from 'vitest'
import { planAddRelative } from './commands'
import { buildFamilyGraph } from './family-graph'
import { parentChild, person, spouse, TEST_FAMILY_ID } from '../test/fixtures/family'

const anchor = person('a', 'Anchor')
const spousePerson = person('s', 'Spouse')

function graphWithSpouse() {
  return buildFamilyGraph(TEST_FAMILY_ID, [anchor, spousePerson], [spouse('a', 's')])
}

describe('planAddRelative', () => {
  it('rejects missing anchor', () => {
    const plan = planAddRelative(buildFamilyGraph(TEST_FAMILY_ID, [anchor], []), {
      anchorPersonId: 'missing',
      kind: 'child',
      familyId: TEST_FAMILY_ID,
      newPerson: {
        familyId: TEST_FAMILY_ID,
        givenNames: 'New',
        familyName: null,
        maidenName: null,
        gender: 'unknown',
        birth: null,
        death: null,
        birthPlace: null,
        deathPlace: null,
        isLiving: null,
        photoBase64: null,
        notes: null,
        importKey: null,
      },
    })
    expect(plan.errors.length).toBeGreaterThan(0)
  })

  it('plans a child relationship from anchor to new person', () => {
    const plan = planAddRelative(graphWithSpouse(), {
      anchorPersonId: 'a',
      kind: 'child',
      familyId: TEST_FAMILY_ID,
      newPerson: {
        familyId: TEST_FAMILY_ID,
        givenNames: 'Kid',
        familyName: 'Anchor',
        maidenName: null,
        gender: 'unknown',
        birth: null,
        death: null,
        birthPlace: null,
        deathPlace: null,
        isLiving: null,
        photoBase64: null,
        notes: null,
        importKey: null,
      },
    })
    expect(plan.errors).toEqual([])
    expect(plan.writes.some((w) => w.collection === 'people')).toBe(true)
    expect(plan.writes.some((w) => w.collection === 'relationships' && w.data.type === 'parent_child')).toBe(
      true,
    )
  })

  it('plans sibling via shared parents', () => {
    const gp = person('gp', 'GP')
    const graph = buildFamilyGraph(TEST_FAMILY_ID, [gp, anchor], [parentChild('gp', 'a')])
    const plan = planAddRelative(graph, {
      anchorPersonId: 'a',
      kind: 'sibling',
      familyId: TEST_FAMILY_ID,
      newPerson: {
        familyId: TEST_FAMILY_ID,
        givenNames: 'Sib',
        familyName: null,
        maidenName: null,
        gender: 'unknown',
        birth: null,
        death: null,
        birthPlace: null,
        deathPlace: null,
        isLiving: null,
        photoBase64: null,
        notes: null,
        importKey: null,
      },
    })
    expect(plan.errors).toEqual([])
    expect(plan.writes.filter((w) => w.collection === 'relationships').length).toBe(1)
  })

  it('rejects sibling when anchor has no parents', () => {
    const graph = buildFamilyGraph(TEST_FAMILY_ID, [anchor], [])
    const plan = planAddRelative(graph, {
      anchorPersonId: 'a',
      kind: 'sibling',
      familyId: TEST_FAMILY_ID,
    })
    expect(plan.errors.some((e) => e.message.includes('parents'))).toBe(true)
  })

  it('plans a parent relationship (new person as parent of anchor)', () => {
    const plan = planAddRelative(buildFamilyGraph(TEST_FAMILY_ID, [anchor], []), {
      anchorPersonId: 'a',
      kind: 'parent',
      familyId: TEST_FAMILY_ID,
      newPerson: {
        familyId: TEST_FAMILY_ID,
        givenNames: 'Parent',
        familyName: null,
        maidenName: null,
        gender: 'unknown',
        birth: null,
        death: null,
        birthPlace: null,
        deathPlace: null,
        isLiving: null,
        photoBase64: null,
        notes: null,
        importKey: null,
      },
    })
    expect(plan.errors).toEqual([])
    expect(
      plan.writes.some(
        (w) =>
          w.collection === 'relationships' &&
          w.data.type === 'parent_child' &&
          w.data.personBId === 'a',
      ),
    ).toBe(true)
  })

  it('plans a spouse relationship', () => {
    const plan = planAddRelative(buildFamilyGraph(TEST_FAMILY_ID, [anchor], []), {
      anchorPersonId: 'a',
      kind: 'spouse',
      familyId: TEST_FAMILY_ID,
      newPerson: {
        familyId: TEST_FAMILY_ID,
        givenNames: 'Partner',
        familyName: null,
        maidenName: null,
        gender: 'unknown',
        birth: null,
        death: null,
        birthPlace: null,
        deathPlace: null,
        isLiving: null,
        photoBase64: null,
        notes: null,
        importKey: null,
      },
    })
    expect(plan.errors).toEqual([])
    expect(plan.writes.some((w) => w.collection === 'relationships' && w.data.type === 'spouse')).toBe(
      true,
    )
  })
})
