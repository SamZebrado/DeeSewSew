import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { exportArtworkPairPng, exportArtworkPng } from './artwork-png'
import type { Stitch } from './stitch-model'
import { emptyThreadRuns, endThreadRun, punctureThreadRun, startThreadAt } from './thread-runs'
import { threadRunRenderItems } from './thread-run-render'
import { serializeThreadArtwork } from './thread-run-storage'

const calls = vi.hoisted(() => ({ render: vi.fn(), destroy: vi.fn(), construct: vi.fn() }))
const contextStub = () => ({ save() {}, restore() {}, beginPath() {}, rect() {}, moveTo() {}, arc() {}, fill() {} })
vi.mock('./renderer', () => ({ EmbroideryRenderer: class {
  constructor(canvas: HTMLCanvasElement, side: string, options: unknown) {
    calls.construct(side, options)
    canvas.width = canvas.clientWidth
    canvas.height = canvas.clientHeight
  }
  render = calls.render
  destroy = calls.destroy
} }))

describe('clean canonical PNG export boundary', () => {
  let canvas: HTMLCanvasElement
  let append: ReturnType<typeof vi.fn>
  let remove: ReturnType<typeof vi.fn>
  beforeEach(() => {
    vi.clearAllMocks()
    remove = vi.fn()
    canvas = {
      width: 0, height: 0, clientWidth: 1024, clientHeight: 1024,
      style: { cssText: '' }, setAttribute: vi.fn(), remove,
      getContext: contextStub,
      toBlob: vi.fn(callback => callback(new Blob(['PNG'], { type: 'image/png' }))),
    } as unknown as HTMLCanvasElement
    append = vi.fn()
    vi.stubGlobal('document', { createElement: () => canvas, body: { appendChild: append } })
  })
  afterEach(() => vi.unstubAllGlobals())

  it.each(['front', 'back'] as const)('exports real %s ThreadRun segments and opposite-face anchors without transient data', async stitchedSide => {
    const style = { type: 'running' as const, color: '#9b4a48' }
    const started = startThreadAt(emptyThreadRuns(), stitchedSide, { x: .35, y: .4 }, style)
    const state = endThreadRun(punctureThreadRun(started, { x: .6, y: .5 }, style))
    const before = serializeThreadArtwork(state), opposite = stitchedSide === 'front' ? 'back' : 'front'
    const stitchedItems = threadRunRenderItems(state, stitchedSide)
    const anchorItems = threadRunRenderItems(state, opposite)
    expect(stitchedItems.some(item => item.id === state.topology.segments[0]!.id)).toBe(true)
    expect(stitchedItems.filter(item => item.renderKind === 'anchor')).toHaveLength(0)
    expect(anchorItems.filter(item => item.renderKind === 'anchor').map(item => item.id)).toEqual([state.runs[0]!.startAnchor!.id, state.runs[0]!.endAnchor!.id])
    for (const [side, items] of [[stitchedSide, stitchedItems], [opposite, anchorItems]] as const) {
      await exportArtworkPng({ side, items })
      expect(calls.render).toHaveBeenLastCalledWith(items, null, null, '#000000', null)
    }
    expect(serializeThreadArtwork(state)).toBe(before)
  })

  it.each(['front', 'back'] as const)('passes %s canonical items unchanged, with no interactive state', async side => {
    const items = Object.freeze([{ id: 'canonical-item' }]) as unknown as readonly Stitch[]
    const blob = await exportArtworkPng({ side, items })
    expect(blob.type).toBe('image/png')
    expect(calls.construct).toHaveBeenCalledWith(side, { maxDevicePixelRatio: 1 })
    expect(calls.render).toHaveBeenCalledExactlyOnceWith(items, null, null, '#000000', null)
    expect(canvas.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/png')
    expect(calls.destroy).toHaveBeenCalledTimes(1)
    expect(remove).toHaveBeenCalledTimes(1)
    expect(canvas.width).toBe(0)
    expect(canvas.height).toBe(0)
    expect(canvas.style.cssText).toContain('visibility:hidden')
  })
  it.each([255, 2049, 512.5, NaN, Infinity])('rejects unsafe dimension %s before allocation', async size => {
    await expect(exportArtworkPng({ side: 'front', items: [], size })).rejects.toThrow(RangeError)
    expect(append).not.toHaveBeenCalled()
  })
  it('accepts bounded explicit dimensions', async () => {
    Object.defineProperties(canvas, { clientWidth: { value: 256 }, clientHeight: { value: 256 } })
    await exportArtworkPng({ side: 'front', items: [], size: 256 })
    expect(canvas.style.cssText).toContain('width:256px')
  })
  it('rejects unavailable layout and cleans up', async () => {
    Object.defineProperty(canvas, 'clientWidth', { value: 0 })
    await expect(exportArtworkPng({ side: 'front', items: [] })).rejects.toThrow('layout')
    expect(remove).toHaveBeenCalledTimes(1)
    expect(calls.construct).not.toHaveBeenCalled()
  })
  it('cleans up if canonical rendering throws', async () => {
    calls.render.mockImplementationOnce(() => { throw new Error('render failed') })
    await expect(exportArtworkPng({ side: 'front', items: [] })).rejects.toThrow('render failed')
    expect(calls.destroy).toHaveBeenCalledTimes(1)
    expect(remove).toHaveBeenCalledTimes(1)
  })
  it.each(['null', 'wrong-type', 'throw'])('rejects %s encoding and disposes canvas', async failure => {
    canvas.toBlob = callback => {
      if (failure === 'throw') throw new Error('encoding exception')
      callback(failure === 'null' ? null : new Blob(['wrong'], { type: 'image/jpeg' }))
    }
    await expect(exportArtworkPng({ side: 'back', items: [] })).rejects.toThrow()
    expect(calls.destroy).toHaveBeenCalledTimes(1)
    expect(remove).toHaveBeenCalledTimes(1)
    expect(canvas.width).toBe(0)
  })
  it('composes front left and back right with fixed pair dimensions and cleanup', async () => {
    const drawImage = vi.fn()
    const canvases = Array.from({ length: 3 }, () => ({ ...canvas, style: { cssText: '' }, remove: vi.fn(), getContext: () => ({ ...contextStub(), drawImage }) }))
    let cursor = 0
    vi.stubGlobal('document', { createElement: () => canvases[cursor++], body: { appendChild: append } })
    let encodedSize: number[] = []
    canvases[2].toBlob = callback => { encodedSize = [canvases[2].width, canvases[2].height]; callback(new Blob(['PNG'], { type: 'image/png' })) }
    const front = [{ id: 'front' }] as Stitch[], back = [{ id: 'back' }] as Stitch[]
    await exportArtworkPairPng(front, back)
    expect(calls.render.mock.calls.map(call => call[0])).toEqual([front, back])
    expect(calls.construct.mock.calls.map(call => call[0])).toEqual(['front', 'back'])
    expect(drawImage.mock.calls).toEqual([[canvases[0], 0, 0], [canvases[1], 1024, 0]])
    expect(encodedSize).toEqual([2048, 1024])
    expect(canvases.every(c => c.width === 0 && c.height === 0)).toBe(true)
  })
})
