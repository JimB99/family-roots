interface StatusBadgeProps {
  tone?: 'neutral' | 'warning' | 'danger' | 'success'
  children: React.ReactNode
}

const tones = {
  neutral:
    'bg-[var(--surface-sunken)] text-[var(--text-secondary)] border-[var(--border-subtle)]',
  warning: 'bg-bark-100 text-bark-800 border-bark-200 dark:bg-bark-900 dark:text-bark-100 dark:border-bark-700',
  danger:
    'bg-bloom-400/15 text-[var(--color-bloom-600)] border-bloom-400/40 dark:text-[var(--color-bloom-400)]',
  success: 'bg-leaf-100 text-leaf-800 border-leaf-200 dark:bg-leaf-900 dark:text-leaf-100 dark:border-leaf-700',
}

export function StatusBadge({ tone = 'neutral', children }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  )
}
