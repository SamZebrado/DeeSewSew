import type { NormalizedPoint } from './stitch-model'
import { createActiveThread } from './active-thread'

export interface NeedlePose {
  tip: NormalizedPoint
  eye: NormalizedPoint
  tail: NormalizedPoint
  orientation: number
}
/** World-normalized pose, independent of the front/back display mirror. */
export const DEFAULT_NEEDLE_ORIENTATION = -Math.PI * .75
export function needlePose(tip: NormalizedPoint, orientation = DEFAULT_NEEDLE_ORIENTATION): NeedlePose {
  const length = .075
  const offset = (fraction: number) => ({ x: tip.x - Math.cos(orientation) * length * fraction, y: tip.y - Math.sin(orientation) * length * fraction })
  return { tip: { ...tip }, eye: offset(.86), tail: offset(1), orientation }
}

export interface NeedlePassage {
  pose: NeedlePose
  sourceShaft: readonly [NormalizedPoint, NormalizedPoint] | null
  destinationShaft: readonly [NormalizedPoint, NormalizedPoint] | null
  sourceEyeVisible: boolean
  destinationEyeVisible: boolean
  sourceThreadEnd: NormalizedPoint
  extraThread: readonly NormalizedPoint[]
  pull: number
}
const smooth = (v: number) => { const t = Math.max(0, Math.min(1, v)); return t * t * (3 - 2 * t) }
/** One translated shaft, clipped by the puncture plane on each face.
 * The eye crosses only after the tip; no topology is changed here. */
export function needlePassage(captured: NeedlePose, progress: number): NeedlePassage {
  const p = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0
  const travel = 1.3 * smooth((p - .1) / .36)
  const dx = captured.tail.x - captured.tip.x, dy = captured.tail.y - captured.tip.y
  const at = (fraction: number): NormalizedPoint => ({ x: captured.tip.x + dx * (fraction - travel), y: captured.tip.y + dy * (fraction - travel) })
  let pose = { tip: at(0), eye: at(.86), tail: at(1), orientation: captured.orientation }
  const hole = captured.tip
  // Once the entire shaft is clear, return the free needle to the cursor's holding pose.
  // Both tip and eye follow one rigid pose, so the next pointer event cannot teleport it.
  const returnWeight = smooth((p - .5) / .5)
  if (returnWeight > 0) {
    const destinationAngle = captured.orientation === DEFAULT_NEEDLE_ORIENTATION ? -Math.PI / 4 : DEFAULT_NEEDLE_ORIENTATION
    pose = needlePose({ x: pose.tip.x + (hole.x - pose.tip.x) * returnWeight, y: pose.tip.y + (hole.y - pose.tip.y) * returnWeight },
      captured.orientation + (destinationAngle - captured.orientation) * returnWeight)
  }
  const extra = Math.max(0, travel - .86)
  return {
    pose,
    sourceShaft: travel < 1 ? [hole, pose.tail] : null,
    destinationShaft: travel > 0 ? [pose.tip, travel < 1 ? hole : pose.tail] : null,
    sourceEyeVisible: travel <= .86,
    destinationEyeVisible: travel > .86,
    sourceThreadEnd: travel <= .86 ? pose.eye : { ...hole },
    extraThread: extra > 0 ? createActiveThread(hole, pose.eye).points : [],
    pull: smooth((p - .56) / .38),
  }
}
