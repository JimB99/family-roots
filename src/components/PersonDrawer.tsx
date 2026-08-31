import { Link } from 'react-router-dom'
import { PersonForm } from './PersonForm'
import { displayName } from '../lib/tree'
import type { Person, PersonInput } from '../types'

interface PersonDrawerProps {
  person: Person | null
  slug: string
  familyId: string
  open: boolean
  onClose: () => void
  onSave: (input: PersonInput) => Promise<void>
  onDelete?: () => Promise<void>
}

export function PersonDrawer({
  person,
  slug,
  familyId,
  open,
  onClose,
  onSave,
  onDelete,
}: PersonDrawerProps) {
  if (!open || !person) return null

  return (
    <div className="fixed inset-0 z-30 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/30"
        aria-label="Close"
        onClick={onClose}
      />
      <aside className="relative w-full max-w-md bg-white shadow-xl h-full overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-stone-200 px-4 py-3 flex items-center justify-between">
          <h2 className="font-semibold">{displayName(person)}</h2>
          <button type="button" onClick={onClose} className="text-stone-500 hover:text-stone-800">
            Close
          </button>
        </div>
        <div className="p-4 space-y-4">
          <Link
            to={`/families/${slug}/person/${person.id}`}
            className="text-sm text-amber-800 hover:underline"
          >
            Open full profile
          </Link>
          <PersonForm initial={person} familyId={familyId} onSubmit={onSave} onCancel={onClose} />
          {onDelete && (
            <button
              type="button"
              onClick={() => void onDelete()}
              className="text-sm text-red-700 hover:underline"
            >
              Delete person
            </button>
          )}
        </div>
      </aside>
    </div>
  )
}
