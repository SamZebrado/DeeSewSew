import { expect, test } from 'vitest'
import { createActiveThread, retargetActiveThread, resetActiveThreadClock, stepActiveThread } from './active-thread'
const anchor = { x: .3, y: .4 }, target = { x: .7, y: .6 }
function simulate(dt: number) {
  let state = createActiveThread(anchor, target)
  for (let time = 0; time < 3000 - .00001; time += dt) state = stepActiveThread(state, Math.min(dt, 3000 - time))
  return state
}
test('equal simulation time converges identically at 30/60/120 Hz', () => {
  const reference = simulate(1000 / 60)
  for (const hz of [30, 120]) {
    const state = simulate(1000 / hz)
    const error = Math.max(...state.points.map((point, index) => Math.hypot(point.x - reference.points[index]!.x, point.y - reference.points[index]!.y)))
    expect(error).toBeLessThan(.00001)
  }
})
test('jitter, huge delta, and pause clock are bounded', () => {
  let state = createActiveThread(anchor, target)
  let time = 0, frame = 0
  while (time < 3000) {
    const dt = Math.min([7, 29, 13, 18, 33][frame++ % 5]!, 3000 - time)
    state = stepActiveThread(state, dt)
    time += dt
  }
  expect(state.points).toEqual(simulate(1000 / 60).points)
  const reset = resetActiveThreadClock(state)
  expect(reset.accumulatorMs).toBe(0)
  expect(stepActiveThread(reset, 60_000).points).toEqual(stepActiveThread(reset, 100).points)
  expect(stepActiveThread(reset, Infinity)).toEqual(reset)
})
test('zero delta never advances simulation', () => {
  const state = createActiveThread(anchor, target)
  expect(stepActiveThread(state, 0)).toEqual(state)
})
test('retarget pins endpoint before a simulation frame', () => {
  const state = createActiveThread(anchor, target)
  const next = { x: .4, y: .7 }
  const moved = retargetActiveThread(state, next)
  expect(moved.points.at(-1)).toEqual(next)
  expect(moved.points[3]).toEqual(state.points[3])
})
