import { describe, expect, it } from 'vitest'
import {
  isWorldPointInViewport,
  pinchScaleFactor,
  pointerCentroid,
  pointerDistance,
  shouldStartDrag,
} from './pointer-gesture'

describe('pointer gesture helpers', () => {
  it('shouldStartDrag respects the movement threshold', () => {
    expect(shouldStartDrag(4, 0)).toBe(false)
    expect(shouldStartDrag(3, 3)).toBe(false)
    expect(shouldStartDrag(5, 0)).toBe(true)
    expect(shouldStartDrag(3, 4, 5)).toBe(true)
  })

  it('computes pointer distance and pinch scale factor', () => {
    expect(pointerDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5)
    expect(pinchScaleFactor(100, 150)).toBe(1.5)
    expect(pinchScaleFactor(0, 150)).toBe(1)
  })

  it('computes pointer centroid', () => {
    expect(pointerCentroid([{ x: 0, y: 0 }, { x: 10, y: 20 }])).toEqual({ x: 5, y: 10 })
  })

  it('detects when a world point is inside the viewport', () => {
    const viewport = { x: 50, y: 50, scale: 1 }
    expect(isWorldPointInViewport({ x: 100, y: 100 }, viewport, 400, 300)).toBe(true)
    expect(isWorldPointInViewport({ x: 400, y: 400 }, viewport, 400, 300)).toBe(false)
  })
})
