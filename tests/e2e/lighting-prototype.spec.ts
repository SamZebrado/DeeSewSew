import { expect, test, type Page } from '@playwright/test'
import { writeFile } from 'node:fs/promises'
import { emptyEmbroideryPiece, punctureFabric, serializeEmbroideryPiece } from '../../src/embroidery-topology'

test('bounded lighting switch profile on 1000 canonical segments', async ({ page }, info) => {
  let piece = emptyEmbroideryPiece()
  for (let i = 0; i < 1001; i++) piece = punctureFabric(piece, { x: .5 + .28 * Math.cos(i * .37), y: .5 + .28 * Math.sin(i * .37) }, { type: 'running', color: '#425f86' }).piece
  expect(piece.segments).toHaveLength(1000)
  await page.addInitScript(raw => localStorage.setItem('deesewsew-piece-v1', raw), serializeEmbroideryPiece(piece))
  await page.goto('./')
  const result = await page.evaluate(async () => {
    const url = performance.getEntriesByType('resource').map(e => e.name).find(name => /\/src\/renderer\.ts(?:\?|$)/.test(name))!
    const { EmbroideryRenderer } = await import(/* @vite-ignore */ url)
    const proto = EmbroideryRenderer.prototype, original = proto.render
    const renders: { face: string; ms: number }[] = []
    proto.render = function(...args: unknown[]) {
      const start = performance.now()
      try { return original.apply(this, args) }
      finally { renders.push({ face: this.canvas?.id ?? 'unavailable', ms: performance.now() - start }) }
    }
    const counters = () => [...document.querySelectorAll<HTMLCanvasElement>('.hoop-face canvas')].map(c => ({ ...(c as unknown as { __deesewsewRendererCounters: Record<string, number> }).__deesewsewRendererCounters }))
    const beforeRaw = localStorage.getItem('deesewsew-piece-v1')
    const initial = counters(), switches = []
    const select = document.querySelector<HTMLSelectElement>('#studio-lighting')!
    try {
      for (const id of ['warm-lamp', 'flat-worklight', 'soft-daylight', 'warm-lamp', 'flat-worklight', 'soft-daylight']) {
        const before = counters(), start = performance.now(), from = renders.length
        select.value = id; select.dispatchEvent(new Event('change', { bubbles: true }))
        const ms = performance.now() - start, after = counters()
        const sameStart = performance.now()
        select.dispatchEvent(new Event('change', { bubbles: true }))
        switches.push({ id, ms, sameMs: performance.now()-sameStart, before, after, same: counters(), renders: renders.slice(from) })
      }
      const idleBefore = counters()
      await new Promise(resolve => setTimeout(resolve, 500))
      return { initial, switches, idleBefore, idleAfter: counters(), canonicalUnchanged: localStorage.getItem('deesewsew-piece-v1') === beforeRaw, userAgent: navigator.userAgent, dpr: devicePixelRatio, limits: 'Synthetic synchronous select handler + development render canvas submission; excludes GPU/compositor. Six switches, 1000 legacy canonical segments loaded through normal migration; no universal FPS or device claim.' }
    } finally { proto.render = original }
  })
  await writeFile(info.outputPath('lighting-profile.json'), JSON.stringify(result, null, 2))
  expect(result.canonicalUnchanged).toBe(true)
  expect(result.idleAfter).toEqual(result.idleBefore)
  for (const step of result.switches) {
    expect(step.same).toEqual(step.after)
    for (let face = 0; face < 2; face++) expect(step.after[face]!.staticBuild! - step.before[face]!.staticBuild!).toBe(1)
  }
})

const presets = ['soft-daylight', 'warm-lamp', 'flat-worklight'] as const
const rawPiece = (page: Page) => page.evaluate(() => localStorage.getItem('deesewsew-piece-v1'))
const counters = (page: Page) => page.locator('.hoop-face canvas').evaluateAll(canvases => canvases.map(canvas =>
  ({ ...(canvas as unknown as { __deesewsewRendererCounters: Record<string, number> }).__deesewsewRendererCounters })))
