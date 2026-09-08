import { expect, test } from '@playwright/test'
import { writeFile } from 'node:fs/promises'
import { emptyEmbroideryPiece, punctureFabric, serializeEmbroideryPiece } from '../../src/embroidery-topology'
test.use({ video: 'off' })
test('combined browser CPU and cache profile on 1000 canonical segments', async ({ page }, info) => {
  test.skip(info.project.use.baseURL?.includes('4175'), 'Instrumented dev renderer profile; production RAF and video are separate evidence')
  test.setTimeout(60_000)
  let piece = emptyEmbroideryPiece()
  for (let i = 0; i < 1001; i++) piece = punctureFabric(piece, { x: .5 + .28 * Math.cos(i * .37), y: .5 + .28 * Math.sin(i * .37) }, { type: 'running', color: '#425f86' }).piece
  await page.addInitScript(raw => localStorage.setItem('deesewsew-piece-v1', raw), serializeEmbroideryPiece(piece))
  await page.goto('./'); await page.locator('#view-back').click()
  const result = await page.evaluate(async () => {
    const url = performance.getEntriesByType('resource').map(e => e.name).find(name => /\/src\/renderer\.ts(?:\?|$)/.test(name))!
    if (!url) throw Error('Development renderer module not found')
    const { EmbroideryRenderer } = await import(/* @vite-ignore */ url)
    const timings: Record<string, number[]> = { render: [], drawMotion: [], pointer: [], locale: [], parse: [], serialize: [], frames: [] }
    const proto = EmbroideryRenderer.prototype
    const originals = new Map<string, (...args: unknown[]) => unknown>()
    for (const key of ['render', 'drawMotion']) {
      const original = proto[key]; originals.set(key, original)
      proto[key] = function (...args: unknown[]) { const start = performance.now(); try { return original.apply(this, args) } finally { timings[key]!.push(performance.now() - start) } }
    }
    const shell = document.querySelector<HTMLElement>('#hoop-shell')!, rect = shell.getBoundingClientRect()
    const counters = () => [...document.querySelectorAll<HTMLCanvasElement>('.hoop-face canvas')].map(canvas => (canvas as unknown as Record<string, unknown>).__deesewsewRendererCounters)
    const initialCache = counters()
    const frame = () => new Promise<number>(resolve => requestAnimationFrame(resolve))
    const pointer = (event: string, x: number, y: number, shiftKey = false) => {
      const start = performance.now()
      shell.dispatchEvent(new PointerEvent(event, { pointerType: 'mouse', pointerId: 1, isPrimary: true, button: 0, bubbles: true, clientX: rect.left + rect.width * x, clientY: rect.top + rect.height * y, shiftKey }))
      timings.pointer!.push(performance.now() - start)
    }
    let previous = await frame()
    for (let i = 0; i < 150; i++) {
      pointer('pointermove', .5 + Math.sin(i * .13) * .2, .5 + Math.cos(i * .11) * .2)
      const now = await frame(); timings.frames!.push(now - previous); previous = now
    }
    const activeCache = counters()
    shell.setPointerCapture = () => {}
    pointer('pointerdown', .4, .6); pointer('pointerup', .4, .6)
    for (let i = 0; i < 45; i++) await frame()
    const passageCache = counters()
    pointer('pointerdown', .5, .5, true)
    for (let i = 0; i < 30; i++) { pointer('pointermove', .5 + i * .004, .5, true); await frame() }
    pointer('pointerup', .62, .5, true)
    for (let i = 0; i < 100; i++) {
      const start = performance.now(); document.querySelector<HTMLButtonElement>('#language-toggle')!.click(); timings.locale!.push(performance.now() - start)
    }
    const topologyUrl = performance.getEntriesByType('resource').map(e => e.name).find(name => /\/src\/thread-run-storage\.ts(?:\?|$)/.test(name))!
    const { parseThreadArtwork, serializeThreadArtwork } = await import(/* @vite-ignore */ topologyUrl)
    const raw = localStorage.getItem('deesewsew-piece-v1')!
    for (let i = 0; i < 15; i++) {
      let start = performance.now(); const piece = parseThreadArtwork(raw); timings.parse!.push(performance.now() - start)
      start = performance.now(); serializeThreadArtwork(piece); timings.serialize!.push(performance.now() - start)
    }
    document.querySelector<HTMLButtonElement>('#leaf-guide')!.click()
    for (let i = 0; i < 40; i++) { pointer('pointermove', .5 + Math.sin(i * .1) * .15, .55); await frame() }
    const guideCache = counters()
    await new Promise(resolve => setTimeout(resolve, 3200))
    const idleStart = timings.render!.length
    await new Promise(resolve => setTimeout(resolve, 3000))
    const idleRenders = timings.render!.length - idleStart
    const hiddenDescriptor = Object.getOwnPropertyDescriptor(document, 'hidden')
    Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange'))
    const hiddenStart = timings.render!.length
    await new Promise(resolve => setTimeout(resolve, 300))
    const hiddenRenders = timings.render!.length - hiddenStart
    if (hiddenDescriptor) Object.defineProperty(document, 'hidden', hiddenDescriptor); else delete (document as unknown as { hidden?: boolean }).hidden
    document.dispatchEvent(new Event('visibilitychange'))
    for (let i = 0; i < 5; i++) await frame()
    for (const [key, original] of originals) proto[key] = original
    const summarize = (values: number[]) => { const sorted = [...values].sort((a, b) => a - b); return { count: values.length, p50: sorted[Math.floor(sorted.length * .5)] ?? 0, p95: sorted[Math.floor(sorted.length * .95)] ?? 0, max: sorted.at(-1) ?? 0 } }
    return { timings: Object.fromEntries(Object.entries(timings).map(([key, values]) => [key, summarize(values)])), initialCache, activeCache, passageCache, guideCache, idleRenders, hiddenRenders, rawCharacters: raw.length, userAgent: navigator.userAgent, viewport: [innerWidth, innerHeight], dpr: devicePixelRatio,
      limits: 'Instrumented development browser CPU (render includes canvas submission, not GPU completion); synthetic pointer synchronous handlers; RAF intervals are scheduling, not physical input-to-photon. Visibility handler is simulated. Idle observation is 3 seconds, not a long physical-device session.' }
  })
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Performance.enable')
  const memoryGrowth = []
  for (let batch = 0; batch <= 5; batch++) {
    if (batch) await page.evaluate(() => { for (let i = 0; i < 200; i++) document.querySelector<HTMLButtonElement>('#language-toggle')!.click() })
    await cdp.send('HeapProfiler.collectGarbage')
    const memory = await cdp.send('Performance.getMetrics')
    memoryGrowth.push({ toggles: batch * 200, metrics: memory.metrics.filter((m: { name: string }) => /Heap|Nodes|Documents/.test(m.name)) })
  }
  await cdp.detach()
  await writeFile(info.outputPath('combined-profile.json'), JSON.stringify({ ...result, memoryGrowth, memoryLimit: 'CDP post-GC heap/DOM snapshots across 1000 toggles; bounds only this measured workload, not proof of universal leak absence.' }, null, 2))
  expect(result.idleRenders).toBe(0); expect(result.hiddenRenders).toBe(0)
  expect(result.timings.drawMotion!.count).toBeGreaterThan(0)
})
