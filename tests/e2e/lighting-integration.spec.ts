import { test, expect } from '@playwright/test'
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { emptyThreadRuns, startThreadAt, punctureThreadRun, endThreadRun } from '../../src/thread-runs'
import { serializeThreadArtwork } from '../../src/thread-run-storage'

test('standardized PNG bytes and canonical artwork stay exact across all screen lights', async ({ page }, info) => {
  let piece = emptyThreadRuns()
  for (const side of ['front', 'back'] as const) {
    const style = { type: 'running' as const, color: side === 'front' ? '#9b4a48' : '#55765b' }
    piece = endThreadRun(punctureThreadRun(startThreadAt(piece, side, { x: .31, y: side === 'front' ? .32 : .65 }, style), { x: .62, y: .55 }, style))
  }
  const raw = serializeThreadArtwork(piece)
  await page.addInitScript(value => { localStorage.setItem('deesewsew-piece-v1', value); localStorage.setItem('deesewsew-locale-v1', 'en') }, raw)
  await page.goto('./')
  await page.locator('.lighting-options summary').click()
  await expect(page.locator('#lighting-help')).toHaveText('Screen lighting only; PNG images always use soft daylight.')
  const hashes: Record<string, Record<string,string>> = {}
  for (const preset of ['soft-daylight', 'warm-lamp', 'flat-worklight']) {
    await page.locator('#studio-lighting').selectOption(preset)
    hashes[preset] = {}
    for (const choice of ['front', 'back', 'pair']) {
      const pending = page.waitForEvent('download')
      await page.locator(`[data-png="${choice}"]`).click()
      const download = await pending, path = info.outputPath(`${preset}-${choice}.png`)
      await download.saveAs(path)
      hashes[preset]![choice] = createHash('sha256').update(await readFile(path)).digest('hex')
    }
    expect(hashes[preset]).toEqual(hashes['soft-daylight'])
    expect(await page.evaluate(() => localStorage.getItem('deesewsew-piece-v1'))).toBe(raw)
  }
  for (const [name, width, height] of [['desktop',1280,1180],['tablet',768,1024],['phone',390,844]] as const) {
    await page.setViewportSize({ width, height })
    for (const locale of ['en','zh']) {
      if (locale === 'zh') await page.locator('#language-toggle').click()
      for (const side of ['front','back']) {
        const view = page.locator(`#view-${side}`)
        if (await view.isEnabled()) await view.click()
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
        await page.screenshot({ path: info.outputPath(`${name}-${locale}-${side}.png`), fullPage: true })
      }
      if (locale === 'zh') await page.locator('#language-toggle').click()
    }
  }
  await writeFile(info.outputPath('hashes.json'), JSON.stringify(hashes, null, 2))
})

test('narrow phone settings failure warning and PNG lighting policy stay readable in both languages', async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 740 })
  await page.addInitScript(() => localStorage.setItem('deesewsew-locale-v1', 'en'))
  await page.goto('./')
  await page.locator('.lighting-options summary').click()
  await page.evaluate(() => {
    const set = Storage.prototype.setItem
    Storage.prototype.setItem = function(key,value) { if (key === 'deesewsew-settings-v2') throw new DOMException('Injected quota','QuotaExceededError'); return set.call(this,key,value) }
  })
  await page.locator('#studio-lighting').selectOption('warm-lamp')
  for (const locale of ['en','zh']) {
    if (locale === 'zh') await page.locator('#language-toggle').click()
    const warning = page.getByText(locale === 'en' ? 'Studio settings are temporary; device storage failed.' : '本机存储失败，工作室设置仅临时有效。')
    await expect(warning).toBeVisible()
    const box = (await warning.boundingBox())!
    expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x+box.width).toBeLessThanOrEqual(320)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: info.outputPath(`phone-warning-${locale}.png`), fullPage: true })
  }
})
