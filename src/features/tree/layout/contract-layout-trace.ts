import { buildBranchForest } from './branch-tree'
import { needsDeferredJoinHorizontalPack } from './branch-contract-layout'
import {
  contractPipelineStepOrder,
  contractTraceStepMeta,
  type ContractLayoutTraceStepId,
} from './contract-layout-trace-steps'
import {
  layoutColumnForest,
  spreadColumnsAfterJoin,
  type ColumnLayoutPhaseRecorder,
  type JoinLayoutPhaseRecorder,
} from './column-branch-layout'
import { parentGeneration, type FamilyStructure } from './family-structure'
import { applyJoinParentPlacement, reapplyJoinParentCentering } from './join-parent-placement'
import { analyzeLayout } from './layout-invariants'
import type { LayoutNode, PositionedLayout, PositionedNode } from './layout-model'
import { meanOrNull } from './layout-order'
import { FAMILY_GAP, PERSON_H, ROW_GAP } from './layout-spacing'

export interface ContractLayoutTraceMetrics {
  width: number
  maxCousinSlack: number
  cousinPairCount: number
}

export interface SerializedContractTraceNode {
  id: string
  label: string
  x: number
  y: number
  w: number
  h: number
}

export interface ContractLayoutTraceStage {
  step: ContractLayoutTraceStepId
  title: string
  description: string
  whyOrder: string
  metrics: ContractLayoutTraceMetrics
  nodes: SerializedContractTraceNode[]
}

export interface ContractLayoutPipelineTrace {
  stages: ContractLayoutTraceStage[]
  stepOrder: ContractLayoutTraceStepId[]
  deferJoinHorizontalPack: boolean
}

function rowY(generation: number, personHeight: number): number {
  return generation * (personHeight + ROW_GAP)
}

function serializePersonNodes(nodes: PositionedNode[]): SerializedContractTraceNode[] {
  return nodes
    .filter((node) => node.kind === 'person' && node.personId != null)
    .map((node) => ({
      id: node.personId!,
      label: node.givenNames,
      x: Math.round(node.x),
      y: Math.round(node.y),
      w: Math.round(node.width),
      h: Math.round(node.height),
    }))
}

function metricsForNodes(nodes: PositionedNode[], structure: FamilyStructure): ContractLayoutTraceMetrics {
  const personNodes = nodes.filter((node) => node.kind === 'person')
  const width =
    personNodes.length === 0
      ? 0
      : Math.round(Math.max(...personNodes.map((node) => node.x + node.width)))
  const minY = personNodes.length === 0 ? 0 : Math.min(...personNodes.map((node) => node.y))
  const maxY =
    personNodes.length === 0 ? 0 : Math.max(...personNodes.map((node) => node.y + node.height))
  const layout: PositionedLayout = {
    nodes: personNodes,
    edges: [],
    components: [],
    bounds: { minX: 0, minY, maxX: width, maxY },
  }
  const report = analyzeLayout(layout, structure)
  const slackValues = report.cousinGaps
    .filter((gap) => gap.gap > FAMILY_GAP + 0.5)
    .map((gap) => gap.gap - FAMILY_GAP)
  return {
    width,
    maxCousinSlack: slackValues.length > 0 ? Math.round(Math.max(...slackValues)) : 0,
    cousinPairCount: report.cousinGaps.length,
  }
}

function buildStage(
  step: ContractLayoutTraceStepId,
  nodes: PositionedNode[],
  structure: FamilyStructure,
): ContractLayoutTraceStage {
  const meta = contractTraceStepMeta(step)
  return {
    step,
    title: meta.title,
    description: meta.description,
    whyOrder: meta.whyOrder,
    metrics: metricsForNodes(nodes, structure),
    nodes: serializePersonNodes(nodes),
  }
}

