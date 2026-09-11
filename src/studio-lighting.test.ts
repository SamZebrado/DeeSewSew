import { afterEach, expect, test, vi } from 'vitest'
import { STUDIO_LIGHTING_OPTIONS, applyStudioLighting, selectStudioLighting, studioLightingId } from './studio-lighting'
import { DEFAULT_LIGHTING_PRESET_ID } from './lighting'
import { defaultSettings, deserializeSettings, loadSettings, saveSettings, serializeSettings, SETTINGS_STORAGE_KEY } from './settings'
import { t } from './i18n'

afterEach(() => vi.unstubAllGlobals())

test('the small studio subset keeps stable IDs and a daylight fallback', () => {
  expect(STUDIO_LIGHTING_OPTIONS.map(option => option.id)).toEqual(['soft-daylight', 'warm-lamp', 'flat-worklight'])
  for (const value of [undefined, null, 'future', 'cool-side-light', {}, '']) expect(studioLightingId(value)).toBe(DEFAULT_LIGHTING_PRESET_ID)
  for (const option of STUDIO_LIGHTING_OPTIONS) expect(studioLightingId(option.id)).toBe(option.id)
})

test('both faces receive one setter call even when the first face changes', () => {
  const front = { setLighting: vi.fn(() => true) }, back = { setLighting: vi.fn(() => false) }
  expect(applyStudioLighting('warm-lamp', front, back)).toBe(true)
  expect(front.setLighting).toHaveBeenCalledExactlyOnceWith('warm-lamp')
  expect(back.setLighting).toHaveBeenCalledExactlyOnceWith('warm-lamp')
  front.setLighting.mockReturnValue(false)
  expect(applyStudioLighting('warm-lamp', front, back)).toBe(false)
  back.setLighting.mockReturnValue(true)
  expect(applyStudioLighting('flat-worklight', front, back)).toBe(true)
})

test('selection replaces only the existing lighting preference and preserves other snapshot identity', () => {
  const original = defaultSettings(true)
  const before = JSON.stringify(original)
  Object.freeze(original)
  const changed = selectStudioLighting(original, 'warm-lamp')
  expect(changed).not.toBe(original)
  expect(JSON.stringify(original)).toBe(before)
  for (const key of Object.keys(original) as (keyof typeof original)[]) {
    if (key !== 'lightingId') expect(changed[key]).toBe(original[key])
  }
  expect(selectStudioLighting(changed, 'warm-lamp')).toBe(changed)
  expect(deserializeSettings(serializeSettings(changed))).toEqual(changed)
  expect(changed.schemaVersion).toBe(2)
})

test('existing settings load without a write; excluded stored light has a display-only fallback', () => {
  const stored = { ...defaultSettings(), lightingId: 'cool-side-light' as const }
  const raw = serializeSettings(stored)
  const setItem = vi.fn()
  vi.stubGlobal('localStorage', { getItem: (key: string) => key === SETTINGS_STORAGE_KEY ? raw : null, setItem })
  const loaded = loadSettings()
  expect(loaded.lightingId).toBe('cool-side-light')
  expect(studioLightingId(loaded.lightingId)).toBe('soft-daylight')
  expect(setItem).not.toHaveBeenCalled()
  const selected = selectStudioLighting(loaded, 'flat-worklight')
  expect(saveSettings(selected)).toBe(true)
  expect(setItem.mock.calls[0]![0]).toBe(SETTINGS_STORAGE_KEY)
  expect(deserializeSettings(setItem.mock.calls[0]![1]).lightingId).toBe('flat-worklight')
})

test('settings write failure is reported while the selected session setting remains usable', () => {
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => { throw Error('unavailable') } })
  const selected = selectStudioLighting(defaultSettings(), 'warm-lamp')
  expect(saveSettings(selected)).toBe(false)
  expect(selected.lightingId).toBe('warm-lamp')
})

test('lighting labels and setting-failure message have Chinese and English text', () => {
  for (const source of ['Appearance', 'Lighting', ...STUDIO_LIGHTING_OPTIONS.map(option => option.label),
    'Screen lighting only; PNG images always use soft daylight.', 'Studio settings are temporary; device storage failed.']) {
    expect(t(source, 'en')).toBe(source)
    expect(t(source, 'zh')).not.toBe(source)
  }
})
