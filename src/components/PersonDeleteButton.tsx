import { useState } from 'react'
import { Button } from './ui/Button'
import { Dialog } from './ui/Dialog'
import { displayName } from '../lib/tree'
import type { Person } from '../types'

interface PersonDeleteButtonProps {
  person: Person
  relationshipCount: number
  onDelete: () => Promise<void>
}

export function PersonDeleteButton({ person, relationshipCount, onDelete }: PersonDeleteButtonProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const handleDelete = async () => {
    setDeleteError(null)
    try {
      await onDelete()
      setConfirmOpen(false)
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  return (
    <>
      <Button variant="danger" className="w-full" size="sm" onClick={() => setConfirmOpen(true)}>
        Delete person
      </Button>

      <Dialog
        open={confirmOpen}
        title="Delete person"
        description="This cannot be undone."
        onClose={() => setConfirmOpen(false)}
      >
        <p className="text-sm text-[var(--text-secondary)]">
          Delete {displayName(person)} and {relationshipCount} connected relationship
          {relationshipCount === 1 ? '' : 's'}?
        </p>
        {deleteError && (
          <p className="mt-2 text-sm text-[var(--color-bloom-600)]" role="alert">
            {deleteError}
          </p>
        )}
        <div className="mt-5 flex gap-2">
          <Button variant="danger" onClick={() => void handleDelete()}>
            Delete person
          </Button>
          <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
            Cancel
          </Button>
        </div>
      </Dialog>
    </>
  )
}
