import './style.css'
import { EmbroideryRenderer, type StitchMotion } from './renderer'
import { FABRIC_RADIUS, type NormalizedPoint, type Stitch, type StitchType } from './stitch-model'
import { makeVisualScene } from './visual-scenes'
import { MAX_CUSTOM_COLORS, addCustomColor, loadSettings, normalizeHexColor, saveSettings } from './settings'
import { HoopViewController, touchTargetOffset, type HoopViewSnapshot } from './hoop-view-controller'
import { inverseProjectFabricPoint } from './fabric-projection'
import {
  canPuncture, clearTopology, commitPuncture, createTopologyHistory, loadEmbroideryPiece,
  migrateLegacyPiece, punctureFabric, redoTopology, saveEmbroideryPiece, topologyRenderItems,
  undoTopology, type SurfaceSide,
} from './embroidery-topology'
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
        <div class="hoop-shell" id="hoop-shell" data-view-state="front" data-view-mode="manual" data-needle-side="front" role="group" tabindex="0" aria-label="Embroidery hoop view. Move the needle, click to puncture, use the rim or arrow keys to rotate, Home for front, and End for back.">
          <div class="hoop-rotator" id="hoop-rotator">${depthRings}
            <div class="hoop-face hoop-face-front"><canvas id="embroidery" aria-label="Front fabric inside an embroidery hoop"></canvas></div>
            <div class="hoop-face hoop-face-back" aria-hidden="true"><canvas id="embroidery-back"></canvas><span class="back-label">Reverse side</span></div>
          </div>
          <div class="hoop-interaction-layer" aria-hidden="true"></div>
        </div>
        <div class="needle-state" id="needle-state" aria-live="polite"><span class="needle-state-icon" aria-hidden="true">⌁</span><strong id="needle-side">Needle: front</strong><small id="edit-state">Front surface editable</small></div>
        <p class="canvas-help" id="canvas-help">Move the needle over the fabric and click to puncture. Rotate to the side holding the needle to continue.</p>
      </div>
      <aside class="tools" aria-label="Stitch controls">
        <section class="tool-group"><div class="tool-heading"><h2>Thread</h2><span id="color-name">${colorName(settings.selectedColor)}</span></div><div class="palette" id="palette" role="radiogroup" aria-label="Thread color">${colors.map(([name, value]) => swatchMarkup(name, value, settings.selectedColor === value)).join('')}${settings.customColors.map((value) => swatchMarkup(colorName(value), value, settings.selectedColor === value)).join('')}</div><div class="custom-color-row"><label class="color-picker" for="custom-color"><input id="custom-color" type="color" value="${settings.selectedColor}" aria-label="Choose a custom thread color"><span>Custom</span></label><button class="add-color-button" id="add-color" type="button">Add color</button></div></section>
        <section class="tool-group"><h2>Stitch routing</h2><div class="segmented" role="radiogroup" aria-label="Stitch type"><button class="selected" type="button" role="radio" aria-checked="true" data-stitch="running"><span class="stitch-icon">— —</span><span>Running</span></button><button type="button" role="radio" aria-checked="false" data-stitch="back"><span class="stitch-icon">——</span><span>Back</span></button></div></section>
        <section class="tool-group"><h2>View & motion</h2><div class="mode-controls">
          <button class="mode-control" id="rotate-view" type="button" aria-pressed="false" aria-controls="hoop-rotator"><span class="mode-icon" aria-hidden="true">↻</span><span class="mode-copy"><strong id="rotation-title">Auto rotate</strong><small id="rotation-copy">Slowly turn from the current angle</small></span><span class="switch-track" aria-hidden="true"><span></span></span></button>
          <button class="mode-control" id="motion-toggle" type="button" aria-pressed="${settings.motionEnabled && !reducedMotionQuery.matches}"><span class="mode-icon needle-icon" aria-hidden="true">⌁</span><span class="mode-copy"><strong>Stitch motion</strong><small>Needle puncture, pull, and settle</small></span><span class="switch-track" aria-hidden="true"><span></span></span></button>
        </div><div class="view-actions"><button class="soft-button" id="view-front" type="button">Return front</button><button class="soft-button" id="view-back" type="button">Snap back</button></div></section>
        <section class="tool-group history-group"><h2>Edit</h2><div class="edit-row"><button class="soft-button" id="undo" type="button" disabled aria-label="Undo last puncture">↶ <span>Undo</span></button><button class="soft-button" id="redo" type="button" disabled aria-label="Redo last puncture">↷ <span>Redo</span></button></div><button class="clear-button" id="clear" type="button" disabled>Clear fabric</button></section>
        <div class="quiet-tip" role="status" aria-live="polite" aria-atomic="true"><span aria-hidden="true">✦</span><p><strong id="status-title">Needle ready</strong><br><span id="status-copy">Move the front-side needle, then click to puncture.</span></p></div>
      </aside>
    </section>
  </main>`

const canvas = document.querySelector<HTMLCanvasElement>('#embroidery')!
const backCanvas = document.querySelector<HTMLCanvasElement>('#embroidery-back')!
const renderer = new EmbroideryRenderer(canvas, 'front')
const backRenderer = new EmbroideryRenderer(backCanvas, 'back')
let piece = loadEmbroideryPiece()
const scene = import.meta.env.DEV ? makeVisualScene(new URLSearchParams(location.search).get('scene') ?? '') : null
if (scene) piece = migrateLegacyPiece({ schemaVersion: 1, nextOrder: scene.length + 1, stitches: scene })
let history = createTopologyHistory(piece)
let frontItems: Stitch[] = []
let backItems: Stitch[] = []
let color: string = settings.selectedColor
let stitchType: StitchType = 'running'
let target: NormalizedPoint | null = null
let motion: StitchMotion | null = null
let motionSide: SurfaceSide | null = null
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
const needleSideLabel = document.querySelector<HTMLElement>('#needle-side')!
const editStateLabel = document.querySelector<HTMLElement>('#edit-state')!
const canvasHelp = document.querySelector<HTMLElement>('#canvas-help')!

function refreshRenderItems(): void {
  frontItems = topologyRenderItems(history.present, 'front')
  backItems = topologyRenderItems(history.present, 'back')
}
function pendingFor(side: SurfaceSide): [NormalizedPoint | null, NormalizedPoint | null] {
  return history.present.needle.side === side ? [history.present.needle.position, target] : [null, null]
}
function renderFront(): void { const [anchor, preview] = pendingFor('front'); renderer.render(frontItems, anchor, preview, color, motionSide === 'front' ? motion : null) }
function renderBack(): void { const [anchor, preview] = pendingFor('back'); backRenderer.render(backItems, anchor, preview, color, motionSide === 'back' ? motion : null) }
function updateHistoryControls(): void {
  undoButton.disabled = history.present.punctures.length === 0 && history.present.legacyFrontStitches.length === 0
  clearButton.disabled = undoButton.disabled
  redoButton.disabled = history.future.length === 0
}
function render(): void { renderFront(); renderBack(); updateHistoryControls() }
function announce(title: string, copy: string): void { statusTitle.textContent = title; statusCopy.textContent = copy }
function persist(): void { piece = history.present; saveEmbroideryPiece(piece) }
function setMotionDataset(state: 'idle' | 'off' | 'running', phase: string = state, progress = '0', side: SurfaceSide | null = null): void {
  for (const [surface, surfaceCanvas] of [['front', canvas], ['back', backCanvas]] as const) {
    surfaceCanvas.dataset.motionState = state === 'running' && surface !== side ? (motionIsActive() ? 'idle' : 'off') : state
    surfaceCanvas.dataset.motionPhase = state === 'running' && surface !== side ? (motionIsActive() ? 'idle' : 'off') : phase
    surfaceCanvas.dataset.motionProgress = state === 'running' && surface !== side ? '0' : progress
  }
}
function stopStitchMotion(redraw = false): void {
  if (motionFrame !== null) cancelAnimationFrame(motionFrame)
  motionFrame = null; motion = null; motionSide = null
  setMotionDataset(motionIsActive() ? 'idle' : 'off')
  if (redraw) render()
}
function resetTarget(redraw = true): void { target = null; if (redraw) render() }
function visibleSurface(view: HoopViewSnapshot): SurfaceSide | null { return view.face === 'front' || view.face === 'back' ? view.face : null }
function needleAvailable(view = viewController.snapshot()): boolean { return view.stitchable && visibleSurface(view) === history.present.needle.side }
function projectionGeometry() {
  const rect = hoopShell.getBoundingClientRect()
  const parsedPerspective = Number.parseFloat(getComputedStyle(hoopShell).perspective)
  return { centerX: rect.left + rect.width / 2, centerY: rect.top + rect.height / 2, size: Math.min(rect.width, rect.height), perspectivePx: Number.isFinite(parsedPerspective) ? parsedPerspective : Math.max(760, rect.width * 1.5) }
}
function pointerPoint(event: PointerEvent, requireAvailable = true): NormalizedPoint | null {
  const view = viewController.snapshot()
  if (requireAvailable && !needleAvailable(view)) return null
  const rect = hoopShell.getBoundingClientRect()
  const offset = event.pointerType === 'touch' ? touchTargetOffset(event.clientX, event.clientY, rect, FABRIC_RADIUS) : 0
  return inverseProjectFabricPoint(event.clientX, event.clientY - offset, view, projectionGeometry())
}
function startStitchMotion(stitch: Stitch, side: SurfaceSide): void {
  stopStitchMotion(false); updateHistoryControls()
  if (!motionIsActive()) { setMotionDataset('off'); render(); return }
  const startedAt = performance.now(); motionSide = side; setMotionDataset('running', 'emerge', '0', side)
  const tick = (now: number) => {
    const sample = sampleStitchMotion(now - startedAt)
    motion = { stitchId: stitch.id, progress: sample.progress, sample }
    setMotionDataset('running', sample.phase, sample.progress.toFixed(3), side); render()
    if (sample.elapsedMs < STITCH_MOTION_DURATION_MS) motionFrame = requestAnimationFrame(tick)
    else { motionFrame = null; motion = null; motionSide = null; setMotionDataset('idle', 'idle', '1'); render() }
  }
  motionFrame = requestAnimationFrame(tick)
}

function syncMotionControl(): void {
  const active = motionIsActive(); motionButton.disabled = reducedMotionQuery.matches
  motionButton.setAttribute('aria-pressed', String(active)); motionButton.classList.toggle('active', active)
  motionButton.querySelector('small')!.textContent = reducedMotionQuery.matches ? 'Off while Reduce Motion is on' : 'Needle puncture, pull, and settle'
  setMotionDataset(active ? 'idle' : 'off')
}
function stopViewLoop(): void { if (viewFrame !== null) cancelAnimationFrame(viewFrame); viewFrame = null }
function viewStateName(): string {
  const view = viewController.snapshot()
  if (view.mode === 'auto') return 'rotating'
  if (view.alignedFace) return view.alignedFace
  return view.face === 'edge' ? 'edge' : 'angled'
}
function syncViewControl(): void {
  const view = viewController.snapshot(); const surface = visibleSurface(view); const available = needleAvailable(view)
  hoopRotator.style.transform = `rotateX(${view.pitchDeg.toFixed(3)}deg) rotateY(${view.yawDeg.toFixed(3)}deg)`
  hoopShell.dataset.viewState = viewStateName(); hoopShell.dataset.viewMode = view.mode; hoopShell.dataset.alignedFace = view.alignedFace ?? 'none'
  hoopShell.dataset.visibleSide = surface ?? 'edge'; hoopShell.dataset.needleSide = history.present.needle.side; hoopShell.dataset.interactionState = view.interactionState; hoopShell.dataset.needleAvailable = String(available)
  hoopShell.dataset.yaw = view.yawDeg.toFixed(3); hoopShell.dataset.pitch = view.pitchDeg.toFixed(3)
  hoopShell.classList.toggle('is-rotating', view.mode === 'auto'); hoopShell.classList.toggle('is-dragging', view.gestureActive); hoopShell.classList.toggle('is-inspect-only', view.interactionState === 'inspect-only'); hoopShell.classList.toggle('is-limited', view.interactionState === 'limited'); hoopShell.classList.toggle('needle-opposite', Boolean(surface && surface !== history.present.needle.side))
  canvas.setAttribute('aria-disabled', String(!(available && history.present.needle.side === 'front'))); backCanvas.setAttribute('aria-disabled', String(!(available && history.present.needle.side === 'back')))
  needleSideLabel.textContent = `Needle: ${history.present.needle.side}`
  editStateLabel.textContent = view.mode === 'auto' ? 'Rotating — puncture paused' : view.interactionState === 'inspect-only' ? 'Inspect only — projection too shallow' : available ? `${surface === 'back' ? 'Reverse' : 'Front'} surface ${view.interactionState}` : surface ? `Needle is on the ${history.present.needle.side}` : 'Near edge — inspect only'
  canvasHelp.textContent = view.mode === 'auto' ? 'Stop rotation to evaluate this angle for stitching.' : view.interactionState === 'inspect-only' ? 'This angle is too shallow for reliable puncture placement. Rotate a little farther.' : available ? 'Move the needle over this surface and click to puncture. Drag the wooden rim to rotate.' : `The needle remains on the ${history.present.needle.side}. Rotate to that surface to continue.`
  rotateButton.disabled = reducedMotionQuery.matches; rotateButton.setAttribute('aria-pressed', String(view.mode === 'auto')); rotateButton.classList.toggle('active', view.mode === 'auto')
  document.querySelector('#rotation-title')!.textContent = view.mode === 'auto' ? 'Stop rotation' : 'Auto rotate'
  document.querySelector('#rotation-copy')!.textContent = reducedMotionQuery.matches ? 'Unavailable while Reduce Motion is on' : view.mode === 'auto' ? 'Freeze at the current angle' : 'Slowly turn from the current angle'
  frontButton.disabled = view.mode === 'manual' && view.frontAligned && !view.gestureActive; backButton.disabled = view.mode === 'manual' && view.backAligned && !view.gestureActive
}
function runViewFrame(now: number): void { viewFrame = null; viewController.tick(now); syncViewControl(); if (viewController.snapshot().mode === 'auto') viewFrame = requestAnimationFrame(runViewFrame) }
function ensureViewLoop(): void { if (viewFrame === null && viewController.snapshot().mode === 'auto') viewFrame = requestAnimationFrame(runViewFrame) }
function announceViewPosition(prefix = 'View stopped'): void {
  const view = viewController.snapshot(); const surface = visibleSurface(view)
  if (view.interactionState === 'inspect-only') announce('Inspect-only angle', 'Projection is too shallow for reliable puncture placement. Rotate toward either face.')
  else if (surface !== history.present.needle.side) announce('Needle on opposite side', `The needle remains on the ${history.present.needle.side}. Rotate there to continue.`)
  else announce(prefix === 'View stopped' ? 'Needle ready' : prefix, `${surface === 'back' ? 'Reverse' : 'Front'} surface is ${view.interactionState} and ready to puncture.`)
}

function selectColor(nextColor: string): void {
  const normalized = normalizeHexColor(nextColor); if (!normalized) return
  const selected = palette.querySelector<HTMLButtonElement>(`.swatch[data-color="${normalized}"]`); if (!selected) return
  palette.querySelectorAll<HTMLElement>('.swatch').forEach((item) => { item.classList.remove('selected'); item.setAttribute('aria-checked', 'false') })
  selected.classList.add('selected'); selected.setAttribute('aria-checked', 'true'); color = normalized; settings = { ...settings, selectedColor: normalized }; saveSettings(settings)
  customColorInput.value = normalized; document.querySelector('#color-name')!.textContent = colorName(normalized); render()
}
function appendCustomSwatch(value: string): void {
  const button = document.createElement('button'); button.className = 'swatch'; button.type = 'button'; button.setAttribute('role', 'radio'); button.setAttribute('aria-checked', 'false')
  button.setAttribute('aria-label', colorName(value)); button.dataset.color = value; button.dataset.name = colorName(value); button.style.setProperty('--swatch', value); button.innerHTML = '<span></span>'; palette.append(button)
}
function releaseHoopPointer(pointerId: number): void { if (hoopShell.hasPointerCapture(pointerId)) hoopShell.releasePointerCapture(pointerId) }

hoopShell.addEventListener('pointerdown', (event) => {
  if (!event.isPrimary || event.button !== 0 || stitchPointerId !== null || viewController.snapshot().gestureActive) return
  viewController.tick(performance.now()); const point = pointerPoint(event)
  if (needleAvailable() && point) { stopStitchMotion(false); stitchPointerId = event.pointerId; hoopShell.setPointerCapture(event.pointerId); target = point; render(); return }
  stopViewLoop(); resetTarget(false)
  if (!viewController.beginGesture(event.pointerId, event.clientX, event.clientY)) return
  hoopShell.setPointerCapture(event.pointerId); syncViewControl(); render()
})
hoopShell.addEventListener('pointermove', (event) => {
  if (!event.isPrimary) return
  if (viewController.snapshot().gestureActive) {
    const rect = hoopShell.getBoundingClientRect()
    if (viewController.updateGesture(event.pointerId, event.clientX, event.clientY, Math.max(1, Math.min(rect.width, rect.height)))) { syncViewControl(); render() }
    return
  }
  if (stitchPointerId !== null && stitchPointerId !== event.pointerId) return
  const next = pointerPoint(event)
  if (next) { target = next; render() } else if (target && stitchPointerId === null) resetTarget()
})
hoopShell.addEventListener('pointerup', (event) => {
  if (viewController.endGesture(event.pointerId)) { releaseHoopPointer(event.pointerId); syncViewControl(); announceViewPosition('View adjusted'); render(); return }
  if (stitchPointerId !== event.pointerId) return
  stitchPointerId = null; releaseHoopPointer(event.pointerId); const point = pointerPoint(event)
  if (!point) { resetTarget(); return }
  const previousPosition = history.present.needle.position
  if (previousPosition && Math.hypot(point.x - previousPosition.x, point.y - previousPosition.y) < .018) { announce('A little farther', 'Move the needle tip before puncturing again.'); return }
  if (!canPuncture(history.present)) { resetTarget(false); announce('Fabric full', 'This piece has reached its local segment limit. Undo or clear before adding more.'); render(); return }
  const result = punctureFabric(history.present, point, { type: stitchType, color }); const motionSurface = result.puncture.fromSide
  history = commitPuncture(history, result); target = null; refreshRenderItems(); persist(); syncViewControl()
  const motionId = result.segment?.id ?? `${result.puncture.id}-${motionSurface}-hole`
  const motionItem = (motionSurface === 'front' ? frontItems : backItems).find((item) => item.id === motionId)
  announce('Needle passed through', `Needle is now on the ${history.present.needle.side}. Rotate there to continue the same thread.`)
  if (motionItem) startStitchMotion(motionItem, motionSurface); else render()
})
hoopShell.addEventListener('pointercancel', (event) => {
  if (viewController.cancelGesture(event.pointerId)) { syncViewControl(); announceViewPosition('View gesture cancelled'); render(); return }
  if (stitchPointerId === event.pointerId) { stitchPointerId = null; releaseHoopPointer(event.pointerId); resetTarget() }
})
hoopShell.addEventListener('lostpointercapture', (event) => {
  if (viewController.cancelGesture(event.pointerId)) { syncViewControl(); announceViewPosition('View gesture cancelled'); render() }
  if (stitchPointerId === event.pointerId) { stitchPointerId = null; resetTarget() }
})
canvas.addEventListener('contextmenu', (event) => { event.preventDefault(); resetTarget() })

palette.addEventListener('click', (event) => { const button = (event.target as Element).closest<HTMLButtonElement>('.swatch'); if (button?.dataset.color) selectColor(button.dataset.color) })
addColorButton.addEventListener('click', () => {
  const nextColor = normalizeHexColor(customColorInput.value); if (!nextColor) return
  const existing = palette.querySelector<HTMLButtonElement>(`.swatch[data-color="${nextColor}"]`)
  if (existing) { selectColor(nextColor); announce('Color selected', `${colorName(nextColor)} is ready to stitch.`); return }
  if (settings.customColors.length >= MAX_CUSTOM_COLORS) { announce('Custom palette full', `You can keep up to ${MAX_CUSTOM_COLORS} custom thread colors on this device.`); return }
  settings = addCustomColor(settings, nextColor); appendCustomSwatch(nextColor); saveSettings(settings); selectColor(nextColor); announce('Custom color added', `${colorName(nextColor)} is now in your thread palette.`)
})
document.querySelectorAll<HTMLButtonElement>('[data-stitch]').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('[data-stitch]').forEach((item) => { item.classList.remove('selected'); item.setAttribute('aria-checked', 'false') })
  button.classList.add('selected'); button.setAttribute('aria-checked', 'true'); stitchType = button.dataset.stitch as StitchType; announce('Routing changed', `${button.textContent?.trim()} routing will shape the next surface segment.`)
}))
rotateButton.addEventListener('click', () => {
  if (viewController.snapshot().mode === 'auto') { viewController.stopAuto(); stopViewLoop(); syncViewControl(); announceViewPosition('Rotation paused'); render(); return }
  resetTarget(false)
  if (viewController.startAuto(performance.now())) { syncViewControl(); ensureViewLoop(); render(); announce('3D view rotating', 'Puncture is paused while the hoop turns. Stop anywhere to evaluate the angle.') }
})
frontButton.addEventListener('click', () => { stopViewLoop(); resetTarget(false); viewController.snapFront(); syncViewControl(); announceViewPosition(); render() })
backButton.addEventListener('click', () => { stopViewLoop(); resetTarget(false); viewController.snapBack(); syncViewControl(); announceViewPosition(); render() })
motionButton.addEventListener('click', () => {
  settings = { ...settings, motionEnabled: !settings.motionEnabled }; saveSettings(settings); stopStitchMotion(false); syncMotionControl(); render()
  announce(settings.motionEnabled ? 'Stitch motion on' : 'Stitch motion off', settings.motionEnabled ? 'Punctures will show needle pressure, pull, and settling.' : 'Topology still commits immediately without motion.')
})
undoButton.addEventListener('click', () => { stopStitchMotion(false); history = undoTopology(history); target = null; refreshRenderItems(); persist(); syncViewControl(); render(); announce('Puncture undone', `Needle restored to the ${history.present.needle.side}.`) })
redoButton.addEventListener('click', () => { stopStitchMotion(false); history = redoTopology(history); target = null; refreshRenderItems(); persist(); syncViewControl(); render(); announce('Puncture restored', `Needle is on the ${history.present.needle.side}.`) })
clearButton.addEventListener('click', () => {
  if (clearButton.disabled || !window.confirm('Clear every puncture and thread segment from this fabric?')) return
  stopStitchMotion(false); history = clearTopology(history); target = null; refreshRenderItems(); persist(); syncViewControl(); render(); announce('Fabric cleared', 'Needle reset to the front surface.')
})
hoopShell.addEventListener('keydown', (event) => {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return
  event.preventDefault(); stopViewLoop(); resetTarget(false)
  if (viewController.handleKey(event.key)) { syncViewControl(); announceViewPosition('View adjusted'); render() }
})
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    if (viewController.snapshot().mode === 'auto') { viewController.stopAuto(); stopViewLoop(); syncViewControl(); announceViewPosition('Rotation paused'); render() }
    else { resetTarget(); announceViewPosition('Needle reset') }
  }
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); event.shiftKey ? redoButton.click() : undoButton.click() }
})
reducedMotionQuery.addEventListener('change', () => { stopStitchMotion(false); stopViewLoop(); viewController.setReducedMotion(reducedMotionQuery.matches); syncMotionControl(); syncViewControl(); render() })
renderer.onResize = renderFront; backRenderer.onResize = renderBack
refreshRenderItems(); syncMotionControl(); syncViewControl(); render()

if ('serviceWorker' in navigator && import.meta.env.PROD) window.addEventListener('load', () => navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL }))
