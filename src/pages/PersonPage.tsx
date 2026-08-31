import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { PersonCard } from '../components/PersonCard'
import { PersonForm } from '../components/PersonForm'
import { useAuth } from '../hooks/useAuth'
import { useFamily } from '../hooks/useFamily'
import { deletePerson, getPerson, savePerson } from '../lib/firestore'
import { displayName } from '../lib/tree'
import type { Person, PersonInput } from '../types'

export function PersonPage() {
  const { slug = '', personId = '' } = useParams()
  const { user } = useAuth()
  const { family, people, relationships, loading, isEditor, reload } = useFamily(
    slug,
    user?.email ?? null,
    user?.uid ?? null,
  )
  const [editing, setEditing] = useState(false)
  const [person, setPerson] = useState<Person | null>(null)
  const [personLoading, setPersonLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      setPersonLoading(true)
      const p = await getPerson(personId)
      setPerson(p)
      setPersonLoading(false)
    })()
  }, [personId])

  const related = useMemo(() => {
    if (!person) return { parents: [], children: [], spouses: [] as Person[] }
    const byId = new Map(people.map((p) => [p.id, p]))
    const parents: Person[] = []
    const children: Person[] = []
    const spouses: Person[] = []

    for (const rel of relationships) {
      if (rel.type === 'parent_child' && rel.personBId === person.id) {
        const parent = byId.get(rel.personAId)
        if (parent) parents.push(parent)
      }
      if (rel.type === 'parent_child' && rel.personAId === person.id) {
        const child = byId.get(rel.personBId)
        if (child) children.push(child)
      }
      if (rel.type === 'spouse') {
        if (rel.personAId === person.id) {
          const spouse = byId.get(rel.personBId)
          if (spouse) spouses.push(spouse)
        }
        if (rel.personBId === person.id) {
          const spouse = byId.get(rel.personAId)
          if (spouse) spouses.push(spouse)
        }
      }
    }

    return { parents, children, spouses }
  }, [person, people, relationships])

  const handleSave = async (input: PersonInput) => {
    await savePerson(person?.id ?? null, input, user?.uid ?? null)
    setEditing(false)
    await reload()
    const refreshed = await getPerson(personId)
    setPerson(refreshed)
  }

  const handleDelete = async () => {
    if (!person || !confirm(`Delete ${displayName(person)}?`)) return
    await deletePerson(person.id)
    window.location.href = `/families/${slug}`
  }

  if (loading || personLoading) {
    return (
      <Layout familyName={family?.name} slug={slug} isEditor={isEditor} adminHref={`/families/${slug}/admin`}>
        <p className="p-8 text-center text-stone-500">Loading…</p>
      </Layout>
    )
  }

  if (!person || !family) {
    return (
      <Layout slug={slug} isEditor={isEditor}>
        <div className="p-8 text-center">
          <p>Person not found.</p>
          <Link to={`/families/${slug}`} className="text-amber-800 hover:underline">
            Back to tree
          </Link>
        </div>
      </Layout>
    )
  }

  return (
    <Layout familyName={family.name} slug={slug} isEditor={isEditor} adminHref={`/families/${slug}/admin`}>
      <div className="border-b border-stone-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <Link to={`/families/${slug}`} className="text-sm text-amber-800 hover:underline">
            ← Back to tree
          </Link>
        </div>
      </div>

      {editing ? (
        <div className="max-w-3xl mx-auto px-4 py-8">
          <h1 className="text-xl font-semibold mb-4">Edit person</h1>
          <PersonForm
            initial={person}
            familyId={family.id}
            onSubmit={handleSave}
            onCancel={() => setEditing(false)}
          />
          {isEditor && (
            <button
              type="button"
              onClick={() => void handleDelete()}
              className="mt-6 text-sm text-red-700 hover:underline"
            >
              Delete person
            </button>
          )}
        </div>
      ) : (
        <PersonCard
          person={person}
          parents={related.parents}
          children={related.children}
          spouses={related.spouses}
          slug={slug}
          isEditor={isEditor}
          onEdit={() => setEditing(true)}
        />
      )}
    </Layout>
  )
}
