import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { formatLifeSpan } from '../lib/dates'
import type { PersonNavigationState } from '../lib/person-navigation'
import { personPath } from '../lib/person-navigation'
import { displayName } from '../lib/tree'
import type { Person } from '../types'

interface PersonTileProps {
  person: Person
  slug: string
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

export function PersonTile({ person, slug, returnState }: PersonTileProps) {
  const { t, i18n } = useTranslation(['person', 'common'])
  const lifespan = formatLifeSpan(person.birth, person.death, person.isLiving, i18n.language)
  const ring = genderRing[person.gender]

  return (
    <Link
      to={personPath(slug, person.id)}
      state={returnState}
      className="block rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4 transition hover:-translate-y-0.5 hover:border-[var(--accent)] hover:shadow-md"
    >
      <div className="flex gap-3">
        <div className="shrink-0">
          {person.photoBase64 ? (
            <img
              src={person.photoBase64}
              alt=""
              className="h-14 w-14 rounded-xl object-cover"
              style={{ boxShadow: `0 0 0 2px ${ring}` }}
            />
          ) : (
            <div
              className="flex h-14 w-14 items-center justify-center rounded-xl text-base font-semibold"
              style={{
                background: `color-mix(in srgb, ${ring} 20%, transparent)`,
                color: 'var(--text-secondary)',
                boxShadow: `0 0 0 1.5px color-mix(in srgb, ${ring} 55%, transparent)`,
              }}
              aria-hidden="true"
            >
              {initials(person)}
            </div>
          )}
        </div>
        <div className="min-w-0 self-center">
          <p className="truncate font-medium text-[var(--text-primary)]">{displayName(person)}</p>
          {person.maidenName && (
            <p className="truncate text-xs text-[var(--text-muted)]">
              {t('maidenNameLabel', { name: person.maidenName })}
            </p>
          )}
          <p className="mt-1 truncate text-sm text-[var(--text-secondary)]">
            {lifespan || t('datesUnknown', { ns: 'common' })}
          </p>
        </div>
      </div>
    </Link>
  )
}
