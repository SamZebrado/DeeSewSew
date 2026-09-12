import { chromium } from '@playwright/test'
import { mkdir,writeFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
const out='review/lab3d-phase1';await mkdir(out,{recursive:true})
const browser=await chromium.launch({headless:true,channel:'chrome'})
try{
 const context=await browser.newContext({viewport:{width:1200,height:960}}),page=await context.newPage(),errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 const base='http://127.0.0.1:4194/DeeSewSew/'
 // Lab is the very first entry: it must install its own shared worker.
 await page.goto(base+'lab3d.html');await page.evaluate(()=>navigator.serviceWorker.ready)
 await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller))
 await context.setOffline(true);await page.reload();assert.equal(await page.locator('h1').textContent(),'3D Lab — Experimental / 实验室')
 await page.locator('#tool').click();const c=page.locator('canvas');await c.scrollIntoViewIfNeeded();const b=await c.boundingBox()
 await page.mouse.click(b.x+b.width/2-50,b.y+b.height/2);await page.mouse.click(b.x+b.width/2+50,b.y+b.height/2+50)
 await page.locator('#save').click();const lab=await c.getAttribute('data-canonical')
 await page.goto(base);await page.locator('#embroidery').waitFor();const main=page.locator('#embroidery');await main.scrollIntoViewIfNeeded();const m=await main.boundingBox()
 await page.mouse.click(m.x+m.width*.35,m.y+m.height*.42+34)
 await page.mouse.click(m.x+m.width*.62,m.y+m.height*.54+34)
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('deesewsew-piece-v1')??'{}').punctures?.length===2)
 const raw=await page.evaluate(()=>localStorage.getItem('deesewsew-piece-v1'));assert.equal(JSON.parse(raw).schemaVersion,4)
 await page.goto(base+'lab3d.html');await page.locator('#load').click();assert.equal(await c.getAttribute('data-canonical'),lab)
 await page.evaluate(raw=>localStorage.setItem('deesewsew.experimental.sphere.v1',raw),raw)
 await page.locator('#load').click();assert.equal(await c.getAttribute('data-canonical'),lab)
 assert.equal(await page.evaluate(()=>localStorage.getItem('deesewsew-piece-v1')),raw)
 await page.goto(base);await main.waitFor();assert.equal(await page.evaluate(()=>localStorage.getItem('deesewsew-piece-v1')),raw)
 await page.screenshot({path:`${out}/offline-production-v4-preserved.png`})
 assert.deepEqual(errors,[]);await writeFile(`${out}/offline-result.json`,JSON.stringify({pass:true,firstVisitLabOffline:true,actualProductionV4Punctures:2,labRejectsV4:true,productionPreserved:true,errors},null,2))
 await context.close()
}finally{await browser.close()}
