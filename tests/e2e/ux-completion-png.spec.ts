import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { emptyThreadRuns, startThreadAt, punctureThreadRun, endThreadRun } from '../../src/thread-runs'
import { serializeThreadArtwork } from '../../src/thread-run-storage'

test('clean PNG downloads preserve canonical state and compose exact front/back pixels', async ({ page }, info) => {
  const red = { type: 'running' as const, color: '#9b4a48' }, green = { type: 'running' as const, color: '#55765b' }
  let piece = startThreadAt(emptyThreadRuns(), 'front', { x: .31, y: .32 }, red)
  piece = endThreadRun(punctureThreadRun(piece, { x: .55, y: .39 }, red))
  piece = startThreadAt(piece, 'back', { x: .44, y: .65 }, green)
  piece = endThreadRun(punctureThreadRun(piece, { x: .62, y: .55 }, green))
  await page.addInitScript(raw => {
    localStorage.setItem('deesewsew-piece-v1', raw)
    localStorage.setItem('deesewsew-locale-v1', 'en')
  }, serializeThreadArtwork(piece))
  await page.goto('./')
  const snapshot = () => page.evaluate(() => localStorage.getItem('deesewsew-piece-v1'))
  const original = await snapshot()
  const download = async (choice: string) => {
    const pending = page.waitForEvent('download')
    await page.locator(`[data-png="${choice}"]`).click()
    const file = await pending, path = info.outputPath(file.suggestedFilename())
    await file.saveAs(path)
    const bytes = await readFile(path)
    expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
    expect(bytes.readUInt32BE(16)).toBe(choice === 'pair' ? 2048 : 1024)
    expect(bytes.readUInt32BE(20)).toBe(1024)
    return bytes.toString('base64')
  }
  const front = await download('front'), back = await download('back'), pair = await download('pair')
  const equalHalves = await page.evaluate(async ({ front, back, pair }) => {
    const decode = async (encoded: string) => {
      const bytes = Uint8Array.from(atob(encoded), value => value.charCodeAt(0))
      return createImageBitmap(new Blob([bytes], { type: 'image/png' }))
    }
    const images = await Promise.all([front, back, pair].map(decode))
    try {
      const data = images.map(image => {
        const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height
        const context = canvas.getContext('2d')!; context.drawImage(image, 0, 0)
        return context.getImageData(0, 0, image.width, image.height).data
      })
      return [0, 1].map(side => {
        for (let y = 0; y < 1024; y++) for (let x = 0; x < 1024 * 4; x++) {
          if (data[side][y * 1024 * 4 + x] !== data[2][y * 2048 * 4 + side * 1024 * 4 + x]) return false
        }
        return true
      })
    } finally { images.forEach(image => image.close()) }
  }, { front, back, pair })
  expect(equalHalves).toEqual([true, true])
  await page.locator('#leaf-guide').click()
  await expect(page.locator('#guide-target')).toBeVisible()
  expect(await download('front')).toBe(front)
  expect(await snapshot()).toBe(original)
  await page.getByRole('button', { name: '中文', exact: true }).click()
  await expect(page.locator('[data-png="front"]')).toHaveText('正面 PNG')
  await expect(page.locator('[data-png="pair"]')).toHaveText('双面 PNG')
  await page.locator('#leaf-guide').click()
  await page.keyboard.press('Escape')
  for (const [device, width, height] of [['desktop', 1280, 1000], ['tablet', 768, 1024], ['phone', 390, 844]] as const) {
    await page.setViewportSize({ width, height })
    for (const language of ['zh', 'en'] as const) {
      if (await page.locator('html').getAttribute('lang') !== (language === 'zh' ? 'zh-CN' : 'en')) await page.locator('#language-toggle').click()
      for (const choice of ['front', 'back', 'pair']) {
        const box = await page.locator(`[data-png="${choice}"]`).boundingBox()
        expect(box!.width).toBeGreaterThanOrEqual(44); expect(box!.height).toBeGreaterThanOrEqual(44)
        expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.x + box!.width).toBeLessThanOrEqual(width)
        expect(await page.locator(`[data-png="${choice}"]`).evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
      }
      await page.keyboard.press('Escape')
      await page.screenshot({ path: info.outputPath(`png-actions-${device}-${language}.png`), fullPage: true })
    }
  }
})
