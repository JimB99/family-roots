// @vitest-environment node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  arrayUnion,
  collection,
  deleteField,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import {
  RULES_FIXTURE_EMAIL_TOKEN,
  RULES_FIXTURE_FAMILY_ID,
  RULES_FIXTURE_INVITE_EMAIL,
  RULES_FIXTURE_OWNER_UID,
  rulesFixtureFamilyDoc,
} from '../../src/test/fixtures/rules-invite-family'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

const PROJECT_ID = 'family-roots-rules-test'
const EDITOR_UID = 'editor-uid'
const OTHER_UID = 'other-uid'
const FAMILY_ID = 'demo-family'
const VIEW_KEY = 'view-key-abc'

let testEnv: RulesTestEnvironment

function familyDoc(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Demo',
    slug: FAMILY_ID,
    createdAt: { seconds: 1, nanoseconds: 0 },
    editorUids: [EDITOR_UID],
    pendingInviteEmails: [],
    viewKey: VIEW_KEY,
    pendingInvites: {},
    ...overrides,
  }
}

function personDoc(familyId = FAMILY_ID) {
  return {
    familyId,
    givenNames: 'Jane',
    familyName: 'Doe',
    maidenName: null,
    gender: 'female',
    birth: null,
    death: null,
    birthPlace: null,
    deathPlace: null,
    isLiving: null,
    photoBase64: null,
    notes: null,
    importKey: null,
    createdAt: { seconds: 1, nanoseconds: 0 },
    updatedAt: { seconds: 1, nanoseconds: 0 },
    createdBy: EDITOR_UID,
  }
}

function relationshipDoc(familyId = FAMILY_ID, personAId = 'a', personBId = 'b') {
  return {
    familyId,
    type: 'spouse',
    personAId,
    personBId,
    marriage: null,
    marriagePlace: null,
    endDate: null,
    endReason: null,
    confidence: 'manual',
    importMeta: null,
    createdAt: { seconds: 1, nanoseconds: 0 },
    updatedAt: { seconds: 1, nanoseconds: 0 },
  }
}

