import { useEffect, useMemo, useRef, useState } from 'react'
import type { Chart } from 'family-chart'
import { useNavigate } from 'react-router-dom'
import {
  configureEditMode,
  fitChart,
  prepareChartContainer,
  setupFamilyChart,
  startConnectModeForPerson,
  updateChartData,
} from '../lib/family-chart-setup'
import { filterBranchData } from '../lib/tree'
import { TreeControls } from './TreeControls'
import type { Person, Relationship } from '../types'

export interface FamilyChartApi {
  chart: Chart
  addPerson: () => void
}

interface FamilyTreeProps {
  people: Person[]
  relationships: Relationship[]
  slug: string
  familyId: string
  rootPersonId: string | null
  editMode: boolean
  isEditor: boolean
  userId: string | null
  selectedPersonId: string | null
  onSelectPerson: (personId: string | null) => void
  onReload: () => void
  onChartApi?: (api: FamilyChartApi | null) => void
}

function buildBranchKey(rootPersonId: string, people: Person[], relationships: Relationship[]): string {
  const memberIds = [...people.map((p) => p.id)].sort().join(',')
  const relIds = [...relationships.map((r) => r.id)].sort().join(',')
  return `${rootPersonId}|${memberIds}|${relIds}`
}

export function FamilyTree({
  people,
  relationships,
  slug,
  familyId,
  rootPersonId,
  editMode,
  isEditor,
  userId,
  selectedPersonId,
  onSelectPerson,
  onReload,
  onChartApi,
}: FamilyTreeProps) {
  const shellRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<Chart | null>(null)
  const cardRef = useRef<ReturnType<Chart['setCardHtml']> | null>(null)
  const mountedKeyRef = useRef<string | null>(null)
  const skipDataSyncRef = useRef(true)
  const [chartReady, setChartReady] = useState<Chart | null>(null)
  const navigate = useNavigate()

  const onSelectPersonRef = useRef(onSelectPerson)
  const onReloadRef = useRef(onReload)
  const onChartApiRef = useRef(onChartApi)

  useEffect(() => {
    onSelectPersonRef.current = onSelectPerson
    onReloadRef.current = onReload
    onChartApiRef.current = onChartApi
  })

  const branchData = useMemo(() => {
    if (!rootPersonId) return { people: [], relationships: [] }
    return filterBranchData(rootPersonId, people, relationships)
  }, [rootPersonId, people, relationships])

  const branchKey = useMemo(() => {
    if (!rootPersonId || branchData.people.length === 0) return null
    return buildBranchKey(rootPersonId, branchData.people, branchData.relationships)
  }, [rootPersonId, branchData])

  useEffect(() => {
    skipDataSyncRef.current = true
  }, [branchKey])

  useEffect(() => {
    const shell = shellRef.current
    const el = containerRef.current
    if (!shell || !el || !branchKey || !rootPersonId) return

    let cancelled = false
    let resizeTimer: ReturnType<typeof setTimeout> | null = null
    let hasMounted = false

    const mountChart = () => {
      if (cancelled || hasMounted) return
      const width = shell.clientWidth
      const height = shell.clientHeight
      if (width < 1 || height < 1) return

      hasMounted = true
      mountedKeyRef.current = branchKey
      prepareChartContainer(el)

      const { chart, card } = setupFamilyChart({
        el,
        people: branchData.people,
        relationships: branchData.relationships,
        rootPersonId,
        slug,
        familyId,
        editMode,
        isEditor,
        userId,
        navigate,
        onReload: () => onReloadRef.current(),
        onSelectPerson: (id) => onSelectPersonRef.current(id),
      })

      cardRef.current = card
      chartRef.current = chart
      setChartReady(chart)
      requestAnimationFrame(() => fitChart(chart, true))

      onChartApiRef.current?.({
        chart,
        addPerson: () => chart.editTreeInstance?.addRelative(undefined),
      })
    }

    const observer = new ResizeObserver(() => {
      if (resizeTimer) clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => {
        if (!chartRef.current) {
          mountChart()
          return
        }
        chartRef.current.updateTree({
          initial: false,
          tree_position: 'inherit',
          transition_time: 0,
        })
      }, 200)
    })

    observer.observe(shell)
    requestAnimationFrame(mountChart)

    return () => {
      cancelled = true
      if (resizeTimer) clearTimeout(resizeTimer)
      observer.disconnect()
      chartRef.current = null
      cardRef.current = null
      mountedKeyRef.current = null
      setChartReady(null)
      onChartApiRef.current?.(null)
      el.innerHTML = ''
    }
  }, [branchKey, rootPersonId, slug, familyId, navigate])

  useEffect(() => {
    const chart = chartRef.current
    if (!chart || !branchKey || mountedKeyRef.current !== branchKey) return
    if (skipDataSyncRef.current) {
      skipDataSyncRef.current = false
      return
    }
    updateChartData(chart, branchData.people, branchData.relationships)
    if (rootPersonId) chart.updateMainId(rootPersonId)
    fitChart(chart, false)
  }, [branchKey, branchData, rootPersonId])

  useEffect(() => {
    const chart = chartRef.current
    const card = cardRef.current
    const el = containerRef.current
    if (!chart || !card || !el) return

    configureEditMode(chart, card, {
      el,
      people: branchData.people,
      relationships: branchData.relationships,
      rootPersonId,
      slug,
      familyId,
      editMode,
      isEditor,
      userId,
      navigate,
      onReload: () => onReloadRef.current(),
      onSelectPerson: (id) => onSelectPersonRef.current(id),
    })
  }, [branchData, rootPersonId, slug, familyId, navigate, editMode, isEditor, userId])

  useEffect(() => {
    const chart = chartRef.current
    if (!chart || !selectedPersonId || !editMode) return
    startConnectModeForPerson(chart, selectedPersonId)
  }, [selectedPersonId, editMode])

  if (!rootPersonId) {
    return (
      <div className="flex items-center justify-center h-full text-stone-500">
        Choose a root person to display this branch.
      </div>
    )
  }

  if (branchData.people.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-stone-500">
        No connected people in this branch.
      </div>
    )
  }

  return (
    <div ref={shellRef} className="family-tree-shell absolute inset-0">
      <div className="absolute top-3 left-3 z-10 max-w-[calc(100%-1.5rem)]">
        <TreeControls
          chart={chartReady}
          editMode={editMode && isEditor}
          onAddPerson={() => chartRef.current?.editTreeInstance?.addRelative(undefined)}
        />
      </div>
      <div ref={containerRef} className="absolute inset-0" />
    </div>
  )
}
