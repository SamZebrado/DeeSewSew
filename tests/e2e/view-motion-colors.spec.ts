import { mkdir, writeFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('./')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test('3D view auto-rotates, freezes, supports rim drag, and snaps between faces', async ({ page }) => {
  await mkdir('review/feature-3d', { recursive: true })
  await page.evaluate(() => {
    localStorage.setItem('deesewsew-piece-v1', JSON.stringify({
      schemaVersion: 1,
      nextOrder: 5,
      stitches: [
        { id: 'stitch-1', type: 'back', start: { x: .28, y: .34 }, end: { x: .68, y: .40 }, color: '#b9403c', width: 4.2, order: 1, seed: 1101 },
        { id: 'stitch-2', type: 'running', start: { x: .66, y: .43 }, end: { x: .38, y: .68 }, color: '#425f86', width: 3.8, order: 2, seed: 2202 },
        { id: 'stitch-3', type: 'back', start: { x: .37, y: .65 }, end: { x: .70, y: .62 }, color: '#55765b', width: 4.2, order: 3, seed: 3303 },
        { id: 'stitch-4', type: 'running', start: { x: .43, y: .27 }, end: { x: .53, y: .72 }, color: '#d49a2f', width: 3.8, order: 4, seed: 4404 },
      ],
    }))
  })
  await page.reload()
  const initialCount = 4
  const rotate = page.locator('#rotate-view')
  const hoop = page.locator('#hoop-shell')
  const rotator = page.locator('#hoop-rotator')
  const canvas = page.locator('#embroidery')
  const backCanvas = page.locator('#embroidery-back')

  await expect(hoop).toHaveAttribute('data-view-state', 'front')
  const canvasFingerprints = await page.evaluate(() => {
    const front = document.querySelector<HTMLCanvasElement>('#embroidery')!
    const back = document.querySelector<HTMLCanvasElement>('#embroidery-back')!
    return { front: front.toDataURL(), back: back.toDataURL(), backWidth: back.width, backHeight: back.height }
  })
  expect(canvasFingerprints.backWidth).toBeGreaterThan(0)
  expect(canvasFingerprints.backHeight).toBeGreaterThan(0)
  expect(canvasFingerprints.back).not.toBe(canvasFingerprints.front)
  await page.screenshot({ path: 'review/feature-3d/hoop-front.png', fullPage: true })
  await rotate.click()
  await expect(rotate).toHaveAttribute('aria-pressed', 'true')
  await expect(hoop).toHaveAttribute('data-view-state', 'rotating')
  await expect(canvas).toHaveAttribute('aria-disabled', 'true')
  expect(await rotator.evaluate((element) => getComputedStyle(element).animationName)).toBe('none')

  const firstTransform = await rotator.evaluate((element) => getComputedStyle(element).transform)
  await expect.poll(() => rotator.evaluate((element) => getComputedStyle(element).transform), { timeout: 2_000 }).not.toBe(firstTransform)

  for (const [x, y] of [[.35, .42], [.62, .52]]) {
    const interactionBox = await canvas.boundingBox()
    if (!interactionBox) throw new Error('Canvas has no bounding box')
    await page.mouse.click(interactionBox.x + interactionBox.width * x, interactionBox.y + interactionBox.height * y)
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('deesewsew-piece-v1') ?? '{"stitches":[]}').stitches)).toHaveLength(initialCount)
    await expect(rotate).toHaveAttribute('aria-pressed', 'true')
  }

  await page.screenshot({ path: 'review/feature-3d/hoop-angle.png', fullPage: true })

  await page.getByRole('button', { name: /Stop rotation/ }).click()
  await expect(hoop).toHaveAttribute('data-view-mode', 'manual')
  const frozenYaw = await hoop.getAttribute('data-yaw')
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
  expect(await hoop.getAttribute('data-yaw')).toBe(frozenYaw)

  await page.getByRole('button', { name: 'Snap back' }).click()
  await expect(hoop).toHaveAttribute('data-view-state', 'back')
  await expect(hoop).toHaveAttribute('data-aligned-face', 'back')
  const backTransform = await rotator.evaluate((element) => new DOMMatrixReadOnly(getComputedStyle(element).transform).m11)
  expect(backTransform).toBeLessThan(-.98)
  await expect(backCanvas).toBeAttached()
  await expect(page.locator('.back-label')).toBeVisible()
  await page.screenshot({ path: 'review/feature-3d/hoop-reverse.png', fullPage: true })

  await page.getByRole('button', { name: 'Return front' }).click()
  await expect(hoop).toHaveAttribute('data-view-state', 'front')
  await expect(canvas).toHaveAttribute('aria-disabled', 'false')
  await canvas.scrollIntoViewIfNeeded()
  const frontBox = await canvas.boundingBox()
  if (!frontBox) throw new Error('Front canvas has no bounding box')

  await page.mouse.move(frontBox.x + frontBox.width * .96, frontBox.y + frontBox.height * .50)
  await page.mouse.down()
  await page.mouse.move(frontBox.x + frontBox.width * .78, frontBox.y + frontBox.height * .40)
  await page.mouse.up()
  await expect(hoop).not.toHaveAttribute('data-view-state', 'front')
  const draggedYaw = await hoop.getAttribute('data-yaw')
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
  expect(await hoop.getAttribute('data-yaw')).toBe(draggedYaw)

  await page.getByRole('button', { name: 'Return front' }).click()
  await expect(canvas).toHaveAttribute('aria-disabled', 'false')
  await canvas.scrollIntoViewIfNeeded()
  const stitchBox = await canvas.boundingBox()
  if (!stitchBox) throw new Error('Front canvas has no bounding box after returning from drag')
  await page.mouse.click(stitchBox.x + stitchBox.width * .35, stitchBox.y + stitchBox.height * .42)
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('deesewsew-piece-v1') ?? '{}').punctures?.length)).toBe(1)
  await expect(hoop).toHaveAttribute('data-needle-side', 'back')
})