async function puncture(page: Page, x: number, y: number) {
  const box = (await page.locator('#embroidery').boundingBox())!
  await page.mouse.click(box.x + box.width * x, box.y + box.height * y)
}
async function makePiece(page: Page) {
  await page.addInitScript(() => {
    // Locale only; never overwrite artwork on reload.
    if (!localStorage.getItem('deesewsew-locale-v1')) localStorage.setItem('deesewsew-locale-v1', 'en')
  })
  await page.goto('./')
  await page.locator('#motion-toggle').click()
  for (const [index, points] of [
    [[.3, .35], [.5, .25], [.7, .35]],
    [[.3, .6], [.5, .75], [.7, .6]],
    [[.35, .47], [.5, .55], [.65, .47]],
  ].entries()) {
    await page.locator('#palette .swatch').nth([0, 3, 2][index]!).click()
    for (const [x, y] of points) await puncture(page, x!, y!)
    await page.locator('#end-thread').click()
  }
  await page.locator('.lighting-options summary').click()
  await page.mouse.move(1200, 10)
  return (await rawPiece(page))!
}

test('failed settings write keeps artwork and saved preference, exposes bilingual temporary warning', async ({ page }, info) => {
  const original = await makePiece(page)
  const saved = await page.evaluate(() => localStorage.getItem('deesewsew-settings-v2'))
  await page.evaluate(() => {
    const set = Storage.prototype.setItem
    Storage.prototype.setItem = function(key, value) {
      if (key === 'deesewsew-settings-v2') throw new DOMException('Injected settings quota', 'QuotaExceededError')
      return set.call(this, key, value)
    }
  })
  const before = await counters(page)
  await page.locator('#studio-lighting').selectOption('warm-lamp')
  await expect(page.getByText('Studio settings are temporary; device storage failed.')).toBeVisible()
  const after = await counters(page)
  for (let face = 0; face < 2; face++) expect(after[face]!.staticBuild! - before[face]!.staticBuild!).toBe(1)
  expect(await rawPiece(page)).toBe(original)
  expect(await page.evaluate(() => localStorage.getItem('deesewsew-settings-v2'))).toBe(saved)
  await page.screenshot({ path: info.outputPath('settings-failure-en.png'), fullPage: true })
  await page.locator('#language-toggle').click()
  await expect(page.getByText('本机存储失败，工作室设置仅临时有效。')).toBeVisible()
  await page.screenshot({ path: info.outputPath('settings-failure-zh.png'), fullPage: true })
  await page.reload()
  await expect(page.locator('#studio-lighting')).toHaveValue('soft-daylight')
  expect(await rawPiece(page)).toBe(original)
})

test('invalid and excluded saved lighting fall back without an implicit settings rewrite', async ({ page }) => {
  await page.goto('./')
  for (const lightingId of ['unrecognized-light', 'cool-side-light']) {
    const raw = JSON.stringify({ schemaVersion: 2, lightingId, motionEnabled: false, selectedColor: '#b9403c', customColors: [] })
    await page.evaluate(value => localStorage.setItem('deesewsew-settings-v2', value), raw)
    await page.reload()
    await expect(page.locator('#studio-lighting')).toHaveValue('soft-daylight')
    expect(await page.evaluate(() => localStorage.getItem('deesewsew-settings-v2'))).toBe(raw)
    await page.locator('.lighting-options summary').click()
    await page.locator('#studio-lighting').selectOption('warm-lamp')
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('deesewsew-settings-v2')!).lightingId)).toBe('warm-lamp')
  }
})

