import { displayName } from '../lib/tree'
import type { Person } from '../types'

interface TreeLinkLegendProps {
  className?: string
}

export function TreeLinkLegend({ className = '' }: TreeLinkLegendProps) {
  return (
    <div
      className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-600 ${className}`}
    >
      <span className="flex items-center gap-1.5">
        <span className="inline-block w-8 h-0 border-t-2 border-stone-600" />
        Parent / child
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-flex items-center">
          <span className="inline-block w-3 h-3 rounded-full border-2 border-amber-700 -mr-1.5" />
          <span className="inline-block w-3 h-3 rounded-full border-2 border-amber-700" />
        </span>
        Marriage
      </span>
      <span className="text-stone-500">Siblings share parents (no line between them)</span>
    </div>
  )
}

interface TreeEditPanelProps {
  selectedPerson: Person | null
  onAddChild: () => void
  onAddSpouse: () => void
  onAddParent: () => void
  onAddSibling: () => void
  onClear: () => void
}

export function TreeEditPanel({
  selectedPerson,
  onAddChild,
  onAddSpouse,
  onAddParent,
  onAddSibling,
  onClear,
}: TreeEditPanelProps) {
  if (!selectedPerson) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <strong>Edit mode:</strong> click a person to show connection ghosts, then click a ghost to
        create them. Drag a person card to reposition. Click a parent/child line to convert it to
        marriage. Double-click a card (or use the pencil) to edit details.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-stone-900">
          Connecting: {displayName(selectedPerson)}
        </p>
        <button type="button" onClick={onClear} className="text-xs text-stone-500 hover:text-stone-800">
          Clear
        </button>
      </div>
      <p className="mt-1 text-xs text-stone-500">
        Click a ghost on the tree, or pick one relationship type:
      </p>
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          type="button"
          onClick={onAddChild}
          className="rounded-lg border-2 border-dashed border-stone-400 bg-stone-50 px-3 py-2 text-sm hover:border-amber-600 hover:bg-amber-50"
        >
          ↓ Child
        </button>
        <button
          type="button"
          onClick={onAddSpouse}
          className="rounded-lg border-2 border-dashed border-amber-400 bg-amber-50 px-3 py-2 text-sm hover:border-amber-600"
        >
          ↔ Spouse
        </button>
        <button
          type="button"
          onClick={onAddParent}
          className="rounded-lg border-2 border-dashed border-stone-400 bg-stone-50 px-3 py-2 text-sm hover:border-amber-600 hover:bg-amber-50"
        >
          ↑ Parent
        </button>
        <button
          type="button"
          onClick={onAddSibling}
          className="rounded-lg border-2 border-dashed border-stone-300 bg-white px-3 py-2 text-sm hover:border-amber-600"
          title="Adds another child to the same parents"
        >
          ⊞ Sibling
        </button>
      </div>
    </div>
  )
}
