import { useState } from 'react'
import { Dialog } from '../../components/ui/Dialog'
import { Button } from '../../components/ui/Button'
import { validateFamilyBackup, type FamilyBackup } from './family-backup-schema'
import { restoreFamilyBackup, type RestoreMode } from './restore-family-backup'

interface RestoreFamilyDialogProps {
  open: boolean
  familyId: string
  userId: string | null
  onClose: () => void
  onRestored: () => Promise<void>
}

export function RestoreFamilyDialog({
  open,
  familyId,
  userId,
  onClose,
  onRestored,
}: RestoreFamilyDialogProps) {
  const [mode, setMode] = useState<RestoreMode>('merge')
  const [preview, setPreview] = useState<FamilyBackup | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const onFile = async (file: File | null) => {
    setError(null)
    setPreview(null)
    if (!file) return
    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as unknown
      const result = validateFamilyBackup(parsed)
      if (!result.ok) {
        setError(result.error)
        return
      }
      if (result.backup.family.id !== familyId) {
        setError('This backup belongs to a different family.')
        return
      }
      setPreview(result.backup)
    } catch {
      setError('That file could not be read as a backup.')
    }
  }

  const restore = async () => {
    if (!preview) return
    setBusy(true)
    setError(null)
    try {
      await restoreFamilyBackup(preview, mode, userId)
      await onRestored()
      onClose()
      setPreview(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Restore failed')
    } finally {
      setBusy(false)
    }
  }

  const close = () => {
    setPreview(null)
    setError(null)
    onClose()
  }

  return (
    <Dialog
      open={open}
      title="Restore a backup"
      description="Upload a JSON backup exported from this family."
      onClose={close}
    >
      <div className="space-y-4 text-sm">
        <input
          type="file"
          accept="application/json"
          aria-label="Backup file"
          onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-[var(--text-secondary)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--surface-sunken)] file:px-3 file:py-1.5 file:text-sm file:text-[var(--text-primary)]"
        />

        {preview && (
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] p-3">
            <p className="font-medium text-[var(--text-primary)]">
              {preview.people.length} people, {preview.relationships.length} connections
            </p>
            <p className="mt-1 text-[var(--text-muted)]">
              Exported {new Date(preview.exportedAt).toLocaleString()}
            </p>
          </div>
        )}

        <fieldset className="space-y-2">
          <legend className="font-medium text-[var(--text-primary)]">How should it be applied?</legend>
          <label className="flex items-start gap-2.5">
            <input
              type="radio"
              className="mt-1"
              checked={mode === 'merge'}
              onChange={() => setMode('merge')}
            />
            <span>
              <span className="block text-[var(--text-primary)]">Merge</span>
              <span className="text-[var(--text-muted)]">
                Update people that already exist and add the rest.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2.5">
            <input
              type="radio"
              className="mt-1"
              checked={mode === 'replace'}
              onChange={() => setMode('replace')}
            />
            <span>
              <span className="block text-[var(--text-primary)]">Replace everything</span>
              <span className="text-[var(--text-muted)]">
                Delete all current people and connections first. This cannot be undone.
              </span>
            </span>
          </label>
        </fieldset>

        {error && (
          <p className="text-[var(--color-bloom-600)] dark:text-[var(--color-bloom-400)]" role="alert">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <Button
            variant={mode === 'replace' ? 'danger' : 'primary'}
            disabled={!preview || busy}
            onClick={() => void restore()}
          >
            {busy ? 'Restoring…' : mode === 'replace' ? 'Replace and restore' : 'Merge backup'}
          </Button>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
