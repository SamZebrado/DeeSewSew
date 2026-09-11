import { test, expect, type Page, type TestInfo } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { emptyThreadRuns, startThreadAt, punctureThreadRun, endThreadRun } from '../../src/thread-runs'
import { parseThreadArtwork, serializeThreadArtwork } from '../../src/thread-run-storage'
import { MAX_STITCHES_PER_PIECE, MAX_PIECE_STORAGE_CHARACTERS } from '../../src/stitch-model'

const small = () => serializeThreadArtwork(endThreadRun(punctureThreadRun(startThreadAt(emptyThreadRuns(), 'front', { x: .31, y: .32 }, { type: 'running', color: '#9b4a48' }), { x: .55, y: .39 }, { type: 'running', color: '#9b4a48' })))
const stored = (page: Page) => page.evaluate(() => localStorage.getItem('deesewsew-piece-v1'))
async function importRaw(page: Page, raw: string) {
  await page.locator('#artwork-file').setInputFiles({ name: 'fixture.json', mimeType: 'application/json', buffer: Buffer.from(raw) })
  await expect.poll(() => stored(page)).toBe(raw)
}
async function download(page: Page, info: TestInfo, choice = 'front') {
  const event = page.waitForEvent('download')
  await page.locator(`[data-png="${choice}"]`).click()
  return save(await event, info)
}
async function save(file: import('@playwright/test').Download, info: TestInfo) {
  const path = info.outputPath(`${Date.now()}-${file.suggestedFilename()}`)
  await file.saveAs(path)
  const bytes = await readFile(path)
  expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
  return bytes
}
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('deesewsew-locale-v1', 'en'))
  await page.goto('./')
})

for (const deviceScaleFactor of [.8, 2]) test(`PNG dimensions stay exact at device pixel ratio ${deviceScaleFactor}`, async ({ browser }, info) => {
  const context = await browser.newContext({ deviceScaleFactor, baseURL: info.project.use.baseURL })
  try {
    const page = await context.newPage(); await page.goto('./')
    expect(await page.evaluate(() => devicePixelRatio)).toBeCloseTo(deviceScaleFactor)
    for (const choice of ['front', 'back', 'pair']) {
      const bytes = await download(page, info, choice)
      expect(bytes.readUInt32BE(16)).toBe(choice === 'pair' ? 2048 : 1024)
      expect(bytes.readUInt32BE(20)).toBe(1024)
    }
  } finally { await context.close() }
})

test('actual ThreadRun file import and reload preserve clean PNG and canonical JSON', async ({ page }, info) => {
  const raw = small(); await importRaw(page, raw)
  const front = await download(page, info), back = await download(page, info, 'back')
  await page.reload()
  expect(await stored(page)).toBe(raw)
  expect(await download(page, info)).toEqual(front)
  expect(await download(page, info, 'back')).toEqual(back)
  expect(await stored(page)).toBe(raw)
})

test('encoding snapshot survives intervening real canonical edit', async ({ page }, info) => {
  const raw = small(); await importRaw(page, raw)
  const before = await download(page, info)
  await page.evaluate(() => {
    const original = HTMLCanvasElement.prototype.toBlob
    Object.assign(window, { restorePngEncoder: () => { HTMLCanvasElement.prototype.toBlob = original } })
    HTMLCanvasElement.prototype.toBlob = function (callback, ...args) {
      original.call(this, blob => { Object.assign(window, { releasePng: () => callback(blob) }) }, ...args)
    }
  })
  const event = page.waitForEvent('download')
  await page.locator('[data-png="front"]').click()
  await page.waitForFunction(() => typeof (window as any).releasePng === 'function')
  const hoop = page.locator('#hoop-shell'); await hoop.scrollIntoViewIfNeeded()
  const box = (await hoop.boundingBox())!
  await page.mouse.click(box.x + box.width * .45, box.y + box.height * .6)
  await expect.poll(() => stored(page)).not.toBe(raw)
  await page.mouse.click(box.x + box.width * .6, box.y + box.height * .55)
  const initialFrontSegments = parseThreadArtwork(raw).topology.segments.filter(segment => segment.side === 'front').length
  await expect.poll(async () => parseThreadArtwork((await stored(page))!).topology.segments.filter(segment => segment.side === 'front').length).toBe(initialFrontSegments + 1)
  const edited = await stored(page)
  await page.evaluate(() => { (window as any).restorePngEncoder(); (window as any).releasePng() })
  expect(await save(await event, info)).toEqual(before)
  expect(await stored(page)).toBe(edited)
  await expect(page.locator('[data-png="front"]')).toBeEnabled()
  expect(await download(page, info)).not.toEqual(before)
  expect(await stored(page)).toBe(edited)
})

