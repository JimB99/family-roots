import type { FamilyChartApi } from './FamilyTree'

interface TreeEditToolbarProps {
  editMode: boolean
  onToggle: (edit: boolean) => void
  canEdit: boolean
  chartApi: FamilyChartApi | null
}

export function TreeEditToolbar({ editMode, onToggle, canEdit, chartApi }: TreeEditToolbarProps) {
  if (!canEdit) return null

  return (
    <div className="border-b border-stone-200 bg-white px-4 py-2 flex flex-wrap items-center justify-between gap-3 shrink-0">
      <div className="flex rounded-lg border border-stone-300 overflow-hidden text-sm">
        <button
          type="button"
          onClick={() => onToggle(false)}
          className={`px-4 py-1.5 ${!editMode ? 'bg-amber-800 text-white' : 'bg-white text-stone-700 hover:bg-stone-50'}`}
        >
          View
        </button>
        <button
          type="button"
          onClick={() => onToggle(true)}
          className={`px-4 py-1.5 ${editMode ? 'bg-amber-800 text-white' : 'bg-white text-stone-700 hover:bg-stone-50'}`}
        >
          Edit
        </button>
      </div>
      {editMode ? (
        <div className="flex flex-wrap items-center gap-3 text-sm text-stone-600">
          <p>
            Click a person to add relatives. Drag cards to reposition. Click lines to convert to
            marriage. Use the pencil on a card to edit details.
          </p>
          <button
            type="button"
            onClick={() => chartApi?.addPerson()}
            className="shrink-0 rounded-lg bg-amber-800 text-white px-3 py-1.5 hover:bg-amber-900"
          >
            + Add person
          </button>
        </div>
      ) : (
        <p className="text-sm text-stone-500">
          Switch to Edit to add people and connect relatives on the tree.
        </p>
      )}
    </div>
  )
}
