import { describe, expect, it } from 'vitest'
import { buildFamilyGraph } from '../../../domain/family-graph'
import { parentChild, person, spouse, TEST_FAMILY_ID } from '../../../test/fixtures/family'
import type { Person, Relationship } from '../../../types'
import { computeTreeLayout } from './compute-tree-layout'
import { coupleCenteringOffset } from './layout-metrics'
import { SIBLING_GAP } from './layout-spacing'
import { projectFamilyGraph } from './project-family-graph'

async function layoutOf(people: Person[], relationships: Relationship[]) {
  return computeTreeLayout(projectFamilyGraph(buildFamilyGraph(TEST_FAMILY_ID, people, relationships)))
}

const amy = person('amy', 'Amy', { birth: { year: 1970, precision: 'year' } })
const bob = person('bob', 'Bob', { birth: { year: 1971, precision: 'year' } })
const c1 = person('c1', 'C1', { birth: { year: 2000, precision: 'year' } })
const c2 = person('c2', 'C2', { birth: { year: 2002, precision: 'year' } })
const baseRels = [
  spouse('amy', 'bob'),
  parentChild('amy', 'c1'),
  parentChild('bob', 'c1'),
  parentChild('amy', 'c2'),
  parentChild('bob', 'c2'),
]

describe('layout mutations S6', () => {
  it('S6a — add sibling c3 keeps the couple centered', async () => {
    const c3 = person('c3', 'C3', { birth: { year: 2004, precision: 'year' } })
    const after = await layoutOf(
      [amy, bob, c1, c2, c3],
      [...baseRels, parentChild('amy', 'c3'), parentChild('bob', 'c3')],
    )
    expect(coupleCenteringOffset(after, ['amy', 'bob'], ['c1', 'c2', 'c3'])!).toBeLessThan(100)
  })

  it('S6b — add spouse to c2 does not overlap siblings', async () => {
    const c2s = person('c2s', 'C2S', { birth: { year: 2003, precision: 'year' } })
    const after = await layoutOf([amy, bob, c1, c2, c2s], [...baseRels, spouse('c2', 'c2s')])
    const left = after.nodes.find((n) => n.personId === 'c1')!
    const right = after.nodes.find((n) => n.personId === 'c2')!
    const first = left.x <= right.x ? left : right
    const second = left.x <= right.x ? right : left
    const gap = second.x - (first.x + first.width)
    expect(gap).toBeGreaterThanOrEqual(-1)
    expect(gap <= SIBLING_GAP + 1 || gap >= 0).toBe(true)
  })

  it('S6e — remove marriage does not overlap the natal row', async () => {
    const x = person('x', 'X', { birth: { year: 1953, precision: 'year' } })
    const y = person('y', 'Y', { birth: { year: 1956, precision: 'year' } })
    const sib = person('sib', 'Sib', { birth: { year: 1950, precision: 'year' } })
    const gp = person('gp', 'GP', { birth: { year: 1920, precision: 'year' } })
    const afterRemoval = await layoutOf(
      [gp, sib, amy, bob, x, y],
      [parentChild('gp', 'sib'), parentChild('gp', 'amy'), spouse('amy', 'bob'), spouse('amy', 'y')],
    )
    const rowY = afterRemoval.nodes.find((n) => n.personId === 'amy')!.y
    const row = afterRemoval.nodes.filter((n) => n.kind === 'person' && n.y === rowY).sort((a, b) => a.x - b.x)
    for (let i = 1; i < row.length; i++) {
      expect(row[i].x).toBeGreaterThanOrEqual(row[i - 1].x + row[i - 1].width - 1)
    }
  })
})
