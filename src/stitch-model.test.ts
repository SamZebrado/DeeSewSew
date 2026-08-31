import { describe, expect, it } from 'vitest'
import {
  DEFAULT_NEEDLE_POSE,
  MAX_PIECE_STORAGE_CHARACTERS,
  MAX_STITCHES_PER_PIECE,
  PIECE_STORAGE_KEY,
  canAddStitch,
  canvasToNormalized,
  createStitch,
  deserializePiece,
  emptyPiece,
  isInsideFabric,
  normalizeNeedlePose,
  normalizedToCanvas,
  savePiece,
  serializePiece,
  type Piece,
} from './stitch-model'
import { clearHistory, commit, createHistory, redo, undo } from './history'
import { ThreadCoverage } from './thread-coverage'
import { createThreadMaterialSnapshot, defaultThreadMaterialSnapshot, getThreadMaterialPreset } from './thread-materials'
import {
  customNeedleDiameter,
  solveNeedleThreadPassage,
  type ThreadGeometrySnapshotV1,
} from './needle-thread-physics'
import { evaluatePenetrationEnergy } from './penetration-energy'

describe('normalized embroidery geometry', () => {
  it('round trips canvas coordinates across resize', () => {
    const normalized = canvasToNormalized(120, 360, 600)
    expect(normalizedToCanvas(normalized, 900)).toEqual({ x: 180, y: 540 })
  })
  it('rejects points beyond the usable circular fabric', () => {
    expect(isInsideFabric({ x: .5, y: .5 })).toBe(true)
    expect(isInsideFabric({ x: .98, y: .5 })).toBe(false)
  })
})

