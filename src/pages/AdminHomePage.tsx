import { useEffect, useState } from 'react'
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
      if (!finalSlug) throw new Error('Please enter a valid family name.')
      await createFamily(name.trim(), finalSlug, user.uid)
      await reload()
      navigate(`/families/${finalSlug}/admin`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create family tree')
    } finally {
      setCreating(false)
    }
  }

  if (authLoading || loading) {
    return (
      <Layout>
        <p className="p-10 text-center text-[var(--text-secondary)]">Loading…</p>
      </Layout>
    )
  }

  if (!user) {
    return (
      <Layout>
        <div className="mx-auto max-w-md p-10 text-center">
          <p>Sign in to manage family trees.</p>
          <Link
            to="/login"
            className="mt-4 inline-block text-[var(--accent-strong)] hover:underline"
          >
            Sign in
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
          <h1 className="text-2xl font-semibold tracking-tight">Manage family trees</h1>
          <p className="mt-1 text-[var(--text-secondary)]">Signed in as {user.email}</p>
        </div>

        {editableFamilies.length > 0 && (
          <Card title="Your trees">
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
                        View
                      </Button>
                    </Link>
                    <Link to={`/families/${family.slug}/admin`}>
                      <Button variant="secondary" size="sm">
                        Manage
                      </Button>
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card
          title="Create a new family tree"
          description="Choose a display name and a URL. You become the owner and can invite editors later."
        >
          <form onSubmit={(e) => void createTree(e)} className="space-y-4">
            {error && (
              <p className="text-sm text-[var(--color-bloom-600)] dark:text-[var(--color-bloom-400)]" role="alert">
                {error}
              </p>
            )}
            <Field label="Display name">
              <input
                required
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. The Miller family"
                className={inputClass}
              />
            </Field>
            <Field label="URL" hint={slug ? `/families/${slug}` : undefined}>
              <input
                required
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                placeholder="miller-family"
                className={inputClass}
              />
            </Field>
            <Button type="submit" disabled={creating}>
              {creating ? 'Creating…' : 'Create family tree'}
            </Button>
          </form>
        </Card>

        {families.length > editableFamilies.length && (
          <Card title="All published trees">
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
