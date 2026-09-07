import { expect, test } from 'vitest'
import { heldNeedlePose } from './held-needle'
import { projectFabricPoint, inverseProjectFabricPoint } from './fabric-projection'
import { needlePassage } from './needle-pose'

const geometry = { centerX: 500, centerY: 400, size: 600, perspectivePx: 1000 }
for (const yawDeg of [0, 35, 180, 215]) test(`screen orientation and exact hotspot at yaw ${yawDeg}`, () => {
  const view = { yawDeg, pitchDeg: 12 }
  const angles: number[] = []
  for (const [x, y] of [[390, 290], [610, 290], [390, 510], [610, 510], [30, 400]]) {
    const tip = inverseProjectFabricPoint(x!, y!, view, geometry, true)!
    const pose = heldNeedlePose(tip, view, geometry)
    expect(pose.tip).toEqual(tip)
    const eye = projectFabricPoint(pose.eye, view, geometry)!
    const tail = projectFabricPoint(pose.tail, view, geometry)!
    expect(eye.clientY).toBeGreaterThan(y!)
    expect(Math.hypot(tail.clientX - x!, tail.clientY - y!)).toBeCloseTo(45, 8)
    expect(Math.hypot(eye.clientX - x!, eye.clientY - y!)).toBeCloseTo(45 * .86, 8)
    angles.push(Math.atan2(x! - eye.clientX, eye.clientY - y!))
    expect(needlePassage(pose, 0).pose).toEqual(pose)
    expect(needlePassage(pose, .000001).pose.eye).toEqual(pose.eye)
    expect(needlePassage(pose, 1).pose).toEqual(pose)
    expect(needlePassage(pose, .1).focus).toBe(0)
  }
  expect(Math.max(...angles) - Math.min(...angles)).toBeGreaterThan(.3)
})

test('near-center and opposing vectors remain continuous; handedness mirrors cleanly', () => {
  const view = { yawDeg: 0, pitchDeg: 0 }
  for (let y = .15; y < .8; y += .025) {
    let previous: number | undefined
    for (let x = .3; x < .7; x += .001) {
      const pose = heldNeedlePose({ x, y }, view, geometry)
      const angle = Math.atan2(pose.tip.x - pose.eye.x, pose.eye.y - pose.tip.y)
      if (previous !== undefined) expect(Math.abs(angle - previous)).toBeLessThan(.04)
      previous = angle
      const mirror = heldNeedlePose({ x: 1 - x, y }, view, geometry, -1)
      expect(mirror.eye.x).toBeCloseTo(1 - pose.eye.x, 10)
      expect(mirror.eye.y).toBeCloseTo(pose.eye.y, 10)
    }
  }
})
