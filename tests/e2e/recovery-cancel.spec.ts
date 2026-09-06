import { expect, test } from '@playwright/test'

test('Escape releases an acquired pointer before a later pointerup', async ({ page }) => {
  await page.goto('./')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  const hoop = page.locator('#hoop-shell')
  await hoop.scrollIntoViewIfNeeded()
  const box = await hoop.boundingBox()
  if (!box) throw new Error('Missing hoop')
  await page.mouse.move(box.x + box.width * .4, box.y + box.height * .45)
  await page.mouse.down()
  await page.keyboard.press('Escape')
  await page.mouse.up()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('deesewsew-piece-v1') ?? '{"punctures":[]}').punctures.length)).toBe(0)
  await expect(hoop).toHaveAttribute('data-active-thread-points', '0')
})

for (const interruption of ['pointercancel', 'lostpointercapture', 'blur', 'hidden', 'undo']) {
  test(`${interruption} cancels ownership before stale pointerup`, async ({ page }) => {
    await page.goto('./')
    const hoop = page.locator('#hoop-shell')
    await hoop.scrollIntoViewIfNeeded()
    const box = await hoop.boundingBox()
    if (!box) throw new Error('Missing hoop')
    await page.mouse.move(box.x + box.width * .4, box.y + box.height * .45)
    await page.mouse.down()
    if (interruption === 'undo') await page.keyboard.press('Control+z')
    else await page.evaluate(kind => {
      const shell = document.querySelector('#hoop-shell')!
      if (kind === 'blur') window.dispatchEvent(new Event('blur'))
      else if (kind === 'hidden') {
        Object.defineProperty(document, 'hidden', { configurable: true, value: true })
        document.dispatchEvent(new Event('visibilitychange'))
      } else shell.dispatchEvent(new PointerEvent(kind, { pointerId: 1, bubbles: true }))
    }, interruption)
    await page.mouse.up()
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('deesewsew-piece-v1') ?? '{"punctures":[]}').punctures.length)).toBe(0)
  })
}
