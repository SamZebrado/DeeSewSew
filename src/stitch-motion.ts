export type StitchMotionPhase = 'press' | 'pierce' | 'tighten' | 'settle' | 'release'

export interface StitchMotionSampleV2 {
  version: 2
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

export const STITCH_MOTION_VERSION = 2
export const STITCH_MOTION_DURATION_MS = 620

export const STITCH_MOTION_PHASES: readonly StitchMotionPhaseWindow[] = Object.freeze([
  Object.freeze({ phase: 'press', start: 0, end: 0.18 }),
  Object.freeze({ phase: 'pierce', start: 0.18, end: 0.32 }),
  Object.freeze({ phase: 'tighten', start: 0.32, end: 0.78 }),
  Object.freeze({ phase: 'settle', start: 0.78, end: 0.92 }),
  Object.freeze({ phase: 'release', start: 0.92, end: 1 }),
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

export function sampleStitchMotionProgress(value: number): StitchMotionSampleV2 {
  const progress = clamp01(value)
  const window = phaseAt(progress)
  const phaseProgress = clamp01((progress - window.start) / (window.end - window.start))
  let needlePosition = 0.72
  let needleOpacity = 1
  let threadPull = 0
  let dimpleDepth = 0
  let dimpleRadius = 0
  let dimpleOpacity = 0

  switch (window.phase) {
    case 'press': {
      const eased = smoothstep(phaseProgress)
      needlePosition = lerp(0.72, 0.03, eased)
      dimpleDepth = 0.9 * eased
      dimpleRadius = eased === 0 ? 0 : lerp(0.62, 1, eased)
      dimpleOpacity = 0.78 * eased
      break
    }
    case 'pierce': {
      const eased = smoothstep(phaseProgress)
      needlePosition = lerp(0.02, -1, eased)
      threadPull = 0
      dimpleDepth = lerp(0.9, 0.72, eased)
      dimpleRadius = lerp(1, 0.9, eased)
      dimpleOpacity = lerp(0.78, 0.62, eased)
      break
    }
    case 'tighten': {
      const eased = smoothstep(phaseProgress)
      needlePosition = -1
      needleOpacity = lerp(0.78, 0.32, eased)
      threadPull = eased
      dimpleDepth = lerp(0.72, 0.24, eased)
      dimpleRadius = lerp(0.9, 0.5, eased)
      dimpleOpacity = lerp(0.62, 0.22, eased)
      break
    }
    case 'settle': {
      const eased = smoothstep(phaseProgress)
      needlePosition = -1
      needleOpacity = lerp(0.32, 0.16, eased)
      threadPull = 1
      dimpleDepth = 0.24 * (1 - eased)
      dimpleRadius = 0.5 * (1 - eased)
      dimpleOpacity = 0.22 * (1 - eased)
      break
    }
    case 'release': {
      const remaining = 1 - easeOutCubic(phaseProgress)
      needlePosition = -1
      needleOpacity = 0.16 * remaining
      threadPull = 1
      dimpleDepth = 0
      dimpleRadius = 0
      dimpleOpacity = 0
      break
    }
  }

  return {
    version: 2,
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

export function sampleStitchMotion(elapsedMs: number): StitchMotionSampleV2 {
  const safeElapsed = Number.isFinite(elapsedMs) ? Math.min(STITCH_MOTION_DURATION_MS, Math.max(0, elapsedMs)) : 0
  return sampleStitchMotionProgress(safeElapsed / STITCH_MOTION_DURATION_MS)
}
