import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  computeGenerations,
  getBirthYear,
  getConnectedComponents,
  pickDefaultProgenitor,
  sortPeople,
} from './tree.ts'
import type { Person, Relationship } from '../types/index.ts'

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
    assert.equal(components.length, 3)
    assert.equal(components[0].size, 2)
    assert.equal(components[0].memberIds.has('a'), true)
    assert.equal(components[0].memberIds.has('b'), true)
    assert.equal(components[1].size, 1)
    assert.equal(components[2].size, 1)
  })

  it('getBirthYear returns year or null', () => {
    assert.equal(getBirthYear(person('a', 'A', 1920)), 1920)
    assert.equal(getBirthYear(person('b', 'B')), null)
  })

  it('sortPeople sorts by name and birth year', () => {
    const people = [person('a', 'Zara', 1990), person('b', 'Anna', 1950), person('c', 'Bob')]
    const byName = sortPeople(people, 'name-asc')
    assert.equal(byName[0].givenNames, 'Anna')

    const byBirthAsc = sortPeople(people, 'birth-year-asc')
    assert.equal(byBirthAsc[0].givenNames, 'Anna')
    assert.equal(byBirthAsc[2].givenNames, 'Bob')

    const byBirthDesc = sortPeople(people, 'birth-year-desc')
    assert.equal(byBirthDesc[0].givenNames, 'Zara')
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
    assert.equal(gens.get('g1'), 0)
    assert.equal(gens.get('g2'), 1)
    assert.equal(gens.get('sp'), 1)
  })

  it('pickDefaultProgenitor prefers earliest parent with children', () => {
    const people = [person('old', 'Old', 1850), person('young', 'Young', 1900), person('child', 'Child', 1920)]
    const relationships = [parentChild('old', 'young'), parentChild('young', 'child')]
    assert.equal(pickDefaultProgenitor(people, relationships), 'old')
  })
})
