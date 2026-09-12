import { chromium } from '@playwright/test'
import { mkdir,writeFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
const out='review/lab3d-phase1';await mkdir(out,{recursive:true})
const browser=await chromium.launch({headless:true,channel:'chrome'})
try{
 const context=await browser.newContext({viewport:{width:1200,height:960},recordVideo:{dir:out,size:{width:1200,height:960}}})
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message))
 await page.goto(process.env.LAB_URL??'http://127.0.0.1:4193/DeeSewSew/lab3d.html')
 await page.evaluate(()=>localStorage.setItem('deesewsew.artwork.v4.test-sentinel','unchanged-normal-data'))
 const canvas=page.locator('canvas');await canvas.scrollIntoViewIfNeeded();const b=await canvas.boundingBox(),x=b.x+b.width/2,y=b.y+b.height/2
 const canonical=()=>canvas.getAttribute('data-canonical')
 await page.mouse.click(x,y);assert.equal(JSON.parse(await canonical()).run,null)
 await page.locator('#tool').click();await canvas.scrollIntoViewIfNeeded()
 for(const [dx,dy] of [[-90,-60],[70,-90],[110,70],[-70,95]]){await page.mouse.click(x+dx,y+dy);await page.waitForTimeout(350)}
 const original=await canonical();assert.equal(JSON.parse(original).run.anchors.length,4)
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.wheel(0,20);await page.mouse.up();assert.equal(await canonical(),original)
 await page.screenshot({path:`${out}/installed.png`})
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+240,y+60,{steps:30});await page.mouse.up();assert.equal(await canonical(),original)
 await page.screenshot({path:`${out}/orbit.png`})
 await page.locator('#support').click();await page.waitForTimeout(500)
 const removed=await canonical();assert.equal(JSON.parse(removed).support.state,'removed');assert.deepEqual(JSON.parse(removed).run,JSON.parse(original).run)
 await page.screenshot({path:`${out}/removed.png`})
 await page.mouse.click(x,y);assert.equal(await canonical(),removed)
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x-220,y-60,{steps:30});await page.mouse.up();assert.equal(await canonical(),removed)
 await page.locator('#support').click();assert.equal(await canonical(),original)
 await page.locator('#save').click();await page.reload();await page.locator('#load').click();assert.equal(await canonical(),original)
 await page.evaluate(()=>localStorage.setItem('deesewsew.experimental.sphere.v1','{"schemaVersion":4}'))
 await page.locator('#load').click();assert.equal(await canonical(),original)
 assert.equal(await page.evaluate(()=>localStorage.getItem('deesewsew.artwork.v4.test-sentinel')),'unchanged-normal-data')
 const translated=JSON.parse(original);translated.support.transform=[2,-3,4]
 await page.evaluate(a=>localStorage.setItem('deesewsew.experimental.sphere.v1',JSON.stringify(a)),translated)
 await page.locator('#load').click();const before=await canonical();await page.locator('#support').click();await page.locator('#support').click();assert.equal(await canonical(),before)
 await page.locator('#save').click();await page.reload();await page.locator('#load').click();assert.equal(await canonical(),before)
 await page.screenshot({path:`${out}/restored.png`})
 assert.deepEqual(errors,[])
 await writeFile(`${out}/result.json`,JSON.stringify({pass:true,anchors:4,cameraEditSeparation:true,reversibleNonidentityTransform:true,saveReload:true,rejectedStatePreserved:true,errors},null,2))
 await context.close()
}finally{await browser.close()}
