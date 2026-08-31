import {
  DEFAULT_FUZZ_MATERIAL,
  normalizeFuzzMaterial,
  parseFuzzMaterial,
  type FuzzMaterialV1,
} from './fuzz-model'

export type NeedlePresetId = 'nm60' | 'nm75' | 'nm90' | 'nm110' | 'nm130'

export interface NeedleDiameterV1 {
  version: 1
  source: 'preset' | 'custom'
  presetId?: NeedlePresetId
  diameterMm: number
}

export interface ThreadGeometrySnapshotV1 {
  version: 1
  effectiveDiameterMm: number
  radialStiffness: number
  initialPackingFraction: number
  maxPackingFraction: number
  recovery: number
}

export interface HoleEllipseV1 {
  version: 1
  majorDiameterMm: number
  minorDiameterMm: number
  rotationDeg: number
}

export interface ClearanceEllipseV1 {
  version: 1
  semiMajorMm: number
  semiMinorMm: number
  rotationDeg: number
}

export interface PassageOffsetV1 {
  xMm: number
  yMm: number
}

export type ThreadPassageResult = 'free-pass' | 'compressed-pass' | 'thread-fit-energy' | 'thread-jam'

export interface ThreadPassageInputV1 {
  version: 1
  needle: NeedleDiameterV1
  thread: ThreadGeometrySnapshotV1
  fuzz?: FuzzMaterialV1
  hole: HoleEllipseV1
  holeRadialStiffness: number
  availableEnergy: number
  requestedOffset?: PassageOffsetV1
}

export interface ThreadNeckSnapshotV1 {
  version: 1
  peakCompressionMm: number
  residualCompressionMm: number
  lengthMm: number
}

export interface ThreadPassageSnapshotV1 {
  version: 1
  modelId: 'ntf-v1'
  result: ThreadPassageResult
  committable: boolean
  needle: NeedleDiameterV1
  thread: ThreadGeometrySnapshotV1
  fuzz: FuzzMaterialV1
  holeBefore: HoleEllipseV1
  holeAfter: HoleEllipseV1
  holeRadialStiffness: number
  uncompressedThreadDiameterMm: number
  compressedThreadDiameterMm: number
  interferenceMm: number
  unresolvedInterferenceMm: number
  requiredHoleExpansionMm: number
  requiredThreadCompressionMm: number
  holeExpansionMm: number
  threadCompressionMm: number
  holeExpansionLimitMm: number
  threadCompressionLimitMm: number
  initialPackingFraction: number
  finalPackingFraction: number
  solidFiberAreaMm2: number
  packingAreaErrorMm2: number
  fitEnergy: number
  availableEnergy: number
  remainingEnergy: number
  neck: ThreadNeckSnapshotV1
  clearance: ClearanceEllipseV1
  settledOffset: PassageOffsetV1
}

export const NEEDLE_DIAMETER_MIN_MM = 0.5
export const NEEDLE_DIAMETER_MAX_MM = 2
export const THREAD_DIAMETER_MIN_MM = 0.15
export const THREAD_DIAMETER_MAX_MM = 2.4
export const DEFAULT_NEEDLE_PRESET_ID: NeedlePresetId = 'nm90'
export const THREAD_FIT_MODEL_ID = 'ntf-v1' as const

export const NEEDLE_PRESET_DIAMETERS: Readonly<Record<NeedlePresetId, number>> = Object.freeze({
  nm60: 0.6,
  nm75: 0.75,
  nm90: 0.9,
  nm110: 1.1,
  nm130: 1.3,
})

export const DEFAULT_NEEDLE_DIAMETER: Readonly<NeedleDiameterV1> = Object.freeze({
  version: 1,
  source: 'preset',
  presetId: DEFAULT_NEEDLE_PRESET_ID,
  diameterMm: NEEDLE_PRESET_DIAMETERS[DEFAULT_NEEDLE_PRESET_ID],
})

