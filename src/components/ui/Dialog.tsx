import { useEffect, useId, useRef, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

interface DialogProps {
  open: boolean
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
  /** Wider panel for forms (e.g. person edit). */
  wide?: boolean
}

export function Dialog({ open, title, description, onClose, children, wide = false }: DialogProps) {
  const { t } = useTranslation('common')
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onCancel = (e: Event) => {
      e.preventDefault()
      onClose()
    }
    el.addEventListener('cancel', onCancel)
    return () => el.removeEventListener('cancel', onCancel)
  }, [onClose])

  return (
    <dialog
      ref={ref}
      className={`w-[calc(100%-2rem)] rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-overlay)] p-0 text-[var(--text-primary)] shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm ${wide ? 'max-w-2xl' : 'max-w-lg'}`}
      aria-labelledby={titleId}
    >
      <div className="flex items-start justify-between gap-3 border-b border-[var(--border-subtle)] px-5 py-4">
        <div>
          <h2 id={titleId} className="font-semibold">
            {title}
          </h2>
          {description && <p className="mt-0.5 text-sm text-[var(--text-secondary)]">{description}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('closeDialog')}
          className="-mr-1 rounded-lg p-1.5 text-[var(--text-muted)] transition hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]"
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
      <div className="px-5 py-4">{children}</div>
    </dialog>
  )
}
