import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation(['tree', 'common'])
  const label =
    count === 1
      ? t('unsaved.onePerson', { ns: 'tree' })
      : t('unsaved.manyPeople', { ns: 'tree', count })

  return (
    <Dialog open={open} title={t('unsaved.title', { ns: 'tree' })} description={label} onClose={onStay}>
      <p className="text-sm text-[var(--text-secondary)]">
        {t('unsaved.body', { ns: 'tree' })}
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button disabled={busy} onClick={onSave}>
          {busy ? t('actions.saving', { ns: 'common' }) : t('actions.saveChanges', { ns: 'common' })}
        </Button>
        <Button variant="danger" disabled={busy} onClick={onDiscard}>
          {t('unsaved.discardChanges', { ns: 'tree' })}
        </Button>
        <Button variant="secondary" disabled={busy} onClick={onStay}>
          {t('actions.keepEditing', { ns: 'common' })}
        </Button>
      </div>
    </Dialog>
  )
}
