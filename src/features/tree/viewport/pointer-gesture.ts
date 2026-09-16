export const DEFAULT_DRAG_THRESHOLD = 5

export interface Point {
  x: number
  y: number
}

export function shouldStartDrag(dx: number, dy: number, threshold = DEFAULT_DRAG_THRESHOLD): boolean {
  return Math.hypot(dx, dy) >= threshold
}

export function pointerDistance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

export function pinchScaleFactor(prevDistance: number, nextDistance: number): number {
  if (prevDistance <= 0) return 1
  return nextDistance / prevDistance
}

export function pointerCentroid(points: Point[]): Point {
  if (points.length === 0) return { x: 0, y: 0 }
  const sum = points.reduce(
    (acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }),
    { x: 0, y: 0 },
  )
  return { x: sum.x / points.length, y: sum.y / points.length }
}

export interface ViewportLike {
  x: number
  y: number
  scale: number
}

export function isWorldPointInViewport(
  world: Point,
  viewport: ViewportLike,
  width: number,
  height: number,
  padding = 24,
): boolean {
  const screenX = world.x * viewport.scale + viewport.x
  const screenY = world.y * viewport.scale + viewport.y
  return (
    screenX >= padding &&
    screenX <= width - padding &&
    screenY >= padding &&
    screenY <= height - padding
  )
}
