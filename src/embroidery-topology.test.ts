import { describe, expect, it } from 'vitest'
import { createStitch, emptyPiece } from './stitch-model'
import {
  commitPuncture,
  createTopologyHistory,
  deserializeEmbroideryPiece,
  emptyEmbroideryPiece,
  migrateLegacyPiece,
  punctureFabric,
  redoTopology,
  serializeEmbroideryPiece,
  topologyRenderStitches,
  undoTopology,
} from './embroidery-topology'

const A = { x: .30, y: .38 }
const B = { x: .62, y: .46 }
const C = { x: .48, y: .68 }
const style = { type: 'running' as const, color: '#b9403c' }

describe('needle-first surface topology', () => {
  it('alternates the persistent needle side and owns travel on the side that held the needle', () => {
    const first = punctureFabric(emptyEmbroideryPiece(), A, style)
    expect(first.puncture).toMatchObject({ fromSide: 'front', toSide: 'back' })
    expect(first.piece.needle).toMatchObject({ side: 'back', position: A, lastPunctureId: first.puncture.id })
    expect(first.segment).toBeNull()

    const second = punctureFabric(first.piece, B, style)
    expect(second.segment).toMatchObject({ side: 'back', start: A, end: B })
    expect(second.piece.needle.side).toBe('front')
    expect(topologyRenderStitches(second.piece, 'back')).toHaveLength(1)
    expect(topologyRenderStitches(second.piece, 'front')).toHaveLength(0)

    const third = punctureFabric(second.piece, C, style)
    expect(third.segment).toMatchObject({ side: 'front', start: B, end: C })
    expect(third.piece.needle.side).toBe('back')
    expect(topologyRenderStitches(third.piece, 'back').map((item) => [item.start, item.end])).toEqual([[A, B]])
    expect(topologyRenderStitches(third.piece, 'front').map((item) => [item.start, item.end])).toEqual([[B, C]])
  })

  it('undoes and redoes punctures with needle continuity and invalidates redo after a branch', () => {
    let history = createTopologyHistory()
    const first = punctureFabric(history.present, A, style)
    history = commitPuncture(history, first)
    const second = punctureFabric(history.present, B, style)
    history = commitPuncture(history, second)
    history = undoTopology(history)
    expect(history.present.needle).toMatchObject({ side: 'back', position: A })
    expect(history.present.segments).toHaveLength(0)
    history = redoTopology(history)
    expect(history.present.needle).toMatchObject({ side: 'front', position: B })
    expect(history.present.segments).toHaveLength(1)
    history = undoTopology(history)
    history = commitPuncture(history, punctureFabric(history.present, C, style))
    expect(redoTopology(history)).toBe(history)
    expect(history.present.segments[0]).toMatchObject({ side: 'back', start: A, end: C })
  })

  it('serializes and reloads current needle continuity deterministically', () => {
    const first = punctureFabric(emptyEmbroideryPiece(), A, style)
    const second = punctureFabric(first.piece, B, { type: 'back', color: '#1A9C8D' })
    expect(second.segment).toMatchObject({ type: 'back', width: 4.2, color: '#1a9c8d' })
    const serialized = serializeEmbroideryPiece(second.piece)
    const reloaded = deserializeEmbroideryPiece(serialized)
    expect(reloaded).toEqual(second.piece)
    expect(JSON.parse(serialized).stitches).toHaveLength(1)
  })

  it('preserves legacy Node 1/2 artwork on the front without fabricating a reverse', () => {
    const legacy = emptyPiece()
    legacy.stitches.push(createStitch(legacy, 'back', A, B, '#425f86'))
    const migrated = migrateLegacyPiece(legacy)
    expect(topologyRenderStitches(migrated, 'front')).toEqual(legacy.stitches)
    expect(topologyRenderStitches(migrated, 'back')).toEqual([])
    expect(migrated.needle).toEqual({ side: 'front', position: null, lastPunctureId: null })
    expect(deserializeEmbroideryPiece(JSON.stringify(legacy))).toEqual(migrated)
  })

  it('fails closed for malformed or contradictory topology', () => {
    const first = punctureFabric(emptyEmbroideryPiece(), A, style)
    const valid = punctureFabric(first.piece, B, style).piece
    const malformed = JSON.parse(serializeEmbroideryPiece(valid))
    malformed.punctures[0].toSide = 'front'
    expect(deserializeEmbroideryPiece(JSON.stringify(malformed))).toEqual(emptyEmbroideryPiece())
    const wrongNeedle = JSON.parse(serializeEmbroideryPiece(valid))
    wrongNeedle.needle.side = 'back'
    expect(deserializeEmbroideryPiece(JSON.stringify(wrongNeedle))).toEqual(emptyEmbroideryPiece())
    const falseSurface = JSON.parse(serializeEmbroideryPiece(valid))
    falseSurface.segments[0].side = 'front'
    expect(deserializeEmbroideryPiece(JSON.stringify(falseSurface))).toEqual(emptyEmbroideryPiece())
  })

  it('fails closed when canonical surface segment IDs are duplicated', () => {
    const first = punctureFabric(emptyEmbroideryPiece(), A, style)
    const second = punctureFabric(first.piece, B, style)
    const valid = punctureFabric(second.piece, C, style).piece
    const duplicateSegmentId = JSON.parse(serializeEmbroideryPiece(valid))
    duplicateSegmentId.segments[1].id = duplicateSegmentId.segments[0].id
    expect(deserializeEmbroideryPiece(JSON.stringify(duplicateSegmentId))).toEqual(emptyEmbroideryPiece())
  })

  it('ignores unknown future fields without weakening canonical invariants', () => {
    const first = punctureFabric(emptyEmbroideryPiece(), A, style)
    const serialized = JSON.parse(serializeEmbroideryPiece(first.piece))
    serialized.unknownFutureField = { safeToIgnore: true }
    serialized.punctures[0].futureVisual = 'optional'
    expect(deserializeEmbroideryPiece(JSON.stringify(serialized))).toEqual(first.piece)
  })
})
