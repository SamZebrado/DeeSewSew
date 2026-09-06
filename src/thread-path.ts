import { interpolate, type NormalizedPoint } from './stitch-model'

export type CubicThreadPath = readonly [NormalizedPoint, NormalizedPoint, NormalizedPoint, NormalizedPoint]
export function splitThreadPath(path: CubicThreadPath, t: number): [CubicThreadPath, CubicThreadPath] {
  const a = interpolate(path[0], path[1], t), b = interpolate(path[1], path[2], t), c = interpolate(path[2], path[3], t)
  const d = interpolate(a, b, t), e = interpolate(b, c, t), p = interpolate(d, e, t)
  return [[path[0], a, d, p], [p, e, c, path[3]]]
}
export function sampleThreadPath(path: CubicThreadPath, t: number): NormalizedPoint {
  return splitThreadPath(path, t)[0][3]
}
function line(start: NormalizedPoint, end: NormalizedPoint): CubicThreadPath {
  return [start, interpolate(start, end, 1 / 3), interpolate(start, end, 2 / 3), end]
}
/** Exact cubic representation of the existing live quadratic-chain renderer. */
export function looseThreadPath(points: readonly NormalizedPoint[]): CubicThreadPath[] {
  if (points.length < 2) return []
  const result: CubicThreadPath[] = []
  let start = points[0]!
  for (let index = 1; index < points.length - 1; index += 1) {
    const control = points[index]!, end = interpolate(control, points[index + 1]!, .5)
    result.push([start, interpolate(start, control, 2 / 3), interpolate(end, control, 2 / 3), end])
    start = end
  }
  result.push(line(start, points.at(-1)!))
  return result
}
const clamp01 = (value: number): number => Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0
/** A bounded damped-string-inspired front, not a material-accurate PDE solver.
 * u=0 is the pulled/new-hole end, u=1 the previous hole. */
export function tighteningWeight(u: number, progress: number): number {
  const p = clamp01(progress)
  if (p === 0 || p === 1) return p
  const delta = .12
  const q = -delta + (1 + 2 * delta) * p
  const x = clamp01((clamp01(u) - (q - delta)) / (2 * delta))
  return 1 - x * x * (3 - 2 * x)
}

function arcTable(path: CubicThreadPath, steps: number): number[] {
  const lengths = [0]
  let previous = path[0]
  for (let i = 1; i <= steps; i++) {
    const point = sampleThreadPath(path, i / steps)
    lengths.push(lengths[i - 1]! + Math.hypot(point.x - previous.x, point.y - previous.y))
    previous = point
  }
  return lengths
}
function arcParameter(lengths: readonly number[], fraction: number): number {
  const target = fraction * lengths.at(-1)!
  if (target <= 0) return 0
  for (let i = 1; i < lengths.length; i++) {
    if (lengths[i]! >= target) {
      const span = lengths[i]! - lengths[i - 1]!
      return (i - 1 + (span > 0 ? (target - lengths[i - 1]!) / span : 0)) / (lengths.length - 1)
    }
  }
  return 1
}
/** Exact subcurves at both ends; arc-length-local weights between them.
 * Fixed subdivision budgets keep active work linear in the small rope size. */
export function tightenThreadPath(loose: readonly CubicThreadPath[], settled: CubicThreadPath, progress: number): CubicThreadPath[] {
  if (!loose.length) return [settled]
  const p = clamp01(progress)
  if (p === 0) return [...loose]
  if (p === 1) return [settled]
  const spans = loose.flatMap(curve => {
    const [a, b] = splitThreadPath(curve, .5)
    return [...splitThreadPath(a, .5), ...splitThreadPath(b, .5)]
  })
  const tables = spans.map(curve => arcTable(curve, 6))
  const total = tables.reduce((sum, table) => sum + table.at(-1)!, 0)
  const settledLengths = arcTable(settled, 96)
  // A collapsed source has no usable arc coordinate; use the destination arc.
  if (total < 1e-12) {
    const goalLength = settledLengths.at(-1)!
    return [settled.map((point, i) => interpolate(loose[0]![0], point,
      tighteningWeight(goalLength > 1e-12 ? 1 - settledLengths[i * 32]! / goalLength : 0, p))) as unknown as CubicThreadPath]
  }
  let travelled = 0
  let previousT = 0
  let rest = settled
  return spans.map((curve, index) => {
    const lengths = tables[index]!
    const endFraction = (travelled + lengths.at(-1)!) / total
    const nextT = index === spans.length - 1 ? 1 : arcParameter(settledLengths, endFraction)
    const [goal, tail] = splitThreadPath(rest, previousT < 1 ? (nextT - previousT) / (1 - previousT) : 1)
    rest = tail
    previousT = nextT
    const result = curve.map((point, control) => {
      const u = 1 - (travelled + lengths[control * 2]!) / total
      return interpolate(point, goal[control]!, tighteningWeight(u, p))
    }) as unknown as CubicThreadPath
    travelled += lengths.at(-1)!
    return result
  })
}