describe('stitch creation', () => {
  it('creates stable ordered deterministic stitches', () => {
    const piece = emptyPiece()
    const first = createStitch(piece, 'back', { x: .2, y: .3 }, { x: .6, y: .7 }, '#123456')
    const second = createStitch(piece, 'back', { x: .3, y: .4 }, { x: .7, y: .8 }, '#123456')
    expect([first.id, second.id]).toEqual(['stitch-1', 'stitch-2'])
    expect(first.seed).toBe(createStitch(emptyPiece(), 'back', { x: .2, y: .3 }, { x: .6, y: .7 }, '#123456').seed)
  })
  it('leaves a physical underside gap for running stitch and keeps back stitch continuous', () => {
    const running = createStitch(emptyPiece(), 'running', { x: .2, y: .2 }, { x: .8, y: .2 }, '#000000')
    const back = createStitch(emptyPiece(), 'back', { x: .2, y: .2 }, { x: .8, y: .2 }, '#000000')
    expect(running.start.x).toBeGreaterThan(.2); expect(running.end.x).toBeLessThan(.8)
    expect(running.needleStart).toEqual({ x: .2, y: .2 }); expect(running.needleEnd).toEqual({ x: .8, y: .2 })
    expect(back.start.x).toBe(.2); expect(back.end.x).toBe(.8)
  })
  it('optionally snapshots material, relative force, and a quantized needle pose', () => {
    const piece = emptyPiece()
    const material = createThreadMaterialSnapshot(getThreadMaterialPreset('satin-rayon'))
    const stitch = createStitch(piece, 'back', { x: .2, y: .2 }, { x: .8, y: .8 }, '#123456', {
      material,
      force: 'firm',
      needlePose: { version: 1, azimuthDeg: 361.26, inclinationFromNormalDeg: 92 },
    })
    expect(stitch.material).toEqual(material)
    expect(stitch.force).toBe('firm')
    expect(stitch.needlePose).toEqual({ version: 1, azimuthDeg: 1.3, inclinationFromNormalDeg: 70 })
  })

  it('normalizes the versioned needle pose without calculating penetration physics', () => {
    expect(normalizeNeedlePose({ version: 1, azimuthDeg: -0.06, inclinationFromNormalDeg: -8 })).toEqual({
      version: 1,
      azimuthDeg: 359.9,
      inclinationFromNormalDeg: 0,
    })
    expect(normalizeNeedlePose({ version: 1, azimuthDeg: 359.96, inclinationFromNormalDeg: 0 }).azimuthDeg).toBe(0)
    expect(normalizeNeedlePose({ version: 99, azimuthDeg: 30, inclinationFromNormalDeg: 20 })).toEqual(DEFAULT_NEEDLE_POSE)
  })

  it('optionally snapshots resolved needle, thread, fuzz, fit, and penetration data', () => {
    const geometry: ThreadGeometrySnapshotV1 = {
      version: 1,
      effectiveDiameterMm: 0.8,
      radialStiffness: 1.2,
      initialPackingFraction: 0.5,
      maxPackingFraction: 0.75,
      recovery: 0.4,
    }
    const needleDiameter = customNeedleDiameter(1.25)
    const fuzzMaterial = { version: 1 as const, density: 0.4, stiffness: 0.7, seed: 77, generatorVersion: 1 as const }
    const threadPassage = solveNeedleThreadPassage({
      version: 1,
      needle: needleDiameter,
      thread: geometry,
      fuzz: fuzzMaterial,
      hole: { version: 1, majorDiameterMm: 1.4, minorDiameterMm: 1.3, rotationDeg: 15 },
      holeRadialStiffness: 1,
      availableEnergy: 8,
    })
    const penetrationTrace = evaluatePenetrationEnergy({
      version: 1,
      modelId: 'pem-v1',
      mappedEnergy: 8,
      needle: needleDiameter,
      needleAzimuthDeg: 15,
      needleInclinationFromNormalDeg: 20,
      layers: [{
        version: 1,
        layerId: 'layer-1', edgeId: 'edge-1', u: 0.5, thickness: 1, radialHardness: 1,
        separationToughness: 0.4, friction: 0.2, compaction: 0.5, recovery: 0.5, lineDiameterMm: 0.8,
      }],
    })
    const piece = emptyPiece()
    const stitch = createStitch(piece, 'back', { x: 0.2, y: 0.2 }, { x: 0.8, y: 0.8 }, '#123456', {
      needleDiameter, threadGeometry: geometry, fuzzMaterial, threadPassage, penetrationTrace,
    })
    piece.stitches.push(stitch)
    expect(deserializePiece(serializePiece(piece))).toEqual(piece)
  })

  it('does not attach an uncommittable jam or energy-failure fit to a completed stitch', () => {
    const geometry: ThreadGeometrySnapshotV1 = {
      version: 1,
      effectiveDiameterMm: 1,
      radialStiffness: 1,
      initialPackingFraction: 0.4,
      maxPackingFraction: 0.78,
      recovery: 0.5,
    }
    const failedPassage = solveNeedleThreadPassage({
      version: 1,
      needle: customNeedleDiameter(0.9),
      thread: geometry,
      hole: { version: 1, majorDiameterMm: 1, minorDiameterMm: 0.9, rotationDeg: 0 },
      holeRadialStiffness: 1,
      availableEnergy: 0,
    })
    expect(failedPassage.result).toBe('thread-fit-energy')
    const stitch = createStitch(emptyPiece(), 'back', { x: 0.2, y: 0.2 }, { x: 0.8, y: 0.8 }, '#123456', {
      threadPassage: failedPassage,
    })
    expect(stitch).not.toHaveProperty('threadPassage')
  })
})

