import { describe, expect, it } from 'vitest'
import {
  hiddenPersonIds,
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
    person('carmen', 'Carmen'),
    person('markus', 'Markus'),
    person('jim', 'Jim'),
    person('inlaw', 'Inlaw'),
  ]
  const relationships = [
    spouse('antonio', 'josefa'),
    parentChild('antonio', 'carmen'),
    parentChild('josefa', 'carmen'),
    spouse('carmen', 'markus'),
    parentChild('carmen', 'jim'),
    parentChild('markus', 'jim'),
    spouse('jim', 'inlaw'),
  ]
  const graph = buildFamilyGraph(TEST_FAMILY_ID, people, relationships)
  const coupleUnion = 'union:antonio|josefa'
  const carmenUnion = 'union:carmen|markus'

  it('identifies a child with the union of their recorded parents', () => {
    expect(unionIdForChild(graph, 'carmen')).toBe(coupleUnion)
    expect(unionIdForChild(graph, 'jim')).toBe(carmenUnion)
    expect(unionIdForChild(graph, 'antonio')).toBeNull()
  })

  it('hides descendants and their in-laws, not the folded couple', () => {
    const hidden = hiddenPersonIds(graph, new Set([coupleUnion]))
    expect([...hidden].sort()).toEqual(['carmen', 'inlaw', 'jim', 'markus'])
    expect(hidden.has('antonio')).toBe(false)
    expect(hidden.has('josefa')).toBe(false)
  })

  it('hides only the children of that union, not a sibling partnership', () => {
    const hidden = hiddenPersonIds(graph, new Set([carmenUnion]))
    expect([...hidden].sort()).toEqual(['inlaw', 'jim'])
    expect(hidden.has('carmen')).toBe(false)
    expect(hidden.has('markus')).toBe(false)
  })

  it('toggles a union collapsed and expanded', () => {
    const collapsed = toggleCollapsedUnion(graph, new Set(), coupleUnion)
    expect(collapsed.has(coupleUnion)).toBe(true)
    const expanded = toggleCollapsedUnion(graph, collapsed, coupleUnion)
    expect(expanded.size).toBe(0)
  })

  it('lists collapsed unions that currently hide a person', () => {
    const collapsed = new Set([coupleUnion, carmenUnion])
    expect(unionsHidingPerson(graph, collapsed, 'jim').sort()).toEqual([coupleUnion, carmenUnion])
    expect(unionsHidingPerson(graph, collapsed, 'antonio')).toEqual([])
  })

  it('hides a child with an extra bogus parent when the couple is folded', () => {
    const extra = person('extra', 'Extra')
    const messy = buildFamilyGraph(TEST_FAMILY_ID, [...people, extra], [
      ...relationships,
      parentChild('extra', 'carmen'),
    ])
    const hidden = hiddenPersonIds(messy, new Set([coupleUnion]))
    expect(hidden.has('carmen')).toBe(true)
    expect(hidden.has('jim')).toBe(true)
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
    expect(hidden.has('carmen')).toBe(true)
  })
})
