import { useFamilyQuery } from '../data/use-family-query'

export function useFamily(slug: string, userEmail?: string | null, userId?: string | null) {
  const query = useFamilyQuery(slug, userEmail, userId)
  return {
    family: query.family,
    people: query.people,
    relationships: query.relationships,
    loading: query.status === 'loading',
    error: query.error,
    reload: query.reload,
    isEditor: query.isEditor,
    status: query.status,
  }
}
