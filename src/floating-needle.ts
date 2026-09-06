import type { NeedlePose } from './needle-pose'
import type { NormalizedPoint } from './stitch-model'
import { looseThreadPath } from './thread-path'
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
    ctx.shadowColor = 'rgba(45,34,27,.25)'; ctx.shadowBlur = 3
    const metal = ctx.createLinearGradient(tip.x, tip.y, tail.x + .01, tail.y + .01)
    metal.addColorStop(0, '#858c8c'); metal.addColorStop(.5, '#f9ffff'); metal.addColorStop(1, '#858c8c')
    ctx.strokeStyle = metal; ctx.lineWidth = Math.max(1.4, 2.1 * size / 640)
    ctx.beginPath(); ctx.moveTo(tip.x, tip.y); ctx.lineTo(tail.x, tail.y); ctx.stroke()
    ctx.shadowColor = 'transparent'; ctx.fillStyle = color
    ctx.beginPath(); ctx.ellipse(eye.x, eye.y, Math.max(1.8, 3 * size / 640), Math.max(1.1, 1.6 * size / 640), Math.atan2(tail.y - tip.y, tail.x - tip.x), 0, 2 * Math.PI); ctx.fill()
  }
}
