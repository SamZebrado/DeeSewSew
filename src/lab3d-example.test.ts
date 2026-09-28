import { describe, expect, it } from 'vitest'
import { anchor, emptyLab, parseLab, serializeLab } from './lab3d-model'
import { threeBands } from './lab3d-example'

describe('optional three-band example', () => {
  it('creates three independent, closed, bounded runs with fixed colors', () => {
    const art = threeBands()
    expect(art.runs.map(r => r.id)).toEqual(['run-1', 'run-2', 'run-3'])
    expect(art.runs.map(r => r.color)).toEqual(['#9b4a48', '#456c68', '#ad782e'])
    expect(art.runs.every(r => r.state === 'completed' && r.anchors.length <= 32 && r.anchors.length === 17)).toBe(true)
    expect(art.activeRunId).toBeNull()
    for (const run of art.runs) {
      expect(run.anchors[0]).toEqual(run.anchors.at(-1))
      expect(run.anchors.every(p => Math.abs(Math.hypot(...p) - 1) < 1e-8)).toBe(true)
    }
    expect(parseLab(serializeLab(art))).toEqual(art)
  })
  it('preserves a custom support transform and never mutates its input', () => {
    const base = { ...emptyLab(), support: { ...emptyLab().support, transform: [2, -3, 4] as [number, number, number] } }
    const before = structuredClone(base)
    const result = threeBands(base)
    expect(base).toEqual(before)
    expect(result.support).toEqual(base.support)
    expect(result.runs[0]!.anchors[0]).toEqual([0, Math.sin(-.42), Math.cos(-.42)])
  })
  it('rejects occupied and removed support', () => {
    expect(() => threeBands(anchor(emptyLab(), [0, 0, 1]))).toThrow('empty installed')
    expect(() => threeBands({ ...emptyLab(), support: { ...emptyLab().support, state: 'removed' } })).toThrow('empty installed')
  })
})
