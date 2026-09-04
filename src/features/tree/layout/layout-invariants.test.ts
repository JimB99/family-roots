import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { buildFamilyGraph } from '../../../domain/family-graph'
import { parentChild, person, spouse, TEST_FAMILY_ID } from '../../../test/fixtures/family'
import type { Person, Relationship } from '../../../types'
import { computeTreeLayout } from './compute-tree-layout'
import { structureFromModel } from './family-structure'
import {
  analyzeLayout,
  formatReport,
  invariantFailures,
  spouseGap,
} from './layout-invariants'
import { FAMILY_GAP, NODE_GAP, PERSON_W, SIBLING_GAP } from './layout-spacing'
import { projectFamilyGraph, type ProjectOptions } from './project-family-graph'
import type { PositionedLayout } from './layout-model'

async function layoutOf(people: Person[], relationships: Relationship[], options: ProjectOptions = {}) {
  const graph = buildFamilyGraph(TEST_FAMILY_ID, people, relationships)
  const model = projectFamilyGraph(graph, options)
  const layout = await computeTreeLayout(model)
  return { layout, report: analyzeLayout(layout, structureFromModel(model)), model }
}

function node(layout: PositionedLayout, personId: string) {
  const found = layout.nodes.find((entry) => entry.personId === personId)
  if (!found) throw new Error(`missing ${personId}`)
  return found
}

function centerX(layout: PositionedLayout, personId: string) {
  const found = node(layout, personId)
  return found.x + found.width / 2
}

function assertInvariants(
  report: ReturnType<typeof analyzeLayout>,
  options?: Parameters<typeof invariantFailures>[1],
) {
  const failures = invariantFailures(report, options)
  expect(failures, `${failures.join('; ')}\n${formatReport(report)}`).toEqual([])
}

function loadAguilar() {
  const fixturePath = join(dirname(fileURLToPath(import.meta.url)), 'aguilar-graph.fixture.json')
  const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as {
    people: Array<{ id: string; givenNames: string; familyName: string | null; birthYear: number | null }>
    relationships: Array<{ type: 'spouse' | 'parent_child'; a: string; b: string }>
  }
  const people = fixture.people.map((entry) =>
    person(entry.id, entry.givenNames, {
      familyName: entry.familyName,
      birth: entry.birthYear == null ? null : { year: entry.birthYear, precision: 'year' },
    }),
  )
  const relationships = fixture.relationships.map((entry) =>
    entry.type === 'spouse' ? spouse(entry.a, entry.b) : parentChild(entry.a, entry.b),
  )
  return { people, relationships }
}

