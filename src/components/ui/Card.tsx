import type { ReactNode } from 'react'

interface CardProps {
  title?: string
  description?: string
  actions?: ReactNode
  children?: ReactNode
  className?: string
}

export function Card({ title, description, actions, children, className = '' }: CardProps) {
  return (
    <section
      className={`rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-5 ${className}`}
    >
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <h2 className="font-medium text-[var(--text-primary)]">{title}</h2>}
            {description && (
              <p className="mt-1 text-sm text-[var(--text-secondary)]">{description}</p>
            )}
          </div>
          {actions}
        </div>
      )}
      {children && <div className={title || actions ? 'mt-4' : ''}>{children}</div>}
    </section>
  )
}
