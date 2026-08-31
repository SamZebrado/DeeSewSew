import { expect, test } from '@playwright/test'

test('app shell reloads and remains stitchable with the network offline', async ({ page, context }) => {
  await page.goto('./')
  await page.evaluate(() => localStorage.clear())
  await page.evaluate(async () => { await navigator.serviceWorker.ready })
  await page.reload()
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true)
  await page.locator('#custom-color').fill('#1a9c8d')
  await page.getByRole('button', { name: 'Add color' }).click()
  await page.getByRole('button', { name: /Stitch motion/ }).click()

  await context.setOffline(true)
  const offlineProbe = await page.evaluate(async () => ({
    controlled: Boolean(navigator.serviceWorker.controller),
    caches: await caches.keys(),
    root: await fetch(location.href).then((response) => response.status).catch(() => -1),
  }))
  expect(offlineProbe.controlled).toBe(true)
  expect(offlineProbe.caches.length).toBeGreaterThan(0)
  expect(offlineProbe.root).toBe(200)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'DeeSewSew' })).toBeVisible()
  await expect(page.getByRole('radio', { name: 'Custom #1A9C8D' })).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByRole('button', { name: /Stitch motion/ })).toHaveAttribute('aria-pressed', 'false')
  const canvas = page.locator('#embroidery')
  await canvas.scrollIntoViewIfNeeded()
  const box = await canvas.boundingBox()
  if (!box) throw new Error('Canvas missing offline')
  await page.touchscreen.tap(box.x + box.width * .35, box.y + box.height * .42 + 34)
  await page.touchscreen.tap(box.x + box.width * .62, box.y + box.height * .50 + 34)
  await expect(page.locator('#status-title')).toHaveText('Thread settled')
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('deesewsew-piece-v1') ?? '{"stitches":[]}').stitches.at(-1)?.color)).toBe('#1a9c8d')
  await page.screenshot({ path: 'review/evidence/screenshots/offline-stitchable.png', fullPage: true })
  await context.setOffline(false)
})
