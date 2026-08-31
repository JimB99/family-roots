import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AdminInvites } from '../components/AdminInvites'
import { PersonForm } from '../components/PersonForm'
import { Layout } from '../components/Layout'
import { useAuth } from '../hooks/useAuth'
import { useFamily } from '../hooks/useFamily'
import {
  confirmAllRelationships,
  confirmRelationship,
  deleteRelationship,
  listLowConfidenceRelationships,
  savePerson,
  saveRelationship,
} from '../lib/firestore'
import { displayName, getConnectedComponents, getTreeStats } from '../lib/tree'
import type { PersonInput, Relationship } from '../types'

export function FamilyAdminPage() {
  const { slug = '' } = useParams()
  const { user, loading: authLoading } = useAuth()
  const { family, people, relationships, loading, isEditor, reload } = useFamily(
    slug,
    user?.email ?? null,
    user?.uid ?? null,
  )
  const [showPersonForm, setShowPersonForm] = useState(false)
  const [review, setReview] = useState<Relationship[]>([])
  const [reviewOpen, setReviewOpen] = useState(false)
  const [confirmingAll, setConfirmingAll] = useState(false)
  const [relForm, setRelForm] = useState({
    type: 'parent_child' as 'parent_child' | 'spouse',
    personAId: '',
    personBId: '',
  })

  useEffect(() => {
    if (!family) return
    void listLowConfidenceRelationships(family.id).then(setReview)
  }, [family, relationships])

  const components = useMemo(
    () => getConnectedComponents(people, relationships),
    [people, relationships],
  )
  const treeStats = useMemo(() => getTreeStats(people, relationships), [people, relationships])
  const largestBranch = components[0]?.size ?? 0

  if (authLoading || loading) {
    return (
      <Layout>
        <p className="p-8 text-center text-stone-500">Loading…</p>
      </Layout>
    )
  }

  if (!user) {
    return (
      <Layout>
        <div className="max-w-md mx-auto p-8 text-center">
          <p>Sign in to manage this family tree.</p>
          <Link to="/login" className="text-amber-800 hover:underline">
            Sign in
          </Link>
        </div>
      </Layout>
    )
  }

  if (!family) {
    return (
      <Layout>
        <div className="max-w-xl mx-auto p-8 text-center">
          <h1 className="text-2xl font-semibold">Family tree not found</h1>
          <Link to="/admin" className="text-amber-800 hover:underline mt-4 inline-block">
            Back to manage
          </Link>
        </div>
      </Layout>
    )
  }

  if (!isEditor) {
    return (
      <Layout familyName={family.name} slug={slug}>
        <div className="max-w-xl mx-auto p-8 text-center">
          <p>You are signed in but not an editor for this family tree.</p>
          <p className="mt-2 text-sm text-stone-600">
            Ask the owner to invite <strong>{user.email}</strong>.
          </p>
        </div>
      </Layout>
    )
  }

  const addPerson = async (input: PersonInput) => {
    await savePerson(null, input, user.uid)
    setShowPersonForm(false)
    await reload()
  }

  const addRelationship = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!relForm.personAId || !relForm.personBId) return
    await saveRelationship(null, {
      familyId: family.id,
      type: relForm.type,
      personAId: relForm.personAId,
      personBId: relForm.personBId,
      marriage: null,
      marriagePlace: null,
      endDate: null,
      endReason: null,
      confidence: 'manual',
      importMeta: null,
    })
    setRelForm({ type: relForm.type, personAId: '', personBId: '' })
    await reload()
  }

  return (
    <Layout familyName={family.name} slug={slug} isEditor adminHref={`/families/${slug}/admin`}>
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{family.name}</h1>
            <p className="text-stone-600 mt-1">
              {people.length} people · {relationships.length} relationships
            </p>
          </div>
          <Link to="/admin" className="text-sm text-stone-600 hover:underline">
            All family trees
          </Link>
        </div>

        <section className="bg-white border border-stone-200 rounded-xl p-5">
          <h2 className="font-medium">Data health</h2>
          <dl className="mt-3 grid sm:grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-stone-500">Connected branches</dt>
              <dd className="font-medium">{components.length}</dd>
            </div>
            <div>
              <dt className="text-stone-500">Largest branch</dt>
              <dd className="font-medium">{largestBranch} people</dd>
            </div>
            <div>
              <dt className="text-stone-500">Outside main branch</dt>
              <dd className="font-medium">{treeStats.orphanCount} people</dd>
            </div>
            <div>
              <dt className="text-stone-500">Uncertain links</dt>
              <dd className="font-medium">{review.length}</dd>
            </div>
          </dl>
          <Link
            to={`/families/${slug}?branches=1`}
            className="inline-block mt-4 text-sm text-amber-800 hover:underline"
          >
            View branches on tree
          </Link>
        </section>

        <AdminInvites family={family} onUpdated={() => void reload()} />

        <section className="bg-white border border-stone-200 rounded-xl p-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-medium">People</h2>
            <button
              type="button"
              onClick={() => setShowPersonForm((v) => !v)}
              className="rounded-lg bg-amber-800 text-white px-3 py-1.5 text-sm"
            >
              {showPersonForm ? 'Close form' : 'Add person'}
            </button>
          </div>
          {showPersonForm && (
            <div className="mt-4">
              <PersonForm
                familyId={family.id}
                onSubmit={addPerson}
                onCancel={() => setShowPersonForm(false)}
              />
            </div>
          )}
        </section>

        <section className="bg-white border border-stone-200 rounded-xl p-5">
          <h2 className="font-medium">Add relationship</h2>
          <form onSubmit={(e) => void addRelationship(e)} className="mt-4 grid sm:grid-cols-3 gap-3">
            <select
              value={relForm.type}
              onChange={(e) =>
                setRelForm((f) => ({ ...f, type: e.target.value as 'parent_child' | 'spouse' }))
              }
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
            >
              <option value="parent_child">Parent → child</option>
              <option value="spouse">Spouse</option>
            </select>
            <select
              required
              value={relForm.personAId}
              onChange={(e) => setRelForm((f) => ({ ...f, personAId: e.target.value }))}
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
            >
              <option value="">Person A</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {displayName(p)}
                </option>
              ))}
            </select>
            <select
              required
              value={relForm.personBId}
              onChange={(e) => setRelForm((f) => ({ ...f, personBId: e.target.value }))}
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
            >
              <option value="">Person B</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {displayName(p)}
                </option>
              ))}
            </select>
            <button type="submit" className="sm:col-span-3 rounded-lg border border-stone-300 px-4 py-2 text-sm w-fit">
              Add relationship
            </button>
          </form>
        </section>

        <section className="bg-white border border-stone-200 rounded-xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-medium">Data cleanup</h2>
              <p className="text-sm text-stone-600 mt-1">
                Optional review for imported links. Accept all to clear the queue.
              </p>
            </div>
            {review.length > 0 && (
              <button
                type="button"
                disabled={confirmingAll}
                onClick={() => {
                  setConfirmingAll(true)
                  void confirmAllRelationships(family.id)
                    .then(() => reload())
                    .then(() => listLowConfidenceRelationships(family.id))
                    .then(setReview)
                    .finally(() => setConfirmingAll(false))
                }}
                className="rounded-lg bg-amber-800 text-white px-3 py-1.5 text-sm disabled:opacity-50"
              >
                {confirmingAll ? 'Accepting…' : `Accept all ${review.length} links`}
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setReviewOpen((v) => !v)}
            className="mt-3 text-sm text-amber-800 hover:underline"
          >
            {reviewOpen ? 'Hide' : 'Show'} uncertain relationships ({review.length})
          </button>

          {reviewOpen && (
            <ul className="mt-4 space-y-3">
              {review.map((rel) => {
                const a = people.find((p) => p.id === rel.personAId)
                const b = people.find((p) => p.id === rel.personBId)
                return (
                  <li key={rel.id} className="border border-stone-200 rounded-lg p-3 text-sm">
                    <p>
                      <strong>{rel.type}</strong>: {a ? displayName(a) : rel.personAId} ↔{' '}
                      {b ? displayName(b) : rel.personBId}
                    </p>
                    <div className="mt-2 flex gap-3">
                      <button
                        type="button"
                        onClick={() => void confirmRelationship(rel.id).then(reload)}
                        className="text-amber-800 hover:underline"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteRelationship(rel.id).then(reload)}
                        className="text-red-700 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                )
              })}
              {review.length === 0 && <li className="text-stone-500">Nothing to review.</li>}
            </ul>
          )}
        </section>
      </div>
    </Layout>
  )
}
