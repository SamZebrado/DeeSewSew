import { expect, test } from 'vitest'
import { looseThreadPath, sampleThreadPath, splitThreadPath, tightenThreadPath, tighteningWeight, type CubicThreadPath } from './thread-path'
import { needlePose } from './needle-pose'

test('tightening is exactly the visible start and exact settled cubic at the end', () => {
  let maxErrorPx = 0
  for (const length of [.02, .3, .7]) for (const bend of [-.025, 0, .025]) {
    const a = { x: .2, y: .35 }, b = { x: .2 + length, y: .45 }
    const final: CubicThreadPath = [a, { x: a.x + length / 3, y: a.y + bend }, { x: b.x - length / 3, y: b.y + bend }, b]
    const loose = looseThreadPath([a, { x: .3, y: .65 }, { x: .5, y: .25 }, needlePose(b).eye])
    expect(tightenThreadPath(loose, final, 0)).toEqual(loose)
    const finish = tightenThreadPath(loose, final, 1)
    for (let index = 0; index < finish.length; index++) for (let step = 0; step <= 20; step++) {
      const actual = sampleThreadPath(finish[index]!, step / 20)
      const expected = sampleThreadPath(final, (index + step / 20) / finish.length)
      maxErrorPx = Math.max(maxErrorPx, Math.hypot(actual.x - expected.x, actual.y - expected.y) * 640)
    }
  }
  expect(maxErrorPx).toBeLessThan(.000001)
  console.info(JSON.stringify({ geometryScaleCssPx: 640, maxErrorPx, scope: 'exact cubic evaluator, not raster or human evidence' }))
})
test('thread eye differs from hit tip and stays on the needle shaft', () => {
  const pose = needlePose({ x: .6, y: .4 })
  expect(pose.eye).not.toEqual(pose.tip)
  expect(Math.hypot(pose.eye.x - pose.tip.x, pose.eye.y - pose.tip.y)).toBeCloseTo(.075 * .86)
})

test('one monotonic front tightens the pulled end first and preserves far slack', () => {
  for (let step = 0; step <= 100; step++) {
    const p = step / 100
    expect(tighteningWeight(.1, p)).toBeGreaterThanOrEqual(tighteningWeight(.9, p))
    if (step) for (const u of [0, .1, .5, .9, 1]) expect(tighteningWeight(u, p)).toBeGreaterThanOrEqual(tighteningWeight(u, p - .01))
  }
  expect(tighteningWeight(.1, .5)).toBe(1)
  expect(tighteningWeight(.9, .5)).toBe(0)
  const loose: CubicThreadPath = [{ x: .1, y: .4 }, { x: .2, y: .8 }, { x: .7, y: .8 }, { x: .9, y: .4 }]
  const goal: CubicThreadPath = [{ x: .1, y: .4 }, { x: .3, y: .4 }, { x: .6, y: .4 }, { x: .9, y: .4 }]
  const mid = tightenThreadPath([loose], goal, .5)
  const quarter = splitThreadPath(splitThreadPath(loose, .5)[0], .5)[0]
  expect(mid[0]).toEqual(quarter)
  expect(mid.at(-1)!.every(point => Math.abs(point.y - .4) < 1e-12)).toBe(true)
})

test('arc correspondence is insensitive to uneven original curve segmentation', () => {
  const curve: CubicThreadPath = [{ x: .1, y: .4 }, { x: .1, y: .8 }, { x: .8, y: .8 }, { x: .9, y: .4 }]
  const goal: CubicThreadPath = [{ x: .1, y: .4 }, { x: .3, y: .4 }, { x: .6, y: .4 }, { x: .9, y: .4 }]
  const uneven = splitThreadPath(curve, .02)
  const tightened = tightenThreadPath(uneven, goal, .5)
  // The tiny initial source span is near the OLD end, not half the thread.
  expect(tightened.slice(0, 4).every(part => part.some(point => point.y > .4))).toBe(true)
  expect(tightenThreadPath(uneven, goal, 0)).toEqual(uneven)
  expect(tightenThreadPath(uneven, goal, 1)).toEqual([goal])
})

test('absolute-progress evaluation is independent of 30/60/120 Hz history', () => {
  const loose = looseThreadPath([{ x: .2, y: .3 }, { x: .3, y: .7 }, { x: .8, y: .4 }])
  const goal: CubicThreadPath = [{ x: .2, y: .3 }, { x: .4, y: .3 }, { x: .6, y: .4 }, { x: .8, y: .4 }]
  const samples = [30, 60, 120].map(hz => {
    const checkpoints: CubicThreadPath[][] = []
    for (let frame = 0; frame <= hz; frame++) {
      const paths = tightenThreadPath(loose, goal, frame / hz)
      if (frame % (hz / 5) === 0) checkpoints.push(paths)
    }
    return checkpoints
  })
  expect(samples[1]).toEqual(samples[0]); expect(samples[2]).toEqual(samples[0])
})

test('one-sided geometric limits have no subpixel handoff jump', () => {
  const loose = looseThreadPath([{ x: .2, y: .4 }, { x: .3, y: .8 }, { x: .6, y: .6 }, { x: .85, y: .4 }])
  const goal: CubicThreadPath = [{ x: .2, y: .4 }, { x: .4, y: .4 }, { x: .6, y: .4 }, { x: .8, y: .4 }]
  const exactSubdivisions = loose.flatMap(curve => splitThreadPath(curve, .5).flatMap(half => splitThreadPath(half, .5)))
  const initial = tightenThreadPath(loose, goal, 1e-6)
  const maximumStartError = Math.max(...initial.flatMap((curve, i) => curve.map((point, j) => Math.hypot(point.x - exactSubdivisions[i]![j]!.x, point.y - exactSubdivisions[i]![j]!.y))))
  expect(maximumStartError * 760).toBeLessThan(.5)
  const almostFinal = tightenThreadPath(loose, goal, 1 - 1e-6)
  expect(Math.max(...almostFinal.flatMap(curve => curve.map(point => Math.abs(point.y - .4)))) * 760).toBeLessThan(.5)
  expect(tightenThreadPath(loose, goal, 1)).toEqual([goal])
})
