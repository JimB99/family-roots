import { useCallback, useEffect, useState } from 'react'
import type { Family, Person, Relationship } from '../types'
import {
  claimInvite,
  getFamilyBySlug,
  getPeopleForFamily,
  getRelationshipsForFamily,
} from '../lib/firestore'

export function useFamily(slug: string, userEmail?: string | null, userId?: string | null) {
  const [family, setFamily] = useState<Family | null>(null)
  const [people, setPeople] = useState<Person[]>([])
  const [relationships, setRelationships] = useState<Relationship[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const fam = await getFamilyBySlug(slug)
      setFamily(fam)
      if (!fam) {
        setPeople([])
        setRelationships([])
        return
      }

      if (userEmail && userId) {
        await claimInvite(fam, userId, userEmail)
      }

      const [p, r] = await Promise.all([
        getPeopleForFamily(fam.id),
        getRelationshipsForFamily(fam.id),
      ])
      setPeople(p)
      setRelationships(r)

      if (userEmail && userId) {
        const refreshed = await getFamilyBySlug(slug)
        setFamily(refreshed)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load family')
    } finally {
      setLoading(false)
    }
  }, [slug, userEmail, userId])

  useEffect(() => {
    void reload()
  }, [reload])

  const isEditor = Boolean(userId && family?.editorUids.includes(userId))

  return { family, people, relationships, loading, error, reload, isEditor }
}
