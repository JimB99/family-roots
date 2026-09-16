import { useEffect, type RefObject } from 'react'
import { pinchScaleFactor, pointerCentroid, pointerDistance } from './pointer-gesture'

interface UsePinchZoomOptions {
  enabled: boolean
  onZoomAt: (factor: number, px: number, py: number) => void
  onCommit: () => void
  onPinchActiveChange?: (active: boolean) => void
}

export function usePinchZoom(
  containerRef: RefObject<HTMLElement | null>,
  { enabled, onZoomAt, onCommit, onPinchActiveChange }: UsePinchZoomOptions,
) {
  useEffect(() => {
    const container = containerRef.current
    if (!container || !enabled) return

    const pointers = new Map<number, { x: number; y: number }>()
    let pinchDistance: number | null = null
    let pinching = false

    const setPinching = (next: boolean) => {
      if (pinching === next) return
      pinching = next
      onPinchActiveChange?.(next)
    }

    const localPoint = (clientX: number, clientY: number) => {
      const rect = container.getBoundingClientRect()
      return { x: clientX - rect.left, y: clientY - rect.top }
    }

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return
      pointers.set(event.pointerId, localPoint(event.clientX, event.clientY))
      if (pointers.size === 2) {
        const points = [...pointers.values()]
        pinchDistance = pointerDistance(points[0], points[1])
        setPinching(true)
      }
    }

    const onPointerMove = (event: PointerEvent) => {
      if (!pointers.has(event.pointerId)) return
      pointers.set(event.pointerId, localPoint(event.clientX, event.clientY))
      if (pointers.size !== 2 || pinchDistance === null) return

      const points = [...pointers.values()]
      const nextDistance = pointerDistance(points[0], points[1])
      const factor = pinchScaleFactor(pinchDistance, nextDistance)
      pinchDistance = nextDistance
      const centroid = pointerCentroid(points)
      onZoomAt(factor, centroid.x, centroid.y)
      event.preventDefault()
    }

    const onPointerEnd = (event: PointerEvent) => {
      if (!pointers.has(event.pointerId)) return
      pointers.delete(event.pointerId)
      if (pointers.size < 2) {
        if (pinching) onCommit()
        pinchDistance = null
        setPinching(false)
      }
    }

    const capture = { capture: true }
    container.addEventListener('pointerdown', onPointerDown, capture)
    container.addEventListener('pointermove', onPointerMove, capture)
    container.addEventListener('pointerup', onPointerEnd, capture)
    container.addEventListener('pointercancel', onPointerEnd, capture)

    return () => {
      container.removeEventListener('pointerdown', onPointerDown, capture)
      container.removeEventListener('pointermove', onPointerMove, capture)
      container.removeEventListener('pointerup', onPointerEnd, capture)
      container.removeEventListener('pointercancel', onPointerEnd, capture)
      setPinching(false)
    }
  }, [containerRef, enabled, onCommit, onPinchActiveChange, onZoomAt])
}
