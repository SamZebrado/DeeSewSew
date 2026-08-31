import { describe, expect, it } from 'vitest'
import {
  DEFAULT_NEEDLE_DIAMETER,
  NEEDLE_PRESET_DIAMETERS,
  customNeedleDiameter,
  maximumClearanceRadius,
  needlePreset,
  normalizeNeedleDiameter,
  normalizeThreadGeometrySnapshot,
  parseThreadPassageSnapshot,
  projectOffsetToClearance,
  solveNeedleThreadPassage,
  type ThreadGeometrySnapshotV1,
  type ThreadPassageInputV1,
} from './needle-thread-physics'

const thread = (overrides: Partial<ThreadGeometrySnapshotV1> = {}): ThreadGeometrySnapshotV1 => ({
  version: 1,
  effectiveDiameterMm: 0.6,
  radialStiffness: 1,
  initialPackingFraction: 0.5,
  maxPackingFraction: 0.75,
  recovery: 0.5,
  ...overrides,
})

const passage = (overrides: Partial<ThreadPassageInputV1> = {}): ThreadPassageInputV1 => ({
  version: 1,
  needle: needlePreset('nm90'),
  thread: thread(),
  hole: { version: 1, majorDiameterMm: 1.2, minorDiameterMm: 1, rotationDeg: 0 },
  holeRadialStiffness: 1,
  availableEnergy: 10,
  ...overrides,
})

describe('needle and independent thread geometry', () => {
  it('maps NM labels to NM/100 millimetres and bounds custom diameters', () => {
    expect(Object.entries(NEEDLE_PRESET_DIAMETERS)).toEqual([
      ['nm60', 0.6], ['nm75', 0.75], ['nm90', 0.9], ['nm110', 1.1], ['nm130', 1.3],
    ])
    expect(needlePreset('nm110')).toEqual({ version: 1, source: 'preset', presetId: 'nm110', diameterMm: 1.1 })
    expect(customNeedleDiameter(0.01).diameterMm).toBe(0.5)
    expect(customNeedleDiameter(8).diameterMm).toBe(2)
    expect(normalizeNeedleDiameter({ version: 1, source: 'custom', diameterMm: Number.NaN })).toEqual({
      version: 1, source: 'custom', diameterMm: DEFAULT_NEEDLE_DIAMETER.diameterMm,
    })
  })

  it('normalizes thread diameter independently with field-level packing fallback', () => {
    expect(normalizeThreadGeometrySnapshot({
      version: 1,
      effectiveDiameterMm: 9,
      radialStiffness: 0,
      initialPackingFraction: 0.7,
      maxPackingFraction: 0.3,
      recovery: Number.NaN,
    })).toEqual({
      version: 1,
      effectiveDiameterMm: 2.4,
      radialStiffness: 0.25,
      initialPackingFraction: 0.7,
      maxPackingFraction: 0.7,
      recovery: 0.54,
    })
  })
})

