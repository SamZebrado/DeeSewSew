import {
  defaultThreadMaterialSnapshot,
  parseThreadMaterialSnapshot,
  type ThreadMaterialSnapshotV1,
} from './thread-materials'
import {
  DEFAULT_NEEDLE_DIAMETER,
  DEFAULT_THREAD_GEOMETRY,
  normalizeNeedleDiameter,
  normalizeThreadGeometrySnapshot,
  parseThreadPassageSnapshot,
  type NeedleDiameterV1,
  type ThreadGeometrySnapshotV1,
  type ThreadPassageSnapshotV1,
} from './needle-thread-physics'
import {
  DEFAULT_FUZZ_MATERIAL,
  normalizeFuzzMaterial,
  type FuzzMaterialV1,
} from './fuzz-model'
import { parsePenetrationTrace, type PenetrationTraceV1 } from './penetration-energy'

export type StitchType = 'running' | 'back'
export type ForceLevel = 'light' | 'normal' | 'firm'

export interface NormalizedPoint { x: number; y: number }

export interface NeedlePoseV1 {
  version: 1
  azimuthDeg: number
  inclinationFromNormalDeg: number
}

export interface StitchCreationOptionsV1 {
  material?: ThreadMaterialSnapshotV1
  force?: ForceLevel
  needlePose?: NeedlePoseV1
  needleDiameter?: NeedleDiameterV1
  threadGeometry?: ThreadGeometrySnapshotV1
  fuzzMaterial?: FuzzMaterialV1
  threadPassage?: ThreadPassageSnapshotV1
  penetrationTrace?: PenetrationTraceV1
}

export interface Stitch {
  id: string
  type: StitchType
  start: NormalizedPoint
  end: NormalizedPoint
  needleStart?: NormalizedPoint
  needleEnd?: NormalizedPoint
  color: string
  width: number
  order: number
  seed: number
  material?: ThreadMaterialSnapshotV1
  force?: ForceLevel
  needlePose?: NeedlePoseV1
  needleDiameter?: NeedleDiameterV1
  threadGeometry?: ThreadGeometrySnapshotV1
  fuzzMaterial?: FuzzMaterialV1
  threadPassage?: ThreadPassageSnapshotV1
  penetrationTrace?: PenetrationTraceV1
}

export interface Piece { schemaVersion: 1; nextOrder: number; stitches: Stitch[] }

export const PIECE_STORAGE_KEY = 'deesewsew-piece-v1'
export const FABRIC_RADIUS = 0.435
export const MAX_STITCHES_PER_PIECE = 8_000
export const MAX_PIECE_STORAGE_CHARACTERS = 2_000_000
export const DEFAULT_FORCE_LEVEL: ForceLevel = 'normal'
export const DEFAULT_NEEDLE_POSE: Readonly<NeedlePoseV1> = Object.freeze({ version: 1, azimuthDeg: 0, inclinationFromNormalDeg: 0 })
export const emptyPiece = (): Piece => ({ schemaVersion: 1, nextOrder: 1, stitches: [] })

export function canAddStitch(stitchCount: number): boolean {
  return Number.isSafeInteger(stitchCount) && stitchCount >= 0 && stitchCount < MAX_STITCHES_PER_PIECE
}

function hash(seed: string): number {
  let value = 2166136261
  for (let index = 0; index < seed.length; index += 1) {
    value ^= seed.charCodeAt(index)
    value = Math.imul(value, 16777619)
  }
  return value >>> 0
}

