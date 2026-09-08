import { useCallback, useEffect, useRef, useState } from 'react'
import type { Family, Person, Relationship } from '../types'
import { claimInvite, getFamilyBySlug, syncUserFamilyIndex } from './firestore/family-repository'
import { listPeopleForFamily } from './firestore/person-repository'
import { listRelationshipsForFamily } from './firestore/relationship-repository'

export type QueryStatus = 'loading' | 'ready' | 'refreshing' | 'error' | 'empty'

export interface FamilyQueryState {
  family: Family | null
  people: Person[]
  relationships: Relationship[]
  status: QueryStatus
  error: string | null
  reload: () => Promise<void>
  isEditor: boolean
}

export function useFamilyQuery(
  slug: string,
  userEmail?: string | null,
  userId?: string | null,
): FamilyQueryState {
  const [family, setFamily] = useState<Family | null>(null)
  const [people, setPeople] = useState<Person[]>([])
  const [relationships, setRelationships] = useState<Relationship[]>([])
  const [status, setStatus] = useState<QueryStatus>('loading')
  const [error, setError] = useState<string | null>(null)
  const requestId = useRef(0)

  const load = useCallback(async (refresh = false) => {
    const id = ++requestId.current
    setStatus((s) => (refresh && s === 'ready' ? 'refreshing' : 'loading'))
    setError(null)
    try {
      const fam = await getFamilyBySlug(slug)
      if (id !== requestId.current) return
      if (!fam) {
        setFamily(null)
        setPeople([])
        setRelationships([])
        setStatus('empty')
        return
      }

      if (userEmail && userId && fam.pendingInviteEmails.includes(userEmail.trim().toLowerCase())) {
        try {
          await claimInvite(fam.id, userId, userEmail)
        } catch {
          /* claim may fail if already claimed or rules reject; load continues */
        }
      }

      const [p, r] = await Promise.all([
        listPeopleForFamily(fam.id),
        listRelationshipsForFamily(fam.id),
      ])
      if (id !== requestId.current) return

      const refreshedFamily = await getFamilyBySlug(slug)
      const loadedFamily = refreshedFamily ?? fam
      if (userId && loadedFamily.editorUids.includes(userId)) {
        void syncUserFamilyIndex(userId, loadedFamily.slug)
      }
      setFamily(loadedFamily)
      setPeople(p)
      setRelationships(r)
      setStatus(p.length === 0 ? 'empty' : 'ready')
    } catch (err) {
      if (id !== requestId.current) return
      setError(err instanceof Error ? err.message : 'Failed to load family')
      setStatus('error')
    }
  }, [slug, userEmail, userId])

  useEffect(() => {
    void load(false)
  }, [load])

  const reload = useCallback(async () => load(true), [load])

  const isEditor = Boolean(userId && family?.editorUids.includes(userId))

  return { family, people, relationships, status, error, reload, isEditor }
}
