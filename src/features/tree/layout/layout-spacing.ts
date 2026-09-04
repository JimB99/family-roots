/** Card and row spacing constants for tree layout. */

export const PERSON_W = 208
export const PERSON_H = 92
export const NODE_GAP = 44
export const COUPLE_W = 2 * PERSON_W + NODE_GAP
export const SIBLING_GAP = 36
export const FAMILY_GAP = 100
export const ROW_GAP = 112
export const COMPONENT_GAP = 140

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
