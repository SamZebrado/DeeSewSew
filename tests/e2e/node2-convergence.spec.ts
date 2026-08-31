import { mkdir, writeFile } from 'node:fs/promises'
import { expect, test, type Page } from '@playwright/test'

const evidenceDir = 'review/node2-evidence'

async function canvasBox(page: Page) {
  const canvas = page.locator('#embroidery')
  await canvas.scrollIntoViewIfNeeded()
  const box = await canvas.boundingBox()
  if (!box) throw new Error('Embroidery canvas has no bounding box')
  return { canvas, box }
}

async function clickNormalized(page: Page, x: number, y: number): Promise<void> {
  const { box } = await canvasBox(page)
  await page.mouse.click(box.x + box.width * x, box.y + box.height * y)
}

async function savedStitches(page: Page): Promise<Record<string, unknown>[]> {
  return page.evaluate(() => JSON.parse(localStorage.getItem('deesewsew-piece-v1') ?? '{"stitches":[]}').stitches)
}

test.beforeEach(async ({ page }) => {
  await mkdir(evidenceDir, { recursive: true })
  await page.goto('./')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test('captures exact Node 2 view states, touch drag, stable stops, and lifecycle-safe rotation', async ({ page, context }) => {
  await page.evaluate(() => {
    localStorage.setItem('deesewsew-piece-v1', JSON.stringify({
      schemaVersion: 1,
      nextOrder: 4,
      stitches: [
        { id: 'stitch-1', type: 'back', start: { x: .24, y: .33 }, end: { x: .72, y: .42 }, color: '#b9403c', width: 4.2, order: 1, seed: 101 },
        { id: 'stitch-2', type: 'running', start: { x: .66, y: .38 }, end: { x: .35, y: .70 }, color: '#425f86', width: 3.8, order: 2, seed: 202 },
        { id: 'stitch-3', type: 'back', start: { x: .30, y: .63 }, end: { x: .73, y: .60 }, color: '#55765b', width: 4.2, order: 3, seed: 303 },
      ],
    }))
  })
  await page.reload()
  const hoop = page.locator('#hoop-shell')
  const rotate = page.locator('#rotate-view')

  await hoop.press('Home')
  await expect(hoop).toHaveAttribute('data-yaw', '0.000')
  await page.screenshot({ path: `${evidenceDir}/hoop-front.png`, fullPage: true })

  for (let index = 0; index < 3; index += 1) await hoop.press('ArrowRight')
  await expect(hoop).toHaveAttribute('data-yaw', '45.000')
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  await page.screenshot({ path: `${evidenceDir}/hoop-45-degree.png`, fullPage: true })

  await hoop.focus()
  for (let index = 0; index < 2; index += 1) await hoop.press('ArrowRight')
  await expect(hoop).toHaveAttribute('data-yaw', '75.000')
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  await page.screenshot({ path: `${evidenceDir}/hoop-side.png`, fullPage: true })

  await hoop.focus()
  await hoop.press('End')
  await expect(hoop).toHaveAttribute('data-yaw', '180.000')
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  await page.screenshot({ path: `${evidenceDir}/hoop-back.png`, fullPage: true })

  await hoop.press('Home')
  const hoopBox = await hoop.boundingBox()
  if (!hoopBox) throw new Error('Hoop has no bounding box')
  const client = await context.newCDPSession(page)
  const start = { x: hoopBox.x + hoopBox.width * .96, y: hoopBox.y + hoopBox.height * .50 }
  const end = { x: hoopBox.x + hoopBox.width * .72, y: hoopBox.y + hoopBox.height * .40 }
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: start.x, y: start.y, id: 7 }] })
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: end.x, y: end.y, id: 7 }] })
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect(hoop).not.toHaveAttribute('data-yaw', '0.000')
  const touchYaw = await hoop.getAttribute('data-yaw')
  await page.waitForTimeout(100)
  expect(await hoop.getAttribute('data-yaw')).toBe(touchYaw)

  await page.getByRole('button', { name: 'Return front' }).click()
  await rotate.click()
  await expect.poll(async () => Number(await hoop.getAttribute('data-yaw')), { timeout: 2_000 }).toBeGreaterThan(20)
  await page.getByRole('button', { name: /Stop rotation/ }).click()
  const stoppedYaw = await hoop.getAttribute('data-yaw')
  await page.waitForTimeout(150)
  expect(await hoop.getAttribute('data-yaw')).toBe(stoppedYaw)
  await page.screenshot({ path: `${evidenceDir}/hoop-arbitrary-stopped.png`, fullPage: true })

  await rotate.click()
  await page.waitForTimeout(120)
  await client.send('Page.setWebLifecycleState', { state: 'frozen' })
  await page.waitForTimeout(180)
  await client.send('Page.setWebLifecycleState', { state: 'active' })
  const beforeResume = Number(await hoop.getAttribute('data-yaw'))
  await page.waitForTimeout(500)
  const afterResume = Number(await hoop.getAttribute('data-yaw'))
  const resumedDelta = (afterResume - beforeResume + 360) % 360
  expect(resumedDelta).toBeGreaterThan(5)
  expect(resumedDelta).toBeLessThan(20)
  await page.getByRole('button', { name: /Stop rotation/ }).click()
})

