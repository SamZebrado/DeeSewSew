import { expect, test } from '@playwright/test'
import { emptyEmbroideryPiece, punctureFabric, serializeEmbroideryPiece } from '../../src/embroidery-topology'
test.use({ video: 'on', viewport: { width: 1100, height: 950 } })
const cases = [
  ['down', { x: .48, y: .25 }, { x: .48, y: .72 }],
  ['up', { x: .48, y: .72 }, { x: .48, y: .25 }],
  ['right', { x: .25, y: .5 }, { x: .72, y: .5 }],
  ['left', { x: .72, y: .5 }, { x: .25, y: .5 }],
] as const
for (const side of ['front', 'back'] as const) for (const [direction, old, next] of cases) {
  test(`semantic ${side} ${direction}: tip and eye pass, then NEW→OLD`, async ({ page }, info) => {
    let piece = emptyEmbroideryPiece()
    const style = { type: 'running' as const, color: '#b9403c' }
    if (side === 'front') piece = punctureFabric(piece, { x: .3, y: .4 }, style).piece
    piece = punctureFabric(piece, old, style).piece
    await page.addInitScript(raw => localStorage.setItem('deesewsew-piece-v1', raw), serializeEmbroideryPiece(piece))
    await page.goto('./')
    if (side === 'back') await page.locator('#view-back').click()
    const hoop = page.locator('#hoop-shell'), box = (await hoop.boundingBox())!
    const client = (p: { x: number; y: number }) => ({ x: box.x + box.width * (side === 'back' ? 1 - p.x : p.x), y: box.y + box.height * p.y })
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message))
    const curve = client({ x: .75, y: .5 }), end = client(next)
    await page.mouse.move(curve.x, curve.y, { steps: 12 })
    await page.waitForTimeout(250)
    await page.screenshot({ path: info.outputPath(`${side}-${direction}-before.png`) })
    await page.mouse.move(end.x, end.y, { steps: 2 })
    await page.mouse.down(); await page.mouse.up()
    const hole = JSON.parse((await hoop.getAttribute('data-pulled-hole'))!)
    expect(hole.x).toBeCloseTo(next.x); expect(hole.y).toBeCloseTo(next.y)
    await page.waitForTimeout(740)
    await page.screenshot({ path: info.outputPath(`${side}-${direction}-settled.png`) })
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('deesewsew-piece-v1')!))
    expect(stored.punctures.at(-1).position.x).toBeCloseTo(next.x)
    expect(stored.punctures.at(-1).position.y).toBeCloseTo(next.y)
    expect(stored.segments.at(-1).side).toBe(side)
    expect(errors).toEqual([])
  })
}
