/** Card and row spacing constants for tree layout. */

export const PERSON_W = 208
export const PERSON_H = 92
export const NODE_GAP = 32
export const COUPLE_W = 2 * PERSON_W + NODE_GAP
export const SIBLING_GAP = 56
export const FAMILY_GAP = 100
export const ROW_GAP = 112
export const COMPONENT_GAP = 140

/** Contract gap aliases for tests and assertions. */
export const CONTRACT_COUPLE_GAP = NODE_GAP
export const CONTRACT_SIBLING_GAP = SIBLING_GAP
export const CONTRACT_COUSIN_GAP = FAMILY_GAP

/** Tolerance for couple-over-children centering in unit tests. */
export const CENTER_TOL_UNIT = 80

/** Tolerance for couple-over-children centering on large real pedigrees. */
export const CENTER_TOL_LARGE = 200

export function edgeGap(leftRight: number, rightLeft: number): number {
  return rightLeft - leftRight
}

export function intervalWidth(left: number, right: number): number {
  return right - left
}
