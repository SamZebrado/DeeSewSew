import './style.css'
import { EmbroideryRenderer } from './renderer'
import { createStitch, loadPiece, savePiece, type NormalizedPoint, type Piece, type StitchType } from './stitch-model'
import { makeVisualScene } from './visual-scenes'

const colors = [['Poppy', '#b9403c'], ['Coral', '#df735f'], ['Marigold', '#d49a2f'], ['Leaf', '#55765b'], ['Indigo', '#425f86'], ['Plum', '#74516f'], ['Walnut', '#765443'], ['Ink', '#363539'], ['Cream', '#e6d7b7']] as const

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <main class="studio">
    <header class="masthead"><div><p class="eyebrow">A tiny embroidery studio in your browser</p><h1>DeeSewSew</h1></div><p class="save-state" id="save-state" aria-live="polite">Saved on this device</p></header>
    <section class="workspace" aria-label="Embroidery studio">
      <div class="hoop-stage"><div class="hoop-shell"><canvas id="embroidery" aria-label="Blank fabric inside an embroidery hoop"></canvas></div><p class="canvas-help">Tap once to place a needle point, then tap again to pull the thread through.</p></div>
      <aside class="tools" aria-label="Stitch controls">
        <section class="tool-group"><div class="tool-heading"><h2>Thread</h2><span id="color-name">Poppy</span></div><div class="palette" role="radiogroup" aria-label="Thread color">
          ${colors.map(([name, value], index) => `<button class="swatch${index === 0 ? ' selected' : ''}" type="button" role="radio" aria-checked="${index === 0}" aria-label="${name}" data-color="${value}" data-name="${name}" style="--swatch:${value}"><span></span></button>`).join('')}
        </div></section>
        <section class="tool-group"><h2>Stitch</h2><div class="segmented" role="radiogroup" aria-label="Stitch type">
          <button class="selected" type="button" role="radio" aria-checked="true" data-stitch="running"><span class="stitch-icon">— —</span><span>Running</span></button>
          <button type="button" role="radio" aria-checked="false" data-stitch="back"><span class="stitch-icon">——</span><span>Back</span></button>
        </div></section>
        <section class="tool-group history-group"><h2>Edit</h2><div class="edit-row"><button class="soft-button" id="undo" type="button" disabled aria-label="Undo last stitch">↶ <span>Undo</span></button><button class="soft-button" id="redo" type="button" disabled aria-label="Redo last stitch">↷ <span>Redo</span></button></div><button class="clear-button" id="clear" type="button" disabled>Clear fabric</button></section>
        <div class="quiet-tip"><span aria-hidden="true">✦</span><p><strong id="status-title">Ready to stitch</strong><br><span id="status-copy">Place your first needle point inside the fabric.</span></p></div>
      </aside>
    </section>
  </main>`

const canvas = document.querySelector<HTMLCanvasElement>('#embroidery')!
const renderer = new EmbroideryRenderer(canvas)
let piece: Piece = loadPiece()
const scene = import.meta.env.DEV ? makeVisualScene(new URLSearchParams(location.search).get('scene') ?? '') : null
if (scene) piece = { schemaVersion: 1, nextOrder: scene.length + 1, stitches: scene }
let redoStack: Piece['stitches'] = []
let color: string = colors[0][1]
let stitchType: StitchType = 'running'
let anchor: NormalizedPoint | null = null
let target: NormalizedPoint | null = null
const undoButton = document.querySelector<HTMLButtonElement>('#undo')!
const redoButton = document.querySelector<HTMLButtonElement>('#redo')!
const clearButton = document.querySelector<HTMLButtonElement>('#clear')!
const statusTitle = document.querySelector<HTMLElement>('#status-title')!
const statusCopy = document.querySelector<HTMLElement>('#status-copy')!

function render(): void {
  renderer.render(piece.stitches, anchor, target, color)
  undoButton.disabled = piece.stitches.length === 0
  clearButton.disabled = piece.stitches.length === 0
  redoButton.disabled = redoStack.length === 0
}
function announce(title: string, copy: string): void { statusTitle.textContent = title; statusCopy.textContent = copy }
function persist(): void { savePiece(piece) }
function cancelPending(): void { anchor = null; target = null; announce('Ready to stitch', 'Place a needle point inside the fabric.'); render() }
function pointerPoint(event: PointerEvent): NormalizedPoint | null { return renderer.toNormalized(event.clientX, event.clientY - (event.pointerType === 'touch' ? 34 : 0)) }

canvas.addEventListener('pointerdown', (event) => { if (!event.isPrimary) return; canvas.setPointerCapture(event.pointerId); target = pointerPoint(event); render() })
canvas.addEventListener('pointermove', (event) => { if (!event.isPrimary) return; const next = pointerPoint(event); if (next) { target = next; render() } })
canvas.addEventListener('pointerup', (event) => {
  if (!event.isPrimary) return
  const point = pointerPoint(event); if (!point) return
  if (!anchor) { anchor = point; target = point; announce('Needle point placed', 'Move to preview the thread, then tap to settle the stitch.'); render(); return }
  if (Math.hypot(point.x - anchor.x, point.y - anchor.y) < .018) { announce('A little farther', 'Move the needle tip before settling this stitch.'); return }
  const stitch = createStitch(piece, stitchType, anchor, point, color)
  piece = { ...piece, stitches: [...piece.stitches, stitch] }; redoStack = []; anchor = point; target = point
  announce('Thread settled', 'Keep placing points, or press Escape to finish this line.'); persist(); render()
})
canvas.addEventListener('pointercancel', cancelPending)
canvas.addEventListener('contextmenu', (event) => { event.preventDefault(); cancelPending() })

document.querySelectorAll<HTMLButtonElement>('.swatch').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('.swatch').forEach((item) => { item.classList.remove('selected'); item.setAttribute('aria-checked', 'false') })
  button.classList.add('selected'); button.setAttribute('aria-checked', 'true'); color = button.dataset.color ?? color; document.querySelector('#color-name')!.textContent = button.dataset.name ?? 'Thread'; render()
}))
document.querySelectorAll<HTMLButtonElement>('[data-stitch]').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('[data-stitch]').forEach((item) => { item.classList.remove('selected'); item.setAttribute('aria-checked', 'false') })
  button.classList.add('selected'); button.setAttribute('aria-checked', 'true'); stitchType = button.dataset.stitch as StitchType; cancelPending()
}))
undoButton.addEventListener('click', () => { const stitch = piece.stitches.at(-1); if (!stitch) return; redoStack.push(stitch); piece = { ...piece, stitches: piece.stitches.slice(0, -1) }; cancelPending(); persist() })
redoButton.addEventListener('click', () => { const stitch = redoStack.pop(); if (!stitch) return; piece = { ...piece, stitches: [...piece.stitches, stitch] }; cancelPending(); persist() })
clearButton.addEventListener('click', () => { if (!piece.stitches.length || !window.confirm('Clear every stitch from this fabric?')) return; piece = { ...piece, stitches: [] }; redoStack = []; cancelPending(); persist() })
window.addEventListener('keydown', (event) => { if (event.key === 'Escape') cancelPending(); if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); event.shiftKey ? redoButton.click() : undoButton.click() } })
renderer.onResize = render
render()

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL }))
}