export const DEFAULT_THREAD_GEOMETRY: Readonly<ThreadGeometrySnapshotV1> = Object.freeze({
  version: 1,
  effectiveDiameterMm: 0.6,
  radialStiffness: 1,
  initialPackingFraction: 0.55,
  maxPackingFraction: 0.75,
  recovery: 0.54,
})

const NEEDLE_KEYS = new Set(['version', 'source', 'presetId', 'diameterMm'])
const THREAD_KEYS = new Set(['version', 'effectiveDiameterMm', 'radialStiffness', 'initialPackingFraction', 'maxPackingFraction', 'recovery'])
const HOLE_KEYS = new Set(['version', 'majorDiameterMm', 'minorDiameterMm', 'rotationDeg'])
const CLEARANCE_KEYS = new Set(['version', 'semiMajorMm', 'semiMinorMm', 'rotationDeg'])
const OFFSET_KEYS = new Set(['xMm', 'yMm'])
const NECK_KEYS = new Set(['version', 'peakCompressionMm', 'residualCompressionMm', 'lengthMm'])
const PASSAGE_KEYS = new Set([
  'version', 'modelId', 'result', 'committable', 'needle', 'thread', 'fuzz', 'holeBefore', 'holeAfter',
  'holeRadialStiffness', 'uncompressedThreadDiameterMm', 'compressedThreadDiameterMm', 'interferenceMm',
  'unresolvedInterferenceMm', 'requiredHoleExpansionMm', 'requiredThreadCompressionMm', 'holeExpansionMm',
  'threadCompressionMm', 'holeExpansionLimitMm', 'threadCompressionLimitMm', 'initialPackingFraction',
  'finalPackingFraction', 'solidFiberAreaMm2', 'packingAreaErrorMm2', 'fitEnergy', 'availableEnergy',
  'remainingEnergy', 'neck', 'clearance', 'settledOffset',
])
const PRESET_IDS = new Set<NeedlePresetId>(Object.keys(NEEDLE_PRESET_DIAMETERS) as NeedlePresetId[])
const FIT_EPSILON = 1e-9

function isRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function hasOnlyKeys(value: Record<string, unknown>, keys: ReadonlySet<string>): boolean {
  return Object.keys(value).every((key) => keys.has(key))
}

function finiteOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

function quantize(value: number, digits = 9): number {
  return Number(value.toFixed(digits))
}

function normalizeRotation(value: unknown): number {
  const wrapped = ((finiteOr(value, 0) % 360) + 360) % 360
  const normalized = quantize(wrapped, 6)
  return normalized >= 360 ? 0 : normalized
}

function isNeedlePresetId(value: unknown): value is NeedlePresetId {
  return typeof value === 'string' && PRESET_IDS.has(value as NeedlePresetId)
}

export function needlePreset(presetId: NeedlePresetId): NeedleDiameterV1 {
  const safeId = isNeedlePresetId(presetId) ? presetId : DEFAULT_NEEDLE_PRESET_ID
  return { version: 1, source: 'preset', presetId: safeId, diameterMm: NEEDLE_PRESET_DIAMETERS[safeId] }
}

export function customNeedleDiameter(diameterMm: number): NeedleDiameterV1 {
  const numeric = Number.isFinite(diameterMm) ? diameterMm : DEFAULT_NEEDLE_DIAMETER.diameterMm
  return {
    version: 1,
    source: 'custom',
    diameterMm: quantize(clamp(numeric, NEEDLE_DIAMETER_MIN_MM, NEEDLE_DIAMETER_MAX_MM), 2),
  }
}

export function normalizeNeedleDiameter(
  value: unknown,
  fallback: NeedleDiameterV1 = DEFAULT_NEEDLE_DIAMETER,
): NeedleDiameterV1 {
  const safeFallback = isNeedleDiameter(fallback) ? fallback : DEFAULT_NEEDLE_DIAMETER
  if (!isRecord(value) || value.version !== 1 || !hasOnlyKeys(value, NEEDLE_KEYS)) return { ...safeFallback }
  if (value.source === 'preset' && isNeedlePresetId(value.presetId)) return needlePreset(value.presetId)
  if (value.source === 'custom') {
    const candidate = typeof value.diameterMm === 'number' && Number.isFinite(value.diameterMm)
      ? value.diameterMm
      : safeFallback.diameterMm
    return customNeedleDiameter(candidate)
  }
  return { ...safeFallback }
}

