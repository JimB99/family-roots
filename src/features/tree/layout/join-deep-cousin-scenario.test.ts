import { describe, expect, it } from 'vitest'
import { buildFamilyGraph } from '../../../domain/family-graph'
import { TEST_FAMILY_ID } from '../../../test/fixtures/family'
import {
  JOIN_DEEP_COUSIN_PEOPLE,
  JOIN_DEEP_COUSIN_RELATIONSHIPS,
} from '../../../test/fixtures/join-deep-cousin-scenario'
import { buildBranchForest } from './branch-tree'
import { assignGenerations, structureFromModel } from './family-structure'
import {
  analyzeLayout,
  branchColumnViolations,
  topLevelForestBranchRowOverlapViolations,
} from './layout-invariants'
import { CENTER_TOL_LARGE } from './layout-spacing'
import { computeTreeLayout } from './compute-tree-layout'
import { projectFamilyGraph } from './project-family-graph'

function buildModel() {
  const graph = buildFamilyGraph(TEST_FAMILY_ID, JOIN_DEEP_COUSIN_PEOPLE, JOIN_DEEP_COUSIN_RELATIONSHIPS)
  return projectFamilyGraph(graph)
}

function buildLayout() {
  return computeTreeLayout(buildModel())
}

describe('join deep cousin scenario (JDC)', () => {
  it('builds the asymmetric pedigree with expected scale', () => {
    expect(JOIN_DEEP_COUSIN_PEOPLE).toHaveLength(155)
    expect(JOIN_DEEP_COUSIN_RELATIONSHIPS.some((r) => r.type === 'spouse' && r.personAId === 'a3' && r.personBId === 'b3')).toBe(
      true,
    )
  })

  it('runs layout without missing nodes', async () => {
    const layout = await buildLayout()
    const personNodes = layout.nodes.filter((n) => n.kind === 'person')
    expect(personNodes).toHaveLength(JOIN_DEEP_COUSIN_PEOPLE.length)
  })

  it('plucks b3 beside a3 between a2 and a4 on the cross-marriage row', async () => {
    const layout = await buildLayout()
    const node = (id: string) => {
      const found = layout.nodes.find((entry) => entry.personId === id)
      if (!found) throw new Error(`missing ${id}`)
      return found
    }

    const a3 = node('a3')
    const b3 = node('b3')
    const a2 = node('a2')
    const a4 = node('a4')
    const gen1Order = layout.nodes
      .filter((entry) => entry.kind === 'person' && entry.y === a3.y)
      .sort((left, right) => left.x - right.x)
      .map((entry) => entry.personId!)

    expect(gen1Order.indexOf('a1')).toBeLessThan(gen1Order.indexOf('a2'))
    expect(gen1Order.indexOf('a2')).toBeLessThan(gen1Order.indexOf('a3'))
    expect(gen1Order.indexOf('a3')).toBeLessThan(gen1Order.indexOf('b3'))
    expect(gen1Order.indexOf('b3')).toBeLessThan(gen1Order.indexOf('a4'))
    expect(gen1Order.indexOf('a4')).toBeLessThan(gen1Order.indexOf('a6'))
    expect(Math.abs(gen1Order.indexOf('a3') - gen1Order.indexOf('b3'))).toBe(1)

    const bSide = ['b1', 'b2', 'b4'].map((id) => gen1Order.indexOf(id))
    expect(bSide.every((index) => index >= 0)).toBe(true)
    expect(bSide[0]).toBeLessThan(bSide[1])
    expect(bSide[1]).toBeLessThan(bSide[2])
    expect(bSide[0]).toBeGreaterThan(gen1Order.indexOf('b3'))

    expect(b3.x).toBeGreaterThan(a3.x)
    expect(a2.x).toBeLessThan(a3.x)
    expect(a4.x).toBeGreaterThan(b3.x)
  })

  it('has no gen1 row overlaps after join-parent placement', async () => {
    const layout = await buildLayout()
    const gen1Y = layout.nodes.find((entry) => entry.personId === 'a1')?.y
    const gen1 = layout.nodes
      .filter((entry) => entry.kind === 'person' && entry.y === gen1Y)
      .sort((left, right) => left.x - right.x)
    for (let i = 1; i < gen1.length; i++) {
      const gap = gen1[i].x - (gen1[i - 1].x + gen1[i - 1].width)
      expect(gap, `${gen1[i - 1].personId} -> ${gen1[i].personId}`).toBeGreaterThanOrEqual(-0.5)
    }
  })

  it('has no row overlaps or branch-column violations below gen1', async () => {
    const model = buildModel()
    const persons = model.nodes.filter((node) => node.kind === 'person')
    const structure = structureFromModel(model)
    const generations = assignGenerations(persons.map((node) => node.id), structure)
    const nodeById = new Map(persons.map((node) => [node.id, node]))
    const forest = buildBranchForest(persons.map((node) => node.id), structure, generations, nodeById)
    const layout = await buildLayout()
    const report = analyzeLayout(layout, structure)

    expect(report.overlapRows, `overlap rows: ${report.overlapRows.join(', ')}`).toEqual([])
    expect(topLevelForestBranchRowOverlapViolations(layout, forest.branches, structure)).toEqual([])
    expect(branchColumnViolations(layout, forest.branches, structure)).toEqual([])
  })

  it('centers parents over direct-child column spans including gen1', async () => {
    const layout = await buildLayout()
    const node = (id: string) => {
      const found = layout.nodes.find((entry) => entry.personId === id)
      if (!found) throw new Error(`missing ${id}`)
      return found
    }
    const coupleCenter = (leftId: string, rightId?: string) => {
      const left = node(leftId)
      if (!rightId) return left.x + left.width / 2
      const right = node(rightId)
      return (left.x + right.x + right.width) / 2
    }
    const clusterCenter = (ids: string[]) => {
      const nodes = ids.map((id) => node(id))
      const left = Math.min(...nodes.map((entry) => entry.x))
      const right = Math.max(...nodes.map((entry) => entry.x + entry.width))
      return (left + right) / 2
    }

    expect(Math.abs(coupleCenter('pa', 'pasp') - clusterCenter(['a1', 'a2', 'a3', 'a4', 'a5', 'a6']))).toBeLessThan(
      CENTER_TOL_LARGE,
    )
    expect(Math.abs(coupleCenter('pb', 'pbsp') - clusterCenter(['b1', 'b2', 'b4']))).toBeLessThan(
      CENTER_TOL_LARGE,
    )
    // Gen0 Pb must not include plucked b3 in its centering span.
    const pbCenter = coupleCenter('pb', 'pbsp')
    const b3Center = node('b3').x + node('b3').width / 2
    expect(Math.abs(pbCenter - b3Center)).toBeGreaterThan(CENTER_TOL_LARGE)
    expect(Math.abs(coupleCenter('a1') - clusterCenter(['a1c1', 'a1c2', 'a1c3']))).toBeLessThan(CENTER_TOL_LARGE)
    expect(Math.abs(coupleCenter('b1') - clusterCenter(['b1c1']))).toBeLessThan(CENTER_TOL_LARGE)
    expect(Math.abs(coupleCenter('a3') - clusterCenter(['a3c1', 'a3c2', 'a3c3', 'a3c4', 'a3c5', 'a3c6', 'a3c7']))).toBeLessThan(
      CENTER_TOL_LARGE,
    )
    expect(
      Math.abs(coupleCenter('a3c1') - clusterCenter(['a3c1g1', 'a3c1g2', 'a3c1g3'])),
    ).toBeLessThan(CENTER_TOL_LARGE)

    const a1Center = coupleCenter('a1')
    const a2Center = coupleCenter('a2')
    const a3Center = coupleCenter('a3')
    expect(a1Center).toBeLessThan(a2Center)
    expect(a2Center).toBeLessThan(a3Center)
    expect(Math.abs(a2Center - (a1Center + a3Center) / 2)).toBeLessThan(CENTER_TOL_LARGE)
  })

  it('avoids unnecessary horizontal slack between cousin columns', async () => {
    const layout = await buildLayout()
    const persons = layout.nodes.filter((entry) => entry.kind === 'person')
    const maxX = Math.max(...persons.map((entry) => entry.x + entry.width))
    // Tight join-order packing should stay well below the old ~47k blowout.
    expect(maxX).toBeLessThan(22_000)
  })

  it('keeps A children under Pa and B children under Pb only', () => {
    const aChildIds = new Set(['a1', 'a2', 'a3', 'a4', 'a5', 'a6'])
    const bChildIds = new Set(['b1', 'b2', 'b3', 'b4'])

    for (const rel of JOIN_DEEP_COUSIN_RELATIONSHIPS) {
      if (rel.type !== 'parent_child') continue
      if (rel.personAId === 'pa' || rel.personAId === 'pasp') {
        expect(aChildIds.has(rel.personBId), `${rel.personAId} → ${rel.personBId}`).toBe(true)
      }
      if (rel.personAId === 'pb' || rel.personAId === 'pbsp') {
        expect(bChildIds.has(rel.personBId), `${rel.personAId} → ${rel.personBId}`).toBe(true)
      }
    }
  })
})
