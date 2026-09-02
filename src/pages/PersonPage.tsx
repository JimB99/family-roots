import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { PersonCard } from '../components/PersonCard'
import { PersonForm } from '../components/PersonForm'
import { Dialog } from '../components/ui/Dialog'
import { Button } from '../components/ui/Button'
import { deletePersonWithRelationships, saveValidatedPerson } from '../data/firestore/family-mutations'
import { getPersonById } from '../data/firestore/person-repository'
import { useAuth } from '../hooks/useAuth'
import { useFamily } from '../hooks/useFamily'
import { displayName } from '../lib/tree'
import type { Person, PersonInput } from '../types'

export function PersonPage() {
  const { slug = '', personId = '' } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { family, people, relationships, loading, isEditor, reload } = useFamily(
    slug,
    user?.email ?? null,
    user?.uid ?? null,
  )
  const [editing, setEditing] = useState(false)
  const [person, setPerson] = useState<Person | null>(null)
  const [personLoading, setPersonLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      setPersonLoading(true)
      const p = await getPersonById(personId)
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

  const incidentCount = useMemo(() => {
    if (!person) return 0
    return relationships.filter((r) => r.personAId === person.id || r.personBId === person.id).length
  }, [person, relationships])

  const handleSave = async (input: PersonInput) => {
    await saveValidatedPerson(person?.id ?? null, input, user?.uid ?? null)
    setEditing(false)
    await reload()
    const refreshed = await getPersonById(personId)
    setPerson(refreshed)
  }

  const handleDelete = async () => {
    if (!person || !family) return
    setDeleteError(null)
    try {
      await deletePersonWithRelationships(family.id, person.id)
      navigate(`/families/${slug}`)
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  if (loading || personLoading) {
    return (
      <Layout familyName={family?.name} slug={slug} isEditor={isEditor} adminHref={`/families/${slug}/admin`}>
        <p className="p-10 text-center text-[var(--text-secondary)]">Loading…</p>
      </Layout>
    )
  }

  if (!person || !family || person.familyId !== family.id) {
    return (
      <Layout slug={slug} isEditor={isEditor}>
        <div className="p-10 text-center">
          <p>Person not found in this family.</p>
          <Link
            to={`/families/${slug}`}
            className="mt-3 inline-block text-[var(--accent-strong)] hover:underline"
          >
            Back to tree
          </Link>
        </div>
      </Layout>
    )
  }

  return (
    <Layout familyName={family.name} slug={slug} isEditor={isEditor} adminHref={`/families/${slug}/admin`}>
      <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-raised)]">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-4 px-4 py-2.5">
          <Link
            to={`/families/${slug}`}
            className="text-sm text-[var(--accent-strong)] hover:underline"
          >
            ← Back to tree
          </Link>
        </div>
      </div>

      {editing ? (
        <div className="mx-auto w-full max-w-3xl px-4 py-8">
          <h1 className="mb-4 text-xl font-semibold">Edit person</h1>
          <PersonForm
            initial={person}
            familyId={family.id}
            onSubmit={handleSave}
            onCancel={() => setEditing(false)}
          />
          {isEditor && (
            <Button variant="danger" className="mt-6" onClick={() => setConfirmDelete(true)}>
              Delete person
            </Button>
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

      <Dialog
        open={confirmDelete}
        title="Delete person"
        description="This cannot be undone."
        onClose={() => setConfirmDelete(false)}
      >
        <p className="text-sm text-[var(--text-secondary)]">
          Delete {displayName(person)} and {incidentCount} connected relationship
          {incidentCount === 1 ? '' : 's'}?
        </p>
        {deleteError && (
          <p className="mt-2 text-sm text-[var(--color-bloom-600)]" role="alert">
            {deleteError}
          </p>
        )}
        <div className="mt-5 flex gap-2">
          <Button variant="danger" onClick={() => void handleDelete()}>
            Delete person
          </Button>
          <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
            Cancel
          </Button>
        </div>
      </Dialog>
    </Layout>
  )
}
