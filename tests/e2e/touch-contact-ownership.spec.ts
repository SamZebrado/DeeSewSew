import { expect, test } from '@playwright/test'

for (const ending of ['outside-first', 'inside-first', 'cancel-all'] as const) {
  test(`outside second finger cancels the pending puncture: ${ending}`, async ({ page, context }) => {
    await page.goto('./')
    const hoop = page.locator('#hoop-shell')
    const box = (await hoop.boundingBox())!
    const inside = { id: 1, x: box.x + box.width * .5, y: box.y + box.height * .5 }
    const outside = { id: 2, x: 5, y: 5 }
    const client = await context.newCDPSession(page)
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [inside] })
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [inside, outside] })
    if (ending === 'cancel-all') {
      await client.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] })
    } else {
      await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [ending === 'outside-first' ? inside : outside] })
      await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    }
    expect(await page.evaluate(() => localStorage.getItem('deesewsew-piece-v1'))).toBeNull()
    const next = (await hoop.boundingBox())!
    await page.touchscreen.tap(next.x + next.width * .5, next.y + next.height * .5)
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('deesewsew-piece-v1')!).punctures.length)).toBe(1)
    await client.detach()
  })
}
