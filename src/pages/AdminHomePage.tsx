import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
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
        <p className="p-8 text-center text-stone-500">Loading…</p>
      </Layout>
    )
  }

  if (!user) {
    return (
      <Layout>
        <div className="max-w-md mx-auto p-8 text-center">
          <p>Sign in to manage family trees.</p>
          <Link to="/login" className="text-amber-800 hover:underline mt-4 inline-block">
            Sign in
          </Link>
        </div>
      </Layout>
    )
  }

  const editableFamilies = families.filter((f) => f.editorUids.includes(user.uid))

  return (
    <Layout isEditor={editableFamilies.length > 0}>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-semibold">Manage family trees</h1>
          <p className="text-stone-600 mt-1">Signed in as {user.email}</p>
        </div>

        {editableFamilies.length > 0 && (
          <section className="bg-white border border-stone-200 rounded-xl p-5">
            <h2 className="font-medium">Your trees</h2>
            <ul className="mt-4 space-y-2">
              {editableFamilies.map((family) => (
                <li key={family.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{family.name}</span>
                  <div className="flex gap-3 text-sm">
                    <Link to={`/families/${family.slug}`} className="text-stone-600 hover:underline">
                      View
                    </Link>
                    <Link to={`/families/${family.slug}/admin`} className="text-amber-800 hover:underline">
                      Manage
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="bg-white border border-stone-200 rounded-xl p-5">
          <h2 className="font-medium">Create a new family tree</h2>
          <p className="text-sm text-stone-600 mt-1">
            Choose a display name and URL slug. You will be the owner and can invite editors later.
          </p>
          <form onSubmit={(e) => void createTree(e)} className="mt-4 space-y-4">
            {error && <p className="text-sm text-red-700">{error}</p>}
            <label className="block text-sm">
              <span className="text-stone-600">Display name</span>
              <input
                required
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. The Miller family"
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="text-stone-600">URL slug</span>
              <input
                required
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                placeholder="miller-family"
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
              />
            </label>
            <button
              type="submit"
              disabled={creating}
              className="rounded-lg bg-amber-800 text-white px-4 py-2 text-sm hover:bg-amber-900 disabled:opacity-60"
            >
              {creating ? 'Creating…' : 'Create family tree'}
            </button>
          </form>
        </section>

        {families.length > editableFamilies.length && (
          <section className="text-sm text-stone-600">
            <h2 className="font-medium text-stone-900">All published trees</h2>
            <ul className="mt-2 space-y-1">
              {families.map((family) => (
                <li key={family.id}>
                  <Link to={`/families/${family.slug}`} className="text-amber-800 hover:underline">
                    {family.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </Layout>
  )
}
