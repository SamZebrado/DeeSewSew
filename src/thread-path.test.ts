import { expect, test } from 'vitest'
import { looseThreadPath, sampleThreadPath, tightenThreadPath, type CubicThreadPath } from './thread-path'
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
