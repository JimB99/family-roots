export interface LayoutBoundsLike {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export type ViewportAction =
  | { type: 'pan'; dx: number; dy: number }
  | { type: 'zoomAt'; factor: number; px: number; py: number }
  | { type: 'fit'; bounds: LayoutBoundsLike; width: number; height: number }
  | { type: 'set'; viewport: ViewportState }
  | { type: 'reset' }

export interface ViewportState {
  x: number
  y: number
  scale: number
}

export const MIN_SCALE = 0.05
export const MAX_SCALE = 3
export const FIT_PADDING = 64

export const initialViewport: ViewportState = { x: 0, y: 0, scale: 1 }

export function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale))
}

/**
 * Screen-space transform is `translate(x, y) scale(scale)`, so pan deltas are
 * already in screen pixels and must not be divided by the scale.
 */
export function zoomAt(state: ViewportState, factor: number, px: number, py: number): ViewportState {
  const nextScale = clampScale(state.scale * factor)
  const ratio = nextScale / state.scale
  return {
    scale: nextScale,
    x: px - ratio * (px - state.x),
    y: py - ratio * (py - state.y),
  }
}

export function fitViewport(
  bounds: LayoutBoundsLike,
  width: number,
  height: number,
): ViewportState {
  const contentWidth = Math.max(1, bounds.maxX - bounds.minX)
  const contentHeight = Math.max(1, bounds.maxY - bounds.minY)
  const available = {
    width: Math.max(1, width - FIT_PADDING * 2),
    height: Math.max(1, height - FIT_PADDING * 2),
  }
  const scale = clampScale(
    Math.min(available.width / contentWidth, available.height / contentHeight, 1),
  )
  return {
    scale,
    x: (width - contentWidth * scale) / 2 - bounds.minX * scale,
    y: (height - contentHeight * scale) / 2 - bounds.minY * scale,
  }
}

export function viewportReducer(state: ViewportState, action: ViewportAction): ViewportState {
  switch (action.type) {
    case 'pan':
      return { ...state, x: state.x + action.dx, y: state.y + action.dy }
    case 'zoomAt':
      return zoomAt(state, action.factor, action.px, action.py)
    case 'fit':
      return fitViewport(action.bounds, action.width, action.height)
    case 'set':
      return action.viewport
    case 'reset':
      return initialViewport
    default:
      return state
  }
}
