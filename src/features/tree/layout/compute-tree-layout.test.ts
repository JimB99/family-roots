import { describe, expect, it } from 'vitest'
import { buildFamilyGraph } from '../../../domain/family-graph'
import { parentChild, person, spouse, TEST_FAMILY_ID } from '../../../test/fixtures/family'
import type { Person, Relationship } from '../../../types'
import { computeTreeLayout } from './compute-tree-layout'
import { projectFamilyGraph } from './project-family-graph'
import { NODE_GAP } from './layout-spacing'

async function layoutOf(people: Person[], relationships: Relationship[]) {
  const graph = buildFamilyGraph(TEST_FAMILY_ID, people, relationships)
  return computeTreeLayout(projectFamilyGraph(graph))
}

function personNode(layout: Awaited<ReturnType<typeof layoutOf>>, personId: string) {
  const node = layout.nodes.find((entry) => entry.personId === personId)
  if (!node) throw new Error(`Missing node for ${personId}`)
  return node
}

function expectClose(actual: number, expected: number, digits = 6) {
  const tolerance = 10 ** -digits
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance)
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
  it('places each generation on its own row', async () => {
    const layout = await layoutOf(...threeGenerations)
    expect(personNode(layout, 'gp').y).toBeLessThan(personNode(layout, 'pa').y)
    expect(personNode(layout, 'pa').y).toBeLessThan(personNode(layout, 'ca').y)
  })

  it('keeps spouses and siblings on the same row', async () => {
    const layout = await layoutOf(...threeGenerations)
    expect(personNode(layout, 'pa').y).toBe(personNode(layout, 'pb').y)
    expect(personNode(layout, 'ca').y).toBe(personNode(layout, 'cb').y)
  })

  it('produces identical positions regardless of input order', async () => {
    const [people, relationships] = threeGenerations
    const forward = await layoutOf(people, relationships)
    const reversed = await layoutOf([...people].reverse(), [...relationships].reverse())
    for (const node of forward.nodes) {
      const other = reversed.nodes.find((entry) => entry.id === node.id)
      expect(other).toBeDefined()
      expectClose(other!.x, node.x)
      expectClose(other!.y, node.y)
    }
  })

  it('keeps spouses adjacent', async () => {
    const layout = await layoutOf(...threeGenerations)
    const a = personNode(layout, 'pa')
    const b = personNode(layout, 'pb')
    const gap = Math.abs(a.x - b.x) - a.width
    expect(gap).toBeLessThanOrEqual(NODE_GAP + 1)
  })

  it('never overlaps two nodes on the same row', async () => {
    const layout = await layoutOf(...threeGenerations)
    const byRow = new Map<number, typeof layout.nodes>()
    for (const node of layout.nodes) {
      const list = byRow.get(node.y) ?? []
      list.push(node)
      byRow.set(node.y, list)
    }
    for (const [, nodes] of byRow) {
      const sorted = [...nodes].sort((a, b) => a.x - b.x)
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i].x).toBeGreaterThanOrEqual(sorted[i - 1].x + sorted[i - 1].width - 0.5)
      }
    }
  })

  it('places the union node between the parents and above the children', async () => {
    const layout = await layoutOf(...threeGenerations)
    const union = layout.nodes.find((node) => node.kind === 'union' && node.id.includes('pa'))
    expect(union).toBeDefined()
    const parentCenter =
      (personNode(layout, 'pa').x + personNode(layout, 'pa').width / 2 +
        personNode(layout, 'pb').x + personNode(layout, 'pb').width / 2) /
      2
    expect(Math.abs(union!.x + union!.width / 2 - parentCenter)).toBeLessThanOrEqual(1)
    expect(union!.y).toBeGreaterThan(personNode(layout, 'pa').y)
    expect(union!.y).toBeLessThan(personNode(layout, 'ca').y)
  })

  it('keeps a collapsed union node after its children are hidden', async () => {
    const [people, relationships] = threeGenerations
    const unionId = 'union:pa|pb'
    const visible = buildFamilyGraph(
      TEST_FAMILY_ID,
      people.filter((entry) => entry.id !== 'ca' && entry.id !== 'cb'),
      relationships.filter((rel) => rel.personBId !== 'ca' && rel.personBId !== 'cb'),
    )
    const layout = await computeTreeLayout(projectFamilyGraph(visible, { retainUnionIds: [unionId] }))
    const union = layout.nodes.find((node) => node.id === unionId)
    expect(union).toBeDefined()
    expect(union?.kind).toBe('union')
    expect(layout.edges.some((edge) => edge.type === 'parent_child' && edge.sourceId === unionId)).toBe(
      false,
    )
    expect(layout.edges.some((edge) => edge.targetId === unionId && edge.sourceId === 'person:pa')).toBe(
      true,
    )
  })
})
