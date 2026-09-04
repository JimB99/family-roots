export interface SortKey {
  birthYear: number
  id: string
}

export function comparePersons(a: SortKey, b: SortKey): number {
  if (a.birthYear !== b.birthYear) return a.birthYear - b.birthYear
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

export function meanOrNull(values: number[]): number | null {
  if (values.length === 0) return null
  let sum = 0
  for (const value of values) sum += value
  return sum / values.length
}

export function sortByKey<T>(items: T[], keyOf: (item: T) => SortKey): T[] {
  return [...items].sort((a, b) => comparePersons(keyOf(a), keyOf(b)))
}
