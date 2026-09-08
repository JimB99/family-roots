import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Layout } from './Layout'

interface ViewAccessGateProps {
  familyName?: string
  slug: string
  canView: boolean
  loading?: boolean
  children: React.ReactNode
}

export function ViewAccessGate({ familyName, slug, canView, loading, children }: ViewAccessGateProps) {
  const { t } = useTranslation(['access', 'common'])

  if (loading) {
    return (
      <Layout familyName={familyName} slug={slug}>
        <p className="p-10 text-center text-[var(--text-secondary)]">{t('actions.loading', { ns: 'common' })}</p>
      </Layout>
    )
  }

  if (!canView) {
    return (
      <Layout slug={slug}>
        <div className="mx-auto max-w-md p-10 text-center">
          <h1 className="text-2xl font-semibold">{t('viewGate.title', { ns: 'access' })}</h1>
          <p className="mt-3 text-[var(--text-secondary)]">{t('viewGate.description', { ns: 'access' })}</p>
          <Link to="/" className="mt-4 inline-block text-[var(--accent-strong)] hover:underline">
            {t('viewGate.home', { ns: 'access' })}
          </Link>
        </div>
      </Layout>
    )
  }

  return <>{children}</>
}
