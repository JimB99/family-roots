import { useMemo, useState } from 'react'
import {
  explainRelationship,
  targetGender,
} from '../../../domain/kinship/explain-relationship'
import { formatKinshipLabel } from '../../../domain/kinship/kinship-labels-en'
import type { FamilyGraph } from '../../../domain/types'
import { filterPeopleByQuery } from '../../../lib/person-search'
import { displayName } from '../../../lib/tree'
import { formatPartialDate } from '../../../lib/dates'
import type { Person } from '../../../types'
import { Button } from '../../../components/ui/Button'
import { Dialog } from '../../../components/ui/Dialog'

interface ExplainRelationshipDialogProps {
  open: boolean
  anchor: Person | null
  targetId: string | null
  people: Person[]
  graph: FamilyGraph | null
  onTargetChange: (targetId: string | null) => void
  onClose: () => void
  onSelectPerson?: (personId: string) => void
}

export function ExplainRelationshipDialog({
  open,
  anchor,
  targetId,
  people,
  graph,
  onTargetChange,
  onClose,
  onSelectPerson,
}: ExplainRelationshipDialogProps) {
  const [query, setQuery] = useState('')

  const target = useMemo(
    () => (targetId ? people.find((person) => person.id === targetId) ?? null : null),
    [people, targetId],
  )

  const results = useMemo(() => {
    if (!anchor) return []
    return filterPeopleByQuery(
      people.filter((person) => person.id !== anchor.id),
      query,
      8,
    )
  }, [anchor, people, query])

  const explanation = useMemo(() => {
    if (!graph || !anchor || !target) return null
    return explainRelationship(graph, anchor.id, target.id)
  }, [graph, anchor, target])

  if (!anchor) return null

  const anchorName = displayName(anchor)

  const targetLabel =
    explanation && graph && target
      ? formatKinshipLabel(explanation.fromTo, targetGender(graph, target.id))
      : null
  const anchorLabel =
    explanation && graph
      ? formatKinshipLabel(explanation.toFrom, targetGender(graph, anchor.id))
      : null

  const handleClose = () => {
    setQuery('')
    onClose()
  }

  const handleChangeTarget = () => {
    setQuery('')
    onTargetChange(null)
  }

  return (
    <Dialog
      open={open}
      title="Explain relationship"
      description={
        target
          ? `Relationship between ${anchorName} and ${displayName(target)}`
          : `Search for someone to compare with ${anchorName}, or click a person on the tree.`
      }
      onClose={handleClose}
      wide
    >
      {!target ? (
        <div className="space-y-3">
          <p className="text-sm text-[var(--text-secondary)]">
            Click another person on the tree, or search below.
          </p>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or place…"
            aria-label="Search people to compare"
            autoFocus
            className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
          />
          {query.trim() && results.length === 0 && (
            <p className="text-sm text-[var(--text-muted)]">No matches.</p>
          )}
          {results.length > 0 && (
            <ul className="max-h-64 overflow-y-auto rounded-lg border border-[var(--border-subtle)]">
              {results.map((person) => (
                <li key={person.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('')
                      onTargetChange(person.id)
                    }}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition hover:bg-[var(--surface-sunken)]"
                  >
                    <span className="truncate font-medium text-[var(--text-primary)]">
                      {displayName(person)}
                    </span>
                    {formatPartialDate(person.birth) && (
                      <span className="shrink-0 text-[var(--text-muted)]">
                        {formatPartialDate(person.birth)}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-lg bg-[var(--surface-sunken)] px-3 py-2">
            <p className="text-sm text-[var(--text-secondary)]">
              <span className="font-medium text-[var(--text-primary)]">{anchorName}</span>
              {' ↔ '}
              <span className="font-medium text-[var(--text-primary)]">{displayName(target)}</span>
            </p>
            <Button variant="ghost" size="sm" onClick={handleChangeTarget}>
              Change
            </Button>
          </div>

          {explanation && targetLabel && anchorLabel && (
            <div className="space-y-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)]/40 p-4">
              <p className="text-sm text-[var(--text-primary)]">
                <span className="font-semibold">{displayName(target)}</span>
                {' is '}
                <span className="font-semibold">{anchorName}</span>
                {"'s "}
                <span className="font-semibold text-[var(--accent-strong)]">{targetLabel}</span>
              </p>
              <p className="text-sm text-[var(--text-primary)]">
                <span className="font-semibold">{anchorName}</span>
                {' is '}
                <span className="font-semibold">{displayName(target)}</span>
                {"'s "}
                <span className="font-semibold text-[var(--accent-strong)]">{anchorLabel}</span>
              </p>
              {explanation.fromTo.category === 'cousin' && (
                <p className="text-xs text-[var(--text-muted)]">
                  {formatKinshipLabel(explanation.fromTo, 'unknown')}
                </p>
              )}
              {explanation.alternates && explanation.alternates.length > 0 && (
                <p className="text-xs text-[var(--text-muted)]">
                  Also related as{' '}
                  {explanation.alternates
                    .map((alt) => formatKinshipLabel(alt, targetGender(graph!, target.id)))
                    .join(', ')}
                </p>
              )}
            </div>
          )}

          {onSelectPerson && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                onSelectPerson(target.id)
                handleClose()
              }}
            >
              Select {displayName(target)} on tree
            </Button>
          )}
        </div>
      )}

      <div className="mt-5">
        <Button variant="secondary" onClick={handleClose}>
          Close
        </Button>
      </div>
    </Dialog>
  )
}
