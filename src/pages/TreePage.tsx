import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { FamilyTree } from '../components/FamilyTree'
import { PersonDrawer } from '../components/PersonDrawer'
import { TreeEditToolbar } from '../components/TreeEditToolbar'
import { useAuth } from '../hooks/useAuth'
import { useFamily } from '../hooks/useFamily'
import { deletePerson, savePerson } from '../lib/firestore'
import { getTreeStats } from '../lib/tree'

export function TreePage() {
  const { slug = '' } = useParams()
  const { user } = useAuth()
  const { family, people, relationships, loading, error, isEditor, reload } = useFamily(
    slug,
    user?.email ?? null,
    user?.uid ?? null,
  )
  const [editMode, setEditMode] = useState(false)
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null)

  const stats = useMemo(() => getTreeStats(people, relationships), [people, relationships])
  const selectedPerson = people.find((p) => p.id === selectedPersonId) ?? null
  const orphanPct = people.length > 0 ? stats.orphanCount / people.length : 0
  const showOrphanBanner = orphanPct > 0.1 && stats.orphanCount > 0

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

  const saveSelectedPerson = async (input: Parameters<typeof savePerson>[1]) => {
    if (!selectedPerson || !user) return
    await savePerson(selectedPerson.id, input, user.uid)
    await reload()
  }

  const deleteSelectedPerson = async () => {
    if (!selectedPerson) return
    if (!window.confirm(`Delete ${selectedPerson.givenNames}? This cannot be undone.`)) return
    await deletePerson(selectedPerson.id)
    setSelectedPersonId(null)
    await reload()
  }

  return (
    <Layout familyName={family.name} slug={slug} isEditor={isEditor} adminHref={`/families/${slug}/admin`}>
      {error && <p className="p-4 text-center text-red-700">{error}</p>}

      <div className="border-b border-stone-200 bg-stone-50 px-4 py-2 text-sm text-stone-700 flex flex-wrap items-center gap-x-4 gap-y-1">
        <span>
          {people.length} people · {relationships.length} relationships loaded
        </span>
        {stats.mainId && (
          <span className="text-stone-500">
            Showing branch from most connected person ({stats.reachableCount} in view)
          </span>
        )}
      </div>

      {showOrphanBanner && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm text-amber-900">
          {stats.orphanCount} people not shown in this branch — connect them in Edit mode or from Manage.
        </div>
      )}

      <TreeEditToolbar editMode={editMode} onToggle={setEditMode} canEdit={isEditor} />

      <FamilyTree
        people={people}
        relationships={relationships}
        slug={slug}
        familyId={family.id}
        editMode={editMode}
        isEditor={isEditor}
        userId={user?.uid ?? null}
        onReload={() => void reload()}
        onSelectPerson={editMode && isEditor ? setSelectedPersonId : undefined}
      />

      <PersonDrawer
        person={selectedPerson}
        slug={slug}
        familyId={family.id}
        open={Boolean(selectedPerson && editMode)}
        onClose={() => setSelectedPersonId(null)}
        onSave={saveSelectedPerson}
        onDelete={deleteSelectedPerson}
      />
    </Layout>
  )
}
