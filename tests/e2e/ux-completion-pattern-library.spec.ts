import { test, expect } from '@playwright/test'
import { LEAF_PATTERN, CHERRIES_PATTERN } from '../../src/pattern-library'
import { patternSteps } from '../../src/guide-pattern'

for(const pattern of [LEAF_PATTERN,CHERRIES_PATTERN])test(`real pointer completes ${pattern.id} with cuts, reload and unchanged old work`,async({page},info)=>{
  await page.addInitScript(()=>localStorage.setItem('deesewsew-locale-v1','en'))
  await page.goto('./')
  await page.locator('#motion-toggle').click()
  const piece=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('deesewsew-piece-v1')!))
  const click=async(x:number,y:number)=>{
    await page.locator('#hoop-shell').scrollIntoViewIfNeeded()
    const box=(await page.locator('#embroidery').boundingBox())!
    await page.mouse.click(box.x+box.width*x,box.y+box.height*y)
  }
  await click(.25,.45)
  const old=await piece()
  await page.locator('.pattern-options summary').click()
  await expect(page.locator('#pattern-choice option')).toHaveCount(4)
  await page.locator('#pattern-choice').selectOption(pattern.id)
  await page.locator('#start-pattern').click()
  await expect(page.locator('#guide-copy')).toHaveText('Cut thread to continue')
  expect(await piece()).toEqual(old)
  await page.locator('#end-thread').click()
  const steps=patternSteps(pattern)
  for(let i=0;i<steps.length;i++){
    const p=steps[i]!.target
    await click(p.x,p.y)
    expect((await piece()).punctures).toHaveLength(old.punctures.length+i+1)
    if(i%2){await expect(page.locator('#guide-copy')).toHaveText('Cut thread to continue');await page.locator('#end-thread').click()}
    if(i===3){await page.reload();await expect(page.locator('#exit-pattern')).toBeEnabled()}
  }
  const complete=await piece()
  expect(complete.punctures.slice(0,old.punctures.length)).toEqual(old.punctures)
  expect(complete.activeRunId).toBeNull()
  expect(complete.segments).toHaveLength(pattern.desiredFrontStrokes.length)
  expect(complete.segments.every((s:{side:string})=>s.side==='front')).toBe(true)
  await expect(page.locator('#guide-copy')).toHaveText(pattern.presentation.completion)
  await page.locator('#hoop-shell').scrollIntoViewIfNeeded()
  await page.mouse.move(0,0)
  await page.locator('#hoop-shell').screenshot({path:info.outputPath(`${pattern.id}-canonical.png`)})
  await page.locator('#undo').click();await expect(page.locator('#guide-copy')).toHaveText('Cut thread to continue')
  await page.locator('#redo').click();expect(await piece()).toEqual(complete)
  await page.locator('.pattern-options summary').click()
  await page.locator('#exit-pattern').click();expect(await piece()).toEqual(complete)
  for(const width of [1280,768,390,320]){
    await page.setViewportSize({width,height:1024})
    for(const locale of ['en','zh']){
      if(locale==='zh')await page.locator('#language-toggle').click()
      await expect(page.locator('.pattern-options summary')).toHaveText(locale==='en'?'What would you like to stitch?':'想绣什么？')
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
      await page.screenshot({path:info.outputPath(`${pattern.id}-${width}-${locale}.png`),fullPage:true})
      if(locale==='zh')await page.locator('#language-toggle').click()
    }
  }
})
