/**
 * Approved join-parent edge-case layout reference builder.
 *
 * Ported from canvases/join-parent-edge-cases.canvas.tsx — the canvas is the visual
 * contract; this module is the testable source of truth for golden coordinates.
 *
 * Regenerate golden: `npm run generate:join-parent-golden`
 */
import type { JoinParentCaseId } from '../../../test/fixtures/join-parent-edge-cases'
import { FAMILY_GAP, NODE_GAP, PERSON_H, PERSON_W, ROW_GAP, SIBLING_GAP } from './layout-spacing'

export { FAMILY_GAP as JOIN_COUSIN_GAP, NODE_GAP as JOIN_COUPLE_GAP, SIBLING_GAP as JOIN_SIBLING_GAP }

const HALF_W = PERSON_W / 2
const HALF_H = PERSON_H / 2
const COUSIN_GAP = FAMILY_GAP

const rowY = (gen: number) => gen * (PERSON_H + ROW_GAP)
const cyOf = (gen: number) => rowY(gen) + HALF_H

export interface JoinParentLayoutPerson {
  id: string
  gen: 0 | 1 | 2
  cx: number
  cy: number
  x: number
  y: number
  leftEdge: number
  rightEdge: number
  width: number
  height: number
}

interface PersonSpec {
  id: string
  birthYear: number
  parentKey: string
}

interface PlacedPerson extends PersonSpec {
  gen: 0 | 1 | 2
  cx: number
}

function halfSepForStrangerCouples(): number {
  return (2 * PERSON_W + NODE_GAP) / 2 + FAMILY_GAP / 2
}

function halfSepSingleParent(): number {
  return PERSON_W / 2 + FAMILY_GAP / 2
}

function rightEdge(cx: number): number {
  return cx + HALF_W
}

function leftEdge(cx: number): number {
  return cx - HALF_W
}

function spanCenter(ids: string[], positions: Map<string, number>): number {
  const cxs = ids.map((id) => positions.get(id)!)
  return (Math.min(...cxs.map(leftEdge)) + Math.max(...cxs.map(rightEdge))) / 2
}

function placePerson(spec: PersonSpec, cx: number, gen: 0 | 1 | 2): PlacedPerson {
  return { ...spec, gen, cx }
}

function placeCoupleAtCenter(
  idA: string,
  idB: string,
  center: number,
  gen: 0 | 1 | 2,
  birthA: number,
  birthB: number,
  parentKey: string,
): [PlacedPerson, PlacedPerson] {
  const coupleWidth = 2 * PERSON_W + NODE_GAP
  const left = center - coupleWidth / 2
  return [
    placePerson({ id: idA, birthYear: birthA, parentKey }, left + HALF_W, gen),
    placePerson({ id: idB, birthYear: birthB, parentKey }, left + PERSON_W + NODE_GAP + HALF_W, gen),
  ]
}

function packSiblingRun(specs: PersonSpec[], startLeft: number): { people: PlacedPerson[]; right: number } {
  let cursor = startLeft
  const people: PlacedPerson[] = []
  for (const spec of specs) {
    people.push(placePerson(spec, cursor + HALF_W, 1))
    cursor += PERSON_W + SIBLING_GAP
  }
  const right = people.length > 0 ? rightEdge(people[people.length - 1]!.cx) : startLeft
  return { people, right }
}

function packCoupleCluster(
  specA: PersonSpec,
  specB: PersonSpec,
  startLeft: number,
): { people: [PlacedPerson, PlacedPerson]; right: number } {
  const a = placePerson(specA, startLeft + HALF_W, 1)
  const b = placePerson(specB, startLeft + PERSON_W + NODE_GAP + HALF_W, 1)
  return { people: [a, b], right: rightEdge(b.cx) }
}

