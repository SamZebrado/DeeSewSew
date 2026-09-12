import { test, expect } from '@playwright/test'

for (const width of [1280, 768, 390, 320]) for (const language of ['en', 'zh']) {
  test(`Artwork contract ${width} ${language}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 1024 })
    await page.addInitScript(language => localStorage.setItem('deesewsew-locale-v1', language), language)
    await page.goto('./')
    const hint = language === 'zh' ? 'Ctrl + 点击绣布可剪线' : 'Ctrl + click the fabric to cut thread'
    await expect(page.locator('#cut-shortcut-hint')).toHaveText(hint)
    await expect(page.locator('#end-thread')).toHaveAttribute('title', language === 'zh' ? '剪线（Ctrl + 点击绣布）' : 'Cut thread (Ctrl + click fabric)')
    await expect(page.locator('#end-thread')).toHaveAttribute('aria-describedby', 'cut-shortcut-hint')
    const layout = await page.locator('.artwork-actions').evaluate(root => {
      const buttons = [...root.querySelectorAll('button')]
      const keys = ['fontSize', 'fontWeight', 'lineHeight', 'minHeight', 'padding', 'borderRadius', 'borderWidth', 'textAlign', 'whiteSpace'] as const
      return {
        contracts: buttons.map(button => Object.fromEntries(keys.map(key => [key, getComputedStyle(button)[key]]))),
        boxes: buttons.map(button => { const r = button.getBoundingClientRect(); return { x:r.x, y:r.y, right:r.right, bottom:r.bottom, height:r.height, width:r.width, overflow:button.scrollWidth > button.clientWidth } }),
        rows: [...root.children].map(row => row.querySelectorAll('button').length),
        overflow: document.documentElement.scrollWidth > innerWidth,
      }
    })
    expect(layout.rows).toEqual([2, 3, 2])
    for (const group of [[0, 1], [2, 3, 4], [5, 6]]) {
      for (const index of group) {
        expect(layout.boxes[index]!.y).toBe(layout.boxes[group[0]!]!.y)
        expect(layout.boxes[index]!.height).toBe(layout.boxes[group[0]!]!.height)
      }
    }
    expect(layout.overflow).toBe(false)
    for (const contract of layout.contracts) expect(contract).toEqual(layout.contracts[0])
    for (const box of layout.boxes) { expect(box.height).toBeGreaterThanOrEqual(46); expect(box.overflow).toBe(false); expect(box.right).toBeLessThanOrEqual(width) }
    for (let i = 0; i < layout.boxes.length; i++) for (let j = i + 1; j < layout.boxes.length; j++) {
      const a = layout.boxes[i]!, b = layout.boxes[j]!
      expect(Math.max(b.x - a.right, a.x - b.right, b.y - a.bottom, a.y - b.bottom)).toBeGreaterThanOrEqual(7.9)
    }
    await page.screenshot({ path: info.outputPath(`artwork-${width}-${language}.png`), fullPage:true })
    await page.locator('#language-toggle').click()
    await expect(page.locator('#cut-shortcut-hint')).toHaveText(language === 'en' ? 'Ctrl + 点击绣布可剪线' : 'Ctrl + click the fabric to cut thread')
    await expect(page.locator('#end-thread')).toHaveText(language === 'en' ? '剪线' : 'Cut thread')
  })
}
