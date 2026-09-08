import { EmbroideryRenderer, type HoopSide } from './renderer'
import type { Stitch } from './stitch-model'

export interface ArtworkPngOptions {
  side: HoopSide
  /** Settled canonical items for this face, including canonical anchor items. */
  items: readonly Stitch[]
  /** Exact square output pixels; independent of the display's device pixel ratio. */
  size?: number
}

/** Local-only clean face export. Does not capture DOM, camera, guide or live needle state. */
function renderFace({ side, items, size = 1024 }: ArtworkPngOptions): HTMLCanvasElement {
  if (side !== 'front' && side !== 'back') throw new RangeError('Invalid export face')
  if (!Number.isInteger(size) || size < 256 || size > 2048) throw new RangeError('PNG size must be an integer from 256 to 2048')
  const canvas = document.createElement('canvas')
  canvas.setAttribute('aria-hidden', 'true')
  canvas.style.cssText = `all:initial!important;position:fixed!important;left:-10000px!important;top:0!important;width:${size}px!important;height:${size}px!important;min-width:${size}px!important;max-width:${size}px!important;min-height:${size}px!important;max-height:${size}px!important;visibility:hidden!important;pointer-events:none!important;`
  let renderer: EmbroideryRenderer | undefined
  try {
    document.body.appendChild(canvas)
    if (canvas.clientWidth !== size || canvas.clientHeight !== size) throw new Error('PNG canvas layout unavailable')
    if (!canvas.getContext('2d')) throw new Error('PNG canvas context unavailable')
    renderer = new EmbroideryRenderer(canvas, side, { maxDevicePixelRatio: 1 })
    renderer.render(items, null, null, '#000000', null)
    // Rendering is synchronous: no observer or live render loop is needed during encoding.
    renderer.destroy()
    renderer = undefined
    if (canvas.width !== size || canvas.height !== size) throw new Error('Unexpected PNG dimensions')
    // The live app crops its opaque renderer canvas to a circular hoop with CSS.
    // Export only that exterior mask, without repainting any craft material.
    const context = canvas.getContext('2d')!
    context.save()
    context.fillStyle = '#e7e9e4'
    context.beginPath(); context.rect(0, 0, size, size)
    context.moveTo(size * .985, size / 2)
    context.arc(size / 2, size / 2, size * .485, 0, Math.PI * 2)
    context.fill('evenodd')
    context.restore()
    return canvas
  } catch (error) {
    disposeCanvas(canvas)
    throw error
  } finally {
    renderer?.destroy()
    canvas.remove()
  }
}

function disposeCanvas(canvas: HTMLCanvasElement): void {
  canvas.width = 0
  canvas.height = 0
}

function encodePng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob(blob => {
    if (blob?.type === 'image/png' && blob.size > 0) resolve(blob)
    else reject(new Error('PNG encoding failed'))
  }, 'image/png'))
}

export async function exportArtworkPng(options: ArtworkPngOptions): Promise<Blob> {
  const canvas = renderFace(options)
  try { return await encodePng(canvas) }
  finally { disposeCanvas(canvas) }
}

/** FRONT left, BACK right. Each face is mapped exactly once by the canonical renderer. */
export async function exportArtworkPairPng(front: readonly Stitch[], back: readonly Stitch[], size = 1024): Promise<Blob> {
  let frontCanvas: HTMLCanvasElement | undefined
  let backCanvas: HTMLCanvasElement | undefined
  let pair: HTMLCanvasElement | undefined
  try {
    frontCanvas = renderFace({ side: 'front', items: front, size })
    backCanvas = renderFace({ side: 'back', items: back, size })
    pair = document.createElement('canvas')
    pair.width = size * 2; pair.height = size
    const context = pair.getContext('2d', { alpha: false })
    if (!context) throw new Error('PNG pair context unavailable')
    context.drawImage(frontCanvas, 0, 0)
    context.drawImage(backCanvas, size, 0)
    return await encodePng(pair)
  } finally {
    for (const canvas of [frontCanvas, backCanvas, pair]) if (canvas) disposeCanvas(canvas)
  }
}
