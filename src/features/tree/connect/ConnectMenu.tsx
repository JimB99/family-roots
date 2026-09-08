import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { FamilyGraph } from '../../../domain/types'
import type { ConnectionOption, OverwriteChoice } from '../../../domain/valid-connections'
import { ConnectionOptionList } from './ConnectionOptionList'

export interface ConnectMenuState {
  sourceId: string
  targetId: string
  sourceName: string
  targetName: string
  x: number
  y: number
  options: ConnectionOption[]
}

interface ConnectMenuProps {
  state: ConnectMenuState
  graph: FamilyGraph | null
  busy: boolean
  onChoose: (option: ConnectionOption) => void
  onOverwrite: (option: ConnectionOption, choice: OverwriteChoice) => void
  onClose: () => void
}

export function ConnectMenu({
  state,
  graph,
  busy,
  onChoose,
  onOverwrite,
  onClose,
}: ConnectMenuProps) {
  const { t } = useTranslation(['tree'])
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current?.contains(e.target as Node)) return
      onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    // Defer so the same pointer sequence that opened the menu cannot dismiss it first.
    const dismissTimer = window.setTimeout(() => {
      window.addEventListener('pointerdown', onPointerDown)
    }, 0)
    return () => {
      window.clearTimeout(dismissTimer)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('pointerdown', onPointerDown)
    }
  }, [onClose])

  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>('button:not([disabled])')?.focus()
  }, [])

  const hasActions = state.options.some((o) => o.available || o.overwrite)

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={t('connect.dialogAria', {
        source: state.sourceName,
        target: state.targetName,
      })}
      className="absolute z-30 w-72 overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-overlay)] shadow-2xl"
      style={{
        left: Math.max(8, state.x - 144),
        top: state.y + 12,
      }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="border-b border-[var(--border-subtle)] px-3.5 py-2.5">
        <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
          {t('connect.connectHeader')}
        </p>
        <p className="mt-0.5 truncate text-sm font-medium text-[var(--text-primary)]">
          {t('connect.isLabel', { source: state.sourceName })}
        </p>
      </div>

      <ConnectionOptionList
        sourceName={state.sourceName}
        targetName={state.targetName}
        graph={graph}
        options={state.options}
        busy={busy}
        onChoose={onChoose}
        onOverwrite={onOverwrite}
        emptyMessage={hasActions ? undefined : t('connect.noValidConnection')}
      />
    </div>
  )
}
