import { expect, test } from '@playwright/test'

test('production worker isolates cache deletion and resource fallback', async ({ page, context }) => {
  await page.addInitScript(() => {
    const original = navigator.serviceWorker.register.bind(navigator.serviceWorker)
    navigator.serviceWorker.register = async (...args) => {
      await Promise.all(['deesewsew-old', 'beatgarden-offline-v1', 'another-project-cache'].map(name => caches.open(name)))
      return original(...args)
    }
  })
  await page.goto('./')
  await page.evaluate(async () => { await navigator.serviceWorker.ready })
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true)
  const names = await page.evaluate(() => caches.keys())
  expect(names).toContain('beatgarden-offline-v1')
  expect(names).toContain('another-project-cache')
  expect(names).not.toContain('deesewsew-old')
  await context.setOffline(true)
  const missing = await page.evaluate(() => fetch('./missing-resource.js').then(response => response.headers.get('content-type')).catch(() => 'network-error'))
  expect(missing).toBe('network-error')
  await page.goto('./offline-navigation')
  await expect(page.getByRole('heading', { name: 'DeeSewSew' })).toBeVisible()
})

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
  await expect(page.locator('#status-title')).toHaveText('Needle behind fabric')
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('deesewsew-piece-v1') ?? '{}').punctures?.at(-1)?.color)).toBe('#1a9c8d')
  await expect(page.locator('#hoop-shell')).toHaveAttribute('data-needle-side', 'back')
  await expect(page.locator('#hoop-shell')).toHaveAttribute('data-target-mode', 'hidden')
  await page.touchscreen.tap(box.x + box.width * .62, box.y + box.height * .54 + 34)
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('deesewsew-piece-v1') ?? '{}').punctures?.length)).toBe(2)
  const offlineContinuation = await page.evaluate(() => JSON.parse(localStorage.getItem('deesewsew-piece-v1') ?? '{}'))
  expect(offlineContinuation.segments).toHaveLength(1)
  expect(offlineContinuation.segments[0].side).toBe('back')
  await expect(page.locator('#hoop-shell')).toHaveAttribute('data-visible-side', 'front')
  await expect(page.locator('#hoop-shell')).toHaveAttribute('data-needle-side', 'front')
  await page.screenshot({ path: 'review/evidence/screenshots/offline-stitchable.png', fullPage: true })
  await context.setOffline(false)
})
