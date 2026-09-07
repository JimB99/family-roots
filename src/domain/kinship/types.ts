import type { PersonId } from '../types'

export type SiblingKind = 'full' | 'half'

export type KinshipDescriptor =
  | { category: 'self' }
  | { category: 'unrelated' }
  | { category: 'spouse' }
  | { category: 'direct_ancestor'; generationsUp: number }
  | { category: 'direct_descendant'; generationsDown: number }
  | { category: 'sibling'; kind: SiblingKind }
  | { category: 'collateral_aunt_uncle'; generationsUp: number }
  | { category: 'collateral_niece_nephew'; generationsDown: number }
  | { category: 'cousin'; degree: number; removal: number }
  | { category: 'step_parent' }
  | { category: 'step_child' }
  | { category: 'step_sibling' }
  | { category: 'in_law'; via: KinshipDescriptor }
  | { category: 'parent_in_law'; generationsUp: number }
  | { category: 'child_in_law'; generationsDown: number }

export interface KinshipPath {
  /** Ordered person IDs from anchor to related person (for future canvas highlight). */
  personIds: PersonId[]
  /** Most recent common ancestor for blood relationships, when applicable. */
  commonAncestorId?: PersonId
}

export interface KinshipResult {
  fromId: PersonId
  toId: PersonId
  fromTo: KinshipDescriptor
  toFrom: KinshipDescriptor
  path: KinshipPath | null
  alternates?: KinshipDescriptor[]
}

export interface AncestorIndex {
  /** Generations upward from the anchor person to each ancestor (anchor itself is 0). */
  distances: Map<PersonId, number>
}
