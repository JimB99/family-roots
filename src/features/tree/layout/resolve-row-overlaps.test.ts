import { describe, expect, it } from 'vitest'
import { buildFamilyGraph } from '../../../domain/family-graph'
import { parentChild, person, spouse, TEST_FAMILY_ID } from '../../../test/fixtures/family'
import { assignGenerations, buildStructure } from './family-structure'
import { hasRowOverlap } from './layout-metrics'
import type { PositionedNode } from './layout-model'
import { PERSON_H, ROW_GAP } from './layout-spacing'
import { projectFamilyGraph } from './project-family-graph'
import { enforceRowMinimumGaps } from './resolve-row-overlaps'

describe('enforceRowMinimumGaps', () => {
  it('separates persons stacked at the same x on one row', () => {
    const a = person('a', 'A', { birth: { year: 1970, precision: 'year' } })
    const b = person('b', 'B', { birth: { year: 1971, precision: 'year' } })
    const c1 = person('c1', 'C1', { birth: { year: 2000, precision: 'year' } })
    const c2 = person('c2', 'C2', { birth: { year: 2001, precision: 'year' } })
    const graph = buildFamilyGraph(TEST_FAMILY_ID, [a, b, c1, c2], [
      spouse('a', 'b'),
      parentChild('a', 'c1'),
      parentChild('b', 'c1'),
      parentChild('a', 'c2'),
      parentChild('b', 'c2'),
    ])
    const model = projectFamilyGraph(graph)
    const structure = buildStructure(
      model.edges,
      new Map(model.nodes.map((node) => [node.id, node.kind])),
    )
    const personIds = model.nodes.filter((node) => node.kind === 'person').map((node) => node.id)
    const generations = assignGenerations(personIds, structure)
    const y1 = (generations.get('person:c1') ?? 1) * (PERSON_H + ROW_GAP)
    const nodes: PositionedNode[] = model.nodes
      .filter((node) => node.kind === 'person')
      .map((node) => ({
        ...node,
        x: 0,
        y: (generations.get(node.id) ?? 0) * (PERSON_H + ROW_GAP),
      }))
    nodes.find((node) => node.personId === 'c2')!.x = 0
    nodes.find((node) => node.personId === 'c2')!.y = y1

    const rowBefore = nodes.filter((node) => Math.abs(node.y - y1) < 0.5)
    expect(hasRowOverlap(rowBefore)).toBe(true)

    enforceRowMinimumGaps(nodes, structure)

    const rowAfter = nodes.filter((node) => Math.abs(node.y - y1) < 0.5)
    expect(hasRowOverlap(rowAfter)).toBe(false)
    expect(nodes.find((node) => node.personId === 'c2')!.x).toBeGreaterThan(
      nodes.find((node) => node.personId === 'c1')!.x + nodes.find((node) => node.personId === 'c1')!.width,
    )
  })
})