test('three lights preserve canonical artwork, synchronize faces, persist and settle idle', async ({ page }, info) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  const original = await makePiece(page)
  expect(JSON.parse(original).runs).toHaveLength(3)
  const evidence: unknown[] = []
  for (const preset of presets) {
    const before = await counters(page)
    await page.locator('#studio-lighting').selectOption(preset)
    const after = await counters(page)
    for (let face = 0; face < 2; face++) {
      expect(after[face]!.staticBuild! - before[face]!.staticBuild!).toBe(preset === 'soft-daylight' ? 0 : 1)
    }
    const same = await counters(page)
    await page.locator('#studio-lighting').selectOption(preset)
    expect(await counters(page)).toEqual(same)
    expect(await rawPiece(page)).toBe(original)
    for (const side of ['front', 'back']) {
      const button = page.locator(side === 'front' ? '#view-front' : '#view-back')
      if (await button.isEnabled()) await button.click()
      await page.mouse.move(1200, 10)
      await page.screenshot({ path: info.outputPath(`${preset}-${side}-desktop.png`), fullPage: true })
      expect(await rawPiece(page)).toBe(original)
    }
    const idleBefore = await counters(page)
    await page.waitForTimeout(500) // Bounded idle observation, not a performance/FPS measurement.
    expect(await counters(page)).toEqual(idleBefore)
    evidence.push({ preset, before, after, idle: idleBefore })
  }
  await page.reload()
  await expect(page.locator('#studio-lighting')).toHaveValue('flat-worklight')
  expect(await rawPiece(page)).toBe(original)
  await page.locator('.lighting-options summary').click()
  await page.locator('#language-toggle').click()
  await expect(page.locator('.lighting-options summary')).toHaveText('外观')
  await expect(page.locator('label[for="studio-lighting"]')).toHaveText('光照')
  await expect(page.locator('#studio-lighting option:checked')).toHaveText('工作灯')
  expect(await rawPiece(page)).toBe(original)
  await page.screenshot({ path: info.outputPath('flat-worklight-zh-desktop.png'), fullPage: true })
  expect(errors).toEqual([])
  await info.attach('lighting-invariants.json', { body: JSON.stringify({ original: JSON.parse(original), evidence, errors }, null, 2), contentType: 'application/json' })
})

test('light changes during actual stitch motion retain committed geometry and stop idle', async ({ page }, info) => {
  const original = await makePiece(page)
  await page.locator('#motion-toggle').click()
  await puncture(page, .35, .42)
  await puncture(page, .65, .57)
  const committed = (await rawPiece(page))!
  expect(JSON.parse(committed).punctures.length).toBe(JSON.parse(original).punctures.length + 2)
  await expect(page.locator('#embroidery')).toHaveAttribute('data-motion-state', 'running')
  const progressBefore = Number(await page.locator('#embroidery').getAttribute('data-motion-progress'))
  await page.locator('#studio-lighting').selectOption('warm-lamp')
  expect(await rawPiece(page)).toBe(committed)
  const progressAfter = Number(await page.locator('#embroidery').getAttribute('data-motion-progress'))
  expect(progressAfter).toBeGreaterThanOrEqual(progressBefore)
  await expect(page.locator('#embroidery')).not.toHaveAttribute('data-motion-state', 'running')
  await page.locator('#end-thread').click()
  const ended = await rawPiece(page)
  await page.mouse.move(1200, 10)
  const before = await counters(page)
  await page.waitForTimeout(500)
  expect(await counters(page)).toEqual(before)
  expect(await rawPiece(page)).toBe(ended)
  await page.screenshot({ path: info.outputPath('motion-light-settled.png'), fullPage: true })
})

test('phone and tablet controls remain localized, labeled and within the viewport', async ({ page }, info) => {
  const original = await makePiece(page)
  for (const [name, width, height] of [['tablet', 768, 1024], ['phone', 390, 844]] as const) {
    await page.setViewportSize({ width, height })
    await page.locator('#studio-lighting').scrollIntoViewIfNeeded()
    await page.locator('#studio-lighting').selectOption('warm-lamp')
    await page.locator('#studio-lighting').focus()
    expect(await page.locator('#studio-lighting').evaluate(el => el === document.activeElement)).toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const box = (await page.locator('#studio-lighting').boundingBox())!
    expect(box.height).toBeGreaterThanOrEqual(44)
    await page.screenshot({ path: info.outputPath(`${name}-en-open.png`), fullPage: true })
    await page.locator('#language-toggle').click()
    await expect(page.locator('#studio-lighting option:checked')).toHaveText('暖灯')
    await page.screenshot({ path: info.outputPath(`${name}-zh-open.png`), fullPage: true })
    expect(await rawPiece(page)).toBe(original)
    await page.locator('#language-toggle').click()
  }
})
