import { expect, test } from '@playwright/test'
test.use({ video: 'on', viewport: { width: 1100, height: 900 } })
for (const preference of ['reduce', 'off'] as const) test(`directional motion respects ${preference} without blocking stitching`, async ({ page }) => {
  if (preference === 'reduce') await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('./')
  if (preference === 'off') await page.locator('#motion-toggle').click()
  const hoop = page.locator('#hoop-shell'), box = (await hoop.boundingBox())!
  for (const x of [.25, .7, .35]) await page.mouse.click(box.x + box.width * x, box.y + box.height * .45)
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('deesewsew-piece-v1')!).punctures.length)).toBe(3)
  await expect(page.locator('#embroidery')).toHaveAttribute('data-motion-state', 'off')
  await expect(hoop).toHaveAttribute('data-tail-transitions', '0')
})
test('continuous real pointer recording: long curved front/back, short and rapid threads', async ({ page }, testInfo) => {
  await page.goto('./')
  const hoop = page.locator('#hoop-shell'), box = (await hoop.boundingBox())!
  const move = async (x: number, y: number, steps = 1) => page.mouse.move(box.x + box.width * x, box.y + box.height * y, { steps })
  const puncture = async (x: number, y: number) => { await move(x, y); await page.mouse.down(); await page.mouse.up() }
  await puncture(.24, .4); await page.waitForTimeout(700)
  await page.locator('#view-back').click()
  // Back view reverses x; start and end remain inside the circular fabric.
  await move(.5, .72, 20); await page.waitForTimeout(180)
  await move(.25, .3, 16); await page.waitForTimeout(160)
  await page.screenshot({ path: testInfo.outputPath('back-loose.png') })
  await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(750)
  await page.locator('#view-front').click()
  await move(.52, .72, 20); await page.waitForTimeout(160)
  await move(.25, .28, 16); await page.waitForTimeout(180)
  await page.screenshot({ path: testInfo.outputPath('front-loose.png') })
  await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(750)
  await puncture(.3, .3); await page.waitForTimeout(750)
  for (let i = 0; i < 6; i++) { await puncture(i % 2 ? .3 : .65, .45 + (i % 3) * .05); await page.waitForTimeout(80) }
  await page.waitForTimeout(800)
  await expect(hoop).toHaveAttribute('data-tail-transitions', '0')
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('deesewsew-piece-v1')!).punctures.length)).toBe(10)
})
