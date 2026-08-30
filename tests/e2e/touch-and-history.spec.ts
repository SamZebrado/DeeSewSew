import { expect, test, type Page } from '@playwright/test'

const piece = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('deesewsew-piece-v1') ?? '{"stitches":[]}'))

test.beforeEach(async ({ page }) => {
  await page.goto('./')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test('real touch input anchors, previews, commits, rejects errors, and remains scroll-safe', async ({ page, context }) => {
  const canvas = page.locator('#embroidery')
  const box = await canvas.boundingBox()
  if (!box) throw new Error('Canvas has no bounding box')
  const point = (x: number, y: number) => ({ x: box.x + box.width * x, y: box.y + box.height * y + 34 })

  const first = point(.34, .40)
  await page.touchscreen.tap(first.x, first.y)
  await expect(page.locator('#status-title')).toHaveText('Needle point placed')
  await page.screenshot({ path: 'review/evidence/screenshots/touch-1-anchor.png', fullPage: true })

  const cdp = await context.newCDPSession(page)
  const second = point(.62, .48)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: second.x, y: second.y, id: 1 }] })
  const preview = point(.68, .54)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: preview.x, y: preview.y, id: 1 }] })
  await page.screenshot({ path: 'review/evidence/screenshots/touch-2-drag-preview.png', fullPage: true })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect(page.locator('#status-title')).toHaveText('Thread settled')
  await expect.poll(async () => (await piece(page)).stitches.length).toBe(1)
  await page.screenshot({ path: 'review/evidence/screenshots/touch-3-commit.png', fullPage: true })

  await page.touchscreen.tap(preview.x, preview.y)
  await expect(page.locator('#status-title')).toHaveText('A little farther')
  expect((await piece(page)).stitches).toHaveLength(1)

  await page.touchscreen.tap(box.x + 4, box.y + box.height / 2)
  expect((await piece(page)).stitches).toHaveLength(1)

  const cancelPoint = point(.55, .35)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cancelPoint.x, y: cancelPoint.y, id: 2 }] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] })
  await expect(page.locator('#status-title')).toHaveText('Ready to stitch')

  const scrollBefore = await page.evaluate(() => scrollY)
  await page.touchscreen.tap(first.x, first.y)
  for (let index = 0; index < 12; index += 1) {
    const next = point(.30 + (index % 4) * .12, .34 + Math.floor(index / 4) * .10)
    await page.touchscreen.tap(next.x, next.y)
  }
  expect((await piece(page)).stitches.length).toBeGreaterThanOrEqual(10)
  expect(await page.evaluate(() => scrollY)).toBe(scrollBefore)
  expect(await canvas.evaluate((element) => getComputedStyle(element).touchAction)).toBe('none')
})

test('production history invalidates redo after a new branch', async ({ page }) => {
  const canvas = page.locator('#embroidery')
  const box = await canvas.boundingBox()
  if (!box) throw new Error('Canvas has no bounding box')
  const click = (x: number, y: number) => page.mouse.click(box.x + box.width * x, box.y + box.height * y)
  await click(.35, .40); await click(.60, .42); await click(.55, .62)
  await page.getByRole('button', { name: 'Undo last stitch' }).click()
  await page.getByRole('button', { name: 'Redo last stitch' }).click()
  await page.getByRole('button', { name: 'Undo last stitch' }).click()
  await canvas.scrollIntoViewIfNeeded()
  const branchBox = await canvas.boundingBox()
  if (!branchBox) throw new Error('Canvas disappeared')
  await page.mouse.click(branchBox.x + branchBox.width * .70, branchBox.y + branchBox.height * .56)
  await page.mouse.click(branchBox.x + branchBox.width * .72, branchBox.y + branchBox.height * .70)
  await expect(page.locator('#status-title')).toHaveText('Thread settled')
  await expect.poll(async () => (await piece(page)).stitches.length).toBe(2)
  await expect(page.getByRole('button', { name: 'Redo last stitch' })).toBeDisabled()
  const saved = await piece(page)
  expect(saved.stitches.map((stitch: { id: string }) => stitch.id)).toEqual(['stitch-1', 'stitch-3'])
})
