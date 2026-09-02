import { describe, expect, it } from 'vitest'
import { relationshipKey } from './relationship-key'

describe('relationship key', () => {
  it('normalizes spouse order', () => {
    expect(relationshipKey('spouse', 'a', 'b')).toBe(relationshipKey('spouse', 'b', 'a'))
  })

  it('preserves parent-child direction', () => {
    expect(relationshipKey('parent_child', 'a', 'b')).not.toBe(
      relationshipKey('parent_child', 'b', 'a'),
    )
  })
})
