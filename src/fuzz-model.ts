export interface FuzzMaterialV1 {
  version: 1
  density: number
  stiffness: number
  seed: number
  generatorVersion: 1
}

export interface FuzzCandidateV1 {
  version: 1
  id: string
  rootArcCell: number
  slot: number
  arcPosition: number
  side: -1 | 1
  lengthScale: number
  phaseRad: number
}

export interface FuzzCandidateInputV1 {
  version: 1
  pieceSeed: number
  rootThreadPathId: string
  rootArcCell: number
  materialSnapshotId: string
  material: FuzzMaterialV1
}

export interface FuzzMotionInputV1 {
  version: 1
  material: FuzzMaterialV1
  lengthScale: number
  massScale: number
  impulse: number
  elapsedSeconds: number
  phaseRad: number
  gravitySign?: -1 | 1
  motionEnabled?: boolean
}

export interface FuzzMotionStateV1 {
  version: 1
  bendingRigidity: number
  dampingRatio: number
  angularFrequency: number
  restAngleDeg: number
  initialAmplitudeDeg: number
  envelopeAmplitudeDeg: number
  angleDeg: number
  active: boolean
}

export const FUZZ_GENERATOR_VERSION = 1 as const
export const MAX_FUZZ_PER_SEGMENT = 12
export const MAX_STATIC_FUZZ_PER_TILE = 512
export const MAX_ACTIVE_FUZZ = 64
export const FUZZ_STOP_AMPLITUDE_DEG = 0.5

export const DEFAULT_FUZZ_MATERIAL: Readonly<FuzzMaterialV1> = Object.freeze({
  version: 1,
  density: 0.22,
  stiffness: 0.5,
  seed: 0,
  generatorVersion: FUZZ_GENERATOR_VERSION,
})

const FUZZ_KEYS = new Set(['version', 'density', 'stiffness', 'seed', 'generatorVersion'])
const TWO_POW_32 = 4_294_967_296

function isRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function finiteOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

function quantize(value: number, digits = 6): number {
  return Number(value.toFixed(digits))
}

function normalizeUint32(value: unknown, fallback: number): number {
  const numeric = finiteOr(value, fallback)
  return Math.trunc(numeric) >>> 0
}

/**
 * Normalizes a stored material one field at a time. Unknown object keys and
 * unknown model versions fall back as a whole so persisted data cannot smuggle
 * executable or unbounded content into the deterministic generator.
 */
export function normalizeFuzzMaterial(
  value: unknown,
  fallback: FuzzMaterialV1 = DEFAULT_FUZZ_MATERIAL,
): FuzzMaterialV1 {
  const safeFallback = isFuzzMaterial(fallback) ? fallback : DEFAULT_FUZZ_MATERIAL
  if (!isRecord(value) || value.version !== 1 || value.generatorVersion !== FUZZ_GENERATOR_VERSION
    || Object.keys(value).some((key) => !FUZZ_KEYS.has(key))) return { ...safeFallback }
  return {
    version: 1,
    density: quantize(clamp(finiteOr(value.density, safeFallback.density), 0, 1)),
    stiffness: quantize(clamp(finiteOr(value.stiffness, safeFallback.stiffness), 0, 1)),
    seed: normalizeUint32(value.seed, safeFallback.seed),
    generatorVersion: FUZZ_GENERATOR_VERSION,
  }
}

export function isFuzzMaterial(value: unknown): value is FuzzMaterialV1 {
  return isRecord(value)
    && value.version === 1
    && value.generatorVersion === FUZZ_GENERATOR_VERSION
    && Object.keys(value).every((key) => FUZZ_KEYS.has(key))
    && typeof value.density === 'number' && Number.isFinite(value.density) && value.density >= 0 && value.density <= 1
    && typeof value.stiffness === 'number' && Number.isFinite(value.stiffness) && value.stiffness >= 0 && value.stiffness <= 1
    && typeof value.seed === 'number' && Number.isSafeInteger(value.seed) && value.seed >= 0 && value.seed <= 0xffff_ffff
}

export function parseFuzzMaterial(value: unknown): FuzzMaterialV1 | null {
  return isFuzzMaterial(value) ? normalizeFuzzMaterial(value) : null
}

function mixText(hash: number, text: string): number {
  let mixed = hash >>> 0
  for (let index = 0; index < text.length; index += 1) {
    mixed ^= text.charCodeAt(index)
    mixed = Math.imul(mixed, 16_777_619)
  }
  return mixed >>> 0
}

export function fuzzHash32(...parts: readonly (number | string)[]): number {
  let hash = 2_166_136_261
  for (const part of parts) {
    hash = mixText(hash, typeof part === 'number' ? String(part >>> 0) : part.slice(0, 256))
    hash = mixText(hash, '\u001f')
  }
  return hash >>> 0
}

