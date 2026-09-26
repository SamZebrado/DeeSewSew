import { activeThreadSag, createActiveThread, retargetActiveThread, setActiveThreadSlack, stepActiveThread } from '../../src/active-thread'
import { looseThreadPath } from '../../src/thread-path'
import { PressureGesture, pressureSlackScale } from '../../src/pressure-input'

const canvas = document.querySelector<HTMLCanvasElement>('#preview')!
const context = canvas.getContext('2d')!
const slider = document.querySelector<HTMLInputElement>('#synthetic')!
const status = document.querySelector<HTMLOutputElement>('#status')!
const anchor = { x: .18, y: .43 }
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
let state = createActiveThread(anchor, { x: .8, y: .55 }, { reducedMotion: reducedMotion.matches })
let owner: number | null = null
const pressure = new PressureGesture()
let frame: number | null = null
let lastFrame: number | null = null
let stillFrames = 0
function wake(): void {
  stillFrames = 0
  if (frame === null && !document.hidden) frame = requestAnimationFrame(draw)
}
const point = (event: PointerEvent) => {
  const rect = canvas.getBoundingClientRect()
  return { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height }
}
function sample(event: PointerEvent): void {
  pressure.move(event.pointerId, event)
  state = retargetActiveThread(state, point(event))
  state = setActiveThreadSlack(state, pressureSlackScale(pressure.strength))
  status.value = pressure.hasNonDefaultPenSample ? `Pen sample: ${pressure.strength.toFixed(2)}` : 'Neutral pressure fallback'
  wake()
}
canvas.addEventListener('pointerdown', event => {
  if (owner !== null || event.button !== 0) return
  owner = event.pointerId
  pressure.begin(owner, event)
  canvas.setPointerCapture(owner)
  sample(event)
})
canvas.addEventListener('pointermove', event => {
  if (event.pointerId !== owner) return
  const coalesced = event.getCoalescedEvents?.() ?? []
  for (const sampleEvent of coalesced) sample(sampleEvent)
  sample(event)
})
canvas.addEventListener('pointerup', event => {
  if (event.pointerId !== owner) return
  pressure.end(owner)
  owner = null
  wake()
})
function cancel(): void {
  owner = null
  pressure.cancel()
  state = setActiveThreadSlack(state, 1)
  status.value = 'Neutral pressure fallback'
  wake()
}
canvas.addEventListener('pointercancel', event => { if (event.pointerId === owner) cancel() })
canvas.addEventListener('lostpointercapture', event => { if (event.pointerId === owner) cancel() })
window.addEventListener('blur', cancel)
reducedMotion.addEventListener('change', event => { state = { ...state, reducedMotion: event.matches }; wake() })
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { cancel(); if (frame !== null) cancelAnimationFrame(frame); frame = null; lastFrame = null }
  else wake()
})
slider.addEventListener('input', () => {
  const value = Number(slider.value) / 100
  state = setActiveThreadSlack(state, pressureSlackScale(value))
  status.value = `Synthetic: ${value.toFixed(2)}`
  wake()
})
function draw(now: number): void {
  frame = null
  const elapsed = lastFrame === null ? 1000 / 60 : now - lastFrame
  lastFrame = now
  const before = state.points.map(p => ({ ...p }))
  state = stepActiveThread(state, elapsed)
  canvas.dataset.sag = activeThreadSag(state.points, state.anchor, state.target).toFixed(6)
  canvas.dataset.slackScale = String(state.slackScale ?? 1)
  canvas.dataset.reducedMotion = String(state.reducedMotion)
  const movement = state.points.reduce((maximum, p, i) => Math.max(maximum, Math.hypot(p.x - before[i]!.x, p.y - before[i]!.y)), 0)
  stillFrames = movement < .000025 ? stillFrames + 1 : 0
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.strokeStyle = '#9e492d'; context.lineWidth = 5; context.lineCap = 'round'
  context.beginPath()
  const curves = looseThreadPath(state.points)
  if (curves.length) {
    context.moveTo(curves[0]![0].x * canvas.width, curves[0]![0].y * canvas.height)
    for (const [, a, b, end] of curves) context.bezierCurveTo(
      a.x * canvas.width, a.y * canvas.height,
      b.x * canvas.width, b.y * canvas.height,
      end.x * canvas.width, end.y * canvas.height)
  }
  context.stroke()
  for (const p of [state.anchor, state.target]) { context.beginPath(); context.arc(p.x * canvas.width, p.y * canvas.height, 7, 0, Math.PI * 2); context.fillStyle = '#42362e'; context.fill() }
  if (stillFrames < 14) frame = requestAnimationFrame(draw)
  else lastFrame = null
}
wake()
