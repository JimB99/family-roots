import { useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useParams } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { PeopleToolbar } from '../components/PeopleToolbar'
import { PersonTile } from '../components/PersonTile'
import { useAuth } from '../hooks/useAuth'
import { useFamily } from '../hooks/useFamily'
import {
  computeGenerations,
  getConnectedComponents,
  pickDefaultProgenitor,
  sortPeople,
  type PeopleSortKey,
} from '../lib/tree'

const COLUMNS = 3
const ROW_HEIGHT = 108

export function PeoplePage() {
  const { slug = '' } = useParams()
  const { user } = useAuth()
  const { family, people, relationships, loading, isEditor } = useFamily(
    slug,
    user?.email ?? null,
    user?.uid ?? null,
  )

  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<PeopleSortKey>('name-asc')
  const [branchFilter, setBranchFilter] = useState('all')
  const [generation, setGeneration] = useState<number | 'all'>('all')
  const [progenitorId, setProgenitorId] = useState<string>('')

  const components = useMemo(
    () => getConnectedComponents(people, relationships),
    [people, relationships],
  )

  const defaultProgenitor = useMemo(
    () => pickDefaultProgenitor(people, relationships),
    [people, relationships],
  )

  const activeProgenitor = progenitorId || defaultProgenitor || ''

  const generations = useMemo(() => {
    if (!activeProgenitor) return new Map<string, number>()
    return computeGenerations(activeProgenitor, people, relationships)
  }, [activeProgenitor, people, relationships])

  const generationOptions = useMemo(() => {
    const values = [...new Set(generations.values())].sort((a, b) => a - b)
    return values
  }, [generations])

  const filtered = useMemo(() => {
    let list = [...people]

    if (branchFilter !== 'all') {
      const component = components.find((c) => c.representativeId === branchFilter)
      if (component) {
        list = list.filter((p) => component.memberIds.has(p.id))
      }
    }

    if (generation !== 'all') {
      list = list.filter((p) => generations.get(p.id) === generation)
    }

    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter((p) => {
        const haystack = [p.givenNames, p.familyName, p.maidenName]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return haystack.includes(q)
      })
    }

    return sortPeople(list, sortKey)
  }, [people, branchFilter, components, generation, generations, query, sortKey])

  const parentRef = useRef<HTMLDivElement>(null)
  const rowCount = Math.ceil(filtered.length / COLUMNS) || 1

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 4,
  })

  if (loading) {
    return (
      <Layout>
        <p className="p-8 text-center text-stone-500">Loading people…</p>
      </Layout>
    )
  }

  if (!family) {
    return (
      <Layout>
        <div className="max-w-xl mx-auto p-8 text-center">
          <h1 className="text-2xl font-semibold">Family not found</h1>
        </div>
      </Layout>
    )
  }

  return (
    <Layout familyName={family.name} slug={slug} isEditor={isEditor} adminHref={`/families/${slug}/admin`}>
      <div className="flex flex-col h-[calc(100svh-3.5rem)] min-h-0">
        <PeopleToolbar
          query={query}
          onQueryChange={setQuery}
          sortKey={sortKey}
          onSortChange={setSortKey}
          branchFilter={branchFilter}
          onBranchFilterChange={setBranchFilter}
          components={components}
          progenitorId={activeProgenitor}
          onProgenitorChange={setProgenitorId}
          people={sortPeople(people, 'name-asc')}
          generation={generation}
          onGenerationChange={setGeneration}
          generationOptions={generationOptions}
        />

        <div className="px-4 py-2 text-sm text-stone-600 bg-stone-50 border-b border-stone-200">
          {filtered.length} of {people.length} people
        </div>

        <div ref={parentRef} className="flex-1 overflow-y-auto min-h-0 px-4 py-4">
          {filtered.length === 0 ? (
            <p className="text-center text-stone-500 py-12">No people match your filters.</p>
          ) : (
            <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const start = virtualRow.index * COLUMNS
                const rowPeople = filtered.slice(start, start + COLUMNS)
                return (
                  <div
                    key={virtualRow.key}
                    className="absolute left-0 right-0 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
                    style={{
                      top: virtualRow.start,
                      height: virtualRow.size,
                    }}
                  >
                    {rowPeople.map((person) => (
                      <PersonTile key={person.id} person={person} slug={slug} />
                    ))}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
