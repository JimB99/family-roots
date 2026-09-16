import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/Button'
import { formatLifeSpan } from '../../lib/dates'
import { displayName } from '../../lib/tree'
import type { Person } from '../../types'

interface TreeSelectionBarProps {
  person: Person
  hidden?: boolean
  onOpenDetails: () => void
  onOpenProfile: () => void
  onClear: () => void
}

export function TreeSelectionBar({
  person,
  hidden = false,
  onOpenDetails,
  onOpenProfile,
  onClear,
}: TreeSelectionBarProps) {
  const { t, i18n } = useTranslation(['tree', 'person', 'common'])
  const span = formatLifeSpan(person.birth, person.death, person.isLiving, i18n.language)

  if (hidden) return null

  return (
    <div
      className="pointer-events-auto absolute inset-x-0 bottom-0 z-20 border-t border-[var(--border-subtle)] bg-[var(--surface-overlay)]/95 px-3 py-2.5 shadow-lg backdrop-blur pb-[max(0.625rem,env(safe-area-inset-bottom))]"
      onPointerDown={(event) => event.stopPropagation()}
      data-testid="tree-selection-bar"
    >
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
            {displayName(person)}
          </p>
          {span && <p className="truncate text-xs text-[var(--text-secondary)]">{span}</p>}
        </div>
        <Button variant="secondary" size="sm" onClick={onOpenDetails}>
          {t('selection.details', { ns: 'tree' })}
        </Button>
        <Button variant="ghost" size="sm" onClick={onOpenProfile}>
          {t('profile.openFullProfile', { ns: 'person' })}
        </Button>
        <button
          type="button"
          onClick={onClear}
          aria-label={t('selection.clear', { ns: 'tree' })}
          className="shrink-0 rounded-lg p-2 text-[var(--text-muted)] transition hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]"
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M5 5l10 10M15 5L5 15"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}