describe('bounded needle-hole/thread fit', () => {
  it('free-passes a thin line through a large hole without deformation or fit energy', () => {
    const result = solveNeedleThreadPassage(passage({
      requestedOffset: { xMm: 99, yMm: 0 },
    }))
    expect(result).toMatchObject({
      result: 'free-pass',
      committable: true,
      interferenceMm: 0,
      holeExpansionMm: 0,
      threadCompressionMm: 0,
      fitEnergy: 0,
    })
    expect(result.settledOffset.xMm).toBeCloseTo(result.clearance.semiMajorMm, 8)
  })

  it('shares feasible interference between two bounded compliant bodies and conserves fiber area', () => {
    const result = solveNeedleThreadPassage(passage({
      thread: thread({ effectiveDiameterMm: 1, initialPackingFraction: 0.4, maxPackingFraction: 0.78 }),
      hole: { version: 1, majorDiameterMm: 1, minorDiameterMm: 0.9, rotationDeg: 25 },
    }))
    expect(result.result).toBe('compressed-pass')
    expect(result.holeExpansionMm + result.threadCompressionMm).toBeCloseTo(result.interferenceMm, 8)
    expect(result.holeExpansionMm).toBeLessThanOrEqual(result.holeExpansionLimitMm)
    expect(result.threadCompressionMm).toBeLessThanOrEqual(result.threadCompressionLimitMm)
    const reconstructed = result.finalPackingFraction * Math.PI * result.compressedThreadDiameterMm ** 2 / 4
    expect(Math.abs(reconstructed - result.solidFiberAreaMm2)).toBeLessThan(1e-8)
    expect(result.packingAreaErrorMm2).toBeLessThan(1e-8)
  })

  it('moves deformation toward the softer body', () => {
    const common = {
      thread: thread({ effectiveDiameterMm: 1, initialPackingFraction: 0.4, maxPackingFraction: 0.78 }),
      hole: { version: 1 as const, majorDiameterMm: 1, minorDiameterMm: 0.9, rotationDeg: 0 },
    }
    const softHole = solveNeedleThreadPassage(passage({ ...common, holeRadialStiffness: 0.25,
      thread: { ...common.thread, radialStiffness: 4 } }))
    const softThread = solveNeedleThreadPassage(passage({ ...common, holeRadialStiffness: 4,
      thread: { ...common.thread, radialStiffness: 0.25 } }))
    expect(softHole.requiredHoleExpansionMm).toBeGreaterThan(softHole.requiredThreadCompressionMm)
    expect(softThread.requiredThreadCompressionMm).toBeGreaterThan(softThread.requiredHoleExpansionMm)
  })

  it('distinguishes insufficient fit energy from an impossible jam and applies neither permanently', () => {
    const needsEnergy = solveNeedleThreadPassage(passage({
      availableEnergy: 0,
      thread: thread({ effectiveDiameterMm: 1, initialPackingFraction: 0.4, maxPackingFraction: 0.78 }),
      hole: { version: 1, majorDiameterMm: 1, minorDiameterMm: 0.9, rotationDeg: 0 },
    }))
    expect(needsEnergy).toMatchObject({
      result: 'thread-fit-energy', committable: false, holeExpansionMm: 0, threadCompressionMm: 0,
    })
    expect(needsEnergy.fitEnergy).toBeGreaterThan(0)

    const jam = solveNeedleThreadPassage(passage({
      thread: thread({ effectiveDiameterMm: 2.4, initialPackingFraction: 0.7, maxPackingFraction: 0.7 }),
      hole: { version: 1, majorDiameterMm: 0.5, minorDiameterMm: 0.5, rotationDeg: 0 },
      needle: customNeedleDiameter(0.5),
    }))
    expect(jam).toMatchObject({ result: 'thread-jam', committable: false, holeExpansionMm: 0, threadCompressionMm: 0 })
    expect(jam.unresolvedInterferenceMm).toBeGreaterThan(0)
  })

  it('projects free settle offsets into the rotated clearance ellipse analytically', () => {
    const clearance = { version: 1 as const, semiMajorMm: 2, semiMinorMm: 1, rotationDeg: 30 }
    const projected = projectOffsetToClearance({ xMm: 9, yMm: -3 }, clearance)
    const radians = -30 * Math.PI / 180
    const localX = projected.xMm * Math.cos(radians) - projected.yMm * Math.sin(radians)
    const localY = projected.xMm * Math.sin(radians) + projected.yMm * Math.cos(radians)
    expect((localX / 2) ** 2 + localY ** 2).toBeLessThanOrEqual(1 + 1e-8)
    expect(maximumClearanceRadius(clearance, 30)).toBeCloseTo(2, 8)
    expect(maximumClearanceRadius(clearance, 120)).toBeCloseTo(1, 8)
  })

  it('round trips strict snapshots and rejects embedded unknown fields', () => {
    const result = solveNeedleThreadPassage(passage())
    expect(parseThreadPassageSnapshot(JSON.parse(JSON.stringify(result)))).toEqual(result)
    expect(parseThreadPassageSnapshot({ ...result, rawPressure: 0.7 })).toBeNull()
    expect(parseThreadPassageSnapshot({ ...result, fitEnergy: result.fitEnergy + 1 })).toBeNull()
  })
})
