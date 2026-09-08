import { describe, expect, it, beforeEach } from 'vitest'
import type { Family } from '../types'
import {
  buildJoinUrl,
  buildViewUrl,
  captureViewKeyFromSearch,
  findPendingInvite,
  hasViewAccess,
  persistViewKey,
  readStoredViewKey,
  validatePendingInvite,
  viewStorageKey,
} from './family-access'

function sampleFamily(overrides: Partial<Family> = {}): Family {
  return {
    id: 'miller',
    name: 'Miller',
    slug: 'miller',
    viewKey: 'view-key-123',
    editorUids: ['owner'],
    pendingInvites: {},
    pendingInviteEmails: [],
    ...overrides,
  }
}

describe('family-access', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('builds view and join URLs', () => {
    expect(buildViewUrl('miller', 'abc', 'https://example.com')).toBe(
      'https://example.com/families/miller?v=abc',
    )
    expect(buildJoinUrl('miller', 'token-1', 'https://example.com')).toBe(
      'https://example.com/families/miller/join/token-1',
    )
  })

  it('persists and reads view key from session storage', () => {
    persistViewKey('miller', 'secret')
    expect(readStoredViewKey('miller')).toBe('secret')
    expect(sessionStorage.getItem(viewStorageKey('miller'))).toBe('secret')
  })

  it('captures view key from search params', () => {
    const key = captureViewKeyFromSearch('?v=from-link', 'miller')
    expect(key).toBe('from-link')
    expect(readStoredViewKey('miller')).toBe('from-link')
  })

  it('grants view access to editors or matching stored key', () => {
    const family = sampleFamily()
    expect(hasViewAccess(family, null, true)).toBe(true)
    expect(hasViewAccess(family, 'view-key-123', false)).toBe(true)
    expect(hasViewAccess(family, 'wrong', false)).toBe(false)
    expect(hasViewAccess(sampleFamily({ viewKey: '' }), 'anything', false)).toBe(false)
  })

  it('finds pending invite by token', () => {
    const family = sampleFamily({
      pendingInvites: {
        tok1: { type: 'open' },
        tok2: { type: 'email', email: 'a@example.com' },
      },
    })
    expect(findPendingInvite(family, 'tok1')).toEqual({ type: 'open' })
    expect(findPendingInvite(family, 'missing')).toBeNull()
  })

  it('validates open and email-bound invites', () => {
    expect(validatePendingInvite({ type: 'open' }, 'any@example.com')).toEqual({ ok: true })
    expect(validatePendingInvite(null, 'a@example.com')).toEqual({ ok: false, reason: 'missing' })
    expect(validatePendingInvite({ type: 'email', email: 'a@example.com' }, 'a@example.com')).toEqual({
      ok: true,
    })
    expect(validatePendingInvite({ type: 'email', email: 'a@example.com' }, 'b@example.com')).toEqual({
      ok: false,
      reason: 'email_mismatch',
    })
  })
})
