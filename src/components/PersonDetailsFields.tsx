import { formatPartialDate } from '../lib/dates'
import { isPersonDeceased } from './PersonFormControls'
import type { Gender, Person } from '../types'

function displayValue(value: string | null | undefined): string {
  const trimmed = value?.trim()
  return trimmed ? trimmed : '—'
}

function displayGender(gender: Gender): string {
  switch (gender) {
    case 'male':
      return 'Male'
    case 'female':
      return 'Female'
    case 'inter':
      return 'Inter'
    default:
      return 'Unknown'
  }
}

interface DetailRowProps {
  label: string
  value: string
  multiline?: boolean
}

function DetailRow({ label, value, multiline = false }: DetailRowProps) {
  return (
    <div>
      <dt className="text-[var(--text-muted)]">{label}</dt>
      <dd className={`mt-0.5 text-[var(--text-primary)] ${multiline ? 'whitespace-pre-wrap' : ''}`}>
        {value}
      </dd>
    </div>
  )
}

interface PersonDetailsFieldsProps {
  person: Person
  compact?: boolean
}

export function PersonDetailsFields({ person, compact = false }: PersonDetailsFieldsProps) {
  const deceased = isPersonDeceased(person.isLiving)

  return (
    <dl className={`grid gap-4 text-sm ${compact ? 'grid-cols-1' : 'sm:grid-cols-2'}`}>
      <DetailRow label="Given names" value={displayValue(person.givenNames)} />
      <DetailRow label="Family name" value={displayValue(person.familyName)} />
      <DetailRow label="Maiden name" value={displayValue(person.maidenName)} />
      <DetailRow label="Gender" value={displayGender(person.gender)} />
      <DetailRow label="Birth date" value={formatPartialDate(person.birth, '') || '—'} />
      <DetailRow label="Birth place" value={displayValue(person.birthPlace)} />
      {deceased ? (
        <>
          <DetailRow label="Death date" value={formatPartialDate(person.death, '') || '—'} />
          <DetailRow label="Death place" value={displayValue(person.deathPlace)} />
          <DetailRow label="Living status" value="Deceased" />
        </>
      ) : null}
      <div className={compact ? '' : 'sm:col-span-2'}>
        <DetailRow label="Notes" value={displayValue(person.notes)} multiline />
      </div>
    </dl>
  )
}
