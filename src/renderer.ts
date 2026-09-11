import {
  DEFAULT_LIGHTING_PRESET_ID,
  getLightingProfile,
  normalizeLightingProfile,
  type LightingPresetId,
  type LightingProfile,
} from './lighting'
import { SettledPrefixCache, type SettledCacheInvalidationReason } from './renderer-cache'
import {
  clampUnit,
  deriveNeedleHoleVisual,
  deriveThreadVisualStyle,
  lightingProfileKey,
  seededUnit,
  shadeColor,
  stitchRenderKey,
  type ThreadVisualStyle,
} from './renderer-style'
import { FABRIC_RADIUS, interpolate, type NormalizedPoint, type Stitch } from './stitch-model'
import { sampleStitchMotionProgress, type StitchMotionSampleV2 } from './stitch-motion'
import { ThreadCoverage } from './thread-coverage'
import { looseThreadPath, tightenThreadPath, transportThreadEye, type CubicThreadPath } from './thread-path'
import { needlePassage, needlePose, type NeedlePose, type NeedlePassage } from './needle-pose'
import { drawNeedleVisual } from './needle-visual'

export type HoopSide = 'front' | 'back'

export interface StitchMotion {
  stitchId: string
  progress: number
  /** A resolved sample can be supplied by a controlled clock or visual test. */
  sample?: StitchMotionSampleV2
  /** Exact transient geometry present when this puncture was committed. */
  loosePoints?: readonly NormalizedPoint[]
  capturedPose?: NeedlePose
}

export interface TransientThreadVisual {
  points?: readonly NormalizedPoint[]
  emergenceTarget?: NormalizedPoint | null
  needleVisible?: boolean
  pose?: NeedlePose
  passage?: { sample: NeedlePassage; destination: boolean }
}

export interface EmbroideryRendererOptions {
  lighting?: LightingPresetId | LightingProfile
  maxDevicePixelRatio?: number
  /** Offscreen output may request one bitmap pixel per CSS pixel, even below device DPR 1. */
  fixedDevicePixelRatio?: 1
}

export interface RendererDevCounters {
  staticBuild: number
  append: number
  appendedStitches: number
  dynamicDraw: number
  cacheBlit: number
  motionDraw: number
  previewDraw: number
  coverageBuild: number
  coverageAppend: number
  invalidation: number
}

export const RENDERER_DEV_COUNTERS_PROPERTY = '__deesewsewRendererCounters'

interface ThreadPath {
  x1: number
  y1: number
  x2: number
  y2: number
  c1x: number
  c1y: number
  c2x: number
  c2y: number
  dx: number
  dy: number
  length: number
  nx: number
  ny: number
}

interface DynamicCoverageMemo {
  stitch: Stitch
  revision: number
  buildup: number
}

interface ThreadStyleMemo {
  lightingKey: string
  style: ThreadVisualStyle
}

const COUNTER_KEYS: readonly (keyof RendererDevCounters)[] = [
  'staticBuild',
  'append',
  'appendedStitches',
  'dynamicDraw',
  'cacheBlit',
  'motionDraw',
  'previewDraw',
  'coverageBuild',
  'coverageAppend',
  'invalidation',
]

const makeCounters = (): RendererDevCounters => ({
  staticBuild: 0,
  append: 0,
  appendedStitches: 0,
  dynamicDraw: 0,
  cacheBlit: 0,
  motionDraw: 0,
  previewDraw: 0,
  coverageBuild: 0,
  coverageAppend: 0,
  invalidation: 0,
})

const finiteDprLimit = (value: number | undefined): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 2.5
  return Math.min(3, Math.max(1, value))
}

const samePoint = (left: NormalizedPoint, right: NormalizedPoint): boolean => left.x === right.x && left.y === right.y

export class EmbroideryRenderer {
  private readonly canvas: HTMLCanvasElement
  private readonly context: CanvasRenderingContext2D
  private readonly settledCanvas: HTMLCanvasElement
  private readonly settledContext: CanvasRenderingContext2D
  private readonly side: HoopSide
  private readonly coverage = new ThreadCoverage()
  private readonly cache = new SettledPrefixCache<Stitch>(stitchRenderKey)
  private readonly threadStyleCache = new WeakMap<Stitch, ThreadStyleMemo>()
  private readonly counters = makeCounters()
  private readonly maxDevicePixelRatio: number
  private readonly fixedDevicePixelRatio: 1 | undefined
  private readonly resizeObserver: ResizeObserver
  private size = 0
  private dpr = 1
  private fabricPattern: CanvasPattern | null = null
  private lighting: LightingProfile
  private lightingKey: string
  private topologyRevision: string | number | null = null
  private coverageRevision = 0
  private dynamicCoverageMemo: DynamicCoverageMemo | null = null
  private staticFuzzRemaining = 512
  private drawingSettled = false
  onResize: (() => void) | null = null

  constructor(canvas: HTMLCanvasElement, side: HoopSide = 'front', options: EmbroideryRendererOptions = {}) {
    this.canvas = canvas
    this.side = side
    this.canvas.dataset.side = side
    this.context = canvas.getContext('2d', { alpha: false })!
    this.settledCanvas = document.createElement('canvas')
    this.settledContext = this.settledCanvas.getContext('2d', { alpha: false })!
    this.maxDevicePixelRatio = finiteDprLimit(options.maxDevicePixelRatio)
    this.fixedDevicePixelRatio = options.fixedDevicePixelRatio === 1 ? 1 : undefined
    this.lighting = this.resolveLighting(options.lighting ?? DEFAULT_LIGHTING_PRESET_ID)
    this.lightingKey = lightingProfileKey(this.lighting)
    this.resizeObserver = new ResizeObserver(() => this.resize(true))
    this.resizeObserver.observe(canvas)

    if (import.meta.env.DEV || import.meta.env.MODE === 'test') {
      Object.defineProperty(this.canvas, RENDERER_DEV_COUNTERS_PROPERTY, {
        configurable: true,
        get: () => this.getCounters(),
      })
    }
  }

