import { useEffect, useId, useState } from 'react'
import type { FamilyGraph } from '../../../domain/types'
import type { ConnectionOption, OverwriteChoice } from '../../../domain/valid-connections'
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

  const title =
    offer.kind === 'replace_parent_link'
      ? 'Replace a parent link'
      : offer.kind === 'remove_conflicting_link'
        ? 'Fix conflicting link'
        : 'Complete sibling links'

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

  return (
    <Dialog open={open} title={title} description={description} onClose={onClose}>
      {offer.kind === 'replace_parent_link' && (
        <div className="space-y-3">
          <p className="text-sm text-[var(--text-secondary)]">
            This person already has two parents. Choose which parent link to remove before adding{' '}
            <span className="font-medium text-[var(--text-primary)]">{sourceName}</span> as a parent.
          </p>
          <fieldset className="space-y-2">
            <legend className="sr-only">Parent link to replace</legend>
            {offer.candidates.map((candidate) => {
              const parent = graph?.peopleById.get(candidate.parentId)
              const label = parent ? displayName(parent) : 'Unknown parent'
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
                  <span>Remove {label}</span>
                </label>
              )
            })}
          </fieldset>
        </div>
      )}

      {offer.kind === 'remove_conflicting_link' && (
        <p className="text-sm text-[var(--text-secondary)]">
          {offer.description}. Remove the existing link and create{' '}
          <span className="font-medium text-[var(--text-primary)]">{option.label.toLowerCase()}</span>?
        </p>
      )}

      {offer.kind === 'complete_partial_sibling' && (
        <p className="text-sm text-[var(--text-secondary)]">
          Some sibling parent links already exist. Add only the missing parent links for{' '}
          <span className="font-medium text-[var(--text-primary)]">{sourceName}</span>?
        </p>
      )}

      <div className="mt-5 flex gap-2">
        <Button disabled={busy} onClick={handleConfirm}>
          {busy ? 'Connecting…' : 'Confirm'}
        </Button>
        <Button variant="secondary" disabled={busy} onClick={onClose}>
          Cancel
        </Button>
      </div>
    </Dialog>
  )
}
