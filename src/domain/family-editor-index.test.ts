import { describe, expect, it } from 'vitest'
import type { Family } from '../types'
import { pickEditorFamilies } from './family-editor-index'

function family(overrides: Partial<Family> = {}): Family {
  return {
    id: 'demo',
    name: 'Demo',
    slug: 'demo',
    viewKey: 'key',
    editorUids: ['editor-uid'],
    pendingInvites: {},
    pendingInviteEmails: [],
    ownerUid: 'editor-uid',
    ...overrides,
  }
}

describe('pickEditorFamilies', () => {
  it('returns families where uid is an editor, sorted by name', () => {
    const result = pickEditorFamilies(
      [
        family({ id: 'b', slug: 'b', name: 'Beta', editorUids: ['editor-uid'] }),
        null,
        family({ id: 'a', slug: 'a', name: 'Alpha', editorUids: ['editor-uid'] }),
        family({ id: 'c', slug: 'c', name: 'Gamma', editorUids: ['other-uid'] }),
      ],
      'editor-uid',
    )

    expect(result.map((f) => f.slug)).toEqual(['a', 'b'])
  })

  it('returns empty list when no families match', () => {
    expect(pickEditorFamilies([family({ editorUids: ['other-uid'] })], 'editor-uid')).toEqual([])
  })
})
