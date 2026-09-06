import { buildFamilyGraph } from '../../../domain/family-graph'
import {
  S14_FAMILY_ID,
  S14_PEOPLE,
  S14_RELATIONSHIPS,
} from '../../../test/fixtures/three-gen-layout-contract'
import { packPedigreeRowsWithTrace, type PackPedigreeStep } from './compact-subtrees'
import { assignGenerations, buildStructure } from './family-structure'
import type { LayoutModel, PositionedNode } from './layout-model'
import { contractRuleViolations, type ContractViolation } from './layout-contract-assertions'
import { PERSON_H, ROW_GAP } from './layout-spacing'
import { projectFamilyGraph } from './project-family-graph'

export interface LayoutPipelineStage {
  name: PackPedigreeStep
  nodes: PositionedNode[]
  violations: ContractViolation[]
}

export interface S14PipelineTrace {
  model: LayoutModel
  stages: LayoutPipelineStage[]
  firstViolation: { stage: LayoutPipelineStage['name']; violations: ContractViolation[] } | null
}

export async function traceS14LayoutPipeline(): Promise<S14PipelineTrace> {
  const graph = buildFamilyGraph(S14_FAMILY_ID, S14_PEOPLE, S14_RELATIONSHIPS)
  const model = projectFamilyGraph(graph)

  const persons = model.nodes.filter((node) => node.kind === 'person')
  const kindById = new Map(model.nodes.map((node) => [node.id, node.kind]))
  const edges = model.edges
  const structure = buildStructure(edges, kindById)
  const personIds = persons.map((node) => node.id).sort()
  const generations = assignGenerations(personIds, structure)

  const personHeight = persons[0]?.height ?? PERSON_H
  const positioned: PositionedNode[] = persons.map((person) => ({
    ...person,
    x: 0,
    y: (generations.get(person.id) ?? 0) * (personHeight + ROW_GAP),
  }))

  const stages: LayoutPipelineStage[] = packPedigreeRowsWithTrace(positioned, structure, generations).map(
    ({ step, nodes }) => ({
      name: step,
      nodes,
      violations: contractRuleViolations(nodes),
    }),
  )

  const failingStage = stages.find((stage) => stage.violations.length > 0)
  const firstViolation = failingStage
    ? { stage: failingStage.name, violations: failingStage.violations }
    : null

  return { model, stages, firstViolation }
}

export function formatPipelineTrace(trace: S14PipelineTrace): string {
  const lines = trace.stages.map((stage) => {
    const status = stage.violations.length === 0 ? 'ok' : `${stage.violations.length} violation(s)`
    return `${stage.name}: ${status}`
  })
  if (trace.firstViolation) {
    lines.push('')
    lines.push(`first violation at ${trace.firstViolation.stage}:`)
    for (const violation of trace.firstViolation.violations.slice(0, 5)) {
      lines.push(`  [${violation.rule}] ${violation.detail}`)
    }
  }
  return lines.join('\n')
}
