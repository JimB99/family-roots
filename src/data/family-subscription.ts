import { useCallback, useEffect, useRef, useState } from 'react'
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
  type QuerySnapshot,
} from 'firebase/firestore'
import type { Family, Person, Relationship } from '../types'
import { db } from '../lib/firebase'
import { claimInvite, syncUserFamilyIndex } from './firestore/family-repository'
import { familyFromDoc, personFromDoc, relationshipFromDoc } from './firestore/codecs'
import { applyCollectionChanges, itemsFromDocs, type SnapshotDocChange } from './family-snapshot'
import type { QueryStatus } from './use-family-query'

export interface FamilySubscriptionState {
  family: Family | null
  people: Person[]
  relationships: Relationship[]
  status: QueryStatus
  error: string | null
  reload: () => Promise<void>
  isEditor: boolean
}

function mapDocChanges<T>(
  snapshot: QuerySnapshot<DocumentData>,
  codec: (id: string, data: DocumentData) => T,
): SnapshotDocChange<T>[] {
  return snapshot.docChanges().map((change: { type: SnapshotDocChange<T>['type']; doc: QueryDocumentSnapshot<DocumentData> }) => ({
    type: change.type,
    id: change.doc.id,
    item: codec(change.doc.id, change.doc.data()),
  }))
}

export function useFamilySubscription(
  slug: string,
  userEmail?: string | null,
  userId?: string | null,
): FamilySubscriptionState {
  const [family, setFamily] = useState<Family | null>(null)
  const [people, setPeople] = useState<Person[]>([])
  const [relationships, setRelationships] = useState<Relationship[]>([])
  const [status, setStatus] = useState<QueryStatus>('loading')
  const [error, setError] = useState<string | null>(null)

  const familyReadyRef = useRef(false)
  const peopleReadyRef = useRef(false)
  const relationshipsReadyRef = useRef(false)
  const inviteClaimedRef = useRef(false)
  const editorIndexSyncedRef = useRef(false)
  const peopleCountRef = useRef(0)

  const updateReadyStatus = useCallback(() => {
    if (!familyReadyRef.current || !peopleReadyRef.current || !relationshipsReadyRef.current) return
    setStatus(peopleCountRef.current === 0 ? 'empty' : 'ready')
  }, [])

  useEffect(() => {
    if (!slug) {
      setFamily(null)
      setPeople([])
      setRelationships([])
      setStatus('empty')
      setError(null)
      return
    }

    familyReadyRef.current = false
    peopleReadyRef.current = false
    relationshipsReadyRef.current = false
    inviteClaimedRef.current = false
    editorIndexSyncedRef.current = false
    peopleCountRef.current = 0

    setFamily(null)
    setPeople([])
    setRelationships([])
    setStatus('loading')
    setError(null)

    const handleError = (err: unknown) => {
      setError(err instanceof Error ? err.message : 'Failed to load family')
      setStatus('error')
    }

    const unsubscribeFamily = onSnapshot(
      doc(db, 'families', slug),
      (snapshot) => {
        familyReadyRef.current = true
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

        if (
          !inviteClaimedRef.current &&
          userEmail &&
          userId &&
          loadedFamily.pendingInviteEmails.includes(userEmail.trim().toLowerCase())
        ) {
          inviteClaimedRef.current = true
          void claimInvite(loadedFamily.id, userId, userEmail).catch(() => {
            /* claim may fail if already claimed or rules reject */
          })
        }

        if (
          !editorIndexSyncedRef.current &&
          userId &&
          loadedFamily.editorUids.includes(userId)
        ) {
          editorIndexSyncedRef.current = true
          void syncUserFamilyIndex(userId, loadedFamily.slug)
        }

        updateReadyStatus()
      },
      handleError,
    )

    return unsubscribeFamily
  }, [slug, userEmail, userId, updateReadyStatus])

  useEffect(() => {
    const familyId = family?.id
    if (!familyId) return

    peopleReadyRef.current = false
    relationshipsReadyRef.current = false
    setPeople([])
    setRelationships([])
    if (familyReadyRef.current) {
      setStatus('loading')
    }

    let peopleFirst = true
    let relationshipsFirst = true

    const handleError = (err: unknown) => {
      setError(err instanceof Error ? err.message : 'Failed to load family')
      setStatus('error')
    }

    const peopleQuery = query(collection(db, 'people'), where('familyId', '==', familyId))
    const unsubscribePeople = onSnapshot(
      peopleQuery,
      (snapshot) => {
        peopleReadyRef.current = true
        if (peopleFirst) {
          peopleFirst = false
          const nextPeople = itemsFromDocs(snapshot.docs, personFromDoc)
          peopleCountRef.current = nextPeople.length
          setPeople(nextPeople)
          updateReadyStatus()
          return
        }
        setPeople((prev) => {
          const nextPeople = applyCollectionChanges(prev, mapDocChanges(snapshot, personFromDoc))
          peopleCountRef.current = nextPeople.length
          updateReadyStatus()
          return nextPeople
        })
      },
      handleError,
    )

    const relationshipsQuery = query(
      collection(db, 'relationships'),
      where('familyId', '==', familyId),
    )
    const unsubscribeRelationships = onSnapshot(
      relationshipsQuery,
      (snapshot) => {
        relationshipsReadyRef.current = true
        if (relationshipsFirst) {
          relationshipsFirst = false
          setRelationships(itemsFromDocs(snapshot.docs, relationshipFromDoc))
          updateReadyStatus()
          return
        }
        setRelationships((prev) => applyCollectionChanges(prev, mapDocChanges(snapshot, relationshipFromDoc)))
        updateReadyStatus()
      },
      handleError,
    )

    return () => {
      unsubscribePeople()
      unsubscribeRelationships()
    }
  }, [family?.id, updateReadyStatus])

  const reload = useCallback(async () => {
    /* Live listeners keep data current; no full refetch needed. */
  }, [])

  const isEditor = Boolean(userId && family?.editorUids.includes(userId))

  return { family, people, relationships, status, error, reload, isEditor }
}
