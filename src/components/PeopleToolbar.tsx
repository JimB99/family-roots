import { useState } from 'react'
import type { FieldPresenceFilter, PeopleFilters } from '../domain/person-filters'
import type { PersonCompletenessField } from '../domain/person-completeness'
import type { ConnectedComponent, PeopleSortKey } from '../lib/tree'
import { displayName } from '../lib/tree'
import type { Person } from '../types'

interface PeopleToolbarProps {
  filters: PeopleFilters
  onFiltersChange: (filters: PeopleFilters) => void
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

const inputClass =
  'w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--text-primary)] transition focus:border-[var(--accent)] focus:outline-none'

function chipClass(active: boolean): string {
  return `rounded-full border px-3 py-1 text-sm transition ${
    active
      ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-contrast)]'
      : 'border-[var(--border-strong)] bg-[var(--surface-raised)] text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]'
  }`
}

function parseYearInput(value: string): number | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const parsed = Number.parseInt(trimmed, 10)
  return Number.isFinite(parsed) ? parsed : undefined
}

function formatYearInput(value: number | undefined): string {
  return value == null ? '' : String(value)
}

function hasMissingFieldFilter(
  filters: PeopleFilters,
  field: PersonCompletenessField,
): boolean {
  return (
    filters.fieldPresence?.some((entry) => entry.field === field && entry.state === 'missing') ??
    false
  )
}

function toggleMissingFieldFilter(
  filters: PeopleFilters,
  field: PersonCompletenessField,
): PeopleFilters {
  const others =
    filters.fieldPresence?.filter((entry) => !(entry.field === field && entry.state === 'missing')) ??
    []
  if (hasMissingFieldFilter(filters, field)) {
    return { ...filters, fieldPresence: others.length ? others : undefined }
  }
  return {
    ...filters,
    fieldPresence: [...others, { field, state: 'missing' }],
  }
}

function updateYearRange(
  filters: PeopleFilters,
  key: 'birthYear' | 'deathYear',
  patch: { from?: number; to?: number; includeUnknown?: boolean },
): PeopleFilters {
  const current = filters[key] ?? {}
  const next = { ...current, ...patch }
  const empty =
    next.from == null && next.to == null && !next.includeUnknown
  return { ...filters, [key]: empty ? undefined : next }
}

function toggleNotesPresence(
  filters: PeopleFilters,
  value: 'has' | 'missing',
): PeopleFilters {
  if (filters.notesPresence === value) {
    return { ...filters, notesPresence: undefined }
  }
  return { ...filters, notesPresence: value }
}

export function PeopleToolbar({
  filters,
  onFiltersChange,
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
  const [showMoreFilters, setShowMoreFilters] = useState(false)
  const notesPresence = filters.notesPresence

  return (
    <div className="space-y-3 border-b border-[var(--border-subtle)] bg-[var(--surface-raised)] px-4 py-3">
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <input
            value={filters.text ?? ''}
            onChange={(e) => onFiltersChange({ ...filters, text: e.target.value || undefined })}
            placeholder="Search names, places, notes…"
            aria-label="Search names, places, and notes"
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
        <button
          type="button"
          onClick={() => setShowMoreFilters((open) => !open)}
          aria-expanded={showMoreFilters}
          className={chipClass(showMoreFilters)}
        >
          More filters
        </button>
      </div>

      {showMoreFilters && (
        <div className="space-y-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)]/50 p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <fieldset className="space-y-2">
              <legend className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                Birth year
              </legend>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="From"
                  aria-label="Birth year from"
                  value={formatYearInput(filters.birthYear?.from)}
                  onChange={(e) =>
                    onFiltersChange(
                      updateYearRange(filters, 'birthYear', {
                        from: parseYearInput(e.target.value),
                      }),
                    )
                  }
                  className={inputClass}
                />
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="To"
                  aria-label="Birth year to"
                  value={formatYearInput(filters.birthYear?.to)}
                  onChange={(e) =>
                    onFiltersChange(
                      updateYearRange(filters, 'birthYear', {
                        to: parseYearInput(e.target.value),
                      }),
                    )
                  }
                  className={inputClass}
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <input
                  type="checkbox"
                  checked={Boolean(filters.birthYear?.includeUnknown)}
                  onChange={(e) =>
                    onFiltersChange(
                      updateYearRange(filters, 'birthYear', { includeUnknown: e.target.checked }),
                    )
                  }
                />
                Include unknown birth year
              </label>
            </fieldset>

            <fieldset className="space-y-2">
              <legend className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                Death year
              </legend>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="From"
                  aria-label="Death year from"
                  value={formatYearInput(filters.deathYear?.from)}
                  onChange={(e) =>
                    onFiltersChange(
                      updateYearRange(filters, 'deathYear', {
                        from: parseYearInput(e.target.value),
                      }),
                    )
                  }
                  className={inputClass}
                />
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="To"
                  aria-label="Death year to"
                  value={formatYearInput(filters.deathYear?.to)}
                  onChange={(e) =>
                    onFiltersChange(
                      updateYearRange(filters, 'deathYear', {
                        to: parseYearInput(e.target.value),
                      }),
                    )
                  }
                  className={inputClass}
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <input
                  type="checkbox"
                  checked={Boolean(filters.deathYear?.includeUnknown)}
                  onChange={(e) =>
                    onFiltersChange(
                      updateYearRange(filters, 'deathYear', { includeUnknown: e.target.checked }),
                    )
                  }
                />
                Include unknown death year
              </label>
            </fieldset>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
              Notes
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onFiltersChange(toggleNotesPresence(filters, 'has'))}
                aria-pressed={notesPresence === 'has'}
                className={chipClass(notesPresence === 'has')}
              >
                Has notes
              </button>
              <button
                type="button"
                onClick={() => onFiltersChange(toggleNotesPresence(filters, 'missing'))}
                aria-pressed={notesPresence === 'missing'}
                className={chipClass(notesPresence === 'missing')}
              >
                No notes
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
              Data completeness
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onFiltersChange(toggleMissingFieldFilter(filters, 'familyName'))}
                aria-pressed={hasMissingFieldFilter(filters, 'familyName')}
                className={chipClass(hasMissingFieldFilter(filters, 'familyName'))}
              >
                Missing last name
              </button>
              <button
                type="button"
                onClick={() => onFiltersChange(toggleMissingFieldFilter(filters, 'birth'))}
                aria-pressed={hasMissingFieldFilter(filters, 'birth')}
                className={chipClass(hasMissingFieldFilter(filters, 'birth'))}
              >
                Missing birth date
              </button>
              <button
                type="button"
                onClick={() => onFiltersChange(toggleMissingFieldFilter(filters, 'maidenName'))}
                aria-pressed={hasMissingFieldFilter(filters, 'maidenName')}
                className={chipClass(hasMissingFieldFilter(filters, 'maidenName'))}
              >
                Missing maiden name
              </button>
              <button
                type="button"
                onClick={() => onFiltersChange(toggleMissingFieldFilter(filters, 'birthPlace'))}
                aria-pressed={hasMissingFieldFilter(filters, 'birthPlace')}
                className={chipClass(hasMissingFieldFilter(filters, 'birthPlace'))}
              >
                Missing birth place
              </button>
            </div>
          </div>
        </div>
      )}

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

export type { FieldPresenceFilter, PeopleFilters }
