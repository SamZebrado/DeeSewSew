import {
  DEFAULT_NEEDLE_DIAMETER,
  normalizeNeedleDiameter,
  parseNeedleDiameter,
  type NeedleDiameterV1,
} from './needle-thread-physics'

export const PENETRATION_MODEL_ID = 'pem-v1' as const
export const PENETRATION_CALIBRATION_ID = 'pem-v1-calibration-1' as const
export const MAX_PENETRATION_LAYERS = 32
export const PENETRATION_EXP_LUT_VERSION = 1 as const
export const PENETRATION_PARAMETER_EPSILON = 1e-6

export type PenetrationLayerStatus = 'not-entered' | 'entered-stopped' | 'passed'
export type PenetrationTerminalStatus = 'completed' | 'not-entered' | 'entered-stopped'

export interface PenetrationLayerInputV1 {
  version: 1
  layerId: string
  edgeId: string
  u: number
  thickness: number
  radialHardness: number
  separationToughness: number
  friction: number
  compaction: number
  recovery: number
  lineDiameterMm: number
  crossAngleDeg?: number
  existingOpeningMinorMm?: number
}

export interface PenetrationInputV1 {
  version: 1
  modelId: 'pem-v1'
  calibrationId?: 'pem-v1-calibration-1'
  mappedEnergy: number
  needle: NeedleDiameterV1
  needleAzimuthDeg: number
  needleInclinationFromNormalDeg: number
  layers: readonly PenetrationLayerInputV1[]
}

export interface PenetrationLayerSnapshotV1 {
  version: 1
  layerId: string
  edgeId: string
  u: number
  thickness: number
  radialHardness: number
  separationToughness: number
  friction: number
  compaction: number
  recovery: number
  lineDiameterMm: number
  crossAngleDeg: number
  existingOpeningMinorMm: number
}

export interface LayerOpeningV1 {
  version: 1
  modelId: 'pem-v1'
  traceId: string
  openingId: string
  layerId: string
  edgeId: string
  u: number
  outcome: 'passed' | 'partial'
  majorDiameterMm: number
  minorDiameterMm: number
  residualMajorDiameterMm: number
  residualMinorDiameterMm: number
  rotationDeg: number
}

export interface PenetrationLayerResultV1 {
  version: 1
  index: number
  layer: PenetrationLayerSnapshotV1
  budgetBefore: number
  thresholdCost: number
  budgetAfterThreshold: number
  lambdaDeformation: number
  lambdaFriction: number
  deformationLoss: number
  frictionLoss: number
  totalCost: number
  residualEnergy: number
  status: PenetrationLayerStatus
  opening?: LayerOpeningV1
}

export interface PenetrationTraceV1 {
  version: 1
  modelId: 'pem-v1'
  calibrationId: 'pem-v1-calibration-1'
  inputDigest: string
  traceId: string
  initialEnergy: number
  remainingEnergy: number
  needle: NeedleDiameterV1
  needleAzimuthDeg: number
  needleInclinationFromNormalDeg: number
  contactedLayerCount: number
  passedLayerCount: number
  enteredLayerCount: number
  terminalStatus: PenetrationTerminalStatus
  layers: PenetrationLayerResultV1[]
}

interface PenetrationCalibrationV1 {
  version: 1
  id: 'pem-v1-calibration-1'
  elasticScale: number
  compactionHardening: number
  separationScale: number
  deformationScale: number
  minimumCompactionLoss: number
  betaScale: number
  betaMaximum: number
  lambdaMaximum: number
  openingDeformationShare: number
  partialExitFraction: number
  lineResistanceScale: number
  crossResistanceScale: number
  openingReliefMaximum: number
}

export const PEM_V1_CALIBRATION: Readonly<PenetrationCalibrationV1> = Object.freeze({
  version: 1,
  id: PENETRATION_CALIBRATION_ID,
  elasticScale: 1,
  compactionHardening: 0.45,
  separationScale: 0.55,
  deformationScale: 0.32,
  minimumCompactionLoss: 0.15,
  betaScale: 0.55,
  betaMaximum: 2,
  lambdaMaximum: 4,
  openingDeformationShare: 0.72,
  partialExitFraction: 0.08,
  lineResistanceScale: 0.12,
  crossResistanceScale: 0.2,
  openingReliefMaximum: 0.75,
})

