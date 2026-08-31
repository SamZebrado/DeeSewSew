import { mkdir } from 'node:fs/promises'
import { expect, test, type Page } from '@playwright/test'

const evidenceDir = 'review/node3-evidence'

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

async function punctureAt(page: Page, point: { x: number; y: number }, expectedCount: number) {
  const client = await projectedClient(page, point)
  await page.mouse.move(client.x, client.y)
  await page.mouse.click(client.x, client.y)
  await expect.poll(async () => (await storedPiece(page)).punctures?.length).toBe(expectedCount)
}

test.beforeEach(async ({ page }) => {
  await mkdir(evidenceDir, { recursive: true })
  await page.goto('./')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test('needle continuity creates true alternating front/back topology with visual evidence', async ({ page }) => {
  const hoop = page.locator('#hoop-shell')
  const frontCanvas = page.locator('#embroidery')
  const A = { x: .30, y: .38 }
  const B = { x: .62, y: .46 }
  const C = { x: .48, y: .68 }

  await expect(hoop).toHaveAttribute('data-needle-side', 'front')
  await expect(hoop).toHaveAttribute('data-needle-available', 'true')
  const blank = await frontCanvas.evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL())
  const aClient = await projectedClient(page, A)
  await page.mouse.move(aClient.x, aClient.y)
  await expect.poll(() => frontCanvas.evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL())).not.toBe(blank)
  await page.screenshot({ path: `${evidenceDir}/01-front-needle-follower.png`, fullPage: true })

  await page.mouse.click(aClient.x, aClient.y)
  await expect.poll(async () => (await storedPiece(page)).punctures?.length).toBe(1)
  await expect(hoop).toHaveAttribute('data-needle-side', 'back')
  await expect(hoop).toHaveAttribute('data-needle-available', 'false')
  expect((await storedPiece(page)).segments).toHaveLength(0)
  await page.screenshot({ path: `${evidenceDir}/02-first-puncture-front.png`, fullPage: true })

  await page.getByRole('button', { name: 'Snap back' }).click()
  await expect(hoop).toHaveAttribute('data-visible-side', 'back')
  await expect(hoop).toHaveAttribute('data-needle-side', 'back')
  await expect(hoop).toHaveAttribute('data-needle-available', 'true')
  await page.screenshot({ path: `${evidenceDir}/03-same-needle-on-back.png`, fullPage: true })
  const bClient = await projectedClient(page, B)
  await page.mouse.move(bClient.x, bClient.y)
  await page.screenshot({ path: `${evidenceDir}/04-backside-surface-travel.png`, fullPage: true })
  const settledBClient = await projectedClient(page, B)
  await page.mouse.click(settledBClient.x, settledBClient.y)
  await expect.poll(async () => (await storedPiece(page)).punctures?.length).toBe(2)
  let saved = await storedPiece(page)
  expect(saved.segments).toHaveLength(1)
  expect(saved.segments[0]).toMatchObject({ side: 'back', start: A, end: B })
  await expect(page.locator('#embroidery-back')).toHaveAttribute('data-motion-phase', 'idle', { timeout: 2_000 })
  await page.screenshot({ path: `${evidenceDir}/05-second-puncture-back.png`, fullPage: true })

  await page.getByRole('button', { name: 'Return front' }).click()
  await expect(hoop).toHaveAttribute('data-needle-side', 'front')
  await expect(hoop).toHaveAttribute('data-needle-available', 'true')
  await page.screenshot({ path: `${evidenceDir}/05b-front-after-second-no-duplicate.png`, fullPage: true })
  await punctureAt(page, C, 3)
  saved = await storedPiece(page)
  expect(saved.segments.map((segment: { side: string }) => segment.side)).toEqual(['back', 'front'])
  expect(saved.segments[1]).toMatchObject({ side: 'front', start: B })
  expect(saved.segments[1].end.x).toBeCloseTo(C.x, 6)
  expect(saved.segments[1].end.y).toBeCloseTo(C.y, 6)
  await expect(page.locator('#embroidery')).toHaveAttribute('data-motion-phase', 'idle', { timeout: 2_000 })
  await page.screenshot({ path: `${evidenceDir}/06-alternating-front-back.png`, fullPage: true })

  await page.reload()
  await expect(hoop).toHaveAttribute('data-needle-side', 'back')
  expect((await storedPiece(page)).segments.map((segment: { side: string }) => segment.side)).toEqual(['back', 'front'])
})

