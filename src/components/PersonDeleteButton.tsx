import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation(['person', 'common', 'tree'])
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const handleDelete = async () => {
    setDeleteError(null)
    try {
      await onDelete()
      setConfirmOpen(false)
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : t('mutation.deleteFailed', { ns: 'tree' }))
    }
  }

  return (
    <>
      <Button variant="danger" className="w-full" size="sm" onClick={() => setConfirmOpen(true)}>
        {t('profile.deletePerson', { ns: 'person' })}
      </Button>

      <Dialog
        open={confirmOpen}
        title={t('profile.deleteTitle', { ns: 'person' })}
        description={t('profile.deleteDescription', { ns: 'person' })}
        onClose={() => setConfirmOpen(false)}
      >
        <p className="text-sm text-[var(--text-secondary)]">
          {t('profile.deleteConfirm', {
            ns: 'person',
            name: displayName(person),
            count: relationshipCount,
          })}
        </p>
        {deleteError && (
          <p className="mt-2 text-sm text-[var(--color-bloom-600)]" role="alert">
            {deleteError}
          </p>
        )}
        <div className="mt-5 flex gap-2">
          <Button variant="danger" onClick={() => void handleDelete()}>
            {t('profile.deletePerson', { ns: 'person' })}
          </Button>
          <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
            {t('actions.cancel', { ns: 'common' })}
          </Button>
        </div>
      </Dialog>
    </>
  )
}
