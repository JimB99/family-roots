import { describe, expect, it } from 'vitest'
import { buildFamilyGraph } from './family-graph'
import { directLinePersonIds, directLineUnionIds } from './direct-line'
import { parentChild, person, spouse, TEST_FAMILY_ID } from '../test/fixtures/family'

describe('direct line', () => {
  const gp = person('gp', 'Grandparent')
  const pa = person('pa', 'Parent A')
  const pb = person('pb', 'Parent B')
  const ca = person('ca', 'Child A')
  const cb = person('cb', 'Child B')
  const spouseA = person('sa', 'Spouse of A')
  const gc = person('gc', 'Grandchild')

  const graph = buildFamilyGraph(TEST_FAMILY_ID, [gp, pa, pb, ca, cb, spouseA, gc], [
    parentChild('gp', 'pa'),
    spouse('pa', 'pb'),
    parentChild('pa', 'ca'),
    parentChild('pb', 'ca'),
    parentChild('pa', 'cb'),
    parentChild('pb', 'cb'),
    spouse('ca', 'sa'),
    parentChild('ca', 'gc'),
    parentChild('sa', 'gc'),
  ])

  it('includes ancestors and descendants, not siblings or spouses', () => {
    const line = directLinePersonIds(graph, 'ca')
    expect(line.has('ca')).toBe(true)
    expect(line.has('gp')).toBe(true)
    expect(line.has('pa')).toBe(true)
    expect(line.has('pb')).toBe(true)
    expect(line.has('gc')).toBe(true)
    expect(line.has('cb')).toBe(false)
    expect(line.has('sa')).toBe(false)
  })

  it('highlights parent and child unions on the blood line', () => {
    const line = directLinePersonIds(graph, 'ca')
    const unions = directLineUnionIds(graph, line)
    expect(unions.has('union:single:gp')).toBe(true)
    expect(unions.has('union:pa|pb')).toBe(true)
    expect(unions.has('union:ca|sa')).toBe(true)
  })
})
