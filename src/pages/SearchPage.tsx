import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { useAuth } from '../hooks/useAuth'
import { useFamily } from '../hooks/useFamily'
import { displayName } from '../lib/tree'

export function SearchPage() {
  const { slug = '' } = useParams()
  const [query, setQuery] = useState('')
  const { user } = useAuth()
  const { family, people, loading, isEditor } = useFamily(
    slug,
    user?.email ?? null,
    user?.uid ?? null,
  )

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return people.slice(0, 50)
    return people.filter((p) => {
      const haystack = [p.givenNames, p.familyName, p.maidenName]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [people, query])

  return (
    <Layout familyName={family?.name} slug={slug} isEditor={isEditor} adminHref={`/families/${slug}/admin`}>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold">Search</h1>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Name or maiden name…"
          className="mt-4 w-full rounded-xl border border-stone-300 px-4 py-3"
        />

        {loading ? (
          <p className="mt-6 text-stone-500">Loading…</p>
        ) : (
          <ul className="mt-6 divide-y divide-stone-200 bg-white rounded-xl border border-stone-200">
            {results.map((person) => (
              <li key={person.id}>
                <a
                  href={`/families/${slug}/person/${person.id}`}
                  className="block px-4 py-3 hover:bg-stone-50"
                >
                  <span className="font-medium text-amber-900">{displayName(person)}</span>
                  {person.maidenName && (
                    <span className="text-stone-500 text-sm ml-2">née {person.maidenName}</span>
                  )}
                </a>
              </li>
            ))}
            {results.length === 0 && (
              <li className="px-4 py-6 text-stone-500 text-sm">No matches.</li>
            )}
          </ul>
        )}
      </div>
    </Layout>
  )
}
