/**
 * Synthetic family document for Firestore rules emulator tests.
 * Mirrors production invite-map shapes (open + email tokens, stale null entries)
 * without using real slugs, UIDs, view keys, or invite tokens.
 */
export const RULES_FIXTURE_FAMILY_ID = 'fixture-family'
export const RULES_FIXTURE_OWNER_UID = 'fixture-owner-uid'
export const RULES_FIXTURE_VIEW_KEY = '11111111-2222-4333-8444-555555555555'
export const RULES_FIXTURE_OPEN_TOKEN = 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee'
export const RULES_FIXTURE_EMAIL_TOKEN = 'ffffffff-1111-4222-8333-444444444444'
export const RULES_FIXTURE_INVITE_EMAIL = 'invitee@example.com'

export function rulesFixtureFamilyDoc(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Fixture Family',
    slug: RULES_FIXTURE_FAMILY_ID,
    viewKey: RULES_FIXTURE_VIEW_KEY,
    createdAt: { seconds: 1_700_000_000, nanoseconds: 0 },
    updatedAt: { seconds: 1_700_000_100, nanoseconds: 0 },
    editorUids: [RULES_FIXTURE_OWNER_UID],
    pendingInviteEmails: [],
    pendingInvites: {
      'revoked-token': null,
      [RULES_FIXTURE_OPEN_TOKEN]: { type: 'open' },
      [RULES_FIXTURE_EMAIL_TOKEN]: { type: 'email', email: RULES_FIXTURE_INVITE_EMAIL },
    },
    ...overrides,
  }
}