test('null encoding detaches temporary canvas and retry succeeds', async ({ page }, info) => {
  await importRaw(page, small())
  const original = await stored(page), canvasCount = await page.locator('canvas').count()
  await page.evaluate(() => {
    const original = HTMLCanvasElement.prototype.toBlob
    Object.assign(window, { nullPngInjections: 0 })
    HTMLCanvasElement.prototype.toBlob = function (callback) {
      ;(window as any).nullPngInjections++
      HTMLCanvasElement.prototype.toBlob = original
      callback(null)
    }
  })
  await page.locator('[data-png="front"]').click()
  await expect(page.locator('#status-title')).toHaveText('PNG export failed')
  expect(await page.evaluate(() => (window as any).nullPngInjections)).toBe(1)
  await expect(page.locator('[data-png="front"]')).toBeEnabled()
  await expect(page.locator('canvas')).toHaveCount(canvasCount)
  expect(await stored(page)).toBe(original)
  await download(page, info)
  expect(await page.evaluate(() => (window as any).nullPngInjections)).toBe(1)
  await expect(page.locator('canvas')).toHaveCount(canvasCount)
  expect(await stored(page)).toBe(original)
})

test('accepted near-capacity artwork exports without canonical mutation', async ({ page }, info) => {
  test.setTimeout(120_000)
  const stitches = Array.from({ length: MAX_STITCHES_PER_PIECE }, (_, i) => ({ id: `load-${i}`, type: 'running', start: { x: .3 + i % 40 / 100, y: .3 + Math.floor(i / 40) % 40 / 100 }, end: { x: .305 + i % 40 / 100, y: .305 + Math.floor(i / 40) % 40 / 100 }, color: '#9b4a48', width: 2.4, order: i + 1, seed: i + 1 }))
  const encode = (count: number) => serializeThreadArtwork(parseThreadArtwork(JSON.stringify({ schemaVersion: 1, nextOrder: count + 1, stitches: stitches.slice(0, count) })))
  let low = 0, high = MAX_STITCHES_PER_PIECE
  while (low < high) {
    const middle = Math.ceil((low + high) / 2)
    try { encode(middle); low = middle } catch (error) { if (!(error instanceof RangeError)) throw error; high = middle - 1 }
  }
  const raw = encode(low), state = parseThreadArtwork(raw)
  expect(state.topology.legacyFrontStitches).toHaveLength(low)
  expect(low).toBeGreaterThan(1000)
  if (low < MAX_STITCHES_PER_PIECE) expect(() => encode(low + 1)).toThrow(RangeError)
  expect(raw.length).toBeLessThanOrEqual(MAX_PIECE_STORAGE_CHARACTERS - 4096)
  await importRaw(page, raw)
  const start = performance.now(), bytes = await download(page, info, 'pair')
  const elapsedMs = performance.now() - start
  expect(bytes.readUInt32BE(16)).toBe(2048); expect(bytes.readUInt32BE(20)).toBe(1024)
  expect(await stored(page)).toBe(raw)
  await info.attach('near-capacity-export-observation', { body: JSON.stringify({ count: low, rawCharacters: raw.length, pngBytes: bytes.length, elapsedMs, limit: 'largest accepted prefix of this legacy fixture; not a physical-device benchmark' }), contentType: 'application/json' })
})
