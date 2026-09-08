import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  captureViewKeyFromSearch,
  hasViewAccess,
  readStoredViewKey,
} from '../domain/family-access'
import type { Family } from '../types'

export function useViewAccess(family: Family | null, isEditor: boolean) {
  const location = useLocation()
  const [storedViewKey, setStoredViewKey] = useState<string | null>(() =>
    family ? readStoredViewKey(family.slug) : null,
  )

  useEffect(() => {
    if (!family) return
    const fromUrl = captureViewKeyFromSearch(location.search, family.slug)
    setStoredViewKey(fromUrl ?? readStoredViewKey(family.slug))
  }, [family, location.search])

  const canView = useMemo(
    () => hasViewAccess(family, storedViewKey, isEditor),
    [family, storedViewKey, isEditor],
  )

  return { canView, storedViewKey }
}
