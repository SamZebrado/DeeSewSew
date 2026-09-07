import { expect, test, vi } from 'vitest'
import { guideTargets, startGuide, guideStep, loadGuide, saveGuide, GUIDE_KEY } from './leaf-guide'
import { FLOWER } from './flower-pattern'
import { commitPuncture, createTopologyHistory, punctureFabric, redoTopology, undoTopology, emptyEmbroideryPiece } from './embroidery-topology'
test('guide uses only real punctures; undo and redo derive progress from topology', () => {
  let history = createTopologyHistory()
  const guide = startGuide(history.present, '#55765b')
  const targets = guideTargets(guide)
  expect(guideTargets(guide)).toBe(targets)
  for (const [i, point] of targets.entries()) {
    history = commitPuncture(history, punctureFabric(history.present, point, { type: 'running', color: guide.color }))
    expect(guideStep(history.present, guide)).toBe(i + 1)
    expect(history.present.segments.length).toBe(i)
  }
  history = undoTopology(history); expect(guideStep(history.present, guide)).toBe(targets.length - 1)
  history = redoTopology(history); expect(guideStep(history.present, guide)).toBe(targets.length)
})

const edgeKey = (a: { x: number; y: number }, b: { x: number; y: number }) => [JSON.stringify(a), JSON.stringify(b)].sort().join('|')
test('fixed route makes precisely the intended 20 front edges, with honest back parity', () => {
  const intended = FLOWER.frontEdges.map(([a, b]) => edgeKey(FLOWER.points[a]!, FLOWER.points[b]!)).sort()
  for (const existing of [0, 1, 2, 3]) {
    let piece = emptyEmbroideryPiece()
    for (let i = 0; i < existing; i++) piece = punctureFabric(piece, { x: .3 + i * .04, y: .3 }, { type: 'running', color: '#abcdef' }).piece
    const original = JSON.stringify(piece), guide = startGuide(piece, '#9b4a48'), targets = guideTargets(guide)
    const oldSegments = piece.segments.length
    const oldPunctures = piece.punctures.length
    for (const point of targets) {
      expect(Math.hypot(point.x - .5, point.y - .5)).toBeLessThan(.4)
      if (piece.needle.position) expect(Math.hypot(point.x - piece.needle.position.x, point.y - piece.needle.position.y)).toBeGreaterThan(.018)
      piece = punctureFabric(piece, point, { type: 'running', color: guide.color }).piece
    }
    const added = piece.segments.slice(oldSegments + (existing ? 1 : 0))
    expect(added.filter(s => s.side === 'front').map(s => edgeKey(s.start, s.end)).sort()).toEqual(intended)
    expect(piece.punctures.slice(0, oldPunctures)).toEqual(JSON.parse(original).punctures)
    expect(piece.segments.slice(0, oldSegments)).toEqual(JSON.parse(original).segments)
    expect(guideStep(piece, guide)).toBe(targets.length)
    for (let i = 1; i < added.length; i++) expect(added[i]!.side).not.toBe(added[i - 1]!.side)
  }
})
test('re-entry rotates pairs away from an existing hole without swapping faces', () => {
  for (const position of FLOWER.points) for (const side of ['front', 'back'] as const) {
    const piece = { ...emptyEmbroideryPiece(), needle: { side, position, lastPunctureId: null } }
    const guide = startGuide(piece, '#123456'), first = guideTargets(guide)[0]!
    expect(Math.hypot(first.x - position.x, first.y - position.y)).toBeGreaterThanOrEqual(.06)
    expect(guide.offset % 2).toBe(0)
  }
})
test('session persistence validates pattern/version and never mutates artwork', () => {
  const values = new Map<string, string>()
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) })
  try {
    const piece = emptyEmbroideryPiece(), before = JSON.stringify(piece), guide = startGuide(piece, '#123456')
    saveGuide(guide); expect(loadGuide(piece)).toEqual(guide)
    for (const override of [{ version: 1 }, { patternId: 'leaf' }, { offset: 1 }, { offset: 40 }, { startOrder: 100 }]) {
      values.set(GUIDE_KEY, JSON.stringify({ ...guide, ...override })); expect(loadGuide(piece)).toBeNull()
    }
    expect(JSON.stringify(piece)).toBe(before)
    saveGuide(null); expect(values.has(GUIDE_KEY)).toBe(false)
  } finally { vi.unstubAllGlobals() }
})