function packStandardJoinRow(gen1Specs: PersonSpec[], joinCouple: [string, string]): PlacedPerson[] {
  const [joinA, joinB] = joinCouple
  const joinSet = new Set(joinCouple)
  const byParents = new Map<string, PersonSpec[]>()
  for (const spec of gen1Specs) {
    if (!spec.parentKey) continue
    const list = byParents.get(spec.parentKey) ?? []
    list.push(spec)
    byParents.set(spec.parentKey, list)
  }

  const natalRuns = [...byParents.entries()]
    .map(([key, ids]) => ({
      key,
      specs: ids
        .filter((s) => !joinSet.has(s.id))
        .sort((a, b) => a.birthYear - b.birthYear || a.id.localeCompare(b.id)),
    }))
    .filter((run) => run.specs.length > 0)
    .sort((a, b) => {
      const aBirth = Math.min(...a.specs.map((s) => s.birthYear))
      const bBirth = Math.min(...b.specs.map((s) => s.birthYear))
      return aBirth - bBirth || a.key.localeCompare(b.key)
    })

  const specA = gen1Specs.find((s) => s.id === joinA)!
  const specB = gen1Specs.find((s) => s.id === joinB)!

  if (natalRuns.length >= 2) {
    const leftRun = natalRuns[0]!
    const rightRun = natalRuns[natalRuns.length - 1]!
    const leftPacked = packSiblingRun(leftRun.specs, 0)
    const couple = packCoupleCluster(specA, specB, leftPacked.right + SIBLING_GAP)
    const rightPacked = packSiblingRun(rightRun.specs, couple.right + SIBLING_GAP)
    return [...leftPacked.people, ...couple.people, ...rightPacked.people]
  }

  if (natalRuns.length === 1) {
    const couple = packCoupleCluster(specA, specB, 0)
    const rightPacked = packSiblingRun(natalRuns[0]!.specs, couple.right + SIBLING_GAP)
    return [...couple.people, ...rightPacked.people]
  }

  const couple = packCoupleCluster(specA, specB, 0)
  return [...couple.people]
}

function packBrideAnchoredJoinRow(
  womanSpecs: PersonSpec[],
  manSpecs: PersonSpec[],
  joinCouple: [string, string],
): PlacedPerson[] {
  const [joinA, joinB] = joinCouple
  const womanSorted = [...womanSpecs].sort((a, b) => a.birthYear - b.birthYear || a.id.localeCompare(b.id))
  const specA = womanSorted.find((s) => s.id === joinA)!
  const specB = manSpecs.find((s) => s.id === joinB)!
  const womanWithoutA = womanSorted.filter((s) => s.id !== joinA)
  const manSiblings = manSpecs.filter((s) => s.id !== joinB).sort((a, b) => a.birthYear - b.birthYear || a.id.localeCompare(b.id))

  const beforeA = womanWithoutA.filter((s) => s.birthYear < specA.birthYear)
  const afterA = womanWithoutA.filter((s) => s.birthYear >= specA.birthYear)

  let cursor = 0
  const placed: PlacedPerson[] = []

  for (const spec of beforeA) {
    placed.push(placePerson(spec, cursor + HALF_W, 1))
    cursor += PERSON_W + SIBLING_GAP
  }

  const aLeft = cursor
  const a = placePerson(specA, aLeft + HALF_W, 1)
  const b = placePerson(specB, aLeft + PERSON_W + NODE_GAP + HALF_W, 1)
  placed.push(a, b)
  cursor = rightEdge(b.cx) + SIBLING_GAP

  for (const spec of afterA) {
    placed.push(placePerson(spec, cursor + HALF_W, 1))
    cursor += PERSON_W + SIBLING_GAP
  }

  const brideBlockRight = placed.length > 0 ? rightEdge(placed[placed.length - 1]!.cx) : rightEdge(b.cx)
  const groomPacked = packSiblingRun(manSiblings, brideBlockRight + FAMILY_GAP)
  return [...placed, ...groomPacked.people]
}

function placeStrangerCouplesBlockCentered(
  coupleA: [string, string],
  coupleB: [string, string],
  center: number,
  gen: 0 | 1 | 2,
  birthA: number,
  birthB: number,
  birthC: number,
  birthD: number,
  parentKeyA: string,
  parentKeyB: string,
): PlacedPerson[] {
  const coupleWidth = 2 * PERSON_W + NODE_GAP
  const blockWidth = 2 * coupleWidth + FAMILY_GAP
  const blockLeft = center - blockWidth / 2
  return [
    ...placeCoupleAtCenter(coupleA[0], coupleA[1], blockLeft + coupleWidth / 2, gen, birthA, birthB, parentKeyA),
    ...placeCoupleAtCenter(
      coupleB[0],
      coupleB[1],
      blockLeft + coupleWidth + FAMILY_GAP + coupleWidth / 2,
      gen,
      birthC,
      birthD,
      parentKeyB,
    ),
  ]
}

