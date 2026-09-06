import { expect, test } from '@playwright/test'
test('direct mouse needle follows outside without puncturing; hidden needle stays hidden', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('./')
  const hoop = page.locator('#hoop-shell'), overlay = page.locator('#floating-needle')
  const box = (await hoop.boundingBox())!
  await page.mouse.move(box.x + box.width * .5, box.y + box.height * .5)
  await page.mouse.move(12, box.y + box.height * .5, { steps: 10 })
  await expect(overlay).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('deesewsew-piece-v1'))).toBeNull()
  await page.mouse.move(box.x + box.width * .5, box.y + box.height * .5, { steps: 10 })
  await expect(overlay).toBeHidden()
  expect(await page.evaluate(() => localStorage.getItem('deesewsew-piece-v1'))).toBeNull()
  await page.mouse.click(box.x + box.width * .5, box.y + box.height * .5)
  await page.waitForTimeout(700)
  await page.mouse.move(12, box.y + box.height * .5)
  await expect(overlay).toBeHidden()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('deesewsew-piece-v1')!).punctures.length)).toBe(1)
  expect(errors).toEqual([])
})
