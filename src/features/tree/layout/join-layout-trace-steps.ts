/** Join-parent layout pipeline phases (JDC cross-marriage slack investigation). */
export const JOIN_LAYOUT_TRACE_STEPS = [
  {
    id: 'initialRows',
    title: 'Initial row assignment',
    description: 'Each person gets a generation row (y) and x = 0.',
    whyOrder: 'Same starting point as the column pipeline.',
  },
  {
    id: 'branchInteriors',
    title: 'Bottom-up branch interiors',
    description: 'Pack children, sibling gaps, and union alignment inside each branch (deferred horizontal pack).',
    whyOrder: 'Column interiors must exist before join-parent reorders the gen-1 row.',
  },
  {
    id: 'cousinPackLocal',
    title: 'Cousin columns — binding row (local)',
    description: 'Local binding-row separation within branches before join-parent runs.',
    whyOrder: 'Minimum column coherence before the cross-marriage row is packed.',
  },
  {
    id: 'joinParentPlacement',
    title: 'Join-parent row packing',
    description: 'Plucks the cross-family spouse (e.g. b3) beside a3 and packs the gen-1 row in join order.',
    whyOrder: 'Defines anchor order; horizontal spread must not move this row.',
  },
  {
    id: 'joinPackDescendants',
    title: 'Join-order descendant tiling',
    description:
      'Top-level branches tiled in join order at the gen-2 row using column intervals (join row frozen). Half-sibling hubs repacked before placement.',
    whyOrder: 'First coarse placement below the cross-marriage hub without full-subtree bbox gaps.',
  },
  {
    id: 'joinBindingRow',
    title: 'Cousin columns — binding row (join)',
    description:
      'Sorted left-to-right binding-row shifts below the join row only (descendantOnlyBelowY). Includes join-order top-level columns.',
    whyOrder: 'Replaces per-row accumulation that blew gaps beside a3|b3.',
  },
  {
    id: 'joinResolveOverlaps',
    title: 'Join-order overlap repair',
    description: 'Nudges later join-ordered columns right when gen-2+ subtree bboxes overlap.',
    whyOrder: 'Binding-row can leave bbox overlaps; one pass closes them without moving gen-1 anchors.',
  },
  {
    id: 'joinBindingRowFinal',
    title: 'Cousin columns — binding row (join, final)',
    description: 'Second binding-row pass after overlap repair.',
    whyOrder: 'Overlap repair shifts columns; binding row restores minimum separation.',
  },
  {
    id: 'joinRecenterHubs',
    title: 'Join hub recenter',
    description: 'Center sibling-row hubs and nested branches after column spread (join row untouched).',
    whyOrder: 'Subtree spread disturbs hub centering over child columns.',
  },
  {
    id: 'joinRecenterParents',
    title: 'Join-parent recenter',
    description: 'Re-center join-parent couples over their child spans without re-packing the join row.',
    whyOrder: 'Column spread moves descendants; parents must track their children.',
  },
  {
    id: 'withUnions',
    title: 'Union nodes placed',
    description: 'Union diamonds at midpoints; component normalized to origin.',
    whyOrder: 'Matches computeTreeLayout output.',
  },
] as const

export type JoinLayoutTraceStepId = (typeof JOIN_LAYOUT_TRACE_STEPS)[number]['id']

export function joinTraceStepMeta(stepId: JoinLayoutTraceStepId) {
  const found = JOIN_LAYOUT_TRACE_STEPS.find((entry) => entry.id === stepId)
  if (!found) throw new Error(`unknown join layout trace step: ${stepId}`)
  return found
}
