import type { ReactNode } from 'react'
import { TreeMark } from './TreeMark'

interface EmptyStateProps {
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="px-4 py-14 text-center">
      <TreeMark className="mx-auto mb-4 h-12 w-12 text-[var(--accent)] opacity-70" />
      <h3 className="font-medium text-[var(--text-primary)]">{title}</h3>
      {description && (
        <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--text-secondary)]">{description}</p>
      )}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  )
}
