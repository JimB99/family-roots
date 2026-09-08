import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useParams, useSearchParams, useLocation } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { ViewAccessGate } from '../components/ViewAccessGate'
import { PeopleToolbar } from '../components/PeopleToolbar'
import { PersonTile } from '../components/PersonTile'
import { EmptyState } from '../components/ui/EmptyState'
import { filterPeople, type PeopleFilters } from '../domain/person-filters'
import { useAuth } from '../hooks/useAuth'
import { useFamily } from '../hooks/useFamily'
import { useViewAccess } from '../hooks/useViewAccess'
import { filtersToSearchParams, searchParamsToFilters } from '../lib/people-filter-params'
import { personNavigationState } from '../lib/person-navigation'
import {
  computeGenerations,
  getConnectedComponents,
  pickDefaultProgenitor,
  sortPeople,
  type PeopleSortKey,
} from '../lib/tree'

const ROW_HEIGHT = 120

function getColumnCount() {
  if (typeof window === 'undefined') return 1
  if (window.matchMedia('(min-width: 1024px)').matches) return 3
  if (window.matchMedia('(min-width: 640px)').matches) return 2
  return 1
}

export function PeoplePage() {
  const { t } = useTranslation(['people', 'common'])
  const { slug = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const { user } = useAuth()
  const { family, people, relationships, loading, isEditor } = useFamily(
    slug,
    user?.email ?? null,
    user?.uid ?? null,
  )
  const { canView } = useViewAccess(family, isEditor)

  const filters = useMemo(() => searchParamsToFilters(searchParams), [searchParams])
  const setFilters = (next: PeopleFilters) => {
    setSearchParams(filtersToSearchParams(next), { replace: true })
  }

  const personReturnState = useMemo(
    () => personNavigationState(`${location.pathname}${location.search}`, 'people'),
    [location.pathname, location.search],
  )

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

    list = filterPeople(list, filters)

    return sortPeople(list, sortKey)
  }, [people, branchFilter, components, generation, generations, filters, sortKey])

  const parentRef = useRef<HTMLDivElement>(null)
  const [columns, setColumns] = useState(1)

  useEffect(() => {
    const update = () => setColumns(getColumnCount())
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const rowCount = Math.ceil(filtered.length / columns) || 1

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 4,
  })

  if (loading) {
    return (
      <ViewAccessGate slug={slug} canView={false} loading>
        {null}
      </ViewAccessGate>
    )
  }

  if (!family) {
    return (
      <Layout>
        <div className="mx-auto max-w-xl p-10 text-center">
          <h1 className="text-2xl font-semibold">{t('notFound.family', { ns: 'common' })}</h1>
        </div>
      </Layout>
    )
  }

  return (
    <ViewAccessGate familyName={family.name} slug={slug} canView={canView}>
      <Layout familyName={family.name} slug={slug} isEditor={isEditor} adminHref={`/families/${slug}/admin`}>
      <div className="flex h-[calc(100svh-3.25rem)] min-h-0 flex-col">
        <PeopleToolbar
          filters={filters}
          onFiltersChange={setFilters}
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

        <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-4 py-2 text-sm text-[var(--text-secondary)]">
          {t('countBar', { ns: 'people', matched: filtered.length, total: people.length })}
        </div>

        <div ref={parentRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {filtered.length === 0 ? (
            <EmptyState
              title={t('emptyTitle', { ns: 'people' })}
              description={t('emptyDescription', { ns: 'people' })}
            />
          ) : (
            <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const start = virtualRow.index * columns
                const rowPeople = filtered.slice(start, start + columns)
                return (
                  <div
                    key={virtualRow.key}
                    className="absolute left-0 right-0 grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                    style={{
                      top: virtualRow.start,
                      height: virtualRow.size,
                    }}
                  >
                    {rowPeople.map((person) => (
                      <PersonTile
                        key={person.id}
                        person={person}
                        slug={slug}
                        returnState={personReturnState}
                      />
                    ))}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
    </ViewAccessGate>
  )
}