function placeSingleParentsBlockCentered(
  apId: string,
  bpId: string,
  center: number,
  birthAp: number,
  birthBp: number,
): [PlacedPerson, PlacedPerson] {
  const blockWidth = 2 * PERSON_W + FAMILY_GAP
  const blockLeft = center - blockWidth / 2
  return [
    placePerson({ id: apId, birthYear: birthAp, parentKey: '' }, blockLeft + HALF_W, 0),
    placePerson({ id: bpId, birthYear: birthBp, parentKey: '' }, blockLeft + PERSON_W + FAMILY_GAP + HALF_W, 0),
  ]
}

function centerParentsOverChildren(
  coupleIds: [string, string],
  childIds: string[],
  positions: Map<string, number>,
  parentKey: string,
  birthA: number,
  birthB: number,
): PlacedPerson[] {
  const center = spanCenter(childIds, positions)
  return placeCoupleAtCenter(coupleIds[0], coupleIds[1], center, 0, birthA, birthB, parentKey)
}

function centerChildrenUnderAnchor(anchorCx: number, childSpecs: PersonSpec[]): PlacedPerson[] {
  const sorted = [...childSpecs].sort((a, b) => a.birthYear - b.birthYear || a.id.localeCompare(b.id))
  const clusterWidth = sorted.length * PERSON_W + Math.max(0, sorted.length - 1) * SIBLING_GAP
  let cursor = anchorCx - clusterWidth / 2
  const placed: PlacedPerson[] = []
  for (const spec of sorted) {
    placed.push(placePerson(spec, cursor + HALF_W, 2))
    cursor += PERSON_W + SIBLING_GAP
  }
  return placed
}

function branchLeftEdge(people: PlacedPerson[]): number {
  return Math.min(...people.map((p) => leftEdge(p.cx)))
}

function branchRightEdge(people: PlacedPerson[]): number {
  return Math.max(...people.map((p) => rightEdge(p.cx)))
}

function abCenterFromGen1(gen1: PlacedPerson[]): number {
  const a = gen1.find((p) => p.id === 'a')!
  const b = gen1.find((p) => p.id === 'b')!
  return (a.cx + b.cx) / 2
}

const B_BRO_CHILD_SPECS: PersonSpec[] = [
  { id: 'b-bro-c1', birthYear: 1995, parentKey: 'b-bro' },
  { id: 'b-bro-c2', birthYear: 1997, parentKey: 'b-bro' },
  { id: 'b-bro-c3', birthYear: 1999, parentKey: 'b-bro' },
]

function extendedGen1Specs(bOlderThanBro: boolean): PersonSpec[] {
  return [
    { id: 'a-sis', birthYear: 1963, parentKey: 'af|am' },
    { id: 'a', birthYear: 1965, parentKey: 'af|am' },
    { id: 'b', birthYear: bOlderThanBro ? 1968 : 1972, parentKey: 'bf|bm' },
    { id: 'b-bro', birthYear: bOlderThanBro ? 1972 : 1970, parentKey: 'bf|bm' },
  ]
}

