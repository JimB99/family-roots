import { describe, expect, it } from 'vitest'
import { shouldMarkDeceasedFromDeathInfo } from './PersonFormControls'

describe('shouldMarkDeceasedFromDeathInfo', () => {
  it('returns true when death date input has content', () => {
    expect(shouldMarkDeceasedFromDeathInfo('1990', null)).toBe(true)
  })

  it('returns true when death place has content', () => {
    expect(shouldMarkDeceasedFromDeathInfo('', 'Amsterdam')).toBe(true)
  })

  it('returns false when both are empty', () => {
    expect(shouldMarkDeceasedFromDeathInfo('  ', '   ')).toBe(false)
  })
})
