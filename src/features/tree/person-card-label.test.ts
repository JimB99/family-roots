import { describe, expect, it } from 'vitest'
import {
  CARD_GIVEN_SIZE,
  CARD_TEXT_X,
  compactNameMaxWidth,
  estimatedTextWidth,
  fullCardNameMaxWidth,
  truncateToWidth,
} from './person-card-label'

describe('person card labels', () => {
  it('leaves text that already fits unchanged', () => {
    expect(truncateToWidth('María', 18, 200)).toBe('María')
  })

  it('ellipsizes text that would overflow the card', () => {
    const maxWidth = 120
    const text = 'Sebastián Domínguez Linares y Benítez Montero'
    const truncated = truncateToWidth(text, CARD_GIVEN_SIZE, maxWidth)
    expect(truncated.endsWith('…')).toBe(true)
    expect(truncated.length).toBeLessThan(text.length)
    expect(estimatedTextWidth(truncated, CARD_GIVEN_SIZE)).toBeLessThanOrEqual(maxWidth + 0.01)
  })

  it('keeps full-card given names inside the text column', () => {
    const maxWidth = fullCardNameMaxWidth(208)
    expect(maxWidth).toBe(208 - CARD_TEXT_X - 14)
    const given = truncateToWidth('María de los Ángeles Josefa', CARD_GIVEN_SIZE, maxWidth)
    expect(estimatedTextWidth(given, CARD_GIVEN_SIZE)).toBeLessThanOrEqual(maxWidth + 0.01)
  })

  it('keeps compact names inside the pill', () => {
    const maxWidth = compactNameMaxWidth(208)
    const given = truncateToWidth('María de los Ángeles Josefa', 20, maxWidth)
    expect(estimatedTextWidth(given, 20)).toBeLessThanOrEqual(maxWidth + 0.01)
  })
})
