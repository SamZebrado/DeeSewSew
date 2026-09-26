import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'

const evidence = resolve('experiments/pressure/evidence/optin')
await mkdir(evidence, { recursive: true })
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' })
const context = await browser.newContext({ viewport: { width: 1200, height: 950 }, hasTouch: true })
await context.addInitScript(() => localStorage.setItem('deesewsew-locale-v1', 'en'))
const page = await context.newPage()
const results = {}
try {
  await page.goto('http://127.0.0.1:5302/DeeSewSew/', { waitUntil: 'networkidle' })
  await page.evaluate(() => {
    const shell = document.querySelector('#hoop-shell')
    shell.setPointerCapture = () => {}
    shell.releasePointerCapture = () => {}
    shell.hasPointerCapture = () => false
  })
  const button = page.locator('#pressure-toggle')
  results.english = await button.innerText()
  results.defaultOff = await button.getAttribute('aria-pressed')
  results.defaultVisual = await button.evaluate(element => element.classList.contains('active'))
  await page.screenshot({ path: resolve(evidence, 'off.png') })
  const dispatch = (type, pointerType, pressure, buttons, pointerId, dx = 0) => page.evaluate(({ type, pointerType, pressure, buttons, pointerId, dx }) => {
    const shell = document.querySelector('#hoop-shell')
    const rect = shell.getBoundingClientRect()
    shell.dispatchEvent(new PointerEvent(type, { bubbles: true, isPrimary: true, button: 0, pointerType, pressure, buttons, pointerId,
      clientX: rect.left + rect.width * .5 + dx, clientY: rect.top + rect.height * .5 }))
    return { scale: shell.dataset.pressureSlackScale, points: shell.dataset.activeThreadPoints,
      undoDisabled: document.querySelector('#undo').disabled }
  }, { type, pointerType, pressure, buttons, pointerId, dx })
  await dispatch('pointerdown', 'mouse', .5, 1, 1)
  results.firstPuncture = await dispatch('pointerup', 'mouse', 0, 0, 1)
  await dispatch('pointerdown', 'pen', .9, 1, 2, 80)
  results.offPen = await dispatch('pointermove', 'pen', .9, 1, 2, 80)
  await dispatch('pointercancel', 'pen', 0, 0, 2, 80)
  await button.click()
  results.optedIn = await button.getAttribute('aria-pressed')
  results.optedInVisual = await button.evaluate(element => element.classList.contains('active'))
  results.optedInSwitch = await button.evaluate(element => getComputedStyle(element.querySelector('.switch-track span')).transform)
  results.persisted = await page.evaluate(() => JSON.parse(localStorage.getItem('deesewsew-settings-v2')).pressureExperimentEnabled)
  await dispatch('pointerdown', 'pen', .5, 1, 3, 80)
  results.constantPen = await dispatch('pointermove', 'pen', .5, 1, 3, 80)
  results.variablePen = await dispatch('pointermove', 'pen', .9, 1, 3, 80)
  results.nonowner = await dispatch('pointermove', 'pen', .1, 1, 4, 80)
  results.unrelatedCancel = await dispatch('pointercancel', 'pen', 0, 0, 4, 80)
  await page.waitForTimeout(250)
  results.settledSwitch = await button.evaluate(element => getComputedStyle(element.querySelector('.switch-track span')).transform)
  await page.screenshot({ path: resolve(evidence, 'on-variable-pen.png') })
  await dispatch('pointercancel', 'pen', 0, 0, 3, 80)
  results.afterOwnedCancel = await page.locator('#hoop-shell').getAttribute('data-pressure-slack-scale')
  await dispatch('pointerdown', 'pen', .9, 1, 14, 80)
  results.beforeRejectedUp = await dispatch('pointermove', 'pen', .9, 1, 14, 80)
  const artworkBeforeRejectedUp = await page.evaluate(() => localStorage.getItem('deesewsew-piece-v1'))
  results.rejectedUp = await dispatch('pointerup', 'pen', 0, 0, 14, 0)
  results.rejectedArtworkUnchanged = await page.evaluate(() => localStorage.getItem('deesewsew-piece-v1')) === artworkBeforeRejectedUp
  await dispatch('pointerdown', 'pen', .9, 1, 13, 80)
  results.beforeDisable = await dispatch('pointermove', 'pen', .9, 1, 13, 80)
  await button.click()
  results.disabled = await button.getAttribute('aria-pressed')
  results.disabledVisual = await button.evaluate(element => element.classList.contains('active'))
  results.afterDisable = await page.locator('#hoop-shell').getAttribute('data-pressure-slack-scale')
  results.afterDisableMove = await dispatch('pointermove', 'pen', .9, 1, 13, 80)
  await dispatch('pointercancel', 'pen', 0, 0, 13, 80)
  await button.click()
  await dispatch('pointerdown', 'mouse', .5, 1, 5, 80)
  results.mouse = await dispatch('pointermove', 'mouse', .5, 1, 5, 80)
  await dispatch('pointercancel', 'mouse', 0, 0, 5, 80)
  await dispatch('pointerdown', 'touch', .8, 1, 6, 80)
  results.touch = await dispatch('pointermove', 'touch', .8, 1, 6, 80)
  await dispatch('pointercancel', 'touch', 0, 0, 6, 80)
  await page.locator('#language-toggle').click()
  results.chinese = await button.innerText()
  await page.reload({ waitUntil: 'networkidle' })
  results.reloadOn = await page.locator('#pressure-toggle').getAttribute('aria-pressed')
  results.reloadVisual = await page.locator('#pressure-toggle').evaluate(element => element.classList.contains('active'))
  await page.evaluate(() => {
    const shell = document.querySelector('#hoop-shell')
    shell.setPointerCapture = () => {}
    shell.releasePointerCapture = () => {}
    shell.hasPointerCapture = () => false
  })
  await dispatch('pointerdown', 'pen', .9, 1, 20, 110)
  results.beforePenUp = await dispatch('pointermove', 'pen', .9, 1, 20, 110)
  results.penUp = await dispatch('pointerup', 'pen', 0, 0, 20, 110)
  results.artworkHasPressure = await page.evaluate(() => (localStorage.getItem('deesewsew-piece-v1') ?? '').includes('"pressure"'))
  const canonical = {}
  for (const mode of ['off', 'on']) {
    const comparisonContext = await browser.newContext({ viewport: { width: 1200, height: 950 } })
    const comparisonPage = await comparisonContext.newPage()
    try {
      await comparisonPage.goto('http://127.0.0.1:5302/DeeSewSew/', { waitUntil: 'networkidle' })
      await comparisonPage.evaluate(() => {
        const shell = document.querySelector('#hoop-shell')
        shell.setPointerCapture = () => {}
        shell.releasePointerCapture = () => {}
        shell.hasPointerCapture = () => false
      })
      if (mode === 'on') await comparisonPage.locator('#pressure-toggle').click()
      for (const [pointerType, pointerId, dx] of [['mouse', 31, 0], ['pen', 32, 90]]) {
        for (const type of ['pointerdown', 'pointermove', 'pointerup']) {
          await comparisonPage.evaluate(({ type, pointerType, pointerId, dx }) => {
            const shell = document.querySelector('#hoop-shell')
            const rect = shell.getBoundingClientRect()
            shell.dispatchEvent(new PointerEvent(type, { bubbles: true, isPrimary: true, button: 0, pointerType,
              pressure: type === 'pointerup' ? 0 : pointerType === 'pen' ? .9 : .5,
              buttons: type === 'pointerup' ? 0 : 1, pointerId,
              clientX: rect.left + rect.width * .5 + dx, clientY: rect.top + rect.height * .5 }))
          }, { type, pointerType, pointerId, dx })
        }
      }
      canonical[mode] = await comparisonPage.evaluate(() => localStorage.getItem('deesewsew-piece-v1'))
      if (!canonical[mode]) throw new Error(`Missing canonical artwork in ${mode} mode`)
      await writeFile(resolve(evidence, `canonical-${mode}.json`), canonical[mode] + '\n')
    } finally {
      await comparisonPage.close()
      await comparisonContext.close()
    }
  }
  results.canonicalEqual = canonical.off === canonical.on
  results.canonicalSha256 = createHash('sha256').update(canonical.off).digest('hex')
  results.canonicalPunctures = JSON.parse(canonical.off).punctures.length
  const layouts = {}
  for (const [width, height, name] of [[390, 844, 'phone390'], [768, 1024, 'tablet768']]) {
    for (const [locale, label] of [['en', 'Pressure experiment'], ['zh', '压感实验']]) {
      const layoutContext = await browser.newContext({ viewport: { width, height } })
      await layoutContext.addInitScript(language => localStorage.setItem('deesewsew-locale-v1', language), locale)
      const layoutPage = await layoutContext.newPage()
      try {
        await layoutPage.goto('http://127.0.0.1:5302/DeeSewSew/', { waitUntil: 'networkidle' })
        const toggle = layoutPage.locator('#pressure-toggle')
        await toggle.scrollIntoViewIfNeeded()
        layouts[`${name}-${locale}`] = await toggle.evaluate((element, expected) => {
          const rect = element.getBoundingClientRect()
          const detail = element.querySelector('small')
          return { label: element.innerText, horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            detailClipped: detail.scrollHeight > detail.clientHeight + 1 || detail.scrollWidth > detail.clientWidth + 1,
            reachable: rect.left >= 0 && rect.right <= innerWidth + 1 && rect.top >= 0 && rect.bottom <= innerHeight + 1,
            labelCorrect: element.innerText.includes(expected) }
        }, label)
        await layoutPage.screenshot({ path: resolve(evidence, `${name}-${locale}.png`) })
      } finally {
        await layoutPage.close()
        await layoutContext.close()
      }
    }
  }
  results.layouts = layouts
  if (!results.english.includes('Pressure experiment') || !results.english.includes('device feel untested') ||
    results.defaultOff !== 'false' || results.defaultVisual || results.firstPuncture.undoDisabled || results.offPen.scale !== '1' ||
    results.optedIn !== 'true' || !results.optedInVisual || results.optedInSwitch === 'none' || results.persisted !== true || results.constantPen.scale !== '1' ||
    !(Number(results.variablePen.scale) < 1) || results.nonowner.scale !== results.variablePen.scale ||
    results.unrelatedCancel.scale !== results.variablePen.scale || results.afterOwnedCancel !== '1' ||
    !(Number(results.beforeRejectedUp.scale) < 1) || results.rejectedUp.scale !== '1' ||
    !results.rejectedArtworkUnchanged || !(Number(results.beforeDisable.scale) < 1) ||
    results.disabled !== 'false' || results.disabledVisual || results.afterDisable !== '1' || results.afterDisableMove.scale !== '1' ||
    results.mouse.scale !== '1' || results.touch.scale !== '1' || !results.chinese.includes('压感实验') ||
    !results.chinese.includes('尚未验证真实设备手感') || results.reloadOn !== 'true' || !results.reloadVisual ||
    !(Number(results.beforePenUp.scale) < 1) || results.artworkHasPressure || !results.canonicalEqual || results.canonicalPunctures !== 2 ||
    Object.values(layouts).some(layout => !layout.labelCorrect || !layout.reachable || layout.detailClipped || layout.horizontalOverflow > 1)) throw new Error(JSON.stringify(results))
  await writeFile(resolve(evidence, 'smoke.json'), JSON.stringify({ ...results, input: 'synthetic PointerEvent', browser: 'headless Chrome', hardwareValidated: false }, null, 2) + '\n')
  console.log(JSON.stringify(results))
} finally {
  await page.close()
  await context.close()
  await browser.close()
}
