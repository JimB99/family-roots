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
  siblingOrderViolations,
  spouseGap,
  cousinGroupOrderViolations,
  coupleCenteringError,
  personMid,
} from './layout-invariants'
import { FAMILY_GAP, NODE_GAP, PERSON_W, SIBLING_GAP } from './layout-spacing'
import { projectFamilyGraph, type ProjectOptions } from './project-family-graph'
import type { PositionedLayout } from './layout-model'
import { LAYOUT_SCENARIO_REGISTRY } from '../../../test/fixtures/layout-scenario-registry'

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

describe('layout invariants — core spacing and unions', () => {
  it('Couple with two children — spouses adjacent, children below', async () => {
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

  it('Wide cousin fan beside narrow branch — no false widening', async () => {
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

  it('One child per cousin branch — compact parent spacing', async () => {
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

  it('Equal cousin fans — symmetric gaps', async () => {
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
    assertInvariants(report, { allowWidenedNatal: true })
  })

  it('Widest generation is not the youngest row', async () => {
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

  it('Cross-family marriage sits between natal sibling runs', async () => {
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

  it('Only-child marriage packs beside in-law siblings', async () => {
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

  it('Removed marriage returns person to natal sibling row', async () => {
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

  it('Two spouses — all children sibling-packed under full parent chain', async () => {
    const amy = person('amy', 'Amy', { birth: { year: 1970, precision: 'year' } })
    const bob = person('bob', 'Bob', { birth: { year: 1968, precision: 'year' } })
    const chad = person('chad', 'Chad', { birth: { year: 1972, precision: 'year' } })
    const c1 = person('c1', 'C1', { birth: { year: 1998, precision: 'year' } })
    const c2 = person('c2', 'C2', { birth: { year: 2000, precision: 'year' } })
    const d1 = person('d1', 'D1', { birth: { year: 2004, precision: 'year' } })
    const { layout, report } = await layoutOf(
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
    const spouses = [node(layout, 'bob'), node(layout, 'amy'), node(layout, 'chad')].sort(
      (a, b) => a.x - b.x,
    )
    expect(spouses.map((entry) => entry.personId)).toEqual(['bob', 'amy', 'chad'])
    expect(spouseGap(layout, 'amy', 'bob')).toBeLessThanOrEqual(NODE_GAP + 1)
    expect(spouseGap(layout, 'amy', 'chad')).toBeLessThanOrEqual(NODE_GAP + 1)
    const childOrder = ['c1', 'c2', 'd1']
      .map((id) => node(layout, id))
      .sort((a, b) => a.x - b.x)
      .map((entry) => entry.personId)
    expect(childOrder).toEqual(['c1', 'c2', 'd1'])
    const c2ToD1 = node(layout, 'd1').x - (node(layout, 'c2').x + node(layout, 'c2').width)
    expect(c2ToD1).toBe(SIBLING_GAP)
    const parentCenter =
      (spouses[0]!.x + spouses[spouses.length - 1]!.x + spouses[spouses.length - 1]!.width) / 2
    const childCenter =
      (node(layout, 'c1').x + node(layout, 'd1').x + node(layout, 'd1').width) / 2
    expect(Math.abs(parentCenter - childCenter)).toBeLessThan(1)
  })

  it('Collapsed union stays between visible parents', async () => {
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

  it('Disconnected components do not overlap', async () => {
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

  it('Single-parent child stays in birth-order sibling row', async () => {
    const a = person('a', 'A', { birth: { year: 1970, precision: 'year' } })
    const b = person('b', 'B', { birth: { year: 1971, precision: 'year' } })
    const ab1 = person('ab1', 'Ab1', { birth: { year: 2000, precision: 'year' } })
    const ab2 = person('ab2', 'Ab2', { birth: { year: 2001, precision: 'year' } })
    const b3 = person('b3', 'B3', { birth: { year: 2002, precision: 'year' } })
    const ab4 = person('ab4', 'Ab4', { birth: { year: 2003, precision: 'year' } })
    const ab5 = person('ab5', 'Ab5', { birth: { year: 2004, precision: 'year' } })
    const { layout, report, model } = await layoutOf(
      [a, b, ab1, ab2, b3, ab4, ab5],
      [
        spouse('a', 'b'),
        parentChild('a', 'ab1'),
        parentChild('b', 'ab1'),
        parentChild('a', 'ab2'),
        parentChild('b', 'ab2'),
        parentChild('b', 'b3'),
        parentChild('a', 'ab4'),
        parentChild('b', 'ab4'),
        parentChild('a', 'ab5'),
        parentChild('b', 'ab5'),
      ],
    )
    assertInvariants(report, { allowWidenedNatal: true })

    const ordered = ['ab1', 'ab2', 'b3', 'ab4', 'ab5']
      .map((id) => node(layout, id))
      .sort((left, right) => left.x - right.x)
    expect(ordered.map((entry) => entry.personId)).toEqual(['ab1', 'ab2', 'b3', 'ab4', 'ab5'])

    const coupleMid = (centerX(layout, 'a') + centerX(layout, 'b')) / 2
    const childMid =
      ordered.reduce((sum, entry) => sum + entry.x + entry.width / 2, 0) / ordered.length
    expect(Math.abs(childMid - coupleMid)).toBeLessThan(PERSON_W + 16)

    const struct = structureFromModel(model)
    expect(siblingOrderViolations(layout, struct)).toEqual([])
  })
})

describe('layout invariants — sibling order and multi-union hubs', () => {
  it('Children sorted oldest to youngest left to right', async () => {
    const fina = person('fina', 'Fina', { birth: { year: 1952, precision: 'year' } })
    const manoloSr = person('manolo-sr', 'Manolo', { birth: { year: 1952, precision: 'year' } })
    const alicia = person('alicia', 'Alicia', { birth: { year: 1980, precision: 'year' } })
    const jose = person('jose', 'Jose Carlos')
    const manolo = person('manolo', 'Manolo', { birth: { year: 1977, precision: 'year' } })
    const victor = person('victor', 'Victor', { birth: { year: 1985, precision: 'year' } })
    const pilar = person('pilar', 'Pilar')
    const { layout, model } = await layoutOf(
      [fina, manoloSr, alicia, jose, manolo, victor, pilar],
      [
        spouse('fina', 'manolo-sr'),
        parentChild('fina', 'alicia'),
        parentChild('manolo-sr', 'alicia'),
        parentChild('fina', 'manolo'),
        parentChild('manolo-sr', 'manolo'),
        parentChild('fina', 'victor'),
        parentChild('manolo-sr', 'victor'),
        spouse('alicia', 'jose'),
        spouse('victor', 'pilar'),
      ],
    )
    const order = ['manolo', 'alicia', 'victor']
      .map((id) => ({ id, x: node(layout, id).x }))
      .sort((a, b) => a.x - b.x)
      .map((entry) => entry.id)
    expect(order, `children were ${order.join(', ')}`).toEqual(['manolo', 'alicia', 'victor'])
    expect(siblingOrderViolations(layout, structureFromModel(model))).toEqual([])
  })

  it('Undated siblings sort after dated siblings', async () => {
    const pa = person('pa', 'Parent A', { birth: { year: 1950, precision: 'year' } })
    const pb = person('pb', 'Parent B', { birth: { year: 1951, precision: 'year' } })
    const dated = person('dated', 'Dated', { birth: { year: 1980, precision: 'year' } })
    const unknownA = person('unknown-a', 'Unknown A')
    const unknownB = person('unknown-b', 'Unknown B')
    const { layout, report, model } = await layoutOf(
      [pa, pb, dated, unknownA, unknownB],
      [
        spouse('pa', 'pb'),
        parentChild('pa', 'unknown-a'),
        parentChild('pb', 'unknown-a'),
        parentChild('pa', 'dated'),
        parentChild('pb', 'dated'),
        parentChild('pa', 'unknown-b'),
        parentChild('pb', 'unknown-b'),
      ],
    )
    assertInvariants(report)
    const order = ['dated', 'unknown-a', 'unknown-b']
      .map((id) => ({ id, x: node(layout, id).x }))
      .sort((a, b) => a.x - b.x)
      .map((entry) => entry.id)
    expect(order[0], `dated sibling was not leftmost: ${order.join(', ')}`).toBe('dated')
    expect(siblingOrderViolations(layout, structureFromModel(model))).toEqual([])
  })

  it('Undated siblings sort alphabetically left to right', async () => {
    const pa = person('pa', 'Parent A', { birth: { year: 1950, precision: 'year' } })
    const pb = person('pb', 'Parent B', { birth: { year: 1951, precision: 'year' } })
    const zebra = person('zebra', 'Zebra')
    const alpha = person('alpha', 'Alpha')
    const mid = person('mid', 'Mid')
    const { layout, report, model } = await layoutOf(
      [pa, pb, zebra, alpha, mid],
      [
        spouse('pa', 'pb'),
        parentChild('pa', 'zebra'),
        parentChild('pb', 'zebra'),
        parentChild('pa', 'alpha'),
        parentChild('pb', 'alpha'),
        parentChild('pa', 'mid'),
        parentChild('pb', 'mid'),
      ],
    )
    assertInvariants(report)
    const order = ['alpha', 'mid', 'zebra']
      .map((id) => ({ id, x: node(layout, id).x }))
      .sort((a, b) => a.x - b.x)
      .map((entry) => entry.id)
    expect(order, `children were ${order.join(', ')}`).toEqual(['alpha', 'mid', 'zebra'])
    expect(siblingOrderViolations(layout, structureFromModel(model))).toEqual([])
  })

  it('Multi-union undated children group by couple then name', async () => {
    const a = person('a', 'A')
    const b = person('b', 'B')
    const c = person('c', 'C')
    const ab1 = person('ab1', 'Ab1')
    const ab2 = person('ab2', 'Ab2')
    const bc1 = person('bc1', 'Bc1')
    const bc2 = person('bc2', 'Bc2')
    const { layout, report, model } = await layoutOf(
      [a, b, c, ab1, ab2, bc1, bc2],
      [
        spouse('a', 'b'),
        spouse('b', 'c'),
        parentChild('a', 'ab1'),
        parentChild('b', 'ab1'),
        parentChild('a', 'ab2'),
        parentChild('b', 'ab2'),
        parentChild('b', 'bc1'),
        parentChild('c', 'bc1'),
        parentChild('b', 'bc2'),
        parentChild('c', 'bc2'),
      ],
    )
    assertInvariants(report, { centerTol: 120 })
    const spouses = [node(layout, 'a'), node(layout, 'b'), node(layout, 'c')].sort((left, right) => left.x - right.x)
    expect(spouses.map((entry) => entry.personId)).toEqual(['a', 'b', 'c'])
    const childOrder = ['ab1', 'ab2', 'bc1', 'bc2']
      .map((id) => ({ id, x: node(layout, id).x }))
      .sort((left, right) => left.x - right.x)
      .map((entry) => entry.id)
    expect(childOrder, `children were ${childOrder.join(', ')}`).toEqual(['ab1', 'ab2', 'bc1', 'bc2'])
    expect(siblingOrderViolations(layout, structureFromModel(model))).toEqual([])

    const bc1Gap = node(layout, 'bc1').x - (node(layout, 'ab2').x + node(layout, 'ab2').width)
    expect(bc1Gap).toBe(SIBLING_GAP)
    const parentCenter =
      (node(layout, 'a').x + node(layout, 'c').x + node(layout, 'c').width) / 2
    const childCenter =
      (node(layout, 'ab1').x + node(layout, 'bc2').x + node(layout, 'bc2').width) / 2
    expect(Math.abs(parentCenter - childCenter)).toBeLessThan(1)
  })

  it('Multi-union dated children group by couple then birth year', async () => {
    const a = person('a', 'A', { birth: { year: 1960, precision: 'year' } })
    const b = person('b', 'B', { birth: { year: 1961, precision: 'year' } })
    const c = person('c', 'C', { birth: { year: 1962, precision: 'year' } })
    const ab1 = person('ab1', 'Ab1', { birth: { year: 1990, precision: 'year' } })
    const ab2 = person('ab2', 'Ab2', { birth: { year: 1995, precision: 'year' } })
    const ab3 = person('ab3', 'Ab3', { birth: { year: 2000, precision: 'year' } })
    const bc1 = person('bc1', 'Bc1', { birth: { year: 1992, precision: 'year' } })
    const bc2 = person('bc2', 'Bc2', { birth: { year: 1998, precision: 'year' } })
    const { layout, report, model } = await layoutOf(
      [a, b, c, ab1, ab2, ab3, bc1, bc2],
      [
        spouse('a', 'b'),
        spouse('b', 'c'),
        parentChild('a', 'ab1'),
        parentChild('b', 'ab1'),
        parentChild('a', 'ab2'),
        parentChild('b', 'ab2'),
        parentChild('a', 'ab3'),
        parentChild('b', 'ab3'),
        parentChild('b', 'bc1'),
        parentChild('c', 'bc1'),
        parentChild('b', 'bc2'),
        parentChild('c', 'bc2'),
      ],
    )
    assertInvariants(report, { centerTol: 120 })
    const childOrder = ['ab1', 'ab2', 'ab3', 'bc1', 'bc2']
      .map((id) => ({ id, x: node(layout, id).x }))
      .sort((left, right) => left.x - right.x)
      .map((entry) => entry.id)
    expect(childOrder, `children were ${childOrder.join(', ')}`).toEqual(['ab1', 'ab2', 'ab3', 'bc1', 'bc2'])
    expect(siblingOrderViolations(layout, structureFromModel(model))).toEqual([])

    const bc1Gap = node(layout, 'bc1').x - (node(layout, 'ab3').x + node(layout, 'ab3').width)
    expect(bc1Gap).toBe(SIBLING_GAP)
    const parentCenter =
      (node(layout, 'a').x + node(layout, 'c').x + node(layout, 'c').width) / 2
    const childCenter =
      (node(layout, 'ab1').x + node(layout, 'bc2').x + node(layout, 'bc2').width) / 2
    expect(Math.abs(parentCenter - childCenter)).toBeLessThan(1)
  })

  it('Two spouses flank the child-bearing hub', async () => {
    const hub = person('hub', 'Hub', { birth: { year: 1960, precision: 'year' } })
    const wifeA = person('wife-a', 'Wife A', { birth: { year: 1962, precision: 'year' } })
    const wifeB = person('wife-b', 'Wife B', { birth: { year: 1965, precision: 'year' } })
    const c1 = person('c1', 'C1', { birth: { year: 1990, precision: 'year' } })
    const c2 = person('c2', 'C2', { birth: { year: 1995, precision: 'year' } })
    const { layout, report } = await layoutOf(
      [hub, wifeA, wifeB, c1, c2],
      [
        spouse('hub', 'wife-a'),
        spouse('hub', 'wife-b'),
        parentChild('hub', 'c1'),
        parentChild('wife-a', 'c1'),
        parentChild('hub', 'c2'),
        parentChild('wife-b', 'c2'),
      ],
    )
    assertInvariants(report, { centerTol: 120 })
    const spouses = [node(layout, 'wife-a'), node(layout, 'hub'), node(layout, 'wife-b')].sort(
      (a, b) => a.x - b.x,
    )
    expect(spouses.map((entry) => entry.personId)).toEqual(['wife-a', 'hub', 'wife-b'])
    expect(spouseGap(layout, 'hub', 'wife-a')).toBeLessThanOrEqual(NODE_GAP + 1)
    expect(spouseGap(layout, 'hub', 'wife-b')).toBeLessThanOrEqual(NODE_GAP + 1)
    const cGap = node(layout, 'c2').x - (node(layout, 'c1').x + node(layout, 'c1').width)
    expect(cGap).toBe(SIBLING_GAP)
    const parentCenter =
      (spouses[0]!.x + spouses[spouses.length - 1]!.x + spouses[spouses.length - 1]!.width) / 2
    const childCenter = (node(layout, 'c1').x + node(layout, 'c2').x + node(layout, 'c2').width) / 2
    expect(Math.abs(parentCenter - childCenter)).toBeLessThan(1)
  })

  it('Sibling branches with spouses stay compact', async () => {
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
    assertInvariants(report, { maxEmptyBand: FAMILY_GAP + PERSON_W })
  })
})

function childOrder(layout: PositionedLayout, ids: string[]) {
  return ids
    .map((id) => ({ id, x: node(layout, id).x }))
    .sort((left, right) => left.x - right.x)
    .map((entry) => entry.id)
}

function coupleMid(layout: PositionedLayout, leftId: string, rightId: string) {
  return (centerX(layout, leftId) + centerX(layout, rightId)) / 2
}

function childClusterMid(layout: PositionedLayout, childIds: string[]) {
  const centers = childIds.map((id) => centerX(layout, id))
  return centers.reduce((sum, value) => sum + value, 0) / centers.length
}

describe('layout invariants — cousin row centering', () => {
  it('Cousin children grouped by union, not global birth year', async () => {
    const gp = person('gp', 'GP', { birth: { year: 1900, precision: 'year' } })
    const a = person('a', 'A', { birth: { year: 1930, precision: 'year' } })
    const asp = person('asp', 'ASp', { birth: { year: 1931, precision: 'year' } })
    const b = person('b', 'B', { birth: { year: 1932, precision: 'year' } })
    const bsp = person('bsp', 'BSp', { birth: { year: 1933, precision: 'year' } })
    const ab1 = person('ab1', 'Ab1', { birth: { year: 1990, precision: 'year' } })
    const ab2 = person('ab2', 'Ab2', { birth: { year: 1995, precision: 'year' } })
    const ab3 = person('ab3', 'Ab3', { birth: { year: 2000, precision: 'year' } })
    const cd1 = person('cd1', 'Cd1', { birth: { year: 1992, precision: 'year' } })
    const cd2 = person('cd2', 'Cd2', { birth: { year: 1998, precision: 'year' } })
    const { layout, report, model } = await layoutOf(
      [gp, a, asp, b, bsp, ab1, ab2, ab3, cd1, cd2],
      [
        parentChild('gp', 'a'),
        parentChild('gp', 'b'),
        spouse('a', 'asp'),
        spouse('b', 'bsp'),
        parentChild('a', 'ab1'),
        parentChild('asp', 'ab1'),
        parentChild('a', 'ab2'),
        parentChild('asp', 'ab2'),
        parentChild('a', 'ab3'),
        parentChild('asp', 'ab3'),
        parentChild('b', 'cd1'),
        parentChild('bsp', 'cd1'),
        parentChild('b', 'cd2'),
        parentChild('bsp', 'cd2'),
      ],
    )
    assertInvariants(report, { centerTol: PERSON_W + 32, allowWidenedNatal: true })
    const order = childOrder(layout, ['ab1', 'ab2', 'ab3', 'cd1', 'cd2'])
    expect(order, `children were ${order.join(', ')}; global birth would be ab1,ab2,cd1,ab3,cd2`).toEqual([
      'ab1',
      'ab2',
      'ab3',
      'cd1',
      'cd2',
    ])
    expect(cousinGroupOrderViolations(layout, structureFromModel(model))).toEqual([])
    expect(siblingOrderViolations(layout, structureFromModel(model))).toEqual([])
  })

  it('Each cousin couple centered over its own children (Diego/Jose tree)', async () => {
    const gp = person('gp', 'GP', { birth: { year: 1900, precision: 'year' } })
    const diego = person('diego', 'Diego', { birth: { year: 1906, precision: 'year' } })
    const franD = person('fran-d', 'Francisca', { birth: { year: 1893, precision: 'year' } })
    const jose = person('jose', 'Jose', { birth: { year: 1908, precision: 'year' } })
    const franJ = person('fran-j', 'Francisca L', { birth: { year: 1914, precision: 'year' } })
    const isabel = person('isabel', 'Isabel', { birth: { year: 1928, precision: 'year' } })
    const gaspar = person('gaspar', 'Gaspar', { birth: { year: 1925, precision: 'year' } })
    const paqui = person('paqui', 'Paqui', { birth: { year: 1937, precision: 'year' } })
    const manuel = person('manuel', 'Manuel', { birth: { year: 1935, precision: 'year' } })
    const maria = person('maria', 'Maria', { birth: { year: 1937, precision: 'year' } })
    const antonio = person('antonio', 'Antonio', { birth: { year: 1934, precision: 'year' } })
    const herminia = person('herminia', 'Herminia', { birth: { year: 1941, precision: 'year' } })
    const cristobal = person('cristobal', 'Cristobal', { birth: { year: 1938, precision: 'year' } })
    const fermin = person('fermin', 'Fermin', { birth: { year: 1965, precision: 'year' } })
    const { layout, report, model } = await layoutOf(
      [
        gp,
        diego,
        franD,
        jose,
        franJ,
        isabel,
        gaspar,
        paqui,
        manuel,
        maria,
        antonio,
        herminia,
        cristobal,
        fermin,
      ],
      [
        parentChild('gp', 'diego'),
        parentChild('gp', 'jose'),
        spouse('diego', 'fran-d'),
        spouse('jose', 'fran-j'),
        spouse('isabel', 'gaspar'),
        spouse('paqui', 'manuel'),
        spouse('maria', 'antonio'),
        spouse('herminia', 'cristobal'),
        parentChild('diego', 'isabel'),
        parentChild('fran-d', 'isabel'),
        parentChild('diego', 'paqui'),
        parentChild('fran-d', 'paqui'),
        parentChild('jose', 'maria'),
        parentChild('fran-j', 'maria'),
        parentChild('jose', 'herminia'),
        parentChild('fran-j', 'herminia'),
        parentChild('herminia', 'fermin'),
        parentChild('cristobal', 'fermin'),
      ],
    )
    const struct = structureFromModel(model)

    const diegoErr = coupleCenteringError(layout, struct, ['diego', 'fran-d'], ['isabel', 'paqui'])
    const joseMariaErr = coupleCenteringError(layout, struct, ['jose', 'fran-j'], ['maria', 'herminia'])
    expect(diegoErr, `Diego couple off by ${diegoErr}px`).toBeLessThan(PERSON_W + 16)
    expect(joseMariaErr, `Jose couple vs Maria off by ${joseMariaErr}px`).toBeLessThan(PERSON_W + 16)

    const diegoMid = coupleMid(layout, 'diego', 'fran-d')
    const isabelPaquiMid = childClusterMid(layout, ['isabel', 'paqui'])
    const joseMid = coupleMid(layout, 'jose', 'fran-j')
    const mariaHerminiaMid = childClusterMid(layout, ['maria', 'herminia'])
    expect(Math.abs(diegoMid - isabelPaquiMid)).toBeLessThan(PERSON_W + 16)
    expect(Math.abs(joseMid - mariaHerminiaMid)).toBeLessThan(PERSON_W + 16)
    expect(cousinGroupOrderViolations(layout, struct)).toEqual([])
    const cousinOrder = childOrder(layout, ['isabel', 'paqui', 'maria', 'herminia'])
    expect(cousinOrder).toEqual(['isabel', 'paqui', 'maria', 'herminia'])
  })

  it('Wide left fan must not pull narrow cousin off center', async () => {
    const gp = person('gp', 'GP', { birth: { year: 1900, precision: 'year' } })
    const wide = person('wide', 'Wide', { birth: { year: 1930, precision: 'year' } })
    const wideSp = person('wide-sp', 'WideSp', { birth: { year: 1931, precision: 'year' } })
    const narrow = person('narrow', 'Narrow', { birth: { year: 1932, precision: 'year' } })
    const narrowSp = person('narrow-sp', 'NarrowSp', { birth: { year: 1933, precision: 'year' } })
    const k1 = person('k1', 'K1', { birth: { year: 1960, precision: 'year' } })
    const k2 = person('k2', 'K2', { birth: { year: 1961, precision: 'year' } })
    const k3 = person('k3', 'K3', { birth: { year: 1962, precision: 'year' } })
    const k4 = person('k4', 'K4', { birth: { year: 1963, precision: 'year' } })
    const k5 = person('k5', 'K5', { birth: { year: 1964, precision: 'year' } })
    const n1 = person('n1', 'N1', { birth: { year: 1965, precision: 'year' } })
    const n1sp = person('n1sp', 'N1Sp', { birth: { year: 1966, precision: 'year' } })
    const n2 = person('n2', 'N2', { birth: { year: 1967, precision: 'year' } })
    const { layout, report, model } = await layoutOf(
      [gp, wide, wideSp, narrow, narrowSp, k1, k2, k3, k4, k5, n1, n1sp, n2],
      [
        parentChild('gp', 'wide'),
        parentChild('gp', 'narrow'),
        spouse('wide', 'wide-sp'),
        spouse('narrow', 'narrow-sp'),
        spouse('n1', 'n1sp'),
        ...['k1', 'k2', 'k3', 'k4', 'k5'].flatMap((kid) => [
          parentChild('wide', kid),
          parentChild('wide-sp', kid),
        ]),
        parentChild('narrow', 'n1'),
        parentChild('narrow-sp', 'n1'),
        parentChild('narrow', 'n2'),
        parentChild('narrow-sp', 'n2'),
      ],
    )
    const struct = structureFromModel(model)

    const wideErr = coupleCenteringError(layout, struct, ['wide', 'wide-sp'], ['k1', 'k2', 'k3', 'k4', 'k5'])
    const narrowErr = coupleCenteringError(layout, struct, ['narrow', 'narrow-sp'], ['n1', 'n1sp', 'n2'])
    expect(wideErr, `wide couple off by ${wideErr}px`).toBeLessThan(PERSON_W + 16)
    expect(narrowErr, `narrow couple off by ${narrowErr}px`).toBeLessThan(PERSON_W + 16)
    expect(
      narrowErr,
      `right cousin should not drift worse than left; wide=${wideErr}px narrow=${narrowErr}px`,
    ).toBeLessThanOrEqual(wideErr + 8)

    const parentRowMid =
      (coupleMid(layout, 'wide', 'wide-sp') + coupleMid(layout, 'narrow', 'narrow-sp')) / 2
    expect(Math.abs(personMid(layout, 'gp') - parentRowMid)).toBeLessThan(PERSON_W + 16)
    expect(spouseGap(layout, 'n1', 'n1sp')).toBeLessThanOrEqual(NODE_GAP + 1)
    expect(node(layout, 'n1sp').x).toBeGreaterThan(node(layout, 'k5').x)
  })
})

describe('layout review scenarios (U1, U2)', () => {
  function scenario(id: string) {
    const def = LAYOUT_SCENARIO_REGISTRY.find((entry) => entry.id === id)
    if (!def) throw new Error(`missing scenario ${id}`)
    return def
  }

  it('U1 — undated cousin row sorts children by name with spouses adjacent', async () => {
    const { people, relationships, invariantOptions } = scenario('undatedCousinSpouses')
    const { layout, report, model } = await layoutOf(people, relationships)
    if (invariantOptions !== false) {
      assertInvariants(report, invariantOptions)
    }

    const aBranchOrder = ['a1', 'a2', 'a3']
      .map((id) => ({ id, x: node(layout, id).x }))
      .sort((left, right) => left.x - right.x)
      .map((entry) => entry.id)
    expect(aBranchOrder, `A-branch children were ${aBranchOrder.join(', ')}`).toEqual(['a1', 'a2', 'a3'])

    expect(spouseGap(layout, 'a1', 'a1sp')).toBeLessThanOrEqual(NODE_GAP + 1)
    expect(spouseGap(layout, 'a2', 'a2sp')).toBeLessThanOrEqual(NODE_GAP + 1)
    expect(spouseGap(layout, 'a3', 'a3sp')).toBeLessThanOrEqual(NODE_GAP + 1)
    expect(spouseGap(layout, 'b1', 'b1sp')).toBeLessThanOrEqual(NODE_GAP + 1)
    expect(node(layout, 'b1').x).toBeGreaterThan(node(layout, 'a3sp').x)

    const struct = structureFromModel(model)
    expect(siblingOrderViolations(layout, struct)).toEqual([])
  })

  it('U2 — half-sibling row keeps birth order with child-row spouses', async () => {
    const { people, relationships, invariantOptions } = scenario('halfSiblingSpouses')
    const { layout, report, model } = await layoutOf(people, relationships)
    if (invariantOptions !== false) {
      assertInvariants(report, invariantOptions)
    }

    const childOrder = ['ab1', 'ab2', 'b3', 'ab4', 'ab5']
      .map((id) => node(layout, id))
      .sort((left, right) => left.x - right.x)
      .map((entry) => entry.personId)
    expect(childOrder, `children were ${childOrder.join(', ')}`).toEqual([
      'ab1',
      'ab2',
      'b3',
      'ab4',
      'ab5',
    ])

    expect(spouseGap(layout, 'ab1', 'ab1sp')).toBeLessThanOrEqual(NODE_GAP + 1)
    expect(spouseGap(layout, 'b3', 'b3sp')).toBeLessThanOrEqual(NODE_GAP + 1)
    expect(spouseGap(layout, 'ab5', 'ab5sp')).toBeLessThanOrEqual(NODE_GAP + 1)

    const struct = structureFromModel(model)
    expect(siblingOrderViolations(layout, struct)).toEqual([])
  })
})