export function isNeedleDiameter(value: unknown): value is NeedleDiameterV1 {
  if (!isRecord(value) || value.version !== 1 || !hasOnlyKeys(value, NEEDLE_KEYS)
    || typeof value.diameterMm !== 'number' || !Number.isFinite(value.diameterMm)
    || value.diameterMm < NEEDLE_DIAMETER_MIN_MM || value.diameterMm > NEEDLE_DIAMETER_MAX_MM) return false
  if (value.source === 'preset') {
    return isNeedlePresetId(value.presetId) && value.diameterMm === NEEDLE_PRESET_DIAMETERS[value.presetId]
  }
  return value.source === 'custom' && value.presetId === undefined
}

export function parseNeedleDiameter(value: unknown): NeedleDiameterV1 | null {
  return isNeedleDiameter(value) ? normalizeNeedleDiameter(value) : null
}

export function normalizeThreadGeometrySnapshot(
  value: unknown,
  fallback: ThreadGeometrySnapshotV1 = DEFAULT_THREAD_GEOMETRY,
): ThreadGeometrySnapshotV1 {
  const safeFallback = isThreadGeometrySnapshot(fallback) ? fallback : DEFAULT_THREAD_GEOMETRY
  if (!isRecord(value) || value.version !== 1 || !hasOnlyKeys(value, THREAD_KEYS)) return { ...safeFallback }
  const initialPackingFraction = quantize(clamp(
    finiteOr(value.initialPackingFraction, safeFallback.initialPackingFraction),
    0.1,
    0.78,
  ))
  const maxPackingFraction = quantize(clamp(
    finiteOr(value.maxPackingFraction, safeFallback.maxPackingFraction),
    initialPackingFraction,
    0.78,
  ))
  return {
    version: 1,
    effectiveDiameterMm: quantize(clamp(
      finiteOr(value.effectiveDiameterMm, safeFallback.effectiveDiameterMm),
      THREAD_DIAMETER_MIN_MM,
      THREAD_DIAMETER_MAX_MM,
    )),
    radialStiffness: quantize(clamp(finiteOr(value.radialStiffness, safeFallback.radialStiffness), 0.25, 4)),
    initialPackingFraction,
    maxPackingFraction,
    recovery: quantize(clamp(finiteOr(value.recovery, safeFallback.recovery), 0, 0.95)),
  }
}

export function isThreadGeometrySnapshot(value: unknown): value is ThreadGeometrySnapshotV1 {
  return isRecord(value) && value.version === 1 && hasOnlyKeys(value, THREAD_KEYS)
    && typeof value.effectiveDiameterMm === 'number' && Number.isFinite(value.effectiveDiameterMm)
    && value.effectiveDiameterMm >= THREAD_DIAMETER_MIN_MM && value.effectiveDiameterMm <= THREAD_DIAMETER_MAX_MM
    && typeof value.radialStiffness === 'number' && Number.isFinite(value.radialStiffness)
    && value.radialStiffness >= 0.25 && value.radialStiffness <= 4
    && typeof value.initialPackingFraction === 'number' && Number.isFinite(value.initialPackingFraction)
    && value.initialPackingFraction >= 0.1 && value.initialPackingFraction <= 0.78
    && typeof value.maxPackingFraction === 'number' && Number.isFinite(value.maxPackingFraction)
    && value.maxPackingFraction >= value.initialPackingFraction && value.maxPackingFraction <= 0.78
    && typeof value.recovery === 'number' && Number.isFinite(value.recovery)
    && value.recovery >= 0 && value.recovery <= 0.95
}

