import {test,expect} from '@playwright/test'
import {existsSync,readFileSync,writeFileSync,readdirSync} from 'node:fs'
import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
test.beforeAll(async({browser},info)=>{
 expect(existsSync('dist/playtest/index.html')).toBe(true)
 const hash=(path:string)=>createHash('sha256').update(readFileSync(path)).digest('hex')
 writeFileSync(info.outputPath('runtime-provenance.json'),JSON.stringify({head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),status:execFileSync('git',['status','--short'],{encoding:'utf8'}).trim(),browser:browser.version(),source:Object.fromEntries(['playtest/index.html','src/playtest.ts','src/playtest.css','vite.config.ts','scripts/generate-sw.mjs','README.md'].map(p=>[p,hash(p)])),images:Object.fromEntries(readdirSync('public/playtest-assets').map(n=>[n,hash('public/playtest-assets/'+n)]))},null,2))
})
for(const locale of ['en','zh'])for(const width of [390,768,1280])test(`public manual ${locale} ${width}`,async({page},info)=>{
 await page.setViewportSize({width,height:1000});await page.addInitScript(l=>localStorage.setItem('deesewsew-locale-v1',l),locale)
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message))
 const response=await page.goto('playtest/');expect(response?.ok()).toBe(true)
 await expect(page.locator('html')).toHaveAttribute('lang',locale==='zh'?'zh-CN':'en')
 await expect(page.locator('#start-stitching')).toHaveAccessibleName(locale==='zh'?'开始刺绣':'Start stitching')
 await expect(page.locator('#start-stitching')).toHaveAttribute('href','/DeeSewSew/')
 const cta=(await page.locator('#start-stitching').boundingBox())!;expect(cta.y).toBeLessThan(500);expect(cta.height).toBeGreaterThanOrEqual(44)
 await expect(page.locator('a[href="/DeeSewSew/lab3d.html"]')).toBeVisible()
 expect(await page.locator('#playtest-questions li').count()).toBe(5)
 await expect(page.locator('#ai-challenge')).toContainText(locale==='zh'?'没有奖金':'No prizes')
 for(const image of await page.locator('img').all()){
  await image.scrollIntoViewIfNeeded();await expect.poll(()=>image.evaluate((el:HTMLImageElement)=>el.complete&&el.naturalWidth>0)).toBe(true)
  expect(await image.getAttribute('alt')).toBeTruthy()
 }
 await page.evaluate(()=>window.scrollTo(0,0));expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await page.screenshot({path:info.outputPath('first-screen.png')})
 await page.screenshot({path:info.outputPath('page.png'),fullPage:true})
 expect(errors).toEqual([])
 await page.locator('#start-stitching').click();await expect(page.locator('#embroidery')).toBeVisible()
})

test('language switch and readable standard prompt; blocked clipboard has a manual fallback',async({page})=>{
 await page.addInitScript(()=>{localStorage.setItem('deesewsew-locale-v1','en');Object.defineProperty(navigator,'clipboard',{value:{writeText:async()=>{throw new DOMException('blocked','NotAllowedError')}},configurable:true})})
 await page.goto('playtest/');await page.locator('#language').click();await expect(page.locator('html')).toHaveAttribute('lang','zh-CN')
 await page.locator('#language').click();await expect(page.locator('html')).toHaveAttribute('lang','en')
 await page.locator('details').filter({has:page.locator('#ai-prompt')}).locator('summary').click()
 await expect(page.locator('#ai-prompt')).toBeVisible()
 const prompt=await page.locator('#ai-prompt').evaluate(el=>el instanceof HTMLTextAreaElement?el.value:el.textContent??'')
 expect(prompt).toContain('Use only the normal visible user interface')
 expect(prompt).toContain('Do not modify page JavaScript, DOM, localStorage, saved artwork JSON, or source code')
 expect(prompt).toContain('BOTH sides');expect(prompt).toContain('https://samzebrado.github.io/DeeSewSew/')
 await page.locator('#copy-prompt').click();await expect(page.locator('#copy-status')).not.toBeEmpty()
 expect(await page.locator('#ai-prompt').evaluate(el=>el instanceof HTMLTextAreaElement?el.value:el.textContent??'')).toBe(prompt)
})

test('direct clean route has a stable offline shell and game link remains separate',async({page,context})=>{
 await page.goto('playtest/');await page.evaluate(()=>navigator.serviceWorker.ready)
 await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true)
 const sw=await page.request.get('sw.js');expect(await sw.text()).toContain('"/DeeSewSew/playtest/"')
 await context.setOffline(true);await page.reload();await expect(page.locator('#ai-challenge')).toBeVisible()
 for(const image of await page.locator('img').all()){await image.scrollIntoViewIfNeeded();await expect.poll(()=>image.evaluate((el:HTMLImageElement)=>el.complete&&el.naturalWidth>0)).toBe(true)}
 await page.locator('#start-stitching').click();await expect(page.locator('#embroidery')).toBeVisible()
})

test('copy button passes the unmodified standard prompt to clipboard API',async({page})=>{
 // Capability stub avoids changing the operator's real system clipboard.
 await page.addInitScript(()=>{localStorage.setItem('deesewsew-locale-v1','en');Object.defineProperty(navigator,'clipboard',{value:{writeText:async(text:string)=>{(window as any).copiedPrompt=text}},configurable:true})})
 await page.goto('playtest/');await page.locator('details').filter({has:page.locator('#ai-prompt')}).locator('summary').click()
 await page.locator('#copy-prompt').click();await expect(page.locator('#copy-status')).toHaveText('Copied')
 expect(await page.evaluate(()=>(window as any).copiedPrompt)).toBe(await page.locator('#ai-prompt').inputValue())
})
