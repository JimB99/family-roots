import { useCallback, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { BranchPanel } from '../components/BranchPanel'
import { FamilyForest } from '../components/FamilyForest'
import { FamilyTree, type FamilyChartApi } from '../components/FamilyTree'
import { TreeEditToolbar } from '../components/TreeEditToolbar'
import { useAuth } from '../hooks/useAuth'
import { useFamily } from '../hooks/useFamily'
import {
  displayName,
  getConnectedComponents,
  getReachablePersonIds,
  pickMainPersonId,
} from '../lib/tree'

export function TreePage() {
  const { slug = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()
  const { family, people, relationships, loading, error, isEditor, reload } = useFamily(
    slug,
    user?.email ?? null,
    user?.uid ?? null,
  )
  const [editMode, setEditMode] = useState(false)
  const [branchesOpen, setBranchesOpen] = useState(() => searchParams.get('branches') === '1')
  const [viewMode, setViewMode] = useState<'branch' | 'all'>('branch')
  const [chartApi, setChartApi] = useState<FamilyChartApi | null>(null)
  const handleChartApi = useCallback((api: FamilyChartApi | null) => setChartApi(api), [])

  const defaultRootId = useMemo(
    () => pickMainPersonId(people, relationships),
    [people, relationships],
  )
  const [rootOverride, setRootOverride] = useState<string | null>(null)
  const activeRootId = rootOverride ?? defaultRootId

  const components = useMemo(
    () => getConnectedComponents(people, relationships),
    [people, relationships],
  )

  const reachableCount = activeRootId
    ? getReachablePersonIds(activeRootId, people, relationships).size
    : 0
  const orphanCount = people.length - reachableCount
  const showBranchBanner = components.length > 1 && viewMode === 'branch'

  const openBranches = () => {
    setBranchesOpen(true)
    setSearchParams({ branches: '1' }, { replace: true })
  }

  const closeBranches = () => {
    setBranchesOpen(false)
    setSearchParams({}, { replace: true })
  }

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
      <div className="flex flex-col h-[calc(100svh-3.5rem)] min-h-0">
        {error && <p className="p-4 text-center text-red-700 shrink-0">{error}</p>}

        <div className="border-b border-stone-200 bg-stone-50 px-4 py-2 text-sm text-stone-700 flex flex-wrap items-center gap-x-4 gap-y-2 shrink-0">
          <span>
            {people.length} people total · {relationships.length} relationships
          </span>
          {viewMode === 'branch' && activeRootId && (
            <span className="text-stone-500">{reachableCount} in current branch</span>
          )}
          {viewMode === 'all' && (
            <span className="text-stone-500">{components.length} branches</span>
          )}
          <div className="flex rounded-lg border border-stone-300 overflow-hidden text-sm ml-auto">
            <button
              type="button"
              onClick={() => setViewMode('branch')}
              className={`px-3 py-1 ${viewMode === 'branch' ? 'bg-amber-800 text-white' : 'bg-white text-stone-700 hover:bg-stone-50'}`}
            >
              One branch
            </button>
            <button
              type="button"
              onClick={() => setViewMode('all')}
              className={`px-3 py-1 ${viewMode === 'all' ? 'bg-amber-800 text-white' : 'bg-white text-stone-700 hover:bg-stone-50'}`}
            >
              All {people.length} people
            </button>
          </div>
          <Link
            to={`/families/${slug}/people`}
            className="text-amber-800 hover:underline"
          >
            Card browse
          </Link>
        </div>

        {viewMode === 'branch' && (
          <label className="border-b border-stone-200 bg-white px-4 py-2 text-sm flex items-center gap-2 shrink-0">
            <span className="text-stone-500">Root person</span>
            <select
              value={activeRootId ?? ''}
              onChange={(e) => setRootOverride(e.target.value)}
              className="rounded-lg border border-stone-300 px-2 py-1 text-sm max-w-[260px]"
            >
              {sortPeopleByName(people).map((person) => (
                <option key={person.id} value={person.id}>
                  {displayName(person)}
                </option>
              ))}
            </select>
          </label>
        )}

        {showBranchBanner && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm text-amber-900 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <span>
              {orphanCount > 0
                ? `${orphanCount} people in ${components.length - 1} other branch${components.length - 1 === 1 ? '' : 'es'}`
                : `${components.length} separate branches`}
            </span>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setViewMode('all')}
                className="text-amber-900 font-medium hover:underline"
              >
                View all people
              </button>
              <button
                type="button"
                onClick={openBranches}
                className="text-amber-900 font-medium hover:underline"
              >
                Pick branch
              </button>
            </div>
          </div>
        )}

        <TreeEditToolbar
          editMode={editMode}
          onToggle={setEditMode}
          canEdit={isEditor}
          chartApi={viewMode === 'branch' ? chartApi : null}
        />

        <div className="relative flex-1 min-h-0">
          {viewMode === 'branch' ? (
            <FamilyTree
              people={people}
              relationships={relationships}
              slug={slug}
              familyId={family.id}
              rootPersonId={activeRootId}
              editMode={editMode}
              isEditor={isEditor}
              userId={user?.uid ?? null}
              onReload={() => void reload()}
              onChartApi={handleChartApi}
            />
          ) : (
            <FamilyForest
              people={people}
              relationships={relationships}
              components={components}
              slug={slug}
              familyId={family.id}
              editMode={editMode}
              isEditor={isEditor}
              userId={user?.uid ?? null}
              onReload={() => void reload()}
            />
          )}
          {viewMode === 'branch' && (
            <BranchPanel
              open={branchesOpen}
              onClose={closeBranches}
              components={components}
              people={people}
              activeRootId={activeRootId}
              onSelectRoot={(id) => {
                setRootOverride(id)
                closeBranches()
              }}
            />
          )}
        </div>
      </div>
    </Layout>
  )
}

function sortPeopleByName(people: Parameters<typeof displayName>[0][]) {
  return [...people].sort((a, b) => displayName(a).localeCompare(displayName(b)))
}
