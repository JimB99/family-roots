import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { PersonTile } from '../../components/PersonTile'
import { completenessFieldForIssueCode, isCompletenessIssueCode } from '../../domain/audit-person-completeness'
import {
  filterPeople,
  isFiltersEmpty,
  type FieldPresenceFilter,
  type PeopleFilters,
} from '../../domain/person-filters'
import {
  PERSON_COMPLETENESS_FIELD_LABELS,
  PERSON_COMPLETENESS_FIELDS,
  type PersonCompletenessField,
} from '../../domain/person-completeness'
import { filtersForMissingField, peopleListHref } from '../../lib/people-filter-params'
import { personNavigationState } from '../../lib/person-navigation'
import {
  presetFragmentIsActive,
  togglePresetFragment,
} from './health-preset-filters'
import type { Person } from '../../types'

interface HealthCompletenessPanelProps {
  slug: string
  people: Person[]
}

type Preset = {
  id: string
  label: string
  filters: PeopleFilters
}

const PRESETS: Preset[] = [
  {
    id: 'missing-given-names',
    label: 'Missing given names',
    filters: filtersForMissingField('givenNames'),
  },
  {
    id: 'missing-family-name',
    label: 'Missing last name',
    filters: filtersForMissingField('familyName'),
  },
  {
    id: 'missing-maiden-name',
    label: 'Missing maiden name',
    filters: filtersForMissingField('maidenName'),
  },
  {
    id: 'missing-birth',
    label: 'Missing birth date',
    filters: filtersForMissingField('birth'),
  },
  {
    id: 'missing-birth-place',
    label: 'Missing birth place',
    filters: filtersForMissingField('birthPlace'),
  },
  {
    id: 'missing-death',
    label: 'Missing death date',
    filters: filtersForMissingField('death'),
  },
  {
    id: 'missing-death-place',
    label: 'Missing death place',
    filters: filtersForMissingField('deathPlace'),
  },
  {
    id: 'missing-living-status',
    label: 'Missing living status',
    filters: filtersForMissingField('isLiving'),
  },
  {
    id: 'missing-photo',
    label: 'Missing photo',
    filters: filtersForMissingField('photo'),
  },
  {
    id: 'has-notes',
    label: 'Has notes',
    filters: { notesPresence: 'has' },
  },
  {
    id: 'no-notes',
    label: 'No notes',
    filters: { notesPresence: 'missing' },
  },
  {
    id: 'unknown-gender',
    label: 'Unknown gender',
    filters: filtersForMissingField('gender'),
  },
]

function chipClass(active: boolean): string {
  return `rounded-full border px-3 py-1 text-sm transition ${
    active
      ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-contrast)]'
      : 'border-[var(--border-strong)] bg-[var(--surface-raised)] text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]'
  }`
}

function addFieldFilter(
  filters: PeopleFilters,
  field: PersonCompletenessField,
  state: 'missing' | 'present',
): PeopleFilters {
  const withoutField = filters.fieldPresence?.filter((entry) => entry.field !== field) ?? []
  return {
    ...filters,
    fieldPresence: [...withoutField, { field, state }],
  }
}

export function filtersForCompletenessIssueCode(code: string): PeopleFilters | undefined {
  if (!isCompletenessIssueCode(code)) return undefined
  const field = completenessFieldForIssueCode(code)
  if (!field) return undefined
  if (code === 'MISSING_NOTES') return { notesPresence: 'missing' }
  return filtersForMissingField(field)
}

export function HealthCompletenessPanel({ slug, people }: HealthCompletenessPanelProps) {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<PeopleFilters>({})
  const [selectedField, setSelectedField] = useState<PersonCompletenessField>('familyName')
  const [fieldState, setFieldState] = useState<'missing' | 'present'>('missing')

  const matched = useMemo(() => filterPeople(people, filters), [people, filters])
  const healthReturnState = useMemo(
    () => personNavigationState(`/families/${slug}/health`, 'health'),
    [slug],
  )

  const applyPreset = (preset: Preset) => {
    setFilters((current) => togglePresetFragment(current, preset.filters))
  }

  const applyFieldFilter = () => {
    setFilters((current) => addFieldFilter(current, selectedField, fieldState))
  }

  const showActiveFilters =
    Boolean(filters.fieldPresence?.length) || Boolean(filters.notesPresence)

  return (
    <Card
      title="Browse incomplete records"
      description="Filter people by missing or present fields, then open the full People list to edit."
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
            Presets
          </span>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset)}
                aria-pressed={presetFragmentIsActive(filters, preset.filters)}
                className={chipClass(presetFragmentIsActive(filters, preset.filters))}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <label className="min-w-[180px] flex-1 space-y-1 text-sm">
            <span className="text-[var(--text-secondary)]">Field</span>
            <select
              value={selectedField}
              onChange={(e) => setSelectedField(e.target.value as PersonCompletenessField)}
              className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface-raised)] px-3 py-2 text-sm"
            >
              {PERSON_COMPLETENESS_FIELDS.map((field) => (
                <option key={field} value={field}>
                  {PERSON_COMPLETENESS_FIELD_LABELS[field]}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-[140px] space-y-1 text-sm">
            <span className="text-[var(--text-secondary)]">State</span>
            <select
              value={fieldState}
              onChange={(e) => setFieldState(e.target.value as 'missing' | 'present')}
              className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface-raised)] px-3 py-2 text-sm"
            >
              <option value="missing">Missing</option>
              <option value="present">Present</option>
            </select>
          </label>
          <Button variant="secondary" size="sm" onClick={applyFieldFilter}>
            Add filter
          </Button>
          {!isFiltersEmpty(filters) ? (
            <Button variant="ghost" size="sm" onClick={() => setFilters({})}>
              Clear filters
            </Button>
          ) : null}
        </div>

        {showActiveFilters ? (
          <ul className="flex flex-wrap gap-2 text-sm text-[var(--text-secondary)]">
            {filters.fieldPresence?.map((entry: FieldPresenceFilter) => (
              <li
                key={`${entry.field}-${entry.state}`}
                className="rounded-full border border-[var(--border-subtle)] px-2.5 py-1"
              >
                {PERSON_COMPLETENESS_FIELD_LABELS[entry.field]} · {entry.state}
              </li>
            ))}
            {filters.notesPresence ? (
              <li className="rounded-full border border-[var(--border-subtle)] px-2.5 py-1">
                Notes · {filters.notesPresence}
              </li>
            ) : null}
          </ul>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[var(--text-secondary)]">
            {matched.length} of {people.length} people match
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate(peopleListHref(slug, filters))}
          >
            View in People list
          </Button>
        </div>

        {matched.length > 0 ? (
          <div className="grid max-h-[420px] gap-3 overflow-y-auto sm:grid-cols-2">
            {matched.slice(0, 24).map((person) => (
              <PersonTile
                key={person.id}
                person={person}
                slug={slug}
                returnState={healthReturnState}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">No people match the current filters.</p>
        )}

        {matched.length > 24 ? (
          <p className="text-sm text-[var(--text-muted)]">
            Showing 24 of {matched.length}.{' '}
            <Link to={peopleListHref(slug, filters)} className="text-[var(--accent-strong)] hover:underline">
              View all in People list
            </Link>
          </p>
        ) : null}
      </div>
    </Card>
  )
}
