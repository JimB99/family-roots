import { useCallback, useState } from 'react'

export interface MutationState {
  pending: boolean
  error: string | null
  success: string | null
}

export function useFamilyMutation() {
  const [state, setState] = useState<MutationState>({
    pending: false,
    error: null,
    success: null,
  })

  const run = useCallback(async <T>(label: string, fn: () => Promise<T>): Promise<T | null> => {
    setState({ pending: true, error: null, success: null })
    try {
      const result = await fn()
      setState({ pending: false, error: null, success: label })
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Operation failed'
      setState({ pending: false, error: message, success: null })
      return null
    }
  }, [])

  const clear = useCallback(() => {
    setState({ pending: false, error: null, success: null })
  }, [])

  const setError = useCallback((message: string) => {
    setState({ pending: false, error: message, success: null })
  }, [])

  return { ...state, run, clear, setError }
}
