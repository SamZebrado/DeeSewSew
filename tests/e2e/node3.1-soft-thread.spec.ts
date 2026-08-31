import { mkdir } from 'node:fs/promises'
import { expect, test, type Page } from '@playwright/test'

const evidenceDir = 'review/node3.1-evidence'

async function storedPiece(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('deesewsew-piece-v1') ?? '{}'))
}

async function projectedClient(page: Page, point: { x: number; y: number }) {
  const hoop = page.locator('#hoop-shell')
  await hoop.scrollIntoViewIfNeeded()
  return hoop.evaluate((shell, target) => {
    const rect = shell.getBoundingClientRect()
    const size = Math.min(rect.width, rect.height)
    const perspective = Number.parseFloat(getComputedStyle(shell).perspective)
    const yaw = Number((shell as HTMLElement).dataset.yaw) * Math.PI / 180
    const pitch = Number((shell as HTMLElement).dataset.pitch) * Math.PI / 180
    const x = (target.x - .5) * size
    const y = (target.y - .5) * size
    const transformedX = Math.cos(yaw) * x
    const transformedY = Math.sin(pitch) * Math.sin(yaw) * x + Math.cos(pitch) * y
    const transformedZ = -Math.cos(pitch) * Math.sin(yaw) * x + Math.sin(pitch) * y
    const scale = perspective / (perspective - transformedZ)
    return { x: rect.left + rect.width / 2 + transformedX * scale, y: rect.top + rect.height / 2 + transformedY * scale }
  }, point)
}

async function moveNeedle(page: Page, points: { x: number; y: number }[]) {
  for (const point of points) {
    const client = await projectedClient(page, point)
    await page.mouse.move(client.x, client.y, { steps: 5 })
    await page.waitForTimeout(35)
  }
}

async function punctureAt(page: Page, point: { x: number; y: number }, count: number) {
  const client = await projectedClient(page, point)
  await page.mouse.click(client.x, client.y)
  await expect.poll(async () => (await storedPiece(page)).punctures?.length).toBe(count)
}

test.beforeEach(async ({ page }) => {
  await mkdir(evidenceDir, { recursive: true })
  await page.goto('./')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test('continuous no-flip stitching keeps true topology and tightens the current soft path', async ({ page }) => {
  test.setTimeout(45_000)
  const hoop = page.locator('#hoop-shell')
  const front = page.locator('#embroidery')
  const back = page.locator('#embroidery-back')
  const A = { x: .30, y: .38 }
  const B = { x: .64, y: .46 }
  const C = { x: .46, y: .68 }
  const D = { x: .68, y: .62 }

  await punctureAt(page, A, 1)
  await expect(hoop).toHaveAttribute('data-visible-side', 'front')
  await expect(hoop).toHaveAttribute('data-needle-side', 'back')
  await expect(hoop).toHaveAttribute('data-target-mode', 'hidden')
  expect((await storedPiece(page)).segments).toHaveLength(0)
  await page.screenshot({ path: `${evidenceDir}/hidden-01-after-first-puncture.png`, fullPage: true })

  await moveNeedle(page, [{ x: .40, y: .55 }, { x: .54, y: .58 }, B])
  await expect(hoop).toHaveAttribute('data-active-thread-points', '10')
  await expect(hoop).toHaveAttribute('data-target-mode', 'hidden')
  await expect(page.locator('#edit-state')).toContainText('Choose back-side emergence')
  await page.screenshot({ path: `${evidenceDir}/hidden-02-emergence-target.png`, fullPage: true })
  await punctureAt(page, B, 2)
  let saved = await storedPiece(page)
  expect(saved.segments).toHaveLength(1)
  expect(saved.segments[0]).toMatchObject({ side: 'back', start: A, end: B })
  await expect(hoop).toHaveAttribute('data-visible-side', 'front')
  await expect(hoop).toHaveAttribute('data-needle-side', 'front')
  await expect(hoop).toHaveAttribute('data-target-mode', 'direct')
  await page.screenshot({ path: `${evidenceDir}/hidden-03-needle-emerged.png`, fullPage: true })

  await moveNeedle(page, [{ x: .56, y: .40 }])
  await page.screenshot({ path: `${evidenceDir}/loose-01-near.png`, fullPage: true })
  await moveNeedle(page, [{ x: .64, y: .54 }])
  await page.screenshot({ path: `${evidenceDir}/loose-02-far.png`, fullPage: true })
  await moveNeedle(page, [{ x: .58, y: .70 }, C])
  await expect.poll(async () => Number(await hoop.getAttribute('data-active-thread-sag'))).toBeGreaterThan(.002)
  await page.screenshot({ path: `${evidenceDir}/loose-03-sagging-pre-puncture.png`, fullPage: true })
  const prePuncture = await front.evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL())
  await punctureAt(page, C, 3)
  saved = await storedPiece(page)
  expect(saved.segments.map((segment: { side: string }) => segment.side)).toEqual(['back', 'front'])
  await expect(front).toHaveAttribute('data-motion-phase', 'tighten')
  const midTightening = await front.evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL())
  expect(midTightening).not.toBe(prePuncture)
  await page.screenshot({ path: `${evidenceDir}/loose-04-mid-tightening.png`, fullPage: true })
  await expect(front).toHaveAttribute('data-motion-phase', 'idle', { timeout: 2_000 })
  await page.screenshot({ path: `${evidenceDir}/loose-05-settled.png`, fullPage: true })

  await punctureAt(page, D, 4)
  saved = await storedPiece(page)
  expect(saved.segments.map((segment: { side: string }) => segment.side)).toEqual(['back', 'front', 'back'])
  await expect(hoop).toHaveAttribute('data-visible-side', 'front')
  await page.screenshot({ path: `${evidenceDir}/hidden-04-several-without-flip.png`, fullPage: true })

  await page.getByRole('button', { name: 'Snap back' }).click()
  await expect(hoop).toHaveAttribute('data-visible-side', 'back')
  expect((await storedPiece(page)).segments.filter((segment: { side: string }) => segment.side === 'back')).toHaveLength(2)
  await expect(back).toHaveAttribute('aria-disabled', 'false')
  await page.screenshot({ path: `${evidenceDir}/hidden-05-real-backside-paths.png`, fullPage: true })
})

