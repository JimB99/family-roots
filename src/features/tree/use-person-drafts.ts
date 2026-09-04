import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  commitDraft,
  discardDraft,
  mergeAllDrafts,
  personDraftFromPerson,
  pruneStaleDrafts,
  type PersonDraft,
} from './person-drafts'
import type { Person } from '../../types'

export function usePersonDrafts(people: Person[]) {
  const [drafts, setDrafts] = useState<Map<string, PersonDraft>>(() => new Map())

  useEffect(() => {
    setDrafts((prev) => pruneStaleDrafts(prev, people))
  }, [people])

  const unsavedCount = drafts.size
  const hasUnsaved = unsavedCount > 0

  const displayPeople = useMemo(() => mergeAllDrafts(people, drafts), [people, drafts])

  const getDraftForPerson = useCallback(
    (person: Person): PersonDraft => drafts.get(person.id) ?? personDraftFromPerson(person),
    [drafts],
  )

  const updateDraft = useCallback((person: Person, draft: PersonDraft) => {
    setDrafts((prev) => commitDraft(prev, person, draft))
  }, [])

  const discardOne = useCallback((personId: string) => {
    setDrafts((prev) => discardDraft(prev, personId))
  }, [])

  const discardAll = useCallback(() => {
    setDrafts(new Map())
  }, [])

  const removePerson = useCallback((personId: string) => {
    setDrafts((prev) => discardDraft(prev, personId))
  }, [])

  return {
    drafts,
    displayPeople,
    unsavedCount,
    hasUnsaved,
    getDraftForPerson,
    updateDraft,
    discardOne,
    discardAll,
    removePerson,
  }
}
