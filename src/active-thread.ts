import { interpolate, type NormalizedPoint } from './stitch-model'

export interface ActiveThreadState {
  anchor: NormalizedPoint
  target: NormalizedPoint
  points: NormalizedPoint[]
  previous: NormalizedPoint[]
  reducedMotion: boolean
  accumulatorMs: number
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
  return { anchor: clonePoint(anchor), target: clonePoint(target), points, previous: points.map(clonePoint), reducedMotion, accumulatorMs: 0 }
}

export function retargetActiveThread(state: ActiveThreadState, target: NormalizedPoint): ActiveThreadState {
  if (!finitePoint(target)) return state
  const points = state.points.map(clonePoint)
  const previous = state.previous.map(clonePoint)
  points[points.length - 1] = clonePoint(target)
  previous[previous.length - 1] = clonePoint(target)
  return { ...state, target: clonePoint(target), points, previous }
}

export function stepActiveThread(state: ActiveThreadState, elapsedMs: number): ActiveThreadState {
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return state
  const timestep = 1000 / 60
  let accumulator = state.accumulatorMs + Math.min(elapsedMs, timestep * 6)
  let next = state
  let substeps = 0
  while (accumulator + 1e-8 >= timestep && substeps < 6) {
    next = integrateActiveThread(next)
    accumulator = Math.max(0, accumulator - timestep)
    substeps += 1
  }
  return { ...next, accumulatorMs: Math.min(accumulator, timestep) }
}

export function resetActiveThreadClock(state: ActiveThreadState): ActiveThreadState {
  return { ...state, accumulatorMs: 0 }
}

function integrateActiveThread(state: ActiveThreadState): ActiveThreadState {
  const damping = state.reducedMotion ? .18 : .76
  // A weak rest-shape spring removes slow constraint creep on short threads.
  // Sag is encoded in this equilibrium rather than injected indefinitely.
  const rest = initialPoints(state.anchor, state.target, state.points.length, state.reducedMotion)
  const stiffness = state.reducedMotion ? .22 : .06
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
      x: clamp(current.x + (current.x - prior.x) * damping + (rest[index]!.x - current.x) * stiffness, -.25, 1.25),
      y: clamp(current.y + (current.y - prior.y) * damping + (rest[index]!.y - current.y) * stiffness, -.25, 1.25),
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

export function activeThreadDeflection(points: readonly NormalizedPoint[], start: NormalizedPoint, end: NormalizedPoint): number {
  const dx = end.x - start.x, dy = end.y - start.y
  const length = Math.max(1e-9, Math.hypot(dx, dy))
  return Math.max(0, ...points.map(point => Math.abs(dx * (point.y - start.y) - dy * (point.x - start.x)) / length))
}

export function snapshotActiveThread(state: ActiveThreadState | null): NormalizedPoint[] | null {
  return state ? state.points.map(clonePoint) : null
}
