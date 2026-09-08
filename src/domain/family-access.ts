import type { Family, InviteType, PendingInvite } from '../types'

export function generateToken(): string {
  return crypto.randomUUID()
}

export function buildViewUrl(slug: string, viewKey: string, origin = ''): string {
  const base = origin || (typeof window !== 'undefined' ? window.location.origin : '')
  return `${base}/families/${encodeURIComponent(slug)}?v=${encodeURIComponent(viewKey)}`
}

export function buildJoinUrl(slug: string, token: string, origin = ''): string {
  const base = origin || (typeof window !== 'undefined' ? window.location.origin : '')
  return `${base}/families/${encodeURIComponent(slug)}/join/${encodeURIComponent(token)}`
}

export function viewStorageKey(slug: string): string {
  return `roots-view:${slug}`
}

export function persistViewKey(slug: string, viewKey: string): void {
  try {
    sessionStorage.setItem(viewStorageKey(slug), viewKey)
  } catch {
    /* sessionStorage unavailable */
  }
}

export function readStoredViewKey(slug: string): string | null {
  try {
    return sessionStorage.getItem(viewStorageKey(slug))
  } catch {
    return null
  }
}

export function captureViewKeyFromSearch(search: string, slug: string): string | null {
  const params = new URLSearchParams(search)
  const viewKey = params.get('v')?.trim()
  if (!viewKey) return null
  persistViewKey(slug, viewKey)
  return viewKey
}

export function hasViewAccess(
  family: Family | null,
  storedViewKey: string | null,
  isEditor: boolean,
): boolean {
  if (isEditor) return true
  if (!family?.viewKey) return false
  return storedViewKey === family.viewKey
}

export function findPendingInvite(
  family: Family,
  token: string,
): PendingInvite | null {
  return family.pendingInvites[token] ?? null
}

export function validatePendingInvite(
  invite: PendingInvite | null,
  userEmail: string | null | undefined,
): { ok: true } | { ok: false; reason: 'missing' | 'email_mismatch' } {
  if (!invite) return { ok: false, reason: 'missing' }
  if (invite.type === 'email') {
    const expected = invite.email?.trim().toLowerCase()
    const actual = userEmail?.trim().toLowerCase()
    if (!expected || expected !== actual) return { ok: false, reason: 'email_mismatch' }
  }
  return { ok: true }
}

export function pendingInviteToFirestore(
  type: InviteType,
  email?: string,
): Record<string, unknown> {
  const invite: Record<string, unknown> = { type }
  if (type === 'email' && email) invite.email = email.trim().toLowerCase()
  return invite
}
