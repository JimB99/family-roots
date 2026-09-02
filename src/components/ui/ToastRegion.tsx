import { useEffect } from 'react'

interface ToastRegionProps {
  message: string | null
  tone?: 'success' | 'error'
  onDismiss: () => void
}

export function ToastRegion({ message, tone = 'success', onDismiss }: ToastRegionProps) {
  useEffect(() => {
    if (!message) return
    const timer = setTimeout(onDismiss, tone === 'error' ? 7000 : 3500)
    return () => clearTimeout(timer)
  }, [message, tone, onDismiss])

  if (!message) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur ${
        tone === 'error'
          ? 'border-bloom-400/50 bg-[var(--surface-overlay)] text-[var(--color-bloom-600)] dark:text-[var(--color-bloom-400)]'
          : 'border-leaf-300/60 bg-[var(--surface-overlay)] text-[var(--text-primary)]'
      }`}
    >
      {message}
    </div>
  )
}
