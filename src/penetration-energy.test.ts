import { describe, expect, it } from 'vitest'
import { needlePreset } from './needle-thread-physics'
import {
  MAX_PENETRATION_LAYERS,
  evaluatePenetrationEnergy,
  parsePenetrationTrace,
  penetrationTransmission,
  type PenetrationInputV1,
  type PenetrationLayerInputV1,
} from './penetration-energy'

const layer = (overrides: Partial<PenetrationLayerInputV1> = {}): PenetrationLayerInputV1 => ({
  version: 1,
  layerId: 'layer-a',
  edgeId: 'edge-a',
  u: 0.37,
  thickness: 1,
  radialHardness: 1,
  separationToughness: 0.4,
  friction: 0.25,
  compaction: 0.5,
  recovery: 0.5,
  lineDiameterMm: 0.6,
  crossAngleDeg: 20,
  existingOpeningMinorMm: 0,
  ...overrides,
})

const input = (overrides: Partial<PenetrationInputV1> = {}): PenetrationInputV1 => ({
  version: 1,
  modelId: 'pem-v1',
  mappedEnergy: 8,
  needle: needlePreset('nm90'),
  needleAzimuthDeg: 35,
  needleInclinationFromNormalDeg: 0,
  layers: [layer()],
  ...overrides,
})

