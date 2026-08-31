import { describe, expect, it } from 'vitest'
import { getLightingProfile } from './lighting'
import type { Stitch } from './stitch-model'
import { createThreadMaterialSnapshot, getThreadMaterialPreset } from './thread-materials'
import { customNeedleDiameter, type ThreadGeometrySnapshotV1 } from './needle-thread-physics'
import {
  deriveNeedleHoleVisual,
  deriveThreadVisualStyle,
  seededUnit,
  stitchRenderKey,
} from './renderer-style'

const baseStitch = (): Stitch => ({
  id: 'stitch-1',
  type: 'running',
  start: { x: 0.2, y: 0.3 },
  end: { x: 0.7, y: 0.6 },
  color: '#74516f',
  width: 3.8,
  order: 1,
  seed: 17,
})

describe('renderer style snapshots', () => {
  it('falls back to deterministic stranded cotton when a stitch has no material', () => {
    const lighting = getLightingProfile('soft-daylight')
    const first = deriveThreadVisualStyle(baseStitch(), lighting)
    const second = deriveThreadVisualStyle(baseStitch(), lighting)
    expect(first).toEqual(second)
    expect(first.material.sourceId).toBe('stranded-cotton')
    expect(first.strandCount).toBe(6)
  })

  it('uses each stitch material snapshot without coupling it to lighting', () => {
    const stitch = baseStitch()
    stitch.material = createThreadMaterialSnapshot(getThreadMaterialPreset('metallic-composite'))
    const warm = deriveThreadVisualStyle(stitch, getLightingProfile('warm-lamp'))
    const cool = deriveThreadVisualStyle(stitch, getLightingProfile('cool-side-light'))
    expect(warm.material).toEqual(cool.material)
    expect(warm.baseColor).not.toBe(cool.baseColor)
    expect(warm.metallic).toBeGreaterThan(0.9)
  })

  it('includes material, force, and entry pose in the settled render key', () => {
    const stitch = baseStitch()
    const original = stitchRenderKey(stitch)
    expect(stitchRenderKey({ ...stitch, force: 'firm' })).not.toBe(original)
    expect(stitchRenderKey({ ...stitch, needlePose: { version: 1, azimuthDeg: 35, inclinationFromNormalDeg: 45 } })).not.toBe(original)
    expect(stitchRenderKey({ ...stitch, material: createThreadMaterialSnapshot(getThreadMaterialPreset('satin-rayon')) })).not.toBe(original)
  })

  it('derives a larger angled opening from force and inclination', () => {
    const normal = deriveNeedleHoleVisual(baseStitch())
    const angled = deriveNeedleHoleVisual({ ...baseStitch(), force: 'firm', needlePose: { version: 1, azimuthDeg: 90, inclinationFromNormalDeg: 70 } })
    expect(angled.radiusAt640).toBeGreaterThan(normal.radiusAt640)
    expect(angled.aspectRatio).toBe(1.8)
    expect(angled.rotationRad).toBeCloseTo(0)
  })

  it('keeps thread diameter and needle diameter as independent visual inputs', () => {
    const lighting = getLightingProfile('soft-daylight')
    const thickGeometry: ThreadGeometrySnapshotV1 = {
      version: 1,
      effectiveDiameterMm: 1.2,
      radialStiffness: 1,
      initialPackingFraction: 0.55,
      maxPackingFraction: 0.75,
      recovery: 0.54,
    }
    const base = baseStitch()
    const thickStitch: Stitch = { ...base, threadGeometry: thickGeometry }
    const thickThread = deriveThreadVisualStyle(thickStitch, lighting)
    const largeNeedle = { ...base, needleDiameter: customNeedleDiameter(1.3) }
    expect(thickThread.widthScale).toBe(2)
    expect(deriveNeedleHoleVisual(thickStitch)).toEqual(deriveNeedleHoleVisual(base))
    expect(deriveThreadVisualStyle(largeNeedle, lighting).widthScale).toBe(deriveThreadVisualStyle(base, lighting).widthScale)
    expect(deriveNeedleHoleVisual(largeNeedle).radiusAt640).toBeGreaterThan(deriveNeedleHoleVisual(base).radiusAt640)
  })

  it('uses a saved fuzz density, stiffness, and seed over legacy material defaults', () => {
    const style = deriveThreadVisualStyle({
      ...baseStitch(),
      fuzzMaterial: { version: 1, density: 0.84, stiffness: 0.91, seed: 42, generatorVersion: 1 },
    }, getLightingProfile('soft-daylight'))
    expect(style.fuzzDensity).toBe(0.84)
    expect(style.fuzzMaterial).toMatchObject({ stiffness: 0.91, seed: 42 })
  })

  it('uses stable seeded values instead of frame-time randomness', () => {
    const values = Array.from({ length: 32 }, (_, index) => seededUnit(index + 1))
    expect(values).toEqual(Array.from({ length: 32 }, (_, index) => seededUnit(index + 1)))
    expect(values.every((value) => value >= 0 && value < 1)).toBe(true)
  })
})
