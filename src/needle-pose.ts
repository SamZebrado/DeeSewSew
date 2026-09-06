import type { NormalizedPoint } from './stitch-model'

export interface NeedlePose {
  tip: NormalizedPoint
  eye: NormalizedPoint
  tail: NormalizedPoint
  orientation: number
}
/** World-normalized pose, independent of the front/back display mirror. */
export function needlePose(tip: NormalizedPoint, orientation = -Math.PI * .18): NeedlePose {
  const length = .075
  const offset = (fraction: number) => ({ x: tip.x - Math.cos(orientation) * length * fraction, y: tip.y - Math.sin(orientation) * length * fraction })
  return { tip: { ...tip }, eye: offset(.86), tail: offset(1), orientation }
}
