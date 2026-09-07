import {
  COLUMN_LAYOUT_TRACE_STEPS,
  type ColumnLayoutTraceStepId,
  traceStepMeta,
} from './column-layout-trace-steps'
import {
  JOIN_LAYOUT_TRACE_STEPS,
  type JoinLayoutTraceStepId,
  joinTraceStepMeta,
} from './join-layout-trace-steps'

const JOIN_ONLY_STEPS: JoinLayoutTraceStepId[] = [
  'joinParentPlacement',
  'joinPackDescendants',
  'joinBindingRow',
  'joinResolveOverlaps',
  'joinBindingRowFinal',
  'joinRecenterHubs',
  'joinRecenterParents',
]

const COLUMN_FINALIZE_STEPS: ColumnLayoutTraceStepId[] = [
  'packSiblingBranches',
  'enforceTopLevelSiblingGaps',
  'alignUnderUnions',
  'placeCousinColumnsBindingRow',
  'convergeRecenterRepair',
  'repairCousinColumnsBindingRow',
  'convergeRecenterFinal',
  'finalizeCousinColumnsBindingRow',
  'finalizeParentRow',
]

const SHARED_PREFIX: ColumnLayoutTraceStepId[] = ['initialRows', 'branchInteriors', 'cousinPackLocal']

export type ContractLayoutTraceStepId = ColumnLayoutTraceStepId | JoinLayoutTraceStepId

export function contractPipelineStepOrder(deferJoinHorizontalPack: boolean): ContractLayoutTraceStepId[] {
  if (deferJoinHorizontalPack) {
    return [...SHARED_PREFIX, ...JOIN_ONLY_STEPS, 'withUnions']
  }
  return [...SHARED_PREFIX, ...COLUMN_FINALIZE_STEPS, 'withUnions']
}

export const CONTRACT_LAYOUT_TRACE_STEPS = [
  ...COLUMN_LAYOUT_TRACE_STEPS.filter((entry) => entry.id !== 'withUnions'),
  ...JOIN_LAYOUT_TRACE_STEPS.filter(
    (entry) => !SHARED_PREFIX.includes(entry.id as ColumnLayoutTraceStepId) && entry.id !== 'withUnions',
  ),
  COLUMN_LAYOUT_TRACE_STEPS.find((entry) => entry.id === 'withUnions')!,
]

export function contractTraceStepMeta(stepId: ContractLayoutTraceStepId) {
  if (JOIN_ONLY_STEPS.includes(stepId as JoinLayoutTraceStepId)) {
    return joinTraceStepMeta(stepId as JoinLayoutTraceStepId)
  }
  return traceStepMeta(stepId as ColumnLayoutTraceStepId)
}
