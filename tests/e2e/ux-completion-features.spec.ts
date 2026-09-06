import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
for (const [name, width, height] of [['desktop', 1440, 1000], ['tablet', 768, 1024], ['phone', 390, 844]] as const) {
  test(`complete bilingual UI and guide at ${name}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height })
    await page.addInitScript(() => Object.defineProperty(navigator, 'language', { get: () => 'fr-FR' }))
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message))
    await page.goto('./')
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN')
    await expect(page.locator('#export-artwork')).toHaveText('导出作品')
    await page.locator('#leaf-guide').click()
    await page.locator('#hoop-shell').scrollIntoViewIfNeeded()
    for (let i = 0; i < 3; i++) {
      const target = (await page.locator('#guide-target').boundingBox())!
      await page.mouse.click(target.x + target.width / 2, target.y + target.height / 2)
      await page.waitForTimeout(700)
    }
    const state = await page.evaluate(() => localStorage.getItem('deesewsew-piece-v1'))
    expect(JSON.parse(state!).punctures.length).toBe(3)
    await page.screenshot({ path: info.outputPath(`${name}-zh.png`), fullPage: true })
    await page.locator('#language-toggle').click()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.locator('#guide-copy')).toHaveText('Leaf step 4 of 20')
    await expect(page.locator('#export-artwork')).toHaveText('Export')
    expect(await page.evaluate(() => localStorage.getItem('deesewsew-piece-v1'))).toBe(state)
    await page.screenshot({ path: info.outputPath(`${name}-en.png`), fullPage: true })
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.locator('#guide-copy')).toHaveText('Leaf step 4 of 20')
    await page.locator('#undo').click(); await expect(page.locator('#guide-copy')).toHaveText('Leaf step 3 of 20')
    await page.locator('#redo').click(); await expect(page.locator('#guide-copy')).toHaveText('Leaf step 4 of 20')
    await page.locator('#leaf-guide').click(); await expect(page.locator('#guide-target')).toBeHidden()
    expect(await page.evaluate(() => localStorage.getItem('deesewsew-piece-v1'))).toBe(state)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect(errors).toEqual([])
  })
}
test('offline file round trip, malformed rejection and replacement cancellation preserve work', async ({ page, context }, info) => {
  await page.goto('./')
  const box = (await page.locator('#hoop-shell').boundingBox())!
  await page.mouse.click(box.x + box.width * .4, box.y + box.height * .4)
  await page.mouse.click(box.x + box.width * .6, box.y + box.height * .6)
  const original = await page.evaluate(() => localStorage.getItem('deesewsew-piece-v1'))
  await context.setOffline(true)
  const downloadPromise = page.waitForEvent('download'); await page.locator('#export-artwork').click()
  const download = await downloadPromise, path = info.outputPath('round-trip.json'); await download.saveAs(path)
  expect(JSON.parse(await readFile(path, 'utf8'))).toEqual(JSON.parse(original!))
  for (const contents of ['{', '{}', '{"schemaVersion":99}']) {
    await page.locator('#artwork-file').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from(contents) })
    await expect(page.locator('#status-title')).toHaveText('Import failed')
    expect(await page.evaluate(() => localStorage.getItem('deesewsew-piece-v1'))).toBe(original)
  }
  page.once('dialog', dialog => dialog.dismiss())
  await page.locator('#artwork-file').setInputFiles(path)
  await page.waitForTimeout(100)
  expect(await page.evaluate(() => localStorage.getItem('deesewsew-piece-v1'))).toBe(original)
  page.once('dialog', dialog => dialog.accept()); await page.locator('#clear').click()
  await page.locator('#artwork-file').setInputFiles(path)
  await expect(page.locator('#status-title')).toHaveText('Artwork imported')
  expect(await page.evaluate(() => localStorage.getItem('deesewsew-piece-v1'))).toBe(original)
})
