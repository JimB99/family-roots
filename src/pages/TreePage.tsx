import { useParams } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { FamilyTree } from '../components/FamilyTree'
import { useAuth } from '../hooks/useAuth'
import { useFamily } from '../hooks/useFamily'

export function TreePage() {
  const { slug = '' } = useParams()
  const { user } = useAuth()
  const { family, people, relationships, loading, error, isEditor } = useFamily(
    slug,
    user?.email ?? null,
    user?.uid ?? null,
  )

  if (loading) {
    return (
      <Layout>
        <p className="p-8 text-center text-stone-500">Loading family tree…</p>
      </Layout>
    )
  }

  if (!family) {
    return (
      <Layout>
        <div className="max-w-xl mx-auto p-8 text-center">
          <h1 className="text-2xl font-semibold">Family not found</h1>
          <p className="mt-2 text-stone-600">
            The family &quot;{slug}&quot; does not exist yet. Sign in and create it from Admin.
          </p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout familyName={family.name} slug={slug} isEditor={isEditor} adminHref={`/families/${slug}/admin`}>
      {error && <p className="p-4 text-center text-red-700">{error}</p>}
      <FamilyTree people={people} relationships={relationships} slug={slug} />
    </Layout>
  )
}
