import { DEFAULT_LIGHTING_PRESET_ID, normalizeLightingPresetId, type LightingPresetId } from './lighting'
import { DEFAULT_FUZZ_MATERIAL, normalizeFuzzMaterial, type FuzzMaterialV1 } from './fuzz-model'
import {
  DEFAULT_NEEDLE_DIAMETER,
  DEFAULT_THREAD_GEOMETRY,
  normalizeNeedleDiameter,
  normalizeThreadGeometrySnapshot,
  type NeedleDiameterV1,
  type ThreadGeometrySnapshotV1,
} from './needle-thread-physics'
import {
  DEFAULT_THREAD_MATERIAL_ID,
  addCustomThreadMaterial,
  normalizeCustomThreadMaterial,
  normalizeCustomThreadMaterials,
  type BuiltInThreadMaterialId,
  type CustomThreadMaterialV1,
} from './thread-materials'

export interface StudioSettings {
  motionEnabled: boolean
  customColors: string[]
  selectedColor: string
  schemaVersion?: 2
  customMaterials?: CustomThreadMaterialV1[]
  selectedMaterialId?: BuiltInThreadMaterialId | string
  lightingId?: LightingPresetId
  needleDiameter?: NeedleDiameterV1
  threadGeometry?: ThreadGeometrySnapshotV1
  fuzzMaterial?: FuzzMaterialV1
}

export interface StudioSettingsV2 extends StudioSettings {
  schemaVersion: 2
  customMaterials: CustomThreadMaterialV1[]
  selectedMaterialId: BuiltInThreadMaterialId | string
  lightingId: LightingPresetId
  needleDiameter: NeedleDiameterV1
  threadGeometry: ThreadGeometrySnapshotV1
  fuzzMaterial: FuzzMaterialV1
}

export const SETTINGS_SCHEMA_VERSION = 2
export const SETTINGS_STORAGE_KEY = 'deesewsew-settings-v2'
export const LEGACY_SETTINGS_STORAGE_KEY = 'deesewsew-settings-v1'
export const MAX_CUSTOM_COLORS = 18
export const MAX_SETTINGS_STORAGE_CHARACTERS = 64_000
export const BUILT_IN_THREAD_COLORS = Object.freeze([
  '#b9403c',
  '#df735f',
  '#d49a2f',
  '#55765b',
  '#425f86',
  '#74516f',
  '#765443',
  '#363539',
  '#e6d7b7',
] as const)

const BUILT_IN_COLOR_SET = new Set<string>(BUILT_IN_THREAD_COLORS)
const DEFAULT_COLOR = BUILT_IN_THREAD_COLORS[0]

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function defaultSettings(reducedMotion = false): StudioSettingsV2 {
  return {
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    motionEnabled: !reducedMotion,
    customColors: [],
    selectedColor: DEFAULT_COLOR,
    customMaterials: [],
    selectedMaterialId: DEFAULT_THREAD_MATERIAL_ID,
    lightingId: DEFAULT_LIGHTING_PRESET_ID,
    needleDiameter: { ...DEFAULT_NEEDLE_DIAMETER },
    threadGeometry: { ...DEFAULT_THREAD_GEOMETRY },
    fuzzMaterial: { ...DEFAULT_FUZZ_MATERIAL },
  }
}

