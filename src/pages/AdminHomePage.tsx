import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Field, inputClass } from '../components/ui/Field'
import { useAuth } from '../hooks/useAuth'
import { createFamily, listFamilies } from '../lib/firestore'
import { slugify } from '../lib/slug'
import type { Family } from '../types'

export function AdminHomePage() {
  const { t } = useTranslation(['admin', 'common', 'app'])
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [families, setFamilies] = useState<Family[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = () => listFamilies().then(setFamilies)

  useEffect(() => {
    void reload().finally(() => setLoading(false))
  }, [])

  const handleNameChange = (value: string) => {
    setName(value)
    if (!slug || slug === slugify(name)) setSlug(slugify(value))
  }

  const createTree = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!user) return
    setCreating(true)
    setError(null)
    try {
      const finalSlug = slugify(slug || name)
      if (!finalSlug) throw new Error(t('create.invalidName', { ns: 'admin' }))
      await createFamily(name.trim(), finalSlug, user.uid)
      await reload()
      navigate(`/families/${finalSlug}/admin`)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('create.failed', { ns: 'admin' }))
    } finally {
      setCreating(false)
    }
  }

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
          <p>{t('signInToManage', { ns: 'admin' })}</p>
          <Link
            to="/login"
            className="mt-4 inline-block text-[var(--accent-strong)] hover:underline"
          >
            {t('auth.signIn', { ns: 'common' })}
          </Link>
        </div>
      </Layout>
    )
  }

  const editableFamilies = families.filter((f) => f.editorUids.includes(user.uid))

  return (
    <Layout isEditor={editableFamilies.length > 0}>
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('manageTitle', { ns: 'admin' })}</h1>
          <p className="mt-1 text-[var(--text-secondary)]">{t('signedInAs', { ns: 'admin', email: user.email })}</p>
        </div>

        {editableFamilies.length > 0 && (
          <Card title={t('yourTrees', { ns: 'admin' })}>
            <ul className="divide-y divide-[var(--border-subtle)]">
              {editableFamilies.map((family) => (
                <li
                  key={family.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0"
                >
                  <span className="font-medium">{family.name}</span>
                  <div className="flex gap-1">
                    <Link to={`/families/${family.slug}`}>
                      <Button variant="ghost" size="sm">
                        {t('actions.view', { ns: 'common' })}
                      </Button>
                    </Link>
                    <Link to={`/families/${family.slug}/admin`}>
                      <Button variant="secondary" size="sm">
                        {t('nav.manage', { ns: 'common' })}
                      </Button>
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card
          title={t('create.title', { ns: 'admin' })}
          description={t('create.description', { ns: 'admin' })}
        >
          <form onSubmit={(e) => void createTree(e)} className="space-y-4">
            {error && (
              <p className="text-sm text-[var(--color-bloom-600)] dark:text-[var(--color-bloom-400)]" role="alert">
                {error}
              </p>
            )}
            <Field label={t('create.displayName', { ns: 'admin' })}>
              <input
                required
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder={t('create.displayPlaceholder', { ns: 'admin' })}
                className={inputClass}
              />
            </Field>
            <Field label={t('create.url', { ns: 'admin' })} hint={slug ? `/families/${slug}` : undefined}>
              <input
                required
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                placeholder={t('create.urlPlaceholder', { ns: 'admin' })}
                className={inputClass}
              />
            </Field>
            <Button type="submit" disabled={creating}>
              {creating ? t('actions.creating', { ns: 'common' }) : t('create.button', { ns: 'admin' })}
            </Button>
          </form>
        </Card>

        {families.length > editableFamilies.length && (
          <Card title={t('allPublished', { ns: 'admin' })}>
            <ul className="space-y-1 text-sm">
              {families.map((family) => (
                <li key={family.id}>
                  <Link
                    to={`/families/${family.slug}`}
                    className="text-[var(--accent-strong)] hover:underline"
                  >
                    {family.name}
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </Layout>
  )
}
