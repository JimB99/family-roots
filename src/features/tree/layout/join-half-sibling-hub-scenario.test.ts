import { describe, expect, it } from 'vitest'
import { buildFamilyGraph } from '../../../domain/family-graph'
import { TEST_FAMILY_ID } from '../../../test/fixtures/family'
import {
  JOIN_HALF_SIBLING_HUB_PEOPLE,
  JOIN_HALF_SIBLING_HUB_RELATIONSHIPS,
} from '../../../test/fixtures/join-half-sibling-hub-scenario'
import { traceLayoutComponentContractPipeline } from './contract-layout-trace'
import { computeTreeLayout } from './compute-tree-layout'
import { assignGenerations, structureFromModel } from './family-structure'
import { projectFamilyGraph } from './project-family-graph'
import { SIBLING_GAP } from './layout-spacing'
import type { Person, Relationship } from '../../../types'

function layoutPeople(people: Person[], relationships: Relationship[]) {
  const model = projectFamilyGraph(buildFamilyGraph(TEST_FAMILY_ID, people, relationships))
  return computeTreeLayout(model)
}

function clusterLeft(layout: Awaited<ReturnType<typeof computeTreeLayout>>, ids: string[]) {
  const nodes = ids.map((id) => {
    const found = layout.nodes.find((entry) => entry.personId === id)
    if (!found) throw new Error(`missing ${id}`)
    return found
  })
  return Math.min(...nodes.map((node) => node.x))
}

function clusterRight(layout: Awaited<ReturnType<typeof computeTreeLayout>>, ids: string[]) {
  const nodes = ids.map((id) => {
    const found = layout.nodes.find((entry) => entry.personId === id)
    if (!found) throw new Error(`missing ${id}`)
    return found
  })
  return Math.max(...nodes.map((node) => node.x + node.width))
}

function siblingClusterGap(
  layout: Awaited<ReturnType<typeof computeTreeLayout>>,
  leftIds: string[],
  rightIds: string[],
) {
  return clusterLeft(layout, rightIds) - clusterRight(layout, leftIds)
}

describe('join half-sibling hub scenario (JHS)', () => {
  const people = JOIN_HALF_SIBLING_HUB_PEOPLE
  const relationships = JOIN_HALF_SIBLING_HUB_RELATIONSHIPS

  it('uses the deferred join horizontal pack path', () => {
    const graph = buildFamilyGraph(TEST_FAMILY_ID, people, relationships)
    const model = projectFamilyGraph(graph)
    const structure = structureFromModel(model)
    const persons = model.nodes.filter((node) => node.kind === 'person')
    const generations = assignGenerations(persons.map((node) => node.id), structure)
    const trace = traceLayoutComponentContractPipeline(
      persons,
      model.nodes.filter((node) => node.kind === 'union'),
      structure,
      generations,
    )

    expect(trace.deferJoinHorizontalPack).toBe(true)
  })

  it('keeps Viktoria between Nadja and Benjamin with sibling gaps on the join path', async () => {
    const layout = await layoutPeople(people, relationships)
    const node = (id: string) => {
      const found = layout.nodes.find((entry) => entry.personId === id)
      if (!found) throw new Error(`missing ${id}`)
      return found
    }

    expect(node('viktoria').x).toBeGreaterThan(node('nadja').x)
    expect(node('viktoria').x).toBeLessThan(node('benjamin').x)
    expect(siblingClusterGap(layout, ['nadja', 'steven'], ['viktoria', 'christian'])).toBe(SIBLING_GAP)
    expect(siblingClusterGap(layout, ['viktoria', 'christian'], ['benjamin', 'sarah'])).toBe(SIBLING_GAP)
  })

  it('does not blow horizontal width at joinPackDescendants', () => {
    const graph = buildFamilyGraph(TEST_FAMILY_ID, people, relationships)
    const model = projectFamilyGraph(graph)
    const structure = structureFromModel(model)
    const persons = model.nodes.filter((node) => node.kind === 'person')
    const unions = model.nodes.filter((node) => node.kind === 'union')
    const generations = assignGenerations(persons.map((node) => node.id), structure)
    const trace = traceLayoutComponentContractPipeline(persons, unions, structure, generations)
    const afterJoinParent = trace.stages.find((stage) => stage.step === 'joinParentPlacement')
    const afterPack = trace.stages.find((stage) => stage.step === 'joinPackDescendants')
    expect(afterJoinParent).toBeDefined()
    expect(afterPack).toBeDefined()
    expect(afterPack!.metrics.width).toBeLessThan(afterJoinParent!.metrics.width * 3)
  })
})