export function parseThreadGeometrySnapshot(value: unknown): ThreadGeometrySnapshotV1 | null {
  return isThreadGeometrySnapshot(value) ? normalizeThreadGeometrySnapshot(value) : null
}

function normalizeHole(value: unknown, fallbackDiameter: number): HoleEllipseV1 {
  if (!isRecord(value) || value.version !== 1 || !hasOnlyKeys(value, HOLE_KEYS)) {
    return { version: 1, majorDiameterMm: fallbackDiameter, minorDiameterMm: fallbackDiameter, rotationDeg: 0 }
  }
  const first = clamp(finiteOr(value.majorDiameterMm, fallbackDiameter), 0.05, 6)
  const second = clamp(finiteOr(value.minorDiameterMm, fallbackDiameter), 0.05, 6)
  return {
    version: 1,
    majorDiameterMm: quantize(Math.max(first, second)),
    minorDiameterMm: quantize(Math.min(first, second)),
    rotationDeg: normalizeRotation(value.rotationDeg),
  }
}

function isHole(value: unknown): value is HoleEllipseV1 {
  return isRecord(value) && value.version === 1 && hasOnlyKeys(value, HOLE_KEYS)
    && typeof value.majorDiameterMm === 'number' && Number.isFinite(value.majorDiameterMm)
    && typeof value.minorDiameterMm === 'number' && Number.isFinite(value.minorDiameterMm)
    && value.majorDiameterMm >= value.minorDiameterMm && value.minorDiameterMm > 0
    && typeof value.rotationDeg === 'number' && Number.isFinite(value.rotationDeg)
}

function normalizeOffset(value: unknown): PassageOffsetV1 {
  if (!isRecord(value) || !hasOnlyKeys(value, OFFSET_KEYS)) return { xMm: 0, yMm: 0 }
  return { xMm: quantize(finiteOr(value.xMm, 0)), yMm: quantize(finiteOr(value.yMm, 0)) }
}

function rotateOffset(offset: PassageOffsetV1, angleDeg: number): PassageOffsetV1 {
  const radians = angleDeg * Math.PI / 180
  const cosine = Math.cos(radians)
  const sine = Math.sin(radians)
  return {
    xMm: offset.xMm * cosine - offset.yMm * sine,
    yMm: offset.xMm * sine + offset.yMm * cosine,
  }
}

/** Projects an arbitrary requested settle offset into the valid clearance ellipse. */
export function projectOffsetToClearance(
  offset: PassageOffsetV1,
  clearance: ClearanceEllipseV1,
): PassageOffsetV1 {
  const requested = normalizeOffset(offset)
  const local = rotateOffset(requested, -clearance.rotationDeg)
  const a = Math.max(0, finiteOr(clearance.semiMajorMm, 0))
  const b = Math.max(0, finiteOr(clearance.semiMinorMm, 0))
  if (a <= FIT_EPSILON && b <= FIT_EPSILON) return { xMm: 0, yMm: 0 }
  if (a <= FIT_EPSILON) {
    const world = rotateOffset({ xMm: 0, yMm: clamp(local.yMm, -b, b) }, clearance.rotationDeg)
    return { xMm: quantize(world.xMm), yMm: quantize(world.yMm) }
  }
  if (b <= FIT_EPSILON) {
    const world = rotateOffset({ xMm: clamp(local.xMm, -a, a), yMm: 0 }, clearance.rotationDeg)
    return { xMm: quantize(world.xMm), yMm: quantize(world.yMm) }
  }
  const normalizedRadius = Math.hypot(local.xMm / a, local.yMm / b)
  const scale = normalizedRadius > 1 ? 1 / normalizedRadius : 1
  const world = rotateOffset({ xMm: local.xMm * scale, yMm: local.yMm * scale }, clearance.rotationDeg)
  return { xMm: quantize(world.xMm), yMm: quantize(world.yMm) }
}