function buildExtendedScenario(options: { withAbChild: boolean; bOlderThanBro?: boolean }): PlacedPerson[] {
  const { withAbChild, bOlderThanBro = false } = options
  const keyA = 'af|am'
  const keyB = 'bf|bm'

  const gen1 = packStandardJoinRow(extendedGen1Specs(bOlderThanBro), ['a', 'b']).map((p) => ({ ...p }))
  const abCenter = abCenterFromGen1(gen1)
  const posOf = (people: PlacedPerson[]) => new Map(people.map((p) => [p.id, p.cx]))

  const aSisGen2 = centerChildrenUnderAnchor(posOf(gen1).get('a-sis')!, [
    { id: 'a-sis-c', birthYear: 1990, parentKey: 'a-sis' },
  ])

  const abGen2 = withAbChild
    ? centerChildrenUnderAnchor(abCenter, [{ id: 'ab-c', birthYear: 1993, parentKey: 'ab' }])
    : []

  let bBroGen2 = centerChildrenUnderAnchor(posOf(gen1).get('b-bro')!, B_BRO_CHILD_SPECS)

  if (withAbChild) {
    const leftBlock = [...aSisGen2, ...abGen2]
    const shift = branchRightEdge(leftBlock) + COUSIN_GAP - branchLeftEdge(bBroGen2)
    if (shift > 0) {
      const bBro = gen1.find((p) => p.id === 'b-bro')!
      bBro.cx += shift
      bBroGen2 = centerChildrenUnderAnchor(bBro.cx, B_BRO_CHILD_SPECS)
    }
  }

  const allPos = posOf([...gen1, ...aSisGen2, ...abGen2, ...bBroGen2])

  const parents = withAbChild
    ? [
        ...centerParentsOverChildren(['af', 'am'], ['a-sis', 'a'], allPos, keyA, 1940, 1942),
        ...centerParentsOverChildren(
          ['bf', 'bm'],
          bOlderThanBro ? ['b', 'b-bro'] : ['b-bro'],
          allPos,
          keyB,
          1941,
          1943,
        ),
      ]
    : [
        ...centerParentsOverChildren(['af', 'am'], ['a-sis', 'a'], allPos, keyA, 1940, 1942),
        ...centerParentsOverChildren(['bf', 'bm'], ['b-bro', 'b'], allPos, keyB, 1941, 1943),
      ]

  return [...parents, ...gen1, ...aSisGen2, ...abGen2, ...bBroGen2]
}

function toLayoutPerson(p: PlacedPerson): JoinParentLayoutPerson {
  const y = rowY(p.gen)
  const cy = cyOf(p.gen)
  const x = p.cx - HALF_W
  return {
    id: p.id,
    gen: p.gen,
    cx: p.cx,
    cy,
    x,
    y,
    leftEdge: x,
    rightEdge: x + PERSON_W,
    width: PERSON_W,
    height: PERSON_H,
  }
}

