import { expect, test } from 'vitest'
import { needlePassage, needlePose } from './needle-pose'
import { STITCH_MOTION_DURATION_MS } from './stitch-motion'
import { looseThreadPath, orientThreadPaths, tightenThreadPath, transportThreadEye, tighteningWeight, type CubicThreadPath } from './thread-path'

test('default eye is lower-right; tip, eye and shaft share passage geometry', () => {
  const pose = needlePose({ x: .5, y: .5 })
  expect(pose.eye.x).toBeGreaterThan(pose.tip.x); expect(pose.eye.y).toBeGreaterThan(pose.tip.y)
  const start = needlePassage(pose, 0)
  expect(start.pose).toEqual(pose)
  expect(start.sourceThreadEnd).toEqual(pose.eye)
  expect(start.destinationShaft).toBeNull()
  const tipFirst = needlePassage(pose, .2)
  expect(tipFirst.destinationShaft).not.toBeNull(); expect(tipFirst.destinationEyeVisible).toBe(false)
  expect(tipFirst.sourceThreadEnd).toEqual(tipFirst.pose.eye)
  const emerged = needlePassage(pose, .5)
  expect(emerged.destinationEyeVisible).toBe(true)
  expect(emerged.extraThread.length).toBeGreaterThanOrEqual(6)
  expect(emerged.extraThread.at(-1)).toEqual(emerged.pose.eye)
  expect(emerged.pull).toBe(0)
  const final = needlePassage(pose, 1)
  expect(final.pose).toEqual(needlePose(pose.tip, -Math.PI / 4))
  expect(final.extraThread.at(-1)).toEqual(final.pose.eye)
})

test('30/60/120 Hz sampling has identical shared-time poses and monotonic front progress', () => {
  const pose = needlePose({ x: .6, y: .4 })
  for (const hz of [30, 60, 120]) {
    let previous = 0
    for (let frame = 0; frame <= hz; frame++) {
      const elapsed = frame / hz * STITCH_MOTION_DURATION_MS
      const sample = needlePassage(pose, elapsed / STITCH_MOTION_DURATION_MS)
      expect(sample.pull).toBeGreaterThanOrEqual(previous); previous = sample.pull
      if (frame % (hz / 30) === 0) {
        const reference = needlePassage(pose, frame / hz)
        expect(sample.pull).toBeCloseTo(reference.pull, 12)
        for (const part of ['tip', 'eye', 'tail'] as const) {
          expect(sample.pose[part].x).toBeCloseTo(reference.pose[part].x, 12)
          expect(sample.pose[part].y).toBeCloseTo(reference.pose[part].y, 12)
        }
      }
    }
  }
})

test('thread follows actual eye until crossing; no first-frame endpoint jump', () => {
  const anchor = { x: .3, y: .7 }, pose = needlePose({ x: .6, y: .3 })
  const source = looseThreadPath([anchor, { x: .6, y: .7 }, pose.eye])
  expect(transportThreadEye(source, needlePassage(pose, 0).sourceThreadEnd)).toEqual(source)
  for (let i = 0; i <= 100; i++) {
    const sample = needlePassage(pose, i / 100)
    const moved = transportThreadEye(source, sample.sourceThreadEnd)
    expect(moved[0]![0]).toEqual(anchor)
    expect(moved.at(-1)![3]).toEqual(sample.sourceEyeVisible ? sample.pose.eye : pose.tip)
    if (sample.pull > 0) expect(sample.destinationEyeVisible).toBe(true)
  }
})

for (const [name, old, next] of [
  ['down', { x: .5, y: .25 }, { x: .5, y: .75 }],
  ['up', { x: .5, y: .75 }, { x: .5, y: .25 }],
  ['right', { x: .25, y: .5 }, { x: .75, y: .5 }],
  ['left', { x: .75, y: .5 }, { x: .25, y: .5 }],
] as const) test(`semantic NEW→OLD: ${name}, including reversed source and goal arrays`, () => {
  const eye = needlePose(next).eye
  const source = looseThreadPath([old, { x: .7, y: .7 }, eye])
  const goal: CubicThreadPath = [old, old, next, next]
  const semantics = { anchorHole: old, pulledHole: next, threadEye: eye }
  const reverse = (c: CubicThreadPath): CubicThreadPath => [c[3], c[2], c[1], c[0]]
  const reordered = orientThreadPaths([...source].reverse().map(reverse), reverse(goal), semantics)
  expect(reordered).toEqual({ loose: source, settled: goal })
  expect(tightenThreadPath(reordered.loose, reordered.settled, .5, semantics)).toEqual(tightenThreadPath(source, goal, .5, semantics))
  expect(tighteningWeight(0, .35)).toBe(1) // explicitly NEW
  expect(tighteningWeight(1, .35)).toBe(0) // explicitly OLD
  expect(tightenThreadPath(source, goal, 1, semantics)).toEqual([goal])
})
