import type { LightingProfile } from './lighting'
import type { Stitch } from './stitch-model'
import { DEFAULT_FUZZ_MATERIAL, normalizeFuzzMaterial, type FuzzMaterialV1 } from './fuzz-model'
import {
  DEFAULT_NEEDLE_DIAMETER,
  DEFAULT_THREAD_GEOMETRY,
  normalizeNeedleDiameter,
  normalizeThreadGeometrySnapshot,
  type ThreadGeometrySnapshotV1,
} from './needle-thread-physics'
import {
  defaultThreadMaterialSnapshot,
  parseThreadMaterialSnapshot,
  type ThreadMaterialSnapshotV1,
} from './thread-materials'

export interface ThreadVisualStyle {
  material: ThreadMaterialSnapshotV1
  widthScale: number
  strandCount: number
  twist: number
  sheen: number
  highlightSharpness: number
  fuzzDensity: number
  speckle: number
  metallic: number
  colorVariation: number
  resistance: number
  compliance: number
  recovery: number
  geometry: ThreadGeometrySnapshotV1
  effectiveDiameterMm: number
  fuzzMaterial: FuzzMaterialV1
  baseColor: string
  darkColor: string
  lightColor: string
  specularAlpha: number
}

export interface NeedleHoleVisual {
  radiusAt640: number
  aspectRatio: number
  rotationRad: number
  forceScale: number
}

