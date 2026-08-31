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
    <div className="space-y-4 border-b border-stone-200 bg-white px-4 py-4">
      <div className="flex flex-wrap gap-3">
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search names…"
          className="flex-1 min-w-[200px] rounded-xl border border-stone-300 px-4 py-2.5"
        />
        <select
          value={sortKey}
          onChange={(e) => onSortChange(e.target.value as PeopleSortKey)}
          className="rounded-xl border border-stone-300 px-3 py-2.5 text-sm"
        >
          <option value="name-asc">Name A–Z</option>
          <option value="birth-year-asc">Birth year (oldest first)</option>
          <option value="birth-year-desc">Birth year (newest first)</option>
        </select>
        <select
          value={branchFilter}
          onChange={(e) => onBranchFilterChange(e.target.value)}
          className="rounded-xl border border-stone-300 px-3 py-2.5 text-sm max-w-xs"
        >
          <option value="all">All branches</option>
          {components.map((component, index) => (
            <option key={component.representativeId} value={component.representativeId}>
              Branch {index + 1} ({component.size})
            </option>
          ))}
        </select>
        <select
          value={progenitorId}
          onChange={(e) => onProgenitorChange(e.target.value)}
          className="rounded-xl border border-stone-300 px-3 py-2.5 text-sm max-w-xs"
          title="Ancestor for generation tabs"
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
            className={`rounded-full px-3 py-1 text-sm border ${
              generation === 'all'
                ? 'bg-amber-800 text-white border-amber-800'
                : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
            }`}
          >
            All generations
          </button>
          {generationOptions.map((gen) => (
            <button
              key={gen}
              type="button"
              onClick={() => onGenerationChange(gen)}
              className={`rounded-full px-3 py-1 text-sm border ${
                generation === gen
                  ? 'bg-amber-800 text-white border-amber-800'
                  : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
              }`}
            >
              Gen {gen + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
