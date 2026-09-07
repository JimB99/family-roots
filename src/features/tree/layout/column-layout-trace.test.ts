import { describe, expect, it } from 'vitest'
import { buildFamilyGraph } from '../../../domain/family-graph'
import { TEST_FAMILY_ID } from '../../../test/fixtures/family'
import {
  WIDE_FOUR_GEN_PEDIGREE_PEOPLE,
  WIDE_FOUR_GEN_PEDIGREE_RELATIONSHIPS,
} from '../../../test/fixtures/wide-four-gen-pedigree-scenario'
import { COLUMN_LAYOUT_TRACE_STEPS } from './column-layout-trace-steps'
import {
  firstSlackJumpStage,
  formatColumnLayoutTrace,
  traceLayoutComponentColumnPipeline,
} from './column-layout-trace'
import { assignGenerations, structureFromModel } from './family-structure'
import { computeTreeLayout } from './compute-tree-layout'
import { projectFamilyGraph } from './project-family-graph'

describe('column layout pipeline trace (W3G)', () => {
  it('records each layout phase with width and cousin-slack metrics', async () => {
    const graph = buildFamilyGraph(
      TEST_FAMILY_ID,
      WIDE_FOUR_GEN_PEDIGREE_PEOPLE,
      WIDE_FOUR_GEN_PEDIGREE_RELATIONSHIPS,
    )
    const model = projectFamilyGraph(graph)
    const structure = structureFromModel(model)
    const persons = model.nodes.filter((node) => node.kind === 'person')
    const unions = model.nodes.filter((node) => node.kind === 'union')
    const generations = assignGenerations(persons.map((node) => node.id), structure)

    const trace = traceLayoutComponentColumnPipeline(persons, unions, structure, generations)
    const layout = await computeTreeLayout(model)

    expect(trace.stages.map((stage) => stage.step)).toEqual(
      COLUMN_LAYOUT_TRACE_STEPS.map((entry) => entry.id),
    )

    for (const stage of trace.stages) {
      expect(stage.title.length).toBeGreaterThan(0)
      expect(stage.description.length).toBeGreaterThan(0)
      expect(stage.whyOrder.length).toBeGreaterThan(0)
      expect(stage.nodes.length).toBe(WIDE_FOUR_GEN_PEDIGREE_PEOPLE.length)
      expect(stage.metrics.width).toBeGreaterThan(0)
    }

    const finalStage = trace.stages.at(-1)!
    const finalPersons = layout.nodes.filter((node) => node.kind === 'person')
    for (const person of finalPersons) {
      const traced = finalStage.nodes.find((node) => node.id === person.personId)
      expect(traced, `missing ${person.personId} in final trace stage`).toBeDefined()
      expect(traced!.x).toBe(Math.round(person.x))
      expect(traced!.y).toBe(Math.round(person.y))
    }

    const jump = firstSlackJumpStage(trace, 500)
    if (jump) {
      console.log(`first large slack jump at ${jump.step}:\n${formatColumnLayoutTrace(trace)}`)
    }

    expect(finalStage.metrics.maxCousinSlack).toBeGreaterThan(0)
  })
})
