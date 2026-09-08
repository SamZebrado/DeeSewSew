import { expect, test } from 'vitest'
import { adoptThreadRuns, emptyThreadRuns, endThreadRun, punctureThreadRun, startThreadAt } from './thread-runs'
import { parseThreadArtwork, serializeThreadArtwork } from './thread-run-storage'
import { createThreadHistory, undoThreadHistory, redoThreadHistory } from './thread-run-history'
import { emptyEmbroideryPiece, punctureFabric } from './embroidery-topology'

const red = { type: 'running' as const, color: '#9b4a48' }
test.each(['front', 'back'] as const)('explicit %s setup is mirrored, serializable and reversible after reload', visibleSide => {
  const before = endThreadRun(punctureThreadRun(emptyThreadRuns(), {x:.3,y:.3}, red))
  const started = startThreadAt(before, visibleSide, {x:.4,y:.4}, red)
  expect(started.topology.needle.side).toBe(visibleSide)
  expect(started.topology.segments).toHaveLength(0)
  expect(started.runs.at(-1)!.startAnchor!.side).not.toBe(visibleSide)
  const loaded = parseThreadArtwork(serializeThreadArtwork(started))
  const undone = undoThreadHistory(createThreadHistory(loaded))
  expect(undone.present.topology.needle).toEqual(before.topology.needle)
  expect(undone.present.runs).toEqual(before.runs)
  expect(redoThreadHistory(undone).present).toEqual(loaded)
  const finished = endThreadRun(punctureThreadRun(loaded, {x:.6,y:.5}, red))
  expect(finished.topology.segments[0]!.side).toBe(visibleSide)
  expect(finished.runs.at(-1)!.endAnchor!.side).not.toBe(visibleSide)
  expect(parseThreadArtwork(serializeThreadArtwork(finished))).toEqual(finished)
  expect(() => startThreadAt(started, visibleSide, {x:.6,y:.5}, red)).toThrow(/Cut/)
})
test('same-color separate runs have distinct identity and no connecting segment', () => {
  let state = emptyThreadRuns()
  state = punctureThreadRun(state, { x: .3, y: .4 }, red)
  state = punctureThreadRun(state, { x: .4, y: .4 }, red)
  const needle = state.topology.needle, first = state.runs[0]
  state = endThreadRun(state)
  expect(state.topology.needle).toEqual(needle)
  expect(state.activeRunId).toBeNull()
  expect(endThreadRun(state)).toBe(state)
  state = punctureThreadRun(state, { x: .6, y: .6 }, red)
  expect(state.topology.segments).toHaveLength(1)
  state = punctureThreadRun(state, { x: .7, y: .6 }, red)
  expect(state.topology.segments).toHaveLength(2)
  expect(state.runs).toHaveLength(2)
  expect(state.runs[1]!.id).not.toBe(first!.id)
  expect(state.topology.segments[1]!.start).toEqual({ x: .6, y: .6 })
})

test('color change creates an explicit boundary without recoloring history', () => {
  let state = punctureThreadRun(emptyThreadRuns(), { x: .3, y: .4 }, red)
  state = punctureThreadRun(state, { x: .4, y: .4 }, red)
  const before = JSON.stringify(state.topology.segments)
  state = punctureThreadRun(state, { x: .6, y: .6 }, { ...red, color: '#55765b' })
  expect(JSON.stringify(state.topology.segments)).toBe(before)
  expect(state.runs[0]!.endOrder).not.toBeNull()
  expect(state.runs[1]!.color).toBe('#55765b')
  expect(state.runs[1]!.segmentIds).toEqual([])
})

test('no ghost run on end without a puncture; legacy adoption preserves source exactly', () => {
  const empty = emptyThreadRuns()
  expect(endThreadRun(empty)).toBe(empty)
  let piece = punctureFabric(emptyEmbroideryPiece(), { x: .3, y: .3 }, red).piece
  piece = punctureFabric(piece, { x: .4, y: .4 }, { ...red, color: '#55765b' }).piece
  const before = JSON.stringify(piece), adopted = adoptThreadRuns(piece)
  expect(adopted.topology).toBe(piece)
  expect(JSON.stringify(adopted.topology)).toBe(before)
  expect(adopted.runs[0]!.provenance).toBe('legacy-v3-unverified')
  expect(adopted.runs[0]!.color).toBeNull()
})
