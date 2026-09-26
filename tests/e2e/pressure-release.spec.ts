import { expect, test, type Page } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const evidence = resolve('review/pressure-release-20260927/focused')

async function fixture(page: Page) {
  await page.goto('./')
  const hoop = page.locator('#hoop-shell')
  await hoop.scrollIntoViewIfNeeded()
  const box = await hoop.boundingBox()
  if (!box) throw new Error('Missing hoop')
  const at = async (x: number, y: number) => {
    const current = await hoop.boundingBox()
    if (!current) throw new Error('Missing hoop')
    return { x: current.x + current.width * x, y: current.y + current.height * y }
  }
  const cdp = await page.context().newCDPSession(page)
  const pen = {
    down: async (x: number, y: number, force: number) => {
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, pointerType: 'pen' })
      await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1, pointerType: 'pen', force })
    },
    move: async (x: number, y: number, force: number) => cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'left', buttons: 1, pointerType: 'pen', force }),
    up: async (x: number, y: number) => cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1, pointerType: 'pen', force: 0 }),
  }
  const touch = async (type: 'touchStart' | 'touchMove' | 'touchEnd', contacts: { x: number; y: number; id: number; force?: number }[]) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: contacts })
  const scale = async () => Number(await hoop.getAttribute('data-pressure-slack-scale'))
  const count = async () => page.evaluate(() => JSON.parse(localStorage.getItem('deesewsew-piece-v1') ?? '{"punctures":[]}').punctures.length as number)
  const first = await at(.4, .45)
  await page.mouse.click(first.x, first.y)
  expect(await count()).toBe(1)
  return { hoop, at, pen, touch, scale, count }
}

test('CDP pen ON grades pressure while OFF, constant pen, mouse and touch stay neutral', async ({ page }) => {
  const { hoop, at, pen, touch, scale } = await fixture(page)
  await page.locator('#view-back').click()
  await hoop.scrollIntoViewIfNeeded()
  let p = await at(.68, .55)
  await pen.down(p.x, p.y, .9)
  await pen.move(p.x + 5, p.y, .9)
  expect(await scale()).toBe(1)
  expect(Number(await hoop.getAttribute('data-active-thread-points'))).toBeGreaterThan(0)
  await mkdir(evidence, { recursive: true })
  await page.waitForTimeout(350)
  const offSag = await hoop.getAttribute('data-active-thread-sag')
  await page.screenshot({ path: resolve(evidence, 'off-cdp-pen.png') })
  await hoop.screenshot({ path: resolve(evidence, 'off-cdp-pen-hoop.png') })
  await page.evaluate(() => window.dispatchEvent(new Event('blur')))
  await pen.up(p.x + 5, p.y)
  await page.locator('#pressure-toggle').click()
  await hoop.scrollIntoViewIfNeeded()
  p = await at(.68, .55)
  await pen.down(p.x, p.y, .5)
  await pen.move(p.x + 5, p.y, .5)
  expect(await scale()).toBe(1)
  await page.evaluate(() => {
    (window as unknown as { pressureMoves: unknown[] }).pressureMoves = []
    document.querySelector('#hoop-shell')!.addEventListener('pointermove', event => {
      const e = event as PointerEvent
      ;(window as unknown as { pressureMoves: unknown[] }).pressureMoves.push({ pressure: e.pressure, buttons: e.buttons, pointerType: e.pointerType, isPrimary: e.isPrimary, pointerId: e.pointerId, tiltX: e.tiltX, tiltY: e.tiltY })
    })
  })
  for (const [force, expected] of [[0, 1.65], [.2, 1.39], [.5, 1], [.9, .48]]) {
    await pen.move(p.x + 5, p.y, force)
    expect(await scale()).toBeCloseTo(expected, 2)
  }
  await page.waitForTimeout(350)
  const onSag = await hoop.getAttribute('data-active-thread-sag')
  await page.screenshot({ path: resolve(evidence, 'on-cdp-pen.png') })
  await hoop.screenshot({ path: resolve(evidence, 'on-cdp-pen-hoop.png') })
  await pen.up(p.x + 5, p.y)
  expect(await scale()).toBe(1)
  const m = await at(.64, .62)
  await page.mouse.move(m.x, m.y)
  await page.mouse.down()
  await page.mouse.move(m.x + 5, m.y)
  expect(await scale()).toBe(1)
  expect(Number(await hoop.getAttribute('data-active-thread-points'))).toBeGreaterThan(0)
  await page.evaluate(() => window.dispatchEvent(new Event('blur')))
  await page.mouse.up()
  const t = await at(.72, .61)
  await page.evaluate(() => {
    (window as unknown as { touchPressure: number[] }).touchPressure = []
    document.querySelector('#hoop-shell')!.addEventListener('pointermove', event => {
      const e = event as PointerEvent
      if (e.pointerType === 'touch') (window as unknown as { touchPressure: number[] }).touchPressure.push(e.pressure)
    })
  })
  await touch('touchStart', [{ ...t, id: 99, force: .9 }])
  await touch('touchMove', [{ x: t.x + 5, y: t.y, id: 99, force: .9 }])
  expect(await scale()).toBe(1)
  expect(Number(await hoop.getAttribute('data-active-thread-points'))).toBeGreaterThan(0)
  const touchPressure = await page.evaluate(() => (window as unknown as { touchPressure: number[] }).touchPressure)
  expect(touchPressure.some(value => value > .5)).toBe(true)
  await touch('touchEnd', [])
  const observed = await page.evaluate(() => (window as unknown as { pressureMoves: unknown[] }).pressureMoves)
  const penMoves = observed.filter((sample: any) => sample.pointerType === 'pen').slice(0, 4) as { pressure: number; buttons: number; isPrimary: boolean; tiltX: number; tiltY: number }[]
  expect(penMoves).toHaveLength(4)
  penMoves.forEach((sample, index) => {
    expect(sample.pressure).toBeCloseTo([0, .2, .5, .9][index], 2)
    expect(sample.buttons).toBe(1)
    expect(sample.isPrimary).toBe(true)
    expect(sample.tiltX).toBe(0)
    expect(sample.tiltY).toBe(0)
  })
  await writeFile(resolve(evidence, 'cdp-visual-fallback.json'), JSON.stringify({ gradedForces: [0, .2, .5, .9], observed, offSag, onSag, touchPressure, fallback: ['OFF pen', 'constant .5 pen', 'native mouse', 'native CDP touch force .9'], input: 'CDP pen and touch, native browser PointerEvent and capture', hardwareValidated: false }, null, 2) + '\n')
})

