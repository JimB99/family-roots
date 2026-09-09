import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import type { Family, Person, Relationship } from '../types'
import { db } from '../lib/firebase'
import { claimInvite } from './firestore/family-repository'
import { familyFromDoc } from './firestore/codecs'

export type QueryStatus = 'loading' | 'ready' | 'refreshing' | 'error' | 'empty'

/** Slim family-doc-only loader for routes outside FamilyLayout (e.g. JoinPage). */
export function useFamilyDocQuery(
  slug: string,
  userEmail?: string | null,
  userId?: string | null,
) {
  const [family, setFamily] = useState<Family | null>(null)
  const [status, setStatus] = useState<QueryStatus>('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) {
      setFamily(null)
      setStatus('empty')
      setError(null)
      return
    }

    setStatus('loading')
    setError(null)

    let inviteClaimed = false

    const unsubscribe = onSnapshot(
      doc(db, 'families', slug),
      (snapshot) => {
        if (!snapshot.exists()) {
          setFamily(null)
          setStatus('empty')
          return
        }

        const loadedFamily = familyFromDoc(snapshot.id, snapshot.data())
        if (loadedFamily.slug !== slug) {
          setFamily(null)
          setStatus('empty')
          return
        }

        setFamily(loadedFamily)
        setStatus('ready')

        if (
          !inviteClaimed &&
          userEmail &&
          userId &&
          loadedFamily.pendingInviteEmails.includes(userEmail.trim().toLowerCase())
        ) {
          inviteClaimed = true
          void claimInvite(loadedFamily.id, userId, userEmail).catch(() => {
            /* claim may fail if already claimed or rules reject */
          })
        }
      },
      (err) => {
        setError(err instanceof Error ? err.message : 'Failed to load family')
        setStatus('error')
      },
    )

    return unsubscribe
  }, [slug, userEmail, userId])

  const isEditor = Boolean(userId && family?.editorUids.includes(userId))

  return {
    family,
    people: [] as Person[],
    relationships: [] as Relationship[],
    status,
    error,
    reload: async () => {},
    isEditor,
  }
}
