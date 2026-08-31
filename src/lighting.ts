export interface LightingProfile {
  azimuthDeg: number
  elevation: number
  ambient: number
  diffuse: number
  specular: number
  warmth: number
  shadowOpacity: number
  shadowOffsetAt640: number
  shadowBlurAt640: number
}

export type LightingPresetId = 'soft-daylight' | 'warm-lamp' | 'cool-side-light' | 'flat-worklight'

export interface LightingPresetV1 {
  version: 1
  id: LightingPresetId
  name: string
  profile: LightingProfile
}

interface LightingLimit { min: number; max: number; step: number }

export const DEFAULT_LIGHTING_PRESET_ID: LightingPresetId = 'soft-daylight'

export const LIGHTING_PROFILE_LIMITS: Readonly<Record<keyof LightingProfile, LightingLimit>> = Object.freeze({
  azimuthDeg: { min: -180, max: 180, step: 0.1 },
  elevation: { min: 0, max: 1, step: 0.01 },
  ambient: { min: 0, max: 1, step: 0.01 },
  diffuse: { min: 0, max: 1, step: 0.01 },
  specular: { min: 0, max: 1, step: 0.01 },
  warmth: { min: -1, max: 1, step: 0.01 },
  shadowOpacity: { min: 0, max: 0.8, step: 0.01 },
  shadowOffsetAt640: { min: 0, max: 64, step: 0.1 },
  shadowBlurAt640: { min: 0, max: 80, step: 0.1 },
})

const PROFILE_KEYS = Object.freeze(Object.keys(LIGHTING_PROFILE_LIMITS) as Array<keyof LightingProfile>)

function quantize(value: number, limit: LightingLimit): number {
  const clamped = Math.min(limit.max, Math.max(limit.min, value))
  return Number((limit.min + Math.round((clamped - limit.min) / limit.step) * limit.step).toFixed(6))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

const DEFINITIONS: readonly LightingPresetV1[] = [
  {
    version: 1,
    id: 'soft-daylight',
    name: 'Soft daylight',
    profile: { azimuthDeg: -38, elevation: 0.72, ambient: 0.58, diffuse: 0.62, specular: 0.28, warmth: 0.08, shadowOpacity: 0.2, shadowOffsetAt640: 7, shadowBlurAt640: 18 },
  },
  {
    version: 1,
    id: 'warm-lamp',
    name: 'Warm lamp',
    profile: { azimuthDeg: 32, elevation: 0.58, ambient: 0.42, diffuse: 0.72, specular: 0.38, warmth: 0.72, shadowOpacity: 0.34, shadowOffsetAt640: 11, shadowBlurAt640: 14 },
  },
  {
    version: 1,
    id: 'cool-side-light',
    name: 'Cool side light',
    profile: { azimuthDeg: -76, elevation: 0.38, ambient: 0.34, diffuse: 0.82, specular: 0.48, warmth: -0.62, shadowOpacity: 0.4, shadowOffsetAt640: 15, shadowBlurAt640: 11 },
  },
  {
    version: 1,
    id: 'flat-worklight',
    name: 'Flat worklight',
    profile: { azimuthDeg: 0, elevation: 0.9, ambient: 0.78, diffuse: 0.34, specular: 0.12, warmth: 0, shadowOpacity: 0.1, shadowOffsetAt640: 3, shadowBlurAt640: 22 },
  },
]

export const LIGHTING_PRESETS: readonly LightingPresetV1[] = Object.freeze(DEFINITIONS.map((preset) => Object.freeze({
  ...preset,
  profile: Object.freeze({ ...preset.profile }),
})))
Object.values(LIGHTING_PROFILE_LIMITS).forEach(Object.freeze)

export function isLightingPresetId(value: unknown): value is LightingPresetId {
  return LIGHTING_PRESETS.some((preset) => preset.id === value)
}

export function normalizeLightingPresetId(value: unknown): LightingPresetId {
  return isLightingPresetId(value) ? value : DEFAULT_LIGHTING_PRESET_ID
}

export function getLightingPreset(value: unknown): LightingPresetV1 {
  const id = normalizeLightingPresetId(value)
  return LIGHTING_PRESETS.find((preset) => preset.id === id)!
}

export function normalizeLightingProfile(value: unknown, fallback: LightingProfile = getLightingPreset(DEFAULT_LIGHTING_PRESET_ID).profile): LightingProfile {
  const record = isRecord(value) ? value : {}
  const result = {} as LightingProfile
  for (const key of PROFILE_KEYS) {
    const candidate = record[key]
    const safeFallback = typeof fallback[key] === 'number' && Number.isFinite(fallback[key])
      ? fallback[key]
      : getLightingPreset(DEFAULT_LIGHTING_PRESET_ID).profile[key]
    result[key] = quantize(typeof candidate === 'number' && Number.isFinite(candidate) ? candidate : safeFallback, LIGHTING_PROFILE_LIMITS[key])
  }
  return result
}

export function getLightingProfile(value: unknown): LightingProfile {
  return { ...getLightingPreset(value).profile }
}
