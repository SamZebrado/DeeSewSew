import './style.css'
import { localize, locale, setText, switchLocale, t } from './i18n'
import { guideTargets, guidePattern, startGuide, guideStep, loadGuide, nearGuideTarget, saveGuide, type GuideSession } from './leaf-guide'
import { punctureGuideStep } from './guide-pattern'
import { FLOWER } from './flower-pattern'
import { TULIP_HEART_PATTERN } from './tulip-heart-pattern'
import { loadTulipGuide, saveTulipGuide, startTulipGuide, tulipGuideAction } from './tulip-heart-guide'
import { TouchRotation } from './touch-rotation'
import { EmbroideryRenderer, type StitchMotion, type TransientThreadVisual } from './renderer'
import { FABRIC_RADIUS, type NormalizedPoint, type Stitch, type StitchType } from './stitch-model'
import { makeVisualScene } from './visual-scenes'
import { MAX_CUSTOM_COLORS, addCustomColor, loadSettings, normalizeHexColor, saveSettings as writeSettings, type StudioSettings } from './settings'
import { HoopViewController, touchTargetOffset, type HoopViewSnapshot } from './hoop-view-controller'
import { inverseProjectFabricPoint, projectFabricPoint } from './fabric-projection'
import { FloatingNeedle } from './floating-needle'
import {
  canPuncture, createTopologyHistory,
  migrateLegacyPiece, type SurfaceSide,
} from './embroidery-topology'
import { activeThreadRun, adoptThreadRuns, emptyThreadRuns, punctureThreadRun } from './thread-runs'
import { createThreadHistory, commitThreadState, endHistoryThread, undoThreadHistory, redoThreadHistory, type ThreadRunHistory } from './thread-run-history'
import { parseThreadArtwork, serializeThreadArtwork } from './thread-run-storage'
import { createThreadPieceStorage as createPieceStorage } from './thread-piece-storage'
import { threadRunRenderItems } from './thread-run-render'
import { STITCH_MOTION_DURATION_MS, sampleStitchMotion, sampleStitchMotionProgress } from './stitch-motion'
import { downloadRecovery } from './piece-storage'
import { needlePassage, needlePose, type NeedlePose } from './needle-pose'
import { heldNeedlePose } from './held-needle'
import {
  activeThreadSag, activeThreadDeflection, createActiveThread, retargetActiveThread, resetActiveThreadClock, snapshotActiveThread, stepActiveThread,
  type ActiveThreadState,
} from './active-thread'

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
    <header class="masthead"><div><p class="eyebrow">A tiny embroidery studio in your browser.</p><h1>DeeSewSew</h1></div><div><p class="save-state" id="save-state" aria-live="polite">Not saved yet</p><button id="recovery-copy" type="button" hidden>Download recovery copy</button><button id="recovery-source" type="button" hidden>Download original stored data</button></div></header>
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
        <p class="canvas-help" id="canvas-help">Move the needle; the loose thread follows. Click to puncture, then choose where it emerges.</p>
        <p class="rotation-hint">Hold Shift and drag to rotate · Drag with two fingers to rotate</p>
      </div>
      <aside class="tools" aria-label="Stitch controls">
        <section class="tool-group"><div class="tool-heading"><h2>Thread</h2><span id="color-name">${colorName(settings.selectedColor)}</span></div><div class="palette" id="palette" role="radiogroup" aria-label="Thread color">${colors.map(([name, value]) => swatchMarkup(name, value, settings.selectedColor === value)).join('')}${settings.customColors.map((value) => swatchMarkup(colorName(value), value, settings.selectedColor === value)).join('')}</div><div class="custom-color-row"><label class="color-picker" for="custom-color"><input id="custom-color" type="color" value="${settings.selectedColor}" aria-label="Choose a custom thread color"><span>Custom</span></label><button class="add-color-button" id="add-color" type="button">Add color</button></div></section>
        <section class="tool-group"><h2>Stitch routing</h2><div class="segmented" role="radiogroup" aria-label="Stitch type"><button class="selected" type="button" role="radio" aria-checked="true" data-stitch="running"><span class="stitch-icon">— —</span><span>Running</span></button><button type="button" role="radio" aria-checked="false" data-stitch="back"><span class="stitch-icon">——</span><span>Back</span></button></div></section>
        <section class="tool-group"><h2>View & motion</h2><div class="mode-controls">
          <button class="mode-control" id="rotate-view" type="button" aria-pressed="false" aria-controls="hoop-rotator"><span class="mode-icon" aria-hidden="true">↻</span><span class="mode-copy"><strong id="rotation-title">Auto rotate</strong><small id="rotation-copy">Slowly turn from the current angle</small></span><span class="switch-track" aria-hidden="true"><span></span></span></button>
          <button class="mode-control" id="motion-toggle" type="button" aria-pressed="${settings.motionEnabled && !reducedMotionQuery.matches}"><span class="mode-icon needle-icon" aria-hidden="true">⌁</span><span class="mode-copy"><strong>Stitch motion</strong><small>Press, puncture, tighten, and settle</small></span><span class="switch-track" aria-hidden="true"><span></span></span></button>
        </div><div class="view-actions"><button class="soft-button" id="view-front" type="button">Return front</button><button class="soft-button" id="view-back" type="button">Snap back</button></div></section>
        <section class="tool-group history-group"><h2>Edit</h2><div class="edit-row"><button class="soft-button" id="undo" type="button" disabled aria-label="Undo last puncture">↶ <span>Undo</span></button><button class="soft-button" id="redo" type="button" disabled aria-label="Redo last puncture">↷ <span>Redo</span></button></div><button class="clear-button" id="clear" type="button" disabled>Clear fabric</button></section>
        <section class="tool-group"><h2>Artwork</h2><div class="edit-row"><button class="soft-button" id="export-artwork" type="button">Export</button><button class="soft-button" id="import-artwork" type="button">Import</button><input id="artwork-file" type="file" accept=".json,application/json" aria-label="Choose an artwork file" hidden></div><button class="soft-button" id="leaf-guide" type="button">Stitch a flower</button><p id="guide-copy" hidden></p></section>
        <div class="quiet-tip" role="status" aria-live="polite" aria-atomic="true"><span aria-hidden="true">✦</span><p><strong id="status-title">Needle ready</strong><br><span id="status-copy">Move the front-side needle, then click to puncture.</span></p></div>
      </aside>
    </section>
  </main>`

localize(document.querySelector('#app')!)
setText(document.querySelector('title')!, 'DeeSewSew — Tiny browser embroidery studio')
document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en'
const languageButton = document.createElement('button')
languageButton.id = 'language-toggle'; languageButton.type = 'button'
languageButton.textContent = locale === 'zh' ? 'English' : '中文'
document.querySelector('.masthead > div:last-child')!.prepend(languageButton)
languageButton.addEventListener('click', () => { switchLocale(); languageButton.textContent = locale === 'zh' ? 'English' : '中文' })
const canvas = document.querySelector<HTMLCanvasElement>('#embroidery')!
const backCanvas = document.querySelector<HTMLCanvasElement>('#embroidery-back')!
const renderer = new EmbroideryRenderer(canvas, 'front')
const backRenderer = new EmbroideryRenderer(backCanvas, 'back')
const pieceStorage = createPieceStorage()
let piece = pieceStorage.initial.piece
const scene = import.meta.env.DEV ? makeVisualScene(new URLSearchParams(location.search).get('scene') ?? '') : null
if (scene) piece = migrateLegacyPiece({ schemaVersion: 1, nextOrder: scene.length + 1, stitches: scene })
let runHistory = createThreadHistory(scene ? adoptThreadRuns(piece) : pieceStorage.initial.state)
// Existing geometry consumers retain an O(1) view of the canonical topology.
let history = createTopologyHistory(piece)
function syncThreadHistory(next: ThreadRunHistory): void { runHistory = next; history = createTopologyHistory(next.present.topology) }
function activeAnchor(): NormalizedPoint | null { return activeThreadRun(runHistory.present) ? history.present.needle.position : null }
let guide: GuideSession | null = loadGuide(piece,runHistory.present)
let guideIndex = guide ? guideStep(piece, guide,runHistory.present) ?? 0 : 0
let tulipGuide = guide ? null : loadTulipGuide(runHistory.present)
let tulipAction = tulipGuide ? tulipGuideAction(runHistory.present,tulipGuide) : null
let frontItems: Stitch[] = []
let backItems: Stitch[] = []
let color: string = activeThreadRun(runHistory.present)?.color
  ?? (activeThreadRun(runHistory.present) ? history.present.punctures.at(-1)?.color : undefined)
  ?? settings.selectedColor
let stitchType: StitchType = 'running'
let target: NormalizedPoint | null = history.present.needle.position ? { ...history.present.needle.position } : null
let hoverPose: NeedlePose | null = target ? needlePose(target) : null
let activeThread: ActiveThreadState | null = null
let activeThreadFrame: number | null = null
let activeThreadTimestamp: number | null = null
let activeThreadStillFrames = 0
let activeThreadLoopStarts = 0
let motion: StitchMotion | null = null
let motionSide: SurfaceSide | null = null
let motionFrame: number | null = null
let tailFrame: number | null = null
let tails: { side: SurfaceSide; visual: StitchMotion; startedAt: number; from: number }[] = []
let viewFrame: number | null = null
let stitchPointerId: number | null = null
let viewPointerId: number | null = null
const touchRotation = new TouchRotation()
const TOUCH_CAMERA_ID = -1
let shiftRotation = false
const viewController = new HoopViewController(reducedMotionQuery.matches)
const motionIsActive = (): boolean => settings.motionEnabled && !reducedMotionQuery.matches

const hoopShell = document.querySelector<HTMLElement>('#hoop-shell')!
const floatingNeedle = new FloatingNeedle()
let floating = false
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
const endThreadButton = document.createElement('button')
endThreadButton.id = 'end-thread'; endThreadButton.type = 'button'; endThreadButton.className = 'soft-button'
setText(endThreadButton, 'Cut thread'); clearButton.before(endThreadButton)
const statusTitle = document.querySelector<HTMLElement>('#status-title')!
const statusCopy = document.querySelector<HTMLElement>('#status-copy')!
const needleSideLabel = document.querySelector<HTMLElement>('#needle-side')!
const editStateLabel = document.querySelector<HTMLElement>('#edit-state')!
const canvasHelp = document.querySelector<HTMLElement>('#canvas-help')!
const guideButton = document.querySelector<HTMLButtonElement>('#leaf-guide')!
const guideCopy = document.querySelector<HTMLElement>('#guide-copy')!
const tulipButton=document.createElement('button')
tulipButton.id='tulip-heart-guide';tulipButton.type='button';tulipButton.className='soft-button'
setText(tulipButton,'Tulip & heart');guideButton.after(tulipButton)
const guideMarker = document.createElement('span')
guideMarker.id = 'guide-target'; guideMarker.setAttribute('aria-hidden', 'true'); guideMarker.hidden = true; hoopShell.append(guideMarker)
function refreshGuide(): void {
  tulipAction=tulipGuide?tulipGuideAction(runHistory.present,tulipGuide):null
  if(tulipGuide&&!tulipAction){tulipGuide=null;saveTulipGuide(null)}
  const step = guide ? guideStep(history.present, guide,runHistory.present) : null
  if (guide && step === null) { guide = null; saveGuide(null) }
  guideIndex = step ?? 0
  const total = guide ? guideTargets(guide).length : 0
  const guided = Boolean(guide && guideIndex < total || tulipAction && tulipAction.kind!=='done')
  palette.querySelectorAll<HTMLButtonElement>('button').forEach(button => { button.disabled = guided })
  customColorInput.disabled = guided; addColorButton.disabled = guided
  setText(guideButton, guide ? 'Exit guide' : FLOWER.entry)
  guideCopy.hidden = !guide
  if (guide) setText(guideCopy, guideIndex === total ? FLOWER.completion : `Flower step ${guideIndex + 1} of ${total}`)
  setText(tulipButton,tulipGuide?'Exit guide':'Tulip & heart')
  guideButton.disabled=!!tulipGuide;tulipButton.disabled=!!guide
  updateTulipCopy()
}
function updateTulipCopy():void {
  if(!tulipAction)return
  guideCopy.hidden=false
  const a=tulipAction
  const text=a.kind==='done'?'Tulip and heart complete':a.kind==='cut'?'Cut thread to continue'
    :visibleSurface(viewController.snapshot())!==a.side?(a.side==='back'?'Flip to the back for the heart':'Return to the front for the tulip')
    :a.kind==='start'?'Start a new thread at the highlighted point':'Puncture the highlighted point, then cut'
  setText(guideCopy,text)
  hoopShell.dataset.tulipAction=a.kind;hoopShell.dataset.tulipStep=String(a.index)
}
tulipButton.addEventListener('click',()=>{
  cancelNeedleInteraction(false)
  tulipGuide=tulipGuide?null:startTulipGuide(runHistory.present)
  if(tulipGuide){
    const guideColor=TULIP_HEART_PATTERN.runs[0]!.color
    if(!palette.querySelector(`.swatch[data-color="${guideColor}"]`))appendCustomSwatch(guideColor)
    selectColor(guideColor,false)
  }
  saveTulipGuide(tulipGuide);refreshGuide();render()
})
guideButton.addEventListener('click', () => {
  if (guide) { guide = null; announce('Guide paused', 'Your stitches remain on the fabric.') }
  else { guide = startGuide(history.present, color); announce(FLOWER.entry, 'Follow the next highlighted point. Existing stitches stay when you exit.') }
  saveGuide(guide); refreshGuide(); render()
})

function refreshRenderItems(): void {
  refreshGuide()
  frontItems = threadRunRenderItems(runHistory.present, 'front')
  backItems = threadRunRenderItems(runHistory.present, 'back')
}
function pendingFor(side: SurfaceSide): [NormalizedPoint | null, NormalizedPoint | null] {
  if (floating || motion?.capturedPose) return [null, null]
  return history.present.needle.side === side ? [activeAnchor(), target] : [null, null]
}
function transientFor(side: SurfaceSide): TransientThreadVisual | undefined {
  if (floating) return { needleVisible: false }
  const view = viewController.snapshot()
  const surface = visibleSurface(view)
  if (motion?.capturedPose) return { passage: { sample: needlePassage(motion.capturedPose, motion.progress), destination: side !== motionSide }, needleVisible: false }
  if (history.present.needle.side === side) {
    return { points: activeThread?.points, needleVisible: true, pose: hoverPose ?? undefined }
  }
  if (surface === side && target && view.stitchable) return { emergenceTarget: target, needleVisible: false }
  return undefined
}
const lastFaceInputs: Record<SurfaceSide, readonly unknown[] | null> = { front: null, back: null }
function renderFace(side: SurfaceSide): void {
  const items = side === 'front' ? frontItems : backItems
  const [anchor, preview] = pendingFor(side), transient = transientFor(side)
  const faceMotion = motionSide === side ? motion : null
  const faceTails = tails.filter(tail => tail.side === side).map(tail => tail.visual)
  const inputs = [items, anchor, preview, color, faceMotion, transient?.points, transient?.pose,
    transient?.needleVisible, transient?.emergenceTarget, transient?.passage ? motion : null, ...faceTails]
  const previous = lastFaceInputs[side]
  if (previous?.length === inputs.length && inputs.every((value, i) => value === previous[i])) return
  ;(side === 'front' ? renderer : backRenderer).render(items, anchor, preview, color, faceMotion, transient, faceTails)
  lastFaceInputs[side] = inputs
}
function renderFront(): void { renderFace('front') }
function renderBack(): void { renderFace('back') }
function updateHistoryControls(): void {
  undoButton.disabled = history.present.punctures.length === 0 && history.present.legacyFrontStitches.length === 0
  clearButton.disabled = undoButton.disabled
  redoButton.disabled = runHistory.future.length === 0
  endThreadButton.disabled = !activeThreadRun(runHistory.present) || history.present.nextOrder>=999_999_999
    || !!(guide && guideIndex < guideTargets(guide).length) || !!(tulipAction && tulipAction.kind!=='cut' && tulipAction.kind!=='done')
}
function render(): void {
  updateTulipCopy()
  const nextGuide = guide ? guideTargets(guide)[guideIndex] : tulipAction && 'target' in tulipAction
    && visibleSurface(viewController.snapshot())===tulipAction.side ? tulipAction.target : undefined
  guideMarker.hidden = !nextGuide || !targetMode()
  if (nextGuide && !guideMarker.hidden) {
    const geometry = projectionGeometry(), p = projectFabricPoint(nextGuide, viewController.snapshot(), geometry)
    if (p) { guideMarker.style.left = `${p.clientX - geometry.centerX + geometry.size / 2}px`; guideMarker.style.top = `${p.clientY - geometry.centerY + geometry.size / 2}px` }
    else guideMarker.hidden = true
  }
  if (!needleAvailable() || motion) floating = false
  if (floating && hoverPose) {
    const geometry = projectionGeometry(), view = viewController.snapshot()
    floatingNeedle.draw(hoverPose, activeThread?.points ?? [], color, point => {
      const projected = projectFabricPoint(point, view, geometry)
      return projected ? { x: projected.clientX, y: projected.clientY } : { x: -1000, y: -1000 }
    }, geometry.size)
  } else floatingNeedle.hide()
  const mode = targetMode()
  const pointCount = activeThread?.points.length ?? 0
  const sag = activeThread ? activeThreadSag(activeThread.points, activeThread.anchor, activeThread.target) : 0
  hoopShell.dataset.targetMode = mode ?? 'blocked'
  hoopShell.dataset.activeThreadPoints = String(pointCount)
  hoopShell.dataset.activeThreadSag = sag.toFixed(5)
  hoopShell.dataset.activeThreadDeflection = String(activeThread ? activeThreadDeflection(activeThread.points, activeThread.anchor, activeThread.target) : 0)
  hoopShell.dataset.activeThreadLoopStarts = String(activeThreadLoopStarts)
  hoopShell.dataset.threadEyeX = String(activeThread?.points.at(-1)?.x ?? '')
  hoopShell.dataset.threadEyeY = String(activeThread?.points.at(-1)?.y ?? '')
  hoopShell.dataset.tailTransitions = String(tails.length)
  if (motion?.capturedPose) {
    const passage = needlePassage(motion.capturedPose, motion.progress)
    hoopShell.dataset.passageEye = JSON.stringify(passage.pose.eye)
    hoopShell.dataset.sourceThreadEnd = JSON.stringify(passage.sourceThreadEnd)
    hoopShell.dataset.destinationEyeVisible = String(passage.destinationEyeVisible)
    hoopShell.dataset.pulledHole = JSON.stringify(motion.capturedPose.tip)
    hoopShell.dataset.tensionProgress = String(passage.pull)
  }
  renderFront(); renderBack(); updateHistoryControls()
}
function announce(title: string, copy: string): void { setText(statusTitle, title); setText(statusCopy, copy) }
function showSaveState(saved: boolean): void {
  setText(document.querySelector('#save-state')!, saved ? 'Saved on this device' : 'Work not saved — download a recovery copy before leaving')
  document.querySelector<HTMLButtonElement>('#recovery-copy')!.hidden = saved
}
function saveSettings(value: StudioSettings): void {
  const saved = writeSettings(value)
  let warning = document.querySelector('#settings-save-warning')
  if (!warning) {
    warning = document.createElement('p')
    warning.id = 'settings-save-warning'
    warning.setAttribute('role', 'status')
    document.querySelector('.masthead')!.append(warning)
  }
  setText(warning, saved ? '' : 'Palette and motion settings are temporary; device storage failed.')
}
function persist(validatedRaw?:string): void {
  piece = history.present
  showSaveState(pieceStorage.save(runHistory.present,validatedRaw))
}
function setMotionDataset(state: 'idle' | 'off' | 'running', phase: string = state, progress = '0', side: SurfaceSide | null = null): void {
  for (const [surface, surfaceCanvas] of [['front', canvas], ['back', backCanvas]] as const) {
    surfaceCanvas.dataset.motionState = state === 'running' && surface !== side ? (motionIsActive() ? 'idle' : 'off') : state
    surfaceCanvas.dataset.motionPhase = state === 'running' && surface !== side ? (motionIsActive() ? 'idle' : 'off') : phase
    surfaceCanvas.dataset.motionProgress = state === 'running' && surface !== side ? '0' : progress
  }
}
function stopStitchMotion(redraw = false, clearTails = true): void {
  if (motionFrame !== null) cancelAnimationFrame(motionFrame)
  motionFrame = null; motion = null; motionSide = null
  if (clearTails) {
    if (tailFrame !== null) cancelAnimationFrame(tailFrame)
    tailFrame = null; tails = []
  }
  setMotionDataset(motionIsActive() ? 'idle' : 'off')
  if (redraw) render()
}
function interruptStitchMotion(): void {
  if (!motion || !motionSide) return
  // Up to four 100 ms tails; overload deterministically settles the oldest.
  tails.push({ side: motionSide, visual: motion, startedAt: performance.now(), from: motion.progress })
  tails = tails.slice(-4)
  stopStitchMotion(false, false)
  if (tailFrame !== null) return
  const tick = (now: number) => {
    tailFrame = null
    for (const tail of tails) {
      const t = Math.min(1, Math.max(0, (now - tail.startedAt) / 100))
      const progress = tail.from + (1 - tail.from) * t * t * (3 - 2 * t)
      tail.visual = { ...tail.visual, progress, sample: sampleStitchMotionProgress(progress) }
    }
    tails = tails.filter(tail => now - tail.startedAt < 100)
    render()
    if (tails.length) tailFrame = requestAnimationFrame(tick)
  }
  tailFrame = requestAnimationFrame(tick)
}
function visibleSurface(view: HoopViewSnapshot): SurfaceSide | null { return view.face === 'front' || view.face === 'back' ? view.face : null }
function needleAvailable(view = viewController.snapshot()): boolean { return view.stitchable && visibleSurface(view) === history.present.needle.side }
function targetMode(view = viewController.snapshot()): 'direct' | 'hidden' | null {
  const surface = visibleSurface(view)
  if (!view.stitchable || !surface) return null
  return surface === history.present.needle.side ? 'direct' : 'hidden'
}
function stopActiveThreadLoop(): void {
  if (activeThreadFrame !== null) cancelAnimationFrame(activeThreadFrame)
  activeThreadFrame = null
  activeThreadTimestamp = null
  activeThreadStillFrames = 0
  if (activeThread) activeThread = resetActiveThreadClock(activeThread)
  hoopShell.dataset.threadLoopState = 'idle'
}
function runActiveThreadFrame(now: number): void {
  activeThreadFrame = null
  if (!activeThread || document.hidden) { activeThreadTimestamp = null; return }
  const elapsed = activeThreadTimestamp === null ? 1000 / 60 : now - activeThreadTimestamp
  activeThreadTimestamp = now
  const before = activeThread.points.map((point) => ({ ...point }))
  activeThread = stepActiveThread(activeThread, elapsed)
  const movement = activeThread.points.reduce((maximum, point, index) => Math.max(maximum, Math.hypot(point.x - before[index]!.x, point.y - before[index]!.y)), 0)
  activeThreadStillFrames = movement < .000025 ? activeThreadStillFrames + 1 : 0
  render()
  if (activeThreadStillFrames < 14) activeThreadFrame = requestAnimationFrame(runActiveThreadFrame)
  else { activeThreadTimestamp = null; hoopShell.dataset.threadLoopState = 'idle' }
}
function ensureActiveThreadLoop(): void {
  if (!activeThread || document.hidden || activeThreadFrame !== null) return
  activeThreadStillFrames = 0
  activeThreadLoopStarts += 1
  hoopShell.dataset.threadLoopState = 'running'
  activeThreadFrame = requestAnimationFrame(runActiveThreadFrame)
}
function resetTransientToNeedle(redraw = true): void {
  stopActiveThreadLoop()
  target = history.present.needle.position ? { ...history.present.needle.position } : null
  hoverPose = target ? heldNeedlePose(target, viewController.snapshot(), projectionGeometry()) : null
  activeThread = null
  if (redraw) render()
}
function updateTarget(point: NormalizedPoint): void {
  target = { ...point }
  hoverPose = heldNeedlePose(point, viewController.snapshot(), projectionGeometry())
  const eye = hoverPose.eye
  const anchor = activeAnchor()
  if (!anchor || Math.hypot(point.x - anchor.x, point.y - anchor.y) < .0005) {
    activeThread = null
    stopActiveThreadLoop()
  } else if (activeThread && activeThread.anchor.x === anchor.x && activeThread.anchor.y === anchor.y) {
    activeThread = retargetActiveThread(activeThread, eye)
  } else {
    activeThread = createActiveThread(anchor, eye, { reducedMotion: reducedMotionQuery.matches })
  }
  ensureActiveThreadLoop()
  render()
}
function refreshHeldPose(): void {
  if (!target || motion) return
  hoverPose = heldNeedlePose(target, viewController.snapshot(), projectionGeometry())
  if (activeThread) activeThread = retargetActiveThread(activeThread, hoverPose.eye)
}
function projectionGeometry() {
  const rect = hoopShell.getBoundingClientRect()
  const parsedPerspective = Number.parseFloat(getComputedStyle(hoopShell).perspective)
  return { centerX: rect.left + rect.width / 2, centerY: rect.top + rect.height / 2, size: Math.min(rect.width, rect.height), perspectivePx: Number.isFinite(parsedPerspective) ? parsedPerspective : Math.max(760, rect.width * 1.5) }
}
function pointerPoint(event: PointerEvent, requireTarget = true): NormalizedPoint | null {
  const view = viewController.snapshot()
  if (requireTarget && !targetMode(view)) return null
  const rect = hoopShell.getBoundingClientRect()
  const offset = event.pointerType === 'touch' ? touchTargetOffset(event.clientX, event.clientY, rect, FABRIC_RADIUS) : 0
  return inverseProjectFabricPoint(event.clientX, event.clientY - offset, view, projectionGeometry())
}
function startStitchMotion(stitch: Stitch, side: SurfaceSide, loosePoints: readonly NormalizedPoint[] | null): void {
  stopStitchMotion(false, false); updateHistoryControls()
  if (!motionIsActive()) { resetTransientToNeedle(false); setMotionDataset('off'); render(); return }
  const startedAt = performance.now(); motionSide = side; setMotionDataset('running', 'press', '0', side)
  const capturedPose = hoverPose ?? needlePose(stitch.needleEnd ?? stitch.end)
  const surfaceCanvas = side === 'front' ? canvas : backCanvas
  surfaceCanvas.dataset.tightenEyeX = String(loosePoints?.at(-1)?.x ?? '')
  surfaceCanvas.dataset.tightenEyeY = String(loosePoints?.at(-1)?.y ?? '')
  const tick = (now: number) => {
    const sample = sampleStitchMotion(now - startedAt)
    motion = { stitchId: stitch.id, progress: sample.progress, sample, loosePoints: loosePoints ?? undefined, capturedPose }
    setMotionDataset('running', sample.phase, sample.progress.toFixed(3), side); render()
    if (sample.elapsedMs < STITCH_MOTION_DURATION_MS) motionFrame = requestAnimationFrame(tick)
    else {
      const finished = needlePassage(capturedPose, 1)
      motionFrame = null; motion = null; motionSide = null
      hoverPose = finished.pose; target = { ...finished.pose.tip }
      activeThread = createActiveThread(history.present.needle.position!, finished.pose.eye)
      setMotionDataset('idle', 'idle', '1'); render(); ensureActiveThreadLoop()
    }
  }
  // Install the transition before returning from pointerup, not one RAF later.
  tick(startedAt)
}

function syncMotionControl(): void {
  const active = motionIsActive(); motionButton.disabled = reducedMotionQuery.matches
  motionButton.setAttribute('aria-pressed', String(active)); motionButton.classList.toggle('active', active)
  setText(motionButton.querySelector('small')!, reducedMotionQuery.matches ? 'Tightening shortened for Reduce Motion' : 'Press, puncture, tighten, and settle')
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
  const view = viewController.snapshot(); const surface = visibleSurface(view); const available = needleAvailable(view); const targeting = targetMode(view)
  hoopRotator.style.transform = `rotateX(${view.pitchDeg.toFixed(3)}deg) rotateY(${view.yawDeg.toFixed(3)}deg)`
  if (hoopShell.dataset.yaw !== view.yawDeg.toFixed(3) || hoopShell.dataset.pitch !== view.pitchDeg.toFixed(3)) refreshHeldPose()
  hoopShell.dataset.viewState = viewStateName(); hoopShell.dataset.viewMode = view.mode; hoopShell.dataset.alignedFace = view.alignedFace ?? 'none'
  hoopShell.dataset.visibleSide = surface ?? 'edge'; hoopShell.dataset.needleSide = history.present.needle.side; hoopShell.dataset.interactionState = view.interactionState; hoopShell.dataset.needleAvailable = String(available)
  hoopShell.dataset.yaw = view.yawDeg.toFixed(3); hoopShell.dataset.pitch = view.pitchDeg.toFixed(3)
  hoopShell.classList.toggle('is-rotating', view.mode === 'auto'); hoopShell.classList.toggle('is-dragging', view.gestureActive); hoopShell.classList.toggle('is-inspect-only', view.interactionState === 'inspect-only'); hoopShell.classList.toggle('is-limited', view.interactionState === 'limited'); hoopShell.classList.toggle('needle-opposite', Boolean(surface && surface !== history.present.needle.side))
  hoopShell.classList.toggle('hidden-targeting', targeting === 'hidden')
  canvas.setAttribute('aria-disabled', String(!(targeting && surface === 'front'))); backCanvas.setAttribute('aria-disabled', String(!(targeting && surface === 'back')))
  setText(needleSideLabel, `Needle: ${history.present.needle.side}`)
  setText(editStateLabel, view.mode === 'auto' ? 'Rotating — puncture paused' : view.interactionState === 'inspect-only' ? 'Inspect only — projection too shallow' : targeting === 'direct' ? `${surface === 'back' ? 'Reverse' : 'Front'} needle active` : targeting === 'hidden' ? `Choose ${history.present.needle.side}-side emergence` : 'Near edge — inspect only')
  setText(canvasHelp, view.mode === 'auto' ? 'Stop rotation to evaluate this angle for stitching.' : view.interactionState === 'inspect-only' ? 'This angle is too shallow for reliable puncture placement. Rotate a little farther.' : targeting === 'direct' ? 'Move the needle; the loose thread follows. Click to puncture.' : targeting === 'hidden' ? `Choose where the hidden ${history.present.needle.side}-side needle will emerge. Flipping is optional.` : 'Rotate toward either face to continue.')
  rotateButton.disabled = reducedMotionQuery.matches; rotateButton.setAttribute('aria-pressed', String(view.mode === 'auto')); rotateButton.classList.toggle('active', view.mode === 'auto')
  setText(document.querySelector('#rotation-title')!, view.mode === 'auto' ? 'Stop rotation' : 'Auto rotate')
  setText(document.querySelector('#rotation-copy')!, reducedMotionQuery.matches ? 'Unavailable while Reduce Motion is on' : view.mode === 'auto' ? 'Freeze at the current angle' : 'Slowly turn from the current angle')
  frontButton.disabled = view.mode === 'manual' && view.frontAligned && !view.gestureActive; backButton.disabled = view.mode === 'manual' && view.backAligned && !view.gestureActive
}
function runViewFrame(now: number): void { viewFrame = null; viewController.tick(now); syncViewControl(); if (viewController.snapshot().mode === 'auto') viewFrame = requestAnimationFrame(runViewFrame) }
function ensureViewLoop(): void { if (viewFrame === null && viewController.snapshot().mode === 'auto') viewFrame = requestAnimationFrame(runViewFrame) }
function announceViewPosition(prefix = 'View stopped'): void {
  const view = viewController.snapshot(); const surface = visibleSurface(view)
  if (view.interactionState === 'inspect-only') announce('Inspect-only angle', 'Projection is too shallow for reliable puncture placement. Rotate toward either face.')
  else if (surface !== history.present.needle.side) announce('Choose emergence point', `The needle is on the hidden ${history.present.needle.side}. Select where it should emerge, or flip to work directly.`)
  else announce(prefix === 'View stopped' ? 'Needle ready' : prefix, `${surface === 'back' ? 'Reverse' : 'Front'} surface is ${view.interactionState} and ready to puncture.`)
}

function selectColor(nextColor: string, endPrevious = true): void {
  const normalized = normalizeHexColor(nextColor); if (!normalized) return
  const selected = palette.querySelector<HTMLButtonElement>(`.swatch[data-color="${normalized}"]`); if (!selected) return
  const run = activeThreadRun(runHistory.present)
  if (endPrevious && run && normalized !== (run.color ?? history.present.punctures.at(-1)?.color)) {
    if(history.present.nextOrder>=999_999_999){announce('Fabric full','This piece has reached its local segment limit. Undo or clear before adding more.');return}
    cancelNeedleInteraction(false); stopStitchMotion(false)
    syncThreadHistory(endHistoryThread(runHistory)); resetTransientToNeedle(false); refreshRenderItems(); persist()
    announce('New thread color', 'The previous thread ended. The next puncture starts a separate thread.')
  }
  palette.querySelectorAll<HTMLElement>('.swatch').forEach((item) => { item.classList.remove('selected'); item.setAttribute('aria-checked', 'false') })
  selected.classList.add('selected'); selected.setAttribute('aria-checked', 'true'); color = normalized; settings = { ...settings, selectedColor: normalized }; saveSettings(settings)
  customColorInput.value = normalized; setText(document.querySelector('#color-name')!, colorName(normalized)); render()
}
function appendCustomSwatch(value: string): void {
  const button = document.createElement('button'); button.className = 'swatch'; button.type = 'button'; button.setAttribute('role', 'radio'); button.setAttribute('aria-checked', 'false')
  button.setAttribute('aria-label', colorName(value)); button.dataset.color = value; button.dataset.name = colorName(value); button.style.setProperty('--swatch', value); button.innerHTML = '<span></span>'; localize(button); palette.append(button)
}
function releaseHoopPointer(pointerId: number): void { if (hoopShell.hasPointerCapture(pointerId)) hoopShell.releasePointerCapture(pointerId) }
let cutGesture: { id: number; x: number; y: number; moved: boolean } | null = null
function cancelNeedleInteraction(redraw = true, keepTouchGesture = false): void {
  const cutting = cutGesture
  cutGesture = null
  if (cutting) releaseHoopPointer(cutting.id)
  floating = false; floatingNeedle.hide()
  if (!keepTouchGesture) touchRotation.cancel()
  shiftRotation = false
  const pointerId = stitchPointerId
  // Clear ownership before releasing capture, which can synchronously dispatch loss.
  stitchPointerId = null
  if (pointerId !== null) releaseHoopPointer(pointerId)
  const cameraPointer = viewPointerId
  viewPointerId = null
  if (cameraPointer !== null) {
    viewController.cancelGesture(cameraPointer)
    if (cameraPointer !== TOUCH_CAMERA_ID) releaseHoopPointer(cameraPointer)
    syncViewControl()
  }
  stopStitchMotion(false)
  resetTransientToNeedle(redraw)
}

hoopShell.addEventListener('contextmenu', event => { if(event.ctrlKey)event.preventDefault() })
hoopShell.addEventListener('pointerdown', (event) => {
  if(event.ctrlKey && event.button===0 && event.isPrimary && event.pointerType!=='touch'){
    event.preventDefault()
    if (event.shiftKey || cutGesture || stitchPointerId !== null || viewPointerId !== null || endThreadButton.disabled) return
    cancelNeedleInteraction(false)
    cutGesture = {id:event.pointerId,x:event.clientX,y:event.clientY,moved:false}
    hoopShell.setPointerCapture(event.pointerId)
    return
  }
  if (cutGesture) { cancelNeedleInteraction(); return }
  if (event.pointerType === 'touch') {
    const action = touchRotation.down(event.pointerId, event.clientX, event.clientY, event.isPrimary)
    hoopShell.setPointerCapture(event.pointerId)
    if (action === 'rotate') {
      const firstTouch = stitchPointerId ?? viewPointerId
      cancelNeedleInteraction(false, true)
      if (firstTouch !== null && firstTouch !== TOUCH_CAMERA_ID) hoopShell.setPointerCapture(firstTouch)
      const center = touchRotation.centroid()!
      stopViewLoop()
      viewController.beginGesture(TOUCH_CAMERA_ID, center.x, center.y)
      viewPointerId = TOUCH_CAMERA_ID
      syncViewControl(); render(); return
    }
    if (action === 'ignore') return
  }
  if (!event.isPrimary || event.button !== 0 || stitchPointerId !== null || viewController.snapshot().gestureActive) return
  if (event.pointerType === 'mouse' && event.shiftKey) {
    cancelNeedleInteraction(false)
    stopViewLoop()
    viewController.beginGesture(event.pointerId, event.clientX, event.clientY)
    viewPointerId = event.pointerId; shiftRotation = true
    hoopShell.setPointerCapture(event.pointerId); syncViewControl(); render(); return
  }
  viewController.tick(performance.now()); const point = pointerPoint(event)
  if (point) { interruptStitchMotion(); stitchPointerId = event.pointerId; hoopShell.setPointerCapture(event.pointerId); updateTarget(point); return }
  stopViewLoop()
  if (!viewController.beginGesture(event.pointerId, event.clientX, event.clientY)) return
  viewPointerId = event.pointerId
  hoopShell.setPointerCapture(event.pointerId); syncViewControl(); render()
})
hoopShell.addEventListener('pointermove', (event) => {
  if (cutGesture) {
    if (cutGesture.id === event.pointerId && Math.hypot(event.clientX-cutGesture.x,event.clientY-cutGesture.y)>6) cutGesture.moved=true
    return
  }
  if (event.pointerType === 'touch') {
    const center = touchRotation.move(event.pointerId, event.clientX, event.clientY)
    if (center && viewPointerId === TOUCH_CAMERA_ID) {
      const rect = hoopShell.getBoundingClientRect()
      viewController.updateGesture(TOUCH_CAMERA_ID, center.x, center.y, Math.max(1, Math.min(rect.width, rect.height)))
      syncViewControl(); render()
    }
    if (touchRotation.blocked) return
  }
  if (!event.isPrimary) return
  if (viewController.snapshot().gestureActive) {
    const rect = hoopShell.getBoundingClientRect()
    if (viewController.updateGesture(event.pointerId, event.clientX, event.clientY, Math.max(1, Math.min(rect.width, rect.height)))) { syncViewControl(); render() }
    return
  }
  if (stitchPointerId !== null && stitchPointerId !== event.pointerId) return
  const next = pointerPoint(event)
  if (next) { floating = false; if (motion) interruptStitchMotion(); updateTarget(next) }
})
window.addEventListener('pointermove', event => {
  if (cutGesture || event.pointerType !== 'mouse' || !event.isPrimary || event.shiftKey || !needleAvailable()
    || viewController.snapshot().gestureActive || stitchPointerId !== null) {
    if (floating) { floating = false; render() }
    return
  }
  const view = viewController.snapshot(), geometry = projectionGeometry()
  if (inverseProjectFabricPoint(event.clientX, event.clientY, view, geometry)) return
  const point = inverseProjectFabricPoint(event.clientX, event.clientY, view, geometry, true)
  if (point) { if (motion) interruptStitchMotion(); floating = true; updateTarget(point) }
})
hoopShell.addEventListener('pointerup', (event) => {
  if (cutGesture?.id === event.pointerId) {
    const gesture=cutGesture
    cutGesture=null
    releaseHoopPointer(event.pointerId)
    const rect=hoopShell.getBoundingClientRect()
    if (!gesture.moved && event.button===0 && event.ctrlKey && !event.shiftKey
      && Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y)<=6
      && event.clientX>=rect.left && event.clientX<=rect.right && event.clientY>=rect.top && event.clientY<=rect.bottom) cutCurrentThread()
    return
  }
  if (event.pointerType === 'touch' && touchRotation.up(event.pointerId)) {
    if (!touchRotation.centroid() && viewPointerId === TOUCH_CAMERA_ID) {
      viewController.endGesture(TOUCH_CAMERA_ID); viewPointerId = null
      syncViewControl(); announceViewPosition('View adjusted'); render()
    }
    releaseHoopPointer(event.pointerId); return
  }
  if (viewController.endGesture(event.pointerId)) { viewPointerId = null; releaseHoopPointer(event.pointerId); syncViewControl(); announceViewPosition('View adjusted'); render(); return }
  if (stitchPointerId !== event.pointerId) return
  stitchPointerId = null; releaseHoopPointer(event.pointerId); let point = pointerPoint(event)
  if (!point) { resetTransientToNeedle(); return }
  const guideTarget = guide ? guideTargets(guide)[guideIndex] : undefined
  if(tulipAction&&tulipAction.kind!=='done'){
    if(!('target' in tulipAction)||visibleSurface(viewController.snapshot())!==tulipAction.side
      || !nearGuideTarget(point,tulipAction.target)){updateTulipCopy();return}
    point={...tulipAction.target}
  }
  if (guideTarget && !nearGuideTarget(point, guideTarget)) { announce('Next flower point', 'Follow the highlighted guide point before continuing.'); return }
  const previousPosition = activeAnchor()
  if (previousPosition && Math.hypot(point.x - previousPosition.x, point.y - previousPosition.y) < .018) { announce('A little farther', 'Move the needle tip before puncturing again.'); return }
  if (!canPuncture(history.present) || history.present.nextOrder>=999_999_999) { resetTransientToNeedle(false); announce('Fabric full', 'This piece has reached its local segment limit. Undo or clear before adding more.'); render(); return }
  updateTarget(point)
  const loosePoints = snapshotActiveThread(activeThread)
  stopActiveThreadLoop()
  const nextState = tulipAction && 'target' in tulipAction ? punctureGuideStep(runHistory.present,TULIP_HEART_PATTERN,tulipAction.index,point,'running')
    : guide && guideTarget ? punctureGuideStep(runHistory.present,guidePattern(guide),guideIndex,point,stitchType)
    : punctureThreadRun(runHistory.present, point, { type: stitchType, color })
  let validatedRaw:string
  try { validatedRaw=serializeThreadArtwork(nextState) }
  catch { resetTransientToNeedle(false);announce('Fabric full','This piece has reached its local segment limit. Undo or clear before adding more.');render();return }
  const puncture = nextState.topology.punctures.at(-1)!
  const lastSegment = nextState.topology.segments.at(-1)
  const result = { puncture, segment: lastSegment?.endPunctureId === puncture.id ? lastSegment : null }
  const motionSurface = result.puncture.fromSide
  syncThreadHistory(commitThreadState(nextState)); target = { ...point }; activeThread = null; refreshRenderItems(); persist(validatedRaw); syncViewControl()
  const motionId = result.segment?.id ?? `${result.puncture.id}-${motionSurface}-hole`
  const motionItem = (motionSurface === 'front' ? frontItems : backItems).find((item) => item.id === motionId)
  const surface = visibleSurface(viewController.snapshot())
  if (surface === history.present.needle.side) announce('Needle emerged', `The same needle is now visible on the ${surface}. Keep moving to pull the soft thread.`)
  else announce('Needle behind fabric', `Choose where the hidden ${history.present.needle.side}-side needle should emerge; flipping is optional.`)
  if (motionItem) startStitchMotion(motionItem, motionSurface, loosePoints); else render()
})
hoopShell.addEventListener('pointercancel', (event) => {
  if (event.pointerType === 'touch') { touchRotation.up(event.pointerId); cancelNeedleInteraction(); return }
  if (cutGesture?.id === event.pointerId || viewPointerId === event.pointerId || stitchPointerId === event.pointerId) cancelNeedleInteraction()
})
hoopShell.addEventListener('lostpointercapture', (event) => {
  if (event.pointerType === 'touch' && viewPointerId === TOUCH_CAMERA_ID && touchRotation.has(event.pointerId)) { cancelNeedleInteraction(); return }
  if (cutGesture?.id === event.pointerId || viewPointerId === event.pointerId || stitchPointerId === event.pointerId) cancelNeedleInteraction()
})
window.addEventListener('pointerup', (event) => {
  if (event.pointerType === 'touch' && !hoopShell.contains(event.target as Node) && touchRotation.has(event.pointerId)) {
    touchRotation.up(event.pointerId); cancelNeedleInteraction()
  }
})
canvas.addEventListener('contextmenu', (event) => { event.preventDefault(); if (!event.ctrlKey) cancelNeedleInteraction() })

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
  button.classList.add('selected'); button.setAttribute('aria-checked', 'true'); stitchType = button.dataset.stitch as StitchType; announce('Routing changed', `${stitchType === 'back' ? 'Back' : 'Running'} routing will shape the next surface segment.`)
}))
rotateButton.addEventListener('click', () => {
  cancelNeedleInteraction(false)
  if (viewController.snapshot().mode === 'auto') { viewController.stopAuto(); stopViewLoop(); syncViewControl(); announceViewPosition('Rotation paused'); render(); return }
  if (viewController.startAuto(performance.now())) { syncViewControl(); ensureViewLoop(); render(); announce('3D view rotating', 'Puncture is paused while the hoop turns. Stop anywhere to evaluate the angle.') }
})
frontButton.addEventListener('click', () => { if (cutGesture || stitchPointerId !== null || viewPointerId !== null) cancelNeedleInteraction(false); stopViewLoop(); viewController.snapFront(); syncViewControl(); announceViewPosition(); render() })
backButton.addEventListener('click', () => { if (cutGesture || stitchPointerId !== null || viewPointerId !== null) cancelNeedleInteraction(false); stopViewLoop(); viewController.snapBack(); syncViewControl(); announceViewPosition(); render() })
motionButton.addEventListener('click', () => {
  settings = { ...settings, motionEnabled: !settings.motionEnabled }; saveSettings(settings); stopStitchMotion(false); resetTransientToNeedle(false); syncMotionControl(); render()
  announce(settings.motionEnabled ? 'Stitch motion on' : 'Stitch motion off', settings.motionEnabled ? 'Punctures tighten from the loose thread you are moving.' : 'Live thread following remains; punctures settle immediately.')
})
function restoreActiveColor():void{
  const run=activeThreadRun(runHistory.present),value=run?.color??(run?history.present.punctures.at(-1)?.color:null)
  if(value){if(!palette.querySelector(`.swatch[data-color="${value}"]`))appendCustomSwatch(value);selectColor(value,false)}
}
undoButton.addEventListener('click', () => { cancelNeedleInteraction(false); syncThreadHistory(undoThreadHistory(runHistory)); restoreActiveColor(); resetTransientToNeedle(false); refreshRenderItems(); persist(); syncViewControl(); render(); announce('Operation undone', `Needle restored to the ${history.present.needle.side}.`) })
redoButton.addEventListener('click', () => { cancelNeedleInteraction(false); syncThreadHistory(redoThreadHistory(runHistory)); restoreActiveColor(); resetTransientToNeedle(false); refreshRenderItems(); persist(); syncViewControl(); render(); announce('Operation restored', `Needle is on the ${history.present.needle.side}.`) })
function cutCurrentThread():void {
  if (endThreadButton.disabled) return
  cancelNeedleInteraction(false); stopStitchMotion(false); syncThreadHistory(endHistoryThread(runHistory))
  resetTransientToNeedle(false); refreshRenderItems(); persist(); syncViewControl(); render()
  announce('Thread ended', 'The next puncture starts a separate thread. Existing stitches stay unchanged.')
}
endThreadButton.addEventListener('click', cutCurrentThread)
clearButton.addEventListener('click', () => {
  cancelNeedleInteraction()
  if (clearButton.disabled || !window.confirm(t('Clear every puncture and thread segment from this fabric?'))) return
  guide = null; saveGuide(null);tulipGuide=null;saveTulipGuide(null)
  stopStitchMotion(false); syncThreadHistory(createThreadHistory(emptyThreadRuns())); resetTransientToNeedle(false); refreshRenderItems(); persist(); syncViewControl(); render(); announce('Fabric cleared', 'Needle reset to the front surface.')
})
hoopShell.addEventListener('keydown', (event) => {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return
  event.preventDefault(); if (cutGesture || stitchPointerId !== null || viewPointerId !== null) cancelNeedleInteraction(false); stopViewLoop()
  if (viewController.handleKey(event.key)) { syncViewControl(); announceViewPosition('View adjusted'); render() }
})
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    cancelNeedleInteraction()
    if (viewController.snapshot().mode === 'auto') { viewController.stopAuto(); stopViewLoop(); syncViewControl(); announceViewPosition('Rotation paused'); render() }
    else { resetTransientToNeedle(); announceViewPosition('Needle reset') }
  }
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); cancelNeedleInteraction(); event.shiftKey ? redoButton.click() : undoButton.click() }
})
window.addEventListener('keyup', (event) => {
  if (event.key === 'Shift' && shiftRotation) {
    cancelNeedleInteraction(); syncViewControl(); announceViewPosition('View adjusted')
  }
})
reducedMotionQuery.addEventListener('change', () => { stopStitchMotion(false); stopViewLoop(); viewController.setReducedMotion(reducedMotionQuery.matches); const currentTarget = target; resetTransientToNeedle(false); if (currentTarget) updateTarget(currentTarget); syncMotionControl(); syncViewControl(); render() })
window.addEventListener('blur', () => { floating = false; floatingNeedle.hide(); if (cutGesture || stitchPointerId !== null || viewPointerId !== null) cancelNeedleInteraction(); else stopActiveThreadLoop() })
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    viewController.stopAuto();stopViewLoop();syncViewControl()
    floating = false; floatingNeedle.hide()
    if (cutGesture || stitchPointerId !== null || viewPointerId !== null) cancelNeedleInteraction()
    else { stopActiveThreadLoop(); stopStitchMotion(false) }
  } else ensureActiveThreadLoop()
})
renderer.onResize = () => { lastFaceInputs.front = null; refreshHeldPose(); renderFront() }
backRenderer.onResize = () => { lastFaceInputs.back = null; refreshHeldPose(); renderBack() }
restoreActiveColor(); refreshRenderItems(); syncMotionControl(); syncViewControl(); render()
if (pieceStorage.initial.status === 'loaded') setText(document.querySelector('#save-state')!, 'Loaded from this device')
if (pieceStorage.initial.status === 'invalid' || pieceStorage.initial.status === 'unavailable') showSaveState(false)
document.querySelector('#recovery-copy')!.addEventListener('click', () => downloadRecovery(pieceStorage.recovery(runHistory.present), 'deesewsew-recovery.json'))
const originalRecovery = document.querySelector<HTMLButtonElement>('#recovery-source')!
originalRecovery.hidden = pieceStorage.initial.status !== 'invalid'
originalRecovery.addEventListener('click', () => downloadRecovery(pieceStorage.initial.raw ?? '', 'deesewsew-original-data.json'))

document.querySelector('#export-artwork')!.addEventListener('click', () => {
  try { downloadRecovery(serializeThreadArtwork(runHistory.present), 'deesewsew-artwork.json'); announce('Artwork exported', 'Your current artwork was downloaded without changing it.') }
  catch { announce('Export failed', 'Could not download this artwork. Your work is unchanged.') }
})
const artworkFile = document.querySelector<HTMLInputElement>('#artwork-file')!
document.querySelector('#import-artwork')!.addEventListener('click', () => artworkFile.click())
let importRequest = 0
artworkFile.addEventListener('change', async () => {
  const file = artworkFile.files?.[0], request = ++importRequest
  artworkFile.value = ''
  if (!file) return
  try {
    if (file.size > 4_000_000) throw new RangeError('Artwork size limit')
    const imported = parseThreadArtwork(await file.text())
    if (request !== importRequest) return
    if ((history.present.punctures.length || history.present.legacyFrontStitches.length)
      && !window.confirm(t('Replace the current artwork? Export a copy first if you want to keep it.'))) return
    cancelNeedleInteraction(false)
    guide = null; saveGuide(null);tulipGuide=null;saveTulipGuide(null)
    syncThreadHistory(createThreadHistory(imported)); restoreActiveColor(); resetTransientToNeedle(false); refreshRenderItems(); persist(); syncViewControl(); render()
    announce('Artwork imported', 'The validated artwork is ready to continue.')
  } catch { if (request === importRequest) announce('Import failed', 'Invalid or unsupported artwork file. Your current work is unchanged.') }
})

if ('serviceWorker' in navigator && import.meta.env.PROD) window.addEventListener('load', () => navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL }))
