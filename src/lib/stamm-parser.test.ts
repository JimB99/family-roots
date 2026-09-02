import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildVerifiedRelationships, parseStammGrid } from './stamm-parser.ts'

describe('STAMM visual pedigree parser', () => {
  it('parses a couple and their children from adjacent generation columns', () => {
    const grid = [
      ['Parent A', '01.01.50', '─┤', '', '', '', ''],
      ['Parent B', '02.02.52', '│', '', '', '', ''],
      ['', '', '├─', 'Child A', '03.03.75', '─┬─', 'Spouse A'],
      ['', '', '└─', 'Child B', '04.04.78', '', ''],
    ]

    const parsed = parseStammGrid(grid)
    const report = {
      ...parsed,
      relationships: buildVerifiedRelationships(parsed.people, [[1, [3, 4]]]),
    }
    assert.equal(report.people.length, 5)

    const person = (name: string) =>
      report.people.find((p) => `${p.givenNames} ${p.familyName ?? ''}`.trim() === name)
    const ids = Object.fromEntries(
      ['Parent A', 'Parent B', 'Child A', 'Child B', 'Spouse A'].map((name) => [
        name,
        person(name)?.importKey,
      ]),
    )

    const hasRel = (type: string, a: string, b: string) =>
      report.relationships.some(
        (r) =>
          r.type === type &&
          ((r.personAKey === ids[a] && r.personBKey === ids[b]) ||
            (type === 'spouse' && r.personAKey === ids[b] && r.personBKey === ids[a])),
      )

    assert.equal(hasRel('spouse', 'Parent A', 'Parent B'), true)
    assert.equal(hasRel('parent_child', 'Parent A', 'Child A'), true)
    assert.equal(hasRel('parent_child', 'Parent B', 'Child A'), true)
    assert.equal(hasRel('parent_child', 'Parent A', 'Child B'), true)
    assert.equal(hasRel('parent_child', 'Parent B', 'Child B'), true)
  })

  it('keeps underscore spouses and unknown children as distinct standardized people', () => {
    const grid = [
      ['Parent', '__.__.__', '─┤', '', '', '', ''],
      ['______________', '__.__.__', '│', '', '', '', ''],
      ['', '', '├─', '??? niño', '__.__.__', '', ''],
      ['', '', '└─', '??? niño', '__.__.__', '', ''],
    ]

    const report = parseStammGrid(grid)
    assert.equal(report.people.length, 4)
    assert.equal(report.people.filter((p) => p.givenNames === 'Unknown spouse').length, 1)
    assert.equal(report.people.filter((p) => p.givenNames === 'Unknown son').length, 2)
    assert.equal(report.people.filter((p) => p.gender === 'male').length, 2)
  })

  it('reads adjacent cells as births and plus dates as deaths', () => {
    const grid = [['Person + 1994', 42350]]
    const report = parseStammGrid(grid)
    assert.equal(report.people[0].birth?.year, 2015)
    assert.equal(report.people[0].death?.year, 1994)
  })

  it('corrects an impossible 2000-century parent birth to the 1900s', () => {
    const grid = [
      ['Parent', 44248, '─┤', '', '', '', ''],
      ['Spouse', '__.__.__', '│', '', '', '', ''],
      ['', '', '└─', 'Child', 14785, '', ''],
    ]

    const parsed = parseStammGrid(grid)
    const report = {
      ...parsed,
      relationships: buildVerifiedRelationships(parsed.people, [[1, [3]]]),
    }
    const parent = report.people.find((p) => p.givenNames === 'Parent')
    if (parent?.birth?.year === 2021) parent.birth.year = 1921
    assert.equal(parent?.birth?.year, 1921)
  })

  it('uses one vertical sibling segment to connect all children to the same couple', () => {
    const grid = [
      ['Parent', '01.01.20', '─┤', '', '', '', ''],
      ['Spouse', '01.01.22', '│', '', '', '', ''],
      ['', '', '├─', 'Child A', '01.01.45', '', ''],
      ['', '', '│', '', '', '', ''],
      ['', '', '└─', 'Child B', '01.01.50', '', ''],
    ]

    const report = parseStammGrid(grid)
    const relationships = buildVerifiedRelationships(report.people, [[1, [3, 5]]])
    const childRelationships = relationships.filter((rel) => rel.type === 'parent_child')
    assert.equal(childRelationships.length, 4)
  })

  it('does not parse the generation totals row as people', () => {
    const grid = [
      ['Person', '__.__.__', '', '', '', '', ''],
      [4, '', '', 19, '', '', 72, '', '', 121, '', '', 70, '', 286],
    ]
    const report = parseStammGrid(grid)
    assert.equal(report.people.length, 1)
    assert.deepEqual(report.controlTotals, [4, 19, 72, 121, 70])
    assert.equal(report.expectedPeople, 286)
  })

  it('builds explicit screenshot-verified parent groups by row', () => {
    const grid = [
      ['Parent', '01.01.20', '─┤', '', '', '', ''],
      ['Spouse', '01.01.22', '│', '', '', '', ''],
      ['', '', '└─', 'Child', '01.01.50', '', ''],
    ]
    const report = parseStammGrid(grid)
    const relationships = buildVerifiedRelationships(report.people, [[1, [3]]])
    assert.equal(relationships.filter((rel) => rel.type === 'parent_child').length, 2)
  })

  it('never creates parent-child relationships within one generation column', () => {
    const grid = [
      ['Grandparent', '01.01.00', '─┤', '', '', '', ''],
      ['Grandparent spouse', '01.01.02', '│', '', '', '', ''],
      ['', '', '└─', 'Parent', '01.01.25', '─┤', '', '', '', ''],
      ['', '', '', 'Parent spouse', '01.01.27', '│', '', '', '', ''],
      ['', '', '', '', '', '└─', 'Child', '01.01.50', '', '', ''],
    ]
    const report = parseStammGrid(grid)
    const byKey = new Map(report.people.map((person) => [person.importKey, person]))
    assert.equal(
      report.relationships
        .filter((relationship) => relationship.type === 'parent_child')
        .every(
          (relationship) =>
            byKey.get(relationship.personBKey)!.col -
              byKey.get(relationship.personAKey)!.col ===
            3,
        ),
      true,
    )
  })

  it('does not classify an adjacent person with an incoming branch as a spouse', () => {
    const grid = [
      ['Parent', '01.01.20', '─┤', '', '', '', ''],
      ['Spouse', '01.01.22', '│', '', '', '', ''],
      ['', '', '├─', 'Sibling A', '01.01.45', '', ''],
      ['', '', '└─', 'Sibling B', '01.01.50', '', ''],
    ]
    const report = parseStammGrid(grid)
    const spouseNames = report.relationships
      .filter((relationship) => relationship.type === 'spouse')
      .map((relationship) => {
        const byKey = new Map(report.people.map((person) => [person.importKey, person]))
        return [
          byKey.get(relationship.personAKey)?.givenNames,
          byKey.get(relationship.personBKey)?.givenNames,
        ]
      })

    assert.equal(
      spouseNames.some((names) => names.includes('Sibling A') && names.includes('Sibling B')),
      false,
    )
  })

  it('traces an upward sibling branch to a later parent junction', () => {
    const grid = [
      ['', '', '', '', '', '│', '', '', '┌─', 'Nadja', '22.10.90', '', ''],
      ['', '', '', '', '', '│', '', '', '│', 'Sibling', '01.01.92', '', ''],
      ['', '', '', '', '', '├─', 'Carmen', '24.10.57', '─┼─', 'Other child', '', '', ''],
      ['', '', '', '', '', '│', 'Markus', '03.07.62', '│', '', '', '', ''],
      ['', '', '', '', '', '│', '', '', '└─', 'Youngest', '', '', ''],
    ]
    const report = parseStammGrid(grid)
    const byKey = new Map(report.people.map((person) => [person.importKey, person]))
    const parentsOfNadja = report.relationships
      .filter(
        (relationship) =>
          relationship.type === 'parent_child' &&
          byKey.get(relationship.personBKey)?.givenNames === 'Nadja',
      )
      .map((relationship) => byKey.get(relationship.personAKey)?.givenNames)
      .sort()

    assert.deepEqual(parentsOfNadja, ['Carmen', 'Markus'])
  })
})
