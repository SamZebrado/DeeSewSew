import {expect,test} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {TULIP_HEART_PATTERN} from '../../src/tulip-heart-pattern'

test('actual start/puncture/cut guide creates exact independent tulip and heart with reload/history',async({page},info)=>{
  test.setTimeout(120000)
  await page.addInitScript(()=>localStorage.setItem('deesewsew-locale-v1','en'))
  await page.goto('/DeeSewSew/')
  await page.locator('#tulip-heart-guide').click()
  for(let i=0;i<TULIP_HEART_PATTERN.runs.length;i++){
    if(i===12){await expect(page.locator('#guide-copy')).toHaveText('Flip to the back for the heart');await page.locator('#view-back').click()}
    const run=TULIP_HEART_PATTERN.runs[i]!
    for(const p of run.targets){
      await page.locator('#hoop-shell').scrollIntoViewIfNeeded()
      const b=(await page.locator(run.visibleSide==='front'?'#embroidery':'#embroidery-back').boundingBox())!
      await page.mouse.click(b.x+b.width*(run.visibleSide==='back'?1-p.x:p.x),b.y+b.height*p.y)
      await page.waitForTimeout(700)
    }
    await expect(page.locator('#guide-copy')).toHaveText('Cut thread to continue')
    await page.locator('#end-thread').click()
    if(i===2){await page.locator('#undo').click();await expect(page.locator('#guide-copy')).toHaveText('Cut thread to continue');await page.locator('#redo').click();await page.reload();await expect(page.locator('#palette .swatch.selected')).toHaveAttribute('data-color',run.color)}
  }
  await expect(page.locator('#guide-copy')).toHaveText('Tulip and heart complete')
  const piece=await page.evaluate(()=>JSON.parse(localStorage.getItem('deesewsew-piece-v1')!))
  expect(piece.runs).toHaveLength(24);expect(piece.punctures).toHaveLength(48);expect(piece.segments).toHaveLength(24)
  expect(piece.activeRunId).toBeNull()
  for(const side of ['front','back'] as const){
    const actual=piece.segments.filter((s:any)=>s.side===side).map((s:any)=>[s.start,s.end])
    const desired=(side==='front'?TULIP_HEART_PATTERN.desiredFrontStrokes:TULIP_HEART_PATTERN.desiredBackStrokes)
    for(let i=0;i<desired.length;i++){
      expect(actual[i]).toEqual([desired[i]!.start,desired[i]!.end])
    }
  }
  await page.locator('#tulip-heart-guide').click();await page.keyboard.press('Escape');await page.mouse.move(0,0)
  await page.screenshot({path:info.outputPath('actual-guide-back.png'),fullPage:true})
  await page.locator('#view-front').click();await page.screenshot({path:info.outputPath('actual-guide-front.png'),fullPage:true})
  await info.attach('actual-guide.json',{body:JSON.stringify(piece,null,2),contentType:'application/json'})
  await writeFile(info.outputPath('actual-guide.json'),JSON.stringify(piece,null,2))
})
