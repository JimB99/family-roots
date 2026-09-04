import { Button } from './ui/Button'
import { Dialog } from './ui/Dialog'

interface UnsavedChangesDialogProps {
  open: boolean
  count: number
  busy?: boolean
  onStay: () => void
  onDiscard: () => void
  onSave: () => void
}

export function UnsavedChangesDialog({
  open,
  count,
  busy = false,
  onStay,
  onDiscard,
  onSave,
}: UnsavedChangesDialogProps) {
  const label =
    count === 1 ? '1 person has unsaved changes' : `${count} people have unsaved changes`

  return (
    <Dialog open={open} title="Unsaved changes" description={label} onClose={onStay}>
      <p className="text-sm text-[var(--text-secondary)]">
        Save your edits before leaving, or discard them.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button disabled={busy} onClick={onSave}>
          {busy ? 'Saving…' : 'Save changes'}
        </Button>
        <Button variant="danger" disabled={busy} onClick={onDiscard}>
          Discard changes
        </Button>
        <Button variant="secondary" disabled={busy} onClick={onStay}>
          Keep editing
        </Button>
      </div>
    </Dialog>
  )
}
