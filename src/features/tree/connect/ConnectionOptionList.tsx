import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { FamilyGraph } from '../../../domain/types'
import type {
  ConnectionKind,
  ConnectionOption,
  OverwriteChoice,
} from '../../../domain/valid-connections'
import { isDuplicateConnection } from '../../../domain/valid-connections'
import {
  translateConnectionLabel,
  translateConnectionReason,
} from '../../../i18n/translate-domain'
import { OverwriteDialog } from './OverwriteDialog'

const kindIcon: Record<ConnectionKind, string> = {
  parent: 'M10 15V5m0 0L6 9m4-4l4 4',
  child: 'M10 5v10m0 0l4-4m-4 4l-4-4',
  spouse: 'M4 10h12M7 7l-3 3 3 3M13 7l3 3-3 3',
  sibling: 'M5 6v8M15 6v8M5 10h10',
}

function overwriteLabel(option: ConnectionOption, label: string, t: ReturnType<typeof useTranslation>['t']): string {
  if (!option.overwrite) return label
  switch (option.overwrite.kind) {
    case 'replace_parent_link':
      return t('connect.overwriteReplaceParent', { ns: 'tree', label })
    case 'remove_conflicting_link':
      return t('connect.overwriteFixLink', { ns: 'tree', label })
    case 'complete_partial_sibling':
      return t('connect.overwriteAddMissing', { ns: 'tree', label })
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
  emptyMessage,
}: ConnectionOptionListProps) {
  const { t } = useTranslation(['tree', 'common'])
  const [overwriteOption, setOverwriteOption] = useState<ConnectionOption | null>(null)

  const labelFor = (option: ConnectionOption) =>
    translateConnectionLabel(option.labelKey, option.labelParams, t)

  const reasonFor = (option: ConnectionOption) => {
    const code = option.reasonCode
    return code ? translateConnectionReason(code, t) : null
  }

  const available = options.filter((o) => o.available)
  const overwriteable = options.filter((o) => !o.available && o.overwrite)
  const blocked = options.filter((o) => !o.available && !o.overwrite && !isDuplicateConnection(o))
  const duplicates = options.filter((o) => isDuplicateConnection(o))

  const defaultEmpty = t('connect.noValidConnection', { ns: 'tree' })

  const handleOverwriteConfirm = (option: ConnectionOption, choice: OverwriteChoice) => {
    setOverwriteOption(null)
    onOverwrite(option, choice)
  }

  if (available.length === 0 && overwriteable.length === 0) {
    return (
      <>
        <p className="px-3.5 py-3 text-sm text-[var(--text-secondary)]">
          {emptyMessage ?? defaultEmpty}
        </p>
        {(blocked.length > 0 || duplicates.length > 0) && (
          <ul className="border-t border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3.5 py-2">
            {duplicates.map((option) => (
              <li key={option.kind} className="py-1 text-xs text-[var(--text-muted)]">
                <span className="font-medium">{labelFor(option)}</span>
                <span> — {t('connect.alreadyConnected', { ns: 'tree' })}</span>
              </li>
            ))}
            {blocked.map((option) => (
              <li key={option.kind} className="py-1 text-xs text-[var(--text-muted)]">
                <span className="font-medium">{labelFor(option)}</span>
                {reasonFor(option) && <span> — {reasonFor(option)}</span>}
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
              {labelFor(option)}
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
              {overwriteLabel(option, labelFor(option), t)}
            </button>
          </li>
        ))}
      </ul>

      {(blocked.length > 0 || duplicates.length > 0) && (
        <ul className="border-t border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3.5 py-2">
          {duplicates.map((option) => (
            <li key={option.kind} className="py-1 text-xs text-[var(--text-muted)]">
              <span className="font-medium">{labelFor(option)}</span>
              <span> — {t('connect.alreadyConnected', { ns: 'tree' })}</span>
            </li>
          ))}
          {blocked.map((option) => (
            <li key={option.kind} className="py-1 text-xs text-[var(--text-muted)]">
              <span className="font-medium">{labelFor(option)}</span>
              {reasonFor(option) && <span> — {reasonFor(option)}</span>}
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
