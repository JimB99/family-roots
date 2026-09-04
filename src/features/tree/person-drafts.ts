import { personInputFromPerson } from '../../data/firestore/codecs'
import { partialDateToInput, parsePartialDateInputResult } from '../../lib/dates'
import type { Person, PersonInput } from '../../types'

export interface PersonDraft {
  input: PersonInput
  birthInput: string
  deathInput: string
}

export function personDraftFromPerson(person: Person): PersonDraft {
  return {
    input: personInputFromPerson(person),
    birthInput: partialDateToInput(person.birth),
    deathInput: partialDateToInput(person.death),
  }
}

export function parsePersonDraft(
  draft: PersonDraft,
): { ok: true; input: PersonInput } | { ok: false; message: string } {
  const birthParsed = parsePartialDateInputResult(draft.birthInput)
  if (birthParsed.error) return { ok: false, message: birthParsed.error.message }
  const deathParsed = parsePartialDateInputResult(draft.deathInput)
  if (deathParsed.error) return { ok: false, message: deathParsed.error.message }
  return {
    ok: true,
    input: {
      ...draft.input,
      birth: birthParsed.date,
      death: deathParsed.date,
    },
  }
}

function inputFieldsEqual(a: PersonInput, b: PersonInput): boolean {
  return (
    a.givenNames === b.givenNames &&
    a.familyName === b.familyName &&
    a.maidenName === b.maidenName &&
    a.gender === b.gender &&
    a.birthPlace === b.birthPlace &&
    a.deathPlace === b.deathPlace &&
    a.isLiving === b.isLiving &&
    a.photoBase64 === b.photoBase64 &&
    a.notes === b.notes &&
    a.importKey === b.importKey &&
    JSON.stringify(a.birth) === JSON.stringify(b.birth) &&
    JSON.stringify(a.death) === JSON.stringify(b.death)
  )
}

export function draftDiffersFromPerson(person: Person, draft: PersonDraft): boolean {
  const baseline = personDraftFromPerson(person)
  if (draft.birthInput !== baseline.birthInput || draft.deathInput !== baseline.deathInput) {
    return true
  }
  return !inputFieldsEqual(draft.input, baseline.input)
}

export function mergeDraftIntoPerson(person: Person, draft: PersonDraft): Person {
  const parsed = parsePersonDraft(draft)
  if (!parsed.ok) return person
  return {
    ...person,
    ...parsed.input,
  }
}

export function mergeAllDrafts(people: Person[], drafts: ReadonlyMap<string, PersonDraft>): Person[] {
  if (drafts.size === 0) return people
  return people.map((person) => {
    const draft = drafts.get(person.id)
    return draft ? mergeDraftIntoPerson(person, draft) : person
  })
}

export function commitDraft(
  drafts: ReadonlyMap<string, PersonDraft>,
  person: Person,
  draft: PersonDraft,
): Map<string, PersonDraft> {
  const next = new Map(drafts)
  if (draftDiffersFromPerson(person, draft)) {
    next.set(person.id, draft)
  } else {
    next.delete(person.id)
  }
  return next
}

export function discardDraft(
  drafts: ReadonlyMap<string, PersonDraft>,
  personId: string,
): Map<string, PersonDraft> {
  if (!drafts.has(personId)) return new Map(drafts)
  const next = new Map(drafts)
  next.delete(personId)
  return next
}

/** Remove drafts for people that no longer exist in the family (e.g. after delete). */
export function pruneStaleDrafts(
  drafts: ReadonlyMap<string, PersonDraft>,
  people: Person[],
): Map<string, PersonDraft> {
  const living = new Set(people.map((p) => p.id))
  let changed = false
  const next = new Map(drafts)
  for (const id of drafts.keys()) {
    if (!living.has(id)) {
      next.delete(id)
      changed = true
    }
  }
  return changed ? next : new Map(drafts)
}

export function livingDraftEntries(
  drafts: ReadonlyMap<string, PersonDraft>,
  people: Person[],
): [string, PersonDraft][] {
  const living = new Set(people.map((p) => p.id))
  return Array.from(drafts.entries()).filter(([personId]) => living.has(personId))
}
