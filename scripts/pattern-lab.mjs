import { createServer } from 'vite'
import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'
const name=process.argv[2]??'synthetic'
if(!['synthetic','flower-heart','tulip-heart'].includes(name))throw Error('Use synthetic, flower-heart or tulip-heart')
const output=resolve('review/thread-runs-20260908/pattern-lab',name)
await mkdir(output,{recursive:true})
const server=await createServer({server:{host:'127.0.0.1',port:0},logLevel:'error'})
let browser
try{
 await server.listen();const base=server.resolvedUrls.local[0]
 browser=await chromium.launch({channel:'chrome',headless:true})
 const page=await browser.newPage({viewport:{width:1280,height:1000},deviceScaleFactor:1})
 await page.goto(base+'scripts/pattern-lab.html')
 const result=await page.evaluate(async(name)=>{
  const lab=await import('/DeeSewSew/src/pattern-lab.ts')
  const {serializeThreadArtwork}=await import('/DeeSewSew/src/thread-run-storage.ts')
  const pattern=name==='synthetic'?lab.SYNTHETIC_PATTERN:name==='tulip-heart'?lab.TULIP_HEART_PATTERN:lab.FLOWER_HEART_PREFLIGHT
  const result=lab.validatePattern(pattern)
  return {...result,canonical:serializeThreadArtwork(result.state)}
 },name)
 await writeFile(resolve(output,'canonical.json'),result.canonical)
 await writeFile(resolve(output,'route-summary.json'),JSON.stringify(result.summary,null,2))
 for(const side of ['front','back']){
  await page.evaluate(async({state,side})=>{
   const {EmbroideryRenderer}=await import('/DeeSewSew/src/renderer.ts')
   const {threadRunRenderItems}=await import('/DeeSewSew/src/thread-run-render.ts')
   document.body.innerHTML='<canvas style="width:746px;height:746px"></canvas>'
   const renderer=new EmbroideryRenderer(document.querySelector('canvas'),side)
   renderer.render(threadRunRenderItems(state,side),null,null,'#9b4a48');renderer.destroy()
  },{state:result.state,side})
  await page.locator('canvas').screenshot({path:resolve(output,`clean-${side}.png`)})
 }
 await page.evaluate(raw=>localStorage.setItem('deesewsew-piece-v1',raw),result.canonical)
 await page.goto(base);await page.mouse.move(0,0)
 await page.screenshot({path:resolve(output,'app-front.png'),fullPage:true})
 await page.locator('#view-back').click();await page.waitForTimeout(250)
 await page.screenshot({path:resolve(output,'app-back.png'),fullPage:true})
 await writeFile(resolve(output,'provenance.json'),JSON.stringify({pattern:name,url:base,renderer:'Existing EmbroideryRenderer + canonical threadRunRenderItems',
  source:'Deterministic canonical operations, not human click evidence. App images load exactly the same canonical piece and use actual back button.',
  sha256:createHash('sha256').update(result.canonical).digest('hex'),viewport:{width:1280,height:1000},dpr:1,canvasSize:746,
  note:name==='flower-heart'?'Exact supplied target geometry; 2 disclosed single-puncture preparation runs to preserve existing needle-side parity. Not a frozen guide.':name==='tulip-heart'?'Exact accepted High revision, explicit visible-side setup, 24 runs and no preparation punctures. Canonical render evidence, not human interaction.':'Dev-only synthetic fixture, not a public tutorial.'},null,2))
 console.log(JSON.stringify({output,...result.summary},null,2))
}finally{await browser?.close();await server.close()}
