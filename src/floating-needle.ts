import type { NeedlePose } from './needle-pose'
import type { NormalizedPoint } from './stitch-model'
import { looseThreadPath } from './thread-path'
import { drawNeedleVisual } from './needle-visual'
/** Screen-space presentation only. Never receives canonical mutation callbacks. */
export class FloatingNeedle {
  private canvas = document.createElement('canvas')
  constructor() {
    this.canvas.id = 'floating-needle'
    this.canvas.setAttribute('aria-hidden', 'true')
    this.canvas.hidden = true
    document.body.append(this.canvas)
  }
  hide(): void { this.canvas.hidden = true }
  draw(pose: NeedlePose, points: readonly NormalizedPoint[], color: string, project: (point: NormalizedPoint) => NormalizedPoint, size: number): void {
    this.canvas.hidden = false
    if (this.canvas.width !== innerWidth || this.canvas.height !== innerHeight) { this.canvas.width = innerWidth; this.canvas.height = innerHeight }
    const ctx = this.canvas.getContext('2d')!
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = color; ctx.lineWidth = 3.8 * size / 640
    const curves = looseThreadPath(points)
    if (curves.length) {
      const first = project(curves[0]![0]); ctx.beginPath(); ctx.moveTo(first.x, first.y)
      for (const curve of curves) {
        const [a, b, end] = curve.slice(1).map(project)
        ctx.bezierCurveTo(a!.x, a!.y, b!.x, b!.y, end!.x, end!.y)
      }
      ctx.stroke()
    }
    const tip = project(pose.tip), tail = project(pose.tail), eye = project(pose.eye)
    drawNeedleVisual(ctx, tip, eye, tail, [tip, tail], true, color, size / 640)
  }
}
