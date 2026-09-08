export type PersonReturnOrigin = 'tree' | 'people' | 'health'

export interface PersonNavigationState {
  returnTo: string
  from: PersonReturnOrigin
}

const RETURN_LABEL_KEYS: Record<PersonReturnOrigin, string> = {
  tree: 'back.tree',
  people: 'back.people',
  health: 'back.health',
}

export function personReturnLabelKey(from: PersonReturnOrigin): string {
  return RETURN_LABEL_KEYS[from]
}

export function personNavigationState(returnTo: string, from: PersonReturnOrigin): PersonNavigationState {
  return { returnTo, from }
}

export function personPath(slug: string, personId: string): string {
  return `/families/${slug}/person/${personId}`
}

export function defaultPersonReturn(slug: string): PersonNavigationState {
  return { returnTo: `/families/${slug}`, from: 'tree' }
}

export function readPersonReturn(
  slug: string,
  state: unknown,
): { returnTo: string; labelKey: string } {
  const fallback = { returnTo: `/families/${slug}`, labelKey: RETURN_LABEL_KEYS.tree }
  if (!state || typeof state !== 'object') return fallback
  const candidate = state as Partial<PersonNavigationState>
  if (
    typeof candidate.returnTo === 'string' &&
    (candidate.from === 'tree' || candidate.from === 'people' || candidate.from === 'health')
  ) {
    return { returnTo: candidate.returnTo, labelKey: RETURN_LABEL_KEYS[candidate.from] }
  }
  return fallback
}
