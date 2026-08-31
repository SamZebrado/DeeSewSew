import './style.css'
import { EmbroideryRenderer, type StitchMotion } from './renderer'
import { FABRIC_RADIUS, canAddStitch, createStitch, loadPiece, savePiece, type NormalizedPoint, type Piece, type Stitch, type StitchType } from './stitch-model'
import { clearHistory, commit, createHistory, redo, undo, type HistoryState } from './history'
import { makeVisualScene } from './visual-scenes'
import { MAX_CUSTOM_COLORS, addCustomColor, loadSettings, normalizeHexColor, saveSettings } from './settings'
import { HoopViewController, touchTargetOffset } from './hoop-view-controller'
import { STITCH_MOTION_DURATION_MS, sampleStitchMotion } from './stitch-motion'

const colors = [['Poppy', '#b9403c'], ['Coral', '#df735f'], ['Marigold', '#d49a2f'], ['Leaf', '#55765b'], ['Indigo', '#425f86'], ['Plum', '#74516f'], ['Walnut', '#765443'], ['Ink', '#363539'], ['Cream', '#e6d7b7']] as const
const builtInColorNames = new Map<string, string>(colors.map(([name, value]) => [value, name]))
const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
let settings = loadSettings(reducedMotionQuery.matches)
const availableColors = new Set([...colors.map(([, value]) => value), ...settings.customColors])
if (!availableColors.has(settings.selectedColor)) settings = { ...settings, selectedColor: colors[0][1] }