  private resolveLighting(value: LightingPresetId | LightingProfile): LightingProfile {
    return typeof value === 'string' ? getLightingProfile(value) : normalizeLightingProfile(value)
  }

  private invalidate(reason: Exclude<SettledCacheInvalidationReason, 'initial'>): void {
    this.cache.invalidate(reason)
    this.dynamicCoverageMemo = null
    this.counters.invalidation += 1
  }

  /** Marks an external middle-layer/topology edit without coupling this renderer to its schema. */
  setTopologyRevision(revision: string | number | null): boolean {
    if (revision === this.topologyRevision) return false
    this.topologyRevision = revision
    this.invalidate('topology')
    return true
  }

  setLighting(value: LightingPresetId | LightingProfile): boolean {
    const next = this.resolveLighting(value)
    const nextKey = lightingProfileKey(next)
    if (nextKey === this.lightingKey) return false
    this.lighting = next
    this.lightingKey = nextKey
    this.fabricPattern = this.size ? this.makeFabricPattern() : null
    this.invalidate('lighting')
    return true
  }

  invalidateSettled(reason: Exclude<SettledCacheInvalidationReason, 'initial'> = 'manual'): void {
    this.invalidate(reason)
  }

  getCounters(): Readonly<RendererDevCounters> {
    return Object.freeze({ ...this.counters })
  }

  resetCounters(): void {
    for (const key of COUNTER_KEYS) this.counters[key] = 0
  }

  destroy(): void {
    this.resizeObserver.disconnect()
    if (Object.prototype.hasOwnProperty.call(this.canvas, RENDERER_DEV_COUNTERS_PROPERTY)) {
      delete (this.canvas as unknown as Record<string, unknown>)[RENDERER_DEV_COUNTERS_PROPERTY]
    }
  }

  private resize(notify: boolean): void {
    const size = Math.max(1, Math.min(this.canvas.clientWidth, this.canvas.clientHeight))
    const dpr = this.fixedDevicePixelRatio ?? Math.min(window.devicePixelRatio || 1, this.maxDevicePixelRatio)
    if (Math.abs(this.size - size) < 0.5 && this.dpr === dpr) return
    const reason: Exclude<SettledCacheInvalidationReason, 'initial'> = this.size > 0 && this.dpr !== dpr ? 'dpr' : 'resize'
    this.size = size
    this.dpr = dpr
    const width = Math.max(1, Math.round(size * dpr))
    this.canvas.width = width
    this.canvas.height = width
    this.settledCanvas.width = width
    this.settledCanvas.height = width
    this.context.setTransform(dpr, 0, 0, dpr, 0, 0)
    this.settledContext.setTransform(dpr, 0, 0, dpr, 0, 0)
    this.fabricPattern = this.makeFabricPattern()
    this.invalidate(reason)
    if (notify) this.onResize?.()
  }

  private makeFabricPattern(): CanvasPattern | null {
    const tile = document.createElement('canvas')
    tile.width = 24
    tile.height = 24
    const ctx = tile.getContext('2d')!
    const base = this.side === 'front' ? '#eee8d9' : '#e8dfcf'
    ctx.fillStyle = shadeColor(base, (this.lighting.ambient - 0.5) * 12, this.lighting.warmth)
    ctx.fillRect(0, 0, 24, 24)
    for (let line = 0; line < 24; line += 3) {
      const contrast = 0.07 + this.lighting.diffuse * 0.07
      ctx.strokeStyle = line % 6 === 0 ? `rgba(116,101,77,${contrast})` : `rgba(255,255,255,${0.14 + this.lighting.ambient * 0.2})`
      ctx.lineWidth = 0.65
      ctx.beginPath(); ctx.moveTo(0, line + 0.5); ctx.lineTo(24, line + 0.5); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(line + 0.5, 0); ctx.lineTo(line + 0.5, 24); ctx.stroke()
    }
    for (let index = 0; index < 16; index += 1) {
      ctx.fillStyle = `rgba(93,76,56,${0.015 + seededUnit(index) * 0.025})`
      ctx.fillRect(seededUnit(index + 31) * 24, seededUnit(index + 71) * 24, 0.8, 0.8)
    }
    return this.settledContext.createPattern(tile, 'repeat')
  }

  toNormalized(clientX: number, clientY: number): NormalizedPoint | null {
    const rect = this.canvas.getBoundingClientRect()
    const x = (clientX - rect.left) / rect.width
    const y = (clientY - rect.top) / rect.height
    return Math.hypot(x - 0.5, y - 0.5) <= FABRIC_RADIUS ? { x, y } : null
  }

  private point(point: NormalizedPoint): [number, number] {
    const x = this.side === 'back' ? 1 - point.x : point.x
    return [x * this.size, point.y * this.size]
  }

  private lightVector(): [number, number] {
    const radians = (this.lighting.azimuthDeg - 90) * Math.PI / 180
    return [Math.cos(radians), Math.sin(radians)]
  }

