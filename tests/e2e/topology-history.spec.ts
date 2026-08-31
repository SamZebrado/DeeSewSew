import { expect, test, type Page } from '@playwright/test'

const piece = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('deesewsew-piece-v1') ?? '{}'))

async function clickHoop(page: Page, x: number, y: number) {
  const hoop = page.locator('#hoop-shell')
  await hoop.scrollIntoViewIfNeeded()
  const box = await hoop.boundingBox()
  if (!box) throw new Error('Hoop has no bounding box')
  await page.mouse.click(box.x + box.width * x, box.y + box.height * y)
}

test.beforeEach(async ({ page }) => {
  await page.goto('./')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test('production undo/redo restores needle topology and a new puncture invalidates redo', async ({ page }) => {
  await clickHoop(page, .40, .42)
  await expect.poll(async () => (await piece(page)).punctures.length).toBe(1)
  await page.getByRole('button', { name: 'Snap back' }).click()
  await clickHoop(page, .35, .58)
  await expect.poll(async () => (await piece(page)).segments.length).toBe(1)
  expect((await piece(page)).segments[0].side).toBe('back')

  await page.getByRole('button', { name: 'Undo last puncture' }).click()
  expect(await piece(page)).toMatchObject({ needle: { side: 'back' }, segments: [] })
  await page.getByRole('button', { name: 'Redo last puncture' }).click()
  expect(await piece(page)).toMatchObject({ needle: { side: 'front' } })
  expect((await piece(page)).segments).toHaveLength(1)

  await page.getByRole('button', { name: 'Undo last puncture' }).click()
  await clickHoop(page, .30, .66)
  await expect.poll(async () => (await piece(page)).segments.length).toBe(1)
  await expect(page.getByRole('button', { name: 'Redo last puncture' })).toBeDisabled()
  const branched = await piece(page)
  expect(branched.punctures.map((puncture: { id: string }) => puncture.id)).toEqual(['puncture-1', 'puncture-3'])
  expect(branched.segments[0]).toMatchObject({ id: 'segment-3', side: 'back' })
})
