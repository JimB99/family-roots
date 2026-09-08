import { describe, expect, it } from 'vitest'
import { formatKinshipLabel } from './kinship-labels-es-ES'
import type { KinshipDescriptor } from './types'

describe('formatKinshipLabel (es-ES)', () => {
  it('labels direct line with gender', () => {
    expect(formatKinshipLabel({ category: 'direct_ancestor', generationsUp: 2 }, 'female')).toBe(
      'abuela',
    )
    expect(formatKinshipLabel({ category: 'direct_ancestor', generationsUp: 2 }, 'male')).toBe(
      'abuelo',
    )
    expect(formatKinshipLabel({ category: 'direct_descendant', generationsDown: 2 }, 'female')).toBe(
      'nieta',
    )
  })

  it('labels collateral aunts and uncles', () => {
    expect(
      formatKinshipLabel({ category: 'collateral_aunt_uncle', generationsUp: 2 }, 'female'),
    ).toBe('tía abuela')
    expect(
      formatKinshipLabel({ category: 'collateral_aunt_uncle', generationsUp: 2 }, 'male'),
    ).toBe('tío abuelo')
  })

  it('uses descriptive phrasing for removed cousins', () => {
    expect(formatKinshipLabel({ category: 'cousin', degree: 1, removal: 0 }, 'unknown')).toBe(
      'primo hermano',
    )
    expect(formatKinshipLabel({ category: 'cousin', degree: 1, removal: 1 }, 'unknown')).toBe(
      'hijo/a de mi primo hermano',
    )
  })

  it('labels siblings and half-siblings', () => {
    expect(formatKinshipLabel({ category: 'sibling', kind: 'full' }, 'female')).toBe('hermana')
    expect(formatKinshipLabel({ category: 'sibling', kind: 'half' }, 'male')).toBe('medio hermano')
  })

  it('labels in-law via sibling', () => {
    const descriptor: KinshipDescriptor = {
      category: 'in_law',
      via: { category: 'sibling', kind: 'full' },
    }
    expect(formatKinshipLabel(descriptor, 'female')).toBe('cuñada')
    expect(formatKinshipLabel(descriptor, 'male')).toBe('cuñado')
  })
})
