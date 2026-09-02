import { useCallback, useEffect, useRef, useState } from 'react'
import {
  fitViewport,
  initialViewport,
  viewportReducer,
  type LayoutBoundsLike,
  type ViewportAction,
  type ViewportState,
} from './viewport-reducer'

type ApplyFn = (viewport: ViewportState) => void

/**
 * Keeps the authoritative viewport in a ref so pan and zoom gestures can drive
 * the SVG transform through requestAnimationFrame without re-rendering nodes.
 * React state is only committed when a gesture settles, for consumers that need
 * to react to the final scale.
 */
export function useTreeViewport() {
  const viewportRef = useRef<ViewportState>(initialViewport)
  const [committed, setCommitted] = useState<ViewportState>(initialViewport)
  const applyRef = useRef<ApplyFn | null>(null)
  const frameRef = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    },
    [],
  )

  const scheduleApply = useCallback(() => {
    if (frameRef.current !== null) return
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null
      applyRef.current?.(viewportRef.current)
    })
  }, [])

  const registerApply = useCallback((fn: ApplyFn | null) => {
    applyRef.current = fn
    if (fn) fn(viewportRef.current)
  }, [])

  const run = useCallback(
    (action: ViewportAction, commit = false) => {
      viewportRef.current = viewportReducer(viewportRef.current, action)
      scheduleApply()
      if (commit) setCommitted(viewportRef.current)
    },
    [scheduleApply],
  )

  const pan = useCallback((dx: number, dy: number) => run({ type: 'pan', dx, dy }), [run])

  const zoomAtPoint = useCallback(
    (factor: number, px: number, py: number, commit = false) =>
      run({ type: 'zoomAt', factor, px, py }, commit),
    [run],
  )

  const zoomAtCenter = useCallback(
    (factor: number, width: number, height: number) =>
      run({ type: 'zoomAt', factor, px: width / 2, py: height / 2 }, true),
    [run],
  )

  const fit = useCallback(
    (bounds: LayoutBoundsLike, width: number, height: number) =>
      run({ type: 'fit', bounds, width, height }, true),
    [run],
  )

  const focusOn = useCallback(
    (point: { x: number; y: number }, width: number, height: number, scale?: number) => {
      const nextScale = scale ?? viewportRef.current.scale
      run(
        {
          type: 'set',
          viewport: {
            scale: nextScale,
            x: width / 2 - point.x * nextScale,
            y: height / 2 - point.y * nextScale,
          },
        },
        true,
      )
    },
    [run],
  )

  const commit = useCallback(() => setCommitted(viewportRef.current), [])

  const reset = useCallback(() => run({ type: 'reset' }, true), [run])

  return {
    viewportRef,
    viewport: committed,
    registerApply,
    pan,
    zoomAtPoint,
    zoomAtCenter,
    fit,
    focusOn,
    commit,
    reset,
    fitViewport,
  }
}
