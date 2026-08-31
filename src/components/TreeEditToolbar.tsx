interface TreeEditToolbarProps {
  editMode: boolean
  onToggle: (edit: boolean) => void
  canEdit: boolean
}

export function TreeEditToolbar({ editMode, onToggle, canEdit }: TreeEditToolbarProps) {
  if (!canEdit) return null

  return (
    <div className="border-b border-stone-200 bg-white px-4 py-2 flex flex-wrap items-center justify-between gap-3">
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
      {editMode && (
        <p className="text-sm text-stone-600">
          Click a person to edit. Use <strong>+</strong> on cards to add parent, spouse, or child.
        </p>
      )}
    </div>
  )
}