  private drawHoopAndFabric(ctx: CanvasRenderingContext2D): void {
    const center = this.size / 2
    const outer = this.size * 0.485
    const inner = this.size * 0.452
    const [lightX, lightY] = this.lightVector()
    const focusShift = inner * (0.08 + (1 - this.lighting.elevation) * 0.1)
    const focusX = center - lightX * focusShift
    const focusY = center - lightY * focusShift
    const frontWood = this.side === 'front'
    const wood = ctx.createRadialGradient(focusX, focusY, inner * 0.32, center, center, outer)
    const ambientShift = (this.lighting.ambient - 0.5) * 18
    wood.addColorStop(0, shadeColor(frontWood ? '#d6aa68' : '#c99759', ambientShift + this.lighting.diffuse * 15, this.lighting.warmth))
    wood.addColorStop(0.72, shadeColor(frontWood ? '#b67b3f' : '#9f6736', ambientShift, this.lighting.warmth))
    wood.addColorStop(1, shadeColor(frontWood ? '#7e4d29' : '#684021', ambientShift - this.lighting.diffuse * 20, this.lighting.warmth))
    ctx.fillStyle = wood
    ctx.beginPath(); ctx.arc(center, center, outer, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = `rgba(65,38,21,${0.28 + this.lighting.shadowOpacity * 0.4})`
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.arc(center, center, Math.max(0.1, outer - 3), 0, Math.PI * 2); ctx.stroke()

    ctx.save()
    ctx.beginPath(); ctx.arc(center, center, inner, 0, Math.PI * 2); ctx.clip()
    ctx.fillStyle = this.fabricPattern ?? (frontWood ? '#eee8d9' : '#e8dfcf')
    ctx.fillRect(0, 0, this.size, this.size)
    const direction = ctx.createLinearGradient(
      center - lightX * inner,
      center - lightY * inner,
      center + lightX * inner,
      center + lightY * inner,
    )
    direction.addColorStop(0, `rgba(255,248,230,${0.03 + this.lighting.diffuse * 0.1})`)
    direction.addColorStop(0.52, 'rgba(255,255,255,0)')
    direction.addColorStop(1, `rgba(65,45,32,${0.03 + this.lighting.shadowOpacity * 0.16})`)
    ctx.fillStyle = direction
    ctx.fillRect(0, 0, this.size, this.size)
    const edge = ctx.createRadialGradient(center, center, inner * 0.6, center, center, inner)
    edge.addColorStop(0, frontWood ? 'rgba(255,255,255,.05)' : 'rgba(255,248,232,.025)')
    edge.addColorStop(0.82, 'rgba(117,87,51,.02)')
    edge.addColorStop(1, `rgba(77,50,28,${0.13 + this.lighting.shadowOpacity * 0.2})`)
    ctx.fillStyle = edge
    ctx.fillRect(0, 0, this.size, this.size)
    ctx.restore()
  }

  private drawInnerRim(ctx: CanvasRenderingContext2D): void {
    const center = this.size / 2
    const inner = this.size * 0.452
    ctx.strokeStyle = `rgba(255,255,255,${0.24 + this.lighting.ambient * 0.28})`
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.arc(center, center, inner + 1, 0, Math.PI * 2); ctx.stroke()
  }

  private clipFabric(ctx: CanvasRenderingContext2D): void {
    const center = this.size / 2
    ctx.beginPath()
    ctx.arc(center, center, this.size * 0.452, 0, Math.PI * 2)
    ctx.clip()
  }

  private pathFor(stitch: Stitch, start: NormalizedPoint, end: NormalizedPoint): ThreadPath {
    const [x1, y1] = this.point(start)
    const [x2, y2] = this.point(end)
    const dx = x2 - x1
    const dy = y2 - y1
    const length = Math.max(1, Math.hypot(dx, dy))
    const ux = dx / length
    const uy = dy / length
    const nx = -uy
    const ny = ux

    if (this.side === 'back') {
      const looseness = this.size * (0.006 + seededUnit(stitch.seed + 19) * 0.012)
      const direction = seededUnit(stitch.seed + 7) > 0.5 ? 1 : -1
      const bendX = nx * looseness * direction
      const bendY = ny * looseness * direction
      return {
        x1, y1, x2, y2, dx, dy, length, nx, ny,
        c1x: x1 + dx / 3 + bendX,
        c1y: y1 + dy / 3 + bendY,
        c2x: x1 + dx * 2 / 3 + bendX,
        c2y: y1 + dy * 2 / 3 + bendY,
      }
    }

    const inclination = Math.min(70, Math.max(0, stitch.needlePose?.inclinationFromNormalDeg ?? 0))
    const poseWeight = inclination < 5 ? 0 : (inclination / 70) * 0.72
    const azimuth = (stitch.needlePose?.azimuthDeg ?? 0) * Math.PI / 180
    const poseX = Math.cos(azimuth)
    const poseY = Math.sin(azimuth)
    const blendX = ux * (1 - poseWeight) + poseX * poseWeight
    const blendY = uy * (1 - poseWeight) + poseY * poseWeight
    const blendLength = Math.max(0.0001, Math.hypot(blendX, blendY))
    const tangentX = blendX / blendLength
    const tangentY = blendY / blendLength
    const width = stitch.width * (this.size / 640)
    const influence = Math.min(length * 0.2, this.size * 0.04, width * 6)
    return {
      x1, y1, x2, y2, dx, dy, length, nx, ny,
      c1x: x1 + tangentX * influence,
      c1y: y1 + tangentY * influence,
      c2x: x2 - ux * influence * 0.5,
      c2y: y2 - uy * influence * 0.5,
    }
  }

  private settledThreadPath(stitch: Stitch, start: NormalizedPoint, end: NormalizedPoint, buildup: number): ThreadPath {
    const path = this.pathFor(stitch, start, end)
    const spread = [0, .75, -.75, 1.5, -1.5, 2.25, -2.25, 3, -3]
    const lift = (seededUnit(stitch.seed) - .5) * .9 + (spread[Math.min(8, Math.round(buildup))] ?? 0)
    path.c1x += path.nx * lift * 4 / 3; path.c2x += path.nx * lift * 4 / 3
    path.c1y += path.ny * lift * 4 / 3; path.c2y += path.ny * lift * 4 / 3
    return path
  }

  private tracePath(ctx: CanvasRenderingContext2D, path: ThreadPath, offsetX = 0, offsetY = 0): void {
    ctx.beginPath()
    ctx.moveTo(path.x1 + offsetX, path.y1 + offsetY)
    ctx.bezierCurveTo(
      path.c1x + offsetX,
      path.c1y + offsetY,
      path.c2x + offsetX,
      path.c2y + offsetY,
      path.x2 + offsetX,
      path.y2 + offsetY,
    )
    ctx.stroke()
  }

  private pathPoint(path: ThreadPath, amount: number): [number, number] {
    const t = clampUnit(amount)
    const inverse = 1 - t
    const x = inverse ** 3 * path.x1 + 3 * inverse ** 2 * t * path.c1x + 3 * inverse * t ** 2 * path.c2x + t ** 3 * path.x2
    const y = inverse ** 3 * path.y1 + 3 * inverse ** 2 * t * path.c1y + 3 * inverse * t ** 2 * path.c2y + t ** 3 * path.y2
    return [x, y]
  }

  private pathTangent(path: ThreadPath, amount: number): [number, number] {
    const t = clampUnit(amount)
    const inverse = 1 - t
    const dx = 3 * inverse ** 2 * (path.c1x - path.x1) + 6 * inverse * t * (path.c2x - path.c1x) + 3 * t ** 2 * (path.x2 - path.c2x)
    const dy = 3 * inverse ** 2 * (path.c1y - path.y1) + 6 * inverse * t * (path.c2y - path.c1y) + 3 * t ** 2 * (path.y2 - path.c2y)
    const length = Math.max(0.0001, Math.hypot(dx, dy))
    return [dx / length, dy / length]
  }

  private drawThreadDetails(ctx: CanvasRenderingContext2D, stitch: Stitch, path: ThreadPath, width: number, style: ThreadVisualStyle): void {
    const strandLines = Math.min(4, Math.max(1, style.strandCount))
    if (strandLines > 1) {
      ctx.strokeStyle = `rgba(255,255,255,${0.025 + style.sheen * 0.055})`
      ctx.lineWidth = Math.max(0.28, width * 0.035)
      for (let index = 1; index < strandLines; index += 1) {
        const offset = (index / strandLines - 0.5) * width * 0.72
        this.tracePath(ctx, path, path.nx * offset, path.ny * offset)
      }
    }

    const twistMarks = Math.min(10, Math.floor(path.length / Math.max(6, width * 3.2)))
    const twistPhase = seededUnit(stitch.seed + 211)
    if (style.twist > 0.04 && twistMarks > 0) {
      ctx.lineWidth = Math.max(0.35, width * 0.055)
      for (let index = 0; index < twistMarks; index += 1) {
        const t = (index + 0.35 + twistPhase * 0.3) / (twistMarks + 0.7)
        const [x, y] = this.pathPoint(path, t)
        const [tx, ty] = this.pathTangent(path, t)
        const nx = -ty
        const ny = tx
        const wave = Math.sin((t * (4 + style.twist * 12) + twistPhase) * Math.PI * 2)
        const half = width * (0.16 + style.twist * 0.2)
        ctx.strokeStyle = wave > 0 ? `rgba(255,255,255,${0.04 + style.sheen * 0.12})` : 'rgba(45,30,24,.08)'
        ctx.beginPath(); ctx.moveTo(x - nx * half, y - ny * half); ctx.lineTo(x + nx * half, y + ny * half); ctx.stroke()
      }
    }

    const sparkleCandidates = Math.min(6, Math.max(2, Math.ceil(path.length / 48)))
    for (let index = 0; index < sparkleCandidates; index += 1) {
      if (seededUnit(stitch.seed + 401 + index * 13) >= style.speckle) continue
      const t = 0.06 + seededUnit(stitch.seed + 503 + index * 17) * 0.88
      const [x, y] = this.pathPoint(path, t)
      const radius = Math.max(0.35, width * (0.035 + style.metallic * 0.04))
      ctx.fillStyle = `rgba(255,255,245,${0.12 + style.metallic * 0.54})`
      ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill()
    }

    const stiffness = style.fuzzMaterial.stiffness
    const fuzzSeed = (stitch.seed ^ style.fuzzMaterial.seed) >>> 0
    ctx.lineCap = 'round'
    ctx.lineWidth = Math.max(0.28, width * 0.045)
    ctx.strokeStyle = `rgba(76,52,42,${0.08 + style.colorVariation * 0.2})`
    const fuzzLimit = this.drawingSettled ? Math.min(12, this.staticFuzzRemaining) : 12
    let fuzzDrawn = 0
    for (let index = 0; index < 12 && fuzzDrawn < fuzzLimit; index += 1) {
      if (seededUnit(fuzzSeed + 701 + index * 19) >= style.fuzzDensity) continue
      const t = 0.03 + seededUnit(fuzzSeed + 809 + index * 23) * 0.94
      const [x, y] = this.pathPoint(path, t)
      const [tx, ty] = this.pathTangent(path, t)
      const direction = seededUnit(fuzzSeed + 907 + index * 29) > 0.5 ? 1 : -1
      const nx = -ty * direction
      const ny = tx * direction
      const length = width * (0.35 + seededUnit(fuzzSeed + 1009 + index * 31) * (0.75 + style.compliance * 0.55))
      const bend = (0.5 - stiffness) * length * 0.38
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.quadraticCurveTo(x + nx * length * 0.55 + tx * bend, y + ny * length * 0.55 + ty * bend, x + nx * length, y + ny * length)
      ctx.stroke()
      fuzzDrawn += 1
    }
    if (this.drawingSettled) this.staticFuzzRemaining -= fuzzDrawn
  }

  private drawThread(
    ctx: CanvasRenderingContext2D,
    stitch: Stitch,
    preview: boolean,
    buildup: number,
    start = stitch.start,
    end = stitch.end,
    curves?: readonly CubicThreadPath[],
    detailProgress = 1,
  ): void {
    if (samePoint(start, end)) return
    const path = this.settledThreadPath(stitch, start, end, buildup)
    const cachedStyle = this.threadStyleCache.get(stitch)
    const style = cachedStyle?.lightingKey === this.lightingKey
      ? cachedStyle.style
      : deriveThreadVisualStyle(stitch, this.lighting)
    if (!cachedStyle || cachedStyle.lightingKey !== this.lightingKey) {
      this.threadStyleCache.set(stitch, { lightingKey: this.lightingKey, style })
    }
    const width = stitch.width * style.widthScale * (this.size / 640) * (preview ? 0.9 : 1)
    const trace = (offsetX = 0, offsetY = 0) => {
      if (curves) {
        ctx.save(); ctx.translate(offsetX, offsetY); this.traceCubicThread(ctx, curves); ctx.restore()
      } else this.tracePath(ctx, path, offsetX, offsetY)
    }
    const [lightX, lightY] = this.lightVector()
    const shadowScale = this.size / 640
    const shadowOffset = Math.min(7, this.lighting.shadowOffsetAt640 * shadowScale)

    ctx.save()
    ctx.globalAlpha = preview ? 0.55 : 1
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = `rgba(55,38,29,${Math.min(0.5, this.lighting.shadowOpacity + 0.08 + buildup * 0.014)})`
    ctx.lineWidth = width + 2.6 + Math.min(1.5, buildup * 0.12)
    trace(lightX * shadowOffset, lightY * shadowOffset)

    ctx.strokeStyle = style.darkColor
    ctx.lineWidth = width + 0.9
    trace()

    const [middleX, middleY] = this.pathPoint(path, .5)
    const sideLight = lightX * path.nx + lightY * path.ny
    const highlightCenter = sideLight >= 0 ? 0.32 : 0.68
    const half = Math.max(1, width * 0.72)
    const tube = ctx.createLinearGradient(middleX - path.nx * half, middleY - path.ny * half, middleX + path.nx * half, middleY + path.ny * half)
    tube.addColorStop(0, style.darkColor)
    tube.addColorStop(Math.max(0.08, highlightCenter - 0.2), style.baseColor)
    tube.addColorStop(highlightCenter, style.lightColor)
    tube.addColorStop(Math.min(0.92, highlightCenter + 0.18), style.baseColor)
    tube.addColorStop(1, style.darkColor)
    ctx.strokeStyle = tube
    ctx.lineWidth = width
    trace()

    const highlightOffset = (highlightCenter - 0.5) * width
    ctx.strokeStyle = `rgba(255,255,255,${style.specularAlpha})`
    ctx.lineWidth = Math.max(0.38, width * (0.05 + (1 - style.highlightSharpness) * 0.09))
    trace(path.nx * highlightOffset, path.ny * highlightOffset)
    if (!preview && detailProgress > 0) {
      ctx.globalAlpha *= detailProgress
      this.drawThreadDetails(ctx, stitch, path, width, style)
    }
    ctx.restore()
  }

  private traceCubicThread(ctx: CanvasRenderingContext2D, curves: readonly CubicThreadPath[]): void {
    if (!curves.length) return
    ctx.beginPath()
    ctx.moveTo(...this.point(curves[0]![0]))
    for (const curve of curves) ctx.bezierCurveTo(...this.point(curve[1]), ...this.point(curve[2]), ...this.point(curve[3]))
    ctx.stroke()
  }

  private drawActiveThread(ctx: CanvasRenderingContext2D, points: readonly NormalizedPoint[], color: string): void {
    if (points.length < 2) return
    const live: Stitch = { id: 'live', type: 'running', start: points[0]!, end: points.at(-1)!, color, width: 3.8, order: 0, seed: 17 }
    this.drawThread(ctx, live, false, 0, live.start, live.end, looseThreadPath(points), 0)
  }

  private coveragePoints(stitch: Stitch): [NormalizedPoint, NormalizedPoint] {
    if (this.side === 'back') return [stitch.needleStart ?? stitch.start, stitch.needleEnd ?? stitch.end]
    return [stitch.start, stitch.end]
  }

  private drawNeedleHole(ctx: CanvasRenderingContext2D, stitch: Stitch, point: NormalizedPoint): void {
    const [x, y] = this.point(point)
    const hole = deriveNeedleHoleVisual(stitch)
    const radius = Math.max(1.2, hole.radiusAt640 * (this.size / 640))
    const [lightX, lightY] = this.lightVector()
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(this.side === 'back' ? -hole.rotationRad : hole.rotationRad)
    ctx.scale(hole.aspectRatio, 1)
    const opening = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 1.65)
    opening.addColorStop(0, `rgba(58,39,29,${0.28 + 0.13 * hole.forceScale})`)
    opening.addColorStop(0.48, 'rgba(89,62,44,.18)')
    opening.addColorStop(1, 'rgba(89,62,44,0)')
    ctx.fillStyle = opening
    ctx.beginPath(); ctx.arc(0, 0, radius * 1.65, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = `rgba(255,255,245,${0.12 + this.lighting.specular * 0.14})`
    ctx.lineWidth = Math.max(0.35, radius * 0.2)
    ctx.beginPath(); ctx.arc(-lightX * radius * 0.2, -lightY * radius * 0.2, radius, Math.PI * 0.84, Math.PI * 1.7); ctx.stroke()
    ctx.restore()
  }

  private drawStaticStitch(ctx: CanvasRenderingContext2D, stitch: Stitch, buildup: number): void {
    const [start, end] = this.coveragePoints(stitch)
    if(stitch.renderKind==='anchor'){
      const [x,y]=this.point(start),r=Math.max(.7,this.size/640*1.15)
      ctx.save();ctx.translate(x,y);ctx.rotate((stitch.seed%7-.3)*.2)
      ctx.fillStyle=stitch.color;ctx.shadowColor='rgba(50,35,25,.18)';ctx.shadowBlur=r*.5;ctx.shadowOffsetY=r*.4
      ctx.beginPath();ctx.ellipse(0,0,r*1.25,r*.85,0,0,Math.PI*2);ctx.fill()
      ctx.shadowBlur=0;ctx.shadowOffsetY=0;ctx.strokeStyle='rgba(255,250,239,.38)';ctx.lineWidth=Math.max(.35,r*.3)
      ctx.beginPath();ctx.moveTo(-r*.55,-r*.18);ctx.lineTo(r*.5,-r*.3);ctx.stroke();ctx.restore();return
    }
    if (stitch.renderKind === 'puncture') {
      this.drawNeedleHole(ctx, stitch, start)
      return
    }
    this.drawThread(ctx, stitch, false, buildup, start, end)
    if (stitch.renderKind !== 'thread') {
      this.drawNeedleHole(ctx, stitch, start)
      this.drawNeedleHole(ctx, stitch, end)
    }
  }

  private rebuildSettled(stitches: readonly Stitch[], count: number): void {
    const ctx = this.settledContext
    ctx.clearRect(0, 0, this.size, this.size)
    this.drawHoopAndFabric(ctx)
    this.coverage.clear()
    this.staticFuzzRemaining = 512
    this.drawingSettled = true
    ctx.save()
    this.clipFabric(ctx)
    for (let index = 0; index < count; index += 1) {
      const stitch = stitches[index]
      if (!stitch) continue
      const [start, end] = this.coveragePoints(stitch)
      const buildup = this.coverage.samplePath(start, end)
      this.drawStaticStitch(ctx, stitch, buildup)
      if (stitch.renderKind !== 'puncture' && stitch.renderKind !== 'anchor') this.coverage.addPath(start, end)
    }
    ctx.restore()
    this.drawingSettled = false
    this.drawInnerRim(ctx)
    this.coverageRevision += 1
    this.dynamicCoverageMemo = null
    this.counters.staticBuild += 1
    this.counters.coverageBuild += 1
  }

  private appendSettled(stitches: readonly Stitch[], from: number, to: number): void {
    const ctx = this.settledContext
    this.drawingSettled = true
    ctx.save()
    this.clipFabric(ctx)
    for (let index = from; index < to; index += 1) {
      const stitch = stitches[index]
      if (!stitch) continue
      const [start, end] = this.coveragePoints(stitch)
      const buildup = this.coverage.samplePath(start, end)
      this.drawStaticStitch(ctx, stitch, buildup)
      if (stitch.renderKind !== 'puncture' && stitch.renderKind !== 'anchor') this.coverage.addPath(start, end)
      this.counters.coverageAppend += 1
    }
    ctx.restore()
    this.drawingSettled = false
    this.drawInnerRim(ctx)
    this.coverageRevision += 1
    this.dynamicCoverageMemo = null
    this.counters.append += 1
    this.counters.appendedStitches += to - from
  }

  private buildupForDynamic(stitch: Stitch): number {
    if (this.dynamicCoverageMemo?.stitch === stitch && this.dynamicCoverageMemo.revision === this.coverageRevision) {
      return this.dynamicCoverageMemo.buildup
    }
    const [start, end] = this.coveragePoints(stitch)
    const buildup = this.coverage.samplePath(start, end)
    this.dynamicCoverageMemo = { stitch, revision: this.coverageRevision, buildup }
    return buildup
  }

  private drawDimple(ctx: CanvasRenderingContext2D, stitch: Stitch, sample: StitchMotionSampleV2): void {
    if (sample.dimple.opacity <= 0 || sample.dimple.radius <= 0) return
    const contact = stitch.needleEnd ?? stitch.end
    const [x, y] = this.point(contact)
    const force = deriveNeedleHoleVisual(stitch).forceScale
    const radius = Math.max(2, (9 + 7 * sample.dimple.radius) * force * (this.size / 640))
    const depth = sample.dimple.depth * force
    const [lightX, lightY] = this.lightVector()
    const opacity = clampUnit(sample.dimple.opacity)

    ctx.save()
    ctx.globalAlpha = opacity
    const shade = ctx.createRadialGradient(
      x + lightX * radius * 0.22,
      y + lightY * radius * 0.22,
      radius * 0.08,
      x,
      y,
      radius,
    )
    shade.addColorStop(0, `rgba(57,40,31,${0.2 + depth * 0.24})`)
    shade.addColorStop(0.42, `rgba(83,61,46,${0.12 + depth * 0.15})`)
    shade.addColorStop(1, 'rgba(83,61,46,0)')
    ctx.fillStyle = shade
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill()

    ctx.strokeStyle = `rgba(255,255,240,${0.1 + this.lighting.specular * 0.2})`
    ctx.lineWidth = Math.max(0.45, this.size / 900)
    ctx.beginPath()
    ctx.arc(x - lightX * radius * 0.16, y - lightY * radius * 0.16, radius * 0.7, Math.atan2(lightY, lightX) + Math.PI * 0.55, Math.atan2(lightY, lightX) + Math.PI * 1.45)
    ctx.stroke()

    ctx.strokeStyle = `rgba(94,72,54,${0.08 + depth * 0.11})`
    ctx.lineWidth = Math.max(0.35, this.size / 1100)
    for (let line = -1; line <= 1; line += 1) {
      const offset = line * radius * 0.27
      ctx.beginPath()
      ctx.moveTo(x - radius * 0.72, y + offset)
      ctx.bezierCurveTo(x - radius * 0.28, y + offset + depth * radius * 0.18, x + radius * 0.28, y + offset + depth * radius * 0.18, x + radius * 0.72, y + offset)
      ctx.stroke()
    }
    ctx.fillStyle = `rgba(49,34,27,${0.11 + depth * 0.19})`
    ctx.beginPath(); ctx.arc(x, y, Math.max(0.9, radius * 0.11), 0, Math.PI * 2); ctx.fill()
    ctx.restore()
  }

  private drawNeedle(ctx: CanvasRenderingContext2D, stitch: Stitch, sample: StitchMotionSampleV2): void {
    if (sample.needleOpacity <= 0) return
    const end = stitch.needleEnd ?? stitch.end
    const pose = needlePose(end)
    const [contactX, contactY] = this.point(pose.tip)
    const [tailX, tailY] = this.point(interpolate(pose.tail, pose.tip, sample.threadPull))
    const angle = Math.atan2(contactY - tailY, contactX - tailX)
    const scale = this.size / 640
    const length = Math.hypot(contactX - tailX, contactY - tailY)
    const [lightX, lightY] = this.lightVector()

    ctx.save()
    ctx.globalAlpha = clampUnit(sample.needleOpacity)
    ctx.translate(contactX, contactY)
    ctx.rotate(angle)
    const needle = ctx.createLinearGradient(0, -2.5 * scale, 0, 2.5 * scale)
    needle.addColorStop(0, '#777b7b')
    needle.addColorStop(0.42, '#fbffff')
    needle.addColorStop(1, '#8f9393')
    ctx.strokeStyle = needle
    ctx.lineWidth = Math.max(1.25, 1.8 * scale)
    ctx.lineCap = 'round'
    ctx.shadowColor = `rgba(54,43,34,${Math.min(0.4, this.lighting.shadowOpacity + 0.08)})`
    ctx.shadowBlur = Math.min(4, this.lighting.shadowBlurAt640 * scale * 0.18)
    ctx.shadowOffsetX = lightX * Math.min(3, this.lighting.shadowOffsetAt640 * scale * 0.25)
    ctx.shadowOffsetY = lightY * Math.min(3, this.lighting.shadowOffsetAt640 * scale * 0.25)
    ctx.beginPath(); ctx.moveTo(-length, 0); ctx.lineTo(0, 0); ctx.stroke()
    ctx.shadowColor = 'transparent'
    ctx.fillStyle = shadeColor(stitch.color, 10, this.lighting.warmth)
    ctx.beginPath(); ctx.ellipse(-length * .86, 0, Math.max(1.2, 2.2 * scale), Math.max(0.8, 1.35 * scale), 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#d9dddd'
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-3 * scale, -Math.max(0.65, scale)); ctx.lineTo(-3 * scale, Math.max(0.65, scale)); ctx.closePath(); ctx.fill()
    ctx.restore()
  }

  private drawPose(ctx: CanvasRenderingContext2D, pose: NeedlePose, shaft: readonly [NormalizedPoint, NormalizedPoint], eyeVisible: boolean, color: string, focus = 1): void {
    const project = (point: NormalizedPoint): NormalizedPoint => { const [x, y] = this.point(point); return { x, y } }
    drawNeedleVisual(ctx, project(pose.tip), project(pose.eye), project(pose.tail), [project(shaft[0]), project(shaft[1])], eyeVisible, color, this.size / 640, focus)
  }

  private drawMotion(ctx: CanvasRenderingContext2D, stitch: Stitch, motion: StitchMotion, sample: StitchMotionSampleV2, drawThread: boolean, buildupOverride?: number): void {
    this.drawDimple(ctx, stitch, sample)
    if (drawThread && motion.loosePoints && motion.loosePoints.length >= 2) {
      const [start, end] = this.coveragePoints(stitch)
      const buildup = buildupOverride ?? this.buildupForDynamic(stitch)
      const path = this.settledThreadPath(stitch, start, end, buildup)
      const unproject = (x: number, y: number): NormalizedPoint => ({ x: this.side === 'back' ? 1 - x / this.size : x / this.size, y: y / this.size })
      const goal: CubicThreadPath = [unproject(path.x1, path.y1), unproject(path.c1x, path.c1y), unproject(path.c2x, path.c2y), unproject(path.x2, path.y2)]
      const passage = motion.capturedPose ? needlePassage(motion.capturedPose, motion.progress) : null
      const pull = passage?.pull ?? sample.threadPull
      const source = passage ? transportThreadEye(looseThreadPath(motion.loosePoints), passage.sourceThreadEnd) : looseThreadPath(motion.loosePoints)
      const curves = tightenThreadPath(source, goal, pull, { anchorHole: stitch.needleStart ?? stitch.start, pulledHole: stitch.needleEnd ?? stitch.end, threadEye: source.at(-1)![3] })
      if (pull < 1) this.drawThread(ctx, { ...stitch, width: 3.8 + (stitch.width - 3.8) * pull }, false, buildup, start, end, curves, Math.max(0, (pull - .9) * 10))
      else this.drawThread(ctx, stitch, false, buildup, start, end)
    } else if (drawThread && sample.threadPull > 0) {
      const needleStart = stitch.needleStart ?? stitch.start
      const needleEnd = stitch.needleEnd ?? stitch.end
      const settle = clampUnit((sample.progress - 0.6) / 0.3)
      const start = interpolate(needleStart, stitch.start, settle)
      const pulledEnd = interpolate(needleStart, needleEnd, sample.threadPull)
      const end = sample.threadPull < 1 ? pulledEnd : interpolate(needleEnd, stitch.end, settle)
      this.drawThread(ctx, stitch, false, this.buildupForDynamic(stitch), start, end)
    }
    if (!motion.capturedPose) this.drawNeedle(ctx, stitch, sample)
    this.counters.motionDraw += 1
  }

  private drawEmergenceTarget(ctx: CanvasRenderingContext2D, point: NormalizedPoint, color: string): void {
    const [x, y] = this.point(point)
    const scale = this.size / 640
    const radius = Math.max(7, 11 * scale)
    ctx.save()
    ctx.globalAlpha = .72
    ctx.setLineDash([Math.max(2, 3 * scale), Math.max(2, 3 * scale)])
    ctx.strokeStyle = shadeColor(color, -24, this.lighting.warmth)
    ctx.lineWidth = Math.max(1, 1.6 * scale)
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = 'rgba(255,250,240,.82)'
    ctx.beginPath(); ctx.arc(x, y, Math.max(2, 3 * scale), 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = color
    ctx.beginPath(); ctx.arc(x, y, Math.max(2, 3 * scale), 0, Math.PI * 2); ctx.stroke()
    ctx.restore()
    this.counters.previewDraw += 1
  }

  private drawPreview(ctx: CanvasRenderingContext2D, anchor: NormalizedPoint | null, target: NormalizedPoint | null, color: string, transient?: TransientThreadVisual): void {
    if (transient?.passage) {
      const { sample, destination } = transient.passage
      const shaft = destination ? sample.destinationShaft : sample.sourceShaft
      if (destination && sample.extraThread.length) this.drawActiveThread(ctx, sample.extraThread, color)
      if (shaft) this.drawPose(ctx, sample.pose, shaft, destination ? sample.destinationEyeVisible : sample.sourceEyeVisible, color, sample.focus)
      return
    }
    if (transient?.points && transient.points.length >= 2) {
      this.drawActiveThread(ctx, transient.points, color)
      this.counters.previewDraw += 1
    } else if (anchor && target && !samePoint(anchor, target)) {
      this.drawThread(ctx, {
        id: 'preview',
        type: 'running',
        start: anchor,
        end: target,
        color,
        width: 3.8,
        order: Number.MAX_SAFE_INTEGER,
        seed: 17,
      }, true, 0)
      this.counters.previewDraw += 1
    }
    if (anchor) {
      const [x, y] = this.point(anchor)
      ctx.fillStyle = '#f8f2e4'
      ctx.strokeStyle = shadeColor(color, -30, this.lighting.warmth)
      ctx.lineWidth = 2
      ctx.beginPath(); ctx.arc(x, y, 5.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      ctx.fillStyle = color
      ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2); ctx.fill()
    }
    if (transient?.emergenceTarget) this.drawEmergenceTarget(ctx, transient.emergenceTarget, color)
    if (target && transient?.needleVisible !== false) {
      const sharedPose = transient?.pose ?? needlePose(target)
      this.drawPose(ctx, sharedPose, [sharedPose.tip, sharedPose.tail], true, color)
      this.counters.previewDraw += 1
      return
    }
  }

  private composeDynamic(
    stitches: readonly Stitch[],
    anchor: NormalizedPoint | null,
    target: NormalizedPoint | null,
    color: string,
    motion: StitchMotion | null,
    tailMotion: boolean,
    transient?: TransientThreadVisual,
  ): void {
    const ctx = this.context
    ctx.clearRect(0, 0, this.size, this.size)
    ctx.drawImage(
      this.settledCanvas,
      0,
      0,
      this.settledCanvas.width,
      this.settledCanvas.height,
      0,
      0,
      this.size,
      this.size,
    )
    this.counters.cacheBlit += 1
    ctx.save()
    this.clipFabric(ctx)
    this.drawPreview(ctx, anchor, target, color, transient)
    if (motion) {
      const stitch = tailMotion ? stitches.at(-1) : stitches.find((candidate) => candidate.id === motion.stitchId)
      if (stitch) this.drawMotion(ctx, stitch, motion, motion.sample ?? sampleStitchMotionProgress(motion.progress), tailMotion)
    }
    ctx.restore()
    this.drawInnerRim(ctx)
    this.counters.dynamicDraw += 1
  }

  render(
    stitches: readonly Stitch[],
    anchor: NormalizedPoint | null,
    target: NormalizedPoint | null,
    color: string,
    motion: StitchMotion | null = null,
    transient?: TransientThreadVisual,
    tails: readonly StitchMotion[] = [],
  ): void {
    if (!this.size) this.resize(false)
    if (tails.length) {
      const transitions = [...tails, ...(motion ? [motion] : [])]
      const ids = new Set(transitions.map(item => item.stitchId))
      const first = stitches.findIndex(item => ids.has(item.id))
      const settledCount = first < 0 ? stitches.length : first
      const plan = this.cache.plan(stitches, settledCount)
      if (plan.action === 'rebuild') this.rebuildSettled(stitches, plan.to)
      else if (plan.action === 'append') this.appendSettled(stitches, plan.from, plan.to)
      this.cache.accept(stitches, plan)
      const ctx = this.context
      ctx.clearRect(0, 0, this.size, this.size)
      ctx.drawImage(this.settledCanvas, 0, 0, this.settledCanvas.width, this.settledCanvas.height, 0, 0, this.size, this.size)
      this.counters.cacheBlit += 1
      const coverage = this.coverage.clone()
      ctx.save(); this.clipFabric(ctx)
      for (const stitch of stitches.slice(settledCount)) {
        const [start, end] = this.coveragePoints(stitch)
        const buildup = coverage.samplePath(start, end)
        const transition = transitions.find(item => item.stitchId === stitch.id)
        if (transition) this.drawMotion(ctx, stitch, transition, transition.sample ?? sampleStitchMotionProgress(transition.progress), true, buildup)
        else this.drawStaticStitch(ctx, stitch, buildup)
        if (stitch.renderKind !== 'puncture' && stitch.renderKind !== 'anchor') coverage.addPath(start, end)
      }
      this.drawPreview(ctx, anchor, target, color, transient)
      ctx.restore(); this.drawInnerRim(ctx)
      this.counters.dynamicDraw += 1
      return
    }
    const last = stitches.at(-1)
    const tailMotion = motion !== null && last?.id === motion.stitchId
    const settledCount = tailMotion ? stitches.length - 1 : stitches.length
    const plan = this.cache.plan(stitches, settledCount)
    if (plan.action === 'rebuild') this.rebuildSettled(stitches, plan.to)
    else if (plan.action === 'append') this.appendSettled(stitches, plan.from, plan.to)
    this.cache.accept(stitches, plan)
    this.composeDynamic(stitches, anchor, target, color, motion, tailMotion, transient)
  }
}
