import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { listFamilies } from '../lib/firestore'
import type { Family } from '../types'

export function HomePage() {
  const [families, setFamilies] = useState<Family[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void listFamilies()
      .then(setFamilies)
      .finally(() => setLoading(false))
  }, [])

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-semibold text-center">Family trees</h1>
        <p className="text-stone-600 text-center mt-2">
          Browse a family tree or sign in to edit.
        </p>

        {loading ? (
          <p className="text-center text-stone-500 mt-10">Loading…</p>
        ) : families.length === 0 ? (
          <div className="mt-10 text-center">
            <p className="text-stone-600">No family trees published yet.</p>
            <Link to="/admin" className="inline-block mt-4 text-amber-800 hover:underline">
              Sign in to create one
            </Link>
          </div>
        ) : (
          <ul className="mt-10 grid gap-4 sm:grid-cols-2">
            {families.map((family) => (
              <li key={family.id}>
                <Link
                  to={`/families/${family.slug}`}
                  className="block rounded-xl border border-stone-200 bg-white p-5 hover:border-amber-300 hover:shadow-sm transition"
                >
                  <h2 className="font-medium text-lg text-amber-900">{family.name}</h2>
                  <p className="text-sm text-stone-500 mt-1">View tree</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Layout>
  )
}
