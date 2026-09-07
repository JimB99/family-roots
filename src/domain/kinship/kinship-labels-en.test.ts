import { describe, expect, it } from 'vitest'
import { formatKinshipLabel } from './kinship-labels-en'
import type { KinshipDescriptor } from './types'

describe('formatKinshipLabel', () => {
  it('labels direct line with gender', () => {
    expect(formatKinshipLabel({ category: 'direct_ancestor', generationsUp: 2 }, 'female')).toBe(
      'grandmother',
    )
    expect(formatKinshipLabel({ category: 'direct_ancestor', generationsUp: 2 }, 'male')).toBe(
      'grandfather',
    )
    expect(formatKinshipLabel({ category: 'direct_descendant', generationsDown: 2 }, 'female')).toBe(
      'granddaughter',
    )
  })

  it('uses genealogical grand-aunt naming', () => {
    expect(
      formatKinshipLabel({ category: 'collateral_aunt_uncle', generationsUp: 2 }, 'female'),
    ).toBe('grandaunt')
    expect(
      formatKinshipLabel({ category: 'collateral_aunt_uncle', generationsUp: 2 }, 'male'),
    ).toBe('granduncle')
  })

  it('labels cousins with removal', () => {
    expect(formatKinshipLabel({ category: 'cousin', degree: 1, removal: 0 }, 'unknown')).toBe(
      '1st cousin',
    )
    expect(formatKinshipLabel({ category: 'cousin', degree: 2, removal: 1 }, 'unknown')).toBe(
      '2nd cousin once removed',
    )
  })

  it('labels siblings and half-siblings', () => {
    expect(formatKinshipLabel({ category: 'sibling', kind: 'full' }, 'female')).toBe('sister')
    expect(formatKinshipLabel({ category: 'sibling', kind: 'half' }, 'male')).toBe('half-brother')
  })

  it('labels in-law via sibling', () => {
    const descriptor: KinshipDescriptor = {
      category: 'in_law',
      via: { category: 'sibling', kind: 'full' },
    }
    expect(formatKinshipLabel(descriptor, 'female')).toBe('sister-in-law')
    expect(formatKinshipLabel(descriptor, 'male')).toBe('brother-in-law')
  })

  it('labels in-law via aunt/uncle with target gender', () => {
    const descriptor: KinshipDescriptor = {
      category: 'in_law',
      via: { category: 'collateral_aunt_uncle', generationsUp: 1 },
    }
    expect(formatKinshipLabel(descriptor, 'male')).toBe('uncle-in-law')
    expect(formatKinshipLabel(descriptor, 'female')).toBe('aunt-in-law')
  })

  it('labels in-law via niece/nephew with target gender', () => {
    const descriptor: KinshipDescriptor = {
      category: 'in_law',
      via: { category: 'collateral_niece_nephew', generationsDown: 1 },
    }
    expect(formatKinshipLabel(descriptor, 'male')).toBe('nephew-in-law')
    expect(formatKinshipLabel(descriptor, 'female')).toBe('niece-in-law')
  })

  it('labels step relations', () => {
    expect(formatKinshipLabel({ category: 'step_parent' }, 'female')).toBe('stepmother')
    expect(formatKinshipLabel({ category: 'step_child' }, 'male')).toBe('stepson')
    expect(formatKinshipLabel({ category: 'step_sibling' }, 'female')).toBe('stepsister')
  })

  it('falls back to neutral labels for unknown gender', () => {
    expect(formatKinshipLabel({ category: 'direct_ancestor', generationsUp: 1 }, 'unknown')).toBe(
      'parent',
    )
    expect(formatKinshipLabel({ category: 'sibling', kind: 'full' }, 'unknown')).toBe('sibling')
    expect(formatKinshipLabel({ category: 'spouse' }, 'unknown')).toBe('spouse')
  })

  it('labels parent and child in-law', () => {
    expect(formatKinshipLabel({ category: 'parent_in_law', generationsUp: 1 }, 'female')).toBe(
      'mother-in-law',
    )
    expect(formatKinshipLabel({ category: 'child_in_law', generationsDown: 1 }, 'male')).toBe(
      'son-in-law',
    )
  })
})