export function createStitch(piece: Piece, type: StitchType, start: NormalizedPoint, end: NormalizedPoint, color: string, options?: StitchCreationOptionsV1): Stitch {
  if (!canAddStitch(piece.stitches.length)) throw new RangeError(`A piece can contain at most ${MAX_STITCHES_PER_PIECE} stitches.`)
  const order = piece.nextOrder
  const id = `stitch-${order}`
  piece.nextOrder += 1
  const visibleStart = type === 'running' ? interpolate(start, end, .06) : start
  const visibleEnd = type === 'running' ? interpolate(start, end, .82) : end
  const stitch: Stitch = { id, type, start: visibleStart, end: visibleEnd, needleStart: start, needleEnd: end, color, width: type === 'back' ? 4.2 : 3.8, order, seed: hash(id) }
  if (options?.material !== undefined) stitch.material = parseThreadMaterialSnapshot(options.material) ?? defaultThreadMaterialSnapshot()
  if (options?.force !== undefined) stitch.force = normalizeForceLevel(options.force)
  if (options?.needlePose !== undefined) stitch.needlePose = normalizeNeedlePose(options.needlePose)
  if (options?.needleDiameter !== undefined) stitch.needleDiameter = normalizeNeedleDiameter(options.needleDiameter)
  if (options?.threadGeometry !== undefined) stitch.threadGeometry = normalizeThreadGeometrySnapshot(options.threadGeometry)
  if (options?.fuzzMaterial !== undefined) stitch.fuzzMaterial = normalizeFuzzMaterial(options.fuzzMaterial)
  if (options?.threadPassage !== undefined) {
    const passage = parseThreadPassageSnapshot(options.threadPassage)
    if (passage?.committable) stitch.threadPassage = passage
  }
  if (options?.penetrationTrace !== undefined) {
    const trace = parsePenetrationTrace(options.penetrationTrace)
    if (trace) stitch.penetrationTrace = trace
  }
  return stitch
}

export function interpolate(start: NormalizedPoint, end: NormalizedPoint, amount: number): NormalizedPoint {
  return { x: start.x + (end.x - start.x) * amount, y: start.y + (end.y - start.y) * amount }
}

export function isInsideFabric(point: NormalizedPoint): boolean {
  return Math.hypot(point.x - .5, point.y - .5) <= FABRIC_RADIUS
}

export function canvasToNormalized(x: number, y: number, size: number): NormalizedPoint {
  return { x: x / size, y: y / size }
}

export function normalizedToCanvas(point: NormalizedPoint, size: number): NormalizedPoint {
  return { x: point.x * size, y: point.y * size }
}

function isPoint(value: unknown): value is NormalizedPoint {
  if (!value || typeof value !== 'object') return false
  const point = value as Record<string, unknown>
  return typeof point.x === 'number' && Number.isFinite(point.x) && typeof point.y === 'number' && Number.isFinite(point.y)
    && point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1
}

export function normalizeForceLevel(value: unknown): ForceLevel {
  return value === 'light' || value === 'firm' || value === 'normal' ? value : DEFAULT_FORCE_LEVEL
}

function quantizeAngle(value: number): number {
  const wrapped = ((value % 360) + 360) % 360
  const quantized = Number((Math.round(wrapped * 10) / 10).toFixed(1))
  return quantized >= 360 ? 0 : quantized
}

export function normalizeNeedlePose(value: unknown): NeedlePoseV1 {
  if (!value || typeof value !== 'object') return { ...DEFAULT_NEEDLE_POSE }
  const pose = value as Partial<NeedlePoseV1>
  if (pose.version !== 1 || typeof pose.azimuthDeg !== 'number' || !Number.isFinite(pose.azimuthDeg)
    || typeof pose.inclinationFromNormalDeg !== 'number' || !Number.isFinite(pose.inclinationFromNormalDeg)) return { ...DEFAULT_NEEDLE_POSE }
  return {
    version: 1,
    azimuthDeg: quantizeAngle(pose.azimuthDeg),
    inclinationFromNormalDeg: Number((Math.round(Math.min(70, Math.max(0, pose.inclinationFromNormalDeg)) * 10) / 10).toFixed(1)),
  }
}