export function clampUnit(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

export function seededUnit(seed: number): number {
  const value = Math.sin(seed * 12.9898) * 43758.5453
  return value - Math.floor(value)
}

function rgb(hex: string): [number, number, number] {
  const safe = /^#[0-9a-f]{6}$/i.test(hex) ? hex : '#74516f'
  const value = Number.parseInt(safe.slice(1), 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

export function shadeColor(hex: string, amount: number, warmth = 0): string {
  const [red, green, blue] = rgb(hex)
  const warm = Math.max(-1, Math.min(1, Number.isFinite(warmth) ? warmth : 0))
  const channel = (value: number): number => Math.round(Math.max(0, Math.min(255, value)))
  return `rgb(${channel(red + amount + warm * 9)}, ${channel(green + amount + warm * 2)}, ${channel(blue + amount - warm * 8)})`
}

export function lightingProfileKey(profile: LightingProfile): string {
  return [
    profile.azimuthDeg,
    profile.elevation,
    profile.ambient,
    profile.diffuse,
    profile.specular,
    profile.warmth,
    profile.shadowOpacity,
    profile.shadowOffsetAt640,
    profile.shadowBlurAt640,
  ].join('|')
}

export function resolvedThreadMaterial(stitch: Pick<Stitch, 'material'>): ThreadMaterialSnapshotV1 {
  return parseThreadMaterialSnapshot(stitch.material) ?? defaultThreadMaterialSnapshot()
}

export function deriveThreadVisualStyle(
  stitch: Pick<Stitch, 'color' | 'material' | 'threadGeometry' | 'fuzzMaterial' | 'seed'>,
  lighting: LightingProfile,
): ThreadVisualStyle {
  const material = resolvedThreadMaterial(stitch)
  const params = material.params
  const geometry = normalizeThreadGeometrySnapshot(stitch.threadGeometry ?? material.geometry ?? DEFAULT_THREAD_GEOMETRY)
  const legacyStiffness = Math.min(1, Math.max(0, (params.resistance - 0.25) / 3.75))
  const fuzzMaterial = normalizeFuzzMaterial(stitch.fuzzMaterial ?? material.fuzzMaterial ?? {
    ...DEFAULT_FUZZ_MATERIAL,
    density: params.fuzz,
    stiffness: legacyStiffness,
    seed: stitch.seed,
  })
  const ambientLift = (lighting.ambient - 0.5) * 18
  const diffuseDepth = 24 + lighting.diffuse * 34
  const highlightLift = 24 + params.sheen * lighting.specular * 82 + params.metallic * 18
  return {
    material,
    widthScale: params.widthScale * (geometry.effectiveDiameterMm / DEFAULT_THREAD_GEOMETRY.effectiveDiameterMm),
    strandCount: params.strandCount,
    twist: params.twist,
    sheen: params.sheen,
    highlightSharpness: params.highlightSharpness,
    fuzzDensity: fuzzMaterial.density,
    speckle: params.speckle,
    metallic: params.metallic,
    colorVariation: params.colorVariation,
    resistance: params.resistance,
    compliance: params.compliance,
    recovery: params.recovery,
    geometry,
    effectiveDiameterMm: geometry.effectiveDiameterMm,
    fuzzMaterial,
    baseColor: shadeColor(stitch.color, ambientLift, lighting.warmth),
    darkColor: shadeColor(stitch.color, ambientLift - diffuseDepth, lighting.warmth),
    lightColor: shadeColor(stitch.color, ambientLift + highlightLift, lighting.warmth),
    specularAlpha: clampUnit(0.08 + params.sheen * lighting.specular * 0.58 + params.metallic * 0.18),
  }
}

export function deriveNeedleHoleVisual(stitch: Pick<Stitch, 'force' | 'needlePose' | 'needleDiameter' | 'threadPassage'>): NeedleHoleVisual {
  const forceScale = stitch.force === 'light' ? 0.82 : stitch.force === 'firm' ? 1.26 : 1
  const needle = normalizeNeedleDiameter(stitch.needleDiameter ?? DEFAULT_NEEDLE_DIAMETER)
  const inclination = Math.min(70, Math.max(0, stitch.needlePose?.inclinationFromNormalDeg ?? 0))
  const cosine = Math.max(Math.cos(70 * Math.PI / 180), Math.cos(inclination * Math.PI / 180))
  const passageHole = stitch.threadPassage?.committable ? stitch.threadPassage.holeAfter : null
  const minorDiameter = passageHole?.minorDiameterMm ?? needle.diameterMm * forceScale
  const majorDiameter = passageHole?.majorDiameterMm ?? minorDiameter / cosine
  return {
    radiusAt640: 2.15 * (minorDiameter / DEFAULT_NEEDLE_DIAMETER.diameterMm),
    aspectRatio: Math.min(1.8, Math.max(1, majorDiameter / Math.max(0.0001, minorDiameter))),
    rotationRad: ((passageHole?.rotationDeg ?? stitch.needlePose?.azimuthDeg ?? 0) - 90) * Math.PI / 180,
    forceScale,
  }
}

export function stitchRenderKey(stitch: Stitch): string {
  const material = resolvedThreadMaterial(stitch)
  const params = material.params
  const needleStart = stitch.needleStart ?? stitch.start
  const needleEnd = stitch.needleEnd ?? stitch.end
  return [
    stitch.id,
    stitch.type,
    stitch.start.x,
    stitch.start.y,
    stitch.end.x,
    stitch.end.y,
    needleStart.x,
    needleStart.y,
    needleEnd.x,
    needleEnd.y,
    stitch.color,
    stitch.width,
    stitch.order,
    stitch.seed,
    stitch.force ?? 'normal',
    stitch.needlePose?.azimuthDeg ?? 0,
    stitch.needlePose?.inclinationFromNormalDeg ?? 0,
    stitch.needleDiameter?.source ?? 'preset',
    stitch.needleDiameter?.presetId ?? 'nm90',
    stitch.needleDiameter?.diameterMm ?? DEFAULT_NEEDLE_DIAMETER.diameterMm,
    material.sourceId,
    ...Object.values(params),
    JSON.stringify(stitch.threadGeometry ?? material.geometry ?? DEFAULT_THREAD_GEOMETRY),
    JSON.stringify(stitch.fuzzMaterial ?? material.fuzzMaterial ?? null),
    stitch.threadPassage?.committable ?? false,
    stitch.threadPassage?.holeAfter.majorDiameterMm ?? 0,
    stitch.threadPassage?.holeAfter.minorDiameterMm ?? 0,
    stitch.threadPassage?.holeAfter.rotationDeg ?? 0,
  ].join('|')
}