function hashUnit(...parts: readonly (number | string)[]): number {
  return fuzzHash32(...parts) / TWO_POW_32
}

/**
 * Generates candidates from stable root-path arc cells. Density is used only
 * as a threshold over a candidate's immutable presence hash, so a denser
 * material is guaranteed to be a superset of a sparser one with the same key.
 */
export function generateFuzzCandidates(input: FuzzCandidateInputV1): FuzzCandidateV1[] {
  if (input.version !== 1 || !Number.isSafeInteger(input.rootArcCell) || input.rootArcCell < 0) {
    throw new RangeError('rootArcCell must be a non-negative safe integer.')
  }
  const material = normalizeFuzzMaterial(input.material)
  const pieceSeed = normalizeUint32(input.pieceSeed, 0)
  const rootPath = String(input.rootThreadPathId).slice(0, 256)
  const materialId = String(input.materialSnapshotId).slice(0, 256)
  const cellSeed = fuzzHash32(
    pieceSeed,
    rootPath,
    input.rootArcCell,
    materialId,
    material.generatorVersion,
    material.seed,
  )
  const candidates: FuzzCandidateV1[] = []
  for (let slot = 0; slot < MAX_FUZZ_PER_SEGMENT; slot += 1) {
    if (hashUnit(cellSeed, slot, 'present') >= material.density) continue
    const arcWithinCell = hashUnit(cellSeed, slot, 'arc')
    candidates.push({
      version: 1,
      id: `fuzz-${cellSeed.toString(16).padStart(8, '0')}-${slot}`,
      rootArcCell: input.rootArcCell,
      slot,
      arcPosition: quantize(input.rootArcCell + arcWithinCell, 9),
      side: hashUnit(cellSeed, slot, 'side') < 0.5 ? -1 : 1,
      lengthScale: quantize(0.55 + 0.9 * hashUnit(cellSeed, slot, 'length')),
      phaseRad: quantize(2 * Math.PI * hashUnit(cellSeed, slot, 'phase'), 9),
    })
  }
  return candidates
}

export function fuzzBendingRigidity(stiffness: number): number {
  const normalized = clamp(finiteOr(stiffness, DEFAULT_FUZZ_MATERIAL.stiffness), 0, 1)
  return quantize(2 ** (-2 + 5 * normalized), 9)
}

/** Analytic damped response; callers sample it and never integrate an ODE. */
export function evaluateFuzzMotion(input: FuzzMotionInputV1): FuzzMotionStateV1 {
  const material = normalizeFuzzMaterial(input.material)
  const lengthScale = clamp(finiteOr(input.lengthScale, 1), 0.25, 2)
  const massScale = clamp(finiteOr(input.massScale, 1), 0.25, 4)
  const impulse = clamp(finiteOr(input.impulse, 0), -4, 4)
  const elapsedSeconds = clamp(finiteOr(input.elapsedSeconds, 0), 0, 60)
  const phaseRad = finiteOr(input.phaseRad, 0)
  const gravitySign = input.gravitySign === -1 ? -1 : 1
  const bendingRigidity = fuzzBendingRigidity(material.stiffness)
  const dampingRatio = quantize(0.55 + 0.3 * material.stiffness, 9)
  const angularFrequency = quantize(clamp(
    7 * Math.sqrt(bendingRigidity / massScale) / (lengthScale * lengthScale),
    4,
    22,
  ), 9)
  const restAngleDeg = quantize(gravitySign * clamp(6 * lengthScale ** 3 / bendingRigidity, 0, 36), 9)
  const initialAmplitudeDeg = quantize(clamp(12 * impulse * lengthScale ** 2 / bendingRigidity, -32, 32), 9)
  const envelopeAmplitudeDeg = quantize(
    Math.abs(initialAmplitudeDeg) * Math.exp(-dampingRatio * angularFrequency * elapsedSeconds),
    9,
  )
  const dynamicEnabled = input.motionEnabled !== false
  const dampedFrequency = angularFrequency * Math.sqrt(Math.max(0, 1 - dampingRatio * dampingRatio))
  const angleDeg = dynamicEnabled
    ? restAngleDeg + initialAmplitudeDeg
      * Math.exp(-dampingRatio * angularFrequency * elapsedSeconds)
      * Math.cos(dampedFrequency * elapsedSeconds + phaseRad)
    : restAngleDeg
  return {
    version: 1,
    bendingRigidity,
    dampingRatio,
    angularFrequency,
    restAngleDeg,
    initialAmplitudeDeg,
    envelopeAmplitudeDeg: dynamicEnabled ? envelopeAmplitudeDeg : 0,
    angleDeg: quantize(angleDeg, 9),
    active: dynamicEnabled && envelopeAmplitudeDeg >= FUZZ_STOP_AMPLITUDE_DEG,
  }
}
