import { describe, expect, it } from 'vitest'
import {
  BUILT_IN_THREAD_COLORS,
  LEGACY_SETTINGS_STORAGE_KEY,
  MAX_CUSTOM_COLORS,
  MAX_SETTINGS_STORAGE_CHARACTERS,
  SETTINGS_STORAGE_KEY,
  addCustomColor,
  addCustomMaterial,
  defaultSettings,
  deserializeSettings,
  loadSettings,
  normalizeHexColor,
  saveSettings,
  serializeSettings,
  type StudioSettings,
} from './settings'
import { getThreadMaterialPreset } from './thread-materials'
import { customNeedleDiameter } from './needle-thread-physics'

describe('studio settings', () => {
  it('defaults stitch motion around the reduced-motion preference', () => {
    expect(defaultSettings(false).motionEnabled).toBe(true)
    expect(defaultSettings(true).motionEnabled).toBe(false)
  })

  it('normalizes, deduplicates, and rejects unsafe colors', () => {
    expect(normalizeHexColor('#A1B2C3')).toBe('#a1b2c3')
    expect(normalizeHexColor('red')).toBeNull()
    expect(normalizeHexColor('#12345')).toBeNull()
    const seeded = { ...defaultSettings(), customColors: ['#a1b2c3'] }
    expect(addCustomColor(seeded, '#A1B2C3').customColors).toEqual(['#a1b2c3'])
    expect(addCustomColor(seeded, 'not-a-color')).toBe(seeded)
  })

  it('round trips valid preferences and fails closed on malformed data', () => {
    const settings = addCustomColor({ ...defaultSettings(), motionEnabled: false }, '#C06C84')
    expect(deserializeSettings(serializeSettings(settings))).toEqual(settings)
    expect(deserializeSettings('{broken', true)).toEqual(defaultSettings(true))
  })

  it('bounds custom color storage and sanitizes partial data', () => {
    const colors = Array.from({ length: MAX_CUSTOM_COLORS + 4 }, (_, index) => `#${index.toString(16).padStart(6, '0')}`)
    const settings = deserializeSettings(JSON.stringify({ customColors: [...colors, '#000000', 'bad'], selectedColor: 'bad' }))
    expect(settings.customColors).toHaveLength(MAX_CUSTOM_COLORS)
    expect(new Set(settings.customColors).size).toBe(MAX_CUSTOM_COLORS)
    expect(settings.selectedColor).toBe(defaultSettings().selectedColor)
    expect(deserializeSettings(' '.repeat(MAX_SETTINGS_STORAGE_CHARACTERS + 1))).toEqual(defaultSettings())
  })

  it('migrates v1 values into v2 without losing the existing preferences', () => {
    const legacyShape: StudioSettings = {
      motionEnabled: false,
      customColors: ['#C06C84'],
      selectedColor: '#C06C84',
    }
    const migrated = deserializeSettings(JSON.stringify(legacyShape))
    expect(migrated).toMatchObject({
      schemaVersion: 2,
      motionEnabled: false,
      customColors: ['#c06c84'],
      selectedColor: '#c06c84',
    })
    expect(migrated.customMaterials).toEqual([])
    expect(migrated.selectedMaterialId).toBe('stranded-cotton')
    expect(migrated.lightingId).toBe('soft-daylight')
  })

  it('removes built-in duplicates before applying the custom color cap', () => {
    const settings = deserializeSettings(JSON.stringify({
      customColors: [BUILT_IN_THREAD_COLORS[0].toUpperCase(), '#AABBCC', '#aabbcc'],
      selectedColor: BUILT_IN_THREAD_COLORS[0],
    }))
    expect(settings.customColors).toEqual(['#aabbcc'])
    expect(addCustomColor(settings, BUILT_IN_THREAD_COLORS[1])).toMatchObject({
      customColors: ['#aabbcc'],
      selectedColor: BUILT_IN_THREAD_COLORS[1],
    })
  })

  it('persists bounded local custom materials in the v2 record', () => {
    const cotton = getThreadMaterialPreset('stranded-cotton').params
    const settings = addCustomMaterial(defaultSettings(), {
      version: 1,
      id: 'custom-soft-blue',
      name: 'Soft blue',
      params: { ...cotton, fuzz: 0.47 },
    })
    expect(settings.selectedMaterialId).toBe('custom-soft-blue')
    expect(deserializeSettings(serializeSettings(settings))).toEqual(settings)
    const unsafe = deserializeSettings(JSON.stringify({ ...settings, customMaterials: [{ ...settings.customMaterials[0], url: 'data:image/svg+xml,x' }] }))
    expect(unsafe.customMaterials).toEqual([])
    expect(unsafe.selectedMaterialId).toBe('stranded-cotton')
  })

  it('reads a v1 fallback and writes both current and compatibility keys', () => {
    const values = new Map<string, string>([[LEGACY_SETTINGS_STORAGE_KEY, JSON.stringify({
      motionEnabled: false,
      customColors: ['#aabbcc'],
      selectedColor: '#aabbcc',
    })]])
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
    const storage: Storage = {
      get length() { return values.size },
      clear: () => values.clear(),
      getItem: (key) => values.get(key) ?? null,
      key: (index) => [...values.keys()][index] ?? null,
      removeItem: (key) => { values.delete(key) },
      setItem: (key, value) => { values.set(key, value) },
    }
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage })
    try {
      const migrated = loadSettings()
      expect(migrated).toMatchObject({ schemaVersion: 2, motionEnabled: false, selectedColor: '#aabbcc' })
      expect(JSON.parse(values.get(SETTINGS_STORAGE_KEY)!)).toMatchObject({ schemaVersion: 2, motionEnabled: false })
      saveSettings(migrated)
      expect(JSON.parse(values.get(SETTINGS_STORAGE_KEY)!)).toMatchObject({ schemaVersion: 2, motionEnabled: false })
      expect(JSON.parse(values.get(LEGACY_SETTINGS_STORAGE_KEY)!)).toEqual({
        motionEnabled: false,
        customColors: ['#aabbcc'],
        selectedColor: '#aabbcc',
      })
    } finally {
      if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor)
      else Reflect.deleteProperty(globalThis, 'localStorage')
    }
  })

  it('persists independent needle, line diameter, and fuzz tool snapshots with field fallback', () => {
    const configured = {
      ...defaultSettings(),
      needleDiameter: customNeedleDiameter(1.37),
      threadGeometry: {
        ...defaultSettings().threadGeometry,
        effectiveDiameterMm: 1.8,
        radialStiffness: 2.2,
      },
      fuzzMaterial: {
        ...defaultSettings().fuzzMaterial,
        density: 0.73,
        stiffness: 0.81,
        seed: 1234,
      },
    }
    expect(deserializeSettings(serializeSettings(configured))).toEqual(configured)

    const restored = deserializeSettings(JSON.stringify({
      ...configured,
      needleDiameter: { ...configured.needleDiameter, diameterMm: Number.NaN },
      threadGeometry: { ...configured.threadGeometry, effectiveDiameterMm: Number.NaN },
      fuzzMaterial: { ...configured.fuzzMaterial, density: Number.POSITIVE_INFINITY },
    }))
    expect(restored.needleDiameter.diameterMm).toBe(0.9)
    expect(restored.threadGeometry).toMatchObject({ effectiveDiameterMm: 0.6, radialStiffness: 2.2 })
    expect(restored.fuzzMaterial).toMatchObject({ density: 0.22, stiffness: 0.81, seed: 1234 })
  })
})
