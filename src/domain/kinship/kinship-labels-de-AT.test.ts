import { describe, expect, it } from 'vitest'
import { formatKinshipLabel } from './kinship-labels-de-AT'
import type { KinshipDescriptor } from './types'

describe('formatKinshipLabel (de-AT)', () => {
  it('labels direct line with gender', () => {
    expect(formatKinshipLabel({ category: 'direct_ancestor', generationsUp: 2 }, 'female')).toBe(
      'Großmutter',
    )
    expect(formatKinshipLabel({ category: 'direct_ancestor', generationsUp: 2 }, 'male')).toBe(
      'Großvater',
    )
    expect(formatKinshipLabel({ category: 'direct_descendant', generationsDown: 2 }, 'female')).toBe(
      'Enkelin',
    )
  })

  it('labels collateral aunts and uncles', () => {
    expect(
      formatKinshipLabel({ category: 'collateral_aunt_uncle', generationsUp: 2 }, 'female'),
    ).toBe('Großtante')
    expect(
      formatKinshipLabel({ category: 'collateral_aunt_uncle', generationsUp: 2 }, 'male'),
    ).toBe('Großonkel')
  })

  it('labels cousins with genealogical degree', () => {
    expect(formatKinshipLabel({ category: 'cousin', degree: 1, removal: 0 }, 'unknown')).toBe(
      'Cousin/Cousine 1. Grades',
    )
    expect(formatKinshipLabel({ category: 'cousin', degree: 2, removal: 1 }, 'unknown')).toBe(
      'Cousin/Cousine 2. Grades in der 2. Generation',
    )
  })

  it('labels siblings and half-siblings', () => {
    expect(formatKinshipLabel({ category: 'sibling', kind: 'full' }, 'female')).toBe('schwester')
    expect(formatKinshipLabel({ category: 'sibling', kind: 'half' }, 'male')).toBe('Halbbruder')
  })

  it('labels in-law via sibling', () => {
    const descriptor: KinshipDescriptor = {
      category: 'in_law',
      via: { category: 'sibling', kind: 'full' },
    }
    expect(formatKinshipLabel(descriptor, 'female')).toBe('Schwägerin')
    expect(formatKinshipLabel(descriptor, 'male')).toBe('Schwager')
  })
})
