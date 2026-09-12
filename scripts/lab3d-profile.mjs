import { chromium } from '@playwright/test'
import { writeFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
const browser=await chromium.launch({headless:true,channel:'chrome'})
try{
 const context=await browser.newContext({viewport:{width:1200,height:960}}),page=await context.newPage()
 await page.addInitScript(()=>{window.labDrawCount=0;const clear=CanvasRenderingContext2D.prototype.clearRect;CanvasRenderingContext2D.prototype.clearRect=function(...args){window.labDrawCount++;return clear.apply(this,args)}})
 await page.goto('http://127.0.0.1:4194/DeeSewSew/lab3d.html')
 const coordinates=await page.evaluate(()=>{
  const key='deesewsew.experimental.sphere.v1',canvas=document.querySelector('canvas'),load=document.querySelector('#load'),tool=document.querySelector('#tool')
  const fixture=JSON.parse(canvas.dataset.canonical);fixture.run={id:'run-1',color:'#9b4a48',path:'great-circle-v1',anchors:Array.from({length:31},(_,i)=>[Math.sin(i*.08),0,Math.cos(i*.08)])}
  localStorage.setItem(key,JSON.stringify(fixture));load.click();tool.click()
  const b=canvas.getBoundingClientRect(),xs=b.x+b.width/2,ys=b.y+b.height/2
  canvas.addEventListener('pointerup',()=>{window.pickStarted=performance.now()},{capture:true})
  canvas.addEventListener('pointerup',()=>{window.pickElapsed=performance.now()-window.pickStarted})
  return {xs,ys}
 })
 const pickTimes=[],drawTimes=[],errors=[];page.on('pageerror',e=>errors.push(e.message))
 for(let i=0;i<26;i++){
  await page.locator('#load').click();await page.mouse.click(coordinates.xs,coordinates.ys)
  const sample=await page.evaluate(i=>{const canvas=document.querySelector('canvas');if(JSON.parse(canvas.dataset.canonical).run.anchors.length!==32)throw Error('Expected 32 anchors');const start=performance.now();canvas.dispatchEvent(new WheelEvent('wheel',{deltaY:i%2?1:-1,cancelable:true}));return {pick:window.pickElapsed,draw:performance.now()-start}},i)
  if(i>=5){pickTimes.push(sample.pick);drawTimes.push(sample.draw)}
 }
 const summary=a=>{const s=[...a].sort((a,b)=>a-b);return {median:s[10],p95:s[19],max:s[20],raw:a}}
 const result={pickingCommitAndDrawMs:summary(pickTimes),wheelAndDrawMs:summary(drawTimes),anchors:32,viewport:[1200,960]}
 assert.deepEqual(errors,[])
 const before=await page.locator('canvas').getAttribute('data-canonical')
 await page.locator('#support').click();const removed=await page.locator('canvas').getAttribute('data-canonical')
 await page.waitForTimeout(1400);assert.equal(await page.locator('canvas').getAttribute('data-canonical'),removed)
 const count=await page.evaluate(()=>window.labDrawCount);await page.waitForTimeout(400);assert.equal(await page.evaluate(()=>window.labDrawCount),count)
 await page.locator('#support').click();assert.equal(await page.locator('canvas').getAttribute('data-canonical'),before)
 await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#support').click();const reducedCount=await page.evaluate(()=>window.labDrawCount);await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>window.labDrawCount),reducedCount)
 await writeFile('review/lab3d-phase1/profile.json',JSON.stringify({...result,displaySleeps:true,reducedMotionSkips:true,canonicalUnchanged:true,scope:'single-host synchronous CPU submission; no GPU/compositor/mobile/power inference'},null,2))
 await context.close()
}finally{await browser.close()}
