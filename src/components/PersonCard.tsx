import { formatLifeSpan, formatPartialDate } from '../lib/dates'
import { Link } from 'react-router-dom'
import { Button } from './ui/Button'
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
}

const genderRing: Record<Person['gender'], string> = {
  male: 'var(--gender-male)',
  female: 'var(--gender-female)',
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

            <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-[var(--text-muted)]">Birth</dt>
                <dd className="mt-0.5">{formatPartialDate(person.birth, '') || '—'}</dd>
                {person.birthPlace && (
                  <dd className="text-[var(--text-secondary)]">{person.birthPlace}</dd>
                )}
              </div>
              <div>
                <dt className="text-[var(--text-muted)]">Death</dt>
                <dd className="mt-0.5">
                  {formatPartialDate(person.death, '') || (person.isLiving ? 'Living' : '—')}
                </dd>
                {person.deathPlace && (
                  <dd className="text-[var(--text-secondary)]">{person.deathPlace}</dd>
                )}
              </div>
            </dl>

            {person.notes && (
              <div className="mt-6">
                <h2 className="mb-2 text-sm font-medium text-[var(--text-muted)]">Notes</h2>
                <p className="whitespace-pre-wrap text-[var(--text-primary)]">{person.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <RelationList title="Parents" people={parents} slug={slug} />
        <RelationList title="Partners" people={spouses} slug={slug} />
        <RelationList title="Children" people={children} slug={slug} />
      </div>
    </div>
  )
}

function RelationList({ title, people, slug }: { title: string; people: Person[]; slug: string }) {
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
                to={`/families/${slug}/person/${p.id}`}
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
