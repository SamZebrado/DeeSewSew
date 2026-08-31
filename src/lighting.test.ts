import { describe, expect, it } from 'vitest'
import {
  DEFAULT_LIGHTING_PRESET_ID,
  LIGHTING_PRESETS,
  getLightingProfile,
  getLightingPreset,
  normalizeLightingProfile,
  normalizeLightingPresetId,
} from './lighting'

describe('lighting profiles', () => {
  it('provides four stable and visually distinct presets', () => {
    expect(LIGHTING_PRESETS.map((preset) => preset.id)).toEqual([
      'soft-daylight',
      'warm-lamp',
      'cool-side-light',
      'flat-worklight',
    ])
    expect(new Set(LIGHTING_PRESETS.map((preset) => JSON.stringify(preset.profile))).size).toBe(4)
    expect(getLightingPreset('warm-lamp').name).toBe('Warm lamp')
  })

  it('falls back unknown ids to neutral soft daylight', () => {
    expect(normalizeLightingPresetId('future-light')).toBe(DEFAULT_LIGHTING_PRESET_ID)
    expect(getLightingProfile('future-light')).toEqual(getLightingProfile(DEFAULT_LIGHTING_PRESET_ID))
  })

  it('clamps custom calculations without allowing NaN or Infinity through', () => {
    const fallback = getLightingProfile(DEFAULT_LIGHTING_PRESET_ID)
    const normalized = normalizeLightingProfile({ ...fallback, ambient: 4, diffuse: -2, azimuthDeg: 999, warmth: Number.NaN })
    expect(normalized.ambient).toBe(1)
    expect(normalized.diffuse).toBe(0)
    expect(normalized.azimuthDeg).toBe(180)
    expect(normalized.warmth).toBe(fallback.warmth)
    expect(Object.values(normalized).every(Number.isFinite)).toBe(true)
  })

  it('returns copies so callers cannot mutate shared preset state', () => {
    const profile = getLightingProfile('warm-lamp')
    profile.ambient = 0
    expect(getLightingProfile('warm-lamp').ambient).not.toBe(0)
  })
})
