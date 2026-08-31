import { describe, expect, it } from 'vitest'
import {
  STITCH_MOTION_DURATION_MS,
  STITCH_MOTION_PHASES,
  STITCH_MOTION_VERSION,
  sampleStitchMotion,
  sampleStitchMotionProgress,
} from './stitch-motion'

describe('stitch motion sampler', () => {
  it('uses the short tightening duration and exact five-phase schedule', () => {
    expect(STITCH_MOTION_VERSION).toBe(2)
    expect(STITCH_MOTION_DURATION_MS).toBe(620)
    expect(STITCH_MOTION_PHASES).toEqual([
      { phase: 'press', start: 0, end: 0.18 },
      { phase: 'pierce', start: 0.18, end: 0.32 },
      { phase: 'tighten', start: 0.32, end: 0.78 },
      { phase: 'settle', start: 0.78, end: 0.92 },
      { phase: 'release', start: 0.92, end: 1 },
    ])
  })

  it('selects phases deterministically at every boundary', () => {
    expect([0, 0.18, 0.32, 0.78, 0.92, 1].map((progress) => sampleStitchMotionProgress(progress).phase)).toEqual([
      'press', 'pierce', 'tighten', 'settle', 'release', 'release',
    ])
  })

  it('pulls the thread, presses the fabric, pierces, and fully releases', () => {
    expect(sampleStitchMotionProgress(0).threadPull).toBe(0)
    expect(sampleStitchMotionProgress(0.1).dimple.depth).toBeGreaterThan(0)
    expect(sampleStitchMotionProgress(0.25).needlePosition).toBeLessThan(0)
    expect(sampleStitchMotionProgress(0.55).threadPull).toBeGreaterThan(0)
    expect(sampleStitchMotionProgress(0.85).threadPull).toBe(1)
    const settled = sampleStitchMotionProgress(1)
    expect(settled.threadPull).toBe(1)
    expect(settled.needleOpacity).toBe(0)
    expect(settled.dimple).toEqual({ depth: 0, radius: 0, opacity: 0 })
  })

  it('is pure, finite, and clamps invalid or out-of-range clocks', () => {
    expect(sampleStitchMotion(575)).toEqual(sampleStitchMotion(575))
    expect(sampleStitchMotion(-10)).toEqual(sampleStitchMotion(0))
    expect(sampleStitchMotion(Number.NaN)).toEqual(sampleStitchMotion(0))
    expect(sampleStitchMotion(9999)).toEqual(sampleStitchMotion(STITCH_MOTION_DURATION_MS))
    const sample = sampleStitchMotionProgress(0.73)
    const values = [sample.elapsedMs, sample.durationMs, sample.progress, sample.phaseProgress, sample.needlePosition,
      sample.needleOpacity, sample.threadPull, sample.dimple.depth, sample.dimple.radius, sample.dimple.opacity]
    expect(values.every(Number.isFinite)).toBe(true)
  })
})
