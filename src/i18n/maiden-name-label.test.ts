import { describe, expect, it } from 'vitest'
import { formatMaidenNameLabel } from './maiden-name-label'

describe('formatMaidenNameLabel', () => {
  it('formats maiden name per locale', () => {
    expect(formatMaidenNameLabel('López', 'en-GB')).toBe('née López')
    expect(formatMaidenNameLabel('López', 'es-ES')).toBe('de soltera López')
    expect(formatMaidenNameLabel('López', 'de-AT')).toBe('geb. López')
  })

  it('falls back to en-GB for unknown locale', () => {
    expect(formatMaidenNameLabel('Smith', 'fr-FR')).toBe('née Smith')
  })
})
