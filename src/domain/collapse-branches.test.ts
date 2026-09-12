import { describe, expect, it } from 'vitest'
import {
  hiddenPersonIds,
  normalizeCollapsedUnionIds,
  toggleCollapsedUnion,
  unionsHidingPerson,
} from './collapse-branches'
import { unionIdForChild } from './union-id'
import { buildFamilyGraph } from './family-graph'
import { parentChild, person, spouse, TEST_FAMILY_ID } from '../test/fixtures/family'

describe('collapse branches', () => {
  const people = [
    person('antonio', 'Antonio'),
    person('josefa', 'Josefa'),
    person('clara', 'Clara'),
    person('alex', 'Alex'),
    person('jay', 'Jay'),
    person('inlaw', 'Inlaw'),
  ]
  const relationships = [
    spouse('antonio', 'josefa'),
    parentChild('antonio', 'clara'),
    parentChild('josefa', 'clara'),
    spouse('clara', 'alex'),
    parentChild('clara', 'jay'),
    parentChild('alex', 'jay'),
    spouse('jay', 'inlaw'),
  ]
  const graph = buildFamilyGraph(TEST_FAMILY_ID, people, relationships)
  const coupleUnion = 'union:antonio|josefa'
  const claraUnion = 'union:alex|clara'

  it('identifies a child with the union of their recorded parents', () => {
    expect(unionIdForChild(graph, 'clara')).toBe(coupleUnion)
    expect(unionIdForChild(graph, 'jay')).toBe(claraUnion)
    expect(unionIdForChild(graph, 'antonio')).toBeNull()
  })

  it('hides descendants and their in-laws, not the folded couple', () => {
    const hidden = hiddenPersonIds(graph, new Set([coupleUnion]))
    expect([...hidden].sort()).toEqual(['alex', 'clara', 'inlaw', 'jay'])
    expect(hidden.has('antonio')).toBe(false)
    expect(hidden.has('josefa')).toBe(false)
  })

  it('hides only the children of that union, not a sibling partnership', () => {
    const hidden = hiddenPersonIds(graph, new Set([claraUnion]))
    expect([...hidden].sort()).toEqual(['inlaw', 'jay'])
    expect(hidden.has('clara')).toBe(false)
    expect(hidden.has('alex')).toBe(false)
  })

  it('toggles a union collapsed and expanded', () => {
    const collapsed = toggleCollapsedUnion(graph, new Set(), coupleUnion)
    expect(collapsed.has(coupleUnion)).toBe(true)
    const expanded = toggleCollapsedUnion(graph, collapsed, coupleUnion)
    expect(expanded.size).toBe(0)
  })

  it('lists collapsed unions that currently hide a person', () => {
    const collapsed = new Set([coupleUnion, claraUnion])
    expect(unionsHidingPerson(graph, collapsed, 'jay').sort()).toEqual([claraUnion, coupleUnion])
    expect(unionsHidingPerson(graph, collapsed, 'antonio')).toEqual([])
  })

  it('hides a child with an extra bogus parent when the couple is folded', () => {
    const extra = person('extra', 'Extra')
    const messy = buildFamilyGraph(TEST_FAMILY_ID, [...people, extra], [
      ...relationships,
      parentChild('extra', 'clara'),
    ])
    const hidden = hiddenPersonIds(messy, new Set([coupleUnion]))
    expect(hidden.has('clara')).toBe(true)
    expect(hidden.has('jay')).toBe(true)
  })

  it('hides a child linked to only one parent of the folded couple', () => {
    const solo = person('solo', 'Solo Kid')
    const graphWithSolo = buildFamilyGraph(TEST_FAMILY_ID, [...people, solo], [
      ...relationships,
      parentChild('antonio', 'solo'),
    ])
    const hidden = hiddenPersonIds(graphWithSolo, new Set([coupleUnion]))
    expect(hidden.has('solo')).toBe(true)
  })

  it('hides an in-law and their entire separate family when folding a branch', () => {
    const ex = person('ex', 'Ex')
    const sidekid = person('sidekid', 'Side Kid')
    const withSideFamily = buildFamilyGraph(TEST_FAMILY_ID, [...people, ex, sidekid], [
      ...relationships,
      spouse('alex', 'ex'),
      parentChild('alex', 'sidekid'),
      parentChild('ex', 'sidekid'),
    ])
    const hidden = hiddenPersonIds(withSideFamily, new Set([coupleUnion]))
    expect(hidden.has('ex')).toBe(true)
    expect(hidden.has('sidekid')).toBe(true)
    expect(hidden.has('alex')).toBe(true)
    expect(hidden.has('clara')).toBe(true)
    expect(hidden.has('jay')).toBe(true)
    expect(hidden.has('inlaw')).toBe(true)
    expect(hidden.has('antonio')).toBe(false)
    expect(hidden.has('josefa')).toBe(false)
  })

  it('drops a nested fold when an ancestor fold hides its parents', () => {
    const collapsed = normalizeCollapsedUnionIds(graph, new Set([claraUnion, coupleUnion]))
    expect(collapsed.has(coupleUnion)).toBe(true)
    expect(collapsed.has(claraUnion)).toBe(false)

    const hidden = hiddenPersonIds(graph, collapsed)
    expect(hidden.has('clara')).toBe(true)
    expect(hidden.has('alex')).toBe(true)
    expect(hidden.has('jay')).toBe(true)
    expect(hidden.has('antonio')).toBe(false)
  })

  it('does not hide a child of a different marriage of one parent', () => {
    const otherSpouse = person('other', 'Other Spouse')
    const otherKid = person('otherkid', 'Other Kid')
    const twoMarriages = buildFamilyGraph(TEST_FAMILY_ID, [...people, otherSpouse, otherKid], [
      ...relationships,
      spouse('antonio', 'other'),
      parentChild('antonio', 'otherkid'),
      parentChild('other', 'otherkid'),
    ])
    const hidden = hiddenPersonIds(twoMarriages, new Set([coupleUnion]))
    expect(hidden.has('otherkid')).toBe(false)
    expect(hidden.has('other')).toBe(false)
    expect(hidden.has('clara')).toBe(true)
  })
})
