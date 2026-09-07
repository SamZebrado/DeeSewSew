import { inverseProjectFabricPoint, projectFabricPoint, type FabricProjectionGeometry, type FabricViewAngles } from './fabric-projection'
import { needlePose, type NeedlePose } from './needle-pose'
import { FABRIC_RADIUS, type NormalizedPoint } from './stitch-model'

/** Bounded screen-space fixed point: the eye is determined by the direction that
 * itself depends on the eye. Softening removes the center singularity; a small
 * upward weight prevents cancellation. No temporal state or frame-rate coupling. */
export function heldNeedlePose(tip: NormalizedPoint, view: FabricViewAngles, geometry: FabricProjectionGeometry, handedness: 1 | -1 = 1): NeedlePose {
  const screen = projectFabricPoint(tip, view, geometry)
  if (!screen) return needlePose(tip)
  const length = geometry.size * .075
  const radius = geometry.size * FABRIC_RADIUS
  const targetX = geometry.centerX + handedness * .14 * radius
  let dx = 0, dy = -1
  for (let i = 0; i < 12; i++) {
    const x = targetX - (screen.clientX - dx * length * .86)
    const y = geometry.centerY - (screen.clientY - dy * length * .86)
    const distance = Math.hypot(x, y, radius * .3)
    // An eye directly above the target otherwise admits two opposite leaning
    // solutions. Retain an upward floor there rather than choosing either branch.
    const angle = Math.atan2(x / distance, Math.max(.65, 1.45 - y / distance))
    const bounded = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, angle))
    dx = Math.sin(bounded); dy = -Math.cos(bounded)
  }
  const at = (fraction: number) => inverseProjectFabricPoint(screen.clientX - dx * length * fraction, screen.clientY - dy * length * fraction, view, geometry, true)
  const eye = at(.86), tail = at(1)
  if (!eye || !tail) return needlePose(tip)
  return { tip: { ...tip }, eye, tail, orientation: Math.atan2(tip.y - tail.y, tip.x - tail.x) }
}
