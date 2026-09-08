import { Mars, Venus, VenusAndMars } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Gender } from '../types'

const genderAccent: Record<Exclude<Gender, 'unknown'>, string> = {
  male: 'var(--gender-male)',
  female: 'var(--gender-female)',
  inter: 'var(--gender-inter)',
}

interface GenderToggleProps {
  value: Gender
  onChange: (value: Gender) => void
}

export function GenderToggle({ value, onChange }: GenderToggleProps) {
  const { t } = useTranslation('person')
  const options: {
    value: Exclude<Gender, 'unknown'>
    labelKey: 'gender.male' | 'gender.female' | 'gender.inter'
    Icon: typeof Mars
  }[] = [
    { value: 'male', labelKey: 'gender.male', Icon: Mars },
    { value: 'female', labelKey: 'gender.female', Icon: Venus },
    { value: 'inter', labelKey: 'gender.inter', Icon: VenusAndMars },
  ]

  return (
    <div className="flex gap-1.5" role="group" aria-label={t('gender.ariaGroup')}>
      {options.map((option) => {
        const selected = value === option.value
        const { Icon } = option
        const label = t(option.labelKey)
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            aria-label={label}
            title={label}
            onClick={() => onChange(selected ? 'unknown' : option.value)}
            className={`flex h-9 flex-1 items-center justify-center rounded-lg border transition ${
              selected
                ? 'border-[var(--accent)] bg-[var(--accent-soft)] font-medium text-[var(--accent-strong)]'
                : 'border-[var(--border-strong)] bg-[var(--surface-raised)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--text-primary)]'
            }`}
            style={selected ? { boxShadow: `inset 0 0 0 1px ${genderAccent[option.value]}` } : undefined}
          >
            <Icon size={17} strokeWidth={1.75} aria-hidden="true" />
          </button>
        )
      })}
    </div>
  )
}

interface DeceasedToggleProps {
  deceased: boolean
  onChange: (deceased: boolean) => void
}

export function DeceasedToggle({ deceased, onChange }: DeceasedToggleProps) {
  const { t } = useTranslation(['person', 'common'])
  const label = t('deceased', { ns: 'common' })

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-[var(--text-secondary)]">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={deceased}
        aria-label={label}
        onClick={() => onChange(!deceased)}
        className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${
          deceased ? 'bg-[var(--accent)]' : 'bg-[var(--border-strong)]'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-[var(--surface-raised)] shadow-sm transition-transform ${
            deceased ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}

export function isPersonDeceased(isLiving: boolean | null): boolean {
  return isLiving === false
}

export function shouldMarkDeceasedFromDeathInfo(
  deathInput: string,
  deathPlace: string | null | undefined,
): boolean {
  return Boolean(deathInput.trim() || deathPlace?.trim())
}
