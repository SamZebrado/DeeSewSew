import { describe, expect, it } from 'vitest'
import {
  AUTO_YAW_DEGREES_PER_SECOND,
  HoopViewController,
  MAX_PITCH_DEGREES,
  touchTargetOffset,
  wrapDegrees,
} from './hoop-view-controller'

describe('hoop view controller', () => {
  it('starts aligned to a stitchable front and snaps deterministically between faces', () => {
    const view = new HoopViewController()
    expect(view.snapshot()).toMatchObject({ yawDeg: 0, pitchDeg: 0, alignedFace: 'front', stitchable: true })
    view.snapBack()
    expect(view.snapshot()).toMatchObject({ yawDeg: 180, alignedFace: 'back', stitchable: false })
    view.snapFront()
    expect(view.snapshot()).toMatchObject({ yawDeg: 0, alignedFace: 'front', stitchable: true })
  })

  it('auto-rotates from the current yaw at the fixed slow rate and freezes when stopped', () => {
    const view = new HoopViewController()
    view.handleKey('ArrowRight')
    const startingYaw = view.snapshot().yawDeg
    expect(view.startAuto(1_000)).toBe(true)
    expect(view.tick(2_000)).toBe(true)
    expect(view.snapshot().yawDeg).toBeCloseTo(startingYaw + AUTO_YAW_DEGREES_PER_SECOND, 6)
    expect(view.stopAuto()).toBe(true)
    const frozen = view.snapshot().yawDeg
    expect(view.tick(3_000)).toBe(false)
    expect(view.snapshot().yawDeg).toBe(frozen)
  })

  it('lets one pointer take over without inertia, clamps pitch, and ignores other pointers', () => {
    const view = new HoopViewController()
    expect(view.beginGesture(7, 100, 100)).toBe(true)
    expect(view.beginGesture(8, 100, 100)).toBe(false)
    expect(view.updateGesture(8, 200, 0, 100)).toBe(false)
    expect(view.updateGesture(7, 200, -100, 100)).toBe(true)
    expect(view.snapshot()).toMatchObject({ yawDeg: 180, pitchDeg: MAX_PITCH_DEGREES, gestureActive: true })
    expect(view.endGesture(8)).toBe(false)
    expect(view.endGesture(7)).toBe(true)
    const frozen = view.snapshot()
    expect(view.tick(10_000)).toBe(false)
    expect(view.snapshot()).toEqual(frozen)
  })

  it('keeps the last manual angle when a gesture is cancelled', () => {
    const view = new HoopViewController()
    view.beginGesture(3, 0, 0)
    view.updateGesture(3, 50, 20, 200)
    const beforeCancel = view.snapshot()
    expect(view.cancelGesture(3)).toBe(true)
    expect(view.snapshot()).toMatchObject({ yawDeg: beforeCancel.yawDeg, pitchDeg: beforeCancel.pitchDeg, gestureActive: false })
  })

  it('disables automatic motion under reduced motion while preserving direct manipulation', () => {
    const view = new HoopViewController(true)
    expect(view.startAuto(0)).toBe(false)
    expect(view.beginGesture(1, 0, 0)).toBe(true)
    expect(view.updateGesture(1, 40, 0, 200)).toBe(true)
    view.endGesture(1)
    expect(view.snapshot().yawDeg).toBe(36)
    view.setReducedMotion(false)
    expect(view.startAuto(100)).toBe(true)
    view.setReducedMotion(true)
    expect(view.snapshot().mode).toBe('manual')
  })

  it('supports bounded keyboard increments and front/back shortcuts', () => {
    const view = new HoopViewController()
    expect(view.handleKey('ArrowLeft')).toBe(true)
    expect(view.snapshot().yawDeg).toBe(345)
    expect(view.handleKey('Home')).toBe(true)
    for (let index = 0; index < 8; index += 1) view.handleKey('ArrowUp')
    expect(view.snapshot()).toMatchObject({ pitchDeg: MAX_PITCH_DEGREES, face: 'front', alignedFace: null, stitchable: false })
    expect(view.handleKey('End')).toBe(true)
    expect(view.snapshot().alignedFace).toBe('back')
    expect(view.handleKey('Home')).toBe(true)
    expect(view.snapshot().stitchable).toBe(true)
    expect(view.handleKey('Enter')).toBe(false)
  })
})

describe('view geometry helpers', () => {
  it('wraps yaw without changing equivalent orientations', () => {
    expect(wrapDegrees(-15)).toBe(345)
    expect(wrapDegrees(735)).toBe(15)
  })

  it('keeps the touch target offset in the center and fades it near the circular fabric edge', () => {
    const bounds = { left: 0, top: 0, width: 300, height: 300 }
    const radius = .435
    expect(touchTargetOffset(150, 150, bounds, radius)).toBe(34)
    expect(touchTargetOffset(150, 19.5, bounds, radius)).toBe(0)
    expect(touchTargetOffset(280.5, 150, bounds, radius)).toBe(0)
    expect(touchTargetOffset(150, 39.5, bounds, radius)).toBeGreaterThan(0)
    expect(touchTargetOffset(150, 39.5, bounds, radius)).toBeLessThan(34)
    expect(touchTargetOffset(260.5, 150, bounds, radius)).toBeCloseTo(touchTargetOffset(150, 39.5, bounds, radius), 8)
  })
})
