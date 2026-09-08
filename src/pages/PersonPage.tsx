import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Layout } from '../components/Layout'
import { PersonCard } from '../components/PersonCard'
import { PersonEditPanel } from '../components/PersonEditPanel'
import { deletePersonWithRelationships, saveValidatedPerson } from '../data/firestore/family-mutations'
import { getPersonById } from '../data/firestore/person-repository'
import { useAuth } from '../hooks/useAuth'
import { useFamily } from '../hooks/useFamily'
import { readPersonReturn, type PersonNavigationState } from '../lib/person-navigation'
import type { Person, PersonInput } from '../types'

export function PersonPage() {
  const { t } = useTranslation(['common', 'person'])
  const { slug = '', personId = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { family, people, relationships, loading, isEditor, reload } = useFamily(
    slug,
    user?.email ?? null,
    user?.uid ?? null,
  )
  const [editing, setEditing] = useState(false)
  const [person, setPerson] = useState<Person | null>(null)
  const [personLoading, setPersonLoading] = useState(true)

  const personReturn = useMemo(() => readPersonReturn(slug, location.state), [slug, location.state])
  const returnState = useMemo<PersonNavigationState | undefined>(() => {
    if (!location.state || typeof location.state !== 'object') return undefined
    const state = location.state as Partial<PersonNavigationState>
    if (
      typeof state.returnTo === 'string' &&
      (state.from === 'tree' || state.from === 'people' || state.from === 'health')
    ) {
      return { returnTo: state.returnTo, from: state.from }
    }
    return undefined
  }, [location.state])

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
    await deletePersonWithRelationships(family.id, person.id)
    navigate(personReturn.returnTo)
  }

  if (loading || personLoading) {
    return (
      <Layout familyName={family?.name} slug={slug} isEditor={isEditor} adminHref={`/families/${slug}/admin`}>
        <p className="p-10 text-center text-[var(--text-secondary)]">{t('actions.loading', { ns: 'common' })}</p>
      </Layout>
    )
  }

  if (!person || !family || person.familyId !== family.id) {
    return (
      <Layout slug={slug} isEditor={isEditor}>
        <div className="p-10 text-center">
          <p>{t('notFound.person', { ns: 'common' })}</p>
          <Link
            to={personReturn.returnTo}
            className="mt-3 inline-block text-[var(--accent-strong)] hover:underline"
          >
            {t(personReturn.labelKey)}
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
            to={personReturn.returnTo}
            className="text-sm text-[var(--accent-strong)] hover:underline"
          >
            ← {t(personReturn.labelKey)}
          </Link>
        </div>
      </div>

      {editing ? (
        <div className="mx-auto w-full max-w-3xl px-4 py-8">
          <h1 className="mb-4 text-xl font-semibold">{t('profile.editPerson', { ns: 'person' })}</h1>
          <PersonEditPanel
            person={person}
            familyId={family.id}
            relationshipCount={incidentCount}
            allowDelete={isEditor}
            onSubmit={handleSave}
            onCancel={() => setEditing(false)}
            onDelete={handleDelete}
          />
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
          returnState={returnState}
        />
      )}
    </Layout>
  )
}
