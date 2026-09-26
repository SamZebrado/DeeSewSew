import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const evidence = resolve('experiments/pressure/evidence')
await mkdir(evidence, { recursive: true })
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' })
const page = await browser.newPage({ viewport: { width: 1000, height: 760 } })
const results = {}
try {
  await page.goto('http://127.0.0.1:5300/DeeSewSew/experiments/pressure/', { waitUntil: 'networkidle' })
  await page.waitForSelector('#preview')
  await page.evaluate(() => {
    document.querySelector('#preview').setPointerCapture = () => {}
  })
  const send = async (type, pointerType, pressure, buttons, pointerId = 7) => page.evaluate(({ type, pointerType, pressure, buttons, pointerId }) => {
    const canvas = document.querySelector('#preview')
    const rect = canvas.getBoundingClientRect()
    canvas.dispatchEvent(new PointerEvent(type, { bubbles: true, isPrimary: true, pointerId, pointerType, pressure, buttons, button: 0, clientX: rect.left + rect.width * .8, clientY: rect.top + rect.height * .55 }))
    return document.querySelector('#status').value
  }, { type, pointerType, pressure, buttons, pointerId })
  await send('pointerdown', 'pen', .15, 1)
  results.light = await send('pointermove', 'pen', .15, 1)
  await page.waitForTimeout(500)
  results.lightSag = await page.locator('#preview').getAttribute('data-sag')
  await page.screenshot({ path: resolve(evidence, 'cubic-light-synthetic-pen.png') })
  results.firm = await send('pointermove', 'pen', .9, 1)
  await page.waitForTimeout(500)
  results.firmSag = await page.locator('#preview').getAttribute('data-sag')
  await page.screenshot({ path: resolve(evidence, 'cubic-firm-synthetic-pen.png') })
  results.release = await send('pointerup', 'pen', 0, 0)
  await send('pointerdown', 'pen', .8, 1, 12)
  results.cancel = await send('pointercancel', 'pen', 0, 0, 12)
  await send('pointerdown', 'pen', .5, 1, 9)
  results.coalesced = await page.evaluate(() => {
    const canvas = document.querySelector('#preview')
    const rect = canvas.getBoundingClientRect()
    const position = { clientX: rect.left + rect.width * .8, clientY: rect.top + rect.height * .55 }
    const inner = new PointerEvent('pointermove', { pointerId: 9, pointerType: 'pen', pressure: .7, buttons: 1, isPrimary: true, ...position })
    const outer = new PointerEvent('pointermove', { bubbles: true, pointerId: 9, pointerType: 'pen', pressure: .5, buttons: 1, isPrimary: true, ...position })
    Object.defineProperty(outer, 'getCoalescedEvents', { value: () => [inner] })
    canvas.dispatchEvent(outer)
    return document.querySelector('#status').value
  })
  await send('pointercancel', 'pen', 0, 0, 9)
  await send('pointerdown', 'pen', .8, 1, 10)
  await send('pointercancel', 'pen', 0, 0, 11)
  results.unrelatedCancel = await send('pointermove', 'pen', .75, 1, 10)
  await send('lostpointercapture', 'pen', 0, 0, 11)
  results.unrelatedCaptureLoss = await send('pointermove', 'pen', .72, 1, 10)
  results.ownedCaptureLoss = await send('lostpointercapture', 'pen', 0, 0, 10)
  await send('pointerdown', 'mouse', .5, 1, 8)
  results.mouse = await send('pointermove', 'mouse', .5, 1, 8)
  await page.waitForTimeout(500)
  results.mouseScale = await page.locator('#preview').getAttribute('data-slack-scale')
  await page.screenshot({ path: resolve(evidence, 'cubic-mouse-neutral.png') })
  await send('pointerup', 'mouse', 0, 0, 8)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.waitForFunction(() => document.querySelector('#preview').dataset.reducedMotion === 'true')
  results.liveReducedMotion = await page.locator('#preview').getAttribute('data-reduced-motion')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.waitForFunction(() => document.querySelector('#preview').dataset.reducedMotion === 'false')
  results.liveRegularMotion = await page.locator('#preview').getAttribute('data-reduced-motion')
  if (!results.light.includes('0.15') || !results.firm.includes('0.90') || !results.mouse.includes('Neutral')
    || !results.coalesced.includes('0.50') || !results.unrelatedCancel.includes('0.75')
    || !results.unrelatedCaptureLoss.includes('0.72') || !results.ownedCaptureLoss.includes('Neutral') || !results.cancel.includes('Neutral')
    || !(Number(results.lightSag) > Number(results.firmSag)) || results.mouseScale !== '1'
    || results.liveReducedMotion !== 'true' || results.liveRegularMotion !== 'false') throw new Error(`Unexpected results: ${JSON.stringify(results)}`)
  await writeFile(resolve(evidence, 'cubic-smoke.json'), JSON.stringify({ ...results, browser: 'Playwright Chromium', input: 'synthetic PointerEvent', hardwareValidated: false, pathHelper: 'looseThreadPath' }, null, 2) + '\n')
  console.log(JSON.stringify(results))
} finally {
  await page.close()
  await browser.close()
}
