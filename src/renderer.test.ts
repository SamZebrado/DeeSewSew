import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EmbroideryRenderer } from './renderer'
import type { Stitch } from './stitch-model'

class FakeGradient {
  addColorStop(): void {}
}

const makeContext = (): CanvasRenderingContext2D => ({
  setTransform: () => undefined,
  clearRect: () => undefined,
  fillRect: () => undefined,
  beginPath: () => undefined,
  moveTo: () => undefined,
  lineTo: () => undefined,
  bezierCurveTo: () => undefined,
  quadraticCurveTo: () => undefined,
  closePath: () => undefined,
  arc: () => undefined,
  ellipse: () => undefined,
  clip: () => undefined,
  fill: () => undefined,
  stroke: () => undefined,
  save: () => undefined,
  restore: () => undefined,
  translate: () => undefined,
  rotate: () => undefined,
  scale: () => undefined,
  drawImage: () => undefined,
  createPattern: () => ({}) as CanvasPattern,
  createLinearGradient: () => new FakeGradient() as CanvasGradient,
  createRadialGradient: () => new FakeGradient() as CanvasGradient,
} as unknown as CanvasRenderingContext2D)

class FakeCanvas {
  width = 0
  height = 0
  clientWidth = 640
  clientHeight = 640
  dataset: DOMStringMap = {} as DOMStringMap
  readonly context = makeContext()

  getContext(): CanvasRenderingContext2D { return this.context }
  getBoundingClientRect(): DOMRect {
    return { x: 0, y: 0, left: 0, top: 0, right: this.clientWidth, bottom: this.clientHeight, width: this.clientWidth, height: this.clientHeight, toJSON: () => ({}) }
  }
}

class FakeResizeObserver {
  static instances: FakeResizeObserver[] = []
  private readonly callback: ResizeObserverCallback

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
    FakeResizeObserver.instances.push(this)
  }

  observe(): void {}
  disconnect(): void {}
  trigger(): void { this.callback([], this as unknown as ResizeObserver) }
}

const stitch = (id: string, order: number, offset = 0): Stitch => ({
  id,
  type: 'running',
  start: { x: 0.2 + offset, y: 0.3 },
  end: { x: 0.7, y: 0.6 + offset },
  needleStart: { x: 0.18 + offset, y: 0.29 },
  needleEnd: { x: 0.74, y: 0.63 + offset },
  color: '#74516f',
  width: 3.8,
  order,
  seed: order * 101,
})

describe('EmbroideryRenderer settled cache integration', () => {
  beforeEach(() => {
    FakeResizeObserver.instances = []
    vi.stubGlobal('window', { devicePixelRatio: 2 })
    vi.stubGlobal('document', { createElement: () => new FakeCanvas() })
    vi.stubGlobal('ResizeObserver', FakeResizeObserver)
  })

  afterEach(() => vi.unstubAllGlobals())

  it('keeps preview and 120 motion frames off the static canvas, then appends once', () => {
    const canvas = new FakeCanvas()
    const renderer = new EmbroideryRenderer(canvas as unknown as HTMLCanvasElement)
    const first = stitch('stitch-1', 1)
    const second = stitch('stitch-2', 2, 0.02)
    renderer.render([first], null, null, '#74516f')
    renderer.resetCounters()

    const stitches = [first, second]
    for (let frame = 0; frame < 120; frame += 1) {
      renderer.render(stitches, second.end, { x: 0.65, y: 0.55 }, '#74516f', { stitchId: second.id, progress: frame / 119 })
    }
    expect(renderer.getCounters()).toMatchObject({ staticBuild: 0, append: 0, coverageBuild: 0, coverageAppend: 0, dynamicDraw: 120, motionDraw: 120 })

    renderer.render(stitches, second.end, second.end, '#74516f')
    expect(renderer.getCounters()).toMatchObject({ staticBuild: 0, append: 1, appendedStitches: 1, coverageAppend: 1, dynamicDraw: 121 })
    renderer.destroy()
  })

  it('rebuilds for undo, redo, lighting, topology, and resize invalidation', () => {
    const canvas = new FakeCanvas()
    const renderer = new EmbroideryRenderer(canvas as unknown as HTMLCanvasElement)
    const first = stitch('stitch-1', 1)
    const second = stitch('stitch-2', 2, 0.02)
    renderer.render([first, second], null, null, '#74516f')
    renderer.resetCounters()

    renderer.render([first], null, null, '#74516f')
    renderer.render([first, second], null, null, '#74516f')
    expect(renderer.getCounters()).toMatchObject({ staticBuild: 2, append: 0 })

    expect(renderer.setLighting('warm-lamp')).toBe(true)
    renderer.render([first, second], null, null, '#74516f')
    expect(renderer.setTopologyRevision('topology-2')).toBe(true)
    renderer.render([first, second], null, null, '#74516f')
    canvas.clientWidth = 500
    canvas.clientHeight = 500
    FakeResizeObserver.instances[0]!.trigger()
    renderer.render([first, second], null, null, '#74516f')
    expect(renderer.getCounters()).toMatchObject({ staticBuild: 5, append: 0 })
    renderer.destroy()
  })

  it('incrementally appends the settled reverse face too', () => {
    const canvas = new FakeCanvas()
    const renderer = new EmbroideryRenderer(canvas as unknown as HTMLCanvasElement, 'back')
    const first = stitch('stitch-1', 1)
    renderer.render([], null, null, '#74516f')
    renderer.resetCounters()
    renderer.render([first], null, null, '#74516f')
    expect(renderer.getCounters()).toMatchObject({ staticBuild: 0, append: 1, appendedStitches: 1, coverageAppend: 1 })
    renderer.destroy()
  })
})
