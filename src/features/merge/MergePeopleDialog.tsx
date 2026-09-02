import { useMemo, useState } from 'react'
import { Dialog } from '../../components/ui/Dialog'
import { Button } from '../../components/ui/Button'
import { buildFamilyGraph } from '../../domain/family-graph'
import { planMergePeople } from '../../domain/commands'
import { executeCommandPlan } from '../../data/firestore/execute-command-plan'
import { formatLifeSpan } from '../../lib/dates'
import { displayName } from '../../lib/tree'
import type { DuplicateCandidate } from '../../domain/duplicate-detection'
import type { Person, PersonInput, Relationship } from '../../types'

interface MergePeopleDialogProps {
  open: boolean
  candidate: DuplicateCandidate | null
  people: Person[]
  relationships: Relationship[]
  familyId: string
  userId: string | null
  onClose: () => void
  onMerged: () => Promise<void>
}

function countLinks(relationships: Relationship[], personId: string): number {
  return relationships.filter((r) => r.personAId === personId || r.personBId === personId).length
}

export function MergePeopleDialog({
  open,
  candidate,
  people,
  relationships,
  familyId,
  userId,
  onClose,
  onMerged,
}: MergePeopleDialogProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pair = useMemo(() => {
    if (!candidate) return null
    const a = people.find((p) => p.id === candidate.personAId)
    const b = people.find((p) => p.id === candidate.personBId)
    if (!a || !b) return null
    return { a, b, candidate }
  }, [candidate, people])

  const merge = async (keep: 'a' | 'b') => {
    if (!pair) return
    const source = keep === 'a' ? pair.b : pair.a
    const target = keep === 'a' ? pair.a : pair.b
    const fieldChoices: Partial<PersonInput> = {
      familyId,
      givenNames: target.givenNames || source.givenNames,
      familyName: target.familyName ?? source.familyName,
      maidenName: target.maidenName ?? source.maidenName,
      gender: target.gender !== 'unknown' ? target.gender : source.gender,
      birth: target.birth ?? source.birth,
      death: target.death ?? source.death,
      birthPlace: target.birthPlace ?? source.birthPlace,
      deathPlace: target.deathPlace ?? source.deathPlace,
      isLiving: target.isLiving ?? source.isLiving,
      photoBase64: target.photoBase64 ?? source.photoBase64,
      notes: [target.notes, source.notes].filter(Boolean).join('\n---\n') || null,
      importKey: target.importKey ?? source.importKey,
    }

    const graph = buildFamilyGraph(familyId, people, relationships)
    const plan = planMergePeople(graph, source.id, target.id, fieldChoices)
    if (plan.errors.length > 0) {
      setError(plan.errors[0].message)
      return
    }

    setBusy(true)
    setError(null)
    try {
      await executeCommandPlan(plan, userId)
      await onMerged()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Merge failed')
    } finally {
      setBusy(false)
    }
  }

  if (!pair) return null

  const options: Array<{ key: 'a' | 'b'; person: Person }> = [
    { key: 'a', person: pair.a },
    { key: 'b', person: pair.b },
  ]

  return (
    <Dialog
      open={open}
      title="Merge duplicate people"
      description="Pick the record to keep. The other one is removed and its connections move across."
      onClose={onClose}
    >
      <div className="space-y-4 text-sm">
        <p className="rounded-lg bg-[var(--surface-sunken)] px-3 py-2 text-[var(--text-secondary)]">
          {pair.candidate.reason}
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          {options.map(({ key, person }) => (
            <div
              key={person.id}
              className="rounded-xl border border-[var(--border-subtle)] p-3.5"
            >
              <p className="font-medium text-[var(--text-primary)]">{displayName(person)}</p>
              <p className="mt-0.5 text-[var(--text-muted)]">
                {formatLifeSpan(person.birth, person.death, person.isLiving) || 'Dates unknown'}
              </p>
              <p className="mt-0.5 text-[var(--text-muted)]">
                {countLinks(relationships, person.id)} connections
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-3 w-full"
                disabled={busy}
                onClick={() => void merge(key)}
              >
                Keep this one
              </Button>
            </div>
          ))}
        </div>

        {error && (
          <p className="text-[var(--color-bloom-600)] dark:text-[var(--color-bloom-400)]" role="alert">
            {error}
          </p>
        )}
      </div>
    </Dialog>
  )
}
