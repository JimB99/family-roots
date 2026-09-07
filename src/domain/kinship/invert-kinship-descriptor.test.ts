import { describe, expect, it } from 'vitest'
import { invertKinshipDescriptor } from './invert-kinship-descriptor'
import type { KinshipDescriptor } from './types'

describe('invertKinshipDescriptor', () => {
  it('inverts direct line', () => {
    expect(invertKinshipDescriptor({ category: 'direct_ancestor', generationsUp: 2 })).toEqual({
      category: 'direct_descendant',
      generationsDown: 2,
    })
  })

  it('inverts collateral aunt/uncle and niece/nephew', () => {
    expect(
      invertKinshipDescriptor({ category: 'collateral_aunt_uncle', generationsUp: 1 }),
    ).toEqual({ category: 'collateral_niece_nephew', generationsDown: 1 })
    expect(
      invertKinshipDescriptor({ category: 'collateral_niece_nephew', generationsDown: 2 }),
    ).toEqual({ category: 'collateral_aunt_uncle', generationsUp: 2 })
  })

  it('inverts in-law via nested blood relationship', () => {
    const forward: KinshipDescriptor = {
      category: 'in_law',
      via: { category: 'collateral_aunt_uncle', generationsUp: 1 },
    }
    expect(invertKinshipDescriptor(forward)).toEqual({
      category: 'in_law',
      via: { category: 'collateral_niece_nephew', generationsDown: 1 },
    })
  })

  it('inverts parent and child in-law', () => {
    expect(invertKinshipDescriptor({ category: 'parent_in_law', generationsUp: 1 })).toEqual({
      category: 'child_in_law',
      generationsDown: 1,
    })
  })

  it('double inversion returns equivalent descriptor', () => {
    const descriptors: KinshipDescriptor[] = [
      { category: 'in_law', via: { category: 'collateral_aunt_uncle', generationsUp: 1 } },
      { category: 'in_law', via: { category: 'direct_ancestor', generationsUp: 2 } },
      { category: 'in_law', via: { category: 'cousin', degree: 2, removal: 1 } },
      { category: 'parent_in_law', generationsUp: 1 },
      { category: 'step_parent' },
    ]
    for (const descriptor of descriptors) {
      expect(invertKinshipDescriptor(invertKinshipDescriptor(descriptor))).toEqual(descriptor)
    }
  })
})
