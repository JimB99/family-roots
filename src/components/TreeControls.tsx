import type { Chart } from 'family-chart'
import { handlers } from 'family-chart'
import { collapseChart, expandChart, fitChart } from '../lib/family-chart-setup'

interface TreeControlsProps {
  chart: Chart | null
  editMode?: boolean
  onAddPerson?: () => void
}

function getMainSvg(chart: Chart): SVGElement | null {
  return chart.cont.querySelector('svg.main_svg')
}

export function TreeControls({ chart, editMode, onAddPerson }: TreeControlsProps) {
  const zoom = (amount: number) => {
    const svg = chart ? getMainSvg(chart) : null
    if (svg) handlers.manualZoom({ amount, svg, transition_time: 200 })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 rounded-lg border border-stone-300 bg-white p-0.5 text-sm shadow-sm">
        <button
          type="button"
          onClick={() => chart && zoom(1.25)}
          className="rounded px-2.5 py-1 hover:bg-stone-100"
          title="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => chart && zoom(0.8)}
          className="rounded px-2.5 py-1 hover:bg-stone-100"
          title="Zoom out"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => chart && fitChart(chart)}
          className="rounded px-2.5 py-1 hover:bg-stone-100"
          title="Fit tree to view"
        >
          Fit
        </button>
        <button
          type="button"
          onClick={() => chart && expandChart(chart)}
          className="rounded px-2.5 py-1 hover:bg-stone-100"
          title="Expand all generations"
        >
          Expand
        </button>
        <button
          type="button"
          onClick={() => chart && collapseChart(chart, 1)}
          className="rounded px-2.5 py-1 hover:bg-stone-100"
          title="Collapse to one generation"
        >
          Collapse
        </button>
      </div>
      {editMode && onAddPerson && (
        <button
          type="button"
          onClick={onAddPerson}
          className="rounded-lg bg-amber-800 text-white px-3 py-1.5 text-sm shadow-sm hover:bg-amber-900"
        >
          + Add person
        </button>
      )}
    </div>
  )
}