/** Maximum center travel along a world-space direction, in millimetres. */
export function maximumClearanceRadius(clearance: ClearanceEllipseV1, directionDeg: number): number {
  const a = Math.max(0, finiteOr(clearance.semiMajorMm, 0))
  const b = Math.max(0, finiteOr(clearance.semiMinorMm, 0))
  const radians = (normalizeRotation(directionDeg) - clearance.rotationDeg) * Math.PI / 180
  const cosine = Math.cos(radians)
  const sine = Math.sin(radians)
  if (a <= FIT_EPSILON && b <= FIT_EPSILON) return 0
  if (a <= FIT_EPSILON) return Math.abs(cosine) <= FIT_EPSILON ? quantize(b) : 0
  if (b <= FIT_EPSILON) return Math.abs(sine) <= FIT_EPSILON ? quantize(a) : 0
  return quantize(1 / Math.sqrt((cosine * cosine) / (a * a) + (sine * sine) / (b * b)))
}

function clearanceFor(hole: HoleEllipseV1, threadDiameterMm: number): ClearanceEllipseV1 {
  return {
    version: 1,
    semiMajorMm: quantize(Math.max(0, hole.majorDiameterMm / 2 - threadDiameterMm / 2)),
    semiMinorMm: quantize(Math.max(0, hole.minorDiameterMm / 2 - threadDiameterMm / 2)),
    rotationDeg: hole.rotationDeg,
  }
}

function solveBoundedCompliance(
  delta: number,
  holeStiffness: number,
  threadStiffness: number,
  holeLimit: number,
  threadLimit: number,
): { hole: number; thread: number; unresolved: number } {
  if (holeLimit + threadLimit < delta - FIT_EPSILON) {
    return { hole: holeLimit, thread: threadLimit, unresolved: Math.max(0, delta - holeLimit - threadLimit) }
  }
  const unconstrainedHole = delta * threadStiffness / (holeStiffness + threadStiffness)
  const minimumHole = Math.max(0, delta - threadLimit)
  const maximumHole = Math.min(holeLimit, delta)
  const hole = clamp(unconstrainedHole, minimumHole, maximumHole)
  const thread = delta - hole
  return { hole, thread, unresolved: 0 }
}

