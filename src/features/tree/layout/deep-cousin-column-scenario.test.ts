import { describe, expect, it } from 'vitest'
import { buildFamilyGraph } from '../../../domain/family-graph'
import { TEST_FAMILY_ID } from '../../../test/fixtures/family'
import {
  DEEP_COUSIN_COLUMN_PEOPLE,
  DEEP_COUSIN_COLUMN_RELATIONSHIPS,
} from '../../../test/fixtures/deep-cousin-column-scenario'
import { buildBranchForest } from './branch-tree'
import { assignGenerations, structureFromModel } from './family-structure'
import {
  branchColumnViolations,
  topLevelForestBranchRowOverlapViolations,
} from './layout-invariants'
import { FAMILY_GAP, SIBLING_GAP } from './layout-spacing'
import { computeTreeLayout } from './compute-tree-layout'
import { projectFamilyGraph } from './project-family-graph'

function gapBetween(layout: Awaited<ReturnType<typeof computeTreeLayout>>, leftId: string, rightId: string) {
  const left = layout.nodes.find((entry) => entry.personId === leftId)
  const right = layout.nodes.find((entry) => entry.personId === rightId)
  if (!left || !right) throw new Error(`missing ${leftId} or ${rightId}`)
  return right.x - (left.x + left.width)
}

describe('deep cousin column scenario (DCC)', () => {
  it('keeps Vik between E1 and Ben on the half-sibling child row', async () => {
    const layout = await computeTreeLayout(
      projectFamilyGraph(
        buildFamilyGraph(TEST_FAMILY_ID, DEEP_COUSIN_COLUMN_PEOPLE, DEEP_COUSIN_COLUMN_RELATIONSHIPS),
      ),
    )

    const node = (id: string) => {
      const found = layout.nodes.find((entry) => entry.personId === id)
      if (!found) throw new Error(`missing ${id}`)
      return found
    }

    const e1X = node('e1').x
    const vikX = node('vik').x
    const benX = node('ben').x

    expect(vikX, `e1=${e1X} vik=${vikX} ben=${benX}`).toBeGreaterThan(e1X)
    expect(vikX).toBeLessThan(benX)
  })

  it('uses family gap between C2 and C3 columns and avoids excess slack before C2', async () => {
    const layout = await computeTreeLayout(
      projectFamilyGraph(
        buildFamilyGraph(TEST_FAMILY_ID, DEEP_COUSIN_COLUMN_PEOPLE, DEEP_COUSIN_COLUMN_RELATIONSHIPS),
      ),
    )

    expect(gapBetween(layout, 'f2', 'f3a')).toBeGreaterThanOrEqual(FAMILY_GAP - 0.5)
    expect(gapBetween(layout, 'c1', 'c2')).toBeLessThan(6 * (FAMILY_GAP + 208))
    expect(gapBetween(layout, 'f3a', 'f3b')).toBeGreaterThanOrEqual(FAMILY_GAP - 0.5)
    expect(gapBetween(layout, 'f3ac', 'f3bc')).toBeGreaterThanOrEqual(FAMILY_GAP - 0.5)
    expect(gapBetween(layout, 'f3d', 'f3e')).toBeGreaterThanOrEqual(SIBLING_GAP - 0.5)
    expect(gapBetween(layout, 'f3d', 'f3e')).toBeLessThan(FAMILY_GAP)
  })

  it('centers Ana over C1–C3 and G0 over the gen1 row', async () => {
    const layout = await computeTreeLayout(
      projectFamilyGraph(
        buildFamilyGraph(TEST_FAMILY_ID, DEEP_COUSIN_COLUMN_PEOPLE, DEEP_COUSIN_COLUMN_RELATIONSHIPS),
      ),
    )

    const node = (id: string) => {
      const found = layout.nodes.find((entry) => entry.personId === id)
      if (!found) throw new Error(`missing ${id}`)
      return found
    }
    const coupleCenter = (leftId: string, rightId: string) => {
      const left = node(leftId)
      const right = node(rightId)
      return (left.x + right.x + right.width) / 2
    }
    const clusterCenter = (ids: string[]) => {
      const nodes = ids.map((id) => node(id))
      const left = Math.min(...nodes.map((entry) => entry.x))
      const right = Math.max(...nodes.map((entry) => entry.x + entry.width))
      return (left + right) / 2
    }

    const anaCenter = coupleCenter('ana', 'anasp')
    const gen2Center = clusterCenter(['c1', 'c2', 'c3'])
    const g0Center = coupleCenter('g0', 'g0sp')
    const gen1Center = clusterCenter(['ana', 'anasp', 'bob', 'bobsp'])

    expect(Math.abs(anaCenter - gen2Center)).toBeLessThan(1)
    expect(Math.abs(g0Center - gen1Center)).toBeLessThan(1)
  })

  it('keeps Ana children before Bob child on the gen2 row (c1, c2, c3, then d1)', async () => {
    const layout = await computeTreeLayout(
      projectFamilyGraph(
        buildFamilyGraph(TEST_FAMILY_ID, DEEP_COUSIN_COLUMN_PEOPLE, DEEP_COUSIN_COLUMN_RELATIONSHIPS),
      ),
    )
    const node = (id: string) => {
      const found = layout.nodes.find((entry) => entry.personId === id)
      if (!found) throw new Error(`missing ${id}`)
      return found
    }
    expect(node('c1').x).toBeLessThan(node('c2').x)
    expect(node('c2').x).toBeLessThan(node('c3').x)
    expect(node('c3').x).toBeLessThan(node('d1').x)
  })

  it('keeps cousin branch columns separated at every depth', async () => {
    const model = projectFamilyGraph(
      buildFamilyGraph(TEST_FAMILY_ID, DEEP_COUSIN_COLUMN_PEOPLE, DEEP_COUSIN_COLUMN_RELATIONSHIPS),
    )
    const persons = model.nodes.filter((node) => node.kind === 'person')
    const structure = structureFromModel(model)
    const generations = assignGenerations(persons.map((node) => node.id), structure)
    const nodeById = new Map(persons.map((node) => [node.id, node]))
    const forest = buildBranchForest(persons.map((node) => node.id), structure, generations, nodeById)
    const layout = await computeTreeLayout(model)

    expect(topLevelForestBranchRowOverlapViolations(layout, forest.branches, structure)).toEqual([])
    expect(branchColumnViolations(layout, forest.branches, structure)).toEqual([])
  })
})
