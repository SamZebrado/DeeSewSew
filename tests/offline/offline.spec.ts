import { expect, test } from '@playwright/test'

test('app shell reloads and remains stitchable with the network offline', async ({ page, context }) => {
  await page.goto('./')
  await page.evaluate(() => localStorage.clear())
  await page.evaluate(async () => { await navigator.serviceWorker.ready })
  await page.reload()
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true)

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
  const canvas = page.locator('#embroidery')
  const box = await canvas.boundingBox()
  if (!box) throw new Error('Canvas missing offline')
  await page.touchscreen.tap(box.x + box.width * .35, box.y + box.height * .42 + 34)
  await page.touchscreen.tap(box.x + box.width * .62, box.y + box.height * .50 + 34)
  await expect(page.locator('#status-title')).toHaveText('Thread settled')
  await page.screenshot({ path: 'review/evidence/screenshots/offline-stitchable.png', fullPage: true })
  await context.setOffline(false)
})