describe('layout invariants S1–S10', () => {
  it('S1 — couple + two children baseline', async () => {
    const amy = person('amy', 'Amy', { birth: { year: 1970, precision: 'year' } })
    const bob = person('bob', 'Bob', { birth: { year: 1971, precision: 'year' } })
    const c1 = person('c1', 'C1', { birth: { year: 2000, precision: 'year' } })
    const c2 = person('c2', 'C2', { birth: { year: 2002, precision: 'year' } })
    const { layout, report } = await layoutOf(
      [amy, bob, c1, c2],
      [
        spouse('amy', 'bob'),
        parentChild('amy', 'c1'),
        parentChild('bob', 'c1'),
        parentChild('amy', 'c2'),
        parentChild('bob', 'c2'),
      ],
    )
    assertInvariants(report, { maxEmptyBand: PERSON_W })
    const gap = spouseGap(layout, 'amy', 'bob')
    expect(gap != null && gap <= NODE_GAP + 1, `spouses were ${gap}px apart`).toBe(true)
    expect(node(layout, 'amy').y).toBeLessThan(node(layout, 'c1').y)
  })

  it('S2a — wide fan + narrow cousin', async () => {
    const gp = person('gp', 'GP', { birth: { year: 1900, precision: 'year' } })
    const h = person('h', 'H', { birth: { year: 1930, precision: 'year' } })
    const hc = person('hc', 'HC', { birth: { year: 1931, precision: 'year' } })
    const d = person('d', 'D', { birth: { year: 1932, precision: 'year' } })
    const da = person('da', 'DA', { birth: { year: 1933, precision: 'year' } })
    const kids = ['k1', 'k2', 'k3', 'k4', 'k5'].map((id, i) =>
      person(id, id, { birth: { year: 1960 + i, precision: 'year' } }),
    )
    const a1 = person('a1', 'A1', { birth: { year: 1970, precision: 'year' } })
    const { report } = await layoutOf(
      [gp, h, hc, d, da, ...kids, a1],
      [
        parentChild('gp', 'h'),
        parentChild('gp', 'd'),
        spouse('h', 'hc'),
        spouse('d', 'da'),
        ...kids.flatMap((k) => [parentChild('h', k.id), parentChild('hc', k.id)]),
        parentChild('d', 'a1'),
        parentChild('da', 'a1'),
      ],
    )
    assertInvariants(report, { centerTol: 200, allowWidenedNatal: true })
  })

  it('S2b — one child each allows a smaller parent gap', async () => {
    const gp = person('gp', 'GP', { birth: { year: 1900, precision: 'year' } })
    const a = person('a', 'A', { birth: { year: 1930, precision: 'year' } })
    const asp = person('asp', 'ASp', { birth: { year: 1931, precision: 'year' } })
    const b = person('b', 'B', { birth: { year: 1932, precision: 'year' } })
    const bsp = person('bsp', 'BSp', { birth: { year: 1933, precision: 'year' } })
    const a1 = person('a1', 'A1', { birth: { year: 1960, precision: 'year' } })
    const b1 = person('b1', 'B1', { birth: { year: 1961, precision: 'year' } })
    const { report } = await layoutOf(
      [gp, a, asp, b, bsp, a1, b1],
      [
        parentChild('gp', 'a'),
        parentChild('gp', 'b'),
        spouse('a', 'asp'),
        spouse('b', 'bsp'),
        parentChild('a', 'a1'),
        parentChild('asp', 'a1'),
        parentChild('b', 'b1'),
        parentChild('bsp', 'b1'),
      ],
    )
    assertInvariants(report)
  })

  it('S2c — equal fans', async () => {
    const gp = person('gp', 'GP', { birth: { year: 1900, precision: 'year' } })
    const a = person('a', 'A', { birth: { year: 1930, precision: 'year' } })
    const asp = person('asp', 'ASp', { birth: { year: 1931, precision: 'year' } })
    const b = person('b', 'B', { birth: { year: 1932, precision: 'year' } })
    const bsp = person('bsp', 'BSp', { birth: { year: 1933, precision: 'year' } })
    const a1 = person('a1', 'A1', { birth: { year: 1960, precision: 'year' } })
    const a2 = person('a2', 'A2', { birth: { year: 1962, precision: 'year' } })
    const b1 = person('b1', 'B1', { birth: { year: 1961, precision: 'year' } })
    const b2 = person('b2', 'B2', { birth: { year: 1963, precision: 'year' } })
    const { report } = await layoutOf(
      [gp, a, asp, b, bsp, a1, a2, b1, b2],
      [
        parentChild('gp', 'a'),
        parentChild('gp', 'b'),
        spouse('a', 'asp'),
        spouse('b', 'bsp'),
        parentChild('a', 'a1'),
        parentChild('asp', 'a1'),
        parentChild('a', 'a2'),
        parentChild('asp', 'a2'),
        parentChild('b', 'b1'),
        parentChild('bsp', 'b1'),
        parentChild('b', 'b2'),
        parentChild('bsp', 'b2'),
      ],
    )
    assertInvariants(report)
  })

  it('S3 — widest generation is not youngest', async () => {
    const p = person('p', 'P', { birth: { year: 1940, precision: 'year' } })
    const s = person('s', 'S', { birth: { year: 1941, precision: 'year' } })
    const kids = ['c1', 'c2', 'c3', 'c4', 'c5'].map((id, i) =>
      person(id, id, { birth: { year: 1970 + i, precision: 'year' } }),
    )
    const gc1 = person('gc1', 'GC1', { birth: { year: 2000, precision: 'year' } })
    const { layout, report } = await layoutOf(
      [p, s, ...kids, gc1],
      [
        spouse('p', 's'),
        ...kids.flatMap((k) => [parentChild('p', k.id), parentChild('s', k.id)]),
        parentChild('c1', 'gc1'),
      ],
    )
    assertInvariants(report)
    const gen2 = layout.nodes.filter((n) => n.kind === 'person' && n.y === node(layout, 'c1').y)
    const gen3 = layout.nodes.filter((n) => n.kind === 'person' && n.y === node(layout, 'gc1').y)
    const width = (row: typeof gen2) =>
      Math.max(...row.map((n) => n.x + n.width)) - Math.min(...row.map((n) => n.x))
    expect(width(gen2)).toBeGreaterThan(width(gen3))
  })

  it('S4 — married couple sits between both natal sibling runs', async () => {
    const leftFather = person('lf', 'Left Father', { birth: { year: 1940, precision: 'year' } })
    const leftMother = person('lm', 'Left Mother', { birth: { year: 1942, precision: 'year' } })
    const rightFather = person('rf', 'Right Father', { birth: { year: 1941, precision: 'year' } })
    const rightMother = person('rm', 'Right Mother', { birth: { year: 1943, precision: 'year' } })
    const l1 = person('l1', 'Left One', { birth: { year: 1968, precision: 'year' } })
    const l2 = person('l2', 'Left Two', { birth: { year: 1970, precision: 'year' } })
    const l3 = person('l3', 'Left Three', { birth: { year: 1974, precision: 'year' } })
    const r1 = person('r1', 'Right One', { birth: { year: 1969, precision: 'year' } })
    const r2 = person('r2', 'Right Two', { birth: { year: 1971, precision: 'year' } })
    const r3 = person('r3', 'Right Three', { birth: { year: 1975, precision: 'year' } })
    const { layout, report } = await layoutOf(
      [leftFather, leftMother, rightFather, rightMother, l1, l2, l3, r1, r2, r3],
      [
        spouse('lf', 'lm'),
        spouse('rf', 'rm'),
        spouse('l2', 'r2'),
        parentChild('lf', 'l1'),
        parentChild('lm', 'l1'),
        parentChild('lf', 'l2'),
        parentChild('lm', 'l2'),
        parentChild('lf', 'l3'),
        parentChild('lm', 'l3'),
        parentChild('rf', 'r1'),
        parentChild('rm', 'r1'),
        parentChild('rf', 'r2'),
        parentChild('rm', 'r2'),
        parentChild('rf', 'r3'),
        parentChild('rm', 'r3'),
      ],
    )
    assertInvariants(report, { centerTol: 120, allowWidenedNatal: true })
    const row = ['l1', 'l2', 'l3', 'r1', 'r2', 'r3']
      .map((id) => ({ id, x: centerX(layout, id) }))
      .sort((a, b) => a.x - b.x)
      .map((entry) => entry.id)
    const leftUnmarried = row.filter((id) => id === 'l1' || id === 'l3')
    const rightUnmarried = row.filter((id) => id === 'r1' || id === 'r3')
    expect(Math.abs(row.indexOf(leftUnmarried[0]) - row.indexOf(leftUnmarried[1]))).toBe(1)
    expect(Math.abs(row.indexOf(rightUnmarried[0]) - row.indexOf(rightUnmarried[1]))).toBe(1)
    const coupleLeft = Math.min(row.indexOf('l2'), row.indexOf('r2'))
    const coupleRight = Math.max(row.indexOf('l2'), row.indexOf('r2'))
    expect(coupleRight).toBe(coupleLeft + 1)
    const leftMax = Math.max(row.indexOf('l1'), row.indexOf('l3'))
    const rightMin = Math.min(row.indexOf('r1'), row.indexOf('r3'))
    const leftMin = Math.min(row.indexOf('l1'), row.indexOf('l3'))
    const rightMax = Math.max(row.indexOf('r1'), row.indexOf('r3'))
    const betweenLeftThenRight = leftMax < coupleLeft && coupleRight < rightMin
    const betweenRightThenLeft = rightMax < coupleLeft && coupleRight < leftMin
    expect(betweenLeftThenRight || betweenRightThenLeft, `couple was not between natal runs: ${row.join(', ')}`).toBe(true)
  })

  it('S5 — only-child marriage packs next to in-law siblings', async () => {
    const leftFather = person('lf', 'Left Father', { birth: { year: 1940, precision: 'year' } })
    const leftMother = person('lm', 'Left Mother', { birth: { year: 1942, precision: 'year' } })
    const onlyChild = person('lc', 'Only Child', { birth: { year: 1965, precision: 'year' } })
    const rightFather = person('rf', 'Right Father', { birth: { year: 1941, precision: 'year' } })
    const rightMother = person('rm', 'Right Mother', { birth: { year: 1943, precision: 'year' } })
    const r1 = person('r1', 'Right One', { birth: { year: 1968, precision: 'year' } })
    const r2 = person('r2', 'Right Two', { birth: { year: 1972, precision: 'year' } })
    const r3 = person('r3', 'Right Three', { birth: { year: 1974, precision: 'year' } })
    const r4 = person('r4', 'Right Four', { birth: { year: 1976, precision: 'year' } })
    const { layout, report } = await layoutOf(
      [leftFather, leftMother, onlyChild, rightFather, rightMother, r1, r2, r3, r4],
      [
        spouse('lf', 'lm'),
        spouse('rf', 'rm'),
        spouse('lc', 'r2'),
        parentChild('lf', 'lc'),
        parentChild('lm', 'lc'),
        parentChild('rf', 'r1'),
        parentChild('rm', 'r1'),
        parentChild('rf', 'r2'),
        parentChild('rm', 'r2'),
        parentChild('rf', 'r3'),
        parentChild('rm', 'r3'),
        parentChild('rf', 'r4'),
        parentChild('rm', 'r4'),
      ],
    )
    assertInvariants(report, { allowWidenedNatal: true })
    const coupleRight = Math.max(node(layout, 'lc').x + node(layout, 'lc').width, node(layout, 'r2').x + node(layout, 'r2').width)
    const coupleLeft = Math.min(node(layout, 'lc').x, node(layout, 'r2').x)
    const nearestGap = ['r1', 'r3', 'r4']
      .map((id) => node(layout, id))
      .reduce((best, personNode) => {
        if (personNode.x >= coupleRight) return Math.min(best, personNode.x - coupleRight)
        return Math.min(best, coupleLeft - (personNode.x + personNode.width))
      }, Infinity)
    expect(nearestGap <= SIBLING_GAP + 1, `only-child couple was ${nearestGap}px from in-law siblings`).toBe(true)
  })

  it('S6 — removing a marriage returns the person to their sibling', async () => {
    const gp = person('gp', 'Founder', { birth: { year: 1920, precision: 'year' } })
    const sibling = person('sib', 'Sibling', { birth: { year: 1950, precision: 'year' } })
    const personA = person('a', 'Anchor', { birth: { year: 1952, precision: 'year' } })
    const firstSpouse = person('x', 'First Spouse', { birth: { year: 1953, precision: 'year' } })
    const firstSib = person('xs', 'First Spouse Sib', { birth: { year: 1954, precision: 'year' } })
    const xParent = person('xp', 'X Parent', { birth: { year: 1925, precision: 'year' } })
    const secondSpouse = person('y', 'Second Spouse', { birth: { year: 1956, precision: 'year' } })
    const { layout, report } = await layoutOf(
      [gp, sibling, personA, firstSpouse, firstSib, xParent, secondSpouse],
      [
        parentChild('gp', 'sib'),
        parentChild('gp', 'a'),
        parentChild('xp', 'x'),
        parentChild('xp', 'xs'),
        spouse('a', 'y'),
      ],
    )
    assertInvariants(report)
    const siblingGap = Math.abs(node(layout, 'sib').x - node(layout, 'a').x) - node(layout, 'sib').width
    expect(siblingGap <= SIBLING_GAP + 1, `anchor did not return next to sibling; gap was ${siblingGap}px`).toBe(true)
    const yGap = spouseGap(layout, 'a', 'y')
    expect(yGap != null && yGap <= NODE_GAP + 6, `remaining spouse was ${yGap}px from anchor`).toBe(true)
  })

  it('S7 — two spouses keep each child set under its own union', async () => {
    const amy = person('amy', 'Amy', { birth: { year: 1970, precision: 'year' } })
    const bob = person('bob', 'Bob', { birth: { year: 1968, precision: 'year' } })
    const chad = person('chad', 'Chad', { birth: { year: 1972, precision: 'year' } })
    const c1 = person('c1', 'C1', { birth: { year: 1998, precision: 'year' } })
    const c2 = person('c2', 'C2', { birth: { year: 2000, precision: 'year' } })
    const d1 = person('d1', 'D1', { birth: { year: 2004, precision: 'year' } })
    const { report } = await layoutOf(
      [amy, bob, chad, c1, c2, d1],
      [
        spouse('amy', 'bob'),
        spouse('amy', 'chad'),
        parentChild('amy', 'c1'),
        parentChild('bob', 'c1'),
        parentChild('amy', 'c2'),
        parentChild('bob', 'c2'),
        parentChild('amy', 'd1'),
        parentChild('chad', 'd1'),
      ],
    )
    assertInvariants(report, { centerTol: 120 })
  })

  it('S8 — collapsed union stays between visible parents', async () => {
    const gp = person('gp', 'Grandparent', { birth: { year: 1920, precision: 'year' } })
    const pa = person('pa', 'Parent A', { birth: { year: 1950, precision: 'year' } })
    const pb = person('pb', 'Parent B', { birth: { year: 1952, precision: 'year' } })
    const visiblePeople = [gp, pa, pb]
    const visibleRels = [parentChild('gp', 'pa'), spouse('pa', 'pb')]
    const { layout, report } = await layoutOf(visiblePeople, visibleRels, { retainUnionIds: ['union:pa|pb'] })
    assertInvariants(report)
    const union = layout.nodes.find((entry) => entry.id === 'union:pa|pb')
    expect(union).toBeDefined()
    expect(union!.y).toBeGreaterThan(node(layout, 'pa').y)
  })

  it('S9 — disconnected components do not overlap', async () => {
    const gp = person('gp', 'Grandparent', { birth: { year: 1920, precision: 'year' } })
    const pa = person('pa', 'Parent A', { birth: { year: 1950, precision: 'year' } })
    const pb = person('pb', 'Parent B', { birth: { year: 1952, precision: 'year' } })
    const ca = person('ca', 'Child A', { birth: { year: 1980, precision: 'year' } })
    const loners = Array.from({ length: 12 }, (_, i) => person(`solo-${i}`, `Solo ${i}`))
    const { layout, report } = await layoutOf(
      [gp, pa, pb, ca, ...loners],
      [parentChild('gp', 'pa'), spouse('pa', 'pb'), parentChild('pa', 'ca'), parentChild('pb', 'ca')],
    )
    assertInvariants(report, { maxEmptyBand: 3 * PERSON_W + FAMILY_GAP })
    expect(layout.components.length).toBe(13)
    for (let i = 0; i < layout.components.length; i++) {
      for (let j = i + 1; j < layout.components.length; j++) {
        const a = layout.components[i].bounds
        const b = layout.components[j].bounds
        const disjoint = a.maxX <= b.minX || b.maxX <= a.minX || a.maxY <= b.minY || b.maxY <= a.minY
        expect(disjoint, `components ${layout.components[i].id} and ${layout.components[j].id} overlap`).toBe(true)
      }
    }
  })

  it('S10 — Aguilar pedigree stays compact and centered', async () => {
    const { people, relationships } = loadAguilar()
    const { layout, report } = await layoutOf(people, relationships)
    assertInvariants(report, {
      centerTol: 2_500,
      maxWidth: 40_000,
      maxEmptyBand: 3 * PERSON_W,
      allowWidenedNatal: true,
      minCousinGap: 80,
    })

    const kids = ['3864a900c', '4fbac65bb', '6c1801f1e', '7877862bb', 'b96c1513'].map((id) => node(layout, id))
    const sortedKids = [...kids].sort((a, b) => a.x - b.x)
    const natalKids = sortedKids.filter((kid, index, list) => {
      if (list.length === 1) return true
      const prevGap = index === 0 ? Infinity : kid.x - (list[index - 1].x + list[index - 1].width)
      const nextGap = index === list.length - 1 ? Infinity : list[index + 1].x - (kid.x + kid.width)
      return prevGap <= FAMILY_GAP * 3 || nextGap <= FAMILY_GAP * 3
    })
    const herminiaMid = (centerX(layout, '2ec3fa2f') + centerX(layout, '1b261ca414')) / 2
    const kidsMid = natalKids.reduce((sum, entry) => sum + entry.x + entry.width / 2, 0) / natalKids.length
    expect(
      Math.abs(kidsMid - herminiaMid) < 3 * PERSON_W + 16,
      `Herminia couple at ${herminiaMid} vs natal children at ${kidsMid}\n${formatReport(report)}`,
    ).toBe(true)
  })
})
