import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AdminInvites } from '../components/AdminInvites'
import { PersonForm } from '../components/PersonForm'
import { Layout } from '../components/Layout'
import { useAuth } from '../hooks/useAuth'
import { useFamily } from '../hooks/useFamily'
import {
  confirmRelationship,
  deleteRelationship,
  listLowConfidenceRelationships,
  savePerson,
  saveRelationship,
} from '../lib/firestore'
import { displayName } from '../lib/tree'
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
  const [relForm, setRelForm] = useState({
    type: 'parent_child' as 'parent_child' | 'spouse',
    personAId: '',
    personBId: '',
  })

  useEffect(() => {
    if (!family) return
    void listLowConfidenceRelationships(family.id).then(setReview)
  }, [family, relationships])

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
          <h2 className="font-medium">Uncertain relationships</h2>
          <p className="text-sm text-stone-600 mt-1">
            Review links that need confirmation. Confirm correct ones or delete mistakes.
          </p>
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
        </section>
      </div>
    </Layout>
  )
}
