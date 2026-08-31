import { useEffect, useRef, useState } from 'react'
import type { Chart } from 'family-chart'
import { useNavigate } from 'react-router-dom'
import {
  fitChart,
  prepareChartContainer,
  setupFamilyChart,
} from '../lib/family-chart-setup'
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
  onReload: () => void
  onChartApi?: (api: FamilyChartApi | null) => void
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
  onReload,
  onChartApi,
}: FamilyTreeProps) {
  const shellRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<Chart | null>(null)
  const rootPersonIdRef = useRef(rootPersonId)
  const [chartReady, setChartReady] = useState<Chart | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    rootPersonIdRef.current = rootPersonId
  }, [rootPersonId])

  useEffect(() => {
    const shell = shellRef.current
    const el = containerRef.current
    if (!shell || !el || people.length === 0) return

    let cancelled = false
    let resizeTimer: ReturnType<typeof setTimeout> | null = null
    let lastWidth = 0
    let lastHeight = 0

    const mountChart = () => {
      if (cancelled || people.length === 0) return
      const { width, height } = shell.getBoundingClientRect()
      if (width < 1 || height < 1) return

      const sizeChanged =
        Math.abs(width - lastWidth) > 8 || Math.abs(height - lastHeight) > 8
      if (chartRef.current && !sizeChanged) return

      lastWidth = width
      lastHeight = height

      prepareChartContainer(el, height)
      const chart = setupFamilyChart({
        el,
        people,
        relationships,
        rootPersonId: rootPersonIdRef.current,
        slug,
        familyId,
        editMode,
        isEditor,
        userId,
        navigate,
        onReload,
      })
      chartRef.current = chart
      setChartReady(chart)
      fitChart(chart, 50)
      fitChart(chart, 200)

      const editTree = chart.editTreeInstance
      onChartApi?.({
        chart,
        addPerson: () => {
          if (editTree) editTree.addRelative(undefined)
        },
      })
    }

    const observer = new ResizeObserver(() => {
      if (resizeTimer) clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => {
        const { width, height } = shell.getBoundingClientRect()
        if (width < 1 || height < 1) return

        const sizeChanged =
          Math.abs(width - lastWidth) > 8 || Math.abs(height - lastHeight) > 8

        if (chartRef.current && sizeChanged) {
          chartRef.current = null
          setChartReady(null)
          onChartApi?.(null)
          el.innerHTML = ''
          lastWidth = 0
          lastHeight = 0
        }

        mountChart()
      }, 120)
    })

    observer.observe(shell)
    requestAnimationFrame(mountChart)

    return () => {
      cancelled = true
      if (resizeTimer) clearTimeout(resizeTimer)
      observer.disconnect()
      chartRef.current = null
      setChartReady(null)
      onChartApi?.(null)
      el.innerHTML = ''
    }
  }, [people, relationships, slug, familyId, editMode, isEditor, userId, navigate, onReload, onChartApi])

  useEffect(() => {
    const chart = chartRef.current
    if (!chart || !rootPersonId) return
    chart.updateMainId(rootPersonId)
    fitChart(chart, 80)
  }, [rootPersonId])

  if (people.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-stone-500">
        No people in this family yet. Sign in and add someone from Manage.
      </div>
    )
  }

  return (
    <div ref={shellRef} className="family-tree-shell relative h-full w-full min-h-0">
      <div className="absolute top-3 left-3 z-10 max-w-[calc(100%-1.5rem)]">
        <TreeControls
          chart={chartReady}
          editMode={editMode && isEditor}
          onAddPerson={() => chartRef.current?.editTreeInstance?.addRelative(undefined)}
        />
      </div>
      <div ref={containerRef} className="h-full w-full" />
    </div>
  )
}
