import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Layout } from '../components/Layout'
import { EmptyState } from '../components/ui/EmptyState'
import { Skeleton } from '../components/ui/Skeleton'
import { TreeMark } from '../components/ui/TreeMark'
import { listFamilies } from '../lib/firestore'
import type { Family } from '../types'

export function HomePage() {
  const { t } = useTranslation('app')
  const [families, setFamilies] = useState<Family[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void listFamilies()
      .then(setFamilies)
      .finally(() => setLoading(false))
  }, [])

  return (
    <Layout>
      <div className="mx-auto w-full max-w-3xl px-4 py-14">
        <div className="text-center">
          <TreeMark className="mx-auto h-14 w-14 text-[var(--accent)]" />
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">{t('home.heading')}</h1>
          <p className="mt-2 text-[var(--text-secondary)]">{t('home.subtitle')}</p>
        </div>

        {loading ? (
          <ul className="mt-10 grid gap-4 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <li key={i}>
                <Skeleton className="h-24 w-full" />
              </li>
            ))}
          </ul>
        ) : families.length === 0 ? (
          <EmptyState
            title={t('home.emptyTitle')}
            description={t('home.emptyDescription')}
            action={
              <Link
                to="/admin"
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-contrast)] transition hover:bg-[var(--accent-strong)]"
              >
                {t('home.signInToCreate')}
              </Link>
            }
          />
        ) : (
          <ul className="mt-10 grid gap-4 sm:grid-cols-2">
            {families.map((family) => (
              <li key={family.id}>
                <Link
                  to={`/families/${family.slug}`}
                  className="group block rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-5 transition hover:-translate-y-0.5 hover:border-[var(--accent)] hover:shadow-lg"
                >
                  <div className="flex items-center gap-3">
                    <TreeMark className="h-9 w-9 shrink-0 text-[var(--accent)] opacity-80 transition group-hover:opacity-100" />
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-medium text-[var(--text-primary)]">
                        {family.name}
                      </h2>
                      <p className="mt-0.5 text-sm text-[var(--text-muted)]">{t('home.viewTree')}</p>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Layout>
  )
}