test('blur, two-touch takeover and undo cancel ON pen ownership; fresh tap and redo work', async ({ page }) => {
  const { at, pen, touch, scale, count } = await fixture(page)
  await page.locator('#pressure-toggle').click()
  await page.locator('#hoop-shell').scrollIntoViewIfNeeded()
  const p = await at(.68, .55)
  await pen.down(p.x, p.y, .9)
  expect(await scale()).toBeCloseTo(.48, 2)
  await page.evaluate(() => window.dispatchEvent(new Event('blur')))
  expect(await scale()).toBe(1)
  await pen.up(p.x, p.y)
  expect(await count()).toBe(1)
  await pen.down(p.x, p.y, .9)
  expect(await scale()).toBeCloseTo(.48, 2)
  const t1 = await at(.42, .5), t2 = await at(.58, .5)
  await touch('touchStart', [{ ...t1, id: 101 }])
  await touch('touchStart', [{ ...t1, id: 101 }, { ...t2, id: 102 }])
  expect(await scale()).toBe(1)
  await pen.up(p.x, p.y)
  expect(await count()).toBe(1)
  await touch('touchEnd', [])
  await pen.down(p.x, p.y, .9)
  await page.keyboard.press('Control+z')
  expect(await scale()).toBe(1)
  await pen.up(p.x, p.y)
  expect(await count()).toBe(0)
  await page.keyboard.press('Control+Shift+z')
  expect(await count()).toBe(1)
  const fresh = await at(.72, .58)
  await page.mouse.click(fresh.x, fresh.y)
  expect(await count()).toBe(2)
  const committed = await page.evaluate(() => localStorage.getItem('deesewsew-piece-v1'))
  await page.locator('#undo').click()
  expect(await count()).toBe(1)
  await page.locator('#redo').click()
  expect(await count()).toBe(2)
  expect(await page.evaluate(() => localStorage.getItem('deesewsew-piece-v1'))).toBe(committed)
})

test('ON pen move handler and solver state stay bounded, then loop idles', async ({ page }) => {
  const { hoop, at, pen, scale } = await fixture(page)
  await page.locator('#pressure-toggle').click()
  await hoop.scrollIntoViewIfNeeded()
  const p = await at(.68, .55)
  const durations: number[] = []
  await page.exposeFunction('recordPressureDuration', (value: number) => durations.push(value))
  await page.evaluate(() => {
    const shell = document.querySelector('#hoop-shell')!
    let started = 0
    shell.addEventListener('pointermove', () => { started = performance.now() }, { capture: true })
    shell.addEventListener('pointermove', () => { void (window as unknown as { recordPressureDuration: (value: number) => Promise<void> }).recordPressureDuration(performance.now() - started) })
  })
  await pen.down(p.x, p.y, .5)
  for (let i = 0; i < 120; i++) await pen.move(p.x + Math.sin(i * .15) * 18, p.y + Math.cos(i * .11) * 12, .2 + .7 * (i % 10) / 9)
  await expect.poll(() => durations.length).toBeGreaterThanOrEqual(120)
  const points = Number(await hoop.getAttribute('data-active-thread-points'))
  const p95 = [...durations].sort((a, b) => a - b)[Math.floor((durations.length - 1) * .95)]
  expect(points).toBeGreaterThan(0)
  expect(points).toBeLessThanOrEqual(20)
  expect(await scale()).toBeLessThan(1.5)
  await page.evaluate(() => window.dispatchEvent(new Event('blur')))
  await pen.up(p.x, p.y)
  await expect(hoop).toHaveAttribute('data-thread-loop-state', 'idle', { timeout: 3100 })
  await mkdir(evidence, { recursive: true })
  await writeFile(resolve(evidence, 'on-pointermove-performance.json'), JSON.stringify({ samples: durations.length, handlerP95Ms: p95, activePoints: points, loopIdleAfterBlur: true, input: 'CDP synthetic pen; native browser PointerEvent and capture', limitation: 'Handler timing excludes paint and hardware input-to-photon latency; 120 sequential moves are a bounded workload.' }, null, 2) + '\n')
  expect(p95).toBeLessThan(100)
})
