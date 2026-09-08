import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { FamilyGraph } from '../../../domain/types'
import type { ConnectionOption, OverwriteChoice } from '../../../domain/valid-connections'
import {
  translateConnectionLabel,
  translateConnectionReason,
} from '../../../i18n/translate-domain'
import { displayName } from '../../../lib/tree'
import { Button } from '../../../components/ui/Button'
import { Dialog } from '../../../components/ui/Dialog'

interface OverwriteDialogProps {
  open: boolean
  option: ConnectionOption | null
  sourceName: string
  targetName: string
  graph: FamilyGraph | null
  busy?: boolean
  onClose: () => void
  onConfirm: (option: ConnectionOption, choice: OverwriteChoice) => void
}

export function OverwriteDialog({
  open,
  option,
  sourceName,
  targetName,
  graph,
  busy = false,
  onClose,
  onConfirm,
}: OverwriteDialogProps) {
  const { t } = useTranslation(['tree', 'common'])
  const groupId = useId()
  const offer = option?.overwrite
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null)

  useEffect(() => {
    if (!open || offer?.kind !== 'replace_parent_link') {
      setSelectedParentId(null)
      return
    }
    setSelectedParentId(offer.candidates[0]?.relationshipId ?? null)
  }, [open, offer])

  if (!option || !offer) return null

  const optionLabel = translateConnectionLabel(option.labelKey, option.labelParams, t)

  const title =
    offer.kind === 'replace_parent_link'
      ? t('overwrite.replaceParentTitle', { ns: 'tree' })
      : offer.kind === 'remove_conflicting_link'
        ? t('overwrite.fixConflictTitle', { ns: 'tree' })
        : t('overwrite.completeSiblingTitle', { ns: 'tree' })

  const description = `${sourceName} → ${targetName}`

  const handleConfirm = () => {
    if (offer.kind === 'replace_parent_link') {
      if (!selectedParentId) return
      onConfirm(option, { kind: 'replace_parent_link', relationshipIdToRemove: selectedParentId })
      return
    }
    if (offer.kind === 'remove_conflicting_link') {
      onConfirm(option, { kind: 'remove_conflicting_link' })
      return
    }
    onConfirm(option, { kind: 'complete_partial_sibling' })
  }

  const conflictDescription =
    offer.kind === 'remove_conflicting_link'
      ? translateConnectionReason(offer.descriptionCode as import('../../../domain/valid-connections').ConnectionBlockReason, t)
      : ''

  return (
    <Dialog open={open} title={title} description={description} onClose={onClose}>
      {offer.kind === 'replace_parent_link' && (
        <div className="space-y-3">
          <p className="text-sm text-[var(--text-secondary)]">
            {t('overwrite.replaceParentBody', { ns: 'tree', name: sourceName })}
          </p>
          <fieldset className="space-y-2">
            <legend className="sr-only">{t('overwrite.replaceParentLegend', { ns: 'tree' })}</legend>
            {offer.candidates.map((candidate) => {
              const parent = graph?.peopleById.get(candidate.parentId)
              const label = parent ? displayName(parent) : t('unknownParent', { ns: 'common' })
              return (
                <label
                  key={candidate.relationshipId}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-sm hover:bg-[var(--surface-sunken)]"
                >
                  <input
                    type="radio"
                    name={groupId}
                    checked={selectedParentId === candidate.relationshipId}
                    onChange={() => setSelectedParentId(candidate.relationshipId)}
                  />
                  <span>{t('overwrite.removeLabel', { ns: 'tree', name: label })}</span>
                </label>
              )
            })}
          </fieldset>
        </div>
      )}

      {offer.kind === 'remove_conflicting_link' && (
        <p className="text-sm text-[var(--text-secondary)]">
          {t('overwrite.fixConflictBody', {
            ns: 'tree',
            description: conflictDescription,
            label: optionLabel.toLowerCase(),
          })}
        </p>
      )}

      {offer.kind === 'complete_partial_sibling' && (
        <p className="text-sm text-[var(--text-secondary)]">
          {t('overwrite.completeSiblingBody', { ns: 'tree', name: sourceName })}
        </p>
      )}

      <div className="mt-5 flex gap-2">
        <Button disabled={busy} onClick={handleConfirm}>
          {busy ? t('actions.connecting', { ns: 'common' }) : t('actions.confirm', { ns: 'common' })}
        </Button>
        <Button variant="secondary" disabled={busy} onClick={onClose}>
          {t('actions.cancel', { ns: 'common' })}
        </Button>
      </div>
    </Dialog>
  )
}
