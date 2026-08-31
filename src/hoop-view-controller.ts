import { classifyFabricInteraction, type FabricInteractionState } from './fabric-projection'

export type HoopFace = 'front' | 'edge' | 'back'
export type AlignedHoopFace = 'front' | 'back' | null
export type HoopViewMode = 'manual' | 'auto'

export interface HoopViewSnapshot {
  yawDeg: number
  pitchDeg: number
  mode: HoopViewMode
  face: HoopFace
  alignedFace: AlignedHoopFace
  frontAligned: boolean
  backAligned: boolean
  interactionState: FabricInteractionState
  stitchable: boolean
  gestureActive: boolean
}

interface ViewGesture {
  pointerId: number
  startX: number
  startY: number
  startYawDeg: number
  startPitchDeg: number
}

export const AUTO_YAW_DEGREES_PER_SECOND = 22.5
export const MAX_PITCH_DEGREES = 18
export const KEYBOARD_YAW_STEP_DEGREES = 15
export const KEYBOARD_PITCH_STEP_DEGREES = 5

const ALIGNMENT_TOLERANCE_DEGREES = .5
const EDGE_FACING_THRESHOLD = .18
const DRAG_YAW_DEGREES_PER_WIDTH = 180
const DRAG_PITCH_DEGREES_PER_HEIGHT = 90
const MAX_AUTO_DELTA_MS = 1_000

const clamp = (value: number, minimum: number, maximum: number): number => Math.max(minimum, Math.min(maximum, value))

export function wrapDegrees(value: number): number {
  const wrapped = value % 360
  return wrapped < 0 ? wrapped + 360 : wrapped
}

function angularDistance(first: number, second: number): number {
  const distance = Math.abs(wrapDegrees(first) - wrapDegrees(second))
  return Math.min(distance, 360 - distance)
}

function smoothstep(value: number): number {
  const amount = clamp(value, 0, 1)
  return amount * amount * (3 - 2 * amount)
}

export interface TouchTargetBounds {
  left: number
  top: number
  width: number
  height: number
}

export function touchTargetOffset(clientX: number, clientY: number, bounds: TouchTargetBounds, normalizedRadius: number, maximumOffset = 34): number {
  const { left, top, width, height } = bounds
  if (![clientX, clientY, left, top, width, height, normalizedRadius, maximumOffset].every(Number.isFinite)) return 0
  if (width <= 0 || height <= 0 || normalizedRadius <= 0 || maximumOffset <= 0) return 0
  const normalizedX = (clientX - left) / width
  const normalizedY = (clientY - top) / height
  const radialDistance = Math.hypot(normalizedX - .5, normalizedY - .5)
  const edgeDistance = Math.max(0, (normalizedRadius - radialDistance) * Math.min(width, height))
  const fadeDistance = Math.max(1, maximumOffset * 2)
  return maximumOffset * smoothstep(edgeDistance / fadeDistance)
}

export class HoopViewController {
  private yawDeg = 0
  private pitchDeg = 0
  private mode: HoopViewMode = 'manual'
  private reducedMotion: boolean
  private lastAutoTimestamp: number | null = null
  private gesture: ViewGesture | null = null

  constructor(reducedMotion = false) {
    this.reducedMotion = reducedMotion
  }

  snapshot(): HoopViewSnapshot {
    const yaw = wrapDegrees(this.yawDeg)
    const pitchAligned = Math.abs(this.pitchDeg) <= ALIGNMENT_TOLERANCE_DEGREES
    const frontAligned = pitchAligned && angularDistance(yaw, 0) <= ALIGNMENT_TOLERANCE_DEGREES
    const backAligned = pitchAligned && angularDistance(yaw, 180) <= ALIGNMENT_TOLERANCE_DEGREES
    const facing = Math.cos(yaw * Math.PI / 180)
    const face: HoopFace = facing >= EDGE_FACING_THRESHOLD ? 'front' : facing <= -EDGE_FACING_THRESHOLD ? 'back' : 'edge'
    const alignedFace: AlignedHoopFace = frontAligned ? 'front' : backAligned ? 'back' : null
    const interactionState = classifyFabricInteraction({ yawDeg: yaw, pitchDeg: this.pitchDeg })
    return {
      yawDeg: yaw,
      pitchDeg: this.pitchDeg,
      mode: this.mode,
      face,
      alignedFace,
      frontAligned,
      backAligned,
      interactionState,
      stitchable: interactionState !== 'inspect-only' && this.mode === 'manual' && this.gesture === null,
      gestureActive: this.gesture !== null,
    }
  }