const EXP_LUT_STEP = 1 / 256
const EXP_LUT_MAXIMUM = PEM_V1_CALIBRATION.lambdaMaximum
const EXP_NEGATIVE_LUT = Object.freeze(Array.from(
  { length: Math.round(EXP_LUT_MAXIMUM / EXP_LUT_STEP) + 1 },
  (_, index) => Number(Math.exp(-index * EXP_LUT_STEP).toFixed(15)),
))
const MINIMUM_COSINE = Math.cos(70 * Math.PI / 180)
const TRACE_KEYS = new Set([
  'version', 'modelId', 'calibrationId', 'inputDigest', 'traceId', 'initialEnergy', 'remainingEnergy', 'needle',
  'needleAzimuthDeg', 'needleInclinationFromNormalDeg', 'contactedLayerCount', 'passedLayerCount',
  'enteredLayerCount', 'terminalStatus', 'layers',
])
const RESULT_KEYS = new Set([
  'version', 'index', 'layer', 'budgetBefore', 'thresholdCost', 'budgetAfterThreshold', 'lambdaDeformation',
  'lambdaFriction', 'deformationLoss', 'frictionLoss', 'totalCost', 'residualEnergy', 'status', 'opening',
])
const LAYER_KEYS = new Set([
  'version', 'layerId', 'edgeId', 'u', 'thickness', 'radialHardness', 'separationToughness', 'friction',
  'compaction', 'recovery', 'lineDiameterMm', 'crossAngleDeg', 'existingOpeningMinorMm',
])
const OPENING_KEYS = new Set([
  'version', 'modelId', 'traceId', 'openingId', 'layerId', 'edgeId', 'u', 'outcome', 'majorDiameterMm',
  'minorDiameterMm', 'residualMajorDiameterMm', 'residualMinorDiameterMm', 'rotationDeg',
])
const SAFE_ID = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,95}$/

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

function normalizeAngle(value: unknown): number {
  const wrapped = ((finiteOr(value, 0) % 360) + 360) % 360
  const normalized = quantize(wrapped, 6)
  return normalized >= 360 ? 0 : normalized
}

function safeId(value: unknown, fallback: string): string {
  return typeof value === 'string' && SAFE_ID.test(value) ? value : fallback
}

function normalizeLayer(value: PenetrationLayerInputV1, index: number): PenetrationLayerSnapshotV1 {
  const fallbackId = `layer-${index}`
  return {
    version: 1,
    layerId: safeId(value?.layerId, fallbackId),
    edgeId: safeId(value?.edgeId, fallbackId),
    u: quantize(clamp(finiteOr(value?.u, 0.5), 0, 1), 6),
    thickness: quantize(clamp(finiteOr(value?.thickness, 1), 0.25, 2), 6),
    radialHardness: quantize(clamp(finiteOr(value?.radialHardness, 1), 0.25, 4), 6),
    separationToughness: quantize(clamp(finiteOr(value?.separationToughness, 0.4), 0.05, 1.5), 6),
    friction: quantize(clamp(finiteOr(value?.friction, 0.25), 0, 0.8), 6),
    compaction: quantize(clamp(finiteOr(value?.compaction, 0.5), 0, 1), 6),
    recovery: quantize(clamp(finiteOr(value?.recovery, 0.5), 0, 0.95), 6),
    lineDiameterMm: quantize(clamp(finiteOr(value?.lineDiameterMm, 0.6), 0.15, 2.4), 6),
    crossAngleDeg: quantize(clamp(finiteOr(value?.crossAngleDeg, 0), 0, 90), 6),
    existingOpeningMinorMm: quantize(clamp(finiteOr(value?.existingOpeningMinorMm, 0), 0, 6), 6),
  }
}