function normalizeStitch(value: unknown): Stitch | null {
  if (!value || typeof value !== 'object') return null
  const source = value as Partial<Stitch>
  if (typeof source.id !== 'string' || (source.type !== 'running' && source.type !== 'back')
    || !isPoint(source.start) || !isPoint(source.end) || typeof source.color !== 'string'
    || typeof source.width !== 'number' || !Number.isFinite(source.width) || source.width <= 0
    || typeof source.order !== 'number' || !Number.isSafeInteger(source.order) || source.order < 0
    || typeof source.seed !== 'number' || !Number.isFinite(source.seed)) return null
  const stitch: Stitch = {
    id: source.id,
    type: source.type,
    start: { ...source.start },
    end: { ...source.end },
    color: source.color,
    width: source.width,
    order: source.order,
    seed: source.seed,
  }
  if (isPoint(source.needleStart) && isPoint(source.needleEnd)) {
    stitch.needleStart = { ...source.needleStart }
    stitch.needleEnd = { ...source.needleEnd }
  }
  if (source.material !== undefined) stitch.material = parseThreadMaterialSnapshot(source.material) ?? defaultThreadMaterialSnapshot()
  if (source.force !== undefined) stitch.force = normalizeForceLevel(source.force)
  if (source.needlePose !== undefined) stitch.needlePose = normalizeNeedlePose(source.needlePose)
  if (source.needleDiameter !== undefined) {
    stitch.needleDiameter = normalizeNeedleDiameter(source.needleDiameter, DEFAULT_NEEDLE_DIAMETER)
  }
  if (source.threadGeometry !== undefined) {
    stitch.threadGeometry = normalizeThreadGeometrySnapshot(source.threadGeometry, DEFAULT_THREAD_GEOMETRY)
  }
  if (source.fuzzMaterial !== undefined) stitch.fuzzMaterial = normalizeFuzzMaterial(source.fuzzMaterial, DEFAULT_FUZZ_MATERIAL)
  if (source.threadPassage !== undefined) {
    const passage = parseThreadPassageSnapshot(source.threadPassage)
    if (passage?.committable) stitch.threadPassage = passage
  }
  if (source.penetrationTrace !== undefined) {
    const trace = parsePenetrationTrace(source.penetrationTrace)
    if (trace) stitch.penetrationTrace = trace
  }
  return stitch
}

export function deserializePiece(raw: string | null): Piece {
  try {
    if (!raw || raw.length > MAX_PIECE_STORAGE_CHARACTERS) return emptyPiece()
    const value = JSON.parse(raw) as Partial<Piece>
    if (value.schemaVersion !== 1 || !Array.isArray(value.stitches) || value.stitches.length > MAX_STITCHES_PER_PIECE) return emptyPiece()
    const stitches: Stitch[] = []
    let nextOrder = 1
    for (const candidate of value.stitches) {
      const stitch = normalizeStitch(candidate)
      if (!stitch) return emptyPiece()
      stitches.push(stitch)
      nextOrder = Math.max(nextOrder, stitch.order + 1)
    }
    return { schemaVersion: 1, nextOrder, stitches: stitches.sort((a, b) => a.order - b.order) }
  } catch { return emptyPiece() }
}

export function loadPiece(): Piece { return deserializePiece(localStorage.getItem(PIECE_STORAGE_KEY)) }

export function serializePiece(piece: Piece): string {
  if (piece.stitches.length > MAX_STITCHES_PER_PIECE) throw new RangeError(`A piece can contain at most ${MAX_STITCHES_PER_PIECE} stitches.`)
  const stitches: Stitch[] = []
  for (const candidate of piece.stitches) {
    const stitch = normalizeStitch(candidate)
    if (!stitch) throw new TypeError('A piece contains an invalid stitch.')
    stitches.push(stitch)
  }
  const nextOrder = Number.isSafeInteger(piece.nextOrder) && piece.nextOrder >= 1
    ? piece.nextOrder
    : stitches.reduce((highest, stitch) => Math.max(highest, stitch.order + 1), 1)
  const serialized = JSON.stringify({ schemaVersion: 1, nextOrder, stitches })
  if (serialized.length > MAX_PIECE_STORAGE_CHARACTERS) throw new RangeError('The piece is too large for local storage.')
  return serialized
}

export function savePiece(piece: Piece): boolean {
  try {
    localStorage.setItem(PIECE_STORAGE_KEY, serializePiece(piece))
    return true
  } catch {
    return false
  }
}
