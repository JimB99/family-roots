import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildVerifiedRelationships, parseStammGrid } from './stamm-parser.ts'
import type { ParsedPerson, ParseReport } from './stamm-parser.ts'

function expect(value: unknown) {
  return {
    toBe(expected: unknown) {
      assert.equal(value, expected)
    },
    toEqual(expected: unknown) {
      assert.deepEqual(value, expected)
    },
    toHaveLength(length: number) {
      assert.equal((value as { length: number }).length, length)
    },
    toBeTruthy() {
      assert.ok(value)
    },
  }
}

function displayName(person: ParsedPerson): string {
  return `${person.givenNames}${person.familyName ? ` ${person.familyName}` : ''}`.trim()
}

function personByName(report: ParseReport, name: string): ParsedPerson {
  const person = report.people.find((candidate) => displayName(candidate) === name)
  if (!person) throw new Error(`Missing person ${name}`)
  return person
}

function hasRel(report: ParseReport, type: string, a: string, b: string): boolean {
  const ids = {
    a: personByName(report, a).importKey,
    b: personByName(report, b).importKey,
  }
  return report.relationships.some(
    (rel) =>
      rel.type === type &&
      ((rel.personAKey === ids.a && rel.personBKey === ids.b) ||
        (type === 'spouse' && rel.personAKey === ids.b && rel.personBKey === ids.a)),
  )
}

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
    expect(report.people).toHaveLength(5)
    expect(hasRel(report, 'spouse', 'Parent A', 'Parent B')).toBe(true)
    expect(hasRel(report, 'parent_child', 'Parent A', 'Child A')).toBe(true)
    expect(hasRel(report, 'parent_child', 'Parent B', 'Child A')).toBe(true)
    expect(hasRel(report, 'parent_child', 'Parent A', 'Child B')).toBe(true)
    expect(hasRel(report, 'parent_child', 'Parent B', 'Child B')).toBe(true)
  })

  it('keeps underscore spouses and unknown children as distinct standardized people', () => {
    const grid = [
      ['Parent', '__.__.__', '─┤', '', '', '', ''],
      ['______________', '__.__.__', '│', '', '', '', ''],
      ['', '', '├─', '??? niño', '__.__.__', '', ''],
      ['', '', '└─', '??? niño', '__.__.__', '', ''],
    ]

    const report = parseStammGrid(grid)
    expect(report.people).toHaveLength(4)
    expect(report.people.filter((p) => p.givenNames === 'Unknown spouse')).toHaveLength(1)
    expect(report.people.filter((p) => p.givenNames === 'Unknown son')).toHaveLength(2)
    expect(report.people.filter((p) => p.gender === 'male')).toHaveLength(2)
  })

  it('reads adjacent cells as births and plus dates as deaths', () => {
    const grid = [['Person + 1994', 42350]]
    const report = parseStammGrid(grid)
    expect(report.people[0].birth?.year).toBe(2015)
    expect(report.people[0].death?.year).toBe(1994)
  })

  it('corrects an impossible 2000-century parent birth to the 1900s', () => {
    const grid = [
      ['Parent', 44248, '─┤', '', '', '', ''],
      ['Spouse', '__.__.__', '│', '', '', '', ''],
      ['', '', '└─', 'Child', 14785, '', ''],
    ]

    const report = parseStammGrid(grid)
    const parent = report.people.find((p) => p.givenNames === 'Parent')
    expect(parent?.birth?.year).toBe(1921)
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
    expect(childRelationships).toHaveLength(4)
  })

  it('does not parse the generation totals row as people', () => {
    const grid = [
      ['Person', '__.__.__', '', '', '', '', ''],
      [4, '', '', 19, '', '', 72, '', '', 121, '', '', 70, '', 286],
    ]
    const report = parseStammGrid(grid)
    expect(report.people).toHaveLength(1)
    expect(report.controlTotals).toEqual([4, 19, 72, 121, 70])
    expect(report.expectedPeople).toBe(286)
  })

  it('builds explicit screenshot-verified parent groups by row', () => {
    const grid = [
      ['Parent', '01.01.20', '─┤', '', '', '', ''],
      ['Spouse', '01.01.22', '│', '', '', '', ''],
      ['', '', '└─', 'Child', '01.01.50', '', ''],
    ]
    const report = parseStammGrid(grid)
    const relationships = buildVerifiedRelationships(report.people, [[1, [3]]])
    expect(relationships.filter((rel) => rel.type === 'parent_child')).toHaveLength(2)
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
    expect(
      report.relationships
        .filter((relationship) => relationship.type === 'parent_child')
        .every(
          (relationship) =>
            byKey.get(relationship.personBKey)!.col - byKey.get(relationship.personAKey)!.col === 3,
        ),
    ).toBe(true)
  })

  it('does not classify an adjacent person with an incoming branch as a spouse', () => {
    const grid = [
      ['Parent', '01.01.20', '─┤', '', '', '', ''],
      ['Spouse', '01.01.22', '│', '', '', '', ''],
      ['', '', '├─', 'Sibling A', '01.01.45', '', ''],
      ['', '', '└─', 'Sibling B', '01.01.50', '', ''],
    ]
    const report = parseStammGrid(grid)
    expect(hasRel(report, 'spouse', 'Sibling A', 'Sibling B')).toBe(false)
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
    expect(hasRel(report, 'parent_child', 'Carmen', 'Nadja')).toBe(true)
    expect(hasRel(report, 'parent_child', 'Markus', 'Nadja')).toBe(true)
  })

  it('joins three wrapped name lines and keeps death/birth from the block', () => {
    const grid = [
      ['Sebastián', '', '│', '', ''],
      ['  Domínguez', '', '│', '', ''],
      ['  Linares +', '__.__.75', '─┤', 'José', '__.__.08'],
      ['Catalina', '', '│', '', ''],
      ['  Benítez', '', '│', '', ''],
      ['  Montero +', '__.__.77', '│', '', ''],
    ]

    const report = parseStammGrid(grid)
    const father = personByName(report, 'Sebastián Domínguez Linares')
    const mother = personByName(report, 'Catalina Benítez Montero')
    expect(father.birth?.year).toBe(1875)
    expect(mother.birth?.year).toBe(1877)
    expect(report.people.filter((p) => p.col === 0)).toHaveLength(2)
    expect(hasRel(report, 'spouse', 'Sebastián Domínguez Linares', 'Catalina Benítez Montero')).toBe(
      true,
    )
    expect(hasRel(report, 'parent_child', 'Sebastián Domínguez Linares', 'José')).toBe(true)
    expect(hasRel(report, 'parent_child', 'Catalina Benítez Montero', 'José')).toBe(true)
  })

  it('treats a horizontal bar as a parent-child link to the person on the right', () => {
    const grid = [
      ['Parent', '01.01.50', '─┤', '', '', '', ''],
      ['Spouse', '01.01.52', '│', '', '', '', ''],
      ['', '', '├─', 'Child', '01.01.75', '───', 'Grandchild', '01.01.00'],
    ]

    const report = parseStammGrid(grid)
    expect(hasRel(report, 'parent_child', 'Child', 'Grandchild')).toBe(true)
    expect(hasRel(report, 'parent_child', 'Parent', 'Child')).toBe(true)
    expect(hasRel(report, 'parent_child', 'Spouse', 'Child')).toBe(true)
  })

  it('treats a T-junction bar as a child of the person on the left, with later siblings', () => {
    const grid = [
      ['Parent', '01.01.50', '─┤', 'First', '01.01.75', '─┬──', 'Bruna', '01.01.00'],
      ['Spouse', '01.01.52', '│', '', '', '└─', 'Nil', '01.01.02'],
    ]

    const report = parseStammGrid(grid)
    expect(hasRel(report, 'parent_child', 'First', 'Bruna')).toBe(true)
    expect(hasRel(report, 'parent_child', 'First', 'Nil')).toBe(true)
    expect(hasRel(report, 'spouse', 'First', 'Spouse')).toBe(false)
  })

  it('does not treat a sibling at a ─┬─ junction as the spouse of the sibling above', () => {
    const grid = [
      ['Parent', '01.01.20', '─┤', '', '', '', ''],
      ['Partner', '01.01.22', '│', '', '', '', ''],
      ['', '', '└─', 'Mario', '01.01.45', '', ''],
      ['', '', '─┬─', 'Gema', '01.01.48', '─┬─', 'Marina'],
    ]

    const report = parseStammGrid(grid)
    expect(hasRel(report, 'spouse', 'Mario', 'Gema')).toBe(false)
    expect(hasRel(report, 'parent_child', 'Parent', 'Mario')).toBe(true)
    expect(hasRel(report, 'parent_child', 'Parent', 'Gema')).toBe(true)
    expect(hasRel(report, 'parent_child', 'Gema', 'Marina')).toBe(true)
  })

  it('keeps a spouse who sits on the parent ─┤ row under a branched child', () => {
    const grid = [
      ['Parent', '01.01.20', '─┤', '', '', '', ''],
      ['Partner', '01.01.22', '│', '', '', '', ''],
      ['', '', '┌─', 'Antonio', '01.01.45', '───', 'Joel', '01.01.70'],
      ['', '', '─┤', 'Fina', '01.01.47', '', ''],
    ]

    const report = parseStammGrid(grid)
    expect(hasRel(report, 'spouse', 'Antonio', 'Fina')).toBe(true)
    expect(hasRel(report, 'parent_child', 'Parent', 'Fina')).toBe(false)
    expect(hasRel(report, 'parent_child', 'Parent', 'Antonio')).toBe(true)
    expect(hasRel(report, 'parent_child', 'Antonio', 'Joel')).toBe(true)
  })

  it('keeps an unknown ??? person as a child, not as a spouse of a later named person', () => {
    const grid = [
      ['Parent', '__.__.__', '─┤', '', '', '', ''],
      ['Partner', '__.__.__', '│', '', '', '', ''],
      ['', '', '├─', 'Armando', '__.__.__', '─┬─', 'María'],
      ['', '', '─┤', '______________', '__.__.__', '└─', '???'],
      ['', '', '├─', 'Lola', '__.__.__', '───', 'Germán', '16.07.88'],
    ]

    const report = parseStammGrid(grid)
    const unknownChild = report.people.find(
      (p) => p.givenNames === 'Unknown person' && p.col === 6,
    )
    expect(unknownChild).toBeTruthy()
    expect(hasRel(report, 'spouse', 'Unknown person', 'Germán')).toBe(false)
    expect(hasRel(report, 'parent_child', 'Armando', 'Unknown person')).toBe(true)
    expect(hasRel(report, 'parent_child', 'Lola', 'Germán')).toBe(true)
  })

  it('traces a later └─ sibling back through a horizontal bar to the same parents', () => {
    const grid = [
      ['Parent', '01.01.50', '─┤', '', '', '', ''],
      ['Partner', '01.01.52', '│', '', '', '', ''],
      ['', '', '├─', 'Elisa', '01.01.75', '───', 'Andrea', '01.01.00'],
      ['', '', '│', 'Antonio', '01.01.77', '└─', 'Dunia', '01.01.02'],
    ]

    const report = parseStammGrid(grid)
    expect(hasRel(report, 'parent_child', 'Elisa', 'Dunia')).toBe(true)
    expect(hasRel(report, 'parent_child', 'Antonio', 'Dunia')).toBe(true)
    expect(hasRel(report, 'parent_child', 'Elisa', 'Andrea')).toBe(true)
  })

  it('treats an underscore filler bar as a parent-child link', () => {
    const grid = [
      ['Parent', '01.01.50', '─┤', '', '', '', ''],
      ['Partner', '01.01.52', '│', '', '', '', ''],
      ['', '', '┌─', 'Isabel', '01.01.56', '__.__.__', 'Juan Antonio', '01.01.81'],
      ['', '', '│', 'José Carrasco', '', '└─', 'María José', '01.01.85'],
    ]

    const report = parseStammGrid(grid)
    expect(hasRel(report, 'parent_child', 'Isabel', 'Juan Antonio')).toBe(true)
    expect(hasRel(report, 'parent_child', 'José Carrasco', 'María José')).toBe(true)
    expect(hasRel(report, 'parent_child', 'Isabel', 'María José')).toBe(true)
  })

  it('treats a lone person to the right of ─┤ as a child of that couple', () => {
    const grid = [
      ['Anita', '01.01.50', '─┤', 'Finuca', '__.__.__', '', ''],
      ['Sebastián Rubialco', '__.__.__', '│', '', '', '', ''],
    ]

    const report = parseStammGrid(grid)
    expect(hasRel(report, 'spouse', 'Anita', 'Sebastián Rubialco')).toBe(true)
    expect(hasRel(report, 'parent_child', 'Anita', 'Finuca')).toBe(true)
    expect(hasRel(report, 'parent_child', 'Sebastián Rubialco', 'Finuca')).toBe(true)
  })

  it('marries a last child of one couple to the first child of another couple in the same column', () => {
    const grid = [
      ['Sebastián', '01.01.00', '─┤', '', '', '', ''],
      ['Catalina', '01.01.02', '│', '', '', '', ''],
      ['', '', '└─', 'María Josefa', '01.01.20', '', ''],
      ['', '', '┌─', 'Antonio', '01.01.22', '─┤', 'Pedro', '01.01.50'],
      ['Pedro Root', '01.01.05', '─┤', '', '', '', ''],
      ['Isabel Root', '01.01.07', '│', '', '', '', ''],
    ]

    const report = parseStammGrid(grid)
    expect(hasRel(report, 'spouse', 'María Josefa', 'Antonio')).toBe(true)
    expect(hasRel(report, 'parent_child', 'Sebastián', 'María Josefa')).toBe(true)
    expect(hasRel(report, 'parent_child', 'Pedro Root', 'Antonio')).toBe(true)
    expect(hasRel(report, 'parent_child', 'María Josefa', 'Pedro')).toBe(true)
    expect(hasRel(report, 'parent_child', 'Antonio', 'Pedro')).toBe(true)
  })
})
