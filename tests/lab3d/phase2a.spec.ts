import { test, expect, type Page } from '@playwright/test'
import { readFileSync, writeFileSync } from 'node:fs'
const state = async (page: Page) => JSON.parse((await page.locator('canvas').getAttribute('data-canonical'))!)
const raw = (page: Page) => page.locator('canvas').getAttribute('data-canonical')
const legacy = {format:'deesewsew-lab3d',version:1,support:{id:'sphere-1',shape:'sphere',radius:1,transform:[2,-3,4],role:'removable',state:'removed'},run:{id:'run-1',color:'#9b4a48',path:'great-circle-v1',anchors:[[0,0,1],[.6,0,.8],[0,.6,.8]]},display:'artistic-rest-shape'}

test('keyboard multi-run lifecycle, color isolation, no implicit continuation and support/history', async ({page}) => {
  await page.goto('lab3d.html')
  const canvas=page.locator('canvas')
  await page.locator('#thread-color').fill('#456c68');await page.locator('#new-run').click()
  expect((await state(page)).runs[0].anchors).toHaveLength(0)
  await canvas.focus();await page.keyboard.press('Enter');await page.keyboard.press('ArrowRight');await page.keyboard.press('Enter')
  const first=(await state(page)).runs[0]
  await page.locator('#finish-run').click();const cut=await raw(page)
  await canvas.focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');expect(await raw(page)).toBe(cut)
  await expect(page.locator('#status')).toHaveText('Start a new thread before placing another anchor.')
  await page.locator('#thread-color').fill('#ad782e');expect(await raw(page)).toBe(cut)
  await page.locator('#new-run').click();await canvas.focus();await page.keyboard.press('Enter');await page.keyboard.press('ArrowLeft');await page.keyboard.press('Enter');await page.locator('#finish-run').click()
  const complete=await raw(page),work=await state(page)
  expect(work.runs).toHaveLength(2);expect(work.runs[0]).toEqual({...first,state:'completed'})
  expect(work.runs[1].color).toBe('#ad782e');expect(work.runs[1].anchors).toHaveLength(2);expect(work.activeRunId).toBeNull()
  await page.locator('#support').click();await page.waitForTimeout(1300);expect((await state(page)).runs).toEqual(work.runs)
  await page.locator('#support').click();expect(await raw(page)).toBe(complete)
  await page.locator('#undo').click();expect((await state(page)).support.state).toBe('removed')
  await page.locator('#redo').click();expect(await raw(page)).toBe(complete)
})

test('mouse cut/new cancels held pointer; independent start and orbit never bridge runs',async({page})=>{
  await page.goto('lab3d.html');await page.locator('#tool').click();const canvas=page.locator('canvas');await canvas.scrollIntoViewIfNeeded()
  const b=(await canvas.boundingBox())!,x=b.x+b.width/2,y=b.y+b.height/2
  await page.mouse.click(x-35,y);await page.mouse.click(x+35,y)
  await page.mouse.move(x,y+25);await page.mouse.down()
  // Keyboard activation while a physical pointer remains held is a real ownership boundary.
  await page.locator('#finish-run').focus();await page.keyboard.press('Enter');const cut=await raw(page);await page.mouse.up();expect(await raw(page)).toBe(cut)
  await canvas.scrollIntoViewIfNeeded();await page.mouse.move(x,y);await page.mouse.down();await page.locator('#new-run').focus();await page.keyboard.press('Enter');const fresh=await raw(page);await page.mouse.up();expect(await raw(page)).toBe(fresh)
  expect((await state(page)).runs[1].anchors).toHaveLength(0)
  await canvas.scrollIntoViewIfNeeded();const r=(await canvas.boundingBox())!;await page.mouse.click(r.x+r.width/2,r.y+r.height/2+35)
  expect((await state(page)).runs.map((v:any)=>v.anchors.length)).toEqual([2,1])
  const before=await raw(page);await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.mouse.move(r.x+r.width/2+70,r.y+r.height/2+25,{steps:8});await page.mouse.up();await page.mouse.wheel(0,80);expect(await raw(page)).toBe(before)
})

test('actual v1 slot fallback migrates without overwriting old save; v2 export roundtrip',async({page})=>{
  await page.addInitScript(value=>{localStorage.setItem('deesewsew.experimental.sphere.v1',JSON.stringify(value));localStorage.setItem('deesewsew-piece-v1','sentinel-do-not-touch')},legacy)
  await page.goto('lab3d.html');await page.locator('#load').click()
  const migrated=await state(page);expect(migrated.version).toBe(2);expect(migrated.support).toEqual(legacy.support);expect(migrated.runs).toEqual([{...legacy.run,state:'open'}])
  await page.locator('#save').click()
  expect(await page.evaluate(()=>localStorage.getItem('deesewsew.experimental.sphere.v1'))).toBe(JSON.stringify(legacy))
  expect(await page.evaluate(()=>localStorage.getItem('deesewsew-piece-v1'))).toBe('sentinel-do-not-touch')
  const downloadPromise=page.waitForEvent('download');await page.locator('#download').click();const download=await downloadPromise,bytes=readFileSync((await download.path())!)
  expect(JSON.parse(bytes.toString())).toEqual(migrated)
  await page.reload();await page.locator('#load').click();expect(await state(page)).toEqual(migrated)
  await page.locator('#import').setInputFiles({name:'roundtrip.json',mimeType:'application/json',buffer:bytes});expect(await state(page)).toEqual(migrated)
  await page.locator('#support').click();expect((await state(page)).support.transform).toEqual([2,-3,4])
})

