import { formatLifeSpan } from '../lib/dates'
import { Link } from 'react-router-dom'
import type { PersonNavigationState } from '../lib/person-navigation'
import { personPath } from '../lib/person-navigation'
import { Button } from './ui/Button'
import { PersonDetailsFields } from './PersonDetailsFields'
import { displayName } from '../lib/tree'
import type { Person } from '../types'

interface PersonCardProps {
  person: Person
  parents: Person[]
  children: Person[]
  spouses: Person[]
  slug: string
  isEditor?: boolean
  onEdit?: () => void
  returnState?: PersonNavigationState
}

const genderRing: Record<Person['gender'], string> = {
  male: 'var(--gender-male)',
  female: 'var(--gender-female)',
  inter: 'var(--gender-inter)',
  unknown: 'var(--gender-unknown)',
}

function initials(person: Person): string {
  const given = person.givenNames?.trim().charAt(0) ?? ''
  const family = person.familyName?.trim().charAt(0) ?? ''
  return `${given}${family}`.toUpperCase() || '?'
}

export function PersonCard({
  person,
  parents,
  children,
  spouses,
  slug,
  isEditor,
  onEdit,
  returnState,
}: PersonCardProps) {
  const ring = genderRing[person.gender]

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] shadow-sm">
        <div className="grid gap-0 md:grid-cols-[220px_1fr]">
          <div
            className="flex min-h-[220px] items-center justify-center p-6"
            style={{ background: `color-mix(in srgb, ${ring} 12%, var(--surface-sunken))` }}
          >
            {person.photoBase64 ? (
              <img
                src={person.photoBase64}
                alt={displayName(person)}
                className="h-40 w-40 rounded-2xl object-cover shadow-md"
                style={{ boxShadow: `0 0 0 3px ${ring}` }}
              />
            ) : (
              <div
                className="flex h-40 w-40 items-center justify-center rounded-2xl text-5xl font-semibold"
                style={{
                  background: `color-mix(in srgb, ${ring} 24%, transparent)`,
                  color: 'var(--text-secondary)',
                }}
                aria-hidden="true"
              >
                {initials(person)}
              </div>
            )}
          </div>
          <div className="p-6 text-left md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
                  {displayName(person)}
                </h1>
                {person.maidenName && (
                  <p className="mt-1 text-[var(--text-secondary)]">née {person.maidenName}</p>
                )}
                <p className="mt-2 text-[var(--accent-strong)]">
                  {formatLifeSpan(person.birth, person.death, person.isLiving) || 'Dates unknown'}
                </p>
              </div>
              {isEditor && onEdit && (
                <Button size="sm" onClick={onEdit}>
                  Edit
                </Button>
              )}
            </div>

            <div className="mt-6">
              <PersonDetailsFields person={person} />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <RelationList title="Parents" people={parents} slug={slug} returnState={returnState} />
        <RelationList title="Partners" people={spouses} slug={slug} returnState={returnState} />
        <RelationList title="Children" people={children} slug={slug} returnState={returnState} />
      </div>
    </div>
  )
}

function RelationList({
  title,
  people,
  slug,
  returnState,
}: {
  title: string
  people: Person[]
  slug: string
  returnState?: PersonNavigationState
}) {
  return (
    <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4 text-left">
      <h2 className="mb-2.5 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
        {title}
      </h2>
      {people.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">None recorded</p>
      ) : (
        <ul className="space-y-0.5">
          {people.map((p) => (
            <li key={p.id}>
              <Link
                to={personPath(slug, p.id)}
                state={returnState}
                className="block truncate rounded-md px-2 py-1.5 text-sm text-[var(--text-primary)] transition hover:bg-[var(--surface-sunken)]"
              >
                {displayName(p)}
                {p.birth?.year && (
                  <span className="ml-1.5 text-[var(--text-muted)]">{p.birth.year}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
