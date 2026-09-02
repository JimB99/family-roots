import type { ReactNode } from 'react'

interface FieldProps {
  label: string
  error?: string | null
  hint?: string
  children: ReactNode
  className?: string
}

export function Field({ label, error, hint, children, className = '' }: FieldProps) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="font-medium text-[var(--text-secondary)]">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint && !error && <p className="mt-1 text-xs text-[var(--text-muted)]">{hint}</p>}
      {error && (
        <p className="mt-1 text-sm text-[var(--color-bloom-600)] dark:text-[var(--color-bloom-400)]" role="alert">
          {error}
        </p>
      )}
    </label>
  )
}

export const inputClass =
  'w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition focus:border-[var(--accent)] focus:outline-none'
