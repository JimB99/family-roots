/** Average glyph width as a fraction of font size for the card typeface. */
export const GLYPH_EM = 0.62

export const CARD_TEXT_X = 64
export const CARD_TEXT_RIGHT_PAD = 14
export const CARD_GIVEN_SIZE = 18
export const CARD_FAMILY_SIZE = 13
export const CARD_SUBTITLE_SIZE = 12
export const COMPACT_GIVEN_SIZE = 20
export const COMPACT_FAMILY_SIZE = 13
export const COMPACT_SIDE_PAD = 16

export function estimatedTextWidth(text: string, fontSize: number): number {
  return text.length * fontSize * GLYPH_EM
}

export function truncateToWidth(text: string, fontSize: number, maxWidth: number): string {
  const trimmed = text.trim()
  if (!trimmed) return ''
  if (estimatedTextWidth(trimmed, fontSize) <= maxWidth) return trimmed

  const maxChars = Math.max(1, Math.floor(maxWidth / (fontSize * GLYPH_EM)))
  if (maxChars <= 1) return '…'
  return `${trimmed.slice(0, maxChars - 1)}…`
}

export function fullCardNameMaxWidth(cardWidth: number): number {
  return Math.max(24, cardWidth - CARD_TEXT_X - CARD_TEXT_RIGHT_PAD)
}

export function compactNameMaxWidth(cardWidth: number): number {
  return Math.max(24, cardWidth - COMPACT_SIDE_PAD * 2)
}

export function splitPersonName(
  givenNames: string | null | undefined,
  familyName: string | null | undefined,
): { given: string; family: string | null } {
  const given = givenNames?.trim() || 'Unknown'
  const family = familyName?.trim() || null
  return { given, family }
}

export function cardNameBaselines(
  hasFamily: boolean,
  hasSubtitle: boolean,
): { given: number; family: number; subtitle: number } {
  if (hasFamily && hasSubtitle) return { given: 32, family: 52, subtitle: 72 }
  if (hasFamily) return { given: 40, family: 62, subtitle: 0 }
  if (hasSubtitle) return { given: 40, family: 0, subtitle: 64 }
  return { given: 54, family: 0, subtitle: 0 }
}
