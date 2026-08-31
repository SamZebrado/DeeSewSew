import { describe, expect, it } from 'vitest'
import {
  ACTIVE_THREAD_MAX_POINTS,
  ACTIVE_THREAD_MIN_POINTS,
  activeThreadSag,
  createActiveThread,
  retargetActiveThread,
  snapshotActiveThread,
  stepActiveThread,
  tightenActiveThread,
} from './active-thread'

const A = { x: .28, y: .36 }
const B = { x: .68, y: .48 }

describe('bounded active soft thread', () => {
  it('starts at the puncture, ends at the pointer, and includes mild deterministic slack', () => {
    const first = createActiveThread(A, B)
    const second = createActiveThread(A, B)
    expect(first).toEqual(second)
    expect(first.points[0]).toEqual(A)
    expect(first.points.at(-1)).toEqual(B)
    expect(first.points.length).toBeGreaterThanOrEqual(ACTIVE_THREAD_MIN_POINTS)
    expect(first.points.length).toBeLessThanOrEqual(ACTIVE_THREAD_MAX_POINTS)
    expect(activeThreadSag(first.points, A, B)).toBeGreaterThan(.005)
  })

  it('retargets the free endpoint while internal points lag along the prior path', () => {
    const initial = createActiveThread(A, B)
    const movedTarget = { x: .44, y: .72 }
    const stepped = stepActiveThread(retargetActiveThread(initial, movedTarget), 16.67)
    expect(stepped.points[0]).toEqual(A)
    expect(stepped.points.at(-1)).toEqual(movedTarget)
    expect(stepped.points[5]).not.toEqual(createActiveThread(A, movedTarget).points[5])
  })

  it('remains finite and bounded through rapid pointer changes', () => {
    let state = createActiveThread(A, B, { pointCount: 999 })
    for (let frame = 0; frame < 300; frame += 1) {
      state = retargetActiveThread(state, { x: .5 + Math.sin(frame * .31) * .28, y: .5 + Math.cos(frame * .23) * .25 })
      state = stepActiveThread(state, frame % 7 === 0 ? 40 : 16.67)
    }
    expect(state.points).toHaveLength(ACTIVE_THREAD_MAX_POINTS)
    expect(state.points.flatMap((point) => [point.x, point.y]).every(Number.isFinite)).toBe(true)
  })

  it('tightens from the exact current shape to the canonical endpoints without teleporting', () => {
    const current = snapshotActiveThread(stepActiveThread(createActiveThread(A, B), 16.67))!
    expect(tightenActiveThread(current, A, B, 0)).toEqual(current)
    const half = tightenActiveThread(current, A, B, .5)
    expect(half[0]).toEqual(A)
    expect(half.at(-1)).toEqual(B)
    const settled = tightenActiveThread(current, A, B, 1)
    expect(activeThreadSag(settled, A, B)).toBeCloseTo(0, 8)
  })

  it('uses restrained motion in reduced-motion mode and resets safely', () => {
    const regular = createActiveThread(A, B)
    const reduced = createActiveThread(A, B, { reducedMotion: true })
    expect(activeThreadSag(reduced.points, A, B)).toBeLessThan(activeThreadSag(regular.points, A, B))
    const reset = createActiveThread(A, B, { reducedMotion: true })
    expect(stepActiveThread(reset, Number.NaN).points.flatMap((point) => [point.x, point.y]).every(Number.isFinite)).toBe(true)
  })
})
