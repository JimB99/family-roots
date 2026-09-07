import type { KinshipDescriptor } from './types'

/**
 * Inverts a kinship descriptor for the reverse perspective (B→A from A→B).
 * Symmetric categories (self, spouse, sibling, cousin, step_sibling) are unchanged.
 */
export function invertKinshipDescriptor(descriptor: KinshipDescriptor): KinshipDescriptor {
  switch (descriptor.category) {
    case 'self':
    case 'unrelated':
    case 'spouse':
    case 'sibling':
    case 'cousin':
    case 'step_sibling':
      return descriptor
    case 'direct_ancestor':
      return { category: 'direct_descendant', generationsDown: descriptor.generationsUp }
    case 'direct_descendant':
      return { category: 'direct_ancestor', generationsUp: descriptor.generationsDown }
    case 'collateral_aunt_uncle':
      return { category: 'collateral_niece_nephew', generationsDown: descriptor.generationsUp }
    case 'collateral_niece_nephew':
      return { category: 'collateral_aunt_uncle', generationsUp: descriptor.generationsDown }
    case 'step_parent':
      return { category: 'step_child' }
    case 'step_child':
      return { category: 'step_parent' }
    case 'parent_in_law':
      return { category: 'child_in_law', generationsDown: descriptor.generationsUp }
    case 'child_in_law':
      return { category: 'parent_in_law', generationsUp: descriptor.generationsDown }
    case 'in_law':
      return { category: 'in_law', via: invertKinshipDescriptor(descriptor.via) }
  }
}
