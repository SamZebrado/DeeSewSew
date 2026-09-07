import { expect, test } from '@playwright/test'
import { FLOWER } from '../../src/flower-pattern'
import { startGuide, guideTargets } from '../../src/leaf-guide'
import { emptyEmbroideryPiece, punctureFabric } from '../../src/embroidery-topology'

for (const existing of [0, 1, 2]) test(`flower lifecycle preserves ${existing} old punctures and canonical front motif`, async ({ page }, info) => {
  test.setTimeout(100_000)
  await page.setViewportSize({ width: 1280, height: 1000 })
  let initial = emptyEmbroideryPiece()
  for (let i = 0; i < existing; i++) initial = punctureFabric(initial, { x: .32 + i * .08, y: .3 }, { type: 'running', color: '#abcdef' }).piece
  await page.addInitScript(raw => {
    if (!localStorage.getItem('flower-test-initialized')) {
      localStorage.setItem('deesewsew-piece-v1', raw)
      localStorage.setItem('deesewsew-locale-v1', 'en')
      localStorage.setItem('flower-test-initialized', 'yes')
    }
  }, JSON.stringify(initial))
  await page.goto('./')
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message))
  const snapshot = () => page.evaluate(() => JSON.parse(localStorage.getItem('deesewsew-piece-v1')!))
  const clickTarget = async () => {
    await page.locator('#hoop-shell').scrollIntoViewIfNeeded()
    const target = (await page.locator('#guide-target').boundingBox())!
    await page.mouse.click(target.x + target.width / 2, target.y + target.height / 2)
    await page.waitForTimeout(existing ? 40 : 680)
  }
  if (existing) await page.locator('#motion-toggle').click()
  await page.locator('#leaf-guide').click()
  expect((await snapshot()).punctures).toEqual(initial.punctures)
  const guide = startGuide(initial, '#ad514c'), total = guideTargets(guide).length
  // Wrong target cannot commit or advance the guide.
  const box = (await page.locator('#hoop-shell').boundingBox())!
  await page.mouse.click(box.x + box.width * .25, box.y + box.height * .5)
  expect((await snapshot()).punctures.length).toBe(existing)
  for (let i = 0; i < 3; i++) await clickTarget()
  await page.locator('#undo').click(); await expect(page.locator('#guide-copy')).toHaveText(`Flower step 3 of ${total}`)
  await page.locator('#redo').click(); await expect(page.locator('#guide-copy')).toHaveText(`Flower step 4 of ${total}`)
  const partial = await snapshot()
  await page.reload(); await expect(page.locator('#guide-copy')).toHaveText(`Flower step 4 of ${total}`)
  expect(await snapshot()).toEqual(partial)
  for (let i = 3; i < total; i++) await clickTarget()
  await expect(page.locator('#guide-copy')).toHaveText(FLOWER.completion)
  await expect(page.locator('#guide-target')).toBeHidden()
  const completed = await snapshot()
  expect(completed.punctures.length).toBe(existing + total)
  expect(completed.punctures.slice(0, existing)).toEqual(initial.punctures)
  expect(completed.segments.slice(0, initial.segments.length)).toEqual(initial.segments)
  const front = completed.segments.slice(initial.segments.length + (existing ? 1 : 0)).filter((s: { side: string }) => s.side === 'front')
  const key = (a: { x: number; y: number }, b: { x: number; y: number }) => [a, b].map(p => `${p.x.toFixed(4)},${p.y.toFixed(4)}`).sort().join('|')
  expect(front.map((s: { start: { x: number; y: number }; end: { x: number; y: number } }) => key(s.start, s.end)).sort()).toEqual(FLOWER.frontEdges.map(([a, b]) => key(FLOWER.points[a]!, FLOWER.points[b]!)).sort())
  const yaw = await page.locator('#hoop-shell').getAttribute('data-yaw')
  await page.locator('#undo').click(); await expect(page.locator('#guide-target')).toBeVisible()
  await page.locator('#redo').click(); await expect(page.locator('#guide-copy')).toHaveText(FLOWER.completion)
  expect(await page.locator('#hoop-shell').getAttribute('data-yaw')).toBe(yaw)
  await page.locator('#leaf-guide').click()
  await page.keyboard.press('Escape')
  await page.locator('#embroidery').screenshot({ path: info.outputPath('flower-front-guides-off.png') })
  await page.locator('#view-back').click(); await page.waitForTimeout(150)
  await page.keyboard.press('Escape')
  await page.locator('#embroidery-back').screenshot({ path: info.outputPath('flower-back-guides-off.png') })
  expect(await snapshot()).toEqual(completed)
  await page.locator('#leaf-guide').click(); await clickTarget()
  expect((await snapshot()).punctures.length).toBe(completed.punctures.length + 1)
  await page.locator('#leaf-guide').click(); await expect(page.locator('#guide-target')).toBeHidden()
  await page.reload(); await expect(page.locator('#guide-target')).toBeHidden()
  expect((await snapshot()).punctures.slice(0, completed.punctures.length)).toEqual(completed.punctures)
  await info.attach('canonical-completed.json', { body: JSON.stringify(completed, null, 2), contentType: 'application/json' })
  expect(errors).toEqual([])
})