test('moderate angled inverse projection is editable while extreme angles explain inspect-only state', async ({ page }) => {
  const hoop = page.locator('#hoop-shell')
  const A = { x: .34, y: .42 }
  await punctureAt(page, A, 1)
  await page.getByRole('button', { name: 'Snap back' }).click()
  await hoop.focus()
  for (let index = 0; index < 3; index += 1) await hoop.press('ArrowRight')
  await expect(hoop).toHaveAttribute('data-yaw', '225.000')
  await expect(hoop).toHaveAttribute('data-interaction-state', 'editable')
  await expect(hoop).toHaveAttribute('data-needle-available', 'true')
  const B = { x: .63, y: .57 }
  await punctureAt(page, B, 2)
  const saved = await storedPiece(page)
  expect(saved.punctures[1].position.x).toBeCloseTo(B.x, 2)
  expect(saved.punctures[1].position.y).toBeCloseTo(B.y, 2)
  await expect(page.locator('#embroidery-back')).toHaveAttribute('data-motion-phase', 'idle', { timeout: 2_000 })
  await page.screenshot({ path: `${evidenceDir}/07-editable-moderate-angle.png`, fullPage: true })

  await hoop.press('Home')
  for (let index = 0; index < 2; index += 1) await hoop.press('ArrowRight')
  await expect(hoop).toHaveAttribute('data-yaw', '30.000')
  await expect(hoop).toHaveAttribute('data-interaction-state', 'editable')
  const C = { x: .43, y: .64 }
  await punctureAt(page, C, 3)
  const afterSecondAngle = await storedPiece(page)
  expect(afterSecondAngle.punctures[2].position.x).toBeCloseTo(C.x, 2)
  expect(afterSecondAngle.punctures[2].position.y).toBeCloseTo(C.y, 2)
  await page.screenshot({ path: `${evidenceDir}/07b-editable-second-moderate-angle.png`, fullPage: true })

  await hoop.press('Home')
  for (let index = 0; index < 5; index += 1) await hoop.press('ArrowRight')
  await expect(hoop).toHaveAttribute('data-yaw', '75.000')
  await expect(hoop).toHaveAttribute('data-interaction-state', 'inspect-only')
  await expect(page.locator('#edit-state')).toContainText('Inspect only')
  const before = (await storedPiece(page)).punctures.length
  const center = await projectedClient(page, { x: .5, y: .5 })
  await page.mouse.click(center.x, center.y)
  expect((await storedPiece(page)).punctures).toHaveLength(before)
  await page.screenshot({ path: `${evidenceDir}/08-inspect-only-extreme.png`, fullPage: true })
})

test('Auto Rotate stop immediately restores the angle-derived interaction state', async ({ page }) => {
  const hoop = page.locator('#hoop-shell')
  await page.locator('#rotate-view').click()
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: /Stop rotation/ }).click()
  await expect(hoop).toHaveAttribute('data-view-mode', 'manual')
  await expect(hoop).toHaveAttribute('data-interaction-state', 'editable')
  await expect(hoop).toHaveAttribute('data-needle-available', 'true')
  await punctureAt(page, { x: .43, y: .44 }, 1)
  await page.screenshot({ path: `${evidenceDir}/09-auto-stop-editable.png`, fullPage: true })

  await hoop.press('Home')
  for (let index = 0; index < 5; index += 1) await hoop.press('ArrowRight')
  await page.locator('#rotate-view').click()
  await page.waitForTimeout(80)
  await page.getByRole('button', { name: /Stop rotation/ }).click()
  await expect(hoop).toHaveAttribute('data-view-mode', 'manual')
  await expect(hoop).toHaveAttribute('data-interaction-state', 'inspect-only')
  await expect(page.locator('#status-title')).toHaveText('Inspect-only angle')
})

test('touch drag positions an offset target, release punctures, cancel is safe, and topology continues after rotation', async ({ page, context }) => {
  const hoop = page.locator('#hoop-shell')
  const client = await context.newCDPSession(page)
  const start = await projectedClient(page, { x: .34, y: .48 })
  const end = await projectedClient(page, { x: .40, y: .56 })
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: start.x, y: start.y, id: 7 }] })
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: end.x, y: end.y, id: 7 }] })
  await page.screenshot({ path: `${evidenceDir}/10-touch-target-preview.png`, fullPage: true })
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect.poll(async () => (await storedPiece(page)).punctures?.length).toBe(1)
  const touchPosition = (await storedPiece(page)).punctures[0].position
  expect(touchPosition.y).toBeLessThan(.56)
  await expect(hoop).toHaveAttribute('data-needle-side', 'back')
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: end.x, y: end.y, id: 11 }] })
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  expect((await storedPiece(page)).punctures).toHaveLength(1)

  await page.getByRole('button', { name: 'Snap back' }).click()
  const cancelPoint = await projectedClient(page, { x: .55, y: .45 })
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cancelPoint.x, y: cancelPoint.y, id: 8 }] })
  await client.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] })
  expect((await storedPiece(page)).punctures).toHaveLength(1)

  const backStart = await projectedClient(page, { x: .58, y: .53 })
  const backEnd = await projectedClient(page, { x: .64, y: .59 })
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: backStart.x, y: backStart.y, id: 9 }] })
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: backEnd.x, y: backEnd.y, id: 9 }] })
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect.poll(async () => (await storedPiece(page)).punctures?.length).toBe(2)
  expect((await storedPiece(page)).segments[0].side).toBe('back')
})
