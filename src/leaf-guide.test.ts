import { expect, test } from 'vitest'
import { LEAF, guideStep } from './leaf-guide'
import { commitPuncture, createTopologyHistory, punctureFabric, redoTopology, undoTopology } from './embroidery-topology'
test('guide uses only real punctures; undo and redo derive progress from topology', () => {
  let history = createTopologyHistory()
  const guide = { version: 1 as const, startOrder: 1, side: 'front' as const, color: '#55765b' }
  for (const [i, point] of LEAF.targets.entries()) {
    history = commitPuncture(history, punctureFabric(history.present, point, { type: 'running', color: guide.color }))
    expect(guideStep(history.present, guide)).toBe(i + 1)
    expect(history.present.segments.length).toBe(i)
  }
  history = undoTopology(history); expect(guideStep(history.present, guide)).toBe(LEAF.targets.length - 1)
  history = redoTopology(history); expect(guideStep(history.present, guide)).toBe(LEAF.targets.length)
})
