import type { PeopleFilters } from '../domain/person-filters'
import type { PeopleSortKey } from './tree'

export function countActivePeopleToolbarFilters(
  filters: PeopleFilters,
  sortKey: PeopleSortKey,
  branchFilter: string,
  generation: number | 'all',
  progenitorId: string,
  defaultProgenitor: string,
): number {
  let count = 0
  if (filters.text?.trim()) count++
  if (sortKey !== 'name-asc') count++
  if (branchFilter !== 'all') count++
  if (generation !== 'all') count++
  if (progenitorId && defaultProgenitor && progenitorId !== defaultProgenitor) count++
  if (filters.birthYear) count++
  if (filters.deathYear) count++
  if (filters.notesPresence) count++
  if (filters.fieldPresence?.length) count += filters.fieldPresence.length
  return count
}
