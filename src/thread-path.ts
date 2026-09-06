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
/** Split the settled cubic exactly, so both endpoint contracts are algebraic identities. */
export function tightenThreadPath(loose: readonly CubicThreadPath[], settled: CubicThreadPath, progress: number): CubicThreadPath[] {
  if (!loose.length) return [settled]
  const t = Math.min(1, Math.max(0, progress))
  let rest = settled
  return loose.map((curve, index) => {
    const [goal, tail] = splitThreadPath(rest, 1 / (loose.length - index))
    rest = tail
    return curve.map((point, control) => interpolate(point, goal[control]!, t)) as unknown as CubicThreadPath
  })
}
