/** Column-layout pipeline phases for debugging (W3G slack investigation). */
export const COLUMN_LAYOUT_TRACE_STEPS = [
  {
    id: 'initialRows',
    title: 'Initial row assignment',
    description:
      'Each person gets a generation row (y) and x = 0. No horizontal packing yet.',
    whyOrder:
      'All later steps assume fixed row heights. S1–S14, DCC, JDC, and W3G all start here.',
  },
  {
    id: 'branchInteriors',
    title: 'Bottom-up branch interiors',
    description:
      'Post-order: pack direct children, local sibling gaps, align child groups under unions, center each parent over its local children.',
    whyOrder:
      'Cousin columns must be internally coherent before they are placed side by side. DCC c1/c2/c3 under Ana depend on this.',
  },
  {
    id: 'cousinPackLocal',
    title: 'Cousin columns — binding row (local)',
    description:
      'Within each branch, cousin columns are sorted in sibling order and separated left-to-right with one rigid shift per pair (delta = max row overlap). Non-cousin sibling rows keep per-row gap enforcement.',
    whyOrder:
      'Local coordinates need minimum separation before forest-wide tiling in step 4.',
  },
  {
    id: 'packSiblingBranches',
    title: 'Forest-wide cousin placement',
    description:
      'Top-level cousin branches tiled left-to-right in birth/sibling order with FAMILY_GAP between columns.',
    whyOrder:
      'Needs each branch width from interiors before global horizontal placement. DCC order c1→c2→c3→d1.',
  },
  {
    id: 'enforceTopLevelSiblingGaps',
    title: 'Top-level sibling gaps',
    description:
      'Minimum gaps between adjacent branches in the same parent scope; uses column intervals when the forest is deep.',
    whyOrder:
      'Placement can leave hub couples too close; pushes later branches right without breaking sort order.',
  },
  {
    id: 'alignUnderUnions',
    title: 'Union alignment',
    description:
      'Shifts child groups so each two-parent union sits over its own children, not only hub center.',
    whyOrder:
      'Coarse centering is couple-level; join-parent edge cases need per-union alignment. Skipped for cousin-column branches (W3G).',
  },
  {
    id: 'placeCousinColumnsBindingRow',
    title: 'Cousin columns — binding row (forest)',
    description:
      'Sorted left-to-right: for each adjacent cousin pair, compute one shift = max separation needed across all rows (binding row), move the entire right column rigidly. Recursive at every branch level plus forest top.',
    whyOrder:
      'Replaces per-row overlap accumulation. Columns stay internally centered; only whole-column shifts.',
  },
  {
    id: 'convergeRecenterRepair',
    title: 'Convergence — recenter and repair',
    description:
      'Recenter parents over children, repack sibling rows, enforce hub-cluster gaps.',
    whyOrder:
      'Centering moves hubs; repair restores sibling-row spacing before re-checking cousin separation.',
  },
  {
    id: 'repairCousinColumnsBindingRow',
    title: 'Cousin columns — binding row (after recenter)',
    description:
      'Same binding-row pass as step 7 after recentering disturbed column positions.',
    whyOrder:
      'Recentering can reintroduce cross-column overlaps; one rigid pass fixes without per-row accumulation.',
  },
  {
    id: 'convergeRecenterFinal',
    title: 'Convergence — final recenter and repair',
    description:
      'Second recenterParentsOverChildren and repairSiblingRowGapsAfterRecenter.',
    whyOrder:
      'Binding-row repair shifts columns; parents must be re-centered and sibling rows re-packed.',
  },
  {
    id: 'finalizeCousinColumnsBindingRow',
    title: 'Cousin columns — binding row (final)',
    description:
      'Last binding-row pass after final recenter. Fixes cross-column overlaps reintroduced by hub centering (DCC: d1 between c2 and c3).',
    whyOrder:
      'Recentering after binding repair can slide a later branch into an earlier column span; one rigid pass closes it.',
  },
  {
    id: 'finalizeParentRow',
    title: 'Final parent row touch-up',
    description:
      'Center GP/GM over the gen-1 row, repair sibling rows, then one last binding-row pass for cousin columns disturbed by hub centering.',
    whyOrder:
      'Founder centering only matters after all descendant churn. DCC G0/Ana centering checks.',
  },
  {
    id: 'withUnions',
    title: 'Union nodes placed',
    description:
      'Union diamonds at parent/child midpoints; component normalized to origin. Matches computeTreeLayout output.',
    whyOrder:
      'Unions depend on final person positions. Visual export and bounds use this snapshot.',
  },
] as const

export type ColumnLayoutTraceStepId = (typeof COLUMN_LAYOUT_TRACE_STEPS)[number]['id']

export function traceStepMeta(stepId: ColumnLayoutTraceStepId) {
  const found = COLUMN_LAYOUT_TRACE_STEPS.find((entry) => entry.id === stepId)
  if (!found) throw new Error(`unknown layout trace step: ${stepId}`)
  return found
}
