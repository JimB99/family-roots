import { describe, expect, it } from 'vitest'
import { buildFamilyGraph } from '../../../domain/family-graph'
import { TEST_FAMILY_ID } from '../../../test/fixtures/family'
import {
  JOIN_DEEP_COUSIN_PEOPLE,
  JOIN_DEEP_COUSIN_RELATIONSHIPS,
} from '../../../test/fixtures/join-deep-cousin-scenario'
import { JOIN_LAYOUT_TRACE_STEPS } from './join-layout-trace-steps'
import { formatJoinLayoutTrace, traceLayoutComponentJoinPipeline } from './join-layout-trace'
import { assignGenerations, structureFromModel } from './family-structure'
import { computeTreeLayout } from './compute-tree-layout'
import { projectFamilyGraph } from './project-family-graph'

describe('join layout pipeline trace (JDC)', () => {
  it('records each join-parent phase with width and cousin-slack metrics', async () => {
    const graph = buildFamilyGraph(TEST_FAMILY_ID, JOIN_DEEP_COUSIN_PEOPLE, JOIN_DEEP_COUSIN_RELATIONSHIPS)
    const model = projectFamilyGraph(graph)
    const structure = structureFromModel(model)
    const persons = model.nodes.filter((node) => node.kind === 'person')
    const unions = model.nodes.filter((node) => node.kind === 'union')
    const generations = assignGenerations(persons.map((node) => node.id), structure)

    const trace = traceLayoutComponentJoinPipeline(persons, unions, structure, generations)
    const layout = await computeTreeLayout(model)

    expect(trace.stages.map((stage) => stage.step)).toEqual(
      JOIN_LAYOUT_TRACE_STEPS.map((entry) => entry.id),
    )

    for (const stage of trace.stages) {
      expect(stage.title.length).toBeGreaterThan(0)
      expect(stage.description.length).toBeGreaterThan(0)
      expect(stage.whyOrder.length).toBeGreaterThan(0)
      expect(stage.nodes.length).toBe(JOIN_DEEP_COUSIN_PEOPLE.length)
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

    expect(formatJoinLayoutTrace(trace).split('\n').length).toBe(trace.stages.length)
  })
})