test('pending hidden path survives a flip and supports mixed direct backside work', async ({ page }) => {
  const hoop = page.locator('#hoop-shell')
  await punctureAt(page, { x: .30, y: .40 }, 1)
  await moveNeedle(page, [{ x: .44, y: .57 }, { x: .62, y: .52 }])
  const pointsBefore = await hoop.getAttribute('data-active-thread-points')
  const startsBefore = Number(await hoop.getAttribute('data-active-thread-loop-starts'))
  await page.getByRole('button', { name: 'Snap back' }).click()
  await expect(hoop).toHaveAttribute('data-target-mode', 'direct')
  await expect(hoop).toHaveAttribute('data-active-thread-points', pointsBefore!)
  await punctureAt(page, { x: .62, y: .52 }, 2)
  expect((await storedPiece(page)).segments[0].side).toBe('back')

  await moveNeedle(page, Array.from({ length: 24 }, (_, index) => ({ x: .62 - index * .006, y: .52 + Math.sin(index * .35) * .08 })))
  const startsAfter = Number(await hoop.getAttribute('data-active-thread-loop-starts'))
  expect(startsAfter - startsBefore).toBeLessThan(6)
  await punctureAt(page, { x: .48, y: .62 }, 3)
  expect((await storedPiece(page)).segments.map((segment: { side: string }) => segment.side)).toEqual(['back', 'front'])
  await page.screenshot({ path: `${evidenceDir}/mixed-01-flip-preserved-path.png`, fullPage: true })

  await moveNeedle(page, [{ x: .66, y: .46 }])
  await punctureAt(page, { x: .66, y: .46 }, 4)
  await page.getByRole('button', { name: 'Return front' }).click()
  await moveNeedle(page, [{ x: .72, y: .58 }])
  await punctureAt(page, { x: .72, y: .58 }, 5)
  const mixed = await storedPiece(page)
  expect(mixed.segments.map((segment: { side: string }) => segment.side)).toEqual(['back', 'front', 'back', 'front'])
  await page.getByRole('button', { name: 'Undo last puncture' }).click()
  await expect(page.locator('#embroidery')).toHaveAttribute('data-motion-phase', 'idle')
  expect((await storedPiece(page)).punctures).toHaveLength(4)
  await page.getByRole('button', { name: 'Redo last puncture' }).click()
  expect((await storedPiece(page)).punctures).toHaveLength(5)
  await page.reload()
  expect((await storedPiece(page)).segments.map((segment: { side: string }) => segment.side)).toEqual(['back', 'front', 'back', 'front'])
})

