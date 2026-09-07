import { buildBranchForest, crossFamilyCouplesAtRow } from './branch-tree'
import { layoutColumnForest, spreadColumnsAfterJoin, repairGenRowHubSiblingGaps } from './column-branch-layout'
import { assignGenerations, type FamilyStructure } from './family-structure'
import { applyJoinParentPlacement, joinRowBloodRelatives, joinRowPlacementMode, reapplyJoinParentCentering } from './join-parent-placement'
import type { PositionedNode } from './layout-model'
import { PERSON_H } from './layout-spacing'

export const CONTRACT_PACK_STEPS = [
  'buildBranchForest',
  'layoutColumnForest',
  'packCrossFamilyJoinRows',
] as const

export type ContractPackStep = (typeof CONTRACT_PACK_STEPS)[number]

interface LayoutContext {
  nodes: PositionedNode[]
  structure: FamilyStructure
  generations: Map<string, number>
  personHeight: number
  nodeById: Map<string, PositionedNode>
  forest: ReturnType<typeof buildBranchForest>
  deferHorizontalPack: boolean
}

function buildContext(
  mutable: PositionedNode[],
  structure: FamilyStructure,
  generations: Map<string, number>,
): LayoutContext {
  const personIds = mutable.filter((node) => node.kind === 'person').map((node) => node.id)
  const nodeById = new Map(mutable.map((node) => [node.id, node]))
  const forest = buildBranchForest(personIds, structure, generations, nodeById)
  const personHeight = mutable.find((node) => node.kind === 'person')?.height ?? PERSON_H
  return {
    nodes: mutable,
    structure,
    generations,
    personHeight,
    nodeById,
    forest,
    deferHorizontalPack: false,
  }
}

function hasCrossFamilyJoinOnBranchRow(ctx: LayoutContext): boolean {
  const row = ctx.forest.branchGen
  const rowPersonIds = ctx.nodes
    .filter((node) => node.kind === 'person' && (ctx.generations.get(node.id) ?? 0) === row)
    .map((node) => node.id)
  const bloodIds = joinRowBloodRelatives(rowPersonIds, ctx.structure)
  return crossFamilyCouplesAtRow(bloodIds, ctx.structure).length > 0
}

function shouldDeferHorizontalPack(ctx: LayoutContext): boolean {
  if (!hasCrossFamilyJoinOnBranchRow(ctx)) return false
  const row = ctx.forest.branchGen
  const rowPersonIds = ctx.nodes
    .filter((node) => node.kind === 'person' && (ctx.generations.get(node.id) ?? 0) === row)
    .map((node) => node.id)
  return joinRowPlacementMode(row, rowPersonIds, ctx.structure, ctx.generations, ctx.nodeById) === 'bride-anchored'
}

function columnCtx(ctx: LayoutContext) {
  return {
    nodes: ctx.nodes,
    structure: ctx.structure,
    personHeight: ctx.personHeight,
    nodeById: ctx.nodeById,
  }
}

/** True when join-parent defers forest finalize and uses spreadColumnsAfterJoin (Aguilar cross-marriage). */
export function needsDeferredJoinHorizontalPack(
  nodes: PositionedNode[],
  structure: FamilyStructure,
  generations: Map<string, number>,
): boolean {
  const ctx = buildContext(nodes.map((node) => ({ ...node })), structure, generations)
  return shouldDeferHorizontalPack(ctx)
}

function applyStep(step: ContractPackStep, ctx: LayoutContext) {
  switch (step) {
    case 'buildBranchForest':
      break
    case 'layoutColumnForest':
      ctx.deferHorizontalPack = shouldDeferHorizontalPack(ctx)
      layoutColumnForest(ctx.forest, columnCtx(ctx), {
        deferHorizontalPack: ctx.deferHorizontalPack,
      })
      break
    case 'packCrossFamilyJoinRows': {
      applyJoinParentPlacement(ctx.nodes, ctx.structure, ctx.generations)
      if (ctx.deferHorizontalPack) {
        spreadColumnsAfterJoin(ctx.forest, columnCtx(ctx))
        reapplyJoinParentCentering(ctx.nodes, ctx.structure, ctx.generations)
        repairGenRowHubSiblingGaps(ctx.forest, columnCtx(ctx))
      }
      break
    }
  }
}

export function applyBranchContractLayoutWithTrace(
  nodes: PositionedNode[],
  structure: FamilyStructure,
  generations: Map<string, number>,
): Array<{ step: ContractPackStep; nodes: PositionedNode[] }> {
  const mutable = nodes.map((node) => ({ ...node }))
  const ctx = buildContext(mutable, structure, generations)
  const traces: Array<{ step: ContractPackStep; nodes: PositionedNode[] }> = []
  for (const step of CONTRACT_PACK_STEPS) {
    applyStep(step, ctx)
    traces.push({ step, nodes: mutable.map((node) => ({ ...node })) })
  }
  return traces
}

export function applyBranchContractLayout(
  nodes: PositionedNode[],
  structure: FamilyStructure,
  generations?: Map<string, number>,
): PositionedNode[] {
  const mutable = nodes.map((node) => ({ ...node }))
  const personIds = mutable.filter((node) => node.kind === 'person').map((node) => node.id)
  const gens = generations ?? assignGenerations(personIds, structure)
  const ctx = buildContext(mutable, structure, gens)
  for (const step of CONTRACT_PACK_STEPS) {
    applyStep(step, ctx)
  }
  return mutable
}
