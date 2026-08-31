import {
  normalizeFuzzMaterial,
  type FuzzMaterialV1,
} from './fuzz-model'
import {
  normalizeThreadGeometrySnapshot,
  type ThreadGeometrySnapshotV1,
} from './needle-thread-physics'

export interface ThreadMaterialParamsV1 {
  version: 1
  widthScale: number
  strandCount: number
  twist: number
  sheen: number
  highlightSharpness: number
  fuzz: number
  speckle: number
  metallic: number
  colorVariation: number
  resistance: number
  compliance: number
  recovery: number
}

export type BuiltInThreadMaterialId =
  | 'stranded-cotton'
  | 'pearl-cotton'
  | 'satin-rayon'
  | 'matte-wool'
  | 'metallic-composite'

export interface ThreadMaterialPresetV1 {
  version: 1
  id: BuiltInThreadMaterialId
  name: string
  params: ThreadMaterialParamsV1
}

export interface CustomThreadMaterialV1 {
  version: 1
  id: string
  name: string
  params: ThreadMaterialParamsV1
}

/** A self-contained, lighting-neutral copy saved with a stitch. */
export interface ThreadMaterialSnapshotV1 {
  version: 1
  sourceId: string
  name: string
  params: ThreadMaterialParamsV1
  geometry?: ThreadGeometrySnapshotV1
  fuzzMaterial?: FuzzMaterialV1
}

export interface ThreadMaterialPhysicalOptionsV1 {
  geometry?: ThreadGeometrySnapshotV1
  fuzzMaterial?: FuzzMaterialV1
}

interface ParameterLimit {
  min: number
  max: number
  step: number
  integer?: boolean
}

export const MAX_CUSTOM_THREAD_MATERIALS = 12
export const MAX_CUSTOM_THREAD_MATERIAL_NAME_LENGTH = 32
export const DEFAULT_THREAD_MATERIAL_ID: BuiltInThreadMaterialId = 'stranded-cotton'

export const THREAD_MATERIAL_PARAMETER_LIMITS: Readonly<Record<Exclude<keyof ThreadMaterialParamsV1, 'version'>, ParameterLimit>> = Object.freeze({
  widthScale: { min: 0.5, max: 2, step: 0.01 },
  strandCount: { min: 1, max: 12, step: 1, integer: true },
  twist: { min: 0, max: 1, step: 0.01 },
  sheen: { min: 0, max: 1, step: 0.01 },
  highlightSharpness: { min: 0, max: 1, step: 0.01 },
  fuzz: { min: 0, max: 1, step: 0.01 },
  speckle: { min: 0, max: 1, step: 0.01 },
  metallic: { min: 0, max: 1, step: 0.01 },
  colorVariation: { min: 0, max: 0.5, step: 0.01 },
  resistance: { min: 0.25, max: 4, step: 0.01 },
  compliance: { min: 0, max: 1, step: 0.01 },
  recovery: { min: 0, max: 0.95, step: 0.01 },
})

