import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Layout } from '../components/Layout'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { StatusBadge } from '../components/ui/StatusBadge'
import { useAuth } from '../hooks/useAuth'
import { useFamily } from '../hooks/useFamily'
import { auditFamily } from '../domain/audit-family'
import {
  filtersForCompletenessIssueCode,
  HealthCompletenessPanel,
} from '../features/health/HealthCompletenessPanel'
import { groupIssues, type IssueSeverity } from '../features/health/issue-presentation'
import { peopleListHref } from '../lib/people-filter-params'
import { personNavigationState, personPath } from '../lib/person-navigation'
import { translateGraphIssueMessage } from '../i18n/translate-domain'
import { displayName } from '../lib/tree'

const severityTone: Record<IssueSeverity, 'danger' | 'warning' | 'neutral'> = {
  error: 'danger',
  warning: 'warning',
  info: 'neutral',
}

export function DataHealthPage() {
  const { t } = useTranslation(['health', 'common'])
  const { slug = '' } = useParams()
  const { user } = useAuth()
  const { family, people, relationships, loading, isEditor } = useFamily(
    slug,
    user?.email ?? null,
    user?.uid ?? null,
  )
  const [expanded, setExpanded] = useState<string | null>(null)

  const report = useMemo(
    () => (family ? auditFamily(family.id, people, relationships) : null),
    [family, people, relationships],
  )

  const groups = useMemo(() => (report ? groupIssues(report.issues, t) : []), [report, t])

  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people])
  const healthReturnState = useMemo(
    () => personNavigationState(`/families/${slug}/health`, 'health'),
    [slug],
  )

  if (loading) {
    return (
      <Layout>
        <p className="p-10 text-center text-[var(--text-secondary)]">{t('loading', { ns: 'tree' })}</p>
      </Layout>
    )
  }

  if (!family || !report) {
    return (
      <Layout>
        <p className="p-10 text-center">{t('notFound.family', { ns: 'common' })}</p>
      </Layout>
    )
  }

  return (
    <Layout familyName={family.name} slug={slug} isEditor={isEditor} adminHref={`/families/${slug}/admin`}>
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('title', { ns: 'health' })}</h1>
          <p className="mt-1 text-[var(--text-secondary)]">
            {t('subtitle', { ns: 'health', family: family.name })}
          </p>
        </div>

        <HealthCompletenessPanel slug={slug} people={people} />

        {groups.length === 0 ? (
          <EmptyState
            title={t('healthyTitle', { ns: 'health' })}
            description={t('healthyDescription', { ns: 'health' })}
          />
        ) : (
          <ul className="space-y-3">
            {groups.map((group) => {
              const open = expanded === group.code
              const peopleListFilters = filtersForCompletenessIssueCode(group.code)
              return (
                <li key={group.code}>
                  <Card className="p-0">
                    <button
                      type="button"
                      onClick={() => setExpanded(open ? null : group.code)}
                      aria-expanded={open}
                      className="flex w-full items-start justify-between gap-3 p-5 text-left"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-[var(--text-primary)]">
                            {group.title}
                          </span>
                          <StatusBadge tone={severityTone[group.severity]}>
                            {t(`severity.${group.severity}`, { ns: 'health' })}
                          </StatusBadge>
                          {peopleListFilters ? (
                            <Link
                              to={peopleListHref(slug, peopleListFilters)}
                              onClick={(event) => event.stopPropagation()}
                              className="text-sm text-[var(--accent-strong)] hover:underline"
                            >
                              {t('filterInPeople', { ns: 'health' })}
                            </Link>
                          ) : null}
                        </div>
                        <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
                          {group.explanation}
                        </p>
                      </div>
                      <span className="flex shrink-0 items-center gap-2 text-sm text-[var(--text-muted)]">
                        {group.issues.length}
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 20 20"
                          fill="none"
                          aria-hidden="true"
                          style={{ transform: open ? 'rotate(180deg)' : undefined }}
                        >
                          <path
                            d="M5 8l5 5 5-5"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    </button>

                    {open && (
                      <ul className="border-t border-[var(--border-subtle)] px-5 py-3">
                        {group.issues.slice(0, 50).map((issue, index) => (
                          <li
                            key={`${group.code}-${index}`}
                            className="flex flex-wrap items-center justify-between gap-2 py-1.5 text-sm"
                          >
                            <span className="text-[var(--text-secondary)]">
                              {translateGraphIssueMessage(issue, t)}
                            </span>
                            <span className="flex gap-2">
                              {issue.personIds?.map((id) => {
                                const person = peopleById.get(id)
                                if (!person) return null
                                return (
                                  <Link
                                    key={id}
                                    to={personPath(slug, id)}
                                    state={healthReturnState}
                                    className="text-[var(--accent-strong)] hover:underline"
                                  >
                                    {displayName(person)}
                                  </Link>
                                )
                              })}
                            </span>
                          </li>
                        ))}
                        {group.issues.length > 50 && (
                          <li className="py-1.5 text-sm text-[var(--text-muted)]">
                            {t('counts.andMore', {
                              ns: 'common',
                              count: group.issues.length - 50,
                            })}
                          </li>
                        )}
                      </ul>
                    )}
                  </Card>
                </li>
              )
            })}
          </ul>
        )}

        <Link to={`/families/${slug}`} className="inline-block text-sm text-[var(--accent-strong)] hover:underline">
          ← {t('back.tree', { ns: 'common' })}
        </Link>
      </div>
    </Layout>
  )
}
