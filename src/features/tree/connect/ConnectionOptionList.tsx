import { useState } from 'react'
import type { FamilyGraph } from '../../../domain/types'
import type {
  ConnectionKind,
  ConnectionOption,
  OverwriteChoice,
} from '../../../domain/valid-connections'
import { OverwriteDialog } from './OverwriteDialog'

const kindIcon: Record<ConnectionKind, string> = {
  parent: 'M10 15V5m0 0L6 9m4-4l4 4',
  child: 'M10 5v10m0 0l4-4m-4 4l-4-4',
  spouse: 'M4 10h12M7 7l-3 3 3 3M13 7l3 3-3 3',
  sibling: 'M5 6v8M15 6v8M5 10h10',
}

function isAlreadyConnected(option: ConnectionOption): boolean {
  return !option.available && !option.overwrite && Boolean(option.reason?.match(/already exists/i))
}

function overwriteLabel(option: ConnectionOption): string {
  if (!option.overwrite) return option.label
  switch (option.overwrite.kind) {
    case 'replace_parent_link':
      return `Replace a parent… (${option.label})`
    case 'remove_conflicting_link':
      return `Fix link… (${option.label})`
    case 'complete_partial_sibling':
      return `Add missing links… (${option.label})`
  }
}

interface ConnectionOptionListProps {
  sourceName: string
  targetName: string
  graph: FamilyGraph | null
  options: ConnectionOption[]
  busy?: boolean
  onChoose: (option: ConnectionOption) => void
  onOverwrite: (option: ConnectionOption, choice: OverwriteChoice) => void
  emptyMessage?: string
}

export function ConnectionOptionList({
  sourceName,
  targetName,
  graph,
  options,
  busy = false,
  onChoose,
  onOverwrite,
  emptyMessage = 'No valid connection between these two people.',
}: ConnectionOptionListProps) {
  const [overwriteOption, setOverwriteOption] = useState<ConnectionOption | null>(null)

  const available = options.filter((o) => o.available)
  const overwriteable = options.filter((o) => !o.available && o.overwrite)
  const blocked = options.filter((o) => !o.available && !o.overwrite && !isAlreadyConnected(o))
  const duplicates = options.filter((o) => isAlreadyConnected(o))

  const handleOverwriteConfirm = (option: ConnectionOption, choice: OverwriteChoice) => {
    setOverwriteOption(null)
    onOverwrite(option, choice)
  }

  if (available.length === 0 && overwriteable.length === 0) {
    return (
      <>
        <p className="px-3.5 py-3 text-sm text-[var(--text-secondary)]">{emptyMessage}</p>
        {(blocked.length > 0 || duplicates.length > 0) && (
          <ul className="border-t border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3.5 py-2">
            {duplicates.map((option) => (
              <li key={option.kind} className="py-1 text-xs text-[var(--text-muted)]">
                <span className="font-medium">{option.label}</span>
                <span> — Already connected</span>
              </li>
            ))}
            {blocked.map((option) => (
              <li key={option.kind} className="py-1 text-xs text-[var(--text-muted)]">
                <span className="font-medium">{option.label}</span>
                {option.reason && <span> — {option.reason}</span>}
              </li>
            ))}
          </ul>
        )}
      </>
    )
  }

  return (
    <>
      <ul className="py-1">
        {available.map((option) => (
          <li key={option.kind}>
            <button
              type="button"
              disabled={busy}
              onClick={() => onChoose(option)}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-[var(--text-primary)] transition hover:bg-[var(--accent-soft)] disabled:opacity-50"
            >
              <OptionIcon kind={option.kind} />
              {option.label}
            </button>
          </li>
        ))}
        {overwriteable.map((option) => (
          <li key={option.kind}>
            <button
              type="button"
              disabled={busy}
              onClick={() => setOverwriteOption(option)}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-[var(--color-bloom-600)] transition hover:bg-[var(--surface-sunken)] disabled:opacity-50 dark:text-[var(--color-bloom-400)]"
            >
              <OptionIcon kind={option.kind} muted />
              {overwriteLabel(option)}
            </button>
          </li>
        ))}
      </ul>

      {(blocked.length > 0 || duplicates.length > 0) && (
        <ul className="border-t border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3.5 py-2">
          {duplicates.map((option) => (
            <li key={option.kind} className="py-1 text-xs text-[var(--text-muted)]">
              <span className="font-medium">{option.label}</span>
              <span> — Already connected</span>
            </li>
          ))}
          {blocked.map((option) => (
            <li key={option.kind} className="py-1 text-xs text-[var(--text-muted)]">
              <span className="font-medium">{option.label}</span>
              {option.reason && <span> — {option.reason}</span>}
            </li>
          ))}
        </ul>
      )}

      <OverwriteDialog
        open={overwriteOption !== null}
        option={overwriteOption}
        sourceName={sourceName}
        targetName={targetName}
        graph={graph}
        busy={busy}
        onClose={() => setOverwriteOption(null)}
        onConfirm={handleOverwriteConfirm}
      />
    </>
  )
}

function OptionIcon({ kind, muted = false }: { kind: ConnectionKind; muted?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d={kindIcon[kind]}
        stroke={muted ? 'var(--text-muted)' : 'var(--accent)'}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
