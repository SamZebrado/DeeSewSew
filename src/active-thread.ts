import { interpolate, type NormalizedPoint } from './stitch-model'

export interface ActiveThreadState {
  anchor: NormalizedPoint
  target: NormalizedPoint
  points: NormalizedPoint[]
  previous: NormalizedPoint[]
  reducedMotion: boolean
}

export interface ActiveThreadOptions {
  pointCount?: number
  reducedMotion?: boolean
}

export const ACTIVE_THREAD_MIN_POINTS = 6
export const ACTIVE_THREAD_MAX_POINTS = 16
export const ACTIVE_THREAD_DEFAULT_POINTS = 10
export const ACTIVE_THREAD_CONSTRAINT_ITERATIONS = 3

const clonePoint = (point: NormalizedPoint): NormalizedPoint => ({ x: point.x, y: point.y })
const clamp = (value: number, minimum: number, maximum: number): number => Math.max(minimum, Math.min(maximum, value))
const finitePoint = (point: NormalizedPoint): boolean => Number.isFinite(point.x) && Number.isFinite(point.y)

function safePointCount(value: number | undefined): number {
  if (!Number.isFinite(value)) return ACTIVE_THREAD_DEFAULT_POINTS
  return clamp(Math.round(value!), ACTIVE_THREAD_MIN_POINTS, ACTIVE_THREAD_MAX_POINTS)
}

function initialPoints(anchor: NormalizedPoint, target: NormalizedPoint, count: number, reducedMotion: boolean): NormalizedPoint[] {
  const distance = Math.hypot(target.x - anchor.x, target.y - anchor.y)
  const sag = reducedMotion ? Math.min(.009, distance * .018) : Math.min(.038, .01 + distance * .055)
  return Array.from({ length: count }, (_, index) => {
    const progress = index / (count - 1)
    const point = interpolate(anchor, target, progress)
    return { x: point.x, y: point.y + Math.sin(Math.PI * progress) * sag }
  })
}

export function createActiveThread(anchor: NormalizedPoint, target: NormalizedPoint, options: ActiveThreadOptions = {}): ActiveThreadState {
  if (!finitePoint(anchor) || !finitePoint(target)) throw new TypeError('Active thread endpoints must be finite.')
  const count = safePointCount(options.pointCount)
  const reducedMotion = Boolean(options.reducedMotion)
  const points = initialPoints(anchor, target, count, reducedMotion)
  return { anchor: clonePoint(anchor), target: clonePoint(target), points, previous: points.map(clonePoint), reducedMotion }
}

export function retargetActiveThread(state: ActiveThreadState, target: NormalizedPoint): ActiveThreadState {
  if (!finitePoint(target)) return state
  return { ...state, target: clonePoint(target) }
}

export function stepActiveThread(state: ActiveThreadState, elapsedMs: number): ActiveThreadState {
  const frameScale = clamp(Number.isFinite(elapsedMs) ? elapsedMs / (1000 / 60) : 1, 0, 2)
  const damping = state.reducedMotion ? .18 : .76
  const gravity = state.reducedMotion ? .000035 : .00016
  const points = state.points.map(clonePoint)
  const previous = state.previous.map(clonePoint)
  const lastIndex = points.length - 1

  points[0] = clonePoint(state.anchor)
  points[lastIndex] = clonePoint(state.target)
  for (let index = 1; index < lastIndex; index += 1) {
    const current = state.points[index]!
    const prior = state.previous[index]!
    previous[index] = clonePoint(current)
    points[index] = {
      x: clamp(current.x + (current.x - prior.x) * damping * frameScale, -.25, 1.25),
      y: clamp(current.y + (current.y - prior.y) * damping * frameScale + gravity * frameScale * frameScale, -.25, 1.25),
    }
  }

  const endpointDistance = Math.hypot(state.target.x - state.anchor.x, state.target.y - state.anchor.y)
  const slackRatio = state.reducedMotion ? 1.018 : 1.085
  const segmentLength = Math.max(.0001, endpointDistance * slackRatio / lastIndex)
  const iterations = state.reducedMotion ? 2 : ACTIVE_THREAD_CONSTRAINT_ITERATIONS
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    points[0] = clonePoint(state.anchor)
    points[lastIndex] = clonePoint(state.target)
    for (let index = 0; index < lastIndex; index += 1) {
      const first = points[index]!
      const second = points[index + 1]!
      const dx = second.x - first.x
      const dy = second.y - first.y
      const distance = Math.max(.000001, Math.hypot(dx, dy))
      const correction = (distance - segmentLength) / distance
      if (index > 0) {
        first.x += dx * correction * .5
        first.y += dy * correction * .5
      }
      if (index + 1 < lastIndex) {
        second.x -= dx * correction * .5
        second.y -= dy * correction * .5
      }
    }
  }
  points[0] = clonePoint(state.anchor)
  points[lastIndex] = clonePoint(state.target)
  previous[0] = clonePoint(state.anchor)
  previous[lastIndex] = clonePoint(state.target)
  if (!points.every(finitePoint)) return createActiveThread(state.anchor, state.target, { pointCount: points.length, reducedMotion: state.reducedMotion })
  return { ...state, points, previous }
}

export function tightenActiveThread(points: readonly NormalizedPoint[], start: NormalizedPoint, end: NormalizedPoint, progress: number): NormalizedPoint[] {
  if (points.length < 2) return [clonePoint(start), clonePoint(end)]
  const amount = clamp(Number.isFinite(progress) ? progress : 0, 0, 1)
  const eased = amount * amount * (3 - 2 * amount)
  return points.map((point, index) => {
    const settled = interpolate(start, end, index / (points.length - 1))
    return interpolate(point, settled, eased)
  })
}

export function activeThreadSag(points: readonly NormalizedPoint[], start: NormalizedPoint, end: NormalizedPoint): number {
  if (points.length < 3) return 0
  let maximum = 0
  for (let index = 1; index < points.length - 1; index += 1) {
    const line = interpolate(start, end, index / (points.length - 1))
    maximum = Math.max(maximum, points[index]!.y - line.y)
  }
  return maximum
}

export function snapshotActiveThread(state: ActiveThreadState | null): NormalizedPoint[] | null {
  return state ? state.points.map(clonePoint) : null
}