export function buildJoinParentScenario(caseId: JoinParentCaseId): JoinParentLayoutPerson[] {
  const keyA = 'af|am'
  const keyB = 'bf|bm'
  const dualCenter = 400

  let placed: PlacedPerson[] = []

  switch (caseId) {
    case 'join-s4-baseline': {
      const gen1 = packStandardJoinRow(
        [
          { id: 'l1', birthYear: 1968, parentKey: keyA },
          { id: 'l3', birthYear: 1970, parentKey: keyA },
          { id: 'l2', birthYear: 1974, parentKey: keyA },
          { id: 'r2', birthYear: 1965, parentKey: keyB },
          { id: 'r1', birthYear: 1968, parentKey: keyB },
          { id: 'r3', birthYear: 1971, parentKey: keyB },
        ],
        ['l2', 'r2'],
      )
      const pos = new Map(gen1.map((p) => [p.id, p.cx]))
      placed = [
        ...centerParentsOverChildren(['af', 'am'], ['l1', 'l2', 'l3'], pos, keyA, 1940, 1942),
        ...centerParentsOverChildren(['bf', 'bm'], ['r1', 'r2', 'r3'], pos, keyB, 1941, 1943),
        ...gen1,
      ]
      break
    }
    case 'join-s5a-only-a': {
      const gen1 = packStandardJoinRow(
        [
          { id: 'a', birthYear: 1965, parentKey: keyA },
          { id: 'b', birthYear: 1962, parentKey: keyB },
          { id: 'b1', birthYear: 1968, parentKey: keyB },
          { id: 'b3', birthYear: 1970, parentKey: keyB },
          { id: 'b4', birthYear: 1972, parentKey: keyB },
        ],
        ['a', 'b'],
      )
      const pos = new Map(gen1.map((p) => [p.id, p.cx]))
      placed = [
        ...centerParentsOverChildren(['af', 'am'], ['a'], pos, keyA, 1940, 1942),
        ...centerParentsOverChildren(['bf', 'bm'], ['b1', 'b', 'b3', 'b4'], pos, keyB, 1941, 1943),
        ...gen1,
      ]
      break
    }
    case 'join-s5-single': {
      const join = packCoupleCluster(
        { id: 'a', birthYear: 1965, parentKey: 'ap' },
        { id: 'b', birthYear: 1972, parentKey: 'bp' },
        dualCenter - (2 * PERSON_W + NODE_GAP) / 2,
      )
      const abCenter = abCenterFromGen1(join.people)
      placed = [...placeSingleParentsBlockCentered('ap', 'bp', abCenter, 1940, 1941), ...join.people]
      break
    }
    case 'join-s5-dual': {
      const join = packCoupleCluster(
        { id: 'a', birthYear: 1965, parentKey: keyA },
        { id: 'b', birthYear: 1972, parentKey: keyB },
        dualCenter - (2 * PERSON_W + NODE_GAP) / 2,
      )
      const abCenter = abCenterFromGen1(join.people)
      placed = [
        ...placeStrangerCouplesBlockCentered(
          ['af', 'am'],
          ['bf', 'bm'],
          abCenter,
          0,
          1940,
          1942,
          1941,
          1943,
          keyA,
          keyB,
        ),
        ...join.people,
      ]
      break
    }
    case 'join-s5-ext':
      placed = buildExtendedScenario({ withAbChild: false })
      break
    case 'join-s6-bride': {
      const gen1 = packBrideAnchoredJoinRow(
        [
          { id: 'a1', birthYear: 1964, parentKey: keyA },
          { id: 'a', birthYear: 1968, parentKey: keyA },
          { id: 'a3', birthYear: 1972, parentKey: keyA },
        ],
        [
          { id: 'b', birthYear: 1964, parentKey: keyB },
          { id: 'b1', birthYear: 1968, parentKey: keyB },
          { id: 'b3', birthYear: 1972, parentKey: keyB },
        ],
        ['a', 'b'],
      )
      const pos = new Map(gen1.map((p) => [p.id, p.cx]))
      placed = [
        ...centerParentsOverChildren(['af', 'am'], ['a1', 'a', 'a3'], pos, keyA, 1940, 1942),
        ...centerParentsOverChildren(['bf', 'bm'], ['b1', 'b3'], pos, keyB, 1941, 1943),
        ...gen1,
      ]
      break
    }
    case 'join-s5-ext-child-young':
      placed = buildExtendedScenario({ withAbChild: true, bOlderThanBro: false })
      break
    case 'join-s5-ext-child-old':
      placed = buildExtendedScenario({ withAbChild: true, bOlderThanBro: true })
      break
    default: {
      const _exhaustive: never = caseId
      throw new Error(`unknown join-parent case: ${_exhaustive}`)
    }
  }

  return placed.map(toLayoutPerson)
}

export function normalizeJoinParentLayout(layout: JoinParentLayoutPerson[]): JoinParentLayoutPerson[] {
  if (layout.length === 0) return layout
  const minX = Math.min(...layout.map((p) => p.x))
  const minY = Math.min(...layout.map((p) => p.y))
  return layout.map((p) => ({
    ...p,
    x: p.x - minX,
    y: p.y - minY,
    leftEdge: p.leftEdge - minX,
    rightEdge: p.rightEdge - minX,
    cx: p.cx - minX,
    cy: p.cy - minY,
  }))
}

export function joinParentGoldenDiffs(
  actual: JoinParentLayoutPerson[],
  golden: Array<Pick<JoinParentLayoutPerson, 'id' | 'x' | 'y' | 'cx' | 'cy' | 'leftEdge' | 'rightEdge' | 'gen'>>,
): string[] {
  const diffs: string[] = []
  const byId = new Map(actual.map((p) => [p.id, p]))
  for (const expected of golden) {
    const node = byId.get(expected.id)
    if (!node) {
      diffs.push(`missing ${expected.id}`)
      continue
    }
    for (const key of ['x', 'y', 'cx', 'cy', 'leftEdge', 'rightEdge', 'gen'] as const) {
      if (node[key] !== expected[key]) {
        diffs.push(`${expected.id}.${key}: expected ${expected[key]}, got ${node[key]}`)
      }
    }
  }
  return diffs
}

export function gen1Order(layout: JoinParentLayoutPerson[]): string[] {
  return layout
    .filter((p) => p.gen === 1)
    .sort((a, b) => a.cx - b.cx)
    .map((p) => p.id)
}

export function halfSep(): number {
  return halfSepForStrangerCouples()
}

export function halfSepSingle(): number {
  return halfSepSingleParent()
}
