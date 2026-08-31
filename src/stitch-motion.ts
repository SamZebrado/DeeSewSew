export type StitchMotionPhase = 'emerge' | 'pull' | 'press' | 'pierce' | 'release'

export interface StitchMotionSampleV1 {
  version: 1
  elapsedMs: number
  durationMs: number
  progress: number
  phase: StitchMotionPhase
  phaseProgress: number
  /** -1 is below the fabric, 0 is at the surface, and +1 is above it. */
  needlePosition: number
  needleOpacity: number
  threadPull: number
  dimple: {
    depth: number
    radius: number
    opacity: number
  }
}

export interface StitchMotionPhaseWindow {
  phase: StitchMotionPhase
  start: number
  end: number
}

export const STITCH_MOTION_VERSION = 1
export const STITCH_MOTION_DURATION_MS = 1150

export const STITCH_MOTION_PHASES: readonly StitchMotionPhaseWindow[] = Object.freeze([
  Object.freeze({ phase: 'emerge', start: 0, end: 0.2 }),
  Object.freeze({ phase: 'pull', start: 0.2, end: 0.6 }),
  Object.freeze({ phase: 'press', start: 0.6, end: 0.78 }),
  Object.freeze({ phase: 'pierce', start: 0.78, end: 0.9 }),
  Object.freeze({ phase: 'release', start: 0.9, end: 1 }),
])

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

function lerp(start: number, end: number, amount: number): number {
  return start + (end - start) * amount
}

function smoothstep(value: number): number {
  const progress = clamp01(value)
  return progress * progress * (3 - 2 * progress)
}

function easeOutCubic(value: number): number {
  const progress = clamp01(value)
  return 1 - (1 - progress) ** 3
}

function phaseAt(progress: number): StitchMotionPhaseWindow {
  return STITCH_MOTION_PHASES.find((window) => progress < window.end) ?? STITCH_MOTION_PHASES[STITCH_MOTION_PHASES.length - 1]!
}

function rounded(value: number): number {
  if (value === 0 || value === 1 || value === -1) return value
  return Number(value.toFixed(6))
}

export function sampleStitchMotionProgress(value: number): StitchMotionSampleV1 {
  const progress = clamp01(value)
  const window = phaseAt(progress)
  const phaseProgress = clamp01((progress - window.start) / (window.end - window.start))
  let needlePosition = -1
  let needleOpacity = 1
  let threadPull = 0
  let dimpleDepth = 0
  let dimpleRadius = 0
  let dimpleOpacity = 0

  switch (window.phase) {
    case 'emerge': {
      const eased = easeOutCubic(phaseProgress)
      needlePosition = lerp(-1, 0.92, eased)
      needleOpacity = eased
      break
    }
    case 'pull': {
      const eased = smoothstep(phaseProgress)
      needlePosition = lerp(0.92, 0.68, eased)
      threadPull = eased
      break
    }
    case 'press': {
      const eased = smoothstep(phaseProgress)
      needlePosition = lerp(0.68, 0.02, eased)
      threadPull = 1
      dimpleDepth = 0.9 * eased
      dimpleRadius = eased === 0 ? 0 : lerp(0.62, 1, eased)
      dimpleOpacity = 0.78 * eased
      break
    }
    case 'pierce': {
      const eased = smoothstep(phaseProgress)
      needlePosition = lerp(0.02, -1, eased)
      threadPull = 1
      dimpleDepth = lerp(0.9, 0.72, eased)
      dimpleRadius = lerp(1, 0.9, eased)
      dimpleOpacity = lerp(0.78, 0.62, eased)
      break
    }
    case 'release': {
      const remaining = 1 - easeOutCubic(phaseProgress)
      needlePosition = -1
      needleOpacity = remaining
      threadPull = 1
      dimpleDepth = 0.72 * remaining
      dimpleRadius = 0.9 * remaining
      dimpleOpacity = 0.62 * remaining
      break
    }
  }

  return {
    version: 1,
    elapsedMs: rounded(progress * STITCH_MOTION_DURATION_MS),
    durationMs: STITCH_MOTION_DURATION_MS,
    progress: rounded(progress),
    phase: window.phase,
    phaseProgress: rounded(phaseProgress),
    needlePosition: rounded(needlePosition),
    needleOpacity: rounded(needleOpacity),
    threadPull: rounded(threadPull),
    dimple: {
      depth: rounded(dimpleDepth),
      radius: rounded(dimpleRadius),
      opacity: rounded(dimpleOpacity),
    },
  }
}

export function sampleStitchMotion(elapsedMs: number): StitchMotionSampleV1 {
  const safeElapsed = Number.isFinite(elapsedMs) ? Math.min(STITCH_MOTION_DURATION_MS, Math.max(0, elapsedMs)) : 0
  return sampleStitchMotionProgress(safeElapsed / STITCH_MOTION_DURATION_MS)
}
