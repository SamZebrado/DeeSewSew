import type { NormalizedPoint as Point } from './stitch-model'

/** One procedural visual for fabric and floating cursor. Coordinates are drawing
 * pixels; the caller retains ownership of projection, clipping and visibility. */
export function drawNeedleVisual(ctx: CanvasRenderingContext2D, tip: Point, eye: Point, tail: Point, shaft: readonly [Point, Point], eyeVisible: boolean, color: string, scale: number, focus = 1): void {
  const [a, b] = shaft
  ctx.save()
  ctx.lineCap = 'round'; ctx.lineWidth = Math.max(1.4, 2.1 * scale)
  ctx.shadowColor = 'rgba(45,34,27,.25)'; ctx.shadowBlur = Math.max(1, 3 * scale)
  const metal = ctx.createLinearGradient(a.x, a.y, b.x + .01, b.y + .01)
  metal.addColorStop(0, '#a5afb2'); metal.addColorStop(.22, '#e4edef'); metal.addColorStop(.46, '#ffffff'); metal.addColorStop(.64, '#b6c1c5'); metal.addColorStop(1, '#879296')
  ctx.strokeStyle = metal; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
  ctx.shadowColor = 'transparent'
  // A subpixel specular core retains the darker metal edge. The physical shaft
  // and its clipping remain unchanged; this is not a wider white silhouette.
  ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = Math.max(.45, .65 * scale)
  ctx.beginPath(); ctx.moveTo(a.x + (b.x - a.x) * .12, a.y + (b.y - a.y) * .12)
  ctx.lineTo(a.x + (b.x - a.x) * .72, a.y + (b.y - a.y) * .72); ctx.stroke()
  if (eyeVisible) {
    ctx.strokeStyle = '#929b9b'; ctx.fillStyle = color; ctx.lineWidth = .7 * scale
    ctx.beginPath(); ctx.ellipse(eye.x, eye.y, Math.max(1.3, 1.9 * scale), Math.max(.7, 1 * scale), Math.atan2(tail.y - tip.y, tail.x - tip.x), 0, Math.PI * 2); ctx.fill(); ctx.stroke()
  }
  // Only the real visible tip may carry the focus cue, never the clipped hole.
  if (focus > 0 && Math.hypot(a.x - tip.x, a.y - tip.y) < 1e-6) {
    ctx.globalAlpha = Math.min(1, focus)
    ctx.strokeStyle = 'rgba(155,74,72,.5)'; ctx.lineWidth = Math.max(1, 1.5 * scale)
    ctx.beginPath(); ctx.moveTo(tip.x, tip.y); ctx.lineTo(tip.x + (tail.x - tip.x) * .13, tip.y + (tail.y - tip.y) * .13); ctx.stroke()
    ctx.fillStyle = '#9B4A48'; ctx.beginPath(); ctx.arc(tip.x, tip.y, 1.25, 0, Math.PI * 2); ctx.fill()
  }
  ctx.restore()
}
