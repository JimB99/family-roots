import { displayName } from '../../lib/tree'
import type { Person, Relationship } from '../../types'
import { Button } from '../../components/ui/Button'

interface PersonInspectorProps {
  person: Person
  parents: Person[]
  children: Person[]
  spouses: Person[]
  editMode: boolean
  onAddRelative: (kind: 'child' | 'parent' | 'spouse' | 'sibling') => void
  onOpenProfile: () => void
  onSelectPerson: (personId: string) => void
  onClear: () => void
}

function lifespan(person: Person): string | null {
  const born = person.birth?.year
  const died = person.death?.year
  if (born && died) return `${born} – ${died}`
  if (born) return `Born ${born}`
  if (died) return `Died ${died}`
  return null
}

export function PersonInspector({
  person,
  parents,
  children,
  spouses,
  editMode,
  onAddRelative,
  onOpenProfile,
  onSelectPerson,
  onClear,
}: PersonInspectorProps) {
  const span = lifespan(person)

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-[var(--text-primary)]">{displayName(person)}</h3>
          {span && <p className="mt-0.5 text-sm text-[var(--text-secondary)]">{span}</p>}
          {person.birthPlace && (
            <p className="mt-0.5 truncate text-sm text-[var(--text-muted)]">{person.birthPlace}</p>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={onClear}>
          Close
        </Button>
      </div>

      <Button variant="secondary" size="sm" onClick={onOpenProfile} className="w-full">
        Open full profile
      </Button>

      {editMode && (
        <section>
          <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
            Add a new relative
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" size="sm" onClick={() => onAddRelative('parent')}>
              Parent
            </Button>
            <Button variant="secondary" size="sm" onClick={() => onAddRelative('spouse')}>
              Partner
            </Button>
            <Button variant="secondary" size="sm" onClick={() => onAddRelative('child')}>
              Child
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={parents.length === 0}
              title={parents.length === 0 ? 'Add a parent first' : undefined}
              onClick={() => onAddRelative('sibling')}
            >
              Sibling
            </Button>
          </div>
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            To link two people who already exist, drag one onto the other.
          </p>
        </section>
      )}

      <RelationSection title="Parents" people={parents} onSelectPerson={onSelectPerson} />
      <RelationSection title="Partners" people={spouses} onSelectPerson={onSelectPerson} />
      <RelationSection title="Children" people={children} onSelectPerson={onSelectPerson} />
    </div>
  )
}

function RelationSection({
  title,
  people,
  onSelectPerson,
}: {
  title: string
  people: Person[]
  onSelectPerson: (personId: string) => void
}) {
  return (
    <section>
      <h4 className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">{title}</h4>
      {people.length === 0 ? (
        <p className="mt-1 text-sm text-[var(--text-muted)]">None recorded</p>
      ) : (
        <ul className="mt-1.5 space-y-0.5">
          {people.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onSelectPerson(p.id)}
                className="w-full truncate rounded-md px-2 py-1.5 text-left text-sm text-[var(--text-primary)] transition hover:bg-[var(--surface-sunken)]"
              >
                {displayName(p)}
                {p.birth?.year && (
                  <span className="ml-1.5 text-[var(--text-muted)]">{p.birth.year}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

interface RelationshipInspectorProps {
  relationship: Relationship
  personA: Person
  personB: Person
  editMode: boolean
  onDisconnect: () => void
  onChangeType: (type: Relationship['type']) => void
  onClear: () => void
}

export function RelationshipInspector({
  relationship,
  personA,
  personB,
  editMode,
  onDisconnect,
  onChangeType,
  onClear,
}: RelationshipInspectorProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-[var(--text-primary)]">
            {relationship.type === 'spouse' ? 'Marriage' : 'Parent and child'}
          </h3>
          <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
            {displayName(personA)} &amp; {displayName(personB)}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClear}>
          Close
        </Button>
      </div>

      {relationship.confidence !== 'manual' && (
        <p className="rounded-lg bg-[var(--surface-sunken)] px-3 py-2 text-xs text-[var(--text-secondary)]">
          This link came from an import and has not been confirmed yet.
        </p>
      )}

      {editMode ? (
        <div className="space-y-2">
          {relationship.type !== 'spouse' && (
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={() => onChangeType('spouse')}
            >
              Change to marriage
            </Button>
          )}
          {relationship.type !== 'parent_child' && (
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={() => onChangeType('parent_child')}
            >
              Change to parent and child
            </Button>
          )}
          <Button variant="danger" size="sm" className="w-full" onClick={onDisconnect}>
            Remove this connection
          </Button>
        </div>
      ) : (
        <p className="text-sm text-[var(--text-muted)]">Turn on editing to change this connection.</p>
      )}
    </div>
  )
}