function placeUnions(
  persons: PositionedNode[],
  unions: LayoutNode[],
  structure: FamilyStructure,
  generations: Map<string, number>,
  personHeight: number,
): PositionedNode[] {
  const byId = new Map(persons.map((node) => [node.id, node]))
  const withUnions: PositionedNode[] = [...persons]
  for (const union of unions) {
    const parents = (structure.unionParents.get(union.id) ?? [])
      .map((id) => byId.get(id))
      .filter((node): node is PositionedNode => node != null)
    const children = (structure.unionChildren.get(union.id) ?? [])
      .map((id) => byId.get(id))
      .filter((node): node is PositionedNode => node != null)
    const parentCenters = parents.map((node) => node.x + node.width / 2)
    const childCenters = children.map((node) => node.x + node.width / 2)
    const center = meanOrNull(parentCenters) ?? meanOrNull(childCenters) ?? 0
    const parentGen = parentGeneration(union.id, structure, generations)
    const y = rowY(parentGen, personHeight) + personHeight + (ROW_GAP - union.height) / 2
    withUnions.push({ ...union, x: center - union.width / 2, y })
  }
  return withUnions
}

function normalizeComponent(nodes: PositionedNode[]): PositionedNode[] {
  let minX = Infinity
  let minY = Infinity
  for (const node of nodes) {
    minX = Math.min(minX, node.x)
    minY = Math.min(minY, node.y)
  }
  if (!Number.isFinite(minX)) return nodes
  return nodes.map((node) => ({ ...node, x: node.x - minX, y: node.y - minY }))
}

/**
 * Run the full branch-contract layout pipeline on one component and snapshot after each phase.
 * Uses join-parent spread when bride-anchored cross-marriage applies (Aguilar); otherwise column finalize.
 */
export function traceLayoutComponentContractPipeline(
  persons: LayoutNode[],
  unions: LayoutNode[],
  structure: FamilyStructure,
  generations: Map<string, number>,
): ContractLayoutPipelineTrace {
  const personHeight = persons[0]?.height ?? PERSON_H
  const mutable: PositionedNode[] = persons.map((person) => ({
    ...person,
    x: 0,
    y: rowY(generations.get(person.id) ?? 0, personHeight),
  }))

  const deferJoinHorizontalPack = needsDeferredJoinHorizontalPack(mutable, structure, generations)

  const stages: ContractLayoutTraceStage[] = []
  const record = (step: ContractLayoutTraceStepId, nodes: PositionedNode[]) => {
    stages.push(buildStage(step, nodes, structure))
  }

  record('initialRows', mutable)

  const personIds = mutable.filter((node) => node.kind === 'person').map((node) => node.id)
  const nodeById = new Map(mutable.map((node) => [node.id, node]))
  const forest = buildBranchForest(personIds, structure, generations, nodeById)
  const columnCtx = {
    nodes: mutable,
    structure,
    personHeight,
    nodeById,
  }

  const onColumnPhase: ColumnLayoutPhaseRecorder = (step) => {
    if (deferJoinHorizontalPack) {
      if (step === 'branchInteriors' || step === 'cousinPackLocal') record(step, mutable)
      return
    }
    if (step !== 'initialRows') record(step as ContractLayoutTraceStepId, mutable)
  }

  layoutColumnForest(forest, columnCtx, {
    deferHorizontalPack: deferJoinHorizontalPack,
    onPhase: onColumnPhase,
  })

  if (deferJoinHorizontalPack) {
    applyJoinParentPlacement(mutable, structure, generations)
    record('joinParentPlacement', mutable)

    const onJoinPhase: JoinLayoutPhaseRecorder = (step) => {
      record(step, mutable)
    }

    spreadColumnsAfterJoin(forest, columnCtx, onJoinPhase)

    reapplyJoinParentCentering(mutable, structure, generations)
    record('joinRecenterParents', mutable)
  }

  const withUnions = normalizeComponent(placeUnions(mutable, unions, structure, generations, personHeight))
  record('withUnions', withUnions)

  return {
    stages,
    stepOrder: contractPipelineStepOrder(deferJoinHorizontalPack),
    deferJoinHorizontalPack,
  }
}

export function formatContractLayoutTrace(trace: ContractLayoutPipelineTrace): string {
  const path = trace.deferJoinHorizontalPack ? 'join' : 'column'
  return [
    `pipeline: ${path}`,
    ...trace.stages.map((stage) => {
      const slack =
        stage.metrics.maxCousinSlack > 0
          ? ` · max cousin slack ${stage.metrics.maxCousinSlack}px`
          : ''
      return `${stage.step}: ${stage.metrics.width}px wide${slack}`
    }),
  ].join('\n')
}
