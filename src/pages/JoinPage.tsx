import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Layout } from '../components/Layout'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { findPendingInvite, validatePendingInvite } from '../domain/family-access'
import { claimInviteToken } from '../data/firestore/family-repository'
import { useAuth } from '../hooks/useAuth'
import { useFamily } from '../hooks/useFamily'

export function JoinPage() {
  const { t } = useTranslation(['access', 'common', 'admin'])
  const { slug = '', token = '' } = useParams()
  const navigate = useNavigate()
  const { user, loading: authLoading, signOut } = useAuth()
  const { family, loading, reload, isEditor } = useFamily(
    slug,
    user?.email ?? null,
    user?.uid ?? null,
  )
  const [claiming, setClaiming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const invite = family ? findPendingInvite(family, token) : null

  useEffect(() => {
    if (!user || !family || !invite || claiming || isEditor) return
    const validation = validatePendingInvite(invite, user.email)
    if (!validation.ok) return

    setClaiming(true)
    setError(null)
    void claimInviteToken(family.id, token, user.uid)
      .then(async () => {
        await reload()
        navigate(`/families/${slug}`, { replace: true })
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : t('join.failed', { ns: 'access' }))
      })
      .finally(() => setClaiming(false))
  }, [user, family, invite, claiming, isEditor, token, slug, navigate, reload, t])

  if (loading || authLoading) {
    return (
      <Layout slug={slug}>
        <p className="p-10 text-center text-[var(--text-secondary)]">{t('actions.loading', { ns: 'common' })}</p>
      </Layout>
    )
  }

  if (!family) {
    return (
      <Layout slug={slug}>
        <div className="mx-auto max-w-md p-10 text-center">
          <h1 className="text-2xl font-semibold">{t('notFound.familyTree', { ns: 'common' })}</h1>
          <Link to="/" className="mt-4 inline-block text-[var(--accent-strong)] hover:underline">
            {t('viewGate.home', { ns: 'access' })}
          </Link>
        </div>
      </Layout>
    )
  }

  if (!invite) {
    return (
      <Layout familyName={family.name} slug={slug}>
        <div className="mx-auto max-w-md p-10 text-center">
          <h1 className="text-2xl font-semibold">{t('join.invalidTitle', { ns: 'access' })}</h1>
          <p className="mt-3 text-[var(--text-secondary)]">{t('join.invalidDescription', { ns: 'access' })}</p>
        </div>
      </Layout>
    )
  }

  if (isEditor) {
    return (
      <Layout familyName={family.name} slug={slug} isEditor>
        <div className="mx-auto max-w-md p-10 text-center">
          <p>{t('join.alreadyEditor', { ns: 'access' })}</p>
          <Link
            to={`/families/${slug}`}
            className="mt-4 inline-block text-[var(--accent-strong)] hover:underline"
          >
            {t('join.openTree', { ns: 'access' })}
          </Link>
        </div>
      </Layout>
    )
  }

  if (!user) {
    return (
      <Layout familyName={family.name} slug={slug}>
        <div className="mx-auto max-w-md space-y-4 p-10">
          <Card title={t('join.title', { ns: 'access' })} description={t('join.signInDescription', { ns: 'access' })}>
            <Link to={`/login?returnTo=${encodeURIComponent(`/families/${slug}/join/${token}`)}`}>
              <Button>{t('auth.signIn', { ns: 'common' })}</Button>
            </Link>
          </Card>
        </div>
      </Layout>
    )
  }

  const validation = validatePendingInvite(invite, user.email)
  if (!validation.ok && validation.reason === 'email_mismatch') {
    return (
      <Layout familyName={family.name} slug={slug}>
        <div className="mx-auto max-w-md space-y-4 p-10 text-center">
          <h1 className="text-2xl font-semibold">{t('join.emailMismatchTitle', { ns: 'access' })}</h1>
          <p className="mt-3 text-[var(--text-secondary)]">
            {t('join.emailMismatchDescription', { ns: 'access', email: user.email ?? '' })}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button variant="secondary" onClick={() => void signOut()}>
              {t('auth.signOut', { ns: 'common' })}
            </Button>
            <Link to={`/login?returnTo=${encodeURIComponent(`/families/${slug}/join/${token}`)}`}>
              <Button>{t('auth.signIn', { ns: 'common' })}</Button>
            </Link>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout familyName={family.name} slug={slug}>
      <div className="mx-auto max-w-md p-10 text-center">
        <p>{claiming ? t('join.claiming', { ns: 'access' }) : t('join.working', { ns: 'access' })}</p>
        {error && (
          <p className="mt-3 text-sm text-[var(--color-bloom-600)] dark:text-[var(--color-bloom-400)]" role="alert">
            {error}
          </p>
        )}
      </div>
    </Layout>
  )
}