/** Constant-work, closed-form needle-hole/thread fit solver. */
export function solveNeedleThreadPassage(input: ThreadPassageInputV1): ThreadPassageSnapshotV1 {
  const needle = normalizeNeedleDiameter(input.needle)
  const thread = normalizeThreadGeometrySnapshot(input.thread)
  const fuzz = normalizeFuzzMaterial(input.fuzz ?? DEFAULT_FUZZ_MATERIAL)
  const holeBefore = normalizeHole(input.hole, needle.diameterMm)
  const holeRadialStiffness = quantize(clamp(finiteOr(input.holeRadialStiffness, 1), 0.25, 4))
  const availableEnergy = quantize(clamp(finiteOr(input.availableEnergy, 0), 0, 1_024))
  const requestedOffset = normalizeOffset(input.requestedOffset)
  const threadDiameter = thread.effectiveDiameterMm
  const delta = Math.max(0, threadDiameter * 1.02 - holeBefore.minorDiameterMm)
  const holeLimit = Math.min(0.18 * holeBefore.minorDiameterMm, 0.25 * needle.diameterMm)
  const minimumThreadDiameter = threadDiameter * Math.sqrt(thread.initialPackingFraction / thread.maxPackingFraction)
  const threadLimit = Math.max(0, threadDiameter - minimumThreadDiameter)
  const required = solveBoundedCompliance(
    delta,
    holeRadialStiffness,
    thread.radialStiffness,
    holeLimit,
    threadLimit,
  )
  const fitEnergy = 0.5 * holeRadialStiffness * required.hole ** 2
    + 0.5 * thread.radialStiffness * required.thread ** 2
  let result: ThreadPassageResult
  if (delta <= FIT_EPSILON) result = 'free-pass'
  else if (required.unresolved > FIT_EPSILON) result = 'thread-jam'
  else if (availableEnergy + FIT_EPSILON < fitEnergy) result = 'thread-fit-energy'
  else result = 'compressed-pass'
  const committable = result === 'free-pass' || result === 'compressed-pass'
  const appliedHole = result === 'compressed-pass' ? required.hole : 0
  const appliedThread = result === 'compressed-pass' ? required.thread : 0
  const compressedThreadDiameter = threadDiameter - appliedThread
  const holeAfter: HoleEllipseV1 = committable
    ? {
        version: 1,
        majorDiameterMm: quantize(holeBefore.majorDiameterMm + appliedHole),
        minorDiameterMm: quantize(holeBefore.minorDiameterMm + appliedHole),
        rotationDeg: holeBefore.rotationDeg,
      }
    : { ...holeBefore }
  const finalPackingFraction = appliedThread > 0
    ? thread.initialPackingFraction * (threadDiameter / compressedThreadDiameter) ** 2
    : thread.initialPackingFraction
  const solidFiberArea = thread.initialPackingFraction * Math.PI * threadDiameter ** 2 / 4
  const reconstructedArea = finalPackingFraction * Math.PI * compressedThreadDiameter ** 2 / 4
  const clearance = clearanceFor(holeAfter, compressedThreadDiameter)
  const settledOffset = projectOffsetToClearance(requestedOffset, clearance)
  const residualCompression = appliedThread * (1 - thread.recovery)
  return {
    version: 1,
    modelId: THREAD_FIT_MODEL_ID,
    result,
    committable,
    needle,
    thread,
    fuzz,
    holeBefore,
    holeAfter,
    holeRadialStiffness,
    uncompressedThreadDiameterMm: threadDiameter,
    compressedThreadDiameterMm: quantize(compressedThreadDiameter),
    interferenceMm: quantize(delta),
    unresolvedInterferenceMm: quantize(required.unresolved),
    requiredHoleExpansionMm: quantize(delta <= FIT_EPSILON ? 0 : required.hole),
    requiredThreadCompressionMm: quantize(delta <= FIT_EPSILON ? 0 : required.thread),
    holeExpansionMm: quantize(appliedHole),
    threadCompressionMm: quantize(appliedThread),
    holeExpansionLimitMm: quantize(holeLimit),
    threadCompressionLimitMm: quantize(threadLimit),
    initialPackingFraction: thread.initialPackingFraction,
    finalPackingFraction: quantize(finalPackingFraction, 12),
    solidFiberAreaMm2: quantize(solidFiberArea, 12),
    packingAreaErrorMm2: quantize(Math.abs(reconstructedArea - solidFiberArea), 12),
    fitEnergy: quantize(delta <= FIT_EPSILON ? 0 : fitEnergy, 12),
    availableEnergy,
    remainingEnergy: quantize(committable ? Math.max(0, availableEnergy - fitEnergy) : availableEnergy, 12),
    neck: {
      version: 1,
      peakCompressionMm: quantize(appliedThread),
      residualCompressionMm: quantize(residualCompression),
      lengthMm: quantize(clamp(3 * threadDiameter, 1.5 * threadDiameter, 6 * threadDiameter)),
    },
    clearance,
    settledOffset,
  }
}

function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function isClearance(value: unknown): value is ClearanceEllipseV1 {
  return isRecord(value) && value.version === 1 && hasOnlyKeys(value, CLEARANCE_KEYS)
    && isFiniteNonNegative(value.semiMajorMm) && isFiniteNonNegative(value.semiMinorMm)
    && typeof value.rotationDeg === 'number' && Number.isFinite(value.rotationDeg)
}

function isOffset(value: unknown): value is PassageOffsetV1 {
  return isRecord(value) && hasOnlyKeys(value, OFFSET_KEYS)
    && typeof value.xMm === 'number' && Number.isFinite(value.xMm)
    && typeof value.yMm === 'number' && Number.isFinite(value.yMm)
}

function isNeck(value: unknown): value is ThreadNeckSnapshotV1 {
  return isRecord(value) && value.version === 1 && hasOnlyKeys(value, NECK_KEYS)
    && isFiniteNonNegative(value.peakCompressionMm)
    && isFiniteNonNegative(value.residualCompressionMm)
    && isFiniteNonNegative(value.lengthMm)
}

