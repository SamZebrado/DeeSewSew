import { expect, test } from '@playwright/test'
test('Shift drag rotates, releasing Shift cannot puncture, normal pointer resumes', async ({ page }) => {
  await page.goto('./')
  const hoop = page.locator('#hoop-shell')
  const box = (await hoop.boundingBox())!
  await page.mouse.move(box.x + box.width * .4, box.y + box.height * .5)
  await page.keyboard.down('Shift'); await page.mouse.down()
  await page.mouse.move(box.x + box.width * .55, box.y + box.height * .52, { steps: 10 })
  expect(Number(await hoop.getAttribute('data-yaw'))).toBeGreaterThan(20)
  await page.keyboard.up('Shift'); await page.mouse.up()
  expect(await page.evaluate(() => localStorage.getItem('deesewsew-piece-v1'))).toBeNull()
  await page.locator('#view-front').click()
  await hoop.scrollIntoViewIfNeeded()
  const restored = (await hoop.boundingBox())!
  await page.mouse.click(restored.x + restored.width * .4, restored.y + restored.height * .5)
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('deesewsew-piece-v1')!).punctures.length)).toBe(1)
})
test('real two-touch 1→2→1 rotates and suppresses trailing contact', async ({ page, context }) => {
  await page.goto('./')
  const hoop = page.locator('#hoop-shell'), box = (await hoop.boundingBox())!
  const client = await context.newCDPSession(page)
  const a = { id: 1, x: box.x + box.width * .35, y: box.y + box.height * .5 }
  const b = { id: 2, x: box.x + box.width * .55, y: box.y + box.height * .5 }
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [a] })
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [a, b] })
  for (let i = 1; i <= 8; i++) await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...a, x: a.x + i * 8 }, { ...b, x: b.x + i * 8 }] })
  expect(Number(await hoop.getAttribute('data-yaw'))).toBeGreaterThan(10)
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [b] })
  const yaw = await hoop.getAttribute('data-yaw')
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...b, x: b.x + 40 }] })
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect(hoop).toHaveAttribute('data-yaw', yaw!)
  expect(await page.evaluate(() => localStorage.getItem('deesewsew-piece-v1'))).toBeNull()
  await page.locator('#view-front').click()
  await hoop.scrollIntoViewIfNeeded()
  const restored = (await hoop.boundingBox())!
  await page.touchscreen.tap(restored.x + restored.width * .35, restored.y + restored.height * .5)
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('deesewsew-piece-v1')!).punctures.length)).toBe(1)
  await client.detach()
})