test('stitch motion can be disabled and stays disabled without affecting saved stitches', async ({ page }) => {
  const motion = page.getByRole('button', { name: /Stitch motion/ })
  await expect(motion).toHaveAttribute('aria-pressed', 'true')
  await motion.click()
  await expect(motion).toHaveAttribute('aria-pressed', 'false')
  await page.reload()
  await expect(page.getByRole('button', { name: /Stitch motion/ })).toHaveAttribute('aria-pressed', 'false')

  const canvas = page.locator('#embroidery')
  await canvas.scrollIntoViewIfNeeded()
  const box = await canvas.boundingBox()
  if (!box) throw new Error('Canvas has no bounding box')
  await page.mouse.click(box.x + box.width * .34, box.y + box.height * .40)
  await expect(canvas).toHaveAttribute('data-motion-state', 'off')
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('deesewsew-piece-v1') ?? '{}').punctures?.length)).toBe(1)
})

test('custom thread colors are added, selected, used, and restored after reload', async ({ page }) => {
  await mkdir('review/feature-3d', { recursive: true })
  const customColor = '#1a9c8d'
  await page.locator('#custom-color').fill(customColor)
  await page.getByRole('button', { name: 'Add color' }).click()
  const customSwatch = page.getByRole('radio', { name: 'Custom #1A9C8D' })
  await expect(customSwatch).toBeVisible()
  await expect(customSwatch).toHaveAttribute('aria-checked', 'true')

  const canvas = page.locator('#embroidery')
  await canvas.scrollIntoViewIfNeeded()
  const box = await canvas.boundingBox()
  if (!box) throw new Error('Canvas has no bounding box')
  await page.evaluate(() => {
    const target = document.querySelector<HTMLCanvasElement>('#embroidery')!
    const frames: Record<string, string> = {}
    const midpoints: Record<string, number> = { emerge: .10, pull: .40, press: .69, pierce: .84, release: .95 }
    const capture = () => {
      const phase = target.dataset.motionPhase
      const progress = Number(target.dataset.motionProgress)
      if (phase && midpoints[phase] !== undefined && progress >= midpoints[phase] && !frames[phase]) frames[phase] = target.toDataURL('image/png')
    }
    const observer = new MutationObserver(capture)
    observer.observe(target, { attributes: true, attributeFilter: ['data-motion-phase', 'data-motion-progress'] })
    ;(window as unknown as { __deesewsewMotionFrames: Record<string, string>; __deesewsewMotionObserver: MutationObserver }).__deesewsewMotionFrames = frames
    ;(window as unknown as { __deesewsewMotionFrames: Record<string, string>; __deesewsewMotionObserver: MutationObserver }).__deesewsewMotionObserver = observer
  })
  await page.mouse.click(box.x + box.width * .63, box.y + box.height * .52)
  await expect(canvas).toHaveAttribute('data-motion-state', 'running')
  await expect(canvas).toHaveAttribute('data-motion-phase', 'idle', { timeout: 2_000 })
  const motionFrames = await page.evaluate(() => {
    const state = window as unknown as { __deesewsewMotionFrames: Record<string, string>; __deesewsewMotionObserver: MutationObserver }
    state.__deesewsewMotionObserver.disconnect()
    return state.__deesewsewMotionFrames
  })
  for (const phase of ['emerge', 'pull', 'press', 'pierce', 'release']) {
    expect(motionFrames[phase], `missing captured ${phase} frame`).toBeTruthy()
    await writeFile(`review/feature-3d/stitch-motion-${phase}.png`, Buffer.from(motionFrames[phase]!.split(',')[1]!, 'base64'))
  }
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('deesewsew-piece-v1') ?? '{}').punctures?.[0]?.color)).toBe(customColor)
  const savedPuncture = await page.evaluate(() => JSON.parse(localStorage.getItem('deesewsew-piece-v1') ?? '{}').punctures[0])
  expect(savedPuncture.position.x).toBeCloseTo(.63, 2)
  expect(savedPuncture.position.y).toBeCloseTo(.52, 2)

  await page.reload()
  await expect(page.getByRole('radio', { name: 'Custom #1A9C8D' })).toHaveAttribute('aria-checked', 'true')
  const persisted = await page.evaluate(() => JSON.parse(localStorage.getItem('deesewsew-settings-v1') ?? '{}'))
  expect(persisted.customColors).toContain(customColor)
  expect(persisted.selectedColor).toBe(customColor)
})

test('reduced-motion preference avoids continuous rotation and defaults stitch motion off', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.reload()
  await expect(page.locator('#motion-toggle')).toHaveAttribute('aria-pressed', 'false')
  await expect(page.locator('#motion-toggle')).toBeDisabled()
  await expect(page.locator('#rotate-view')).toBeDisabled()
  const rotator = page.locator('#hoop-rotator')
  expect(await rotator.evaluate((element) => getComputedStyle(element).animationName)).toBe('none')
  expect(await rotator.evaluate((element) => getComputedStyle(element).transform)).not.toBe('none')
  await page.getByRole('button', { name: 'Snap back' }).click()
  await expect(page.locator('#hoop-shell')).toHaveAttribute('data-view-state', 'back')
  await page.getByRole('button', { name: 'Return front' }).click()
  await expect(page.locator('#hoop-shell')).toHaveAttribute('data-view-state', 'front')
})