export function parseThreadPassageSnapshot(value: unknown): ThreadPassageSnapshotV1 | null {
  if (!isRecord(value) || value.version !== 1 || value.modelId !== THREAD_FIT_MODEL_ID
    || !hasOnlyKeys(value, PASSAGE_KEYS)
    || (value.result !== 'free-pass' && value.result !== 'compressed-pass'
      && value.result !== 'thread-fit-energy' && value.result !== 'thread-jam')
    || typeof value.committable !== 'boolean'
    || value.committable !== (value.result === 'free-pass' || value.result === 'compressed-pass')) return null
  const needle = parseNeedleDiameter(value.needle)
  const thread = parseThreadGeometrySnapshot(value.thread)
  const fuzz = parseFuzzMaterial(value.fuzz)
  if (!needle || !thread || !fuzz || !isHole(value.holeBefore) || !isHole(value.holeAfter)
    || !isNeck(value.neck) || !isClearance(value.clearance) || !isOffset(value.settledOffset)) return null
  const numericKeys = [
    'holeRadialStiffness', 'uncompressedThreadDiameterMm', 'compressedThreadDiameterMm', 'interferenceMm',
    'unresolvedInterferenceMm', 'requiredHoleExpansionMm', 'requiredThreadCompressionMm', 'holeExpansionMm',
    'threadCompressionMm', 'holeExpansionLimitMm', 'threadCompressionLimitMm', 'initialPackingFraction',
    'finalPackingFraction', 'solidFiberAreaMm2', 'packingAreaErrorMm2', 'fitEnergy', 'availableEnergy', 'remainingEnergy',
  ] as const
  if (numericKeys.some((key) => !isFiniteNonNegative(value[key]))) return null
  const candidate: ThreadPassageSnapshotV1 = {
    version: 1,
    modelId: THREAD_FIT_MODEL_ID,
    result: value.result,
    committable: value.committable,
    needle,
    thread,
    fuzz,
    holeBefore: normalizeHole(value.holeBefore, needle.diameterMm),
    holeAfter: normalizeHole(value.holeAfter, needle.diameterMm),
    holeRadialStiffness: value.holeRadialStiffness as number,
    uncompressedThreadDiameterMm: value.uncompressedThreadDiameterMm as number,
    compressedThreadDiameterMm: value.compressedThreadDiameterMm as number,
    interferenceMm: value.interferenceMm as number,
    unresolvedInterferenceMm: value.unresolvedInterferenceMm as number,
    requiredHoleExpansionMm: value.requiredHoleExpansionMm as number,
    requiredThreadCompressionMm: value.requiredThreadCompressionMm as number,
    holeExpansionMm: value.holeExpansionMm as number,
    threadCompressionMm: value.threadCompressionMm as number,
    holeExpansionLimitMm: value.holeExpansionLimitMm as number,
    threadCompressionLimitMm: value.threadCompressionLimitMm as number,
    initialPackingFraction: value.initialPackingFraction as number,
    finalPackingFraction: value.finalPackingFraction as number,
    solidFiberAreaMm2: value.solidFiberAreaMm2 as number,
    packingAreaErrorMm2: value.packingAreaErrorMm2 as number,
    fitEnergy: value.fitEnergy as number,
    availableEnergy: value.availableEnergy as number,
    remainingEnergy: value.remainingEnergy as number,
    neck: { ...value.neck },
    clearance: { ...value.clearance },
    settledOffset: { ...value.settledOffset },
  }
  const resolved = solveNeedleThreadPassage({
    version: 1,
    needle,
    thread,
    fuzz,
    hole: candidate.holeBefore,
    holeRadialStiffness: candidate.holeRadialStiffness,
    availableEnergy: candidate.availableEnergy,
    requestedOffset: candidate.settledOffset,
  })
  return JSON.stringify(resolved) === JSON.stringify(candidate) ? resolved : null
}