export function normalizeHexColor(value: unknown): string | null {
  if (typeof value !== 'string' || !/^#[0-9a-f]{6}$/i.test(value)) return null
  return value.toLowerCase()
}

function normalizeCustomColors(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const colors: string[] = []
  const seen = new Set<string>()
  for (const candidate of value.slice(0, MAX_CUSTOM_COLORS * 4)) {
    const color = normalizeHexColor(candidate)
    if (!color || BUILT_IN_COLOR_SET.has(color) || seen.has(color)) continue
    seen.add(color)
    colors.push(color)
    if (colors.length === MAX_CUSTOM_COLORS) break
  }
  return colors
}

function isSelectableMaterialId(value: unknown, customMaterials: readonly CustomThreadMaterialV1[]): value is BuiltInThreadMaterialId | string {
  if (value === DEFAULT_THREAD_MATERIAL_ID || value === 'pearl-cotton' || value === 'satin-rayon' || value === 'matte-wool' || value === 'metallic-composite') return true
  return typeof value === 'string' && customMaterials.some((material) => material.id === value)
}

function tryDeserializeSettings(raw: string | null, reducedMotion: boolean): StudioSettingsV2 | null {
  if (!raw || raw.length > MAX_SETTINGS_STORAGE_CHARACTERS) return null
  try {
    const value = JSON.parse(raw) as unknown
    if (!isRecord(value)) return null
    if (value.schemaVersion !== undefined && value.schemaVersion !== 1 && value.schemaVersion !== SETTINGS_SCHEMA_VERSION) return null
    const fallback = defaultSettings(reducedMotion)
    const customColors = normalizeCustomColors(value.customColors)
    const customMaterials = normalizeCustomThreadMaterials(value.customMaterials)
    return {
      schemaVersion: SETTINGS_SCHEMA_VERSION,
      motionEnabled: typeof value.motionEnabled === 'boolean' ? value.motionEnabled : fallback.motionEnabled,
      customColors,
      selectedColor: normalizeHexColor(value.selectedColor) ?? fallback.selectedColor,
      customMaterials,
      selectedMaterialId: isSelectableMaterialId(value.selectedMaterialId, customMaterials) ? value.selectedMaterialId : fallback.selectedMaterialId,
      lightingId: normalizeLightingPresetId(value.lightingId),
      needleDiameter: value.needleDiameter === undefined
        ? fallback.needleDiameter
        : normalizeNeedleDiameter(value.needleDiameter, fallback.needleDiameter),
      threadGeometry: value.threadGeometry === undefined
        ? fallback.threadGeometry
        : normalizeThreadGeometrySnapshot(value.threadGeometry, fallback.threadGeometry),
      fuzzMaterial: value.fuzzMaterial === undefined
        ? fallback.fuzzMaterial
        : normalizeFuzzMaterial(value.fuzzMaterial, fallback.fuzzMaterial),
    }
  } catch {
    return null
  }
}

export function deserializeSettings(raw: string | null, reducedMotion = false): StudioSettingsV2 {
  return tryDeserializeSettings(raw, reducedMotion) ?? defaultSettings(reducedMotion)
}

export function addCustomColor<T extends StudioSettings>(settings: T, value: unknown): T {
  const color = normalizeHexColor(value)
  if (!color) return settings
  if (BUILT_IN_COLOR_SET.has(color)) return settings.selectedColor === color ? settings : { ...settings, selectedColor: color } as T
  if (!settings.customColors.includes(color) && settings.customColors.length >= MAX_CUSTOM_COLORS) return settings
  const customColors = settings.customColors.includes(color) ? settings.customColors : [...settings.customColors, color]
  return { ...settings, customColors, selectedColor: color } as T
}

export function addCustomMaterial(settings: StudioSettingsV2, value: unknown): StudioSettingsV2 {
  const candidate = normalizeCustomThreadMaterial(value)
  if (!candidate) return settings
  const customMaterials = addCustomThreadMaterial(settings.customMaterials, candidate)
  if (customMaterials === settings.customMaterials) return settings
  return { ...settings, customMaterials, selectedMaterialId: candidate.id }
}

export function serializeSettings(settings: StudioSettings): string {
  const normalized = tryDeserializeSettings(JSON.stringify(settings), false) ?? defaultSettings(false)
  return JSON.stringify(normalized)
}

function serializeLegacySettings(settings: StudioSettingsV2): string {
  return JSON.stringify({
    motionEnabled: settings.motionEnabled,
    customColors: settings.customColors,
    selectedColor: settings.selectedColor,
  })
}

export function loadSettings(reducedMotion = false): StudioSettingsV2 {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
    const current = tryDeserializeSettings(raw, reducedMotion)
    if (current) return current
    const migrated = tryDeserializeSettings(localStorage.getItem(LEGACY_SETTINGS_STORAGE_KEY), reducedMotion)
    if (!migrated) return defaultSettings(reducedMotion)
    if (raw === null) saveSettings(migrated)
    return migrated
  } catch {
    return defaultSettings(reducedMotion)
  }
}

export function saveSettings(settings: StudioSettings): boolean {
  let normalized: StudioSettingsV2
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (raw !== null && !tryDeserializeSettings(raw, false)) return false
    normalized = deserializeSettings(serializeSettings(settings))
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(normalized))
  } catch { return false }
  try { localStorage.setItem(LEGACY_SETTINGS_STORAGE_KEY, serializeLegacySettings(normalized)) }
  catch { /* The current-version setting remains usable if the compatibility write fails. */ }
  return true
}
