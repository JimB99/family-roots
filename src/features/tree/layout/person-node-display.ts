import { formatLifeSpan } from '../../../lib/dates'
import type { Person } from '../../../types'

export interface PersonNodeDisplay {
  label: string
  givenNames: string
  familyName: string | null
  subtitle: string | null
  gender: Person['gender']
  birthYear: number | null
  deathYear: number | null
  isDeceased: boolean
  initials: string
}

export function birthYearOf(person: Person): number | null {
  return person.birth?.year ?? null
}

export function deathYearOf(person: Person): number | null {
  return person.death?.year ?? null
}

export function displayLabel(person: Person): string {
  const parts = [person.givenNames, person.familyName].filter(Boolean)
  return parts.join(' ') || 'Unknown'
}

export function initialsFor(person: Person): string {
  const given = person.givenNames?.trim().charAt(0) ?? ''
  const family = person.familyName?.trim().charAt(0) ?? ''
  const value = `${given}${family}`.toUpperCase()
  return value || '?'
}

export function subtitleFor(person: Person): string | null {
  const span = formatLifeSpan(person.birth, person.death, person.isLiving)
  if (span) return span
  if (person.maidenName) return `née ${person.maidenName}`
  return null
}

export function isDeceased(person: Person): boolean {
  if (person.isLiving === true) return false
  return person.isLiving === false || Boolean(person.death)
}

export function personNodeDisplayFromPerson(person: Person): PersonNodeDisplay {
  return {
    label: displayLabel(person),
    givenNames: person.givenNames?.trim() || 'Unknown',
    familyName: person.familyName?.trim() || null,
    subtitle: subtitleFor(person),
    gender: person.gender,
    birthYear: birthYearOf(person),
    deathYear: deathYearOf(person),
    isDeceased: isDeceased(person),
    initials: initialsFor(person),
  }
}