test('motion off and reduced motion retain live soft targeting without post-hoc flourish', async ({ page }) => {
  const hoop = page.locator('#hoop-shell')
  const motion = page.getByRole('button', { name: /Stitch motion/ })
  await motion.click()
  await punctureAt(page, { x: .32, y: .40 }, 1)
  await moveNeedle(page, [{ x: .46, y: .56 }, { x: .64, y: .50 }])
  await expect(hoop).toHaveAttribute('data-active-thread-points', '10')
  await punctureAt(page, { x: .64, y: .50 }, 2)
  await expect(page.locator('#embroidery-back')).toHaveAttribute('data-motion-state', 'off')
  expect((await storedPiece(page)).segments[0].side).toBe('back')

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.reload()
  await moveNeedle(page, [{ x: .48, y: .66 }])
  await expect(hoop).toHaveAttribute('data-active-thread-points', '10')
  expect(Number(await hoop.getAttribute('data-active-thread-sag'))).toBeLessThan(.012)
  await punctureAt(page, { x: .48, y: .66 }, 3)
  await expect(page.locator('#embroidery')).toHaveAttribute('data-motion-state', 'off')
})

test('visibility pause and resume preserve the active thread without duplicate RAF loops', async ({ page }) => {
  const hoop = page.locator('#hoop-shell')
  await punctureAt(page, { x: .32, y: .40 }, 1)
  await moveNeedle(page, [{ x: .46, y: .56 }, { x: .64, y: .50 }])
  await expect(hoop).toHaveAttribute('data-active-thread-points', '10')
  const startsBefore = Number(await hoop.getAttribute('data-active-thread-loop-starts'))

  await page.evaluate(() => {
    let simulatedHidden = true
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => simulatedHidden })
    document.dispatchEvent(new Event('visibilitychange'))
    simulatedHidden = false
    document.dispatchEvent(new Event('visibilitychange'))
    document.dispatchEvent(new Event('visibilitychange'))
  })

  await expect.poll(async () => Number(await hoop.getAttribute('data-active-thread-loop-starts'))).toBe(startsBefore + 1)
  await expect(hoop).toHaveAttribute('data-active-thread-points', '10')
  expect((await storedPiece(page)).punctures).toHaveLength(1)
})

test('touch selects hidden emergence without flipping and cancel removes transient thread', async ({ page, context }) => {
  const hoop = page.locator('#hoop-shell')
  const client = await context.newCDPSession(page)
  const touch = async (type: 'touchStart' | 'touchMove', point: { x: number; y: number }, id: number) => {
    const projected = await projectedClient(page, point)
    await client.send('Input.dispatchTouchEvent', { type, touchPoints: [{ x: projected.x, y: projected.y, id }] })
  }
  await touch('touchStart', { x: .32, y: .46 }, 21)
  await touch('touchMove', { x: .38, y: .54 }, 21)
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect.poll(async () => (await storedPiece(page)).punctures?.length).toBe(1)
  await expect(hoop).toHaveAttribute('data-target-mode', 'hidden')

  await touch('touchStart', { x: .50, y: .48 }, 22)
  await touch('touchMove', { x: .64, y: .57 }, 22)
  await expect(hoop).toHaveAttribute('data-active-thread-points', '10')
  await page.screenshot({ path: `${evidenceDir}/touch-01-hidden-target.png`, fullPage: true })
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect.poll(async () => (await storedPiece(page)).punctures?.length).toBe(2)
  expect((await storedPiece(page)).segments[0].side).toBe('back')
  await expect(hoop).toHaveAttribute('data-needle-side', 'front')

  await touch('touchStart', { x: .54, y: .50 }, 23)
  await touch('touchMove', { x: .60, y: .62 }, 23)
  await expect(hoop).toHaveAttribute('data-active-thread-points', '10')
  await client.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] })
  await expect(hoop).toHaveAttribute('data-active-thread-points', '0')
  expect((await storedPiece(page)).punctures).toHaveLength(2)

  const outside = await projectedClient(page, { x: .94, y: .94 })
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: outside.x, y: outside.y, id: 24 }] })
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  expect((await storedPiece(page)).punctures).toHaveLength(2)
})
