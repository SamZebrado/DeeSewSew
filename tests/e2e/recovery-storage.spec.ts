import { expect, test } from '@playwright/test'

for (const fault of ['QuotaExceededError', 'SecurityError']) {
  test(`failed ${fault} write is not shown as saved`, async ({ page }) => {
    await page.addInitScript(name => {
      Storage.prototype.setItem = () => { throw new DOMException('Injected storage failure', name) }
    }, fault)
    await page.goto('./')
    const hoop = page.locator('#hoop-shell')
    await hoop.scrollIntoViewIfNeeded()
    await hoop.click({ position: { x: 190, y: 190 } })
    await expect(page.locator('#save-state')).not.toHaveText('Saved on this device')
    await expect(page.locator('#save-state')).toContainText('not saved')
    await expect(page.getByRole('button', { name: 'Download recovery copy', exact: true })).toBeVisible()
  })
}
test('throwing storage reads do not prevent initialization', async ({ page }) => {
  await page.addInitScript(() => { Storage.prototype.getItem = () => { throw new DOMException('Denied', 'SecurityError') } })
  await page.goto('./')
  await expect(page.locator('#hoop-shell')).toHaveAttribute('data-target-mode', 'direct')
  await expect(page.locator('#save-state')).not.toHaveText('Saved on this device')
})

for (const raw of ['{broken', '{"schemaVersion":99}']) {
  test(`keeps damaged source and exports current memory: ${raw}`, async ({ page }) => {
    await page.addInitScript(value => localStorage.setItem('deesewsew-piece-v1', value), raw)
    await page.goto('./')
    await page.locator('#hoop-shell').click({ position: { x: 190, y: 190 } })
    expect(await page.evaluate(() => localStorage.getItem('deesewsew-piece-v1'))).toBe(raw)
    await expect(page.locator('#hoop-shell')).toHaveAttribute('data-needle-side', 'back')
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Download recovery copy', exact: true }).click()
    expect((await download).suggestedFilename()).toBe('deesewsew-recovery.json')
    await expect(page.getByRole('button', { name: 'Download original stored data' })).toBeVisible()
  })
}
