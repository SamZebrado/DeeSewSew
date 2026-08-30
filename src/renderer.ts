import { FABRIC_RADIUS, type NormalizedPoint, type Stitch } from './stitch-model'

const seededUnit = (seed: number): number => {
  const value = Math.sin(seed * 12.9898) * 43758.5453
  return value - Math.floor(value)
}
const shade = (hex: string, amount: number): string => {
  const value = Number.parseInt(hex.slice(1), 16)
  const channel = (shift: number) => Math.max(0, Math.min(255, ((value >> shift) & 255) + amount))
  return `rgb(${channel(16)}, ${channel(8)}, ${channel(0)})`
}

export class EmbroideryRenderer {
  private canvas: HTMLCanvasElement
  private context: CanvasRenderingContext2D
  private size = 0
  private dpr = 1
  private fabricPattern: CanvasPattern | null = null
  onResize: (() => void) | null = null

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.context = canvas.getContext('2d', { alpha: false })!
    new ResizeObserver(() => this.resize()).observe(canvas)
  }

  private resize(): void {
    const rect = this.canvas.getBoundingClientRect()
    const size = Math.max(1, Math.min(rect.width, rect.height))
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5)
    if (Math.abs(this.size - size) < 0.5 && this.dpr === dpr) return
    this.size = size
    this.dpr = dpr
    this.canvas.width = Math.round(size * dpr)
    this.canvas.height = Math.round(size * dpr)
    this.context.setTransform(dpr, 0, 0, dpr, 0, 0)
    this.fabricPattern = this.makeFabricPattern()
    this.onResize?.()
  }

  private makeFabricPattern(): CanvasPattern | null {
    const tile = document.createElement('canvas')
    tile.width = 24; tile.height = 24
    const ctx = tile.getContext('2d')!
    ctx.fillStyle = '#eee8d9'; ctx.fillRect(0, 0, 24, 24)
    for (let line = 0; line < 24; line += 3) {
      ctx.strokeStyle = line % 6 === 0 ? 'rgba(116,101,77,.11)' : 'rgba(255,255,255,.28)'
      ctx.lineWidth = .65
      ctx.beginPath(); ctx.moveTo(0, line + .5); ctx.lineTo(24, line + .5); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(line + .5, 0); ctx.lineTo(line + .5, 24); ctx.stroke()
    }
    for (let index = 0; index < 16; index += 1) {
      ctx.fillStyle = `rgba(93,76,56,${.015 + seededUnit(index) * .025})`
      ctx.fillRect(seededUnit(index + 31) * 24, seededUnit(index + 71) * 24, .8, .8)
    }
    return this.context.createPattern(tile, 'repeat')
  }

  toNormalized(clientX: number, clientY: number): NormalizedPoint | null {
    const rect = this.canvas.getBoundingClientRect()
    const x = (clientX - rect.left) / rect.width
    const y = (clientY - rect.top) / rect.height
    return Math.hypot(x - .5, y - .5) <= FABRIC_RADIUS ? { x, y } : null
  }

  private point(point: NormalizedPoint): [number, number] { return [point.x * this.size, point.y * this.size] }

  private drawThread(stitch: Stitch, preview = false, stackDepth = 0): void {
    const ctx = this.context
    const [x1, y1] = this.point(stitch.start); const [x2, y2] = this.point(stitch.end)
    const dx = x2 - x1; const dy = y2 - y1; const length = Math.max(1, Math.hypot(dx, dy))
    const nx = -dy / length; const ny = dx / length
    const spreadOrder = [0, .75, -.75, 1.5, -1.5, 2.25, -2.25, 3, -3]
    const stackSpread = spreadOrder[stackDepth % spreadOrder.length]
    const lift = (seededUnit(stitch.seed) - .5) * .9 + stackSpread
    const width = stitch.width * (this.size / 640) * (preview ? .9 : 1)
    const drawLine = (offset: number) => {
      ctx.beginPath(); ctx.moveTo(x1 + nx * (offset + lift), y1 + ny * (offset + lift)); ctx.lineTo(x2 + nx * (offset + lift), y2 + ny * (offset + lift)); ctx.stroke()
    }
    ctx.save(); ctx.globalAlpha = preview ? .55 : 1; ctx.lineCap = 'round'
    ctx.strokeStyle = 'rgba(65,45,33,.20)'; ctx.lineWidth = width + 3.2; drawLine(1.5)
    ctx.strokeStyle = shade(stitch.color, -40); ctx.lineWidth = width + 1.2; drawLine(0)
    ctx.strokeStyle = stitch.color; ctx.lineWidth = width; drawLine(0)
    ctx.strokeStyle = shade(stitch.color, 42); ctx.lineWidth = Math.max(.8, width * .24); drawLine(-width * .16)
    ctx.strokeStyle = 'rgba(255,255,255,.24)'; ctx.lineWidth = Math.max(.45, width * .09); drawLine(-width * .32)
    if (!preview) for (const [x, y] of [[x1, y1], [x2, y2]]) {
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, width * 1.3)
      gradient.addColorStop(0, 'rgba(70,48,35,.33)'); gradient.addColorStop(1, 'rgba(70,48,35,0)')
      ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(x, y, width * 1.4, 0, Math.PI * 2); ctx.fill()
    }
    ctx.restore()
  }

  render(stitches: Stitch[], anchor: NormalizedPoint | null, target: NormalizedPoint | null, color: string): void {
    if (!this.size) this.resize()
    const ctx = this.context; const center = this.size / 2; const outer = this.size * .485; const inner = this.size * .452
    ctx.clearRect(0, 0, this.size, this.size)
    const wood = ctx.createRadialGradient(center * .76, center * .72, inner * .4, center, center, outer)
    wood.addColorStop(0, '#d6aa68'); wood.addColorStop(.72, '#b67b3f'); wood.addColorStop(1, '#7e4d29')
    ctx.fillStyle = wood; ctx.beginPath(); ctx.arc(center, center, outer, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = 'rgba(86,48,24,.42)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(center, center, Math.max(.1, outer - 3), 0, Math.PI * 2); ctx.stroke()
    ctx.save(); ctx.beginPath(); ctx.arc(center, center, inner, 0, Math.PI * 2); ctx.clip()
    ctx.fillStyle = this.fabricPattern ?? '#eee8d9'; ctx.fillRect(0, 0, this.size, this.size)
    const edge = ctx.createRadialGradient(center, center, inner * .6, center, center, inner)
    edge.addColorStop(0, 'rgba(255,255,255,.07)'); edge.addColorStop(.82, 'rgba(117,87,51,.02)'); edge.addColorStop(1, 'rgba(77,50,28,.19)')
    ctx.fillStyle = edge; ctx.fillRect(0, 0, this.size, this.size)
    const stacks = new Map<string, number>()
    stitches.forEach((stitch) => {
      const a = `${Math.round(stitch.start.x * 80)},${Math.round(stitch.start.y * 80)}`
      const b = `${Math.round(stitch.end.x * 80)},${Math.round(stitch.end.y * 80)}`
      const key = a < b ? `${a}:${b}` : `${b}:${a}`
      const depth = stacks.get(key) ?? 0
      this.drawThread(stitch, false, depth)
      stacks.set(key, depth + 1)
    })
    if (anchor && target) this.drawThread({ id: 'preview', type: 'running', start: anchor, end: target, color, width: 3.8, order: Infinity, seed: 17 }, true)
    if (anchor) {
      const [x, y] = this.point(anchor)
      ctx.fillStyle = '#f8f2e4'; ctx.strokeStyle = shade(color, -30); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 5.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2); ctx.fill()
    }
    if (target) {
      const [x, y] = this.point(target)
      ctx.strokeStyle = 'rgba(70,52,39,.48)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(x - 12, y); ctx.lineTo(x - 5, y); ctx.moveTo(x + 5, y); ctx.lineTo(x + 12, y); ctx.stroke()
    }
    ctx.restore(); ctx.strokeStyle = 'rgba(255,255,255,.44)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(center, center, inner + 1, 0, Math.PI * 2); ctx.stroke()
  }
}