/** Monotone fixed-step interpolation used by pem-v1 instead of per-layer exp. */
export function penetrationTransmission(lambda: number): number {
  const normalized = clamp(finiteOr(lambda, 0), 0, EXP_LUT_MAXIMUM)
  const position = normalized / EXP_LUT_STEP
  const lowerIndex = Math.floor(position)
  const upperIndex = Math.min(EXP_NEGATIVE_LUT.length - 1, lowerIndex + 1)
  const fraction = position - lowerIndex
  const lower = EXP_NEGATIVE_LUT[lowerIndex]!
  const upper = EXP_NEGATIVE_LUT[upperIndex]!
  return quantize(lower + (upper - lower) * fraction, 12)
}

function mixHash32(hash: number, text: string): number {
  let mixed = hash
  for (let index = 0; index < text.length; index += 1) {
    mixed ^= text.charCodeAt(index)
    mixed = Math.imul(mixed, 16_777_619)
  }
  return mixed >>> 0
}

function digestInput(
  energy: number,
  needle: NeedleDiameterV1,
  azimuth: number,
  inclination: number,
  layers: readonly PenetrationLayerInputV1[],
): string {
  let hash = 2_166_136_261
  hash = mixHash32(hash, `1|${PENETRATION_MODEL_ID}|${PENETRATION_CALIBRATION_ID}|${energy}|`)
  hash = mixHash32(hash, JSON.stringify(needle))
  hash = mixHash32(hash, `|${azimuth}|${inclination}|${layers.length}|`)
  for (let index = 0; index < layers.length; index += 1) {
    hash = mixHash32(hash, JSON.stringify(normalizeLayer(layers[index]!, index)))
    hash = mixHash32(hash, '|')
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

function makeOpening(
  traceId: string,
  layer: PenetrationLayerSnapshotV1,
  status: 'passed' | 'entered-stopped',
  needleDiameter: number,
  q: number,
  stiffness: number,
  r0: number,
  availableAfterThreshold: number,
  lambdaDeformation: number,
  rotationDeg: number,
  index: number,
): LayerOpeningV1 {
  const elasticPeak = 0.5 * stiffness * r0 * r0
  const deformationEnergy = PEM_V1_CALIBRATION.openingDeformationShare
    * availableAfterThreshold * (1 - penetrationTransmission(lambdaDeformation))
  const requestedRadius = Math.sqrt(Math.max(0, 2 * (elasticPeak + deformationEnergy) / stiffness))
  const minorDiameter = clamp(2 * requestedRadius / Math.sqrt(q), needleDiameter, 3 * needleDiameter)
  const majorDiameter = Math.min(1.8 * minorDiameter, q * minorDiameter)
  return {
    version: 1,
    modelId: PENETRATION_MODEL_ID,
    traceId,
    openingId: `${traceId}:opening:${index}`,
    layerId: layer.layerId,
    edgeId: layer.edgeId,
    u: layer.u,
    outcome: status === 'passed' ? 'passed' : 'partial',
    majorDiameterMm: quantize(majorDiameter),
    minorDiameterMm: quantize(minorDiameter),
    residualMajorDiameterMm: quantize((1 - layer.recovery) * majorDiameter),
    residualMinorDiameterMm: quantize((1 - layer.recovery) * minorDiameter),
    rotationDeg,
  }
}

/**
 * Evaluates one already-mapped contact in stable front-to-target order. Runtime
 * and scratch work are O(k)/O(1), with k hard-capped at 32.
 */
export function evaluatePenetrationEnergy(input: PenetrationInputV1): PenetrationTraceV1 {
  if (!input || input.version !== 1 || input.modelId !== PENETRATION_MODEL_ID
    || (input.calibrationId !== undefined && input.calibrationId !== PENETRATION_CALIBRATION_ID)) {
    throw new TypeError('Unsupported penetration input or model version.')
  }
  if (!Array.isArray(input.layers)) throw new TypeError('Penetration layers must be an array.')
  if (input.layers.length > MAX_PENETRATION_LAYERS) {
    throw new RangeError(`pem-v1 accepts at most ${MAX_PENETRATION_LAYERS} layers.`)
  }
  const initialEnergy = quantize(clamp(finiteOr(input.mappedEnergy, 0), 0, 1_024))
  const needle = normalizeNeedleDiameter(input.needle ?? DEFAULT_NEEDLE_DIAMETER)
  const azimuth = normalizeAngle(input.needleAzimuthDeg)
  const inclination = quantize(clamp(finiteOr(input.needleInclinationFromNormalDeg, 0), 0, 70), 6)
  const inputDigest = digestInput(initialEnergy, needle, azimuth, inclination, input.layers)
  const traceId = `${PENETRATION_MODEL_ID}-${inputDigest}`
  const results: PenetrationLayerResultV1[] = []
  const cosine = clamp(Math.abs(Math.cos(inclination * Math.PI / 180)), MINIMUM_COSINE, 1)
  const q = 1 / cosine
  let budget = initialEnergy
  let passedLayerCount = 0
  let enteredLayerCount = 0
  let terminalStatus: PenetrationTerminalStatus = 'completed'
  for (let index = 0; index < input.layers.length; index += 1) {
    const layer = normalizeLayer(input.layers[index]!, index)
    const budgetBefore = budget
    const pathLength = layer.thickness * q
    const lineRatio = layer.lineDiameterMm / 0.6
    const lineResistance = 1 + PEM_V1_CALIBRATION.lineResistanceScale * lineRatio * lineRatio
    const crossSine = Math.sin(layer.crossAngleDeg * Math.PI / 180)
    const crossResistance = 1 + PEM_V1_CALIBRATION.crossResistanceScale * crossSine * crossSine
    const openingRelief = PEM_V1_CALIBRATION.openingReliefMaximum
      * clamp(layer.existingOpeningMinorMm / needle.diameterMm, 0, 1)
    const stiffness = PEM_V1_CALIBRATION.elasticScale * layer.radialHardness
      * (1 + PEM_V1_CALIBRATION.compactionHardening * layer.compaction * layer.compaction)
      * lineResistance * crossResistance * (1 - 0.6 * openingRelief)
    const r0 = needle.diameterMm / 2 * Math.sqrt(q)
    const elasticThreshold = 0.5 * stiffness * r0 * r0
    const separationThreshold = PEM_V1_CALIBRATION.separationScale * layer.separationToughness
      * needle.diameterMm * pathLength * lineResistance * crossResistance
    const thresholdCost = quantize((elasticThreshold + separationThreshold) * (1 - openingRelief), 12)
    if (budgetBefore <= thresholdCost + PENETRATION_PARAMETER_EPSILON) {
      results.push({
        version: 1,
        index,
        layer,
        budgetBefore,
        thresholdCost,
        budgetAfterThreshold: 0,
        lambdaDeformation: 0,
        lambdaFriction: 0,
        deformationLoss: 0,
        frictionLoss: 0,
        totalCost: 0,
        residualEnergy: budgetBefore,
        status: 'not-entered',
      })
      terminalStatus = 'not-entered'
      break
    }
    enteredLayerCount += 1
    const afterThreshold = Math.max(0, budgetBefore - thresholdCost)
    const lambdaDeformation = clamp(
      PEM_V1_CALIBRATION.deformationScale
        * (PEM_V1_CALIBRATION.minimumCompactionLoss
          + (1 - PEM_V1_CALIBRATION.minimumCompactionLoss) * layer.compaction)
        * pathLength,
      0,
      PEM_V1_CALIBRATION.lambdaMaximum,
    )
    const beta = clamp(
      PEM_V1_CALIBRATION.betaScale * pathLength * (0.25 + 0.75 * layer.compaction) * crossResistance,
      0,
      PEM_V1_CALIBRATION.betaMaximum,
    )
    const lambdaFriction = layer.friction * beta
    const totalLambda = Math.min(lambdaDeformation + lambdaFriction, PEM_V1_CALIBRATION.lambdaMaximum)
    const residual = quantize(afterThreshold * penetrationTransmission(totalLambda), 12)
    const deformationLoss = quantize(afterThreshold * (1 - penetrationTransmission(lambdaDeformation)), 12)
    const frictionLoss = quantize(Math.max(0, afterThreshold - deformationLoss - residual), 12)
    const partialExitThreshold = thresholdCost * PEM_V1_CALIBRATION.partialExitFraction
    const status: PenetrationLayerStatus = residual <= partialExitThreshold + PENETRATION_PARAMETER_EPSILON
      ? 'entered-stopped'
      : 'passed'
    const result: PenetrationLayerResultV1 = {
      version: 1,
      index,
      layer,
      budgetBefore,
      thresholdCost,
      budgetAfterThreshold: quantize(afterThreshold, 12),
      lambdaDeformation: quantize(lambdaDeformation, 12),
      lambdaFriction: quantize(lambdaFriction, 12),
      deformationLoss,
      frictionLoss,
      totalCost: quantize(budgetBefore - residual, 12),
      residualEnergy: residual,
      status,
      opening: makeOpening(
        traceId,
        layer,
        status === 'passed' ? 'passed' : 'entered-stopped',
        needle.diameterMm,
        q,
        stiffness,
        r0,
        afterThreshold,
        lambdaDeformation,
        azimuth,
        index,
      ),
    }
    results.push(result)
    budget = residual
    if (status === 'entered-stopped') {
      terminalStatus = 'entered-stopped'
      break
    }
    passedLayerCount += 1
  }
  return {
    version: 1,
    modelId: PENETRATION_MODEL_ID,
    calibrationId: PENETRATION_CALIBRATION_ID,
    inputDigest,
    traceId,
    initialEnergy,
    remainingEnergy: quantize(budget, 12),
    needle,
    needleAzimuthDeg: azimuth,
    needleInclinationFromNormalDeg: inclination,
    contactedLayerCount: results.length,
    passedLayerCount,
    enteredLayerCount,
    terminalStatus,
    layers: results,
  }
}

function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function isNormalizedLayer(value: unknown): value is PenetrationLayerSnapshotV1 {
  return isRecord(value) && value.version === 1 && hasOnlyKeys(value, LAYER_KEYS)
    && typeof value.layerId === 'string' && SAFE_ID.test(value.layerId)
    && typeof value.edgeId === 'string' && SAFE_ID.test(value.edgeId)
    && ['u', 'thickness', 'radialHardness', 'separationToughness', 'friction', 'compaction', 'recovery',
      'lineDiameterMm', 'crossAngleDeg', 'existingOpeningMinorMm']
      .every((key) => typeof value[key] === 'number' && Number.isFinite(value[key]))
    && (value.u as number) >= 0 && (value.u as number) <= 1
    && (value.thickness as number) >= 0.25 && (value.thickness as number) <= 2
    && (value.radialHardness as number) >= 0.25 && (value.radialHardness as number) <= 4
    && (value.separationToughness as number) >= 0.05 && (value.separationToughness as number) <= 1.5
    && (value.friction as number) >= 0 && (value.friction as number) <= 0.8
    && (value.compaction as number) >= 0 && (value.compaction as number) <= 1
    && (value.recovery as number) >= 0 && (value.recovery as number) <= 0.95
    && (value.lineDiameterMm as number) >= 0.15 && (value.lineDiameterMm as number) <= 2.4
    && (value.crossAngleDeg as number) >= 0 && (value.crossAngleDeg as number) <= 90
    && (value.existingOpeningMinorMm as number) >= 0 && (value.existingOpeningMinorMm as number) <= 6
}

function nearlyEqual(first: number, second: number, epsilon = 2e-9): boolean {
  return Math.abs(first - second) <= epsilon
}

function parseOpening(value: unknown): LayerOpeningV1 | null {
  if (!isRecord(value) || value.version !== 1 || value.modelId !== PENETRATION_MODEL_ID
    || !hasOnlyKeys(value, OPENING_KEYS)
    || typeof value.traceId !== 'string' || typeof value.openingId !== 'string'
    || typeof value.layerId !== 'string' || typeof value.edgeId !== 'string'
    || (value.outcome !== 'passed' && value.outcome !== 'partial')
    || !['u', 'majorDiameterMm', 'minorDiameterMm', 'residualMajorDiameterMm', 'residualMinorDiameterMm', 'rotationDeg']
      .every((key) => typeof value[key] === 'number' && Number.isFinite(value[key]) && value[key] >= 0)) return null
  return {
    version: 1,
    modelId: PENETRATION_MODEL_ID,
    traceId: value.traceId,
    openingId: value.openingId,
    layerId: value.layerId,
    edgeId: value.edgeId,
    u: value.u as number,
    outcome: value.outcome,
    majorDiameterMm: value.majorDiameterMm as number,
    minorDiameterMm: value.minorDiameterMm as number,
    residualMajorDiameterMm: value.residualMajorDiameterMm as number,
    residualMinorDiameterMm: value.residualMinorDiameterMm as number,
    rotationDeg: value.rotationDeg as number,
  }
}

function parseLayerResult(value: unknown, expectedIndex: number, traceId: string): PenetrationLayerResultV1 | null {
  if (!isRecord(value) || value.version !== 1 || !hasOnlyKeys(value, RESULT_KEYS)
    || value.index !== expectedIndex || !isNormalizedLayer(value.layer)
    || (value.status !== 'not-entered' && value.status !== 'entered-stopped' && value.status !== 'passed')) return null
  const numericKeys = [
    'budgetBefore', 'thresholdCost', 'budgetAfterThreshold', 'lambdaDeformation', 'lambdaFriction',
    'deformationLoss', 'frictionLoss', 'totalCost', 'residualEnergy',
  ] as const
  if (numericKeys.some((key) => !isFiniteNonNegative(value[key]))) return null
  const opening = value.opening === undefined ? undefined : parseOpening(value.opening)
  if ((value.status === 'not-entered' && value.opening !== undefined)
    || (value.status !== 'not-entered' && (!opening || opening.traceId !== traceId))) return null
  const budgetBefore = value.budgetBefore as number
  const thresholdCost = value.thresholdCost as number
  const budgetAfterThreshold = value.budgetAfterThreshold as number
  const residualEnergy = value.residualEnergy as number
  if (residualEnergy > budgetBefore + PENETRATION_PARAMETER_EPSILON) return null
  if (value.status === 'not-entered') {
    if (!nearlyEqual(budgetAfterThreshold, 0) || !nearlyEqual(value.lambdaDeformation as number, 0)
      || !nearlyEqual(value.lambdaFriction as number, 0) || !nearlyEqual(value.deformationLoss as number, 0)
      || !nearlyEqual(value.frictionLoss as number, 0) || !nearlyEqual(value.totalCost as number, 0)
      || !nearlyEqual(residualEnergy, budgetBefore)) return null
  } else if (!nearlyEqual(budgetAfterThreshold, budgetBefore - thresholdCost)
    || !nearlyEqual(value.totalCost as number, budgetBefore - residualEnergy)
    || opening?.layerId !== value.layer.layerId || opening.edgeId !== value.layer.edgeId
    || !nearlyEqual(opening.u, value.layer.u)
    || opening.outcome !== (value.status === 'passed' ? 'passed' : 'partial')) return null
  const result: PenetrationLayerResultV1 = {
    version: 1,
    index: expectedIndex,
    layer: { ...value.layer },
    budgetBefore: value.budgetBefore as number,
    thresholdCost: value.thresholdCost as number,
    budgetAfterThreshold: value.budgetAfterThreshold as number,
    lambdaDeformation: value.lambdaDeformation as number,
    lambdaFriction: value.lambdaFriction as number,
    deformationLoss: value.deformationLoss as number,
    frictionLoss: value.frictionLoss as number,
    totalCost: value.totalCost as number,
    residualEnergy: value.residualEnergy as number,
    status: value.status,
  }
  if (opening) result.opening = opening
  return result
}

export function parsePenetrationTrace(value: unknown): PenetrationTraceV1 | null {
  if (!isRecord(value) || value.version !== 1 || value.modelId !== PENETRATION_MODEL_ID
    || value.calibrationId !== PENETRATION_CALIBRATION_ID || !hasOnlyKeys(value, TRACE_KEYS)
    || typeof value.inputDigest !== 'string' || !/^[0-9a-f]{8}$/.test(value.inputDigest)
    || value.traceId !== `${PENETRATION_MODEL_ID}-${value.inputDigest}`
    || !isFiniteNonNegative(value.initialEnergy) || !isFiniteNonNegative(value.remainingEnergy)
    || typeof value.needleAzimuthDeg !== 'number' || !Number.isFinite(value.needleAzimuthDeg)
    || typeof value.needleInclinationFromNormalDeg !== 'number' || !Number.isFinite(value.needleInclinationFromNormalDeg)
    || !Number.isSafeInteger(value.contactedLayerCount) || !Number.isSafeInteger(value.passedLayerCount)
    || !Number.isSafeInteger(value.enteredLayerCount)
    || (value.terminalStatus !== 'completed' && value.terminalStatus !== 'not-entered'
      && value.terminalStatus !== 'entered-stopped')
    || !Array.isArray(value.layers) || value.layers.length > MAX_PENETRATION_LAYERS
    || value.contactedLayerCount !== value.layers.length) return null
  const needle = parseNeedleDiameter(value.needle)
  if (!needle) return null
  const layers: PenetrationLayerResultV1[] = []
  for (let index = 0; index < value.layers.length; index += 1) {
    const layer = parseLayerResult(value.layers[index], index, value.traceId)
    if (!layer) return null
    layers.push(layer)
  }
  const passed = layers.filter((layer) => layer.status === 'passed').length
  const entered = layers.filter((layer) => layer.status !== 'not-entered').length
  if (passed !== value.passedLayerCount || entered !== value.enteredLayerCount) return null
  if (value.passedLayerCount < 0 || value.enteredLayerCount < 0
    || value.passedLayerCount > value.contactedLayerCount || value.enteredLayerCount > value.contactedLayerCount) return null
  for (let index = 0; index < layers.length; index += 1) {
    const layer = layers[index]!
    if (index === 0 && !nearlyEqual(layer.budgetBefore, value.initialEnergy)) return null
    if (index > 0) {
      const previous = layers[index - 1]!
      if (previous.status !== 'passed' || !nearlyEqual(layer.budgetBefore, previous.residualEnergy)) return null
    }
    if (layer.opening) {
      if (layer.opening.openingId !== `${value.traceId}:opening:${index}`
        || layer.opening.minorDiameterMm < needle.diameterMm - PENETRATION_PARAMETER_EPSILON
        || layer.opening.minorDiameterMm > 3 * needle.diameterMm + PENETRATION_PARAMETER_EPSILON
        || layer.opening.majorDiameterMm < layer.opening.minorDiameterMm - PENETRATION_PARAMETER_EPSILON
        || layer.opening.majorDiameterMm > 1.8 * layer.opening.minorDiameterMm + PENETRATION_PARAMETER_EPSILON) return null
    }
  }
  const last = layers.at(-1)
  const expectedRemaining = last?.residualEnergy ?? value.initialEnergy
  const expectedTerminal: PenetrationTerminalStatus = last?.status === 'not-entered'
    ? 'not-entered'
    : last?.status === 'entered-stopped' ? 'entered-stopped' : 'completed'
  if (!nearlyEqual(value.remainingEnergy, expectedRemaining) || value.terminalStatus !== expectedTerminal) return null
  return {
    version: 1,
    modelId: PENETRATION_MODEL_ID,
    calibrationId: PENETRATION_CALIBRATION_ID,
    inputDigest: value.inputDigest,
    traceId: value.traceId,
    initialEnergy: value.initialEnergy,
    remainingEnergy: value.remainingEnergy,
    needle,
    needleAzimuthDeg: value.needleAzimuthDeg,
    needleInclinationFromNormalDeg: value.needleInclinationFromNormalDeg,
    contactedLayerCount: value.contactedLayerCount,
    passedLayerCount: value.passedLayerCount,
    enteredLayerCount: value.enteredLayerCount,
    terminalStatus: value.terminalStatus,
    layers,
  }
}
