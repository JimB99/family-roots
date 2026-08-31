import { displayName, type ConnectedComponent } from '../lib/tree'
import type { Person } from '../types'

interface BranchPanelProps {
  open: boolean
  onClose: () => void
  components: ConnectedComponent[]
  people: Person[]
  activeRootId: string | null
  onSelectRoot: (personId: string) => void
}

export function BranchPanel({
  open,
  onClose,
  components,
  people,
  activeRootId,
  onSelectRoot,
}: BranchPanelProps) {
  const peopleById = new Map(people.map((p) => [p.id, p]))

  if (!open) return null

  return (
    <aside className="absolute right-0 top-0 z-10 h-full w-full max-w-sm border-l border-stone-200 bg-white shadow-lg flex flex-col">
      <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
        <h2 className="font-medium text-stone-900">Branches</h2>
        <button type="button" onClick={onClose} className="text-stone-500 hover:text-stone-900 text-sm">
          Close
        </button>
      </div>
      <p className="px-4 py-2 text-sm text-stone-600 border-b border-stone-100">
        {components.length} separate group{components.length === 1 ? '' : 's'}. Pick one to center the tree.
      </p>
      <ul className="flex-1 overflow-y-auto divide-y divide-stone-100">
        {components.map((component, index) => {
          const rep = peopleById.get(component.representativeId)
          const label = rep ? displayName(rep) : 'Unknown'
          const isActive = component.representativeId === activeRootId
          return (
            <li key={component.representativeId} className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-stone-900 truncate">
                  Branch {index + 1}
                  {isActive && <span className="ml-2 text-xs text-amber-800">(active)</span>}
                </p>
                <p className="text-sm text-stone-500 truncate">
                  {component.size} people · e.g. {label}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onSelectRoot(component.representativeId)}
                disabled={isActive}
                className="shrink-0 rounded-lg border border-stone-300 px-3 py-1 text-sm hover:bg-stone-50 disabled:opacity-50"
              >
                View
              </button>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
