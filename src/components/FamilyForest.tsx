import { useEffect, useRef, useState } from 'react'
import type { Chart } from 'family-chart'
import { useNavigate } from 'react-router-dom'
import { displayName, type ConnectedComponent } from '../lib/tree'
import {
  fitChart,
  prepareChartContainer,
  setupFamilyChart,
} from '../lib/family-chart-setup'
import type { Person, Relationship } from '../types'

interface FamilyForestProps {
  people: Person[]
  relationships: Relationship[]
  components: ConnectedComponent[]
  slug: string
  familyId: string
  editMode: boolean
  isEditor: boolean
  userId: string | null
  onReload: () => void
}

function BranchChart({
  people,
  relationships,
  rootPersonId,
  slug,
  familyId,
  editMode,
  isEditor,
  userId,
  onReload,
  defaultOpen,
  label,
}: {
  people: Person[]
  relationships: Relationship[]
  rootPersonId: string
  slug: string
  familyId: string
  editMode: boolean
  isEditor: boolean
  userId: string | null
  onReload: () => void
  defaultOpen: boolean
  label: string
}) {
  const [open, setOpen] = useState(defaultOpen)
  const shellRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<Chart | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return
    const shell = shellRef.current
    const el = containerRef.current
    if (!shell || !el) return

    let cancelled = false

    const mount = () => {
      if (cancelled) return
      const height = 420
      prepareChartContainer(el, height)
      const chart = setupFamilyChart({
        el,
        people,
        relationships,
        rootPersonId,
        slug,
        familyId,
        editMode,
        isEditor,
        userId,
        navigate,
        onReload,
      })
      chartRef.current = chart
      fitChart(chart, 50)
      fitChart(chart, 250)
    }

    requestAnimationFrame(mount)

    return () => {
      cancelled = true
      chartRef.current = null
      el.innerHTML = ''
    }
  }, [open, people, relationships, rootPersonId, slug, familyId, editMode, isEditor, userId, navigate, onReload])

  return (
    <section className="border border-stone-200 rounded-xl bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-stone-50"
      >
        <span className="font-medium text-stone-900">{label}</span>
        <span className="text-sm text-stone-500">{open ? 'Fold in' : 'Fold out'}</span>
      </button>
      {open && (
        <div ref={shellRef} className="border-t border-stone-200 h-[420px]">
          <div ref={containerRef} />
        </div>
      )}
    </section>
  )
}

export function FamilyForest({
  people,
  relationships,
  components,
  slug,
  familyId,
  editMode,
  isEditor,
  userId,
  onReload,
}: FamilyForestProps) {
  const peopleById = new Map(people.map((p) => [p.id, p]))

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4 bg-stone-100">
      <p className="text-sm text-stone-600">
        All {people.length} people across {components.length} branches. Fold branches in or out
        individually. Click duplicate markers on cards to toggle sub-branches within a tree.
      </p>
      {components.map((component, index) => {
        const rep = peopleById.get(component.representativeId)
        const label = `Branch ${index + 1} · ${component.size} people${
          rep ? ` · e.g. ${displayName(rep)}` : ''
        }`
        return (
          <BranchChart
            key={component.representativeId}
            people={people}
            relationships={relationships}
            rootPersonId={component.representativeId}
            slug={slug}
            familyId={familyId}
            editMode={editMode}
            isEditor={isEditor}
            userId={userId}
            onReload={onReload}
            defaultOpen={index < 3}
            label={label}
          />
        )
      })}
    </div>
  )
}
