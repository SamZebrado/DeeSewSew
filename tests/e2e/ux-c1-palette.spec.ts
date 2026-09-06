import { expect, test } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { emptyEmbroideryPiece, punctureFabric, serializeEmbroideryPiece } from '../../src/embroidery-topology'
const baseline = execFileSync('git', ['show', '44f55c1107223fa3c7d247f862accf0b4b9a684c:src/style.css'], { encoding: 'utf8' })
let piece = emptyEmbroideryPiece()
for (let i = 0; i < 28; i++) {
  const angle = i * Math.PI * 2 / 7
  const radius = i % 2 ? .25 : .08
  piece = punctureFabric(piece, { x: .5 + Math.cos(angle) * radius, y: .5 + Math.sin(angle) * radius }, { type: 'running', color: ['#b9403c', '#425f86', '#55765b', '#d49a2f'][Math.floor(i / 7)]! }).piece
}
for (const [name, width, height] of [['desktop', 1440, 1000], ['tablet', 768, 1024], ['phone', 390, 844]] as const) {
  test(`Cool Linen versus cream: identical artwork at ${name}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.addInitScript(raw => localStorage.setItem('deesewsew-piece-v1', raw), serializeEmbroideryPiece(piece))
    await page.goto('./')
    await page.mouse.move(0, 0)
    const canvasPixels = await page.locator('#embroidery').evaluate(canvas => (canvas as HTMLCanvasElement).toDataURL())
    const oldStyle = await page.addStyleTag({ content: baseline })
    await page.screenshot({ path: info.outputPath(`${name}-A-cream.png`), fullPage: true })
    await oldStyle.evaluate(element => element.remove())
    await page.screenshot({ path: info.outputPath(`${name}-B-cool-linen.png`), fullPage: true })
    expect(await page.locator('#embroidery').evaluate(canvas => (canvas as HTMLCanvasElement).toDataURL())).toBe(canvasPixels)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await expect(page.locator('.tools')).toHaveCSS('background-color', 'rgb(247, 246, 241)')
    await expect(page.locator('.tools')).toHaveCSS('backdrop-filter', 'none')
    await expect(page.locator('.tools')).toHaveCSS('border-radius', '17px')
    await expect(page.locator('.rotation-hint')).toContainText('Hold Shift and drag to rotate')
    await page.locator('#language-toggle').click()
    await expect(page.locator('.rotation-hint')).toContainText('按住 Shift 拖动可旋转')
    await expect(page.locator('.rotation-hint')).not.toContainText('Hold Shift and drag to rotate')
  })
}
test('normal chrome text token combinations satisfy WCAG AA 4.5:1', () => {
  const luminance = (hex: string) => {
    const rgb = hex.match(/[a-f0-9]{2}/gi)!.map(value => parseInt(value, 16) / 255).map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4)
    return rgb[0]! * .2126 + rgb[1]! * .7152 + rgb[2]! * .0722
  }
  for (const ink of ['303330', '616862', '9b4a48']) for (const surface of ['e7e9e4', 'f7f6f1', 'eff0eb', 'f3e5e1']) {
    expect((luminance(surface) + .05) / (luminance(ink) + .05)).toBeGreaterThanOrEqual(4.5)
  }
})