test('puncture animation interruption, reload, and off mode preserve deterministic topology', async ({ page }) => {
  await clickNormalized(page, .34, .40)
  await expect(page.locator('#embroidery')).toHaveAttribute('data-motion-state', 'running')
  await page.getByRole('button', { name: /Undo last puncture/ }).click()
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('deesewsew-piece-v1') ?? '{}').punctures?.length ?? 0)).toBe(0)
  await page.waitForTimeout(1_250)
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('deesewsew-piece-v1') ?? '{}').punctures?.length ?? 0)).toBe(0)

  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await clickNormalized(page, .32, .39)
  await expect(page.locator('#embroidery')).toHaveAttribute('data-motion-state', 'running')
  await page.reload()
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('deesewsew-piece-v1') ?? '{}').punctures?.length)).toBe(1)
  await expect(page.locator('#hoop-shell')).toHaveAttribute('data-needle-side', 'back')
  await expect(page.locator('#embroidery')).toHaveAttribute('data-motion-state', 'idle')

  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await clickNormalized(page, .31, .38)
  await expect(page.locator('#embroidery')).toHaveAttribute('data-motion-state', 'idle', { timeout: 2_000 })
  const animatedTopology = await page.evaluate(() => JSON.parse(localStorage.getItem('deesewsew-piece-v1') ?? '{}'))
  const animatedPixels = await page.locator('#embroidery').evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL())

  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.getByRole('button', { name: /Stitch motion/ }).click()
  await clickNormalized(page, .31, .38)
  const immediateTopology = await page.evaluate(() => JSON.parse(localStorage.getItem('deesewsew-piece-v1') ?? '{}'))
  const immediatePixels = await page.locator('#embroidery').evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL())
  expect(immediateTopology).toEqual(animatedTopology)
  expect(immediatePixels).toBe(animatedPixels)
})

test('custom colors survive malformed optional settings, switching, history, reload, and legacy pieces', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem('deesewsew-settings-v2', JSON.stringify({
      schemaVersion: 2,
      motionEnabled: false,
      customColors: ['bad', '#ABCDEF', '#abcdef'],
      selectedColor: '#ABCDEF',
      needleDiameter: { version: 99, diameterMm: -1 },
      unknownFutureField: { safeToIgnore: true },
    }))
    localStorage.setItem('deesewsew-piece-v1', JSON.stringify({
      schemaVersion: 1,
      nextOrder: 2,
      stitches: [{ id: 'stitch-1', type: 'back', start: { x: .3, y: .4 }, end: { x: .6, y: .5 }, color: '#b9403c', width: 4.2, order: 1, seed: 42 }],
    }))
  })
  await page.reload()
  await expect(page.getByRole('radio', { name: 'Custom #ABCDEF' })).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByRole('button', { name: /Undo last puncture/ })).toBeEnabled()

  await page.locator('#custom-color').fill('#123456')
  await page.getByRole('button', { name: 'Add color' }).click()
  await expect(page.getByRole('radio', { name: 'Custom #123456' })).toHaveAttribute('aria-checked', 'true')
  await page.getByRole('radio', { name: 'Poppy' }).click()
  await expect(page.getByRole('radio', { name: 'Poppy' })).toHaveAttribute('aria-checked', 'true')
  await page.getByRole('radio', { name: 'Custom #123456' }).click()
  await clickNormalized(page, .42, .34)
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('deesewsew-piece-v1') ?? '{}').punctures[0].color)).toBe('#123456')
  await page.getByRole('button', { name: /Undo last puncture/ }).click()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('deesewsew-piece-v1') ?? '{}').punctures)).toHaveLength(0)
  await page.getByRole('button', { name: /Redo last puncture/ }).click()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('deesewsew-piece-v1') ?? '{}').punctures)).toHaveLength(1)
  await page.reload()
  await expect(page.getByRole('radio', { name: 'Custom #123456' })).toHaveAttribute('aria-checked', 'true')
})

