import { describe, expect, it } from 'vitest'
import {
  MAX_CUSTOM_THREAD_MATERIALS,
  THREAD_MATERIAL_PRESETS,
  addCustomThreadMaterial,
  createThreadMaterialSnapshot,
  defaultThreadMaterialSnapshot,
  getThreadMaterialPreset,
  normalizeCustomThreadMaterial,
  normalizeCustomThreadMaterials,
  normalizeThreadMaterialParams,
} from './thread-materials'
import { type FuzzMaterialV1 } from './fuzz-model'
import { type ThreadGeometrySnapshotV1 } from './needle-thread-physics'

function customMaterial(index: number) {
  return {
    version: 1 as const,
    id: `custom-thread-${index}`,
    name: `Local thread ${index}`,
    params: { ...getThreadMaterialPreset('stranded-cotton').params, widthScale: 0.75 + index / 100 },
  }
}

describe('procedural thread materials', () => {
  it('ships five deterministic, lighting-independent built-in presets', () => {
    expect(THREAD_MATERIAL_PRESETS.map((preset) => preset.id)).toEqual([
      'stranded-cotton',
      'pearl-cotton',
      'satin-rayon',
      'matte-wool',
      'metallic-composite',
    ])
    expect(new Set(THREAD_MATERIAL_PRESETS.map((preset) => JSON.stringify(preset.params))).size).toBe(5)
    const snapshot = defaultThreadMaterialSnapshot()
    expect(snapshot).toEqual(createThreadMaterialSnapshot(getThreadMaterialPreset('stranded-cotton')))
    expect(snapshot).not.toHaveProperty('lighting')
    expect(snapshot.params).not.toHaveProperty('needleDiameter')
  })

  it('clamps, quantizes, and replaces non-finite parameters with safe defaults', () => {
    const fallback = getThreadMaterialPreset('stranded-cotton').params
    const normalized = normalizeThreadMaterialParams({
      ...fallback,
      widthScale: 99,
      strandCount: 3.6,
      twist: -4,
      sheen: Number.NaN,
      recovery: Number.POSITIVE_INFINITY,
      colorVariation: 0.127,
    })
    expect(normalized.widthScale).toBe(2)
    expect(normalized.strandCount).toBe(4)
    expect(normalized.twist).toBe(0)
    expect(normalized.sheen).toBe(fallback.sheen)
    expect(normalized.recovery).toBe(fallback.recovery)
    expect(normalized.colorVariation).toBe(0.13)
    expect(Object.values(normalized).every((value) => Number.isFinite(value))).toBe(true)
  })

  it('accepts only bounded local procedural custom material data', () => {
    expect(normalizeCustomThreadMaterial(customMaterial(1))).toEqual(customMaterial(1))
    expect(normalizeCustomThreadMaterial({ ...customMaterial(1), url: 'https://example.test/thread.png' })).toBeNull()
    expect(normalizeCustomThreadMaterial({ ...customMaterial(1), name: '<svg onload=alert(1)>' })).toBeNull()
    expect(normalizeCustomThreadMaterial({ ...customMaterial(1), name: 'data:text/html,unsafe' })).toBeNull()
    expect(normalizeCustomThreadMaterial({ ...customMaterial(1), name: 'Custom CSS' })).toBeNull()
    expect(normalizeCustomThreadMaterial({ ...customMaterial(1), name: '//example.test/thread' })).toBeNull()
    expect(normalizeCustomThreadMaterial({ ...customMaterial(1), name: 'example.test/thread' })).toBeNull()
    expect(normalizeCustomThreadMaterial({ ...customMaterial(1), name: 'blob:local-thread' })).toBeNull()
    expect(normalizeCustomThreadMaterial({ ...customMaterial(1), name: '  Plain local thread  ' })?.name).toBe('Plain local thread')
    expect(normalizeCustomThreadMaterial({
      ...customMaterial(1),
      params: { ...customMaterial(1).params, formula: 'x * 2' },
    })).toBeNull()
  })

  it('deduplicates custom ids and caps work and storage at twelve entries', () => {
    const candidates = Array.from({ length: MAX_CUSTOM_THREAD_MATERIALS + 8 }, (_, index) => customMaterial(index))
    const normalized = normalizeCustomThreadMaterials([candidates[0], candidates[0], ...candidates])
    expect(normalized).toHaveLength(MAX_CUSTOM_THREAD_MATERIALS)
    expect(new Set(normalized.map((material) => material.id)).size).toBe(MAX_CUSTOM_THREAD_MATERIALS)
    const full = candidates.slice(0, MAX_CUSTOM_THREAD_MATERIALS)
    expect(addCustomThreadMaterial(full, customMaterial(99))).toHaveLength(MAX_CUSTOM_THREAD_MATERIALS)
  })

  it('copies snapshots so later custom-preset edits do not rewrite old stitches', () => {
    const custom = normalizeCustomThreadMaterial(customMaterial(2))!
    const snapshot = createThreadMaterialSnapshot(custom)
    const changed = addCustomThreadMaterial([custom], { ...custom, params: { ...custom.params, fuzz: 0.91 } })[0]!
    expect(changed.params.fuzz).toBe(0.91)
    expect(snapshot.params.fuzz).toBe(custom.params.fuzz)
  })

  it('optionally resolves independent thread geometry and fuzz without changing legacy snapshots', () => {
    const geometry: ThreadGeometrySnapshotV1 = {
      version: 1,
      effectiveDiameterMm: 1.2,
      radialStiffness: 1.4,
      initialPackingFraction: 0.5,
      maxPackingFraction: 0.76,
      recovery: 0.42,
    }
    const fuzzMaterial: FuzzMaterialV1 = {
      version: 1,
      density: 0.7,
      stiffness: 0.8,
      seed: 71,
      generatorVersion: 1,
    }
    const preset = getThreadMaterialPreset('matte-wool')
    expect(createThreadMaterialSnapshot(preset)).not.toHaveProperty('geometry')
    expect(createThreadMaterialSnapshot(preset, { geometry, fuzzMaterial })).toMatchObject({ geometry, fuzzMaterial })
  })

  it('falls back malformed optional physical fields without replacing valid visual material data', () => {
    const source = createThreadMaterialSnapshot(getThreadMaterialPreset('satin-rayon'))
    const parsed = createThreadMaterialSnapshot(getThreadMaterialPreset('satin-rayon'), {
      geometry: {
        version: 1,
        effectiveDiameterMm: Number.NaN,
        radialStiffness: 1,
        initialPackingFraction: 0.5,
        maxPackingFraction: 0.75,
        recovery: 0.5,
      },
      fuzzMaterial: { version: 1, density: 9, stiffness: 0.4, seed: 4, generatorVersion: 1 },
    })
    expect(parsed.sourceId).toBe(source.sourceId)
    expect(parsed.params).toEqual(source.params)
    expect(parsed.geometry?.effectiveDiameterMm).toBe(0.6)
    expect(parsed.fuzzMaterial?.density).toBe(1)
  })
})
