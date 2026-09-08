import { useTranslation } from 'react-i18next'
import { formatPartialDate } from '../lib/dates'
import { isPersonDeceased } from './PersonFormControls'
import type { Gender, Person } from '../types'

function displayValue(value: string | null | undefined): string {
  const trimmed = value?.trim()
  return trimmed ? trimmed : '—'
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
  const { t, i18n } = useTranslation(['person', 'common'])
  const deceased = isPersonDeceased(person.isLiving)

  const displayGender = (gender: Gender): string => {
    switch (gender) {
      case 'male':
        return t('gender.male', { ns: 'person' })
      case 'female':
        return t('gender.female', { ns: 'person' })
      case 'inter':
        return t('gender.inter', { ns: 'person' })
      default:
        return t('gender.unknown', { ns: 'person' })
    }
  }

  return (
    <dl className={`grid gap-4 text-sm ${compact ? 'grid-cols-1' : 'sm:grid-cols-2'}`}>
      <DetailRow label={t('fields.givenNames', { ns: 'person' })} value={displayValue(person.givenNames)} />
      <DetailRow label={t('fields.familyName', { ns: 'person' })} value={displayValue(person.familyName)} />
      <DetailRow label={t('fields.maidenName', { ns: 'person' })} value={displayValue(person.maidenName)} />
      <DetailRow label={t('fields.gender', { ns: 'person' })} value={displayGender(person.gender)} />
      <DetailRow
        label={t('fields.birthDate', { ns: 'person' })}
        value={formatPartialDate(person.birth, i18n.language) || '—'}
      />
      <DetailRow label={t('fields.birthPlace', { ns: 'person' })} value={displayValue(person.birthPlace)} />
      {deceased ? (
        <>
          <DetailRow
            label={t('fields.deathDate', { ns: 'person' })}
            value={formatPartialDate(person.death, i18n.language) || '—'}
          />
          <DetailRow label={t('fields.deathPlace', { ns: 'person' })} value={displayValue(person.deathPlace)} />
          <DetailRow label={t('fields.livingStatus', { ns: 'person' })} value={t('deceased', { ns: 'common' })} />
        </>
      ) : null}
      <div className={compact ? '' : 'sm:col-span-2'}>
        <DetailRow label={t('fields.notes', { ns: 'person' })} value={displayValue(person.notes)} multiline />
      </div>
    </dl>
  )
}
