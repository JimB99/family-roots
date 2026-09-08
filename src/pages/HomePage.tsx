import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Layout } from '../components/Layout'
import { YourTreesList } from '../components/YourTreesList'
import { Button } from '../components/ui/Button'
import { Skeleton } from '../components/ui/Skeleton'
import { TreeMark } from '../components/ui/TreeMark'
import { useAuth } from '../hooks/useAuth'
import { listFamiliesForEditor } from '../lib/firestore'
import type { Family } from '../types'

export function HomePage() {
  const { t } = useTranslation(['app', 'admin', 'common'])
  const { user, loading: authLoading } = useAuth()
  const [families, setFamilies] = useState<Family[]>([])
  const [loadingFamilies, setLoadingFamilies] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setFamilies([])
      setLoadError(null)
      setLoadingFamilies(false)
      return
    }
    setLoadingFamilies(true)
    setLoadError(null)
    void listFamiliesForEditor(user.uid)
      .then(setFamilies)
      .catch((err) => {
        setFamilies([])
        setLoadError(err instanceof Error ? err.message : t('home.loadFailed'))
      })
      .finally(() => setLoadingFamilies(false))
  }, [user, authLoading, t])

  const loading = authLoading || (Boolean(user) && loadingFamilies)
  const isEditor = families.length > 0

  return (
    <Layout isEditor={isEditor}>
      <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-14">
        <div className="text-center">
          <TreeMark className="mx-auto h-14 w-14 text-[var(--accent)]" />
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">{t('home.heading')}</h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            {user && isEditor ? t('home.signedInSubtitle') : t('home.subtitle')}
          </p>
        </div>

        {loading ? (
          <Skeleton className="mx-auto h-32 w-full max-w-xl" />
        ) : loadError ? (
          <div className="text-center">
            <p className="text-[var(--color-bloom-600)] dark:text-[var(--color-bloom-400)]" role="alert">
              {loadError}
            </p>
          </div>
        ) : user && isEditor ? (
          <div className="space-y-4">
            <YourTreesList families={families} title={t('yourTrees', { ns: 'admin' })} />
            <div className="text-center">
              <Link to="/admin">
                <Button variant="secondary">{t('home.createAnother')}</Button>
              </Link>
            </div>
          </div>
        ) : user ? (
          <div className="text-center">
            <p className="text-[var(--text-secondary)]">{t('home.noTreesYet')}</p>
            <Link to="/admin" className="mt-4 inline-block">
              <Button>{t('home.createFirstTree')}</Button>
            </Link>
          </div>
        ) : (
          <div className="text-center">
            <Link to="/login">
              <Button>{t('home.signInToCreate')}</Button>
            </Link>
          </div>
        )}
      </div>
    </Layout>
  )
}
