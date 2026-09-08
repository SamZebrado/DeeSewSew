import type { LightingPresetId } from './lighting'
import type { StudioSettings } from './settings'

/** Small display-only subset; full model IDs stay intact for compatibility. */
export const STUDIO_LIGHTING_OPTIONS = Object.freeze([
  Object.freeze({ id: 'soft-daylight', label: 'Soft daylight' }),
  Object.freeze({ id: 'warm-lamp', label: 'Warm lamp' }),
  Object.freeze({ id: 'flat-worklight', label: 'Work light' }),
] as const)
export type StudioLightingId = typeof STUDIO_LIGHTING_OPTIONS[number]['id']

export function studioLightingId(value: unknown): StudioLightingId {
  return STUDIO_LIGHTING_OPTIONS.find(option => option.id === value)?.id ?? STUDIO_LIGHTING_OPTIONS[0].id
}

export function selectStudioLighting<T extends StudioSettings>(settings: T, value: unknown): T {
  const id = studioLightingId(value)
  return settings.lightingId === id ? settings : { ...settings, lightingId: id }
}

export interface LightingTarget { setLighting(value: LightingPresetId): boolean }

/** Always notify both faces, even when the first face changes. */
export function applyStudioLighting(value: StudioLightingId, front: LightingTarget, back: LightingTarget): boolean {
  const frontChanged = front.setLighting(value)
  const backChanged = back.setLighting(value)
  return frontChanged || backChanged
}
