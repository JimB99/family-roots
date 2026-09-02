import { useEffect, useId, type ReactNode } from 'react'

interface SheetProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

export function Sheet({ open, title, onClose, children }: SheetProps) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  const titleId = useId()

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-stretch sm:justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        aria-label="Close panel"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative max-h-[85svh] w-full overflow-y-auto rounded-t-2xl bg-[var(--surface-raised)] shadow-2xl sm:max-h-none sm:max-w-md sm:rounded-none sm:rounded-l-2xl"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-raised)] px-4 py-3">
          <h2 id={titleId} className="font-semibold">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="rounded-lg p-1.5 text-[var(--text-muted)] transition hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M5 5l10 10M15 5L5 15"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <div className="p-4">{children}</div>
      </aside>
    </div>
  )
}