describe('history and persistence', () => {
  it('undoes, redoes, invalidates the redo branch, and clears', () => {
    let history = commit(commit(createHistory<number>(), 1), 2)
    history = undo(history); expect(history).toEqual({ present: [1], future: [2] })
    history = redo(history); expect(history.present).toEqual([1, 2])
    history = undo(history); history = commit(history, 3); expect(history).toEqual({ present: [1, 3], future: [] })
    expect(clearHistory(history).present).toEqual([])
  })
  it('preserves layer order through serialization and fails closed on malformed data', () => {
    const piece = emptyPiece(); const stitch = createStitch(piece, 'back', { x: .2, y: .2 }, { x: .8, y: .8 }, '#000000'); piece.stitches.push(stitch)
    expect(deserializePiece(serializePiece(piece))).toEqual(piece)
    expect(deserializePiece('{broken')).toEqual(emptyPiece())
    expect(deserializePiece(JSON.stringify({ schemaVersion: 99, stitches: [] }))).toEqual(emptyPiece())
    const legacy = { ...piece, stitches: piece.stitches.map(({ needleStart: _start, needleEnd: _end, ...item }) => item) }
    expect(deserializePiece(serializePiece(legacy))).toEqual(legacy)
  })

  it('falls back invalid optional fields individually without clearing a valid piece', () => {
    const piece = emptyPiece()
    const stitch = createStitch(piece, 'back', { x: .2, y: .2 }, { x: .8, y: .8 }, '#000000')
    const restored = deserializePiece(JSON.stringify({
      ...piece,
      stitches: [{
        ...stitch,
        material: { version: 1, sourceId: 'custom-unsafe', name: '<svg>', params: {}, url: 'data:image/svg+xml,x' },
        force: 'extreme',
        needlePose: { version: 4, azimuthDeg: 20, inclinationFromNormalDeg: 10 },
        needleDiameter: { version: 1, source: 'custom', diameterMm: Number.NaN },
        threadGeometry: { version: 1, effectiveDiameterMm: Number.NaN },
        fuzzMaterial: { version: 1, density: Number.NaN, stiffness: 0.9, seed: 7, generatorVersion: 1 },
        threadPassage: { version: 1, modelId: 'ntf-v1', rawPressure: 0.8 },
        penetrationTrace: { version: 1, modelId: 'pem-v1', rawPressure: 0.8 },
      }],
    }))
    expect(restored.stitches).toHaveLength(1)
    expect(restored.stitches[0]).toMatchObject({
      id: stitch.id,
      material: defaultThreadMaterialSnapshot(),
      force: 'normal',
      needlePose: DEFAULT_NEEDLE_POSE,
      needleDiameter: { version: 1, source: 'custom', diameterMm: 0.9 },
      threadGeometry: { version: 1, effectiveDiameterMm: 0.6, radialStiffness: 1, initialPackingFraction: 0.55, maxPackingFraction: 0.75, recovery: 0.54 },
      fuzzMaterial: { version: 1, density: 0.22, stiffness: 0.9, seed: 7, generatorVersion: 1 },
    })
    expect(restored.stitches[0]).not.toHaveProperty('threadPassage')
    expect(restored.stitches[0]).not.toHaveProperty('penetrationTrace')
  })

  it('preserves valid style fields while dropping only a malformed optional needle-point pair', () => {
    const piece = emptyPiece()
    const material = createThreadMaterialSnapshot(getThreadMaterialPreset('pearl-cotton'))
    const stitch = createStitch(piece, 'back', { x: .2, y: .2 }, { x: .8, y: .8 }, '#000000', {
      material,
      force: 'light',
      needlePose: { version: 1, azimuthDeg: 40, inclinationFromNormalDeg: 20 },
    })
    const restored = deserializePiece(JSON.stringify({
      ...piece,
      stitches: [{ ...stitch, needleStart: { x: 4, y: 2 }, needleEnd: null }],
    }))
    expect(restored.stitches).toHaveLength(1)
    expect(restored.stitches[0]).not.toHaveProperty('needleStart')
    expect(restored.stitches[0]).not.toHaveProperty('needleEnd')
    expect(restored.stitches[0]).toMatchObject({ material, force: 'light', needlePose: { version: 1, azimuthDeg: 40, inclinationFromNormalDeg: 20 } })
  })

  it('rejects oversized records before unbounded mapping or argument spreading', () => {
    const stitch = createStitch(emptyPiece(), 'back', { x: .2, y: .2 }, { x: .8, y: .8 }, '#000000')
    expect(deserializePiece(JSON.stringify({
      schemaVersion: 1,
      stitches: Array.from({ length: MAX_STITCHES_PER_PIECE + 1 }, () => stitch),
    }))).toEqual(emptyPiece())
    expect(deserializePiece(' '.repeat(MAX_PIECE_STORAGE_CHARACTERS + 1))).toEqual(emptyPiece())
  })

  it('whitelists persisted stitch fields and never stores raw pointer samples', () => {
    const piece = emptyPiece()
    const stitch = createStitch(piece, 'back', { x: 0.2, y: 0.2 }, { x: 0.8, y: 0.8 }, '#000000')
    piece.stitches.push(Object.assign(stitch, {
      rawPressure: 0.83,
      pointerId: 42,
      predictedEvents: [{ pressure: 0.9 }],
    }))
    const serialized = serializePiece(piece)
    expect(serialized).not.toContain('rawPressure')
    expect(serialized).not.toContain('pointerId')
    expect(serialized).not.toContain('predictedEvents')
    expect(deserializePiece(serialized).stitches).toHaveLength(1)
  })

  it('accepts the exact stitch cap and refuses cap plus one without overwriting local work', () => {
    const minimal = createStitch(emptyPiece(), 'back', { x: .2, y: .2 }, { x: .8, y: .8 }, '#000000')
    const stitches = Array.from({ length: MAX_STITCHES_PER_PIECE }, (_, index) => ({
      ...minimal,
      id: `s${index}`,
      order: index + 1,
    }))
    const atCap: Piece = { schemaVersion: 1, nextOrder: MAX_STITCHES_PER_PIECE + 1, stitches }
    const overCap: Piece = { ...atCap, stitches: [...stitches, { ...minimal, id: 'overflow', order: MAX_STITCHES_PER_PIECE + 1 }] }
    expect(canAddStitch(MAX_STITCHES_PER_PIECE - 1)).toBe(true)
    expect(canAddStitch(MAX_STITCHES_PER_PIECE)).toBe(false)
    expect(() => createStitch(atCap, 'back', { x: .2, y: .2 }, { x: .8, y: .8 }, '#000000')).toThrow(RangeError)
    expect(serializePiece(atCap).length).toBeLessThanOrEqual(MAX_PIECE_STORAGE_CHARACTERS)

    const values = new Map<string, string>()
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
    const storage: Storage = {
      get length() { return values.size },
      clear: () => values.clear(),
      getItem: (key) => values.get(key) ?? null,
      key: (index) => [...values.keys()][index] ?? null,
      removeItem: (key) => { values.delete(key) },
      setItem: (key, value) => { values.set(key, value) },
    }
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage })
    try {
      expect(savePiece(atCap)).toBe(true)
      const preserved = values.get(PIECE_STORAGE_KEY)
      expect(savePiece(overCap)).toBe(false)
      expect(values.get(PIECE_STORAGE_KEY)).toBe(preserved)
    } finally {
      if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor)
      else Reflect.deleteProperty(globalThis, 'localStorage')
    }
  })
})

describe('derived thread coverage', () => {
  it('recognizes exact and nearby overlap while keeping distant paths separate', () => {
    const coverage = new ThreadCoverage(96)
    const start = { x: .2, y: .4 }; const end = { x: .8, y: .4 }
    expect(coverage.samplePath(start, end)).toBe(0)
    coverage.addPath(start, end)
    expect(coverage.samplePath(start, end)).toBeGreaterThan(.4)
    expect(coverage.samplePath({ x: .2, y: .408 }, { x: .8, y: .408 })).toBeGreaterThan(.15)
    expect(coverage.samplePath({ x: .2, y: .6 }, { x: .8, y: .6 })).toBe(0)
  })
})
