import { describe, expect, it } from 'vitest'
import {
  clampScale,
  fitViewport,
  initialViewport,
  MAX_SCALE,
  MIN_SCALE,
  viewportReducer,
  zoomAt,
} from './viewport-reducer'

describe('viewport reducer', () => {
  it('pans in screen pixels without dividing by scale', () => {
    const zoomed = { x: 10, y: 20, scale: 2 }
    const panned = viewportReducer(zoomed, { type: 'pan', dx: 30, dy: -15 })

    expect(panned).toEqual({ x: 40, y: 5, scale: 2 })
  })

  it('keeps the point under the cursor fixed while zooming', () => {
    const state = { x: 120, y: 80, scale: 1 }
    const cursor = { px: 400, py: 300 }

    const worldBefore = {
      x: (cursor.px - state.x) / state.scale,
      y: (cursor.py - state.y) / state.scale,
    }

    const zoomedIn = zoomAt(state, 1.25, cursor.px, cursor.py)
    const worldAfter = {
      x: (cursor.px - zoomedIn.x) / zoomedIn.scale,
      y: (cursor.py - zoomedIn.y) / zoomedIn.scale,
    }

    expect(worldAfter.x).toBeCloseTo(worldBefore.x, 6)
    expect(worldAfter.y).toBeCloseTo(worldBefore.y, 6)
  })

  it('clamps the scale to the supported range', () => {
    expect(clampScale(100)).toBe(MAX_SCALE)
    expect(clampScale(0.0001)).toBe(MIN_SCALE)
    expect(zoomAt({ x: 0, y: 0, scale: MAX_SCALE }, 4, 0, 0).scale).toBe(MAX_SCALE)
  })

  it('fits content centred within the viewport', () => {
    const bounds = { minX: 0, minY: 0, maxX: 1000, maxY: 500 }
    const fitted = fitViewport(bounds, 800, 600)

    const renderedWidth = 1000 * fitted.scale
    const leftGap = fitted.x
    const rightGap = 800 - (fitted.x + renderedWidth)

    expect(leftGap).toBeCloseTo(rightGap, 6)
    expect(fitted.scale).toBeLessThanOrEqual(1)
  })

  it('never scales beyond 1 when content is smaller than the viewport', () => {
    const fitted = fitViewport({ minX: 0, minY: 0, maxX: 100, maxY: 100 }, 1200, 900)

    expect(fitted.scale).toBe(1)
  })

  it('resets to the initial viewport', () => {
    expect(viewportReducer({ x: 5, y: 5, scale: 2 }, { type: 'reset' })).toEqual(initialViewport)
  })
})
