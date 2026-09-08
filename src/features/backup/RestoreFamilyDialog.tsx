import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog } from '../../components/ui/Dialog'
import { Button } from '../../components/ui/Button'
import { validateFamilyBackup, type FamilyBackup } from './family-backup-schema'
import { restoreFamilyBackup, type RestoreMode } from './restore-family-backup'
import { translateBackupError } from '../../i18n/translate-domain'

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
  const { t, i18n } = useTranslation(['tree', 'common'])
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
        setError(translateBackupError(result.error, t))
        return
      }
      if (result.backup.family.id !== familyId) {
        setError(t('backup.wrongFamily', { ns: 'tree' }))
        return
      }
      setPreview(result.backup)
    } catch {
      setError(t('backup.invalidFile', { ns: 'tree' }))
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
      setError(err instanceof Error ? err.message : t('mutation.restoreFailed', { ns: 'tree' }))
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
      title={t('backup.title', { ns: 'tree' })}
      description={t('backup.description', { ns: 'tree' })}
      onClose={close}
    >
      <div className="space-y-4 text-sm">
        <input
          type="file"
          accept="application/json"
          aria-label={t('backup.fileAria', { ns: 'tree' })}
          onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-[var(--text-secondary)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--surface-sunken)] file:px-3 file:py-1.5 file:text-sm file:text-[var(--text-primary)]"
        />

        {preview && (
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] p-3">
            <p className="font-medium text-[var(--text-primary)]">
              {t('backup.summary', {
                ns: 'tree',
                people: preview.people.length,
                connections: preview.relationships.length,
              })}
            </p>
            <p className="mt-1 text-[var(--text-muted)]">
              {t('backup.exportedAt', {
                ns: 'tree',
                date: new Date(preview.exportedAt).toLocaleString(i18n.language),
              })}
            </p>
          </div>
        )}

        <fieldset className="space-y-2">
          <legend className="font-medium text-[var(--text-primary)]">
            {t('backup.howApplied', { ns: 'tree' })}
          </legend>
          <label className="flex items-start gap-2.5">
            <input
              type="radio"
              className="mt-1"
              checked={mode === 'merge'}
              onChange={() => setMode('merge')}
            />
            <span>
              <span className="block text-[var(--text-primary)]">{t('backup.mergeTitle', { ns: 'tree' })}</span>
              <span className="text-[var(--text-muted)]">{t('backup.mergeDescription', { ns: 'tree' })}</span>
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
              <span className="block text-[var(--text-primary)]">{t('backup.replaceTitle', { ns: 'tree' })}</span>
              <span className="text-[var(--text-muted)]">{t('backup.replaceDescription', { ns: 'tree' })}</span>
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
            {busy
              ? t('actions.restoring', { ns: 'common' })
              : mode === 'replace'
                ? t('backup.replaceButton', { ns: 'tree' })
                : t('backup.mergeButton', { ns: 'tree' })}
          </Button>
          <Button variant="secondary" onClick={close}>
            {t('actions.cancel', { ns: 'common' })}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