const colorName = (value: string): string => builtInColorNames.get(value) ?? `Custom ${value.toUpperCase()}`
const swatchMarkup = (name: string, value: string, selected: boolean): string => `<button class="swatch${selected ? ' selected' : ''}" type="button" role="radio" aria-checked="${selected}" aria-label="${name}" data-color="${value}" data-name="${name}" style="--swatch:${value}"><span></span></button>`
const depthRings = [-9, -6, -3, 0, 3, 6, 9].map((depth) => `<i class="hoop-depth-ring" aria-hidden="true" style="--hoop-depth:${depth}px"></i>`).join('')

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <main class="studio">
    <header class="masthead"><div><p class="eyebrow">A tiny embroidery studio in your browser</p><h1>DeeSewSew</h1></div><p class="save-state" id="save-state" aria-live="polite">Saved on this device</p></header>
    <section class="workspace" aria-label="Embroidery studio">
      <div class="hoop-stage">
        <div class="hoop-shell" id="hoop-shell" data-view-state="front" data-view-mode="manual" role="group" tabindex="0" aria-label="Embroidery hoop view. Use arrow keys to rotate, Home for front, and End for back.">
          <div class="hoop-rotator" id="hoop-rotator">
            ${depthRings}
            <div class="hoop-face hoop-face-front"><canvas id="embroidery" aria-label="Front fabric inside an embroidery hoop"></canvas></div>
            <div class="hoop-face hoop-face-back" aria-hidden="true"><canvas id="embroidery-back"></canvas><span class="back-label">Reverse side</span></div>
          </div>
        </div>
        <p class="canvas-help">Tap twice on the front fabric to stitch. Drag the wooden rim to inspect, or return to front before stitching.</p>
      </div>
      <aside class="tools" aria-label="Stitch controls">
        <section class="tool-group"><div class="tool-heading"><h2>Thread</h2><span id="color-name">${colorName(settings.selectedColor)}</span></div><div class="palette" id="palette" role="radiogroup" aria-label="Thread color">
          ${colors.map(([name, value]) => swatchMarkup(name, value, settings.selectedColor === value)).join('')}
          ${settings.customColors.map((value) => swatchMarkup(colorName(value), value, settings.selectedColor === value)).join('')}
        </div><div class="custom-color-row"><label class="color-picker" for="custom-color"><input id="custom-color" type="color" value="${settings.selectedColor}" aria-label="Choose a custom thread color"><span>Custom</span></label><button class="add-color-button" id="add-color" type="button">Add color</button></div></section>
        <section class="tool-group"><h2>Stitch</h2><div class="segmented" role="radiogroup" aria-label="Stitch type">
          <button class="selected" type="button" role="radio" aria-checked="true" data-stitch="running"><span class="stitch-icon">— —</span><span>Running</span></button>
          <button type="button" role="radio" aria-checked="false" data-stitch="back"><span class="stitch-icon">——</span><span>Back</span></button>
        </div></section>
        <section class="tool-group"><h2>View & motion</h2><div class="mode-controls">
          <button class="mode-control" id="rotate-view" type="button" aria-pressed="false" aria-controls="hoop-rotator"><span class="mode-icon" aria-hidden="true">↻</span><span class="mode-copy"><strong id="rotation-title">Auto rotate</strong><small id="rotation-copy">Slowly turn from the current angle</small></span><span class="switch-track" aria-hidden="true"><span></span></span></button>
          <button class="mode-control" id="motion-toggle" type="button" aria-pressed="${settings.motionEnabled && !reducedMotionQuery.matches}"><span class="mode-icon needle-icon" aria-hidden="true">⌁</span><span class="mode-copy"><strong>Stitch motion</strong><small>Needle out, pull, needle in</small></span><span class="switch-track" aria-hidden="true"><span></span></span></button>
        </div><div class="view-actions"><button class="soft-button" id="view-front" type="button">Return front</button><button class="soft-button" id="view-back" type="button">Snap back</button></div></section>
        <section class="tool-group history-group"><h2>Edit</h2><div class="edit-row"><button class="soft-button" id="undo" type="button" disabled aria-label="Undo last stitch">↶ <span>Undo</span></button><button class="soft-button" id="redo" type="button" disabled aria-label="Redo last stitch">↷ <span>Redo</span></button></div><button class="clear-button" id="clear" type="button" disabled>Clear fabric</button></section>
        <div class="quiet-tip" role="status" aria-live="polite" aria-atomic="true"><span aria-hidden="true">✦</span><p><strong id="status-title">Ready to stitch</strong><br><span id="status-copy">Place your first needle point inside the fabric.</span></p></div>
      </aside>
    </section>
  </main>`

const canvas = document.querySelector<HTMLCanvasElement>('#embroidery')!
const backCanvas = document.querySelector<HTMLCanvasElement>('#embroidery-back')!
const renderer = new EmbroideryRenderer(canvas, 'front')
const backRenderer = new EmbroideryRenderer(backCanvas, 'back')
let piece: Piece = loadPiece()
const scene = import.meta.env.DEV ? makeVisualScene(new URLSearchParams(location.search).get('scene') ?? '') : null
if (scene) piece = { schemaVersion: 1, nextOrder: scene.length + 1, stitches: scene }
let history: HistoryState<Piece['stitches'][number]> = createHistory(piece.stitches)
let color: string = settings.selectedColor
let stitchType: StitchType = 'running'
let anchor: NormalizedPoint | null = null
let target: NormalizedPoint | null = null
let motion: StitchMotion | null = null
let motionFrame: number | null = null
let viewFrame: number | null = null
let stitchPointerId: number | null = null
const viewController = new HoopViewController(reducedMotionQuery.matches)
const motionIsActive = (): boolean => settings.motionEnabled && !reducedMotionQuery.matches

const hoopShell = document.querySelector<HTMLElement>('#hoop-shell')!
const hoopRotator = document.querySelector<HTMLElement>('#hoop-rotator')!
const palette = document.querySelector<HTMLElement>('#palette')!
const customColorInput = document.querySelector<HTMLInputElement>('#custom-color')!
const addColorButton = document.querySelector<HTMLButtonElement>('#add-color')!
const rotateButton = document.querySelector<HTMLButtonElement>('#rotate-view')!
const frontButton = document.querySelector<HTMLButtonElement>('#view-front')!
const backButton = document.querySelector<HTMLButtonElement>('#view-back')!
const motionButton = document.querySelector<HTMLButtonElement>('#motion-toggle')!
const undoButton = document.querySelector<HTMLButtonElement>('#undo')!
const redoButton = document.querySelector<HTMLButtonElement>('#redo')!
const clearButton = document.querySelector<HTMLButtonElement>('#clear')!
const statusTitle = document.querySelector<HTMLElement>('#status-title')!
const statusCopy = document.querySelector<HTMLElement>('#status-copy')!

function renderFront(): void {
  renderer.render(history.present, anchor, target, color, motion)
}
function renderBack(): void {
  backRenderer.render(history.present, null, null, color)
}
function updateHistoryControls(): void {
  undoButton.disabled = history.present.length === 0
  clearButton.disabled = history.present.length === 0
  redoButton.disabled = history.future.length === 0
}
function render(redrawBack = false): void { renderFront(); if (redrawBack) renderBack(); updateHistoryControls() }
function announce(title: string, copy: string): void { statusTitle.textContent = title; statusCopy.textContent = copy }
function syncPiece(): void { piece = { ...piece, stitches: history.present } }
function persist(): void { syncPiece(); savePiece(piece) }
function stopStitchMotion(redraw = false): void {
  if (motionFrame !== null) cancelAnimationFrame(motionFrame)
  motionFrame = null; motion = null
  canvas.dataset.motionState = motionIsActive() ? 'idle' : 'off'
  canvas.dataset.motionPhase = motionIsActive() ? 'idle' : 'off'
  canvas.dataset.motionProgress = '0'
  if (redraw) render()
}
function cancelPending(redrawBack = false): void {
  stopStitchMotion(false); anchor = null; target = null
  announce('Ready to stitch', 'Place a needle point inside the fabric.'); render(redrawBack)
}
function clearPendingForView(): void {
  stopStitchMotion(false); anchor = null; target = null; render()
}
function pointerPoint(event: PointerEvent, requireStitchable = true): NormalizedPoint | null {
  if (requireStitchable && !viewController.snapshot().stitchable) return null
  const rect = canvas.getBoundingClientRect()
  const offset = event.pointerType === 'touch' ? touchTargetOffset(event.clientX, event.clientY, rect, FABRIC_RADIUS) : 0
  return renderer.toNormalized(event.clientX, event.clientY - offset)
}
function startStitchMotion(stitch: Stitch): void {
  stopStitchMotion(false)
  updateHistoryControls()
  renderBack()
  if (!motionIsActive()) { canvas.dataset.motionState = 'off'; canvas.dataset.motionPhase = 'off'; renderFront(); return }
  const startedAt = performance.now()
  canvas.dataset.motionState = 'running'
  canvas.dataset.motionPhase = 'emerge'
  canvas.dataset.motionProgress = '0'
  const tick = (now: number) => {
    const sample = sampleStitchMotion(now - startedAt)
    const progress = sample.progress
    motion = { stitchId: stitch.id, progress, sample }
    canvas.dataset.motionPhase = sample.phase
    canvas.dataset.motionProgress = progress.toFixed(3)
    renderer.render(history.present, anchor, target, color, motion)
    if (sample.elapsedMs < STITCH_MOTION_DURATION_MS) motionFrame = requestAnimationFrame(tick)
    else {
      motionFrame = null; motion = null
      canvas.dataset.motionState = 'idle'; canvas.dataset.motionPhase = 'idle'; canvas.dataset.motionProgress = '1'
      renderer.render(history.present, anchor, target, color)
    }
  }
  motionFrame = requestAnimationFrame(tick)
}

function syncMotionControl(): void {
  const active = motionIsActive()
  motionButton.disabled = reducedMotionQuery.matches
  motionButton.setAttribute('aria-pressed', String(active))
  motionButton.classList.toggle('active', active)
  motionButton.querySelector('small')!.textContent = reducedMotionQuery.matches ? 'Off while Reduce Motion is on' : 'Needle out, pull, needle in'
  canvas.dataset.motionState = active ? 'idle' : 'off'
  canvas.dataset.motionPhase = active ? 'idle' : 'off'
  canvas.dataset.motionProgress = '0'
}
function stopViewLoop(): void {
  if (viewFrame !== null) cancelAnimationFrame(viewFrame)
  viewFrame = null
}
function viewStateName(): string {
  const view = viewController.snapshot()
  if (view.mode === 'auto') return 'rotating'
  if (view.alignedFace) return view.alignedFace
  return view.face === 'edge' ? 'edge' : 'angled'
}
function syncViewControl(): void {
  const view = viewController.snapshot()
  const stateName = viewStateName()
  hoopRotator.style.transform = `rotateX(${view.pitchDeg.toFixed(3)}deg) rotateY(${view.yawDeg.toFixed(3)}deg)`
  hoopShell.dataset.viewState = stateName
  hoopShell.dataset.viewMode = view.mode
  hoopShell.dataset.alignedFace = view.alignedFace ?? 'none'
  hoopShell.dataset.yaw = view.yawDeg.toFixed(3)
  hoopShell.dataset.pitch = view.pitchDeg.toFixed(3)
  hoopShell.classList.toggle('is-rotating', view.mode === 'auto')
  hoopShell.classList.toggle('is-dragging', view.gestureActive)
  canvas.setAttribute('aria-disabled', String(!view.stitchable))
  rotateButton.disabled = reducedMotionQuery.matches
  rotateButton.setAttribute('aria-pressed', String(view.mode === 'auto'))
  rotateButton.classList.toggle('active', view.mode === 'auto')
  document.querySelector('#rotation-title')!.textContent = view.mode === 'auto' ? 'Stop rotation' : 'Auto rotate'
  document.querySelector('#rotation-copy')!.textContent = reducedMotionQuery.matches ? 'Unavailable while Reduce Motion is on' : view.mode === 'auto' ? 'Freeze at the current angle' : 'Slowly turn from the current angle'
  frontButton.disabled = view.mode === 'manual' && view.frontAligned && !view.gestureActive
  backButton.disabled = view.mode === 'manual' && view.backAligned && !view.gestureActive
}
function runViewFrame(now: number): void {
  viewFrame = null
  viewController.tick(now)
  syncViewControl()
  if (viewController.snapshot().mode === 'auto') viewFrame = requestAnimationFrame(runViewFrame)
}
function ensureViewLoop(): void {
  if (viewFrame === null && viewController.snapshot().mode === 'auto') viewFrame = requestAnimationFrame(runViewFrame)
}
function announceViewPosition(prefix = 'View stopped'): void {
  const view = viewController.snapshot()
  if (view.frontAligned) announce('Front view', 'The front fabric is aligned and ready to stitch.')
  else if (view.backAligned) announce('Reverse view', 'The reverse side is aligned for inspection. Return to front to stitch.')
  else if (view.face === 'edge') announce(prefix, 'The hoop is resting near its edge. Return to front to stitch.')
  else announce(prefix, `The hoop is resting on a ${view.face === 'front' ? 'front' : 'reverse'} angle. Return to front to stitch.`)
}

function selectColor(nextColor: string): void {
  const normalized = normalizeHexColor(nextColor)
  if (!normalized) return
  const selected = palette.querySelector<HTMLButtonElement>(`.swatch[data-color="${normalized}"]`)
  if (!selected) return
  palette.querySelectorAll<HTMLElement>('.swatch').forEach((item) => { item.classList.remove('selected'); item.setAttribute('aria-checked', 'false') })
  selected.classList.add('selected'); selected.setAttribute('aria-checked', 'true')
  color = normalized; settings = { ...settings, selectedColor: normalized }; saveSettings(settings)
  customColorInput.value = normalized
  document.querySelector('#color-name')!.textContent = colorName(normalized)
  render()
}
function appendCustomSwatch(value: string): void {
  const button = document.createElement('button')
  button.className = 'swatch'; button.type = 'button'; button.setAttribute('role', 'radio'); button.setAttribute('aria-checked', 'false')
  button.setAttribute('aria-label', colorName(value)); button.dataset.color = value; button.dataset.name = colorName(value)
  button.style.setProperty('--swatch', value); button.innerHTML = '<span></span>'; palette.append(button)
}

function releaseHoopPointer(pointerId: number): void {
  if (hoopShell.hasPointerCapture(pointerId)) hoopShell.releasePointerCapture(pointerId)
}
hoopShell.addEventListener('pointerdown', (event) => {
  if (!event.isPrimary || event.button !== 0) return
  if (stitchPointerId !== null || viewController.snapshot().gestureActive) return
  viewController.tick(performance.now())
  const point = pointerPoint(event)
  if (viewController.snapshot().stitchable && point) {
    stopStitchMotion(false); stitchPointerId = event.pointerId; hoopShell.setPointerCapture(event.pointerId); target = point; render(); return
  }
  stopViewLoop()
  if (!viewController.beginGesture(event.pointerId, event.clientX, event.clientY)) return
  stitchPointerId = null; clearPendingForView(); hoopShell.setPointerCapture(event.pointerId); syncViewControl()
})
hoopShell.addEventListener('pointermove', (event) => {
  if (!event.isPrimary) return
  if (viewController.snapshot().gestureActive) {
    const rect = hoopShell.getBoundingClientRect()
    if (viewController.updateGesture(event.pointerId, event.clientX, event.clientY, Math.max(1, Math.min(rect.width, rect.height)))) syncViewControl()
    return
  }
  if (stitchPointerId !== null && stitchPointerId !== event.pointerId) return
  const next = pointerPoint(event)
  if (next) { target = next; render() }
})
hoopShell.addEventListener('pointerup', (event) => {
  if (viewController.endGesture(event.pointerId)) {
    releaseHoopPointer(event.pointerId); syncViewControl(); announceViewPosition(); return
  }
  if (stitchPointerId !== event.pointerId) return
  stitchPointerId = null; releaseHoopPointer(event.pointerId)
  const point = pointerPoint(event); if (!point) return
  if (!anchor) { anchor = point; target = point; announce('Needle point placed', 'Move to preview the thread, then tap to settle the stitch.'); render(); return }
  if (Math.hypot(point.x - anchor.x, point.y - anchor.y) < .018) { announce('A little farther', 'Move the needle tip before settling this stitch.'); return }
  if (!canAddStitch(history.present.length)) {
    anchor = null; target = null
    announce('Fabric full', 'This piece has reached its local stitch limit. Undo or clear stitches before adding more.'); render(); return
  }
  const stitch = createStitch(piece, stitchType, anchor, point, color)
  history = commit(history, stitch); syncPiece(); anchor = point; target = point
  announce('Thread settled', 'Keep placing points, or press Escape to finish this line.'); persist(); startStitchMotion(stitch)
})
hoopShell.addEventListener('pointercancel', (event) => {
  if (viewController.cancelGesture(event.pointerId)) { syncViewControl(); announceViewPosition('View gesture cancelled'); return }
  if (stitchPointerId === event.pointerId) { stitchPointerId = null; cancelPending() }
})
hoopShell.addEventListener('lostpointercapture', (event) => {
  if (viewController.cancelGesture(event.pointerId)) { syncViewControl(); announceViewPosition('View gesture cancelled') }
  if (stitchPointerId === event.pointerId) { stitchPointerId = null; cancelPending() }
})
canvas.addEventListener('contextmenu', (event) => { event.preventDefault(); cancelPending() })

palette.addEventListener('click', (event) => {
  const button = (event.target as Element).closest<HTMLButtonElement>('.swatch')
  if (button?.dataset.color) selectColor(button.dataset.color)
})
addColorButton.addEventListener('click', () => {
  const nextColor = normalizeHexColor(customColorInput.value)
  if (!nextColor) return
  const existing = palette.querySelector<HTMLButtonElement>(`.swatch[data-color="${nextColor}"]`)
  if (existing) { selectColor(nextColor); announce('Color selected', `${colorName(nextColor)} is ready to stitch.`); return }
  if (settings.customColors.length >= MAX_CUSTOM_COLORS) { announce('Custom palette full', `You can keep up to ${MAX_CUSTOM_COLORS} custom thread colors on this device.`); return }
  settings = addCustomColor(settings, nextColor); appendCustomSwatch(nextColor); saveSettings(settings); selectColor(nextColor)
  announce('Custom color added', `${colorName(nextColor)} is now in your thread palette.`)
})
document.querySelectorAll<HTMLButtonElement>('[data-stitch]').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('[data-stitch]').forEach((item) => { item.classList.remove('selected'); item.setAttribute('aria-checked', 'false') })
  button.classList.add('selected'); button.setAttribute('aria-checked', 'true'); stitchType = button.dataset.stitch as StitchType; cancelPending()
}))
rotateButton.addEventListener('click', () => {
  if (viewController.snapshot().mode === 'auto') {
    viewController.stopAuto(); stopViewLoop(); syncViewControl(); announceViewPosition('Rotation paused'); return
  }
  clearPendingForView()
  if (viewController.startAuto(performance.now())) {
    syncViewControl(); ensureViewLoop(); announce('3D view rotating', 'The hoop is turning slowly from its current angle. Stop rotation to freeze it.')
  }
})
frontButton.addEventListener('click', () => {
  stopViewLoop(); clearPendingForView(); viewController.snapFront(); syncViewControl(); announceViewPosition()
})
backButton.addEventListener('click', () => {
  stopViewLoop(); clearPendingForView(); viewController.snapBack(); syncViewControl(); announceViewPosition()
})
motionButton.addEventListener('click', () => {
  settings = { ...settings, motionEnabled: !settings.motionEnabled }; saveSettings(settings)
  stopStitchMotion(false); syncMotionControl(); render()
  announce(settings.motionEnabled ? 'Stitch motion on' : 'Stitch motion off', settings.motionEnabled ? 'New stitches will show the needle out, pull, and needle in.' : 'New stitches will settle immediately without motion.')
})
undoButton.addEventListener('click', () => { history = undo(history); cancelPending(true); persist() })
redoButton.addEventListener('click', () => { history = redo(history); cancelPending(true); persist() })
clearButton.addEventListener('click', () => { if (!history.present.length || !window.confirm('Clear every stitch from this fabric?')) return; history = clearHistory(history); cancelPending(true); persist() })
hoopShell.addEventListener('keydown', (event) => {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return
  event.preventDefault(); stopViewLoop(); clearPendingForView()
  if (viewController.handleKey(event.key)) { syncViewControl(); announceViewPosition('View adjusted') }
})
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    if (viewController.snapshot().mode === 'auto') {
      viewController.stopAuto(); stopViewLoop(); syncViewControl(); announceViewPosition('Rotation paused')
    } else cancelPending()
  }
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); event.shiftKey ? redoButton.click() : undoButton.click() }
})
reducedMotionQuery.addEventListener('change', () => {
  stopStitchMotion(false); stopViewLoop(); viewController.setReducedMotion(reducedMotionQuery.matches)
  syncMotionControl(); syncViewControl(); render()
})
renderer.onResize = renderFront
backRenderer.onResize = renderBack
syncMotionControl(); syncViewControl(); render(true)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL }))
}
