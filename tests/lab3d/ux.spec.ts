import { test,expect } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync,readdirSync,writeFileSync } from 'node:fs'
test.beforeAll(async({browser},info)=>{
 const hash=(path:string)=>createHash('sha256').update(readFileSync(path)).digest('hex')
 writeFileSync(info.outputPath('runtime-provenance.json'),JSON.stringify({head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),status:execFileSync('git',['status','--short'],{encoding:'utf8'}).trim(),time:new Date().toISOString(),browser:browser.version(),assets:Object.fromEntries(readdirSync('dist/assets').map(p=>[p,hash(`dist/assets/${p}`)])),source:Object.fromEntries(['src/lab3d.ts','src/lab3d-model.ts','src/lab3d-input.ts','src/lab3d.css','src/main.ts','src/i18n.ts','src/style.css'].map(p=>[p,hash(p)]))},null,2))
})
const sample={format:'deesewsew-lab3d',version:1,support:{id:'sphere-1',shape:'sphere',radius:1,transform:[2,-3,4],role:'removable',state:'installed'},run:{id:'run-1',color:'#9b4a48',path:'great-circle-v1',anchors:[[0,0,1],[.6,0,.8],[0,.6,.8]]},display:'artistic-rest-shape'}
test('delayed import success and error cannot overwrite newer edits or feedback',async({page})=>{
 await page.goto('lab3d.html');await page.evaluate(()=>{const original=File.prototype.text;File.prototype.text=function(){if(this.name.startsWith('slow'))return new Promise((resolve,reject)=>{(window as any).finishRead=()=>original.call(this).then(resolve);(window as any).rejectRead=()=>reject(Error('delayed failure'))});return original.call(this)}})
 const canvas=page.locator('canvas'),file=(name:string)=>({name,mimeType:'application/json',buffer:Buffer.from(JSON.stringify(sample))})
 await page.locator('#import').setInputFiles(file('slow-success.json'));await page.locator('#tool').click();await canvas.focus();await page.keyboard.press('Enter');const current=await canvas.getAttribute('data-canonical')
 await page.evaluate(()=>(window as any).finishRead());expect(await canvas.getAttribute('data-canonical')).toBe(current)
 await page.locator('#import').setInputFiles(file('slow-error.json'));await page.locator('#undo').click();const undone=await canvas.getAttribute('data-canonical'),feedback=await page.locator('#status').textContent()
 await page.evaluate(()=>(window as any).rejectRead());expect(await canvas.getAttribute('data-canonical')).toBe(undone);expect(await page.locator('#status').textContent()).toBe(feedback)
})
test('keyboard controls, reticle, history and gesture ownership',async({page})=>{
 await page.goto('lab3d.html');const canvas=page.locator('canvas'),raw=()=>canvas.getAttribute('data-canonical')
 await canvas.focus();const empty=await raw();await page.keyboard.press('Enter');expect(await raw()).toBe(empty)
 await page.locator('#tool').click();await expect(page.locator('#tool')).toHaveAttribute('aria-pressed','true');await canvas.focus()
 await expect(canvas).toHaveAttribute('data-reticle','true');await page.keyboard.press('Enter')
 await page.keyboard.press('ArrowRight');await page.keyboard.press('Enter');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter')
 const three=await raw();expect(JSON.parse(three!).run.anchors).toHaveLength(3)
 await page.keyboard.press('+');await page.keyboard.press('-');await page.keyboard.press('Home');expect(await raw()).toBe(three)
 const box=(await canvas.boundingBox())!;await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.keyboard.press('ArrowLeft');await page.mouse.up();expect(await raw()).toBe(three)
 await page.locator('#support').click();await canvas.focus();await expect(canvas).toHaveAttribute('data-reticle','false');const removed=await raw();await page.keyboard.press('Enter');expect(await raw()).toBe(removed)
 await page.locator('#support').click();expect(await raw()).toBe(three);await page.locator('#undo').click();await expect(page.locator('#summary')).toContainText('Support removed')
 await page.locator('#redo').click();await expect(page.locator('#summary')).toContainText('Support installed')
})
for(const language of ['en','zh'])for(const width of [1280,768])test(`localized same artwork ${language} ${width}`,async({page},info)=>{
 await page.setViewportSize({width,height:1100});await page.addInitScript(language=>localStorage.setItem('deesewsew-locale-v1',language),language)
 await page.goto('lab3d.html');await page.locator('#import').setInputFiles({name:'sphere.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(sample))})
 await page.locator('#tool').click();await page.locator('canvas').focus();await expect(page.locator('canvas')).toHaveAttribute('data-reticle','true')
 await expect(page.locator('h1')).toHaveText(language==='zh'?'3D 实验室 — 实验性功能':'3D Lab — Experimental')
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await page.screenshot({path:info.outputPath('installed.png'),fullPage:true});await page.locator('#support').click();await page.waitForTimeout(1300);await page.screenshot({path:info.outputPath('removed.png'),fullPage:true})
 await page.locator('#language').click();await expect(page.locator('html')).toHaveAttribute('lang',language==='zh'?'en':'zh-CN')
 expect(JSON.parse((await page.locator('canvas').getAttribute('data-canonical'))!).run).toEqual(sample.run)
})
test('localized save/load/import failures preserve current artwork',async({page})=>{
 await page.addInitScript(()=>{localStorage.setItem('deesewsew-locale-v1','zh');const set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='deesewsew.experimental.sphere.v1')throw new DOMException('full','QuotaExceededError');set.call(this,k,v)}})
 await page.goto('lab3d.html');const raw=await page.locator('canvas').getAttribute('data-canonical')
 await page.locator('#load').click();await expect(page.locator('#status')).toHaveText('尚无实验存档。')
 await page.locator('#save').click();await expect(page.locator('#status')).toHaveText('本机存储已满，请导出 JSON 备份。')
 for(const [name,content,text] of [['bad.json','{"schemaVersion":4}','请选择有效的实验室 JSON 文件，当前作品未改变。'],['large.json',' '.repeat(16001),'实验文件不得超过 16 KB。']]){
  await page.locator('#import').setInputFiles({name,mimeType:'application/json',buffer:Buffer.from(content)});await expect(page.locator('#status')).toHaveText(text);expect(await page.locator('canvas').getAttribute('data-canonical')).toBe(raw)
 }
})
test('navigation shares locale but isolates actual v4 and lab slots offline',async({page,context})=>{
 await page.goto('./');const canvas=page.locator('#embroidery');await canvas.scrollIntoViewIfNeeded();const b=(await canvas.boundingBox())!
 await page.mouse.click(b.x+b.width*.35,b.y+b.height*.42+34);await page.mouse.click(b.x+b.width*.62,b.y+b.height*.54+34)
 const raw=await page.evaluate(()=>localStorage.getItem('deesewsew-piece-v1'));expect(JSON.parse(raw!).schemaVersion).toBe(4);expect(JSON.parse(raw!).punctures).toHaveLength(2)
 await page.locator('a.lab-link').click();await page.locator('#import').setInputFiles({name:'lab.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(sample))});await page.locator('#save').click();await page.locator('#language').click()
 await page.evaluate(()=>navigator.serviceWorker.ready);await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);await context.setOffline(true);await page.reload();await page.locator('#load').click();expect(JSON.parse((await page.locator('canvas').getAttribute('data-canonical'))!).run).toEqual(sample.run)
 await page.locator('.lab-links a').click();expect(await page.evaluate(()=>localStorage.getItem('deesewsew-piece-v1'))).toBe(raw);await expect(page.locator('html')).toHaveAttribute('lang','zh-CN')
})
