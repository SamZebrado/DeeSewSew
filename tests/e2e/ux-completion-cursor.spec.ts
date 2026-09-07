import { expect, test } from '@playwright/test'
import { emptyEmbroideryPiece, punctureFabric, serializeEmbroideryPiece } from '../../src/embroidery-topology'

test.use({ viewport: { width: 1280, height: 1000 }, video: { mode: 'on', size: { width: 1280, height: 1000 } } })
for (const side of ['front', 'back'] as const) test(`held cursor ${side}: four quadrants, outside and exact puncture`, async ({ page }, info) => {
  let piece = emptyEmbroideryPiece()
  const style = { type: 'running' as const, color: '#9b4a48' }
  for (const p of [{ x: .4, y: .55 }, { x: .5, y: .65 }, ...(side === 'back' ? [{ x: .6, y: .55 }] : [])]) piece = punctureFabric(piece, p, style).piece
  await page.addInitScript(raw => localStorage.setItem('deesewsew-piece-v1', raw), serializeEmbroideryPiece(piece))
  await page.goto('./')
  if (side === 'back') await page.locator('#view-back').click()
  const hoop = page.locator('#hoop-shell'), box = (await hoop.boundingBox())!
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message))
  const angles: number[] = []
  for (const [name, x, y] of [['upper-left', .3, .3], ['upper-right', .7, .3], ['lower-left', .3, .7], ['lower-right', .7, .7]] as const) {
    const px = box.x + box.width * x, py = box.y + box.height * y
    await page.mouse.move(px, py, { steps: 16 }); await page.waitForTimeout(350)
    const eyeX = Number(await hoop.getAttribute('data-thread-eye-x'))
    const eyeY = Number(await hoop.getAttribute('data-thread-eye-y'))
    const screenEyeX = side === 'back' ? 1 - eyeX : eyeX
    expect(eyeY).toBeGreaterThan(y)
    angles.push(Math.atan2(x - screenEyeX, eyeY - y))
    await page.screenshot({ path: info.outputPath(`${side}-${name}.png`) })
    const scroll = await page.evaluate(() => ({ x: scrollX, y: scrollY }))
    await page.screenshot({ path: info.outputPath(`${side}-${name}-detail.png`), clip: { x: px + scroll.x - 70, y: py + scroll.y - 25, width: 140, height: 120 } })
  }
  expect(Math.max(...angles) - Math.min(...angles)).toBeGreaterThan(.3)
  for (const [name, px, py] of [['center', .5, .5], ['near-edge', .84, .5]] as const) {
    await page.mouse.move(box.x + box.width * px, box.y + box.height * py, { steps: 16 })
    await page.waitForTimeout(250)
    await page.screenshot({ path: info.outputPath(`${side}-${name}.png`) })
  }
  await page.mouse.move(box.x + box.width + 24, box.y + box.height * .45, { steps: 12 })
  await expect(page.locator('#floating-needle')).toBeVisible()
  await page.screenshot({ path: info.outputPath(`${side}-outside.png`) })
  const x = box.x + box.width * .64, y = box.y + box.height * .4
  await page.mouse.move(x, y, { steps: 12 }); await page.waitForTimeout(200)
  await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(750)
  const last = await page.evaluate(() => JSON.parse(localStorage.getItem('deesewsew-piece-v1')!).punctures.at(-1))
  expect(last.position.x).toBeCloseTo(side === 'back' ? .36 : .64, 5)
  expect(last.position.y).toBeCloseTo(.4, 5)
  await page.mouse.move(x + 20, y + 20)
  await expect(hoop).toHaveAttribute('data-target-mode', 'hidden')
  await page.screenshot({ path: info.outputPath(`${side}-hidden-no-glint.png`) })
  await page.mouse.click(x + 20, y + 20); await page.waitForTimeout(750)
  await hoop.focus(); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowUp')
  await page.mouse.move(x, y, { steps: 12 }); await page.waitForTimeout(250)
  await page.screenshot({ path: info.outputPath(`${side}-angled.png`) })
  expect(errors).toEqual([])
})
