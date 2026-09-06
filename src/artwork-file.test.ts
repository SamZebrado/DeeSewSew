import { expect, test } from 'vitest'
import { emptyEmbroideryPiece, parseArtworkFile, punctureFabric, serializeEmbroideryPiece, undoTopology, createTopologyHistory } from './embroidery-topology'
const style = { type: 'running' as const, color: '#b9403c' }
const piece = punctureFabric(punctureFabric(emptyEmbroideryPiece(), { x: .3, y: .4 }, style).piece, { x: .6, y: .6 }, style).piece
test('file round trip, next real puncture, and undo order gaps remain valid', () => {
  expect(parseArtworkFile(serializeEmbroideryPiece(piece))).toEqual(piece)
  const undo = undoTopology(createTopologyHistory(piece)).present
  const imported = parseArtworkFile(serializeEmbroideryPiece(undo))
  expect(() => serializeEmbroideryPiece(punctureFabric(imported, { x: .4, y: .5 }, style).piece)).not.toThrow()
})
test('strict legacy migration preserves front only and reserves future canonical IDs', () => {
  const legacy = { schemaVersion: 1, nextOrder: 2, stitches: [{ id: 'stitch-1', order: 1, seed: 123, type: 'running', start: { x: .3, y: .4 }, end: { x: .6, y: .6 }, color: '#b9403c', width: 3.8 }] }
  const migrated = parseArtworkFile(JSON.stringify(legacy))
  expect(migrated.segments).toEqual([]); expect(migrated.legacyFrontStitches).toHaveLength(1)
  legacy.stitches[0]!.id = 'puncture-100'
  expect(() => parseArtworkFile(JSON.stringify(legacy))).toThrow()
})
test('reject malformed, future, unsafe topology and resource attacks without empty fallback', () => {
  for (const raw of ['null', '{}', '{', '{"schemaVersion":4}', '[]']) expect(() => parseArtworkFile(raw)).toThrow()
  const variants = [
    (p: typeof piece) => { p.punctures[0]!.id = '__proto__' },
    (p: typeof piece) => { p.punctures[1]!.id = p.punctures[0]!.id },
    (p: typeof piece) => { p.punctures[0]!.position = { x: .01, y: .01 } },
    (p: typeof piece) => { p.nextOrder = 2 },
    (p: typeof piece) => { p.nextOrder = Number.MAX_SAFE_INTEGER },
    (p: typeof piece) => { p.segments[0]!.width = 1e200 },
    (p: typeof piece) => { p.punctures[0]!.seed = .5 },
    (p: typeof piece) => { p.segments[0]!.endPunctureId = 'unknown' },
  ]
  for (const mutate of variants) { const bad = structuredClone(piece); mutate(bad); expect(() => parseArtworkFile(JSON.stringify(bad))).toThrow() }
})
