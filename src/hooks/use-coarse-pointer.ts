import { useEffect, useState } from 'react'

export function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia('(pointer: coarse)').matches
  })

  useEffect(() => {
    if (!window.matchMedia) return
    const query = window.matchMedia('(pointer: coarse)')
    const onChange = () => setCoarse(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  return coarse
}
