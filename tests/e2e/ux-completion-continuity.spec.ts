import { expect, test } from '@playwright/test'
import { emptyEmbroideryPiece, punctureFabric, serializeEmbroideryPiece } from '../../src/embroidery-topology'
test.use({ viewport: { width: 1100, height: 950 }, video: { mode: 'on', size: { width: 1100, height: 950 } } })
test('close-up continuous source eye, hidden emergence, diagonal, short and angled stitching', async ({ page }, info) => {
  const style = { type: 'running' as const, color: '#9b4a48' }
  let piece = punctureFabric(emptyEmbroideryPiece(), { x: .3, y: .4 }, style).piece
  piece = punctureFabric(piece, { x: .35, y: .7 }, style).piece
  await page.addInitScript(raw => localStorage.setItem('deesewsew-piece-v1', raw), serializeEmbroideryPiece(piece))
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message))
  await page.goto('./')
  const hoop = page.locator('#hoop-shell'); await hoop.scrollIntoViewIfNeeded()
  const box = (await hoop.boundingBox())!
  const move = (x: number, y: number, steps = 1) => page.mouse.move(box.x + box.width * x, box.y + box.height * y, { steps })
  await move(.7, .65, 15); await page.waitForTimeout(300)
  await move(.65, .3, 2); await page.mouse.down(); await page.mouse.up()
  await page.waitForTimeout(720)
  // Keep the front view. The hidden back-side needle must emerge here tip first.
  await expect(hoop).toHaveAttribute('data-target-mode', 'hidden')
  await move(.45, .7, 12); await page.waitForTimeout(200)
  await move(.45, .45, 2); await page.mouse.down(); await page.mouse.up()
  await expect(hoop).toHaveAttribute('data-destination-eye-visible', 'false')
  await expect(hoop).toHaveAttribute('data-destination-eye-visible', 'true')
  await page.waitForTimeout(720)
  await page.screenshot({ path: info.outputPath('emerged-free-thread.png') })
  await move(.48, .47); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(720)
  await hoop.focus(); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowUp')
  await move(.6, .57); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(720)
  await page.screenshot({ path: info.outputPath('angled-continuation.png') })
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('deesewsew-piece-v1')!))
  expect(stored.punctures).toHaveLength(6)
  expect(stored.segments.map((s: { side: string }) => s.side)).toEqual(['back', 'front', 'back', 'front', 'back'])
  expect(errors).toEqual([])
})
