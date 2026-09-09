import { useFamilyContext } from '../data/FamilyProvider'

export function useFamily() {
  const query = useFamilyContext()
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
