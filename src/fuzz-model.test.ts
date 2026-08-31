import { describe, expect, it } from 'vitest'
import {
  FUZZ_STOP_AMPLITUDE_DEG,
  MAX_FUZZ_PER_SEGMENT,
  evaluateFuzzMotion,
  fuzzBendingRigidity,
  generateFuzzCandidates,
  normalizeFuzzMaterial,
  type FuzzMaterialV1,
} from './fuzz-model'

const material = (density: number, stiffness = 0.5): FuzzMaterialV1 => ({
  version: 1,
  density,
  stiffness,
  seed: 42,
  generatorVersion: 1,
})

describe('deterministic thread fuzz', () => {
  it('normalizes each numeric field while rejecting unknown model content', () => {
    expect(normalizeFuzzMaterial({
      version: 1,
      density: 4,
      stiffness: Number.NaN,
      seed: -1,
      generatorVersion: 1,
    })).toEqual({ version: 1, density: 1, stiffness: 0.5, seed: 0xffff_ffff, generatorVersion: 1 })
    expect(normalizeFuzzMaterial({ ...material(0.4), formula: 'run()' })).toEqual({
      version: 1,
      density: 0.22,
      stiffness: 0.5,
      seed: 0,
      generatorVersion: 1,
    })
  })

  it('makes increasing density a strict superset without moving old fuzz', () => {
    const input = {
      version: 1 as const,
      pieceSeed: 123,
      rootThreadPathId: 'root-thread-7',
      rootArcCell: 19,
      materialSnapshotId: 'mat-2',
      material: material(0.25),
    }
    const sparse = generateFuzzCandidates(input)
    const dense = generateFuzzCandidates({ ...input, material: material(0.8) })
    const denseById = new Map(dense.map((candidate) => [candidate.id, candidate]))
    expect(sparse.length).toBeLessThanOrEqual(dense.length)
    for (const candidate of sparse) expect(denseById.get(candidate.id)).toEqual(candidate)
    expect(dense).toHaveLength(new Set(dense.map((candidate) => candidate.id)).size)
    expect(dense.length).toBeLessThanOrEqual(MAX_FUZZ_PER_SEGMENT)
  })

  it('keys placement to root arc cells, independent of later segment splits', () => {
    const input = {
      version: 1 as const,
      pieceSeed: 9,
      rootThreadPathId: 'original-root',
      rootArcCell: 4,
      materialSnapshotId: 'wool-v1',
      material: material(1),
    }
    expect(generateFuzzCandidates(input)).toEqual(generateFuzzCandidates({ ...input }))
    expect(generateFuzzCandidates(input)).not.toEqual(generateFuzzCandidates({ ...input, rootArcCell: 5 }))
  })

  it('maps stiffness to 0.25..8 rigidity and reduces equal-impact deflection', () => {
    expect(fuzzBendingRigidity(0)).toBe(0.25)
    expect(fuzzBendingRigidity(1)).toBe(8)
    const base = {
      version: 1 as const,
      lengthScale: 1,
      massScale: 1,
      impulse: 0.5,
      elapsedSeconds: 0,
      phaseRad: 0,
    }
    const soft = evaluateFuzzMotion({ ...base, material: material(0.5, 0) })
    const hard = evaluateFuzzMotion({ ...base, material: material(0.5, 1) })
    expect(Math.abs(hard.initialAmplitudeDeg)).toBeLessThan(Math.abs(soft.initialAmplitudeDeg))
    expect(hard.angularFrequency).toBeGreaterThan(soft.angularFrequency)
  })

  it('uses an analytic damped pose and leaves no dynamic work after settling or motion-off', () => {
    const input = {
      version: 1 as const,
      material: material(0.7, 0.4),
      lengthScale: 1,
      massScale: 1,
      impulse: 1,
      phaseRad: 0.3,
    }
    const initial = evaluateFuzzMotion({ ...input, elapsedSeconds: 0 })
    const settled = evaluateFuzzMotion({ ...input, elapsedSeconds: 10 })
    const disabled = evaluateFuzzMotion({ ...input, elapsedSeconds: 0, motionEnabled: false })
    expect(initial.active).toBe(true)
    expect(settled.envelopeAmplitudeDeg).toBeLessThan(FUZZ_STOP_AMPLITUDE_DEG)
    expect(settled.active).toBe(false)
    expect(disabled).toMatchObject({ active: false, envelopeAmplitudeDeg: 0, angleDeg: disabled.restAngleDeg })
  })
})