test('1,000 settled segments plus one active soft thread remain interactively bounded', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.goto('./')
  await page.evaluate(() => {
    const punctures = Array.from({ length: 1_001 }, (_, index) => {
      const order = index + 1
      const angle = order * .41
      const radius = .12 + (order % 7) * .035
      const fromSide = order % 2 === 1 ? 'front' : 'back'
      return { id: `puncture-${order}`, position: { x: .5 + Math.cos(angle) * radius, y: .5 + Math.sin(angle) * radius }, fromSide, toSide: fromSide === 'front' ? 'back' : 'front', order, seed: order * 101, type: order % 3 ? 'running' : 'back', color: order % 2 ? '#b9403c' : '#425f86' }
    })
    const segments = punctures.slice(1).map((puncture, index) => ({ id: `segment-${puncture.order}`, startPunctureId: punctures[index]!.id, endPunctureId: puncture.id, start: punctures[index]!.position, end: puncture.position, side: puncture.fromSide, order: puncture.order, type: puncture.type, color: puncture.color, width: puncture.type === 'back' ? 4.2 : 3.8, seed: puncture.order * 103 }))
    localStorage.setItem('deesewsew-piece-v1', JSON.stringify({ schemaVersion: 3, nextOrder: 1_002, needle: { side: 'back', position: punctures.at(-1)!.position, lastPunctureId: punctures.at(-1)!.id }, punctures, segments, legacyFrontStitches: [] }))
  })
  const startedAt = Date.now()
  await page.reload()
  await expect(page.locator('#embroidery')).toBeVisible()
  const initialLoadMs = Date.now() - startedAt
  const rotateStartedAt = Date.now()
  await page.locator('#rotate-view').click()
  await page.waitForTimeout(500)
  await page.getByRole('button', { name: /Stop rotation/ }).click()
  const rotateStopMs = Date.now() - rotateStartedAt
  await page.getByRole('button', { name: 'Return front' }).click()
  const hoop = page.locator('#hoop-shell')
  await expect(hoop).toHaveAttribute('data-target-mode', 'hidden')
  await hoop.scrollIntoViewIfNeeded()
  const box = await hoop.boundingBox()
  if (!box) throw new Error('Stress hoop has no box')
  const previewStartedAt = Date.now()
  for (const [x, y] of [[.38, .46], [.46, .62], [.55, .65], [.62, .54]]) {
    await page.mouse.move(box.x + box.width * x, box.y + box.height * y, { steps: 4 })
  }
  await page.waitForTimeout(120)
  const previewMs = Date.now() - previewStartedAt
  const activePointCount = Number(await hoop.getAttribute('data-active-thread-points'))
  const activeSag = Number(await hoop.getAttribute('data-active-thread-sag'))
  const activeLoopStarts = Number(await hoop.getAttribute('data-active-thread-loop-starts'))
  const commitStartedAt = Date.now()
  await page.mouse.click(box.x + box.width * .62, box.y + box.height * .54)
  const commitMs = Date.now() - commitStartedAt
  const undoStartedAt = Date.now()
  await page.getByRole('button', { name: 'Undo last puncture' }).click()
  const undoMs = Date.now() - undoStartedAt
  const countersBeforeReload = await page.locator('#embroidery-back').evaluate((canvas) => (canvas as unknown as Record<string, unknown>).__deesewsewRendererCounters)
  const reloadStartedAt = Date.now()
  await page.reload()
  const reloadMs = Date.now() - reloadStartedAt
  const countersAfterReload = await page.locator('#embroidery-back').evaluate((canvas) => (canvas as unknown as Record<string, unknown>).__deesewsewRendererCounters)
  const report = { method: 'Playwright wall-clock around real Chrome operations; 1,000 settled Node 3 surface segments plus one bounded active soft thread and hidden-side continuation', initialLoadMs, rotateStopMs, previewMs, commitMs, undoMs, reloadMs, activePointCount, activeSag, activeLoopStarts, countersBeforeReload, countersAfterReload, pageErrors }
  await writeFile(`${evidenceDir}/performance-1000-segments.json`, `${JSON.stringify(report, null, 2)}\n`)
  expect(pageErrors).toEqual([])
  expect(initialLoadMs).toBeLessThan(5_000)
  expect(rotateStopMs).toBeLessThan(2_000)
  expect(previewMs).toBeLessThan(1_500)
  expect(activePointCount).toBe(10)
  expect(activeSag).toBeGreaterThan(0)
  expect(activeLoopStarts).toBeLessThan(8)
  expect(commitMs).toBeLessThan(1_500)
  expect(undoMs).toBeLessThan(1_500)
  expect(reloadMs).toBeLessThan(5_000)
})

test('advanced experiments have no public DOM, storage, query, shortcut, or remote-network entry point', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem('force', 'firm')
    localStorage.setItem('gyro', 'true')
    localStorage.setItem('free-mode', 'true')
  })
  await page.goto('./?force=firm&pressure=1&gyro=1&topology=1&freeMode=1')
  const audit = await page.evaluate(() => ({
    visibleText: document.body.innerText,
    controls: [...document.querySelectorAll('button,input,select,[role="button"],[role="slider"]')].map((element) => ({
      id: element.id,
      name: element.getAttribute('name'),
      label: element.getAttribute('aria-label'),
      text: element.textContent,
      data: [...element.attributes].filter((attribute) => attribute.name.startsWith('data-')).map((attribute) => `${attribute.name}=${attribute.value}`),
    })),
    resources: performance.getEntriesByType('resource').map((entry) => entry.name),
  }))
  const serializedControls = JSON.stringify(audit.controls)
  for (const forbidden of ['pressure', 'tilt', 'needle size', 'thread diameter', 'penetration', 'topology', 'gyroscope', 'free mode', 'split layer', 'touch deformation']) {
    expect(audit.visibleText.toLowerCase()).not.toContain(forbidden)
    expect(serializedControls.toLowerCase()).not.toContain(forbidden)
  }
  expect(audit.resources.every((resource) => new URL(resource).origin === new URL(page.url()).origin)).toBe(true)
})