describe('firestore.rules', () => {
  beforeAll(async () => {
    const rulesPath = resolve(process.cwd(), 'firestore.rules')
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: { rules: readFileSync(rulesPath, 'utf8') },
    })
  })

  afterAll(async () => {
    if (testEnv) await testEnv.cleanup()
  })

  beforeEach(async () => {
    await testEnv.clearFirestore()
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore()
      await setDoc(doc(db, 'families', FAMILY_ID), familyDoc())
      await setDoc(doc(db, 'people', 'person-a'), personDoc())
      await setDoc(doc(db, 'people', 'person-b'), personDoc())
      await setDoc(doc(db, 'relationships', 'rel-1'), relationshipDoc())
    })
  })

  it('allows public get of a family', async () => {
    const db = testEnv.unauthenticatedContext().firestore()
    await assertSucceeds(getDoc(doc(db, 'families', FAMILY_ID)))
  })

  it('denies unauthenticated family list', async () => {
    const db = testEnv.unauthenticatedContext().firestore()
    await assertFails(getDocs(collection(db, 'families')))
  })

  it('allows editor to list families with array-contains query', async () => {
    const db = testEnv.authenticatedContext(EDITOR_UID).firestore()
    await assertSucceeds(
      getDocs(query(collection(db, 'families'), where('editorUids', 'array-contains', EDITOR_UID))),
    )
  })

  it('returns no families for non-editor array-contains query', async () => {
    const db = testEnv.authenticatedContext(OTHER_UID).firestore()
    const snapshot = await getDocs(
      query(collection(db, 'families'), where('editorUids', 'array-contains', OTHER_UID)),
    )
    expect(snapshot.docs).toHaveLength(0)
  })

  it('allows user to read and write their own userEdits index', async () => {
    const db = testEnv.authenticatedContext(EDITOR_UID).firestore()
    await assertSucceeds(
      setDoc(doc(db, 'userEdits', EDITOR_UID), {
        familySlugs: [FAMILY_ID],
      }),
    )
    await assertSucceeds(getDoc(doc(db, 'userEdits', EDITOR_UID)))
  })

  it('denies reading another users userEdits index', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore()
      await setDoc(doc(db, 'userEdits', EDITOR_UID), {
        familySlugs: [FAMILY_ID],
      })
    })

    const db = testEnv.authenticatedContext(OTHER_UID).firestore()
    await assertFails(getDoc(doc(db, 'userEdits', EDITOR_UID)))
  })

  it('allows public read of people', async () => {
    const db = testEnv.unauthenticatedContext().firestore()
    await assertSucceeds(getDoc(doc(db, 'people', 'person-a')))
  })

  it('denies unauthenticated person create', async () => {
    const db = testEnv.unauthenticatedContext().firestore()
    await assertFails(setDoc(doc(db, 'people', 'new-person'), personDoc()))
  })

  it('allows editor to create a person', async () => {
    const db = testEnv.authenticatedContext(EDITOR_UID).firestore()
    await assertSucceeds(setDoc(doc(db, 'people', 'new-person'), personDoc()))
  })

  it('denies non-editor person create', async () => {
    const db = testEnv.authenticatedContext(OTHER_UID).firestore()
    await assertFails(setDoc(doc(db, 'people', 'new-person'), personDoc()))
  })

  it('denies changing familyId on person update', async () => {
    const db = testEnv.authenticatedContext(EDITOR_UID).firestore()
    await assertFails(
      updateDoc(doc(db, 'people', 'person-a'), {
        familyId: 'other-family',
        givenNames: 'Jane',
      }),
    )
  })

  it('denies self-link relationships', async () => {
    const db = testEnv.authenticatedContext(EDITOR_UID).firestore()
    await assertFails(
      setDoc(doc(db, 'relationships', 'self-link'), relationshipDoc(FAMILY_ID, 'person-a', 'person-a')),
    )
  })

  it('allows editor to delete relationships', async () => {
    const db = testEnv.authenticatedContext(EDITOR_UID).firestore()
    await assertSucceeds(deleteDoc(doc(db, 'relationships', 'rel-1')))
  })

  it('allows legacy email invite claim with restricted field changes', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore()
      await setDoc(doc(db, 'families', FAMILY_ID), {
        ...familyDoc(),
        pendingInviteEmails: ['invitee@example.com'],
      })
    })

    const db = testEnv.authenticatedContext('invitee-uid', { email: 'invitee@example.com' }).firestore()
    await assertSucceeds(
      updateDoc(doc(db, 'families', FAMILY_ID), {
        name: 'Demo',
        slug: FAMILY_ID,
        createdAt: { seconds: 1, nanoseconds: 0 },
        viewKey: VIEW_KEY,
        pendingInvites: {},
        editorUids: [EDITOR_UID, 'invitee-uid'],
        pendingInviteEmails: [],
      }),
    )
  })

  it('allows open invite claim without removing the token', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore()
      await setDoc(doc(db, 'families', FAMILY_ID), {
        ...familyDoc(),
        pendingInvites: {
          'open-token': { type: 'open' },
        },
      })
    })

    const db = testEnv.authenticatedContext('invitee-uid', { email: 'anyone@example.com' }).firestore()
    await assertSucceeds(
      updateDoc(doc(db, 'families', FAMILY_ID), {
        editorUids: [EDITOR_UID, 'invitee-uid'],
        updatedAt: { seconds: 2, nanoseconds: 0 },
      }),
    )
  })

  it('allows multiple users to claim the same open invite', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore()
      await setDoc(doc(db, 'families', FAMILY_ID), {
        ...familyDoc(),
        editorUids: [EDITOR_UID, 'invitee-a'],
        pendingInvites: {
          'open-token': { type: 'open' },
        },
      })
    })

    const db = testEnv.authenticatedContext('invitee-b', { email: 'b@example.com' }).firestore()
    await assertSucceeds(
      updateDoc(doc(db, 'families', FAMILY_ID), {
        editorUids: [EDITOR_UID, 'invitee-a', 'invitee-b'],
        updatedAt: { seconds: 2, nanoseconds: 0 },
      }),
    )
  })

  it('allows open invite claim when pendingInvites has stale null entries', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore()
      await setDoc(doc(db, 'families', FAMILY_ID), {
        ...familyDoc(),
        pendingInvites: {
          'revoked-token': null,
          'open-token': { type: 'open' },
        },
      })
    })

    const db = testEnv.authenticatedContext('invitee-uid', { email: 'anyone@example.com' }).firestore()
    await assertSucceeds(
      updateDoc(doc(db, 'families', FAMILY_ID), {
        editorUids: [EDITOR_UID, 'invitee-uid'],
        updatedAt: { seconds: 2, nanoseconds: 0 },
      }),
    )
  })

  it('denies open invite claim that removes the token', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore()
      await setDoc(doc(db, 'families', FAMILY_ID), {
        ...familyDoc(),
        pendingInvites: {
          'open-token': { type: 'open' },
        },
      })
    })

    const db = testEnv.authenticatedContext('invitee-uid', { email: 'anyone@example.com' }).firestore()
    await assertFails(
      updateDoc(doc(db, 'families', FAMILY_ID), {
        pendingInvites: {},
        editorUids: [EDITOR_UID, 'invitee-uid'],
        updatedAt: { seconds: 2, nanoseconds: 0 },
      }),
    )
  })

  it('allows email-bound invite token claim for matching email', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore()
      await setDoc(doc(db, 'families', FAMILY_ID), {
        ...familyDoc(),
        pendingInvites: {
          'email-token': { type: 'email', email: 'invitee@example.com' },
        },
      })
    })

    const db = testEnv.authenticatedContext('invitee-uid', { email: 'invitee@example.com' }).firestore()
    await assertSucceeds(
      updateDoc(doc(db, 'families', FAMILY_ID), {
        'pendingInvites.email-token': deleteField(),
        editorUids: arrayUnion('invitee-uid'),
      }),
    )
  })

  it('denies email-bound invite token claim for wrong email', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore()
      await setDoc(doc(db, 'families', FAMILY_ID), {
        ...familyDoc(),
        pendingInvites: {
          'email-token': { type: 'email', email: 'invitee@example.com' },
        },
      })
    })

    const db = testEnv.authenticatedContext('invitee-uid', { email: 'other@example.com' }).firestore()
    await assertFails(
      updateDoc(doc(db, 'families', FAMILY_ID), {
        'pendingInvites.email-token': deleteField(),
        editorUids: arrayUnion('invitee-uid'),
      }),
    )
  })

  it('allows open invite claim on fixture family with mixed invite map', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore()
      await setDoc(doc(db, 'families', RULES_FIXTURE_FAMILY_ID), rulesFixtureFamilyDoc())
    })

    const db = testEnv.authenticatedContext('test-invitee-uid', { email: 'other@example.com' }).firestore()
    await assertSucceeds(
      updateDoc(doc(db, 'families', RULES_FIXTURE_FAMILY_ID), {
        editorUids: [RULES_FIXTURE_OWNER_UID, 'test-invitee-uid'],
        updatedAt: { seconds: 1_700_000_200, nanoseconds: 0 },
      }),
    )
  })

  it('allows email invite claim on fixture family with mixed invite map', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore()
      await setDoc(doc(db, 'families', RULES_FIXTURE_FAMILY_ID), rulesFixtureFamilyDoc())
    })

    const db = testEnv.authenticatedContext('email-invitee-uid', { email: RULES_FIXTURE_INVITE_EMAIL }).firestore()
    await assertSucceeds(
      updateDoc(doc(db, 'families', RULES_FIXTURE_FAMILY_ID), {
        [`pendingInvites.${RULES_FIXTURE_EMAIL_TOKEN}`]: deleteField(),
        editorUids: [RULES_FIXTURE_OWNER_UID, 'email-invitee-uid'],
        updatedAt: { seconds: 1_700_000_200, nanoseconds: 0 },
      }),
    )
  })

  it('denies invite token claim that changes viewKey', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore()
      await setDoc(doc(db, 'families', FAMILY_ID), {
        ...familyDoc(),
        pendingInvites: {
          'open-token': { type: 'open' },
        },
      })
    })

    const db = testEnv.authenticatedContext('invitee-uid', { email: 'anyone@example.com' }).firestore()
    await assertFails(
      updateDoc(doc(db, 'families', FAMILY_ID), {
        viewKey: 'rotated-key',
        editorUids: arrayUnion('invitee-uid'),
      }),
    )
  })
})