const PARAMETER_KEYS = Object.freeze(Object.keys(THREAD_MATERIAL_PARAMETER_LIMITS) as Array<Exclude<keyof ThreadMaterialParamsV1, 'version'>>)
const PARAMETER_OBJECT_KEYS = new Set<string>(['version', ...PARAMETER_KEYS])
const CUSTOM_OBJECT_KEYS = new Set(['version', 'id', 'name', 'params'])
const SNAPSHOT_OBJECT_KEYS = new Set(['version', 'sourceId', 'name', 'params', 'geometry', 'fuzzMaterial'])
const CUSTOM_ID_PATTERN = /^custom-[a-z0-9](?:[a-z0-9_-]{0,46}[a-z0-9])?$/
const SAFE_BUILT_IN_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const UNSAFE_TEXT_PATTERN = /(?:\b(?:data|blob|javascript|vbscript|file|https?|ftp|mailto):|[/\\]|\b(?:[a-z0-9-]+\.)+[a-z]{2,63}(?:[:?#]|$)|\b(?:\d{1,3}\.){3}\d{1,3}\b|www\.|url\s*\(|@import\b|expression\s*\(|<|>|\{|\}|&(?:lt|gt|#x?0*3c|#0*60);|\b(?:script|svg|html|css|iframe|object|embed|style)\b)/iu

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function hasOnlyKeys(value: Record<string, unknown>, keys: ReadonlySet<string>): boolean {
  return Object.keys(value).every((key) => keys.has(key))
}

function quantize(value: number, limit: ParameterLimit): number {
  const clamped = Math.min(limit.max, Math.max(limit.min, value))
  if (limit.integer) return Math.round(clamped)
  const ticks = Math.round((clamped - limit.min) / limit.step)
  return Number((limit.min + ticks * limit.step).toFixed(6))
}

function cloneParams(params: ThreadMaterialParamsV1): ThreadMaterialParamsV1 {
  return { ...params }
}

function freezeParams(params: ThreadMaterialParamsV1): ThreadMaterialParamsV1 {
  return Object.freeze(params)
}

const BUILT_IN_DEFINITIONS: readonly ThreadMaterialPresetV1[] = [
  {
    version: 1,
    id: 'stranded-cotton',
    name: 'Stranded cotton',
    params: { version: 1, widthScale: 1, strandCount: 6, twist: 0.24, sheen: 0.34, highlightSharpness: 0.42, fuzz: 0.22, speckle: 0.08, metallic: 0, colorVariation: 0.08, resistance: 1, compliance: 0.62, recovery: 0.54 },
  },
  {
    version: 1,
    id: 'pearl-cotton',
    name: 'Pearl cotton',
    params: { version: 1, widthScale: 1.12, strandCount: 1, twist: 0.76, sheen: 0.52, highlightSharpness: 0.58, fuzz: 0.12, speckle: 0.05, metallic: 0, colorVariation: 0.05, resistance: 1.28, compliance: 0.48, recovery: 0.62 },
  },
  {
    version: 1,
    id: 'satin-rayon',
    name: 'Satin rayon',
    params: { version: 1, widthScale: 0.94, strandCount: 6, twist: 0.16, sheen: 0.9, highlightSharpness: 0.9, fuzz: 0.04, speckle: 0.03, metallic: 0, colorVariation: 0.06, resistance: 0.78, compliance: 0.78, recovery: 0.72 },
  },
  {
    version: 1,
    id: 'matte-wool',
    name: 'Matte cotton and wool',
    params: { version: 1, widthScale: 1.34, strandCount: 4, twist: 0.3, sheen: 0.08, highlightSharpness: 0.18, fuzz: 0.72, speckle: 0.18, metallic: 0, colorVariation: 0.14, resistance: 1.46, compliance: 0.7, recovery: 0.38 },
  },
  {
    version: 1,
    id: 'metallic-composite',
    name: 'Metallic composite',
    params: { version: 1, widthScale: 0.86, strandCount: 3, twist: 0.44, sheen: 0.96, highlightSharpness: 1, fuzz: 0.02, speckle: 0.38, metallic: 0.94, colorVariation: 0.12, resistance: 1.72, compliance: 0.28, recovery: 0.76 },
  },
]

export const THREAD_MATERIAL_PRESETS: readonly ThreadMaterialPresetV1[] = Object.freeze(BUILT_IN_DEFINITIONS.map((preset) => Object.freeze({
  ...preset,
  params: freezeParams(cloneParams(preset.params)),
})))
Object.values(THREAD_MATERIAL_PARAMETER_LIMITS).forEach(Object.freeze)

const DEFAULT_PARAMS = THREAD_MATERIAL_PRESETS[0]!.params

export function normalizeThreadMaterialParams(value: unknown, fallback: ThreadMaterialParamsV1 = DEFAULT_PARAMS): ThreadMaterialParamsV1 {
  const safeFallback = isThreadMaterialParams(fallback) ? fallback : DEFAULT_PARAMS
  if (!isPlainRecord(value) || value.version !== 1 || !hasOnlyKeys(value, PARAMETER_OBJECT_KEYS)) return cloneParams(safeFallback)
  const result = { version: 1 } as ThreadMaterialParamsV1
  for (const key of PARAMETER_KEYS) {
    const candidate = value[key]
    const numeric = typeof candidate === 'number' && Number.isFinite(candidate) ? candidate : safeFallback[key]
    result[key] = quantize(numeric, THREAD_MATERIAL_PARAMETER_LIMITS[key])
  }
  return result
}

export function isThreadMaterialParams(value: unknown): value is ThreadMaterialParamsV1 {
  if (!isPlainRecord(value) || value.version !== 1 || !hasOnlyKeys(value, PARAMETER_OBJECT_KEYS)) return false
  return PARAMETER_KEYS.every((key) => {
    const candidate = value[key]
    if (typeof candidate !== 'number' || !Number.isFinite(candidate)) return false
    const limit = THREAD_MATERIAL_PARAMETER_LIMITS[key]
    return candidate >= limit.min && candidate <= limit.max && (!limit.integer || Number.isInteger(candidate))
  })
}

function normalizeMaterialName(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  const length = [...normalized].length
  return length >= 1 && length <= MAX_CUSTOM_THREAD_MATERIAL_NAME_LENGTH && !UNSAFE_TEXT_PATTERN.test(normalized) ? normalized : null
}

function isSafeSourceId(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 48 && (CUSTOM_ID_PATTERN.test(value) || SAFE_BUILT_IN_ID_PATTERN.test(value))
}

export function normalizeCustomThreadMaterial(value: unknown): CustomThreadMaterialV1 | null {
  if (!isPlainRecord(value) || value.version !== 1 || !hasOnlyKeys(value, CUSTOM_OBJECT_KEYS)) return null
  const name = normalizeMaterialName(value.name)
  if (typeof value.id !== 'string' || !CUSTOM_ID_PATTERN.test(value.id) || !name) return null
  if (!isPlainRecord(value.params) || value.params.version !== 1 || !hasOnlyKeys(value.params, PARAMETER_OBJECT_KEYS)) return null
  return {
    version: 1,
    id: value.id,
    name,
    params: normalizeThreadMaterialParams(value.params),
  }
}

export function normalizeCustomThreadMaterials(value: unknown): CustomThreadMaterialV1[] {
  if (!Array.isArray(value)) return []
  const materials: CustomThreadMaterialV1[] = []
  const ids = new Set<string>()
  const candidateLimit = MAX_CUSTOM_THREAD_MATERIALS * 4
  for (const candidate of value.slice(0, candidateLimit)) {
    const material = normalizeCustomThreadMaterial(candidate)
    if (!material || ids.has(material.id)) continue
    ids.add(material.id)
    materials.push(material)
    if (materials.length === MAX_CUSTOM_THREAD_MATERIALS) break
  }
  return materials
}

export function addCustomThreadMaterial(materials: readonly CustomThreadMaterialV1[], value: unknown): CustomThreadMaterialV1[] {
  const candidate = normalizeCustomThreadMaterial(value)
  if (!candidate) return materials as CustomThreadMaterialV1[]
  const current = normalizeCustomThreadMaterials(materials)
  const existingIndex = current.findIndex((material) => material.id === candidate.id)
  if (existingIndex >= 0) {
    const updated = [...current]
    updated[existingIndex] = candidate
    return updated
  }
  return current.length < MAX_CUSTOM_THREAD_MATERIALS ? [...current, candidate] : current
}

export function getThreadMaterialPreset(id: unknown): ThreadMaterialPresetV1 {
  return THREAD_MATERIAL_PRESETS.find((preset) => preset.id === id) ?? THREAD_MATERIAL_PRESETS[0]!
}

export function createThreadMaterialSnapshot(
  source: ThreadMaterialPresetV1 | CustomThreadMaterialV1,
  physical?: ThreadMaterialPhysicalOptionsV1,
): ThreadMaterialSnapshotV1 {
  const fallback = getThreadMaterialPreset(DEFAULT_THREAD_MATERIAL_ID)
  const safeSource = source.id.startsWith('custom-') ? normalizeCustomThreadMaterial(source) : getThreadMaterialPreset(source.id)
  const resolved = safeSource ?? fallback
  const snapshot: ThreadMaterialSnapshotV1 = {
    version: 1,
    sourceId: resolved.id,
    name: resolved.name,
    params: cloneParams(resolved.params),
  }
  if (physical?.geometry !== undefined) snapshot.geometry = normalizeThreadGeometrySnapshot(physical.geometry)
  if (physical?.fuzzMaterial !== undefined) snapshot.fuzzMaterial = normalizeFuzzMaterial(physical.fuzzMaterial)
  return snapshot
}

export function parseThreadMaterialSnapshot(value: unknown): ThreadMaterialSnapshotV1 | null {
  if (!isPlainRecord(value) || value.version !== 1 || !hasOnlyKeys(value, SNAPSHOT_OBJECT_KEYS)) return null
  const name = normalizeMaterialName(value.name)
  if (!isSafeSourceId(value.sourceId) || !name || !isThreadMaterialParams(value.params)) return null
  const snapshot: ThreadMaterialSnapshotV1 = {
    version: 1,
    sourceId: value.sourceId,
    name,
    params: normalizeThreadMaterialParams(value.params),
  }
  if (value.geometry !== undefined) snapshot.geometry = normalizeThreadGeometrySnapshot(value.geometry)
  if (value.fuzzMaterial !== undefined) snapshot.fuzzMaterial = normalizeFuzzMaterial(value.fuzzMaterial)
  return snapshot
}

export function defaultThreadMaterialSnapshot(): ThreadMaterialSnapshotV1 {
  return createThreadMaterialSnapshot(getThreadMaterialPreset(DEFAULT_THREAD_MATERIAL_ID))
}