describe('pem-v1 penetration energy', () => {
  it('uses a monotone LUT whose zero-loss limit preserves post-threshold energy', () => {
    expect(penetrationTransmission(0)).toBe(1)
    let previous = 1
    for (let index = 0; index <= 4_000; index += 1) {
      const current = penetrationTransmission(index / 1_000)
      expect(current).toBeLessThanOrEqual(previous)
      expect(current).toBeGreaterThanOrEqual(0)
      previous = current
    }
  })

  it('produces byte-stable traces and strict round-trip snapshots', () => {
    const first = evaluatePenetrationEnergy(input({ layers: [layer(), layer({ layerId: 'layer-b', edgeId: 'edge-b' })] }))
    const second = evaluatePenetrationEnergy(input({ layers: [layer(), layer({ layerId: 'layer-b', edgeId: 'edge-b' })] }))
    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
    expect(parsePenetrationTrace(JSON.parse(JSON.stringify(first)))).toEqual(first)
    expect(parsePenetrationTrace({ ...first, rawPressure: 0.8 })).toBeNull()
    expect(parsePenetrationTrace({ ...first, remainingEnergy: first.remainingEnergy + 1 })).toBeNull()
  })

  it('keeps the pem-v1 calibration golden vector stable', () => {
    const trace = evaluatePenetrationEnergy(input())
    expect(trace).toMatchObject({
      inputDigest: '8587475d',
      traceId: 'pem-v1-8587475d',
      initialEnergy: 8,
      remainingEnergy: 5.823883371247,
      terminalStatus: 'completed',
      layers: [{
        thresholdCost: 0.356057223246,
        lambdaDeformation: 0.184,
        lambdaFriction: 0.087948055567,
        residualEnergy: 5.823883371247,
        opening: {
          majorDiameterMm: 2.571573956,
          minorDiameterMm: 2.571573956,
          residualMinorDiameterMm: 1.285786978,
        },
      }],
    })
  })

  it('distinguishes not-entered, partial stop, and passed states', () => {
    const high = evaluatePenetrationEnergy(input())
    const threshold = high.layers[0]!.thresholdCost
    const notEntered = evaluatePenetrationEnergy(input({ mappedEnergy: threshold }))
    const partial = evaluatePenetrationEnergy(input({ mappedEnergy: threshold * 1.04 + 2e-6 }))
    expect(notEntered.layers[0]).toMatchObject({ status: 'not-entered' })
    expect(notEntered.layers[0]).not.toHaveProperty('opening')
    expect(notEntered.terminalStatus).toBe('not-entered')
    expect(partial.layers[0]?.status).toBe('entered-stopped')
    expect(partial.layers[0]?.opening?.outcome).toBe('partial')
    expect(high.layers[0]?.status).toBe('passed')
  })

  it('makes a vertical hole circular and clamps oblique axes and diameters', () => {
    const vertical = evaluatePenetrationEnergy(input()).layers[0]!.opening!
    const oblique = evaluatePenetrationEnergy(input({ needleInclinationFromNormalDeg: 70 })).layers[0]!.opening!
    expect(vertical.majorDiameterMm).toBeCloseTo(vertical.minorDiameterMm, 9)
    expect(oblique.majorDiameterMm / oblique.minorDiameterMm).toBeLessThanOrEqual(1.8 + 1e-9)
    expect(oblique.minorDiameterMm).toBeGreaterThanOrEqual(0.9)
    expect(oblique.minorDiameterMm).toBeLessThanOrEqual(2.7)
    expect(oblique.rotationDeg).toBe(35)
  })

  it('handles exactly 32 layers and explicitly rejects more', () => {
    const layers = Array.from({ length: MAX_PENETRATION_LAYERS }, (_, index) => layer({
      layerId: `layer-${index}`,
      edgeId: `edge-${index}`,
      thickness: 0.25,
      radialHardness: 0.25,
      separationToughness: 0.05,
      friction: 0,
      compaction: 0,
    }))
    const trace = evaluatePenetrationEnergy(input({ mappedEnergy: 1_024, layers }))
    expect(trace.contactedLayerCount).toBe(MAX_PENETRATION_LAYERS)
    expect(() => evaluatePenetrationEnergy(input({ layers: [...layers, layer()] }))).toThrow(RangeError)
  })

  it('never gains budget across 10,000 deterministic property cases', () => {
    let state = 0x5eed1234
    const random = (): number => {
      state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0
      return state / 0x1_0000_0000
    }
    for (let caseIndex = 0; caseIndex < 10_000; caseIndex += 1) {
      const count = 1 + Math.floor(random() * 4)
      const layers = Array.from({ length: count }, (_, index) => layer({
        layerId: `l-${index}`,
        edgeId: `e-${index}`,
        thickness: 0.25 + random() * 1.75,
        radialHardness: 0.25 + random() * 3.75,
        separationToughness: 0.05 + random() * 1.45,
        friction: random() * 0.8,
        compaction: random(),
        recovery: random() * 0.95,
        lineDiameterMm: 0.15 + random() * 2.25,
        crossAngleDeg: random() * 90,
      }))
      const trace = evaluatePenetrationEnergy(input({
        mappedEnergy: random() * 30,
        needleInclinationFromNormalDeg: random() * 70,
        layers,
      }))
      for (const result of trace.layers) {
        expect(result.residualEnergy).toBeGreaterThanOrEqual(0)
        expect(result.residualEnergy).toBeLessThanOrEqual(result.budgetBefore + 1e-9)
      }
    }
  }, 15_000)

  it('keeps reach monotone with energy and residual monotone with resistance, line size, compaction, and tilt', () => {
    const layers = Array.from({ length: 8 }, (_, index) => layer({ layerId: `l-${index}`, edgeId: `e-${index}` }))
    let priorPassed = 0
    for (let energy = 0; energy <= 20; energy += 0.25) {
      const passed = evaluatePenetrationEnergy(input({ mappedEnergy: energy, layers })).passedLayerCount
      expect(passed).toBeGreaterThanOrEqual(priorPassed)
      priorPassed = passed
    }
    const base = evaluatePenetrationEnergy(input({ mappedEnergy: 50 })).layers[0]!.residualEnergy
    const variants = [
      layer({ radialHardness: 2 }),
      layer({ thickness: 1.5 }),
      layer({ friction: 0.7 }),
      layer({ compaction: 0.9 }),
      layer({ lineDiameterMm: 1.2 }),
    ]
    for (const resistant of variants) {
      expect(evaluatePenetrationEnergy(input({ mappedEnergy: 50, layers: [resistant] })).layers[0]!.residualEnergy)
        .toBeLessThanOrEqual(base)
    }
    expect(evaluatePenetrationEnergy(input({ mappedEnergy: 50, needleInclinationFromNormalDeg: 55 })).layers[0]!.residualEnergy)
      .toBeLessThanOrEqual(base)
  })

  it('does not gain reach with a larger needle and does not grow openings through homogeneous layers', () => {
    const layers = Array.from({ length: 10 }, (_, index) => layer({ layerId: `l-${index}`, edgeId: `e-${index}` }))
    const small = evaluatePenetrationEnergy(input({ mappedEnergy: 8, needle: needlePreset('nm60'), layers }))
    const large = evaluatePenetrationEnergy(input({ mappedEnergy: 8, needle: needlePreset('nm130'), layers }))
    expect(large.passedLayerCount).toBeLessThanOrEqual(small.passedLayerCount)
    const openings = evaluatePenetrationEnergy(input({ mappedEnergy: 20, layers })).layers
      .flatMap((result) => result.opening ? [result.opening.minorDiameterMm] : [])
    for (let index = 1; index < openings.length; index += 1) {
      expect(openings[index]).toBeLessThanOrEqual(openings[index - 1]! + 1e-9)
    }
  })
})
