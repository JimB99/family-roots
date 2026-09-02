import { useEffect, useRef } from 'react'
import type { ConnectionKind, ConnectionOption } from '../../../domain/valid-connections'

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
  busy: boolean
  onChoose: (option: ConnectionOption) => void
  onClose: () => void
}

const kindIcon: Record<ConnectionKind, string> = {
  parent: 'M10 15V5m0 0L6 9m4-4l4 4',
  child: 'M10 5v10m0 0l4-4m-4 4l-4-4',
  spouse: 'M4 10h12M7 7l-3 3 3 3M13 7l3 3-3 3',
  sibling: 'M5 6v8M15 6v8M5 10h10',
}

export function ConnectMenu({ state, busy, onChoose, onClose }: ConnectMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('pointerdown', onPointerDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('pointerdown', onPointerDown)
    }
  }, [onClose])

  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>('button:not([disabled])')?.focus()
  }, [])

  const available = state.options.filter((o) => o.available)
  const blocked = state.options.filter((o) => !o.available)

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={`Connect ${state.sourceName} to ${state.targetName}`}
      className="absolute z-30 w-72 overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-overlay)] shadow-2xl"
      style={{
        left: Math.max(8, state.x - 144),
        top: state.y + 12,
      }}
    >
      <div className="border-b border-[var(--border-subtle)] px-3.5 py-2.5">
        <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Connect</p>
        <p className="mt-0.5 truncate text-sm font-medium text-[var(--text-primary)]">
          {state.sourceName} is…
        </p>
      </div>

      {available.length === 0 ? (
        <p className="px-3.5 py-3 text-sm text-[var(--text-secondary)]">
          No valid connection between these two people.
        </p>
      ) : (
        <ul className="py-1">
          {available.map((option) => (
            <li key={option.kind}>
              <button
                type="button"
                disabled={busy}
                onClick={() => onChoose(option)}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-[var(--text-primary)] transition hover:bg-[var(--accent-soft)] disabled:opacity-50"
              >
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path
                    d={kindIcon[option.kind]}
                    stroke="var(--accent)"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}

      {blocked.length > 0 && (
        <ul className="border-t border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3.5 py-2">
          {blocked.map((option) => (
            <li key={option.kind} className="py-1 text-xs text-[var(--text-muted)]">
              <span className="font-medium">{option.label}</span>
              {option.reason && <span> — {option.reason}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
