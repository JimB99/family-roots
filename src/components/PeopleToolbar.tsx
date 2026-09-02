import type { ConnectedComponent, PeopleSortKey } from '../lib/tree'
import { displayName } from '../lib/tree'
import type { Person } from '../types'

interface PeopleToolbarProps {
  query: string
  onQueryChange: (value: string) => void
  sortKey: PeopleSortKey
  onSortChange: (value: PeopleSortKey) => void
  branchFilter: string
  onBranchFilterChange: (value: string) => void
  components: ConnectedComponent[]
  progenitorId: string
  onProgenitorChange: (value: string) => void
  people: Person[]
  generation: number | 'all'
  onGenerationChange: (value: number | 'all') => void
  generationOptions: number[]
}

const selectClass =
  'rounded-lg border border-[var(--border-strong)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--text-primary)] transition focus:border-[var(--accent)] focus:outline-none'

function chipClass(active: boolean): string {
  return `rounded-full border px-3 py-1 text-sm transition ${
    active
      ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-contrast)]'
      : 'border-[var(--border-strong)] bg-[var(--surface-raised)] text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]'
  }`
}

export function PeopleToolbar({
  query,
  onQueryChange,
  sortKey,
  onSortChange,
  branchFilter,
  onBranchFilterChange,
  components,
  progenitorId,
  onProgenitorChange,
  people,
  generation,
  onGenerationChange,
  generationOptions,
}: PeopleToolbarProps) {
  return (
    <div className="space-y-3 border-b border-[var(--border-subtle)] bg-[var(--surface-raised)] px-4 py-3">
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search names…"
            aria-label="Search names"
            className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface-raised)] py-2 pr-3 pl-9 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition focus:border-[var(--accent)] focus:outline-none"
          />
          <svg
            width="15"
            height="15"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--text-muted)]"
          >
            <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.6" />
            <path d="M13 13l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </div>
        <select
          value={sortKey}
          onChange={(e) => onSortChange(e.target.value as PeopleSortKey)}
          aria-label="Sort people"
          className={selectClass}
        >
          <option value="name-asc">Name A–Z</option>
          <option value="birth-year-asc">Birth year (oldest first)</option>
          <option value="birth-year-desc">Birth year (newest first)</option>
        </select>
        <select
          value={branchFilter}
          onChange={(e) => onBranchFilterChange(e.target.value)}
          aria-label="Filter by connected group"
          className={`${selectClass} max-w-xs`}
        >
          <option value="all">All groups</option>
          {components.map((component, index) => (
            <option key={component.representativeId} value={component.representativeId}>
              Group {index + 1} ({component.size})
            </option>
          ))}
        </select>
        <select
          value={progenitorId}
          onChange={(e) => onProgenitorChange(e.target.value)}
          className={`${selectClass} max-w-xs`}
          aria-label="Ancestor used for generation numbering"
          title="Ancestor used for generation numbering"
        >
          {people.map((person) => (
            <option key={person.id} value={person.id}>
              {displayName(person)}
            </option>
          ))}
        </select>
      </div>

      {generationOptions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onGenerationChange('all')}
            aria-pressed={generation === 'all'}
            className={chipClass(generation === 'all')}
          >
            All generations
          </button>
          {generationOptions.map((gen) => (
            <button
              key={gen}
              type="button"
              onClick={() => onGenerationChange(gen)}
              aria-pressed={generation === gen}
              className={chipClass(generation === gen)}
            >
              Gen {gen + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
