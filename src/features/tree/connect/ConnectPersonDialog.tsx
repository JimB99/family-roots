import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { FamilyGraph } from '../../../domain/types'
import {
  getConnectionOptions,
  type ConnectionOption,
  type OverwriteChoice,
} from '../../../domain/valid-connections'
import { filterPeopleByQuery } from '../../../lib/person-search'
import { displayName } from '../../../lib/tree'
import { formatPartialDate } from '../../../lib/dates'
import type { Person } from '../../../types'
import { Button } from '../../../components/ui/Button'
import { Dialog } from '../../../components/ui/Dialog'
import { ConnectionOptionList } from './ConnectionOptionList'

interface ConnectPersonDialogProps {
  open: boolean
  anchor: Person | null
  people: Person[]
  graph: FamilyGraph | null
  busy?: boolean
  onClose: () => void
  onConnect: (
    sourceId: string,
    targetId: string,
    option: ConnectionOption,
    overwriteChoice?: OverwriteChoice,
  ) => Promise<void>
}

export function ConnectPersonDialog({
  open,
  anchor,
  people,
  graph,
  busy = false,
  onClose,
  onConnect,
}: ConnectPersonDialogProps) {
  const { t, i18n } = useTranslation(['tree', 'common'])
  const [query, setQuery] = useState('')
  const [target, setTarget] = useState<Person | null>(null)

  useEffect(() => {
    if (!open) {
      setQuery('')
      setTarget(null)
    }
  }, [open])

  const results = useMemo(() => {
    if (!anchor) return []
    return filterPeopleByQuery(
      people.filter((person) => person.id !== anchor.id),
      query,
      8,
    )
  }, [anchor, people, query])

  const options = useMemo(() => {
    if (!graph || !anchor || !target) return []
    return getConnectionOptions(graph, anchor.id, target.id, displayName(target))
  }, [graph, anchor, target])

  if (!anchor) return null

  const anchorName = displayName(anchor)
  const locale = i18n.language

  const handleChoose = async (option: ConnectionOption) => {
    if (!target) return
    await onConnect(anchor.id, target.id, option)
    onClose()
  }

  const handleOverwrite = async (option: ConnectionOption, choice: OverwriteChoice) => {
    if (!target) return
    await onConnect(anchor.id, target.id, option, choice)
    onClose()
  }

  return (
    <Dialog
      open={open}
      title={t('connect.title', { ns: 'tree' })}
      description={t('connect.startingFrom', { ns: 'tree', name: anchorName })}
      onClose={onClose}
      wide
    >
      {!target ? (
        <div className="space-y-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('connect.searchPlaceholder', { ns: 'tree' })}
            aria-label={t('connect.searchAria', { ns: 'tree' })}
            autoFocus
            className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
          />
          {query.trim() && results.length === 0 && (
            <p className="text-sm text-[var(--text-muted)]">{t('empty.noMatches', { ns: 'common' })}</p>
          )}
          {results.length > 0 && (
            <ul className="max-h-64 overflow-y-auto rounded-lg border border-[var(--border-subtle)]">
              {results.map((person) => (
                <li key={person.id}>
                  <button
                    type="button"
                    onClick={() => setTarget(person)}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition hover:bg-[var(--surface-sunken)]"
                  >
                    <span className="truncate font-medium text-[var(--text-primary)]">
                      {displayName(person)}
                    </span>
                    {formatPartialDate(person.birth, locale) && (
                      <span className="shrink-0 text-[var(--text-muted)]">
                        {formatPartialDate(person.birth, locale)}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 rounded-lg bg-[var(--surface-sunken)] px-3 py-2">
            <p className="text-sm text-[var(--text-secondary)]">
              <span className="font-medium text-[var(--text-primary)]">{anchorName}</span>
              {' → '}
              <span className="font-medium text-[var(--text-primary)]">{displayName(target)}</span>
            </p>
            <Button variant="ghost" size="sm" onClick={() => setTarget(null)}>
              {t('actions.change', { ns: 'common' })}
            </Button>
          </div>
          <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
            {t('connect.isLabel', { ns: 'tree', source: anchorName })}
          </p>
          <div className="overflow-hidden rounded-xl border border-[var(--border-subtle)]">
            <ConnectionOptionList
              sourceName={anchorName}
              targetName={displayName(target)}
              graph={graph}
              options={options}
              busy={busy}
              onChoose={(option) => void handleChoose(option)}
              onOverwrite={(option, choice) => void handleOverwrite(option, choice)}
            />
          </div>
        </div>
      )}

      <div className="mt-5">
        <Button variant="secondary" onClick={onClose}>
          {t('actions.cancel', { ns: 'common' })}
        </Button>
      </div>
    </Dialog>
  )
}
