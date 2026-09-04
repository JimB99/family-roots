import type { Person } from '../types'

function haystackFor(person: Person): string {
  return [person.givenNames, person.familyName, person.maidenName, person.birthPlace]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

export function filterPeopleByQuery(people: Person[], query: string, limit = 6): Person[] {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return []
  return people.filter((person) => haystackFor(person).includes(normalized)).slice(0, limit)
}

export function matchedPersonIdsForQuery(people: Person[], query: string): Set<string> | null {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return null
  const matches = new Set<string>()
  for (const person of people) {
    if (haystackFor(person).includes(normalized)) matches.add(person.id)
  }
  return matches
}
