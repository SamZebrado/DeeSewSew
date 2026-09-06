import { expect, test } from '@playwright/test'

test('same-turn move/up pins release eye on front and hidden back; records continuous play', async ({ page }) => {
  await page.goto('./')
  const hoop = page.locator('#hoop-shell')
  await hoop.scrollIntoViewIfNeeded()
  const box = await hoop.boundingBox()
  if (!box) throw new Error('Missing hoop')
  await page.mouse.click(box.x + box.width * .3, box.y + box.height * .4)
  for (let index = 0; index < 4; index++) {
    const x = index % 2 ? .35 : .65, y = .45 + index * .04
    await page.mouse.move(box.x + box.width * .5, box.y + box.height * .65, { steps: 6 })
    await page.mouse.move(box.x + box.width * .55, box.y + box.height * .3, { steps: 6 })
    await page.mouse.down()
    const result = await hoop.evaluate((element, target) => {
      const rect = element.getBoundingClientRect()
      const event = { pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0, bubbles: true, clientX: rect.left + target.x * rect.width, clientY: rect.top + target.y * rect.height }
      element.dispatchEvent(new PointerEvent('pointermove', event))
      const eye = [(element as HTMLElement).dataset.threadEyeX, (element as HTMLElement).dataset.threadEyeY]
      element.dispatchEvent(new PointerEvent('pointerup', event))
      const data = JSON.parse(localStorage.getItem('deesewsew-piece-v1')!)
      const canvas = document.querySelector<HTMLCanvasElement>(data.punctures.at(-1).fromSide === 'front' ? '#embroidery' : '#embroidery-back')!
      return { eye, snapshot: [canvas.dataset.tightenEyeX, canvas.dataset.tightenEyeY], position: data.punctures.at(-1).position, phase: canvas.dataset.motionPhase, size: rect.width, dpr: devicePixelRatio }
    }, { x, y })
    await page.mouse.up()
    expect(result.eye).toEqual(result.snapshot)
    expect(result.position.x).toBeCloseTo(x, 5)
    expect(result.position.y).toBeCloseTo(y, 5)
    expect(result.phase).toBe('press')
    await page.waitForTimeout(720)
  }
  await page.getByRole('button', { name: 'Snap back' }).click()
  await page.getByRole('button', { name: 'Return front' }).click()
  const rapid = await hoop.evaluate(element => {
    const rect = element.getBoundingClientRect()
    let maximumTails = 0
    for (let index = 0; index < 20; index++) {
      const options = { pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0, bubbles: true, clientX: rect.left + rect.width * (index % 2 ? .35 : .65), clientY: rect.top + rect.height * (.35 + (index % 3) * .1) }
      // A physical owner is unnecessary here; shim capture only for this burst.
      element.setPointerCapture = () => {}
      element.dispatchEvent(new PointerEvent('pointerdown', options))
      element.dispatchEvent(new PointerEvent('pointerup', options))
      maximumTails = Math.max(maximumTails, Number((element as HTMLElement).dataset.tailTransitions))
    }
    return { maximumTails, count: JSON.parse(localStorage.getItem('deesewsew-piece-v1')!).punctures.length }
  })
  expect(rapid.maximumTails).toBeLessThanOrEqual(4)
  expect(rapid.count).toBe(25)
  await page.waitForTimeout(750)
  await expect(hoop).toHaveAttribute('data-tail-transitions', '0')
  await page.mouse.move(box.x + box.width * .5, box.y + box.height * .55)
  await page.mouse.down(); await page.keyboard.press('Escape'); await page.mouse.up()
  await page.getByRole('button', { name: 'Undo last puncture' }).click()
})
