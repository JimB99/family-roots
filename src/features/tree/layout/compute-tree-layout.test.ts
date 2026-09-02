import { describe, expect, it } from 'vitest'
import { buildFamilyGraph } from '../../../domain/family-graph'
import { parentChild, person, spouse, TEST_FAMILY_ID } from '../../../test/fixtures/family'
import type { Person, Relationship } from '../../../types'
import { computeTreeLayout } from './compute-tree-layout'
import { projectFamilyGraph } from './project-family-graph'

function layoutOf(people: Person[], relationships: Relationship[]) {
  const graph = buildFamilyGraph(TEST_FAMILY_ID, people, relationships)
  return computeTreeLayout(projectFamilyGraph(graph))
}

function personNode(layout: ReturnType<typeof layoutOf>, personId: string) {
  const node = layout.nodes.find((n) => n.personId === personId)
  if (!node) throw new Error(`Missing node for ${personId}`)
  return node
}

const grandparent = person('gp', 'Grandparent', { birth: { year: 1920, precision: 'year' } })
const parentA = person('pa', 'Parent A', { birth: { year: 1950, precision: 'year' } })
const parentB = person('pb', 'Parent B', { birth: { year: 1952, precision: 'year' } })
const childA = person('ca', 'Child A', { birth: { year: 1980, precision: 'year' } })
const childB = person('cb', 'Child B', { birth: { year: 1983, precision: 'year' } })

const threeGenerations: [Person[], Relationship[]] = [
  [grandparent, parentA, parentB, childA, childB],
  [
    parentChild('gp', 'pa'),
    spouse('pa', 'pb'),
    parentChild('pa', 'ca'),
    parentChild('pb', 'ca'),
    parentChild('pa', 'cb'),
    parentChild('pb', 'cb'),
  ],
]

describe('computeTreeLayout', () => {
  it('places each generation on its own row', () => {
    const layout = layoutOf(...threeGenerations)

    const gpY = personNode(layout, 'gp').y
    const paY = personNode(layout, 'pa').y
    const caY = personNode(layout, 'ca').y

    expect(gpY).toBeLessThan(paY)
    expect(paY).toBeLessThan(caY)
  })

  it('keeps spouses on the same row', () => {
    const layout = layoutOf(...threeGenerations)

    expect(personNode(layout, 'pa').y).toBe(personNode(layout, 'pb').y)
  })

  it('keeps siblings on the same row', () => {
    const layout = layoutOf(...threeGenerations)

    expect(personNode(layout, 'ca').y).toBe(personNode(layout, 'cb').y)
  })

  it('produces identical positions regardless of input order', () => {
    const [people, relationships] = threeGenerations
    const forward = layoutOf(people, relationships)
    const reversed = layoutOf([...people].reverse(), [...relationships].reverse())

    for (const node of forward.nodes) {
      const other = reversed.nodes.find((n) => n.id === node.id)
      expect(other).toBeDefined()
      expect(other!.x).toBeCloseTo(node.x, 6)
      expect(other!.y).toBeCloseTo(node.y, 6)
    }
  })

  it('keeps spouses adjacent to each other', () => {
    const layout = layoutOf(...threeGenerations)
    const a = personNode(layout, 'pa')
    const b = personNode(layout, 'pb')
    const gap = Math.abs(a.x - b.x) - a.width

    expect(gap).toBeLessThanOrEqual(60)
  })

  it('never overlaps two nodes on the same row', () => {
    const layout = layoutOf(...threeGenerations)
    const byRow = new Map<number, typeof layout.nodes>()
    for (const node of layout.nodes) {
      const list = byRow.get(node.y) ?? []
      list.push(node)
      byRow.set(node.y, list)
    }

    for (const [, nodes] of byRow) {
      const sorted = [...nodes].sort((a, b) => a.x - b.x)
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i].x).toBeGreaterThanOrEqual(sorted[i - 1].x + sorted[i - 1].width)
      }
    }
  })

  it('places the union node between the parents and above the children', () => {
    const layout = layoutOf(...threeGenerations)
    const union = layout.nodes.find((n) => n.kind === 'union' && n.id.includes('pa'))
    expect(union).toBeDefined()

    const parentCenter =
      (personNode(layout, 'pa').x + personNode(layout, 'pa').width / 2 +
        personNode(layout, 'pb').x + personNode(layout, 'pb').width / 2) / 2

    expect(union!.x + union!.width / 2).toBeCloseTo(parentCenter, 6)
    expect(union!.y).toBeGreaterThan(personNode(layout, 'pa').y)
    expect(union!.y).toBeLessThan(personNode(layout, 'ca').y)
  })

  it('packs disconnected components without overlapping them', () => {
    const loners = Array.from({ length: 12 }, (_, i) => person(`solo-${i}`, `Solo ${i}`))
    const layout = layoutOf([...threeGenerations[0], ...loners], threeGenerations[1])

    expect(layout.components.length).toBe(13)

    for (let i = 0; i < layout.components.length; i++) {
      for (let j = i + 1; j < layout.components.length; j++) {
        const a = layout.components[i].bounds
        const b = layout.components[j].bounds
        const disjoint =
          a.maxX <= b.minX || b.maxX <= a.minX || a.maxY <= b.minY || b.maxY <= a.minY
        expect(disjoint).toBe(true)
      }
    }
  })

  it('wraps many components instead of forming one very wide strip', () => {
    const loners = Array.from({ length: 40 }, (_, i) => person(`solo-${i}`, `Solo ${i}`))
    const layout = layoutOf(loners, [])

    expect(layout.bounds.maxY).toBeGreaterThan(0)
    expect(layout.bounds.maxX).toBeLessThan(40 * 208)
  })

  it('handles a person with parents recorded in only one lineage', () => {
    const people = [person('p1', 'Solo Parent'), person('p2', 'Only Child')]
    const layout = layoutOf(people, [parentChild('p1', 'p2')])

    expect(personNode(layout, 'p1').y).toBeLessThan(personNode(layout, 'p2').y)
  })

  it('returns empty bounds for an empty family', () => {
    const layout = layoutOf([], [])

    expect(layout.nodes).toHaveLength(0)
    expect(layout.bounds).toEqual({ minX: 0, minY: 0, maxX: 0, maxY: 0 })
  })
})
