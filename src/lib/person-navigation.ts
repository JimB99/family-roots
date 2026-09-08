export type PersonReturnOrigin = 'tree' | 'people' | 'health'

export interface PersonNavigationState {
  returnTo: string
  from: PersonReturnOrigin
}

const RETURN_LABELS: Record<PersonReturnOrigin, string> = {
  tree: 'Back to tree',
  people: 'Back to People',
  health: 'Back to Health',
}

export function personPath(slug: string, personId: string): string {
  return `/families/${slug}/person/${personId}`
}

export function defaultPersonReturn(slug: string): PersonNavigationState {
  return {
    returnTo: `/families/${slug}`,
    from: 'tree',
  }
}

export function personNavigationState(
  returnTo: string,
  from: PersonReturnOrigin,
): PersonNavigationState {
  return { returnTo, from }
}

export function readPersonReturn(
  slug: string,
  state: unknown,
): { returnTo: string; label: string } {
  if (isPersonNavigationState(state)) {
    return {
      returnTo: state.returnTo,
      label: RETURN_LABELS[state.from] ?? RETURN_LABELS.tree,
    }
  }
  const fallback = defaultPersonReturn(slug)
  return {
    returnTo: fallback.returnTo,
    label: RETURN_LABELS[fallback.from],
  }
}

function isPersonNavigationState(state: unknown): state is PersonNavigationState {
  if (!state || typeof state !== 'object') return false
  const candidate = state as Partial<PersonNavigationState>
  return (
    typeof candidate.returnTo === 'string' &&
    (candidate.from === 'tree' || candidate.from === 'people' || candidate.from === 'health')
  )
}
