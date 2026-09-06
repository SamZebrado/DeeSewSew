import { expect, test } from '@playwright/test'
import { cpus, platform, release } from 'node:os'
import { writeFile } from 'node:fs/promises'
import { emptyEmbroideryPiece, punctureFabric, serializeEmbroideryPiece } from '../../src/embroidery-topology'
import { createActiveThread, retargetActiveThread, stepActiveThread } from '../../src/active-thread'
import { looseThreadPath, tightenThreadPath, type CubicThreadPath } from '../../src/thread-path'

test.use({ video: 'off' })
test('1000 canonical segments: solver CPU and browser frame/feedback proxy', async ({ page }, info) => {
  let piece = emptyEmbroideryPiece()
  for (let index = 0; index < 1001; index++) {
    const angle = index * .37
    piece = punctureFabric(piece, { x: .5 + Math.cos(angle) * .28, y: .5 + Math.sin(angle) * .28 }, { type: 'running', color: '#425f86' }).piece
  }
  expect(piece.segments).toHaveLength(1000)
  await page.addInitScript(raw => { if (!localStorage.getItem('deesewsew-piece-v1')) localStorage.setItem('deesewsew-piece-v1', raw) }, serializeEmbroideryPiece(piece))
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('./')
  await page.locator('#hoop-shell').scrollIntoViewIfNeeded()
  const browser = await page.evaluate(async () => {
    const shell = document.querySelector<HTMLElement>('#hoop-shell')!
    const rect = shell.getBoundingClientRect()
    const intervals: number[] = [], feedback: number[] = []
    let previous = 0, running = true
    const measureFrame = (now: number) => {
      if (previous) intervals.push(now - previous)
      previous = now
      if (running) requestAnimationFrame(measureFrame)
    }
    requestAnimationFrame(measureFrame)
    for (let frame = 0; frame < 180; frame++) {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
      const started = performance.now()
      shell.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId: 1, isPrimary: true, pointerType: 'mouse', clientX: rect.left + rect.width * (.5 + Math.sin(frame * .12) * .25), clientY: rect.top + rect.height * (.5 + Math.cos(frame * .13) * .25) }))
      await new Promise<void>(resolve => requestAnimationFrame(() => { feedback.push(performance.now() - started); resolve() }))
    }
    running = false
    shell.setPointerCapture = () => {}
    const options = { bubbles: true, pointerId: 1, isPrimary: true, pointerType: 'mouse', button: 0, clientX: rect.left + rect.width * .4, clientY: rect.top + rect.height * .45 }
    shell.dispatchEvent(new PointerEvent('pointerdown', options))
    const commitStarted = performance.now()
    shell.dispatchEvent(new PointerEvent('pointerup', options))
    const commitHandlerMs = performance.now() - commitStarted
    const undoStarted = performance.now()
    document.querySelector<HTMLButtonElement>('#undo')!.click()
    const undoHandlerMs = performance.now() - undoStarted
    return { intervals, feedback, commitHandlerMs, undoHandlerMs, userAgent: navigator.userAgent, viewport: [innerWidth, innerHeight], dpr: devicePixelRatio, rendererSize: rect.width }
  })
  const samples: number[] = []
  let rope = createActiveThread({ x: .3, y: .4 }, { x: .7, y: .5 })
  for (let index = 0; index < 4000; index++) {
    rope = retargetActiveThread(rope, { x: .5 + .25 * Math.sin(index * .1), y: .6 })
    const start = performance.now()
    rope = stepActiveThread(rope, 1000 / 60)
    if (index >= 1000) samples.push(performance.now() - start)
  }
  const percentile = (values: number[], q: number) => [...values].sort((a, b) => a - b)[Math.floor((values.length - 1) * q)]
  const loose = looseThreadPath(rope.points)
  const goal: CubicThreadPath = [{ x: .3, y: .4 }, { x: .4, y: .4 }, { x: .6, y: .5 }, { x: .7, y: .5 }]
  const frontSamples: number[] = []
  for (let i = 0; i < 2000; i++) {
    const started = performance.now()
    tightenThreadPath(loose, goal, (i % 99 + 1) / 100)
    if (i >= 500) frontSamples.push(performance.now() - started)
  }
  await writeFile(info.outputPath('tension-kernel-performance.json'), JSON.stringify({ nodeCpuP95Ms: percentile(frontSamples, .95), samples: frontSamples.length, looseCurves: loose.length, limitation: 'Pure geometry kernel in Node, not browser paint or device latency.' }, null, 2))
  expect(percentile(frontSamples, .95)).toBeLessThan(2)
  const report = { hardware: cpus()[0]?.model, platform: `${platform()} ${release()}`, recording: false, motion: true, segments: 1000, solverNodeCpuP95Ms: percentile(samples, .95), browser, nextRafFeedbackProxyP95Ms: percentile(browser.feedback, .95), browserFrameIntervalP95Ms: percentile(browser.intervals, .95), framesOver50Ms: browser.intervals.filter(dt => dt > 50).length, limitations: 'Solver measured in Node, not browser. Synthetic pointer event to next RAF is a feedback scheduling proxy, not hardware input-to-photon latency. Commit and undo are synchronous handler durations.', pageErrors: errors }
  await page.reload()
  const reloadNavigation = await page.evaluate(() => (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming).toJSON())
  const hoop = page.locator('#hoop-shell')
  await hoop.scrollIntoViewIfNeeded()
  const box = await hoop.boundingBox()
  if (!box) throw new Error('Missing hoop')
  await page.mouse.move(box.x + box.width * .55, box.y + box.height * .6)
  await expect(hoop).toHaveAttribute('data-thread-loop-state', 'idle', { timeout: 3100 })
  await writeFile(info.outputPath('performance.json'), JSON.stringify({ ...report, reloadNavigation, idleWithin3100Ms: true }, null, 2))
  expect(errors).toEqual([])
  expect(percentile(samples, .95)).toBeLessThan(2)
})
