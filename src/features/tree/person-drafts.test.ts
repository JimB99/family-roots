import { describe, expect, it } from 'vitest'
import { personInputFromPerson } from '../../data/firestore/codecs'
import {
  commitDraft,
  draftDiffersFromPerson,
  livingDraftEntries,
  mergeAllDrafts,
  personDraftFromPerson,
  parsePersonDraft,
  pruneStaleDrafts,
} from './person-drafts'
import type { Person } from '../../types'

const person: Person = {
  id: 'p1',
  familyId: 'f1',
  givenNames: 'Anna',
  familyName: 'Aguilar',
  maidenName: null,
  gender: 'female',
  birth: { year: 1956, month: 7, day: 16, precision: 'day' },
  death: null,
  birthPlace: 'Madrid',
  deathPlace: null,
  isLiving: true,
  photoBase64: null,
  notes: null,
  importKey: null,
}

describe('person-drafts', () => {
  it('personDraftFromPerson round-trips baseline', () => {
    const draft = personDraftFromPerson(person)
    expect(draftDiffersFromPerson(person, draft)).toBe(false)
  })

  it('detects name changes', () => {
    const draft = personDraftFromPerson(person)
    draft.input.givenNames = 'Ana'
    expect(draftDiffersFromPerson(person, draft)).toBe(true)
  })

  it('commitDraft adds and removes entries', () => {
    const draft = personDraftFromPerson(person)
    draft.input.givenNames = 'Ana'
    const withDraft = commitDraft(new Map(), person, draft)
    expect(withDraft.size).toBe(1)

    const baseline = personDraftFromPerson(person)
    const cleared = commitDraft(withDraft, person, baseline)
    expect(cleared.size).toBe(0)
  })

  it('mergeAllDrafts overlays edited fields', () => {
    const draft = personDraftFromPerson(person)
    draft.input.givenNames = 'Ana'
    const merged = mergeAllDrafts([person], new Map([['p1', draft]]))
    expect(merged[0].givenNames).toBe('Ana')
    expect(merged[0].familyName).toBe('Aguilar')
  })

  it('parsePersonDraft validates date strings', () => {
    const draft = personDraftFromPerson(person)
    draft.birthInput = 'not-a-date'
    const parsed = parsePersonDraft(draft)
    expect(parsed.ok).toBe(false)
  })

  it('pruneStaleDrafts removes deleted people', () => {
    const draft = personDraftFromPerson(person)
    draft.input.givenNames = 'Ana'
    const withDraft = commitDraft(new Map(), person, draft)
    const pruned = pruneStaleDrafts(withDraft, [])
    expect(pruned.size).toBe(0)
  })

  it('livingDraftEntries skips stale ids', () => {
    const draft = personDraftFromPerson(person)
    const entries = livingDraftEntries(new Map([['gone', draft], ['p1', draft]]), [person])
    expect(entries).toHaveLength(1)
    expect(entries[0][0]).toBe('p1')
  })

  it('personInputFromPerson marks deceased when death date exists', () => {
    const withDeath = { ...person, isLiving: null, death: { year: 2010, precision: 'year' as const } }
    expect(personInputFromPerson(withDeath).isLiving).toBe(false)
    expect(personInputFromPerson(person).isLiving).toBe(null)
  })
})
