import { describe, expect, it } from 'vitest'
import { canvasToNormalized, createStitch, deserializePiece, emptyPiece, isInsideFabric, normalizedToCanvas, serializePiece } from './stitch-model'
import { clearHistory, commit, createHistory, redo, undo } from './history'

describe('normalized embroidery geometry', () => {
  it('round trips canvas coordinates across resize', () => {
    const normalized = canvasToNormalized(120, 360, 600)
    expect(normalizedToCanvas(normalized, 900)).toEqual({ x: 180, y: 540 })
  })
  it('rejects points beyond the usable circular fabric', () => {
    expect(isInsideFabric({ x: .5, y: .5 })).toBe(true)
    expect(isInsideFabric({ x: .98, y: .5 })).toBe(false)
  })
})

describe('stitch creation', () => {
  it('creates stable ordered deterministic stitches', () => {
    const piece = emptyPiece()
    const first = createStitch(piece, 'back', { x: .2, y: .3 }, { x: .6, y: .7 }, '#123456')
    const second = createStitch(piece, 'back', { x: .3, y: .4 }, { x: .7, y: .8 }, '#123456')
    expect([first.id, second.id]).toEqual(['stitch-1', 'stitch-2'])
    expect(first.seed).toBe(createStitch(emptyPiece(), 'back', { x: .2, y: .3 }, { x: .6, y: .7 }, '#123456').seed)
  })
  it('leaves a physical underside gap for running stitch and keeps back stitch continuous', () => {
    const running = createStitch(emptyPiece(), 'running', { x: .2, y: .2 }, { x: .8, y: .2 }, '#000000')
    const back = createStitch(emptyPiece(), 'back', { x: .2, y: .2 }, { x: .8, y: .2 }, '#000000')
    expect(running.start.x).toBeGreaterThan(.2); expect(running.end.x).toBeLessThan(.8)
    expect(back.start.x).toBe(.2); expect(back.end.x).toBe(.8)
  })
})

describe('history and persistence', () => {
  it('undoes, redoes, invalidates the redo branch, and clears', () => {
    let history = commit(commit(createHistory<number>(), 1), 2)
    history = undo(history); expect(history).toEqual({ present: [1], future: [2] })
    history = redo(history); expect(history.present).toEqual([1, 2])
    history = undo(history); history = commit(history, 3); expect(history).toEqual({ present: [1, 3], future: [] })
    expect(clearHistory(history).present).toEqual([])
  })
  it('preserves layer order through serialization and fails closed on malformed data', () => {
    const piece = emptyPiece(); const stitch = createStitch(piece, 'back', { x: .2, y: .2 }, { x: .8, y: .8 }, '#000000'); piece.stitches.push(stitch)
    expect(deserializePiece(serializePiece(piece))).toEqual(piece)
    expect(deserializePiece('{broken')).toEqual(emptyPiece())
    expect(deserializePiece(JSON.stringify({ schemaVersion: 99, stitches: [] }))).toEqual(emptyPiece())
  })
})
