import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { AdminInvites } from '../components/AdminInvites'
import { PersonForm } from '../components/PersonForm'
import { Layout } from '../components/Layout'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
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

const selectClass =
  'rounded-lg border border-[var(--border-strong)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--text-primary)] transition focus:border-[var(--accent)] focus:outline-none'

export function FamilyAdminPage() {
  const { t } = useTranslation(['admin', 'common'])
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
  const [relError, setRelError] = useState<string | null>(null)
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
        <p className="p-10 text-center text-[var(--text-secondary)]">{t('actions.loading', { ns: 'common' })}</p>
      </Layout>
    )
  }

  if (!user) {
    return (
      <Layout>
        <div className="mx-auto max-w-md p-10 text-center">
          <p>{t('signInToManageFamily', { ns: 'admin' })}</p>
          <Link to="/login" className="mt-3 inline-block text-[var(--accent-strong)] hover:underline">
            {t('auth.signIn', { ns: 'common' })}
          </Link>
        </div>
      </Layout>
    )
  }

  if (!family) {
    return (
      <Layout>
        <div className="mx-auto max-w-xl p-10 text-center">
          <h1 className="text-2xl font-semibold">{t('notFound.familyTree', { ns: 'common' })}</h1>
          <Link to="/admin" className="mt-4 inline-block text-[var(--accent-strong)] hover:underline">
            {t('back.manage', { ns: 'common' })}
          </Link>
        </div>
      </Layout>
    )
  }

  if (!isEditor) {
    return (
      <Layout familyName={family.name} slug={slug}>
        <div className="mx-auto max-w-xl p-10 text-center">
          <p>{t('notEditor', { ns: 'admin' })}</p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            {t('askInvite', { ns: 'admin', email: user.email })}
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
    setRelError(null)
    try {
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
    } catch (err) {
      setRelError(err instanceof Error ? err.message : t('family.connectionCard.failed', { ns: 'admin' }))
    }
  }

  const stats = [
    { label: t('family.stats.people', { ns: 'admin' }), value: `${people.length}` },
    { label: t('family.stats.connections', { ns: 'admin' }), value: `${relationships.length}` },
    { label: t('family.stats.connectedGroups', { ns: 'admin' }), value: `${components.length}` },
    {
      label: t('family.stats.largestGroup', { ns: 'admin' }),
      value: t('family.stats.largestGroupValue', { ns: 'admin', count: largestBranch }),
    },
    {
      label: t('family.stats.outsideMain', { ns: 'admin' }),
      value: t('family.stats.outsideMainValue', { ns: 'admin', count: treeStats.orphanCount }),
    },
    { label: t('family.stats.uncertainLinks', { ns: 'admin' }), value: `${review.length}` },
  ]

  return (
    <Layout familyName={family.name} slug={slug} isEditor adminHref={`/families/${slug}/admin`}>
      <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{family.name}</h1>
            <p className="mt-1 text-[var(--text-secondary)]">{t('family.subtitle', { ns: 'admin' })}</p>
          </div>
          <Link to="/admin">
            <Button variant="ghost" size="sm">
              {t('back.allFamilies', { ns: 'common' })}
            </Button>
          </Link>
        </div>

        <Card
          title={t('family.overview', { ns: 'admin' })}
          actions={
            <Link to={`/families/${slug}/health`}>
              <Button variant="secondary" size="sm">
                {t('family.viewHealth', { ns: 'admin' })}
              </Button>
            </Link>
          }
        >
          <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.label}>
                <dt className="text-[var(--text-muted)]">{stat.label}</dt>
                <dd className="mt-0.5 text-lg font-medium text-[var(--text-primary)]">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </Card>

        <AdminInvites family={family} onUpdated={() => void reload()} />

        <Card
          title={t('family.peopleCard.title', { ns: 'admin' })}
          description={t('family.peopleCard.description', { ns: 'admin' })}
          actions={
            <Button
              variant={showPersonForm ? 'secondary' : 'primary'}
              size="sm"
              onClick={() => setShowPersonForm((v) => !v)}
            >
              {showPersonForm
                ? t('family.peopleCard.closeForm', { ns: 'admin' })
                : t('family.peopleCard.addPerson', { ns: 'admin' })}
            </Button>
          }
        >
          {showPersonForm && (
            <PersonForm
              familyId={family.id}
              onSubmit={addPerson}
              onCancel={() => setShowPersonForm(false)}
            />
          )}
        </Card>

        <Card
          title={t('family.connectionCard.title', { ns: 'admin' })}
          description={t('family.connectionCard.description', { ns: 'admin' })}
        >
          <form onSubmit={(e) => void addRelationship(e)} className="grid gap-3 sm:grid-cols-3">
            <select
              value={relForm.type}
              onChange={(e) =>
                setRelForm((f) => ({ ...f, type: e.target.value as 'parent_child' | 'spouse' }))
              }
              aria-label={t('family.connectionCard.typeAria', { ns: 'admin' })}
              className={selectClass}
            >
              <option value="parent_child">{t('family.connectionCard.parentChild', { ns: 'admin' })}</option>
              <option value="spouse">{t('family.connectionCard.marriage', { ns: 'admin' })}</option>
            </select>
            <select
              required
              value={relForm.personAId}
              onChange={(e) => setRelForm((f) => ({ ...f, personAId: e.target.value }))}
              aria-label={t('family.connectionCard.firstPersonAria', { ns: 'admin' })}
              className={selectClass}
            >
              <option value="">
                {relForm.type === 'spouse'
                  ? t('family.connectionCard.partner', { ns: 'admin' })
                  : t('family.connectionCard.parent', { ns: 'admin' })}
                …
              </option>
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
              aria-label={t('family.connectionCard.secondPersonAria', { ns: 'admin' })}
              className={selectClass}
            >
              <option value="">
                {relForm.type === 'spouse'
                  ? t('family.connectionCard.partner', { ns: 'admin' })
                  : t('family.connectionCard.child', { ns: 'admin' })}
                …
              </option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {displayName(p)}
                </option>
              ))}
            </select>
            {relError && (
              <p
                className="text-sm text-[var(--color-bloom-600)] sm:col-span-3 dark:text-[var(--color-bloom-400)]"
                role="alert"
              >
                {relError}
              </p>
            )}
            <div className="sm:col-span-3">
              <Button type="submit" variant="secondary" size="sm">
                {t('family.connectionCard.addButton', { ns: 'admin' })}
              </Button>
            </div>
          </form>
        </Card>

        <Card
          title={t('family.reviewCard.title', { ns: 'admin' })}
          description={t('family.reviewCard.description', { ns: 'admin' })}
          actions={
            review.length > 0 ? (
              <Button
                size="sm"
                disabled={confirmingAll}
                onClick={() => {
                  setConfirmingAll(true)
                  void confirmAllRelationships(family.id)
                    .then(() => reload())
                    .then(() => listLowConfidenceRelationships(family.id))
                    .then(setReview)
                    .finally(() => setConfirmingAll(false))
                }}
              >
                {confirmingAll
                  ? t('actions.accepting', { ns: 'common' })
                  : t('family.reviewCard.acceptAll', { ns: 'admin', count: review.length })}
              </Button>
            ) : null
          }
        >
          {review.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">{t('family.reviewCard.nothing', { ns: 'admin' })}</p>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => setReviewOpen((v) => !v)}>
                {reviewOpen ? t('family.reviewCard.hide', { ns: 'admin' }) : t('family.reviewCard.show', { ns: 'admin' })}{' '}
                {t('family.reviewCard.link', { ns: 'admin', count: review.length })}
              </Button>
              {reviewOpen && (
                <ul className="mt-3 space-y-2">
                  {review.map((rel) => {
                    const a = people.find((p) => p.id === rel.personAId)
                    const b = people.find((p) => p.id === rel.personBId)
                    return (
                      <li
                        key={rel.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border-subtle)] p-3 text-sm"
                      >
                        <span>
                          <strong className="font-medium">
                            {rel.type === 'spouse'
                              ? t('family.reviewCard.marriage', { ns: 'admin' })
                              : t('family.reviewCard.parentChild', { ns: 'admin' })}
                          </strong>
                          {': '}
                          {a ? displayName(a) : rel.personAId} ↔ {b ? displayName(b) : rel.personBId}
                        </span>
                        <span className="flex gap-1">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => void confirmRelationship(rel.id).then(reload)}
                          >
                            {t('family.reviewCard.confirm', { ns: 'admin' })}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => void deleteRelationship(rel.id).then(reload)}
                          >
                            {t('family.reviewCard.delete', { ns: 'admin' })}
                          </Button>
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </>
          )}
        </Card>
      </div>
    </Layout>
  )
}