for(const language of ['en','zh'])for(const width of [1280,768,390])test(`three bands actual artwork ${language} ${width}`,async({page},info)=>{
  await page.setViewportSize({width,height:1100});await page.addInitScript(value=>localStorage.setItem('deesewsew-locale-v1',value),language)
  await page.goto('lab3d.html');await page.locator('#example').click();const before=await raw(page)
  expect((await state(page)).runs.map((r:any)=>[r.anchors.length,r.state])).toEqual([[17,'completed'],[17,'completed'],[17,'completed']])
  await expect(page.locator('#example')).toBeDisabled();await expect(page.locator('#new-run')).toBeEnabled()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  await page.screenshot({path:info.outputPath('bands-installed.png'),fullPage:true})
  await page.locator('#support').click();await page.waitForTimeout(1300);await page.screenshot({path:info.outputPath('bands-removed.png'),fullPage:true})
  await page.locator('canvas').focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowUp');await page.keyboard.press('+')
  const removed=await state(page);expect(removed.runs).toEqual(JSON.parse(before!).runs)
  await page.locator('#support').click();expect(await raw(page)).toBe(before)
  await page.locator('#save').click();await page.reload();await page.locator('#load').click();expect(await raw(page)).toBe(before)
})

test('example is one undoable composition and reduced motion preserves canonical geometry',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('lab3d.html');const empty=await raw(page)
  await page.locator('#example').click();const bands=await raw(page);await page.locator('#undo').click();expect(await raw(page)).toBe(empty)
  await expect(page.locator('#example')).toBeEnabled();await page.locator('#redo').click();expect(await raw(page)).toBe(bands)
  await page.locator('#support').click();const removed=await raw(page);await page.waitForTimeout(100);expect(await raw(page)).toBe(removed)
  await page.locator('#support').click();expect(await raw(page)).toBe(bands)
})

test('bounded renderer draws within runs only, keeps rest idle, and handles 8×32 anchors',async({page},info)=>{
  await page.emulateMedia({reducedMotion:'reduce'})
  await page.addInitScript(()=>{
    const proto=CanvasRenderingContext2D.prototype,clear=proto.clearRect,stroke=proto.stroke
    ;(window as any).labPaint={strokes:0,clears:0,colors:[]}
    proto.clearRect=function(...args){(window as any).labPaint.strokes=0;(window as any).labPaint.colors=[];(window as any).labPaint.clears++;return clear.apply(this,args)}
    proto.stroke=function(...args:any[]){(window as any).labPaint.strokes++;(window as any).labPaint.colors.push(this.strokeStyle);return (stroke as any).apply(this,args)}
  })
  await page.goto('lab3d.html')
  const sparse={format:legacy.format,version:2,support:legacy.support,display:legacy.display,activeRunId:null,runs:[
    {...legacy.run,id:'run-1',color:'#9b4a48',state:'completed',anchors:[[0,0,1],[.6,0,.8]]},
    {...legacy.run,id:'run-2',color:'#456c68',state:'completed',anchors:[[0,1,0]]},
    {...legacy.run,id:'run-3',color:'#ad782e',state:'completed',anchors:[[1,0,0],[.8,.6,0]]},
  ]}
  const load=async(value:unknown)=>page.locator('#import').setInputFiles({name:'render.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(value))})
  await load(sparse)
  const painted=await page.evaluate(()=>(window as any).labPaint)
  expect(painted.strokes).toBe(48);expect(new Set(painted.colors)).toEqual(new Set(['#9b4a48','#ad782e']))
  const max={...sparse,runs:Array.from({length:8},(_,n)=>({...sparse.runs[0],id:`run-${n+1}`,anchors:Array.from({length:32},(_,i)=>[Math.sin(i*.12),0,Math.cos(i*.12)])}))}
  await load(max);expect(await page.evaluate(()=>(window as any).labPaint.strokes)).toBe(8*31*24)
  const before=await raw(page),timings:number[]=[];await page.locator('canvas').focus()
  for(let i=0;i<12;i++)timings.push(await page.evaluate(()=>{const start=performance.now();window.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));return performance.now()-start}))
  expect(await raw(page)).toBe(before)
  const clears=await page.evaluate(()=>(window as any).labPaint.clears);await page.waitForTimeout(150);expect(await page.evaluate(()=>(window as any).labPaint.clears)).toBe(clears)
  writeFileSync(info.outputPath('bounded-render.json'),JSON.stringify({linePieces:8*31*24,orbitDrawMs:timings,maxMs:Math.max(...timings),idleNoRedraw:true,evidence:'Local Chrome synchronous event/draw observation; not hardware or sustained FPS validation.'},null,2))
  expect(Math.max(...timings)).toBeLessThan(250)
})