  setReducedMotion(reducedMotion: boolean): void {
    this.reducedMotion = reducedMotion
    if (reducedMotion) this.stopAuto()
  }

  startAuto(timestamp: number): boolean {
    if (this.reducedMotion || this.gesture) return false
    this.mode = 'auto'
    this.lastAutoTimestamp = Number.isFinite(timestamp) ? timestamp : null
    return true
  }

  stopAuto(): boolean {
    const wasAuto = this.mode === 'auto'
    this.mode = 'manual'
    this.lastAutoTimestamp = null
    return wasAuto
  }

  tick(timestamp: number): boolean {
    if (this.mode !== 'auto' || !Number.isFinite(timestamp)) return false
    if (this.lastAutoTimestamp === null) {
      this.lastAutoTimestamp = timestamp
      return false
    }
    const deltaMs = clamp(timestamp - this.lastAutoTimestamp, 0, MAX_AUTO_DELTA_MS)
    this.lastAutoTimestamp = timestamp
    if (deltaMs === 0) return false
    this.yawDeg = wrapDegrees(this.yawDeg + AUTO_YAW_DEGREES_PER_SECOND * deltaMs / 1_000)
    return true
  }

  beginGesture(pointerId: number, clientX: number, clientY: number): boolean {
    if (this.gesture || !Number.isFinite(clientX) || !Number.isFinite(clientY)) return false
    this.stopAuto()
    this.gesture = {
      pointerId,
      startX: clientX,
      startY: clientY,
      startYawDeg: this.yawDeg,
      startPitchDeg: this.pitchDeg,
    }
    return true
  }

  updateGesture(pointerId: number, clientX: number, clientY: number, viewportSize: number): boolean {
    if (!this.gesture || this.gesture.pointerId !== pointerId || !Number.isFinite(clientX) || !Number.isFinite(clientY) || viewportSize <= 0) return false
    const yawDelta = (clientX - this.gesture.startX) / viewportSize * DRAG_YAW_DEGREES_PER_WIDTH
    const pitchDelta = -(clientY - this.gesture.startY) / viewportSize * DRAG_PITCH_DEGREES_PER_HEIGHT
    this.yawDeg = wrapDegrees(this.gesture.startYawDeg + yawDelta)
    this.pitchDeg = clamp(this.gesture.startPitchDeg + pitchDelta, -MAX_PITCH_DEGREES, MAX_PITCH_DEGREES)
    return true
  }

  endGesture(pointerId: number): boolean {
    if (!this.gesture || this.gesture.pointerId !== pointerId) return false
    this.gesture = null
    return true
  }

  cancelGesture(pointerId: number): boolean {
    return this.endGesture(pointerId)
  }

  snapFront(): void {
    this.stopAuto()
    this.gesture = null
    this.yawDeg = 0
    this.pitchDeg = 0
  }

  snapBack(): void {
    this.stopAuto()
    this.gesture = null
    this.yawDeg = 180
    this.pitchDeg = 0
  }

  handleKey(key: string): boolean {
    if (key === 'Home') { this.snapFront(); return true }
    if (key === 'End') { this.snapBack(); return true }
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(key)) return false
    this.stopAuto()
    this.gesture = null
    if (key === 'ArrowLeft') this.yawDeg = wrapDegrees(this.yawDeg - KEYBOARD_YAW_STEP_DEGREES)
    else if (key === 'ArrowRight') this.yawDeg = wrapDegrees(this.yawDeg + KEYBOARD_YAW_STEP_DEGREES)
    else if (key === 'ArrowUp') this.pitchDeg = clamp(this.pitchDeg + KEYBOARD_PITCH_STEP_DEGREES, -MAX_PITCH_DEGREES, MAX_PITCH_DEGREES)
    else this.pitchDeg = clamp(this.pitchDeg - KEYBOARD_PITCH_STEP_DEGREES, -MAX_PITCH_DEGREES, MAX_PITCH_DEGREES)
    return true
  }
}
