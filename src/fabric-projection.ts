import { FABRIC_RADIUS, type NormalizedPoint } from './stitch-model'

export type FabricInteractionState = 'editable' | 'limited' | 'inspect-only'

export interface FabricProjectionGeometry {
  centerX: number
  centerY: number
  size: number
  perspectivePx: number
}

export interface FabricViewAngles {
  yawDeg: number
  pitchDeg: number
}

export interface ProjectedFabricPoint {
  clientX: number
  clientY: number
  depth: number
}

const radians = (degrees: number): number => degrees * Math.PI / 180

export function projectionStability(view: FabricViewAngles): number {
  return Math.abs(Math.cos(radians(view.yawDeg)) * Math.cos(radians(view.pitchDeg)))
}

export function classifyFabricInteraction(view: FabricViewAngles): FabricInteractionState {
  const stability = projectionStability(view)
  if (stability >= .5) return 'editable'
  if (stability >= .3) return 'limited'
  return 'inspect-only'
}

function validGeometry(geometry: FabricProjectionGeometry): boolean {
  return [geometry.centerX, geometry.centerY, geometry.size, geometry.perspectivePx].every(Number.isFinite)
    && geometry.size > 0 && geometry.perspectivePx > geometry.size * .55
}

/** Mirrors the CSS rotateX(pitch) rotateY(yaw) fabric-plane transform. */
export function projectFabricPoint(point: NormalizedPoint, view: FabricViewAngles, geometry: FabricProjectionGeometry): ProjectedFabricPoint | null {
  if (!validGeometry(geometry) || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return null
  const yaw = radians(view.yawDeg)
  const pitch = radians(view.pitchDeg)
  const x = (point.x - .5) * geometry.size
  const y = (point.y - .5) * geometry.size
  const cosineYaw = Math.cos(yaw)
  const sineYaw = Math.sin(yaw)
  const cosinePitch = Math.cos(pitch)
  const sinePitch = Math.sin(pitch)
  const transformedX = cosineYaw * x
  const transformedY = sinePitch * sineYaw * x + cosinePitch * y
  const transformedZ = -cosinePitch * sineYaw * x + sinePitch * y
  const denominator = geometry.perspectivePx - transformedZ
  if (denominator <= geometry.perspectivePx * .08) return null
  const scale = geometry.perspectivePx / denominator
  return {
    clientX: geometry.centerX + transformedX * scale,
    clientY: geometry.centerY + transformedY * scale,
    depth: transformedZ,
  }
}

export function inverseProjectFabricPoint(clientX: number, clientY: number, view: FabricViewAngles, geometry: FabricProjectionGeometry): NormalizedPoint | null {
  if (!validGeometry(geometry) || !Number.isFinite(clientX) || !Number.isFinite(clientY)
    || classifyFabricInteraction(view) === 'inspect-only') return null
  const yaw = radians(view.yawDeg)
  const pitch = radians(view.pitchDeg)
  const cosineYaw = Math.cos(yaw)
  const sineYaw = Math.sin(yaw)
  const cosinePitch = Math.cos(pitch)
  const sinePitch = Math.sin(pitch)
  const screenX = clientX - geometry.centerX
  const screenY = clientY - geometry.centerY
  const perspective = geometry.perspectivePx

  // Rotation coefficients for x2 = ax + by, y2 = ex + fy, z2 = cx + dy.
  const a = cosineYaw
  const b = 0
  const e = sinePitch * sineYaw
  const f = cosinePitch
  const c = -cosinePitch * sineYaw
  const d = sinePitch
  const leftA = perspective * a + screenX * c
  const leftB = perspective * b + screenX * d
  const rightA = screenY * c + perspective * e
  const rightB = screenY * d + perspective * f
  const determinant = leftA * rightB - leftB * rightA
  if (!Number.isFinite(determinant) || Math.abs(determinant) < perspective * perspective * .02) return null
  const targetX = screenX * perspective
  const targetY = screenY * perspective
  const x = (targetX * rightB - leftB * targetY) / determinant
  const y = (leftA * targetY - targetX * rightA) / determinant
  const point = { x: x / geometry.size + .5, y: y / geometry.size + .5 }
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)
    || Math.hypot(point.x - .5, point.y - .5) > FABRIC_RADIUS) return null
  return point
}
