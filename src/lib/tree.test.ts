import { describe, expect, it } from 'vitest'
import {
  computeGenerations,
  getBirthYear,
  getConnectedComponents,
  pickDefaultProgenitor,
  sortPeople,
} from './tree'
import type { Person, Relationship } from '../types'

function person(id: string, givenNames: string, birthYear?: number): Person {
  return {
    id,
    familyId: 'fam',
    givenNames,
    familyName: 'Test',
    maidenName: null,
    gender: 'unknown',
    birth: birthYear ? { year: birthYear, precision: 'year' } : null,
    death: null,
    birthPlace: null,
    deathPlace: null,
    isLiving: null,
    photoBase64: null,
    notes: null,
    importKey: null,
  }
}

function parentChild(parentId: string, childId: string): Relationship {
  return {
    id: `${parentId}-${childId}`,
    familyId: 'fam',
    type: 'parent_child',
    personAId: parentId,
    personBId: childId,
    marriage: null,
    marriagePlace: null,
    endDate: null,
    endReason: null,
    confidence: 'manual',
    importMeta: null,
  }
}

describe('tree graph utilities', () => {
  it('getConnectedComponents groups related people and isolates singles', () => {
    const people = [person('a', 'A'), person('b', 'B'), person('c', 'C'), person('d', 'D')]
    const relationships = [parentChild('a', 'b')]

    const components = getConnectedComponents(people, relationships)
    expect(components.length).toBe(3)
    expect(components[0].size).toBe(2)
    expect(components[0].memberIds.has('a')).toBe(true)
    expect(components[0].memberIds.has('b')).toBe(true)
  })

  it('getBirthYear returns year or null', () => {
    expect(getBirthYear(person('a', 'A', 1920))).toBe(1920)
    expect(getBirthYear(person('b', 'B'))).toBeNull()
  })

  it('sortPeople sorts by name and birth year', () => {
    const people = [person('a', 'Zara', 1990), person('b', 'Anna', 1950), person('c', 'Bob')]
    const byName = sortPeople(people, 'name-asc')
    expect(byName[0].givenNames).toBe('Anna')
  })

  it('computeGenerations assigns relative generations from root', () => {
    const people = [
      person('g1', 'Gen1', 1900),
      person('g2', 'Gen2', 1925),
      person('sp', 'Spouse', 1926),
    ]
    const relationships: Relationship[] = [
      parentChild('g1', 'g2'),
      {
        id: 'sp-rel',
        familyId: 'fam',
        type: 'spouse',
        personAId: 'g2',
        personBId: 'sp',
        marriage: null,
        marriagePlace: null,
        endDate: null,
        endReason: null,
        confidence: 'manual',
        importMeta: null,
      },
    ]

    const gens = computeGenerations('g1', people, relationships)
    expect(gens.get('g1')).toBe(0)
    expect(gens.get('g2')).toBe(1)
    expect(gens.get('sp')).toBe(1)
  })

  it('pickDefaultProgenitor prefers earliest parent with children', () => {
    const people = [person('old', 'Old', 1850), person('young', 'Young', 1900), person('child', 'Child', 1920)]
    const relationships = [parentChild('old', 'young'), parentChild('young', 'child')]
    expect(pickDefaultProgenitor(people, relationships)).toBe('old')
  })
})
