import { mkdir } from 'node:fs/promises'
import { expect, test } from '@playwright/test'

const cases = [
  { name: 'desktop-1440x900', width: 1440, height: 900, touch: false },
  { name: 'tablet-landscape-1024x768', width: 1024, height: 768, touch: true },
  { name: 'tablet-portrait-768x1024', width: 768, height: 1024, touch: true },
  { name: 'phone-390x844', width: 390, height: 844, touch: true },
]

test('responsive viewports remain stitchable, circular, unobstructed, and overflow-safe', async ({ page }) => {
  await mkdir('review/r3-flat', { recursive: true })
  for (const item of cases) {
    await page.setViewportSize({ width: item.width, height: item.height })
    await page.goto('./')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    expect(page.viewportSize()).toEqual({ width: item.width, height: item.height })

    const canvas = page.locator('#embroidery')
    const hoop = page.locator('.hoop-shell')
    const tools = page.locator('.tools')
    await expect(canvas).toBeVisible()
    await expect(tools).toBeVisible()
    const hoopBox = await hoop.boundingBox()
    const canvasBox = await canvas.boundingBox()
    const toolsBox = await tools.boundingBox()
    if (!hoopBox || !canvasBox || !toolsBox) throw new Error(`${item.name}: missing layout box`)
    expect(Math.abs(hoopBox.width - hoopBox.height)).toBeLessThan(1)
    expect(Math.abs(canvasBox.width - canvasBox.height)).toBeLessThan(1)

    const overlaps = hoopBox.x < toolsBox.x + toolsBox.width
      && hoopBox.x + hoopBox.width > toolsBox.x
      && hoopBox.y < toolsBox.y + toolsBox.height
      && hoopBox.y + hoopBox.height > toolsBox.y
    expect(overlaps, `${item.name}: controls overlap the hoop`).toBe(false)

    const metrics = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      minimumButtonHeight: Math.min(...[...document.querySelectorAll('button')].map((button) => button.getBoundingClientRect().height)),
    }))
    expect(metrics.scrollWidth).toBe(metrics.clientWidth)
    expect(metrics.minimumButtonHeight).toBeGreaterThanOrEqual(44)

    const start = { x: canvasBox.x + canvasBox.width * .36, y: canvasBox.y + canvasBox.height * .42 + (item.touch ? 34 : 0) }
    if (item.touch) await page.touchscreen.tap(start.x, start.y)
    else await page.mouse.click(start.x, start.y)
    await expect(page.locator('#status-title')).toHaveText('Needle behind fabric')
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('deesewsew-piece-v1') ?? '{}').punctures?.length)).toBe(1)
    await page.screenshot({ path: `review/r3-flat/${item.name}.png`, fullPage: false })
  }

  const countBefore = await page.evaluate(() => JSON.parse(localStorage.getItem('deesewsew-piece-v1') ?? '{}').punctures.length)
  await page.setViewportSize({ width: 844, height: 390 })
  await expect(page.locator('#embroidery')).toBeVisible()
  const countAfter = await page.evaluate(() => JSON.parse(localStorage.getItem('deesewsew-piece-v1') ?? '{}').punctures.length)
  expect(countAfter).toBe(countBefore)
})
